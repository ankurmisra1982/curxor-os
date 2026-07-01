#!/usr/bin/env bash
# CurXor OS — verify dashboard sudo override is installed and working.
# Usage: sudo /opt/curxor/scripts/verify-sudo-override.sh
set -euo pipefail

CURXOR_USER="${CURXOR_USER:-curxor}"
SUDOERS="/etc/sudoers.d/curxor-dashboard"
APPLY_SCRIPT="${CURXOR_ROOT:-/opt/curxor}/scripts/apply-active-claw.sh"
SERVICE="/etc/systemd/system/curxor-dashboard.service"

pass() { echo "  OK  $*"; }
fail() { echo "  FAIL $*" >&2; errors=$((errors + 1)); }

errors=0

echo "==> CurXor sudo override verification"

if [[ -f "${SUDOERS}" ]]; then
  pass "${SUDOERS} exists"
  if visudo -cf "${SUDOERS}" >/dev/null 2>&1; then
    pass "sudoers syntax valid"
  else
    fail "sudoers syntax invalid"
  fi
else
  fail "${SUDOERS} missing — run install-sudo-override.sh"
fi

if id "${CURXOR_USER}" &>/dev/null; then
  pass "user ${CURXOR_USER} exists"
else
  fail "user ${CURXOR_USER} missing"
fi

if [[ -f "${SERVICE}" ]] && grep -q '^NoNewPrivileges=true' "${SERVICE}"; then
  fail "${SERVICE} still has NoNewPrivileges=true (blocks sudo from dashboard)"
else
  pass "dashboard service allows privilege elevation"
fi

if sudo -u "${CURXOR_USER}" sudo -n "${APPLY_SCRIPT}" >/dev/null 2>&1; then
  pass "curxor can NOPASSWD run apply-active-claw.sh"
else
  fail "curxor cannot NOPASSWD run apply-active-claw.sh"
fi

echo ""
if [[ "${errors}" -eq 0 ]]; then
  echo "==> All checks passed"
  exit 0
fi

echo "==> ${errors} check(s) failed"
exit 1
