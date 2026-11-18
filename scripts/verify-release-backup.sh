#!/usr/bin/env bash
set -euo pipefail
umask 077
base=${RUNNER_TEMP:-/tmp}
temporary=$(mktemp -d "$base/blog-backup-verify.XXXXXX")
cleanup() {
  case "$temporary" in "$base"/blog-backup-verify.*) rm -rf -- "$temporary" ;; esac
}
trap cleanup EXIT
printf '%s\n' "${DEPLOY_KEY:?SSH key required}" > "$temporary/key"
chmod 600 "$temporary/key"
remote="${DEPLOY_USER:?}@${DEPLOY_HOST:?}"
state="${DEPLOY_PATH:?}/.deploy-state/${RELEASE_ID:?}"
[[ $RELEASE_ID =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]
ssh_args=(-i "$temporary/key" -o BatchMode=yes -o StrictHostKeyChecking=no)
scp "${ssh_args[@]}" "$remote:$state/backup-manifest.json" "$temporary/"
if node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1])).pending.length ? 0 : 1)' "$temporary/backup-manifest.json"; then
  scp "${ssh_args[@]}" "$remote:$state/backup.sql" "$temporary/"
fi
node scripts/verify-backup.mjs "$temporary" "$RELEASE_ID"
scp "${ssh_args[@]}" "$temporary/backup-verified.json" "$remote:$state/backup-verified.json"
if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
  node - "$temporary/backup-verified.json" >> "$GITHUB_STEP_SUMMARY" <<'NODE'
const fs = require('node:fs');
const receipt = JSON.parse(fs.readFileSync(process.argv[2]));
console.log('## 数据库迁移检查\n');
console.log(receipt.restoreVerified ? '检测到新迁移：私有备份已在 CI 独立数据库恢复并核验，允许继续。' : '没有新迁移：跳过备份与恢复验证。');
NODE
fi
