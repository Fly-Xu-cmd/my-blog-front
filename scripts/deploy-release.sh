#!/usr/bin/env bash
set -eEuo pipefail
umask 077

# Each workflow attempt owns a fresh directory; the running npm installation is untouched.
deploy_root=$(realpath -e -- "${1:?deployment root required}")
release_id=${2:?release id required}
upload_dir=$(realpath -e -- "${3:?upload directory required}")
phase=${4:?prepare, backup or activate required}
[[ $phase == prepare || $phase == backup || $phase == activate ]] || { echo 'Invalid deployment phase' >&2; exit 1; }
[[ $release_id =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release id' >&2; exit 1; }
release=$(realpath -e -- "$deploy_root/releases/$release_id")
[[ $release == "$deploy_root/releases/$release_id" ]] || { echo 'Invalid release path' >&2; exit 1; }
if [[ $phase == prepare ]]; then
[[ ! -e "$release/node_modules" && ! -L "$release/node_modules" ]] || {
  echo 'Release directory already contains dependencies; use a new workflow attempt' >&2; exit 1;
}
fi
[[ ! -e "$deploy_root/current" || -L "$deploy_root/current" ]] || {
  echo 'current must be absent or a release symlink' >&2; exit 1;
}
command -v timeout >/dev/null
export BLOG_DEPLOY_NPM_REGISTRY=${BLOG_DEPLOY_NPM_REGISTRY:-https://registry.npmmirror.com}
[[ $BLOG_DEPLOY_NPM_REGISTRY =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._/-]*)?$ ]] || {
  echo 'Invalid deployment npm registry: use an HTTPS URL without credentials' >&2; exit 1;
}
export BLOG_TOOLS_DIR=${BLOG_TOOLS_DIR:-"$HOME/.local/share/blog-tools"}
# An existing npm/Node 20 installation can prepare a private Node 24 runtime.
# Explicit PATH works in non-interactive SSH; nvm and global runtime changes are unnecessary.
if [[ $(node -p "process.versions.node.split('.')[0]") != 24 ]]; then
  command -v npm >/dev/null
  node_prefix="$BLOG_TOOLS_DIR/node-24.20.0"
  node_bin="$node_prefix/node_modules/node/bin/node"
  if [[ ! -x $node_bin ]] || [[ $("$node_bin" --version) != v24.20.0 ]]; then
    timeout --signal=TERM --kill-after=10s 180s npm install --prefix "$node_prefix" --no-save --package-lock=false \
      node@24.20.0 "--registry=$BLOG_DEPLOY_NPM_REGISTRY" --fetch-timeout=60000 --fetch-retries=1
  fi
  test "$("$node_bin" --version)" = v24.20.0
  export PATH="$node_prefix/node_modules/node/bin:$PATH"
fi
test "$(node -p "process.versions.node.split('.')[0]")" = 24
command -v pm2 >/dev/null
cd "$release"
if [[ $phase == prepare ]]; then
  echo 'Validating official standalone archive (no application dependency install)'
  node scripts/standalone-release.mjs validate-archive "$release_id"
  if ! tar -tzf standalone-release.tar.gz | awk '
    /^\// || /(^|\/)\.\.($|\/)/ { invalid = 1 }
    END { exit invalid }
  '; then
    echo 'Invalid standalone archive path' >&2; exit 1
  fi
  timeout --signal=TERM --kill-after=10s 180s tar -xzf standalone-release.tar.gz --no-same-owner
  node scripts/standalone-release.mjs validate-files "$release_id"
  echo 'Standalone application and separate production deployment tools extracted'
fi
test -f server.js
test -f .next/BUILD_ID
test -f deployment/node_modules/prisma/build/index.js
test "$(node -p "require('./package.json').packageManager")" = pnpm@12.3.4
health_attempts=${BLOG_DEPLOY_HEALTH_ATTEMPTS:-30}
[[ $health_attempts =~ ^[1-9][0-9]?$ && $health_attempts -le 60 ]] || {
  echo 'Invalid health check attempts' >&2; exit 1;
}

prisma_cli="$release/deployment/node_modules/prisma/build/index.js"
export UPLOAD_DIR="$upload_dir"
export BLOG_DEPLOY_ROOT="$deploy_root"
if [[ $phase == prepare ]]; then
for env_file in .env .env.local .env.production .env.production.local; do
  if [[ -f "$deploy_root/$env_file" ]]; then
    ln -s -- "$deploy_root/$env_file" "$release/$env_file"
  fi
done
fi

# Store private, app-specific rollback configuration. Do not restart other PM2 applications.
state="$deploy_root/.deploy-state/$release_id"
if [[ $phase == prepare ]]; then
mkdir -p -- "$state"
pm2 ping >/dev/null
pm2 jlist > "$state/before.json"
node - "$state" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const state = process.argv[2];
const previous = JSON.parse(fs.readFileSync(path.join(state, 'before.json'), 'utf8'))
  .filter(app => app.name === 'my-blog');
if (previous.length > 1) throw new Error('Existing cluster requires a separate migration');
const rollback = previous.map(app => {
  const e = app.pm2_env;
  return { name: app.name, script: e.pm_exec_path, cwd: e.pm_cwd,
    interpreter: e.exec_interpreter, args: e.args, exec_mode: e.exec_mode,
    instances: e.instances, env: e.env };
});
const target = require(path.join(process.cwd(), 'ecosystem.config.cjs'));
target.apps[0].env = { ...(previous[0]?.pm2_env.env ?? {}),
  PATH: process.env.PATH, ...target.apps[0].env, BLOG_DEPLOY_ROOT: process.env.BLOG_DEPLOY_ROOT };
const port = Number(target.apps[0].env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid application port');
fs.writeFileSync(path.join(state, 'previous.json'), JSON.stringify({ apps: rollback }), { mode: 0o600 });
fs.writeFileSync(path.join(state, 'next.json'), JSON.stringify(target), { mode: 0o600 });
fs.writeFileSync(path.join(state, 'port'), String(port));
fs.writeFileSync(path.join(state, 'had-app'), previous.length ? 'yes' : 'no');
NODE

node deployment/scripts/deployment-db.mjs inspect "$state" "$release_id" "$prisma_cli"
echo "Release prepared: $release_id; migration plan inspected"
exit 0
fi

# Receipt and migration plan are rechecked before any formal migration or PM2 switch.
test -f "$state/next.json"
test -f "$state/previous.json"
if [[ $phase == backup ]]; then
  node deployment/scripts/deployment-db.mjs prepare "$state" "$release_id" "$prisma_cli"
  exit 0
fi
node deployment/scripts/deployment-db.mjs activate "$state" "$release_id" "$prisma_cli"
printf '%s\n' "$release_id" > public/deploy-version.txt

switch_started=false
committed=false
on_exit() {
  code=$?
  trap - EXIT
  if [[ $switch_started == true && $committed == false ]]; then
    echo 'Release failed; restoring the previous PM2 application' >&2
    pm2 delete my-blog >/dev/null 2>&1 || true
    if [[ $(cat "$state/had-app") == yes ]]; then
      if ! pm2 start "$state/previous.json" --only my-blog; then
        echo 'Automatic rollback failed; use the private previous.json configuration' >&2
      fi
    fi
  fi
  exit "$code"
}
trap on_exit EXIT
switch_started=true
if [[ $(cat "$state/had-app") == yes ]]; then pm2 delete my-blog; fi
pm2 startOrReload "$state/next.json" --only my-blog --update-env

# The exact release marker prevents the still-running old app from passing the check.
healthy=false
for ((attempt = 1; attempt <= health_attempts; attempt++)); do
  if node - "$(cat "$state/port")" "$release_id" <<'NODE'
const [port, id] = process.argv.slice(2);
fetch(`http://127.0.0.1:${port}/deploy-version.txt`, { signal: AbortSignal.timeout(2000) })
  .then(async r => {
    if (!r.ok || (await r.text()).trim() !== id) throw new Error('Release mismatch');
    const api = await fetch(`http://127.0.0.1:${port}/api/posts?pageSize=1`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!api.ok) throw new Error('Public content unavailable');
    const data = await api.json();
    if (data.ok !== true || !Array.isArray(data.data)) throw new Error('Invalid content response');
  })
  .catch(() => { process.exitCode = 1; });
NODE
  then healthy=true; break; fi
  if ((attempt < health_attempts)); then sleep 2; fi
done
[[ $healthy == true ]] || { echo 'New release failed its health check' >&2; exit 1; }
ln -s -- "$release" "$deploy_root/.current-$release_id"
mv -Tf -- "$deploy_root/.current-$release_id" "$deploy_root/current"
committed=true
echo "Deployment healthy: $release_id; previous modules and rollback configuration retained"
