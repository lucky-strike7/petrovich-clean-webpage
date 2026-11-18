#!/usr/bin/env bash
set -euo pipefail
[[ "$#" == 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || exit 64
commit=$1
cd "$(dirname "$0")/.."
release_dir=$PWD
[[ "$(basename "$(dirname "$release_dir")")" == releases ]] || exit 64
base=$(cd "$release_dir/../.." && pwd -P)
repository=https://github.com/lucky-strike7/petrovich-clean-webpage.git
if [[ "${PB_DEPLOY_LOCK_HELD:-0}" == 1 ]]; then
    flock -n 9
else
    exec 9>/var/lock/pb-website-deploy.lock
    flock -w 1800 9
fi
ensure_current_main() {
    local latest
    latest=$(git ls-remote "$repository" refs/heads/main | awk '{print $1}') || { printf 'Cannot read current main.\n' >&2; exit 1; }
    [[ "$latest" =~ ^[0-9a-f]{40}$ ]] || exit 1
    if [[ "$latest" != "$commit" ]]; then
        printf 'Skipping superseded commit %s; main is %s.\n' "$commit" "$latest"
        exit 0
    fi
}
ensure_current_main
image="petrovich-clean:commit-${commit:0:12}"
candidate="pb-candidate-${commit:0:12}-$$"
previous_image=$(docker inspect pb-website --format '{{.Config.Image}}')
previous_compose=$(docker inspect pb-website --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}')
[[ "$previous_compose" == "$base"/releases/*/deploy/compose.yml && -f "$previous_compose" ]] || exit 1
switch_started=false
on_exit() {
    result=$?
    trap - EXIT
    if [[ "$result" != 0 && "$switch_started" == true ]]; then
        printf 'Publication failed; restoring %s.\n' "$previous_image" >&2
        PB_RELEASE="$previous_image" docker compose -f "$previous_compose" up -d --no-deps web || printf 'ROLLBACK FAILED: operator action required.\n' >&2
    fi
    docker rm -f "$candidate" >/dev/null 2>&1 || true
    exit "$result"
}
trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
existing=$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null || true)
if [[ "$existing" != "$commit" ]]; then
    docker build --memory=1536m --cpu-quota=100000 --build-arg "BUILD_COMMIT=$commit" -t "$image" .
fi
# No credentials or external network in the candidate.
docker run -d --name "$candidate" --network none --memory=256m \
    --read-only --security-opt=no-new-privileges:true --cap-drop ALL "$image" >/dev/null
ready=false
for attempt in {1..20}; do
    if docker exec -i "$candidate" node --input-type=module - "$commit" < scripts/check-release.mjs; then ready=true; break; fi
    sleep 1
done
[[ "$ready" == true ]] || { printf 'Candidate failed; production unchanged.\n' >&2; exit 1; }
# A newer main may have arrived during the build; never publish an older one over it.
ensure_current_main
switch_started=true
PB_RELEASE="$image" docker compose -f deploy/compose.yml up -d --no-deps web
healthy=false
for attempt in {1..20}; do
    if docker exec -i pb-website node --input-type=module - "$commit" < scripts/check-release.mjs; then healthy=true; break; fi
    sleep 1
done
[[ "$healthy" == true ]] || exit 1
headers=$(mktemp "$base/state/public-headers.XXXXXX")
if ! curl --fail --silent --show-error --retry 3 --retry-delay 1 --connect-timeout 10 --max-time 20 \
    -D "$headers" -o /dev/null https://petrovichbrothers.ru/; then rm -f "$headers"; exit 1; fi
public_commit=$(tr -d '\r' < "$headers" | awk 'tolower($1)=="x-site-release:" {print $2}')
rm -f "$headers"
[[ "$public_commit" == "$commit" ]] || exit 1
python3 - "$base" "$commit" "$image" "$previous_image" "$previous_compose" <<'PY'
import datetime,json,os,sys
from pathlib import Path
base,commit,image,previous,compose=sys.argv[1:]
p=Path(base)/'state/last-deployment.json'
tmp=p.with_suffix('.tmp')
tmp.write_text(json.dumps({'deployedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':commit,'image':image,'previousImage':previous,'previousCompose':compose,'url':'https://petrovichbrothers.ru/'},indent=2)+'\n')
os.replace(tmp,p)
link=Path(base)/'.current-next'
link.unlink(missing_ok=True)
link.symlink_to('releases/'+commit)
os.replace(link,Path(base)/'current')
PY
switch_started=false
printf 'Published %s: https://petrovichbrothers.ru/\n' "$commit"
