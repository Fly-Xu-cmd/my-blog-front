import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pruneReleases } from '../scripts/prune-releases.mjs';

const ids = [1, 2, 3, 4].map((number) => `${'a'.repeat(40)}-${number}-1`);
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-retention-test-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'blog');
  const outside = path.join(base, 'uploads');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'image.png'), 'preserve');
  for (const id of ids) fs.mkdirSync(path.join(root, 'releases', id), { recursive: true });
  fs.mkdirSync(path.join(root, '.deploy-state'));
  const bin = path.join(base, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'pm2'), 'test tool');
  const originalPath = process.env.PATH;
  process.env.PATH = bin + path.delimiter + originalPath;
  t.after(() => { process.env.PATH = originalPath; });
  fs.writeFileSync(path.join(root, '.deploy-state', 'backup.sql'), 'preserve backup');
  fs.symlinkSync(outside, path.join(root, 'releases', `${'b'.repeat(40)}-1-1`), 'dir');
  fs.mkdirSync(path.join(root, 'releases', 'unmanaged'));
  fs.symlinkSync(path.join(root, 'releases', ids[3]), path.join(root, 'current'), 'dir');
  return { root, outside };
}

test('retention keeps current and previous successful release and preserves non-release data', (t) => {
  const { root, outside } = fixture(t);
  // A symlink inside a deleted release must not follow or delete user uploads.
  fs.symlinkSync(outside, path.join(root, 'releases', ids[0], 'uploads'), 'dir');
  assert.equal(pruneReleases(root, ids[3], path.join(root, 'releases', ids[2])), 2);
  assert.ok(fs.existsSync(path.join(root, 'releases', ids[3])));
  assert.ok(fs.existsSync(path.join(root, 'releases', ids[2])));
  assert.equal(fs.readFileSync(path.join(outside, 'image.png'), 'utf8'), 'preserve');
  assert.ok(fs.existsSync(path.join(root, '.deploy-state', 'backup.sql')));
  assert.ok(fs.existsSync(path.join(root, 'releases', 'unmanaged')));
  assert.ok(fs.lstatSync(path.join(root, 'releases', `${'b'.repeat(40)}-1-1`)).isSymbolicLink());
});

test('a candidate cannot prune before current is committed', (t) => {
  const { root } = fixture(t);
  assert.throws(() => pruneReleases(root, ids[1], path.join(root, 'releases', ids[0])), /RELEASE_NOT_COMMITTED/);
  for (const id of ids) assert.ok(fs.existsSync(path.join(root, 'releases', id)));
});

test('redirected releases root is rejected before deleting anything', (t) => {
  const { root, outside } = fixture(t);
  fs.renameSync(path.join(root, 'releases'), path.join(root, 'old-releases'));
  fs.symlinkSync(outside, path.join(root, 'releases'), 'dir');
  assert.throws(() => pruneReleases(root, ids[3]), /UNEXPECTED_RELEASES_PATH/);
  assert.ok(fs.existsSync(path.join(root, 'old-releases', ids[0])));
  assert.ok(fs.existsSync(path.join(outside, 'image.png')));
});

test('legacy runtime is retired only after a managed previous release exists and no process references it', (t) => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.mkdirSync(path.join(root, '.next'));
  fs.writeFileSync(path.join(root, '.env'), 'preserve environment');
  fs.mkdirSync(path.join(root, 'public'));
  fs.writeFileSync(path.join(root, 'public', 'image.png'), 'preserve content');
  fs.writeFileSync(path.join(root, '.deploy-state', 'legacy-runtime.json'), JSON.stringify({ version: 1, root }));
  pruneReleases(root, ids[3], root, () => assert.fail('first release must not inspect or retire the legacy runtime'));
  assert.ok(fs.existsSync(path.join(root, 'node_modules')));
  // Recreate a valid previous managed release for the second successful deployment.
  fs.mkdirSync(path.join(root, 'releases', ids[2]));
  const apps = () => [{ pm2_env: { pm_cwd: path.join(root, 'releases', ids[3]), pm_exec_path: path.join(root, 'releases', ids[3], 'server.js') } }];
  pruneReleases(root, ids[3], path.join(root, 'releases', ids[2]), apps);
  assert.equal(fs.existsSync(path.join(root, 'node_modules')), false);
  assert.equal(fs.existsSync(path.join(root, '.next')), false);
  assert.equal(fs.existsSync(path.join(root, '.deploy-state', 'legacy-runtime.json')), false);
  assert.equal(fs.readFileSync(path.join(root, '.env'), 'utf8'), 'preserve environment');
  assert.equal(fs.readFileSync(path.join(root, 'public', 'image.png'), 'utf8'), 'preserve content');
  assert.ok(fs.existsSync(path.join(root, '.deploy-state', 'backup.sql')));
});

test('a running legacy application prevents retirement of root dependencies', (t) => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.mkdirSync(path.join(root, '.next'));
  fs.writeFileSync(path.join(root, '.deploy-state', 'legacy-runtime.json'), JSON.stringify({ version: 1, root }));
  pruneReleases(root, ids[3], path.join(root, 'releases', ids[2]), () => [{ pm2_env: { pm_cwd: root } }]);
  assert.ok(fs.existsSync(path.join(root, 'node_modules')));
  assert.ok(fs.existsSync(path.join(root, '.next')));
});

test('symlink aliases and interpreters resolved through app PATH prevent legacy retirement', (t) => {
  const { root } = fixture(t);
  const dependencies = path.join(root, 'node_modules');
  fs.mkdirSync(path.join(dependencies, '.bin'), { recursive: true });
  fs.mkdirSync(path.join(root, '.next'));
  fs.writeFileSync(path.join(dependencies, '.bin', 'node'), 'test runtime');
  const alias = path.join(path.dirname(root), 'legacy-alias');
  fs.symlinkSync(dependencies, alias, 'dir');
  fs.writeFileSync(path.join(root, '.deploy-state', 'legacy-runtime.json'), JSON.stringify({ version: 1, root }));
  const previous = path.join(root, 'releases', ids[2]);
  const cwd = path.join(root, 'releases', ids[3]);
  fs.writeFileSync(path.join(dependencies, 'script.js'), 'test script');
  pruneReleases(root, ids[3], previous, () => [{ pm2_env: { pm_cwd: cwd, pm_exec_path: path.join(alias, 'script.js') } }]);
  assert.ok(fs.existsSync(dependencies));
  pruneReleases(root, ids[3], previous, () => [{ pm2_env: { pm_cwd: cwd, exec_interpreter: 'node', env: { PATH: path.join(alias, '.bin') } } }]);
  assert.ok(fs.existsSync(dependencies));
});
