#!/usr/bin/env bash
# CurXor OS — verify founder deploy sudo override (passwordless box-apply-deploy).
# Usage: sudo /opt/curxor/scripts/verify-deploy-sudo-override.sh
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi
set -euo pipefail

CURXOR_ROOT="${CURXOR_ROOT:-/opt/curxor}"
DEPLOY_USER="${CURXOR_DEPLOY_USER:-ankur}"
SUDOERS="/etc/sudoers.d/curxor-deploy"
APPLY_SCRIPT="${CURXOR_ROOT}/scripts/box-apply-deploy.sh"

pass() { echo "  OK  $*"; }
fail() { echo "  FAIL $*" >&2; errors=$((errors + 1)); }

errors=0

echo "==> CurXor deploy sudo verification (user=${DEPLOY_USER})"

if [[ -f "${SUDOERS}" ]]; then
  pass "${SUDOERS} exists"
  if visudo -cf "${SUDOERS}" >/dev/null 2>&1; then
    pass "sudoers syntax valid"
  else
    fail "sudoers syntax invalid"
  fi
else
  fail "${SUDOERS} missing - run install-deploy-sudo-override.sh"
fi

if id "${DEPLOY_USER}" &>/dev/null; then
  pass "user ${DEPLOY_USER} exists"
else
  fail "user ${DEPLOY_USER} missing"
fi

if [[ -x "${APPLY_SCRIPT}" ]]; then
  pass "box-apply-deploy.sh executable"
else
  fail "box-apply-deploy.sh missing or not executable"
fi

PROBE_TAR="/nonexistent/curxor-sudo-probe.tar.gz"

probe_out="$(sudo -u "${DEPLOY_USER}" sudo -n "${APPLY_SCRIPT}" "${PROBE_TAR}" 2>&1 || true)"
if echo "${probe_out}" | grep -qiE 'password is required|a password is required'; then
  fail "${DEPLOY_USER} cannot NOPASSWD run box-apply-deploy.sh"
elif echo "${probe_out}" | grep -q 'missing tarball'; then
  pass "${DEPLOY_USER} can NOPASSWD run box-apply-deploy.sh"
else
  fail "unexpected sudo probe output: ${probe_out}"
fi

echo ""
if [[ "${errors}" -eq 0 ]]; then
  echo "==> All checks passed"
  exit 0
fi

echo "==> ${errors} check(s) failed"
exit 1
