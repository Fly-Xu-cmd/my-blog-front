import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

function listApps() {
  const result = spawnSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 15000 });
  if (result.error || result.status !== 0) throw new Error('PM2_STATE_UNAVAILABLE');
  const apps = JSON.parse(result.stdout);
  if (!Array.isArray(apps)) throw new Error('PM2_STATE_UNAVAILABLE');
  return apps;
}

function pruneLegacyRuntime(base, getApps) {
  const marker = path.join(base, '.deploy-state', 'legacy-runtime.json');
  if (!fs.existsSync(marker)) return;
  const legacy = JSON.parse(fs.readFileSync(marker));
  if (legacy.version !== 1 || legacy.root !== base) throw new Error('INVALID_LEGACY_RUNTIME_MARKER');
  const targets = ['node_modules', '.next'].map((name) => path.join(base, name));
  const within = (candidate, directory) => candidate === directory || candidate.startsWith(directory + path.sep);
  const aliases = (candidate) => fs.existsSync(candidate) ? [candidate, fs.realpathSync(candidate)] : [candidate];
  const executable = (command, searchPath) => (searchPath ?? '').split(path.delimiter)
    .filter(Boolean).map((directory) => path.resolve(directory, command)).find((file) => fs.existsSync(file));
  const pm2 = executable('pm2', process.env.PATH);
  if (!pm2) throw new Error('PM2_STATE_UNAVAILABLE');
  const refs = getApps().flatMap((app) => {
    if (!app.pm2_env || typeof app.pm2_env.pm_cwd !== 'string') throw new Error('PM2_STATE_UNAVAILABLE');
    const env = app.pm2_env;
    const cwd = path.resolve(env.pm_cwd);
    const paths = aliases(cwd);
    if (typeof env.pm_exec_path === 'string') paths.push(...aliases(path.resolve(cwd, env.pm_exec_path)));
    if (typeof env.exec_interpreter === 'string' && env.exec_interpreter !== 'none') {
      const interpreter = env.exec_interpreter.includes('/')
        ? path.resolve(cwd, env.exec_interpreter)
        : executable(env.exec_interpreter, env.env?.PATH ?? process.env.PATH);
      if (!interpreter) throw new Error('PM2_INTERPRETER_UNRESOLVED');
      paths.push(...aliases(interpreter));
    }
    return paths;
  });
  refs.push(...aliases(pm2));
  if (refs.includes(base) || targets.some((target) => refs.some((ref) => within(ref, target)))) {
    console.log('[deploy:retention] legacy runtime is still referenced; cleanup deferred');
    return;
  }
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    if (!fs.lstatSync(target).isDirectory() || fs.realpathSync(target) !== target || path.dirname(target) !== base)
      throw new Error('UNSAFE_LEGACY_RUNTIME_TARGET');
  }
  for (const target of targets) if (fs.existsSync(target)) fs.rmSync(target, { recursive: true });
  fs.unlinkSync(marker);
  console.log('[deploy:retention] removed unused legacy node_modules and .next; server environment and content retained');
}

export function pruneReleases(root, releaseId, previous, getApps = listApps) {
  const base = fs.realpathSync(root);
  const releases = path.join(base, 'releases');
  if (fs.realpathSync(releases) !== releases) throw new Error('UNEXPECTED_RELEASES_PATH');
  if (!/^[a-f0-9]{40}-\d+-\d+$/.test(releaseId)) throw new Error('INVALID_RELEASE_ID');
  const current = path.join(releases, releaseId);
  const marker = fs.lstatSync(path.join(base, 'current'));
  if (!marker.isSymbolicLink() || fs.realpathSync(path.join(base, 'current')) !== current || fs.realpathSync(current) !== current)
    throw new Error('RELEASE_NOT_COMMITTED');
  const keep = new Set([current]);
  if (previous && previous !== current && path.dirname(previous) === releases &&
      /^[a-f0-9]{40}-\d+-\d+$/.test(path.basename(previous))) {
    if (fs.realpathSync(previous) !== previous) throw new Error('UNEXPECTED_PREVIOUS_RELEASE');
    keep.add(previous);
  }
  let removed = 0;
  for (const entry of fs.readdirSync(releases, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-f0-9]{40}-\d+-\d+$/.test(entry.name)) continue;
    const target = path.join(releases, entry.name);
    if (keep.has(target)) continue;
    // Revalidate every absolute target immediately before recursive removal.
    if (fs.realpathSync(target) !== target || path.dirname(target) !== releases) throw new Error('UNSAFE_PRUNE_TARGET');
    fs.rmSync(target, { recursive: true });
    removed++;
  }
  console.log(`[deploy:retention] kept current and previous successful release; removed ${removed} old release directories`);
  // The first standalone release still needs the root installation to roll back.
  // Retire it only once a second healthy standalone release supplies that fallback.
  if (keep.size === 2) pruneLegacyRuntime(base, getApps);
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { pruneReleases(...process.argv.slice(2)); }
  catch (error) { console.error(`Release cleanup stopped: ${error.message}; active release remains committed`); process.exitCode = 1; }
}
