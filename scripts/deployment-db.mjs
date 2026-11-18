import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { rootCertificates } from 'node:tls';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';

const require = createRequire(import.meta.url);
export const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (code) => { throw Object.assign(new Error(code), { deployCode: code }); };
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600 });

export function planMigrations(directory, history) {
  const migrations = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(directory, entry.name, 'migration.sql')))
    .map((entry) => ({ name: entry.name, checksum: digest(fs.readFileSync(path.join(directory, entry.name, 'migration.sql'))) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (history.some((row) => !row.finished_at && !row.rolled_back_at)) fail('UNRESOLVED_MIGRATION');
  const applied = new Map(history.filter((row) => row.finished_at && !row.rolled_back_at)
    .map((row) => [row.migration_name, row.checksum]));
  if ([...applied].some(([name, checksum]) => !migrations.some((item) => item.name === name && item.checksum === checksum)))
    fail('MIGRATION_HISTORY_MISMATCH');
  return migrations.filter((item) => !applied.has(item.name));
}

export function databaseOptions(value) {
  let url;
  try { url = new URL(value); } catch { fail('INVALID_DATABASE_URL'); }
  if (url.protocol !== 'mysql:' || !url.hostname || !url.pathname.slice(1)) fail('INVALID_DATABASE_URL');
  if (url.searchParams.has('sslidentity')) fail('MYSQL_CLIENT_CERT_REQUIRES_CONFIGURATION');
  const result = {
    host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)),
    connectTimeout: 10000, dateStrings: true,
  };
  if (!/^[A-Za-z0-9_-]+$/.test(result.database)) fail('UNSUPPORTED_DATABASE_NAME');
  if (url.searchParams.has('socket')) result.socketPath = url.searchParams.get('socket');
  if (url.searchParams.has('sslaccept') || url.searchParams.has('sslcert')) {
    result.ssl = { rejectUnauthorized: url.searchParams.get('sslaccept') !== 'accept_invalid_certs' };
    if (url.searchParams.has('sslcert')) result.ssl.ca = fs.readFileSync(url.searchParams.get('sslcert'));
  }
  return result;
}

export function restoreRuntime(version) {
  const match = version.match(/^(\d+)\.(\d+)\./);
  if (!match) fail('UNSUPPORTED_MYSQL_VERSION');
  const series = `${match[1]}.${match[2]}`;
  const maria = version.includes('MariaDB');
  if (!(maria ? ['10.6', '10.11', '11.4', '11.8'] : ['5.7', '8.0', '8.4']).includes(series))
    fail('UNSUPPORTED_MYSQL_VERSION');
  return { image: `${maria ? 'mariadb' : 'mysql'}:${series}`, client: maria ? 'mariadb' : 'mysql' };
}

async function historyOf(db) {
  try {
    const [rows] = await db.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations');
    return rows;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      const [rows] = await db.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE()');
      if (Number(rows[0].n) !== 0) fail('EXISTING_DATABASE_NEEDS_MIGRATION_BASELINE');
      return [];
    }
    throw error;
  }
}

export async function dumpRowCounts(file, tables) {
  const counts = Object.fromEntries(tables.map((name) => [name, 0]));
  let routines = false;
  for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
    if (line.startsWith('DELIMITER ')) { routines = line.trim() !== 'DELIMITER ;'; continue; }
    if (routines) continue;
    const match = line.match(/^INSERT INTO `((?:``|[^`])+)` \(/);
    if (match) {
      const name = match[1].replaceAll('``', '`');
      if (!Object.hasOwn(counts, name)) fail('UNEXPECTED_BACKUP_TABLE');
      counts[name]++;
    }
  }
  return counts;
}

