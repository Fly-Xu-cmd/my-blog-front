import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createReceipt, validateArchive, validateFiles, auditFiles } from '../scripts/standalone-release.mjs';

const compatible = process.platform === 'linux' && Number(process.versions.node.split('.')[0]) === 24;
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-standalone-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of ['package.json', 'pnpm-lock.yaml', '.next/BUILD_ID', 'server.js', 'ecosystem.config.cjs',
    'deployment/node_modules/prisma/build/index.js', 'deployment/scripts/deployment-db.mjs', 'prisma/schema.prisma',
    'public/deploy-version.txt', 'standalone-release.tar.gz']) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'fixture');
  }
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'standalone-release.json'), JSON.stringify(createReceipt(root, 'release-1')));
  return root;
}

test('archive belongs to exactly one release and checksum', { skip: !compatible }, (t) => {
  const root = fixture(t);
  validateArchive(root, 'release-1');
  assert.throws(() => validateArchive(root, 'release-2'), /RELEASE_OR_RUNTIME_MISMATCH/);
  fs.appendFileSync(path.join(root, 'standalone-release.tar.gz'), 'damaged');
  assert.throws(() => validateArchive(root, 'release-1'), /RELEASE_CHECKSUM_MISMATCH/);
});
test('extracted build, lock and required files are checked', { skip: !compatible }, (t) => {
  const root = fixture(t);
  validateFiles(root, 'release-1');
  fs.unlinkSync(path.join(root, 'server.js'));
  assert.throws(() => validateFiles(root, 'release-1'), /INCOMPLETE_STANDALONE_RELEASE/);
  fs.writeFileSync(path.join(root, 'server.js'), 'fixture');
  fs.appendFileSync(path.join(root, 'pnpm-lock.yaml'), 'changed');
  assert.throws(() => validateFiles(root, 'release-1'), /RELEASE_FILES_MISMATCH/);
});
test('release excludes environment files and test packages', (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, '.env'), 'placeholder');
  assert.throws(() => auditFiles(root), /ENV_FILE_IN_RELEASE/);
  fs.unlinkSync(path.join(root, '.env'));
  const packageFile = path.join(root, 'node_modules/vitest/package.json');
  fs.mkdirSync(path.dirname(packageFile), { recursive: true });
  fs.writeFileSync(packageFile, JSON.stringify({ name: 'vitest' }));
  assert.throws(() => auditFiles(root), /DEVELOPMENT_PACKAGE_IN_RELEASE/);
});
