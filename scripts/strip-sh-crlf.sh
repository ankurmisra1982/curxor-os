#!/usr/bin/env bash
# CurXor OS — strip Windows CRLF from shell scripts on the Linux box.
# Run ON THE BOX after scp from a Windows laptop (before bash script.sh).
#
# Usage:
#   sed -i 's/\r$//' /path/to/script.sh          # canonical one-liner (same effect)
#   bash strip-sh-crlf.sh /tmp/my-script.sh
#   sudo bash strip-sh-crlf.sh /opt/curxor
#
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

usage() {
  echo "Usage: $0 <file.sh> [file2.sh ...] | <directory>" >&2
  echo "  Strips \\r from *.sh under a directory, or from listed files." >&2
  exit 1
}

[[ $# -ge 1 ]] || usage

strip_file() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "skip (not a file): $f" >&2
    return 0
  fi
  sed -i 's/\r$//' "$f"
  echo "stripped: $f"
}

for target in "$@"; do
  if [[ -d "$target" ]]; then
    while IFS= read -r -d '' f; do
      strip_file "$f"
    done < <(find "$target" -name '*.sh' -print0)
  else
    strip_file "$target"
  fi
done
