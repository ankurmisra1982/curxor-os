#!/usr/bin/env bash
# CurXor OS — one-shot patch for appliances that predate per-app FRE directories.
# Prefer install-all.sh / post-update.sh (automatic). Safe to re-run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/ensure-app-fre-dir.sh"