function clientConfig(options, help, state) {
  const quoted = (value) => '"' + String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r') + '"';
  const fields = { host: options.host, port: options.port, user: options.user, password: options.password,
    ...(options.socketPath ? { socket: options.socketPath } : {}) };
  if (options.ssl) {
    if (help.includes('ssl-mode')) fields['ssl-mode'] = options.ssl.rejectUnauthorized ? 'VERIFY_IDENTITY' : 'REQUIRED';
    else if (help.includes('ssl-verify-server-cert')) {
      fields.ssl = 'true'; fields['ssl-verify-server-cert'] = String(options.ssl.rejectUnauthorized);
    } else fail('MYSQL_DUMP_TLS_UNSUPPORTED');
    if (options.ssl.ca || options.ssl.rejectUnauthorized) {
      const certificate = path.join(state, 'dump-ca.pem');
      fs.writeFileSync(certificate, options.ssl.ca || rootCertificates.join('\n'), { flag: 'wx', mode: 0o600 });
      fields['ssl-ca'] = certificate;
    }
  }
  return '[client]\n' + Object.entries(fields).map(([key, value]) => `${key}=${quoted(value)}`).join('\n') + '\n';
}

export async function inspectDatabase({ state, migrations, databaseUrl }) {
  const db = await mysql.createConnection(databaseOptions(databaseUrl));
  try {
    const pending = planMigrations(migrations, await historyOf(db));
    save(path.join(state, 'migration-plan.json'), { pending, databaseFingerprint: digest(databaseUrl) });
    fs.writeFileSync(path.join(state, 'backup-required'), pending.length ? 'yes\n' : 'no\n', { mode: 0o600 });
    return pending;
  } finally { await db.end(); }
}

export async function prepareBackup({ state, migrations, databaseUrl, releaseId, dumpBinary = 'mysqldump',
  dumpRunner = (args, options) => spawnSync(dumpBinary, args, options) }) {
  const options = databaseOptions(databaseUrl);
  const db = await mysql.createConnection(options);
  try {
    const pending = planMigrations(migrations, await historyOf(db));
    if (fs.existsSync(path.join(state, 'migration-plan.json'))) {
      const inspected = JSON.parse(fs.readFileSync(path.join(state, 'migration-plan.json')));
      if (inspected.databaseFingerprint !== digest(databaseUrl) || JSON.stringify(inspected.pending) !== JSON.stringify(pending))
        fail('MIGRATION_PLAN_CHANGED');
    }
    const manifest = { format: 1, releaseId, pending, databaseName: options.database,
      databaseFingerprint: digest(databaseUrl), backupSha256: null, rows: {} };
    if (pending.length) {
      const [[version]] = await db.query('SELECT VERSION() AS version');
      const [tables] = await db.query("SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.tables WHERE table_schema=DATABASE() AND TABLE_TYPE='BASE TABLE'");
      if (tables.some((table) => table.engine !== 'InnoDB')) fail('NON_TRANSACTIONAL_TABLE_BACKUP_UNSUPPORTED');
      Object.assign(manifest, restoreRuntime(version.version));
      const credentials = path.join(state, 'dump-client.cnf');
      const sql = path.join(state, 'backup.sql');
      const help = dumpRunner(['--help'], { encoding: 'utf8' });
      if (help.error || help.status !== 0) fail('MYSQL_DUMP_CLIENT_UNAVAILABLE');
      let output, errors;
      try {
        fs.writeFileSync(credentials, clientConfig(options, help.stdout, state), { mode: 0o600, flag: 'wx' });
        output = fs.openSync(sql, 'wx', 0o600);
        errors = fs.openSync(path.join(state, 'dump-error.log'), 'w', 0o600);
        const extra = [];
        if (help.stdout.includes('set-gtid-purged')) extra.push('--set-gtid-purged=OFF');
        if (help.stdout.includes('column-statistics')) extra.push('--column-statistics=0');
        const result = dumpRunner([`--defaults-extra-file=${credentials}`, '--single-transaction',
          '--quick', '--complete-insert', '--skip-extended-insert', '--hex-blob', '--routines', '--events',
          '--triggers', '--no-tablespaces', '--default-character-set=utf8mb4', ...extra, '--', options.database],
        { stdio: ['ignore', output, errors] });
        if (result.error || result.status !== 0) fail('MYSQL_BACKUP_FAILED');
      } finally {
        if (output !== undefined) fs.closeSync(output);
        if (errors !== undefined) fs.closeSync(errors);
        for (const file of [credentials, path.join(state, 'dump-ca.pem')]) if (fs.existsSync(file)) fs.unlinkSync(file);
      }
      if (fs.statSync(sql).size === 0) fail('EMPTY_MYSQL_BACKUP');
      manifest.backupSha256 = await fileDigest(sql);
      manifest.rows = await dumpRowCounts(sql, tables.map((table) => table.name));
    }
    save(path.join(state, 'backup-manifest.json'), manifest);
    console.log(pending.length ? `Pending migrations: ${pending.length}; private backup prepared` : 'No pending migrations; backup and restore skipped');
    return manifest;
  } finally { await db.end(); }
}

