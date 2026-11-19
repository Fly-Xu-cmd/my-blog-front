#!/usr/bin/env bash
set -euo pipefail
release_id=${1:?release id required}
[[ $release_id =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release id' >&2; exit 1; }
[[ $(node -p 'process.platform + "/" + process.arch') == linux/x64 ]] || { echo 'Standalone packaging requires Linux x64' >&2; exit 1; }
[[ $(node -p "process.versions.node.split('.')[0]") == 24 ]]
source_root=$(pwd)
stage=$(mktemp -d)
trap 'rm -rf -- "$stage"' EXIT
test -f .next/standalone/server.js
# Official standalone output omits these assets; serve them with server.js.
mkdir -p .next/standalone/public .next/standalone/.next/static
cp -a public/. .next/standalone/public/
cp -a .next/static/. .next/standalone/.next/static/
cp -a .next/standalone/. "$stage/"
rm -f "$stage"/.env "$stage"/.env.local "$stage"/.env.production "$stage"/.env.production.local

echo 'Preparing separate production deployment tools (Prisma CLI and database backup helper)'
timeout --signal=TERM --kill-after=10s 600s pnpm --filter @my-blog/deployment \
  --config.injectWorkspacePackages=true deploy --prod --ignore-scripts \
  --reporter=append-only --network-concurrency=8 --fetch-timeout=60000 --config.fetchRetries=1 "$stage/deployment"
mkdir -p "$stage/deployment/scripts" "$stage/prisma" "$stage/scripts"
cp scripts/deployment-db.mjs "$stage/deployment/scripts/"
cp scripts/deploy-release.sh scripts/standalone-release.mjs scripts/prune-releases.mjs "$stage/scripts/"
cp -a prisma/migrations prisma/schema.prisma "$stage/prisma/"
cp ecosystem.config.cjs pnpm-lock.yaml "$stage/"
printf '%s\n' "$release_id" > "$stage/public/deploy-version.txt"
# Fetch native migration engines only in CI. A tool version query initializes
# engines, without connecting to a database or regenerating the app client.
PRISMA_CLI_BINARY_TARGETS=debian-openssl-1.1.x,debian-openssl-3.0.x \
  timeout --signal=TERM --kill-after=10s 180s node "$stage/deployment/node_modules/prisma/build/index.js" --version
node scripts/standalone-release.mjs audit "$stage"
tar -czf standalone-release.tar.gz -C "$stage" .
node scripts/standalone-release.mjs create "$release_id" "$stage"
echo 'Official standalone release and receipt created; server application install is unnecessary'
