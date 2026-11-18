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
export PATH="$sandbox/bin:$PATH"
export BLOG_TOOLS_DIR="$sandbox/tools"
export BLOG_DEPLOY_HEALTH_ATTEMPTS=2
cat > "$sandbox/bin/npm" <<'SH'
#!/usr/bin/env bash
set -eu
[[ $1 == install && $2 == --prefix ]]
mkdir -p "$3/node_modules/pnpm" "$3/node_modules/.bin"
cp "$TEST_FIXTURE_PNPM" "$3/node_modules/pnpm/pnpm"
chmod +x "$3/node_modules/pnpm/pnpm"
ln -sf "$3/node_modules/pnpm/pnpm" "$3/node_modules/.bin/pnpm"
SH
cat > "$sandbox/pnpm" <<'SH'
#!/usr/bin/env bash
set -eu
if [[ $1 == --version ]]; then echo 12.3.4; exit; fi
if [[ $1 == install ]]; then
  [[ ! -e node_modules ]]
  [[ ${TEST_FAIL:-} != install ]] || exit 19
  mkdir node_modules
  echo fresh-pnpm > node_modules/marker
elif [[ $1 == exec && $2 == prisma ]]; then
  [[ ${EXISTING_RUNTIME_SETTING:-} == retained ]]
  [[ ${TEST_FAIL:-} != "$3" ]] || exit 20
else exit 21; fi
SH
export TEST_FIXTURE_PNPM="$sandbox/pnpm"
cat > "$sandbox/server.cjs" <<'JS'
const http = require('node:http');
const fs = require('node:fs');
http.createServer((req, res) => {
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
  const child = spawn(process.execPath, [process.env.TEST_SERVER], {
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
prepare() {
  local name=$1
  export TEST_PM2_STATE="$sandbox/$name/pm2"
  root="$sandbox/$name/blog"
  release="$root/releases/$release_id"
  mkdir -p "$TEST_PM2_STATE" "$root/node_modules" "$root/public" "$release/.next" "$release/public" "$sandbox/uploads"
  echo old-npm > "$root/node_modules/marker"
  echo legacy > "$root/public/deploy-version.txt"
  echo fixture > "$root/.env"
  echo build > "$release/.next/BUILD_ID"
  echo '{"packageManager":"pnpm@12.3.4"}' > "$release/package.json"
  touch "$release/pnpm-lock.yaml" "$release/pnpm-workspace.yaml"
  cp "$source_root/ecosystem.config.cjs" "$release/"
  cp "$source_root/next.config.mjs" "$release/"
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
for failure in install generate migrate; do
  prepare "$failure"
  export TEST_FAIL="$failure"
  if bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads"; then exit 1; fi
  [[ $(cat "$root/node_modules/marker") == old-npm ]]
  [[ ! -s "$TEST_PM2_STATE/events" && ! -e "$root/current" ]]
  pm2 delete my-blog >/dev/null
done
for failure in health health_api; do
prepare "$failure"
export TEST_FAIL="$failure"
if bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads"; then exit 1; fi
[[ $(cat "$root/node_modules/marker") == old-npm && ! -e "$root/current" ]]
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
bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads"
[[ $(cat "$root/node_modules/marker") == old-npm ]]
[[ $(cat "$release/node_modules/marker") == fresh-pnpm && $(readlink "$root/current") == "$release" ]]
[[ $(readlink "$release/.env") == "$root/.env" ]]
node - "$release" "$TEST_PM2_STATE" "$sandbox/uploads" <<'JS'
const fs = require('node:fs');
const [release, state, uploads] = process.argv.slice(2);
const app = JSON.parse(fs.readFileSync(state + '/app.json'))[0].pm2_env;
if (app.pm_cwd !== release || app.exec_interpreter !== 'none' ||
  app.env.EXISTING_RUNTIME_SETTING !== 'retained' || app.env.UPLOAD_DIR !== uploads) process.exit(1);
JS
# A used release cannot be reinstalled over its running dependencies.
if bash "$source_root/scripts/deploy-release.sh" "$root" "$release_id" "$sandbox/uploads"; then exit 1; fi
echo 'Deployment checks passed: fresh install, three pre-switch failures, health rollback, old modules, environment and reuse rejection'
