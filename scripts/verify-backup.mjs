import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { digest, fileDigest } from './deployment-db.mjs';

const fail = (code) => { throw Object.assign(new Error(code), { deployCode: code }); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quoteId = (value) => '`' + value.replaceAll('`', '``') + '`';

export async function verifyBackup(directory, releaseId) {
  const manifestFile = path.join(directory, 'backup-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  if (manifest.format !== 1 || manifest.releaseId !== releaseId || !Array.isArray(manifest.pending))
    fail('INVALID_BACKUP_MANIFEST');
  const receipt = { format: 1, releaseId, manifestSha256: digest(fs.readFileSync(manifestFile)),
    backupSha256: manifest.backupSha256, restoreVerified: false };
  if (!manifest.pending.length) {
    if (manifest.backupSha256 !== null) fail('INVALID_BACKUP_MANIFEST');
  } else {
    if (!/^(mysql:(5\.7|8\.0|8\.4)|mariadb:(10\.6|10\.11|11\.4|11\.8))$/.test(manifest.image) ||
      manifest.client !== (manifest.image.startsWith('mariadb:') ? 'mariadb' : 'mysql')) fail('INVALID_RESTORE_RUNTIME');
    if (!/^[A-Za-z0-9_-]+$/.test(manifest.databaseName) || ['mysql', 'sys', 'performance_schema', 'information_schema'].includes(manifest.databaseName.toLowerCase()))
      fail('INVALID_RESTORE_DATABASE');
    const database = quoteId(manifest.databaseName);
    const sql = path.join(directory, 'backup.sql');
    if (await fileDigest(sql) !== manifest.backupSha256) fail('BACKUP_CHECKSUM_MISMATCH');
    const password = crypto.randomBytes(24).toString('hex');
    const container = 'blog-restore-' + crypto.randomBytes(8).toString('hex');
    const docker = (args, options = {}) => spawnSync('docker', args, { encoding: 'utf8', timeout: 1800000, ...options });
    const query = (sqlText) => {
      const result = docker(['exec', '-e', `MYSQL_PWD=${password}`, container, manifest.client,
        '-h', '127.0.0.1', '-u', 'root', '--batch', '--skip-column-names', '--raw', '-e', sqlText]);
      if (result.error || result.status !== 0) fail('RESTORE_QUERY_FAILED');
      return result.stdout.trim();
    };
    try {
      const started = docker(['run', '-d', '--name', container, '--network', 'none', '--memory', '1g', '--cpus', '1',
        '-e', `MYSQL_ROOT_PASSWORD=${password}`, '-e', `MARIADB_ROOT_PASSWORD=${password}`, manifest.image]);
      if (started.error || started.status !== 0) fail('RESTORE_CONTAINER_UNAVAILABLE');
      let ready = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        try { if (query('SELECT 1') === '1') { ready = true; break; } } catch { /* isolated database is starting */ }
        await pause(1000);
      }
      if (!ready) fail('RESTORE_CONTAINER_START_TIMEOUT');
      // Same logical name in a different server preserves qualified view/routine references.
      query('CREATE DATABASE ' + database + ' CHARACTER SET utf8mb4');
      const input = fs.openSync(sql, 'r');
      const errors = fs.openSync(path.join(directory, 'restore-error.log'), 'w', 0o600);
      try {
        const restored = docker(['exec', '-i', '-e', `MYSQL_PWD=${password}`, container, manifest.client,
          '-h', '127.0.0.1', '-u', 'root', '--default-character-set=utf8mb4', '--database=' + manifest.databaseName],
        { stdio: [input, 'ignore', errors] });
        if (restored.error || restored.status !== 0) fail('BACKUP_RESTORE_FAILED');
      } finally { fs.closeSync(input); fs.closeSync(errors); }
      const entries = Object.entries(manifest.rows);
      const tables = Number(query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='" + manifest.databaseName + "' AND TABLE_TYPE='BASE TABLE'"));
      if (tables !== entries.length) fail('RESTORE_TABLE_COUNT_MISMATCH');
      for (const [table, expected] of entries) {
        if (!Number.isSafeInteger(expected) || expected < 0) fail('INVALID_BACKUP_MANIFEST');
        const identifier = database + '.' + quoteId(table);
        if (Number(query('SELECT COUNT(*) FROM ' + identifier)) !== expected) fail('RESTORE_ROW_COUNT_MISMATCH');
        const checked = query('CHECK TABLE ' + identifier);
        if (!checked.endsWith('\tstatus\tOK')) fail('RESTORE_TABLE_CHECK_FAILED');
      }
      receipt.restoreVerified = true;
      console.log(`Isolated restore verified: ${entries.length} tables; source database was not changed`);
    } finally {
      const removed = docker(['rm', '-f', '-v', container]);
      if (removed.error || (removed.status !== 0 && !removed.stderr?.includes('No such container')))
        fail('RESTORE_CONTAINER_CLEANUP_FAILED');
    }
  }
  fs.writeFileSync(path.join(directory, 'backup-verified.json'), JSON.stringify(receipt), { mode: 0o600 });
  return receipt;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  verifyBackup(...process.argv.slice(2)).catch((error) => {
    console.error(`Backup verification stopped: ${error.deployCode || 'BACKUP_VERIFICATION_UNAVAILABLE'}`);
    process.exitCode = 1;
  });
