#!/usr/bin/env bash
# Shared by CI SSH and file transfer steps. Never echo key contents or commands.
set -euo pipefail
umask 077
[[ ${DEPLOY_HOST:-} =~ ^[A-Za-z0-9.-]+$ ]] || { echo 'Invalid deployment host' >&2; exit 1; }
[[ ${SSH_USER:-} =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || { echo 'Invalid SSH user' >&2; exit 1; }
[[ ${DEPLOY_PORT:-22} =~ ^[0-9]+$ ]] && (( ${DEPLOY_PORT:-22} > 0 && ${DEPLOY_PORT:-22} < 65536 ))
transport_dir=$(mktemp -d "${RUNNER_TEMP:-/tmp}/blog-transport.XXXXXX")
cleanup_transport() { rm -f -- "$transport_dir/key" "$transport_dir/script" "$transport_dir/ready"; rmdir -- "$transport_dir"; }
trap cleanup_transport EXIT
printf '%s\n' "${DEPLOY_KEY:?SSH key required}" > "$transport_dir/key"
ssh_options=(-i "$transport_dir/key" -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o ConnectionAttempts=1
  -o ServerAliveInterval=15 -o ServerAliveCountMax=2)
ssh_target="$SSH_USER@$DEPLOY_HOST"

transport_error() {
  local phase=$1 code=$2 limit=$3 message
  case "$code" in
    124|137) message="TIMEOUT: $phase exceeded ${limit}s; stopped waiting. Do not blindly retry a write phase." ;;
    255) message="SSH_FAILED: $phase failed during connection, authentication or transport; see SSH error above." ;;
    *) message="DEPLOY_FAILED: $phase returned exit code $code; see remote output above." ;;
  esac
  printf '::error title=Deployment %s failed::%s\n' "$phase" "$message" >&2
  if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then printf '\n- **%s failed**: %s\n' "$phase" "$message" >> "$GITHUB_STEP_SUMMARY"; fi
}

bounded_transport() {
  local phase=$1 limit=$2 code=0 started=$SECONDS
  shift 2
  [[ $phase =~ ^[a-z][a-z0-9-]*$ && $limit =~ ^[1-9][0-9]*$ ]] && (( limit <= 3600 ))
  printf '[deploy:%s] started; hard deadline %ss\n' "$phase" "$limit"
  timeout --signal=TERM --kill-after=5s "${limit}s" "$@" || code=$?
  if (( code != 0 )); then transport_error "$phase" "$code" "$limit"; return "$code"; fi
  printf '[deploy:%s] completed in %ss\n' "$phase" "$((SECONDS - started))"
}

ssh_ready() {
  bounded_transport ssh-readiness 40 ssh "${ssh_options[@]}" -p "${DEPLOY_PORT:-22}" "$ssh_target" \
    'command -v bash >/dev/null && command -v timeout >/dev/null && printf "SSH_READY\n"' < /dev/null
}
