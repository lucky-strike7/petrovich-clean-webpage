#!/usr/bin/env python3
"""Plan first; remove only this website's releases/tags under the deploy lock."""
import argparse
import datetime
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

RELEASE = re.compile(r'^[0-9a-f]{12}(?:[0-9a-f]{28})?$')
IMAGE = re.compile(r'^petrovich-clean:commit-([0-9a-f]{12}(?:[0-9a-f]{28})?)$')
TEMP = re.compile(r'^\.prepare-[0-9a-f]{12}\.[A-Za-z0-9]+$')


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def inventory():
    ids = command('docker', 'ps', '-aq').split()
    fmt = '{"imageId":{{json .Image}},"image":{{json .Config.Image}},"composeFiles":{{json (index .Config.Labels "com.docker.compose.project.config_files")}},"mounts":{{json .Mounts}}}'
    containers = [json.loads(x) for x in command('docker', 'inspect', '--format', fmt, *ids).splitlines()] if ids else []
    ids = sorted(set(command('docker', 'image', 'ls', '--filter', 'reference=petrovich-clean:commit-*', '--format', '{{.ID}}').split()))
    fmt = '{"id":{{json .Id}},"tags":{{json .RepoTags}},"created":{{json .Created}}}'
    images = [json.loads(x) for x in command('docker', 'image', 'inspect', '--format', fmt, *ids).splitlines()] if ids else []
    return images, containers


def plan(base, images, containers, state, now=None):
    base = Path(base).resolve()
    releases = base / 'releases'
    now = time.time() if now is None else now
    protected_releases = set()
    protected_ids = {c['imageId'] for c in containers}
    protected_tags = {state['image'], state['previousImage']}

    def protect_path(value):
        if not value:
            return
        try:
            name = Path(value).resolve().relative_to(releases).parts[0]
            if RELEASE.fullmatch(name) or TEMP.fullmatch(name):
                protected_releases.add(name)
        except (ValueError, IndexError):
            pass

    protect_path(base / 'current')
    protect_path(state['previousCompose'])
    for c in containers:
        protected_tags.add(c['image'])
        for value in (c.get('composeFiles') or '').split(','):
            protect_path(value)
        for mount in c.get('mounts') or []:
            protect_path(mount.get('Source'))

    owned = []
    for item in images:
        tags = [tag for tag in item.get('tags') or [] if IMAGE.fullmatch(tag)]
        if tags:
            owned.append({**item, 'tags': tags})
            if protected_tags.intersection(tags):
                protected_ids.add(item['id'])
    owned.sort(key=lambda item: item['created'], reverse=True)
    kept_images = [item for item in owned if item['id'] in protected_ids]
    # Keep the source tree corresponding to every retained image, when present.
    for item in kept_images:
        for tag in item['tags']:
            prefix = IMAGE.fullmatch(tag)[1]
            for p in releases.iterdir():
                if RELEASE.fullmatch(p.name) and p.name.startswith(prefix):
                    protected_releases.add(p.name)

    directories = [p for p in releases.iterdir() if not p.is_symlink() and p.is_dir() and RELEASE.fullmatch(p.name)]
    directories.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    stale_temporaries = [p.name for p in releases.iterdir() if not p.is_symlink() and p.is_dir() and TEMP.fullmatch(p.name) and p.name not in protected_releases and now - p.stat().st_mtime > 86400]
    return {
        'removeImageTags': [tag for item in owned if item['id'] not in protected_ids for tag in item['tags']],
        'removeReleaseDirectories': [p.name for p in directories if p.name not in protected_releases],
        'removeTemporaryDirectories': sorted(stale_temporaries),
        'protectedReleases': sorted(protected_releases),
        'retention': 2,
    }


def git_gc(base):
    source = base / 'source.git'
    stamp = base / 'state/last-git-gc'
    if not source.is_dir() or (stamp.exists() and time.time() - stamp.stat().st_mtime < 7 * 86400):
        return
    # FETCH_HEAD alone is not a durable GC root. Older installations must skip GC.
    if subprocess.run(['git', '--git-dir=' + str(source), 'show-ref', '--verify', '--quiet', 'refs/heads/main']).returncode:
        return
    subprocess.run(['git', '--git-dir=' + str(source), 'reflog', 'expire', '--expire=30.days.ago', '--expire-unreachable=7.days.ago', '--all'], check=True)
    subprocess.run(['git', '--git-dir=' + str(source), '-c', 'pack.threads=1', '-c', 'pack.windowMemory=64m', 'gc', '--prune=7.days.ago'], check=True)
    stamp.touch()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('base', type=Path)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--locked', action='store_true')
    args = parser.parse_args()
    base = args.base.resolve()
    assert (base / 'current').is_symlink(), 'Current release must be known'
    os.chdir(base)
    # Never delete while another deploy can change rollback or container mounts.
    lock = None
    if args.apply:
        if args.locked:
            fcntl.flock(9, fcntl.LOCK_EX | fcntl.LOCK_NB)
        else:
            lock = open('/var/lock/pb-website-deploy.lock', 'a')
            fcntl.flock(lock, fcntl.LOCK_EX)
    state = json.loads((base / 'state/last-deployment.json').read_text())
    images, containers = inventory()
    result = plan(base, images, containers, state)
    result['applied'] = args.apply
    print(json.dumps(result, indent=2), flush=True)
    if not args.apply:
        return
    for tag in result['removeImageTags']:
        subprocess.run(['docker', 'image', 'rm', tag], check=True)  # Never --force.
    for name in result['removeReleaseDirectories'] + result['removeTemporaryDirectories']:
        p = base / 'releases' / name
        assert p.parent.resolve() == (base / 'releases').resolve() and not p.is_symlink()
        shutil.rmtree(p)
    git_gc(base)
    subprocess.run(['docker', 'buildx', 'prune', '--builder', 'pb-website', '--force', '--max-used-space', '1gb'], check=True)
    result['completedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    target = base / 'state/last-cleanup.json'
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, indent=2) + '\n')
    os.replace(temporary, target)


if __name__ == '__main__':
    main()
