#!/usr/bin/env bash
# Apply active claw profile to Pillar 2 engine (called after dashboard claw create)
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

systemctl try-restart curxor-engine.service
echo "==> curxor-engine restarted with active claw profile"
