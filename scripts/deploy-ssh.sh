#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/deploy-transport.sh"
phase=${1:?phase required}
budget=${2:?command budget in seconds required}
shift 2
[[ $phase =~ ^[a-z][a-z0-9-]*$ && $budget =~ ^[1-9][0-9]*$ ]] && (( budget <= 3500 ))
# Read the payload before the readiness check; credentials never appear in it.
printf 'printf "[deploy:%s] remote script started\\n"\n' "$phase" > "$transport_dir/script"
cat >> "$transport_dir/script"
ssh_ready
supervisor=$(cat "$(dirname -- "$0")/deploy-remote.sh")
# Single-quote the supervisor for the remote login shell, including newlines.
supervisor=${supervisor//\'/\'\\\'\'}
remote_command="bash -c '$supervisor' -- $phase $budget"
for argument in "$@"; do
  printf -v quoted '%q' "$argument"
  remote_command+=" $quoted"
done
bounded_transport "$phase" "$((budget + 15))" ssh "${ssh_options[@]}" -p "${DEPLOY_PORT:-22}" \
  "$ssh_target" "$remote_command" < "$transport_dir/script"