export async function fileDigest(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function activateDatabase({ state, migrations, databaseUrl, releaseId, pnpm, env,
  migrationRunner = () => spawnSync(pnpm, ['exec', 'prisma', 'migrate', 'deploy'], { env, stdio: 'inherit' }) }) {
  const manifestFile = path.join(state, 'backup-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  const receipt = JSON.parse(fs.readFileSync(path.join(state, 'backup-verified.json')));
  if (manifest.releaseId !== releaseId || receipt.releaseId !== releaseId || receipt.format !== 1 ||
    receipt.manifestSha256 !== digest(fs.readFileSync(manifestFile)) || receipt.backupSha256 !== manifest.backupSha256 ||
    receipt.restoreVerified !== Boolean(manifest.pending.length)) fail('BACKUP_VERIFICATION_MISSING');
  if (manifest.databaseFingerprint !== digest(databaseUrl)) fail('DATABASE_TARGET_CHANGED');
  if (manifest.pending.length && await fileDigest(path.join(state, 'backup.sql')) !== manifest.backupSha256)
    fail('BACKUP_CHECKSUM_MISMATCH');
  const db = await mysql.createConnection(databaseOptions(databaseUrl));
  try {
    const pending = planMigrations(migrations, await historyOf(db));
    if (JSON.stringify(pending) !== JSON.stringify(manifest.pending)) fail('MIGRATION_PLAN_CHANGED');
    if (!pending.length) return;
    const result = await migrationRunner();
    if (result.error || result.status !== 0) fail('MIGRATION_DEPLOY_FAILED');
    if (planMigrations(migrations, await historyOf(db)).length) fail('MIGRATION_NOT_APPLIED');
  } finally { await db.end(); }
}

async function main() {
  const [phase, state, releaseId, pnpm] = process.argv.slice(2);
  if (!['inspect', 'prepare', 'activate'].includes(phase)) fail('INVALID_DEPLOY_PHASE');
  const config = JSON.parse(fs.readFileSync(path.join(state, 'next.json'))).apps[0];
  Object.assign(process.env, config.env);
  const nextEnv = require(require.resolve('@next/env', { paths: [path.dirname(require.resolve('next/package.json'))] }));
  nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() { fail('ENV_CONFIG_INVALID'); } });
  const options = { state, migrations: path.join(process.cwd(), 'prisma/migrations'),
    databaseUrl: process.env.DATABASE_URL, releaseId, pnpm, env: process.env };
  if (phase === 'inspect') await inspectDatabase(options);
  else if (phase === 'prepare') {
    if (!fs.existsSync(path.join(state, 'migration-plan.json'))) fail('MIGRATION_INSPECTION_MISSING');
    await prepareBackup(options);
  }
  else await activateDatabase(options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => { console.error(`Database deployment stopped: ${error.deployCode || 'DATABASE_OR_BACKUP_UNAVAILABLE'}`); process.exitCode = 1; });
