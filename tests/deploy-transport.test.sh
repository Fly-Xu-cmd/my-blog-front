#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")/.." && pwd)
sandbox=$(mktemp -d /tmp/blog-transport-test.XXXXXX)
trap '[[ $sandbox == /tmp/blog-transport-test.* ]] && rm -rf -- "$sandbox"' EXIT
mkdir "$sandbox/bin" "$sandbox/temp"
export PATH="$sandbox/bin:$PATH" RUNNER_TEMP="$sandbox/temp" DEPLOY_KEY=test-only-key
export DEPLOY_HOST=localhost SSH_USER=appuser TEST_TRANSPORT="$sandbox"
export GITHUB_STEP_SUMMARY="$sandbox/summary"
cat > "$sandbox/bin/ssh" <<'SH'
#!/usr/bin/env bash
set -eu
for required in ConnectTimeout=15 ConnectionAttempts=1 ServerAliveInterval=15 ServerAliveCountMax=2 BatchMode=yes; do
  [[ " $* " == *" $required "* ]] || exit 90
done
printf 'call\n' >> "$TEST_TRANSPORT/calls"
for ((i=1; i<=$#; i++)); do
  if [[ ${!i} == -i ]]; then j=$((i+1)); printf '%s\n' "${!j}" > "$TEST_TRANSPORT/key-path"; fi
done
[[ ${FAKE_SSH_FAILURE:-} != connection ]] || { echo 'test connection refused' >&2; exit 255; }
[[ ${FAKE_SSH_FAILURE:-} != stalled ]] || { sleep 30; exit 0; }
exec bash -c "${!#}"
SH
chmod +x "$sandbox/bin/ssh"
failure() {
  local wanted=$1
  shift
  local code=0
  "$@" > "$sandbox/output" 2>&1 || code=$?
  [[ $code == "$wanted" ]] || { cat "$sandbox/output"; exit 1; }
  [[ ! -e $(cat "$sandbox/key-path") ]]
  [[ -z $(ls -A "$sandbox/temp") ]]
}
export FAKE_SSH_FAILURE=connection
failure 255 bash "$root/scripts/deploy-ssh.sh" directory 2 <<REMOTE
touch "$sandbox/mutation"
REMOTE
[[ ! -e $sandbox/mutation ]]
[[ $(wc -l < "$sandbox/calls") == 1 ]]
grep 'SSH_FAILED: ssh-readiness' "$sandbox/output" >/dev/null
unset FAKE_SSH_FAILURE
argument='spaces and a single quote '\'' with $() kept literal'
bash "$root/scripts/deploy-ssh.sh" test-success 2 "$argument" <<'REMOTE' > "$sandbox/output"
printf '%s\n' "$1"
REMOTE
grep -F "$argument" "$sandbox/output" >/dev/null
[[ ! -e $(cat "$sandbox/key-path") ]]
failure 23 bash "$root/scripts/deploy-ssh.sh" remote-failure 2 <<'REMOTE'
exit 23
REMOTE
grep 'DEPLOY_FAILED: remote-failure' "$sandbox/output" >/dev/null
failure 124 bash "$root/scripts/deploy-ssh.sh" stalled-command 1 <<'REMOTE'
sleep 30
REMOTE
grep 'TIMEOUT: stalled-command' "$sandbox/output" >/dev/null
export FAKE_SSH_FAILURE=stalled
failure 124 bash -c 'source "$1/scripts/deploy-transport.sh"; bounded_transport stalled-session 1 ssh "${ssh_options[@]}" "$ssh_target" true' -- "$root"
grep 'TIMEOUT: stalled-session' "$sandbox/output" >/dev/null
unset FAKE_SSH_FAILURE

# The supervisor must remove dump credentials even when timeout kills the entire
# payload process group, while leaving the private backup and receipt intact.
backup_id=$(printf 'c%.0s' {1..40})-1-1
backup_state="$sandbox/backup-blog/.deploy-state/$backup_id"
mkdir -p "$backup_state"
echo private-backup > "$backup_state/backup.sql"
echo receipt > "$backup_state/backup-verified.json"
failure 124 bash "$root/scripts/deploy-ssh.sh" backup 1 "$sandbox/backup-blog" "$backup_id" <<'REMOTE'
state="$1/.deploy-state/$2"
echo test-only-credentials > "$state/dump-client.cnf"
echo test-only-ca > "$state/dump-ca.pem"
sleep 30
REMOTE
[[ ! -e $backup_state/dump-client.cnf && ! -e $backup_state/dump-ca.pem ]]
failure 137 bash "$root/scripts/deploy-ssh.sh" backup 1 "$sandbox/backup-blog" "$backup_id" <<'REMOTE'
state="$1/.deploy-state/$2"
echo test-only-credentials > "$state/dump-client.cnf"
echo test-only-ca > "$state/dump-ca.pem"
trap '' TERM
while :; do sleep 30; done
REMOTE
[[ ! -e $backup_state/dump-client.cnf && ! -e $backup_state/dump-ca.pem ]]
[[ $(cat "$backup_state/backup.sql") == private-backup && $(cat "$backup_state/backup-verified.json") == receipt ]]

# Exercise directory preparation while proving history/upload contents are not traversed.
printf '#!/bin/sh\nexit 0\n' > "$sandbox/bin/id"
printf '#!/bin/sh\nprintf "%%s\\n" "$@" > "$TEST_TRANSPORT/chown-args"\n' > "$sandbox/bin/chown"
chmod +x "$sandbox/bin/id" "$sandbox/bin/chown"
mkdir -p "$sandbox/blog/releases/legacy" "$sandbox/uploads"
touch "$sandbox/blog/releases/legacy/retain" "$sandbox/uploads/retain"
id=$(printf 'a%.0s' {1..40})-1-1
bash "$root/scripts/prepare-release-directory.sh" "$sandbox/blog" "$id" "$sandbox/uploads"
[[ -e $sandbox/blog/releases/legacy/retain && -e $sandbox/uploads/retain ]]
[[ $(wc -l < "$sandbox/chown-args") == 6 ]]
! grep -E -- '-R|recursive|/legacy|/retain' "$sandbox/chown-args"
echo 'SSH connection failure, hung transport, remote timeout, backup TERM/KILL credential cleanup, exit status, argument quoting, key cleanup and bounded directory preparation passed'
