#!/usr/bin/env bash
# CurXor OS — Seed /etc/curxor runtime data for first appliance boot
set -euo pipefail

ETC="${CURXOR_ETC:-/etc/curxor}"
ROOT="${CURXOR_ROOT:-/opt/curxor}"
USER="${CURXOR_USER:-curxor}"

mkdir -p \
  "${ETC}" \
  "${ETC}/app-fre" \
  "${ETC}/scheduler" \
  "${ETC}/channels" \
  "${ETC}/engine.env.d" \
  "${ETC}/agent-workspace" \
  /var/lib/curxor \
  /var/log/curxor

FRE="${ETC}/fre-state.json"
if [[ ! -f "${FRE}" ]]; then
  printf '%s\n' '{"initialized":false,"selectedApps":[],"provisionedAt":null}' > "${FRE}"
fi

PROFILES="${ETC}/claw-profiles.json"
if [[ ! -f "${PROFILES}" ]]; then
  printf '%s\n' '{"claws":[],"activeClawId":null}' > "${PROFILES}"
fi

DIGITAL="${ETC}/digital.env"
if [[ ! -f "${DIGITAL}" ]] && [[ -f "${ROOT}/config/digital/digital.env.example" ]]; then
  cp "${ROOT}/config/digital/digital.env.example" "${DIGITAL}"
  chmod 640 "${DIGITAL}"
  chown root:"${USER}" "${DIGITAL}"
fi

# Empty gamification / cafe ledgers — created so writes succeed on first event
for f in \
  cafe-state.json \
  work-xp-events.json \
  creator-xp-events.json \
  capital-xp-events.json \
  swarm-xp-events.json \
  vital-xp-events.json \
  kin-xp-events.json \
  shop-xp-events.json \
  signal-xp-events.json \
  forge-cafe-events.json \
  swarm-workload-queue.json; do
  path="${ETC}/${f}"
  if [[ ! -f "${path}" ]]; then
    if [[ "${f}" == *queue* ]] || [[ "${f}" == *workload* ]]; then
      printf '%s\n' '{"items":[]}' > "${path}"
    else
      printf '%s\n' '{"events":[]}' > "${path}"
    fi
  fi
done

CAFE="${ETC}/cafe-state.json"
if [[ ! -s "${CAFE}" ]] || ! grep -q ascensionXp "${CAFE}" 2>/dev/null; then
  cat > "${CAFE}" <<'EOF'
{
  "events": [],
  "ascensionXp": 0,
  "affinities": { "knowledge": 0, "wealth": 0 },
  "milestones": {
    "knowledgeEvent": false,
    "wealthEvent": false,
    "crossClawHandshake": false,
    "forgeMint": false
  },
  "characters": [],
  "lastRoomPulseAt": null
}
EOF
fi

chown -R "${USER}:${USER}" "${ETC}" /var/lib/curxor 2>/dev/null || true
chmod 755 "${ETC}" "${ETC}/app-fre" 2>/dev/null || true

echo "==> Seeded appliance data under ${ETC}"
