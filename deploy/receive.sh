#!/usr/bin/env bash
# Installed root-owned; fetch only the public repository's current main.
set -euo pipefail
[[ "$EUID" == 0 && "$#" == 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || exit 64
commit=$1
base=/srv/docker/sites/petrovich-clean-webpage
repository=https://github.com/lucky-strike7/petrovich-clean-webpage.git
umask 077
mkdir -p "$base/releases" "$base/state"
exec 9>/var/lock/pb-website-deploy.lock
flock -w 1800 9
source_git="$base/source.git"
if [[ ! -d "$source_git" ]]; then git init --bare "$source_git" >/dev/null; fi
git --git-dir="$source_git" fetch --quiet --no-tags --depth=1 "$repository" refs/heads/main
latest=$(git --git-dir="$source_git" rev-parse FETCH_HEAD)
if [[ "$latest" != "$commit" ]]; then
    printf 'Skipping superseded commit %s; current main is %s.\n' "$commit" "$latest"
    exit 0
fi
release="$base/releases/$commit"
if [[ ! -d "$release" ]]; then
    temporary=$(mktemp -d "$base/releases/.prepare-${commit:0:12}.XXXXXX")
    trap 'rm -rf -- "$temporary"' EXIT
    git --git-dir="$source_git" archive "$commit" | tar --no-same-owner -x -C "$temporary"
    mv "$temporary" "$release"
    trap - EXIT
fi
export PB_DEPLOY_LOCK_HELD=1
exec bash "$release/deploy/publish.sh" "$commit"
