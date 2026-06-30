#!/usr/bin/env bash
# Docker daemon caches /etc/group at startup. After first boot, named group_add
# entries (video, render) can fail even when getent finds them. Use numeric GIDs.
set -euo pipefail

COMPOSE="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/docker-compose.yml}"
VIDEO_GID="$(getent group video | cut -d: -f3 || true)"
RENDER_GID="$(getent group render | cut -d: -f3 || true)"

if [[ -z "${VIDEO_GID}" || -z "${RENDER_GID}" ]]; then
  echo "WARN: video/render group missing — skipping compose GID patch" >&2
  exit 0
fi

export COMPOSE VIDEO_GID RENDER_GID
python3 - <<'PY'
import os
from pathlib import Path

p = Path(os.environ["COMPOSE"])
video_gid = os.environ["VIDEO_GID"]
render_gid = os.environ["RENDER_GID"]
t = p.read_text()
t = t.replace("    - video", f'    - "{video_gid}"')
t = t.replace("    - render", f'    - "{render_gid}"')
t = t.replace("    - 44", f'    - "{video_gid}"')
t = t.replace("    - 992", f'    - "{render_gid}"')
p.write_text(t)
print(f"Patched {p.name} group_add → video={video_gid} render={render_gid}")
PY
