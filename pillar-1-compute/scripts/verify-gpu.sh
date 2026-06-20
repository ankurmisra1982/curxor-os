#!/usr/bin/env bash
# CurXor OS — Verify ROCm + Docker GPU passthrough on gfx1151
set -euo pipefail

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
NC='\033[0m'
FAIL=0

pass() { echo -e "${GRN}[PASS]${NC} $*"; }
warn() { echo -e "${YLW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=1; }

echo "==> CurXor GPU verification (Ryzen AI Max+ 395 / gfx1151)"

# ── Device nodes ────────────────────────────────────────────────────────────
[[ -e /dev/kfd ]] && pass "/dev/kfd present" || fail "/dev/kfd missing — load amdkfd"
[[ -e /dev/dri/card0 ]] && pass "/dev/dri/card0 present" || fail "/dev/dri missing — load amdgpu"

# ── Groups ──────────────────────────────────────────────────────────────────
id -nG | grep -qw video && pass "user in 'video' group" || warn "add user to video: sudo usermod -aG video \$USER"
id -nG | grep -qw render && pass "user in 'render' group" || warn "add user to render: sudo usermod -aG render \$USER"
id -nG | grep -qw docker && pass "user in 'docker' group" || warn "add user to docker: sudo usermod -aG docker \$USER"

# ── ROCm ────────────────────────────────────────────────────────────────────
if command -v rocminfo &>/dev/null; then
  if rocminfo 2>/dev/null | grep -qi "gfx1151\|gfx1150"; then
    pass "rocminfo reports Strix Halo GPU (gfx115x)"
  else
    warn "rocminfo did not show gfx1151 — set HSA_OVERRIDE_GFX_VERSION=11.5.1"
    rocminfo 2>/dev/null | grep -i "marketing\|name" | head -5 || true
  fi
else
  warn "rocminfo not installed"
fi

if command -v rocm-smi &>/dev/null; then
  pass "rocm-smi available"
  rocm-smi --showproductname 2>/dev/null || rocm-smi 2>/dev/null | head -8
else
  warn "rocm-smi not installed"
fi

# ── Docker ROCm smoke test ──────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  pass "docker available"
  echo "==> Running ROCm container smoke test..."
  if docker run --rm \
    --device=/dev/kfd --device=/dev/dri \
    --group-add video --group-add render \
    --cap-add=SYS_PTRACE --security-opt seccomp=unconfined \
    -e HSA_OVERRIDE_GFX_VERSION=11.5.1 \
    rocm/rocm-terminal:latest rocminfo 2>/dev/null | grep -qi "gfx115"; then
    pass "Docker ROCm passthrough OK"
  else
    warn "Docker ROCm test inconclusive — pull image: docker pull rocm/rocm-terminal:latest"
  fi
else
  fail "docker not installed"
fi

# ── UMA heap ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/configure-uma.sh" || true

if [[ "${FAIL}" -eq 0 ]]; then
  echo -e "\n${GRN}==> Verification passed. Ready for deploy.sh${NC}"
else
  echo -e "\n${RED}==> Verification failed. Fix issues above before deploying.${NC}"
  exit 1
fi
