#!/usr/bin/env bash
set -euo pipefail
root=${1:?deployment root required}
release_id=${2:?release id required}
[[ $root == /* && $release_id =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]
id appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser
mkdir -p -- "$root/releases"
root=$(realpath -e -- "$root")
releases=$(realpath -e -- "$root/releases")
[[ $releases == "$root/releases" ]] || { echo 'Unexpected releases symlink' >&2; exit 1; }
release="$releases/$release_id"
[[ ! -e $release ]] || { echo 'Release directory already exists; use a new workflow attempt' >&2; exit 1; }
mkdir -- "$release"
# Change only three deployment directory entries; legacy uploads are untouched.
chown appuser:appuser -- "$root" "$releases" "$release"
printf '[deploy:directories] prepared current release; historical files were not traversed\n'
