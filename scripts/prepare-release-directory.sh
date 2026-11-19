#!/usr/bin/env bash
set -euo pipefail
root=${1:?deployment root required}
release_id=${2:?release id required}
upload=${3:?upload directory required}
[[ $root == /* && $upload == /* && $release_id =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]
id appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser
mkdir -p -- "$root/releases" "$upload"
root=$(realpath -e -- "$root")
releases=$(realpath -e -- "$root/releases")
[[ $releases == "$root/releases" ]] || { echo 'Unexpected releases symlink' >&2; exit 1; }
release="$releases/$release_id"
[[ ! -e $release ]] || { echo 'Release directory already exists; use a new workflow attempt' >&2; exit 1; }
mkdir -- "$release"
# Change only four directory entries, regardless of historical files or uploads.
chown appuser:appuser -- "$root" "$releases" "$release" "$upload"
printf '[deploy:directories] prepared current release; historical files were not traversed\n'
