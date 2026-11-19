#!/usr/bin/env bash
# This supervisor remains outside the process group terminated by timeout.
set -euo pipefail
phase=${1:?phase required}
budget=${2:?command budget required}
shift 2
[[ $phase =~ ^[a-z][a-z0-9-]*$ && $budget =~ ^[1-9][0-9]*$ ]] && (( budget <= 3500 ))
cleanup_state=''
if [[ $phase == backup ]]; then
  root=$(realpath -e -- "${1:?deployment root required}")
  release_id=${2:?release id required}
  [[ $release_id =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]
  state="$root/.deploy-state/$release_id"
  [[ -d $state && ! -L $state && $(realpath -e -- "$state") == "$state" ]]
  cleanup_state=$state
fi
cleanup() {
  if [[ -n $cleanup_state ]]; then
    rm -f -- "$cleanup_state/dump-client.cnf" "$cleanup_state/dump-ca.pem"
  fi
}
trap cleanup EXIT
timeout --signal=TERM --kill-after=5s "${budget}s" bash -se -- "$@"
