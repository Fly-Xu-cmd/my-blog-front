import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import { planMigrations, inspectDatabase, prepareBackup, activateDatabase, digest, restoreRuntime } from '../scripts/deployment-db.mjs';
import { verifyBackup } from '../scripts/verify-backup.mjs';

test('migration backup, actual isolated restore, receipt binding, changes and normal updates', async () => {
  // Explicit test instance only; never use development or production DATABASE_URL.
  const prefix = path.join(os.tmpdir(), 'blog-deploy-db-');
  const root = fs.mkdtempSync(prefix);
  const dbName = 'blog_deploy_test_' + Date.now();
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 13316, user: 'root', password: 'local-test-only', multipleStatements: true });
  const url = `mysql://root:local-test-only@127.0.0.1:13316/${dbName}`;
  const releaseId = '0123456789012345678901234567890123456789-1-1';
  const migrations = path.join(root, 'migrations');
  const state = path.join(root, 'state');
  fs.mkdirSync(path.join(migrations, '0001'), { recursive: true }); fs.mkdirSync(state);
  const sql = 'CREATE TABLE Second(id INTEGER PRIMARY KEY) ENGINE=InnoDB';
  fs.writeFileSync(path.join(migrations, '0001/migration.sql'), sql);
  const dumpRunner = (args, options) => spawnSync('docker', ['exec', '-e', 'MYSQL_PWD=local-test-only',
    'blog-optimization-test-mysql-1', 'mysqldump', '-h', '127.0.0.1', '-u', 'root',
    ...args.filter((arg) => !arg.startsWith('--defaults-extra-file='))], options);
  let migrationsRun = 0;
  const migrationRunner = async () => {
    migrationsRun++;
    await db.query(sql);
    await db.query('INSERT INTO _prisma_migrations VALUES(?,?,NOW(),NULL)', ['0001', digest(sql)]);
    return { status: 0 };
  };
  const options = { state, migrations, databaseUrl: url, releaseId, dumpRunner, migrationRunner };
  try {
    await db.query('CREATE DATABASE ' + dbName + '; USE ' + dbName);
    await db.query('CREATE TABLE _prisma_migrations(migration_name VARCHAR(255),checksum VARCHAR(64),finished_at DATETIME,rolled_back_at DATETIME) ENGINE=InnoDB; CREATE TABLE Example(id INT PRIMARY KEY,slug VARCHAR(255),published BOOLEAN,content LONGTEXT,payload JSON) ENGINE=InnoDB; CREATE TABLE EmptyTable(id INT PRIMARY KEY) ENGINE=InnoDB');
    await db.query('INSERT INTO Example VALUES(1,?,?,?,?),(2,?,?,?,?)', ['stable-url', 1, "中文\nquote ' backslash \\ end", JSON.stringify({ a: '中文' }), 'draft-url', 0, '<script>never execute</script>', '{}']);
    const [before] = await db.query('SELECT * FROM Example ORDER BY id');
    await inspectDatabase(options); assert.equal(fs.readFileSync(path.join(state, 'backup-required'), 'utf8').trim(), 'yes');
    const manifest = await prepareBackup(options);
    assert.deepEqual(manifest.rows, { _prisma_migrations: 0, Example: 2, EmptyTable: 0 });
    assert.equal(fs.existsSync(path.join(state, 'dump-client.cnf')), false);
    await assert.rejects(activateDatabase(options)); assert.equal(migrationsRun, 0);
    const receipt = await verifyBackup(state, releaseId);
    assert.equal(receipt.restoreVerified, true);
    await assert.rejects(activateDatabase({ ...options, databaseUrl: url + '_changed' }), /DATABASE_TARGET_CHANGED/);
    const [after] = await db.query('SELECT * FROM Example ORDER BY id'); assert.deepEqual(after, before);
    const corrupt = fs.readFileSync(path.join(state, 'backup.sql'));
    fs.appendFileSync(path.join(state, 'backup.sql'), '\n-- damaged');
    await assert.rejects(activateDatabase(options), /BACKUP_CHECKSUM_MISMATCH/);
    await assert.rejects(verifyBackup(state, releaseId), /BACKUP_CHECKSUM_MISMATCH/);
    fs.writeFileSync(path.join(state, 'backup.sql'), corrupt);
    fs.mkdirSync(path.join(migrations, '0002'));
    fs.writeFileSync(path.join(migrations, '0002/migration.sql'), 'SELECT 1');
    await assert.rejects(activateDatabase(options), /MIGRATION_PLAN_CHANGED/);
    fs.unlinkSync(path.join(migrations, '0002/migration.sql')); fs.rmdirSync(path.join(migrations, '0002'));
    const wrongReceipt = { ...receipt, releaseId: releaseId.replace('-1-1', '-2-1') };
    fs.writeFileSync(path.join(state, 'backup-verified.json'), JSON.stringify(wrongReceipt));
    await assert.rejects(activateDatabase(options), /BACKUP_VERIFICATION_MISSING/);
    fs.writeFileSync(path.join(state, 'backup-verified.json'), JSON.stringify(receipt));
    await activateDatabase(options); assert.equal(migrationsRun, 1);
    const normal = path.join(root, 'normal'); fs.mkdirSync(normal);
    const ordinary = { ...options, state: normal, dumpRunner: () => assert.fail('normal update must not dump') };
    await inspectDatabase(ordinary); assert.equal(fs.readFileSync(path.join(normal, 'backup-required'), 'utf8').trim(), 'no');
    const clean = await prepareBackup(ordinary); assert.equal(clean.pending.length, 0);
    const skipped = await verifyBackup(normal, releaseId); assert.equal(skipped.restoreVerified, false);
    await activateDatabase(ordinary); assert.equal(migrationsRun, 1);
    const broken = path.join(root, 'broken'); fs.mkdirSync(broken);
    fs.mkdirSync(path.join(migrations, '0002')); fs.writeFileSync(path.join(migrations, '0002/migration.sql'), 'SELECT 1');
    await assert.rejects(prepareBackup({ ...options, state: broken, dumpRunner: () => ({ status: 1, stdout: '' }) }));
    assert.equal(fs.existsSync(path.join(broken, 'backup-manifest.json')), false);
    assert.equal(fs.existsSync(path.join(broken, 'dump-client.cnf')), false);
    fs.writeFileSync(path.join(broken, 'backup.sql'), 'occupied');
    await assert.rejects(prepareBackup({ ...options, state: broken }));
    assert.equal(fs.existsSync(path.join(broken, 'dump-client.cnf')), false);
    assert.throws(() => planMigrations(migrations, [{ migration_name: '0001', checksum: 'wrong', finished_at: new Date() }]), /MIGRATION_HISTORY_MISMATCH/);
    assert.throws(() => planMigrations(migrations, [{ migration_name: '0002', finished_at: null, rolled_back_at: null }]), /UNRESOLVED_MIGRATION/);
    assert.throws(() => restoreRuntime('arbitrary-image'), /UNSUPPORTED_MYSQL_VERSION/);
  } finally {
    await db.query('DROP DATABASE ' + dbName); await db.end();
    assert.ok(path.resolve(root).startsWith(prefix)); fs.rmSync(root, { recursive: true, force: true });
  }
});
