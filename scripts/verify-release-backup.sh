#!/usr/bin/env bash
set -euo pipefail
umask 077
base=${RUNNER_TEMP:-/tmp}
export SSH_USER=${SSH_USER:-${DEPLOY_USER:?deployment user required}}
source "$(dirname -- "$0")/deploy-transport.sh"
temporary=$(mktemp -d "$base/blog-backup-verify.XXXXXX")
cleanup() {
  case "$temporary" in "$base"/blog-backup-verify.*) rm -rf -- "$temporary" ;; esac
  cleanup_transport
}
trap cleanup EXIT
remote=$ssh_target
state="${DEPLOY_PATH:?}/.deploy-state/${RELEASE_ID:?}"
[[ $RELEASE_ID =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]
ssh_ready
bounded_transport backup-manifest-download 60 scp "${ssh_options[@]}" -P "${DEPLOY_PORT:-22}" "$remote:$state/backup-manifest.json" "$temporary/"
if node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1])).pending.length ? 0 : 1)' "$temporary/backup-manifest.json"; then
  bounded_transport backup-download 600 scp "${ssh_options[@]}" -P "${DEPLOY_PORT:-22}" "$remote:$state/backup.sql" "$temporary/"
fi
node scripts/verify-backup.mjs "$temporary" "$RELEASE_ID"
bounded_transport backup-receipt-upload 60 scp "${ssh_options[@]}" -P "${DEPLOY_PORT:-22}" "$temporary/backup-verified.json" "$remote:$state/backup-verified.json"
if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
  node - "$temporary/backup-verified.json" >> "$GITHUB_STEP_SUMMARY" <<'NODE'
const fs = require('node:fs');
const receipt = JSON.parse(fs.readFileSync(process.argv[2]));
console.log('## 数据库迁移检查\n');
console.log(receipt.restoreVerified ? '检测到新迁移：私有备份已在 CI 独立数据库恢复并核验，允许继续。' : '没有新迁移：跳过备份与恢复验证。');
NODE
fi
