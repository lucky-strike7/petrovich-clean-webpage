#!/usr/bin/env bash
# Installed root-owned outside the checkout; this is the only allowed SSH command.
set -euo pipefail
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
    exec sudo -n /usr/local/sbin/pb-website-receive "${BASH_REMATCH[1]}"
fi
printf 'Only deploy followed by one full commit SHA is allowed.\n' >&2
exit 64
