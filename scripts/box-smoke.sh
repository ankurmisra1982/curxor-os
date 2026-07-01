#!/usr/bin/env bash
# CurXor OS — post-deploy API smoke (run on box; no sudo required).
# Usage: /opt/curxor/scripts/box-smoke.sh [baseUrl]
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

BASE="${1:-http://127.0.0.1:3080}"
failures=0

check_http() {
  local path="$1"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${BASE}${path}" 2>/dev/null || echo "000")"
  if [[ "${code}" =~ ^2 ]]; then
    echo "  OK  ${path} (${code})"
  else
    echo "  FAIL ${path} (${code})"
    failures=$((failures + 1))
  fi
}

echo "==> box-smoke @ ${BASE}"

check_http "/api/setup/status"
check_http "/api/capital/status"
check_http "/api/patron/context"
check_http "/api/cafe/status"
check_http "/api/build/delegation"

svc="$(systemctl is-active curxor-dashboard.service 2>/dev/null || echo inactive)"
if [[ "${svc}" == "active" ]]; then
  echo "  OK  curxor-dashboard.service (active)"
else
  echo "  FAIL curxor-dashboard.service (${svc})"
  failures=$((failures + 1))
fi

if [[ -f /opt/curxor/.deploy-stamp ]]; then
  echo "  INFO deploy stamp: $(tr -d '\r\n' < /opt/curxor/.deploy-stamp)"
fi

echo ""
if [[ "${failures}" -eq 0 ]]; then
  echo "==> box-smoke passed"
  exit 0
fi

echo "==> box-smoke failed (${failures} check(s))"
exit 1
