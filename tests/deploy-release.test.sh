#!/usr/bin/env bash
set -euo pipefail
source_root=$(cd -- "$(dirname -- "$0")/.." && pwd)
sandbox=$(mktemp -d /tmp/blog-release-test.XXXXXX)
cleanup() {
  if [[ -n ${TEST_PM2_STATE:-} && -f $TEST_PM2_STATE/pid ]]; then
    "$sandbox/bin/pm2" delete my-blog >/dev/null 2>&1 || true
  fi
  [[ $sandbox == /tmp/blog-release-test.* ]] && rm -rf -- "$sandbox"
}
trap cleanup EXIT
mkdir -p "$sandbox/bin"
export TEST_REAL_NPM=$(command -v npm)
export TEST_REAL_NODE=$(command -v node)
export PATH="$sandbox/bin:$PATH"
export BLOG_TOOLS_DIR="$sandbox/tools"
export BLOG_DEPLOY_HEALTH_ATTEMPTS=2
cat > "$sandbox/bin/npm" <<'SH'
#!/usr/bin/env bash
set -eu
if [[ ${1:-} != install || ${2:-} != --prefix ]]; then
  # node-bin-setup invokes npm itself; its nested binary download must stay real.
  exec "$TEST_REAL_NPM" "$@"
fi
if [[ $3 == */node-24.20.0 ]]; then
  [[ ${TEST_FAIL:-} != node-bootstrap ]] || exit 18
  exec "$TEST_REAL_NPM" "$@"
