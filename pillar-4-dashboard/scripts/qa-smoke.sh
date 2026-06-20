#!/usr/bin/env bash
# CurXor OS — dashboard QA smoke tests (run after build on appliance or dev)
set -euo pipefail

BASE="${1:-http://127.0.0.1:3080}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd"; then
    echo "PASS · $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL · $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "==> QA smoke · base=${BASE}"

check "setup status" "curl -sf '${BASE}/api/setup/status' | grep -q '\"initialized\"'"
check "app-agent assist" "curl -sf -X POST '${BASE}/api/app-agent/assist' -H 'Content-Type: application/json' -d '{\"appId\":\"my-work\",\"message\":\"hello\"}' | grep -q reply"
check "claw assist" "curl -sf -X POST '${BASE}/api/claw/assist' -H 'Content-Type: application/json' -d '{\"message\":\"forge a sorting claw\"}' | grep -q reply"
check "mesh motor route" "curl -sf -X POST '${BASE}/api/mesh/motor' -H 'Content-Type: application/json' -d '{\"x\":0.1,\"y\":0,\"z\":0.2}' | grep -q ok"
check "mesh digital route" "curl -sf -X POST '${BASE}/api/mesh/digital' -H 'Content-Type: application/json' -d '{\"tool\":\"capital.execute_trade\",\"payload\":{\"ticker\":\"BTC-USD\",\"qty\":1,\"action\":\"buy\"}}' | grep -q ok"
check "compute metrics" "curl -sf '${BASE}/api/metrics/compute' | grep -q backend"
check "claw profiles" "curl -sf '${BASE}/api/claw/profiles' | grep -q claws"

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
