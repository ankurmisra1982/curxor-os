#!/usr/bin/env bash
# CurXor OS — Configure UMA GPU heap visibility and validate BIOS split
set -euo pipefail

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
NC='\033[0m'

TOTAL_GB="${CURXOR_TOTAL_RAM_GB:-64}"
TARGET_GPU_GB="${CURXOR_GPU_HEAP_GB:-48}"

echo "==> CurXor UMA configuration check"
echo "    System RAM : ${TOTAL_GB} GB (unified)"
echo "    Target GPU : ${TARGET_GPU_GB} GB (BIOS + GTT)"
echo "    Visible OS : ~$(( TOTAL_GB - TARGET_GPU_GB )) GB in free -h (rest is UMA GPU carve-out)"

# ── Read current GTT from amdgpu ────────────────────────────────────────────
GTT_KB=""
if [[ -f /sys/module/amdgpu/parameters/gttsize ]]; then
  GTT_KB="$(cat /sys/module/amdgpu/parameters/gttsize 2>/dev/null || echo 0)"
fi

if [[ -n "${GTT_KB}" && "${GTT_KB}" != "0" && "${GTT_KB}" != "-1" ]]; then
  GTT_GB=$(( GTT_KB / 1024 / 1024 ))
  echo -e "    Kernel GTT : ${GRN}${GTT_GB} GB${NC}"
else
  echo -e "    Kernel GTT : ${YLW}not set (use amdgpu.gttsize=49152 in grub)${NC}"
fi

# ── ROCm memory report ──────────────────────────────────────────────────────
if command -v rocm-smi &>/dev/null; then
  echo ""
  echo "==> rocm-smi memory:"
  rocm-smi --showmeminfo vram 2>/dev/null || rocm-smi --showmeminfo 2>/dev/null || rocm-smi
else
  echo -e "${YLW}rocm-smi not found — run setup-rocm-host.sh first${NC}"
fi

# ── BIOS guidance ───────────────────────────────────────────────────────────
OS_RESERVE_GB=$(( TOTAL_GB - TARGET_GPU_GB ))
cat <<EOF

==> BIOS / firmware (MINISFORUM MS-S1 MAX)
    Enter BIOS → Advanced → UMA Frame Buffer Size / GPU Memory:
      • Set to MAXIMUM or ${TARGET_GPU_GB} GB
      • Leave ~${OS_RESERVE_GB} GB for Ubuntu + Telemetry Broker + Engine

    Why: On UMA, the "GPU VRAM" setting defines the carve-out the iGPU can
    address directly. VLA models (vision encoder + action head) need this
    slice maximized for 100% GPU offload.

==> Recommended .env values (already in .env.example):
    CURXOR_TOTAL_RAM_GB=${TOTAL_GB}
    CURXOR_GPU_HEAP_GB=${TARGET_GPU_GB}
    VLLM_GPU_MEMORY_UTILIZATION=0.88   # leave ~12% for vision activations
    OLLAMA_MAX_LOADED_MODELS=1         # single hot VLA model, lowest latency

EOF

# ── Optional: apply grub GTT if missing ─────────────────────────────────────
if [[ "${1:-}" == "--apply-grub" && "${EUID}" -eq 0 ]]; then
  GTT_MIB=$(( TARGET_GPU_GB * 1024 ))
  UMACONF="/etc/default/grub.d/99-curxor-uma.cfg"
  cat > "${UMACONF}" <<EOF
GRUB_CMDLINE_LINUX_DEFAULT="\$GRUB_CMDLINE_LINUX_DEFAULT amdgpu.gttsize=${GTT_MIB}"
EOF
  update-grub
  echo -e "${GRN}Applied amdgpu.gttsize=${GTT_MIB}. Reboot required.${NC}"
fi