fi
echo 'Standalone deployment must not bootstrap pnpm' >&2
exit 19
SH
cat > "$sandbox/server.cjs" <<'JS'
const http = require('node:http');
const fs = require('node:fs');
http.createServer((req, res) => {
  res.setHeader('X-Node-Major', process.versions.node.split('.')[0]);
  if (req.url.startsWith('/api/posts')) {
    if (process.env.TEST_FAIL === 'health_api' && process.cwd().includes('/releases/')) res.statusCode = 503;
    res.end(JSON.stringify({ ok: res.statusCode === 200, data: [] }));
    return;
  }
  const marker = process.env.TEST_FAIL === 'health' && process.cwd().includes('/releases/')
    ? 'wrong-release' : fs.readFileSync('public/deploy-version.txt', 'utf8');
  res.end(marker);
}).listen(Number(process.env.PORT), '127.0.0.1');
JS
export TEST_SERVER="$sandbox/server.cjs"
cat > "$sandbox/bin/pm2" <<'JS'
#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const state = process.env.TEST_PM2_STATE;
const cmd = process.argv[2];
const configFile = path.join(state, 'app.json');
const pidFile = path.join(state, 'pid');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  if (cmd === 'ping') return;
  if (cmd === 'jlist') { process.stdout.write(fs.readFileSync(configFile)); return; }
  fs.appendFileSync(path.join(state, 'events'), cmd + '\n');
  if (cmd === 'delete') {
    if (fs.existsSync(pidFile)) {
      try { process.kill(Number(fs.readFileSync(pidFile))); } catch {}
      fs.unlinkSync(pidFile);
      await wait(100);
    }
    fs.writeFileSync(configFile, '[]');
    return;
  }
  if (!['start', 'startOrReload'].includes(cmd)) throw new Error('Unexpected PM2 command');
  const target = JSON.parse(fs.readFileSync(process.argv[3])).apps[0];
  // Resolve the candidate's PATH, rather than inheriting this CLI's Node version.
  const pathNode = (target.env.PATH || '').split(path.delimiter)
    .map(dir => path.join(dir, 'node')).find(file => {
      try { fs.accessSync(file, fs.constants.X_OK); return true; } catch { return false; }
    });
  const runtime = target.interpreter && target.interpreter !== 'none' ? target.interpreter : pathNode;
  if (!runtime) throw new Error('Candidate PATH has no executable Node');
  const child = spawn(runtime, [process.env.TEST_SERVER], {
    cwd: target.cwd, env: { ...process.env, ...target.env }, detached: true, stdio: 'ignore',
  });
  child.unref();
  fs.writeFileSync(pidFile, String(child.pid));
  fs.writeFileSync(configFile, JSON.stringify([{ name: target.name, pm2_env: {
    pm_exec_path: target.script, pm_cwd: target.cwd, exec_interpreter: target.interpreter,
    args: target.args, env: target.env,
  }}]));
  for (let i = 0; i < 30; i++) {
    await wait(50);
    try { await fetch('http://127.0.0.1:' + target.env.PORT); return; } catch {}
  }
  throw new Error('Fixture failed to start');
}
main().catch(() => { process.exitCode = 1; });
JS
chmod +x "$sandbox/bin/npm" "$sandbox/bin/pm2"
release_id=0123456789012345678901234567890123456789-1-1
deploy() {
  bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads" prepare || return
  bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads" backup || return
  if [[ ${TEST_FAIL:-} != verification ]]; then
    echo fixture > "$root/.deploy-state/$release_id/backup-verified.json"
  fi
  bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads" activate
}
prepare() {
  local name=$1
  export TEST_PM2_STATE="$sandbox/$name/pm2"
  root="$sandbox/$name/blog"
  release="$root/releases/$release_id"
  obsolete="$root/releases/$(printf 'b%.0s' {1..40})-7-1"
  mkdir -p "$obsolete"
  echo retain-until-healthy > "$obsolete/marker"
  mkdir -p "$TEST_PM2_STATE" "$root/node_modules" "$root/public" "$release/.next" "$release/public" "$sandbox/uploads"
  echo old-npm > "$root/node_modules/marker"
  echo legacy > "$root/public/deploy-version.txt"
  echo fixture > "$root/.env"
  echo build > "$release/.next/BUILD_ID"
  echo '{"packageManager":"pnpm@12.3.4"}' > "$release/package.json"
  touch "$release/pnpm-lock.yaml" "$release/pnpm-workspace.yaml"
  cp "$source_root/ecosystem.config.cjs" "$release/"
  mkdir -p "$release/scripts"
  cp "$source_root/scripts/standalone-release.mjs" "$source_root/scripts/prune-releases.mjs" "$release/scripts/"
  mkdir -p "$release/node_modules"
  echo fresh-pnpm > "$release/node_modules/marker"
  cp "$sandbox/server.cjs" "$release/server.js"
  echo "$release_id" > "$release/public/deploy-version.txt"
  mkdir -p "$release/deployment/scripts" "$release/deployment/node_modules/prisma/build" "$release/prisma"
  touch "$release/prisma/schema.prisma"
  cat > "$release/deployment/node_modules/prisma/build/index.js" <<'JS'
if (process.env.EXISTING_RUNTIME_SETTING !== 'retained') process.exit(21);
if (process.env.TEST_FAIL === 'migrate') process.exit(20);
JS
  cat > "$release/deployment/scripts/deployment-db.mjs" <<'JS'
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const [phase, state, id, prismaCli] = process.argv.slice(2);
if (phase === 'inspect') {
  if (process.env.TEST_FAIL === 'inspect') process.exit(24);
  fs.writeFileSync(state + '/backup-required', 'yes');
} else if (phase === 'prepare') {
  if (process.env.TEST_FAIL === 'backup') process.exit(25);
  fs.writeFileSync(state + '/backup-manifest.json', JSON.stringify({ releaseId: id }));
} else {
  if (!fs.existsSync(state + '/backup-verified.json')) process.exit(26);
  const config = JSON.parse(fs.readFileSync(state + '/next.json')).apps[0];
  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { env: { ...process.env, ...config.env } });
  if (result.status !== 0) process.exit(result.status || 1);
}
JS
  (cd "$release" && tar -czf standalone-release.tar.gz .next public node_modules package.json pnpm-lock.yaml ecosystem.config.cjs server.js deployment prisma scripts/prune-releases.mjs && node scripts/standalone-release.mjs create "$release_id" "$release")
  rm -rf -- "$release/.next" "$release/public" "$release/node_modules" "$release/package.json" "$release/pnpm-lock.yaml" "$release/ecosystem.config.cjs" "$release/server.js" "$release/deployment" "$release/prisma"
  if [[ $name == install ]]; then echo damaged >> "$release/standalone-release.tar.gz"; fi
  if [[ $name == receipt ]]; then
    node - "$release/standalone-release.json" <<'JS'
const fs = require('node:fs');
const receipt = JSON.parse(fs.readFileSync(process.argv[2]));
receipt.releaseId = 'wrong-release';
fs.writeFileSync(process.argv[2], JSON.stringify(receipt));
JS
  fi
  node - "$root" "$TEST_PM2_STATE" <<'JS'
const fs = require('node:fs');
const [root, state] = process.argv.slice(2);
fs.writeFileSync(state + '/legacy.json', JSON.stringify({ apps: [{ name: 'my-blog',
  script: '/legacy/npm', cwd: root, interpreter: process.execPath, args: ['start'],
  env: { PORT: '48133', EXISTING_RUNTIME_SETTING: 'retained' },
}] }));
JS
  pm2 start "$TEST_PM2_STATE/legacy.json"
  : > "$TEST_PM2_STATE/events"
}
failures=(install receipt inspect backup verification migrate)
if [[ $("$TEST_REAL_NODE" -p "process.versions.node.split('.')[0]") != 24 ]]; then
  failures=(node-bootstrap "${failures[@]}")
fi
for failure in "${failures[@]}"; do
  prepare "$failure"
  export TEST_FAIL="$failure"
  if deploy; then exit 1; fi
  [[ $(cat "$root/node_modules/marker") == old-npm ]]
  [[ ! -s "$TEST_PM2_STATE/events" && ! -e "$root/current" ]]
  [[ -e "$obsolete/marker" ]]
  pm2 delete my-blog >/dev/null
done
for failure in health health_api; do
prepare "$failure"
export TEST_FAIL="$failure"
if deploy; then exit 1; fi
[[ $(cat "$root/node_modules/marker") == old-npm && ! -e "$root/current" ]]
[[ -e "$obsolete/marker" ]]
node - "$root" "$TEST_PM2_STATE" <<'JS'
const fs = require('node:fs');
const [root, state] = process.argv.slice(2);
const app = JSON.parse(fs.readFileSync(state + '/app.json'))[0];
if (app.pm2_env.pm_cwd !== root || app.pm2_env.pm_exec_path !== '/legacy/npm') process.exit(1);
JS
pm2 delete my-blog >/dev/null
done
prepare success
unset TEST_FAIL
deploy
[[ $(cat "$root/node_modules/marker") == old-npm ]]
[[ $(cat "$release/node_modules/marker") == fresh-pnpm && $(readlink "$root/current") == "$release" ]]
[[ ! -e $obsolete ]]
[[ $(readlink "$release/.env") == "$root/.env" ]]
node - "$release" "$TEST_PM2_STATE" "$sandbox/uploads" <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const [release, state, uploads] = process.argv.slice(2);
const app = JSON.parse(fs.readFileSync(state + '/app.json'))[0].pm2_env;
if (app.pm_cwd !== release || app.pm_exec_path !== path.join(release, 'server.js') ||
  !app.exec_interpreter || app.env.HOSTNAME !== '127.0.0.1' ||
  app.env.EXISTING_RUNTIME_SETTING !== 'retained' || app.env.UPLOAD_DIR !== uploads) process.exit(1);
const runtimeDirs = app.env.PATH.split(path.delimiter);
if (execFileSync(app.exec_interpreter, ['-p', "process.versions.node.split('.')[0]"], { encoding: 'utf8' }).trim() !== '24')
  throw new Error('Standalone PM2 interpreter must use Node 24 directly');
const hostMajor = execFileSync(process.env.TEST_REAL_NODE,
  ['-p', "process.versions.node.split('.')[0]"], { encoding: 'utf8' }).trim();
if (hostMajor !== '24') {
  const privateNodeDir = path.join(process.env.BLOG_TOOLS_DIR, 'node-24.20.0/node_modules/node/bin');
  if (runtimeDirs[0] !== privateNodeDir) throw new Error('Candidate PATH must prefer private Node 24');
}
JS
node <<'JS'
fetch('http://127.0.0.1:48133').then(r => {
  if (r.headers.get('X-Node-Major') !== '24') process.exitCode = 1;
}).catch(() => { process.exitCode = 1; });
JS
# Private bootstrap must not replace the host's original Node binary or version.
if [[ -x "$BLOG_TOOLS_DIR/node-24.20.0/node_modules/node/bin/node" ]]; then
  [[ $("$TEST_REAL_NODE" -p "process.versions.node.split('.')[0]") != 24 ]]
fi
# A used release cannot be reinstalled over its running dependencies.
if bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads" prepare; then exit 1; fi
echo 'Deployment checks passed: Node 24 runtime, private bootstrap, pre-switch failures, health rollback, old modules, environment and reuse rejection'
