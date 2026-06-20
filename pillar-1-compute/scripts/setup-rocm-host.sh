#!/usr/bin/env bash
# CurXor OS — Host ROCm + Docker prerequisites for MS-S1 MAX (gfx1151)
# Run once on bare-metal Ubuntu 24.04 after cloud-init provisioning.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

CURXOR_USER="${CURXOR_USER:-${SUDO_USER:-curxor}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILLAR_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> CurXor Pillar 1: ROCm host setup (Ryzen AI Max+ 395)"

# ── 1. Kernel / amdgpu modules ──────────────────────────────────────────────
echo "==> Loading amdgpu kernel modules..."
modprobe amdgpu || true
modprobe amdkfd || true

if ! grep -q "amdgpu" /etc/modules-load.d/curxor-amdgpu.conf 2>/dev/null; then
  cat > /etc/modules-load.d/curxor-amdgpu.conf <<'EOF'
amdgpu
amdkfd
EOF
fi

# ── 2. UMA GTT sizing (kernel cmdline helper) ───────────────────────────────
# Increases GPU-accessible GTT on unified memory APUs.
# Reboot required after applying. BIOS GPU heap allocation is still primary.
UMACONF="/etc/default/grub.d/99-curxor-uma.cfg"
if [[ ! -f "${UMACONF}" ]]; then
  cat > "${UMACONF}" <<'EOF'
# CurXor: maximize unified heap for VLA inference (64 GB UMA systems)
GRUB_CMDLINE_LINUX_DEFAULT="$GRUB_CMDLINE_LINUX_DEFAULT amdgpu.gttsize=49152"
EOF
  echo "==> Wrote ${UMACONF} (amdgpu.gttsize=49152 MiB). Run: update-grub && reboot"
fi

# ── 3. ROCm user-space (if not installed by cloud-init) ─────────────────────
if ! command -v rocm-smi &>/dev/null; then
  echo "==> Installing ROCm 7.x user-space (amdgpu-install)..."
  apt-get update -qq
  apt-get install -y --no-install-recommends wget gnupg2

  if [[ ! -f /etc/apt/keyrings/rocm.gpg ]]; then
    wget -q https://repo.radeon.com/rocm/rocm.gpg.key -O - \
      | gpg --dearmor -o /etc/apt/keyrings/rocm.gpg
  fi

  if [[ ! -f /etc/apt/sources.list.d/rocm.list ]]; then
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/rocm.gpg] https://repo.radeon.com/rocm/apt/7.2 noble main" \
      > /etc/apt/sources.list.d/rocm.list
    apt-get update -qq
  fi

  apt-get install -y --no-install-recommends \
    rocm-smi-lib rocm-hip-runtime rocminfo
fi

# ── 4. Docker Engine (rootless not used — ROCm needs device passthrough) ────
if ! command -v docker &>/dev/null; then
  echo "==> Installing Docker CE..."
  apt-get update -qq
  apt-get install -y --no-install-recommends ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu noble stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

usermod -aG docker,video,render "${CURXOR_USER}" 2>/dev/null || true
systemctl enable --now docker

# ── 5. Persistent model + cache directories ───────────────────────────────
mkdir -p /var/lib/curxor/{models,ollama,huggingface}
chown -R "${CURXOR_USER}:${CURXOR_USER}" /var/lib/curxor

# ── 6. Render group for /dev/dri access ─────────────────────────────────────
getent group render >/dev/null || groupadd -r render
usermod -aG render "${CURXOR_USER}" 2>/dev/null || true

# ── 7. Sysctl: reduce swap thrashing on large UMA models ────────────────────
cat > /etc/sysctl.d/99-curxor-uma.conf <<'EOF'
# Prefer keeping hot VLA weights in RAM over swap
vm.swappiness=10
vm.max_map_count=1048576
EOF
sysctl --system >/dev/null 2>&1 || true

# ── 8. Disable telemetry / phone-home (sovereign appliance) ───────────────
export DO_NOT_TRACK=1
export HF_HUB_DISABLE_TELEMETRY=1

echo ""
echo "==> Host setup complete."
echo "    Next steps:"
echo "      1. Set BIOS 'GPU memory' / UMA heap to maximum (target ~48 GB on 64 GB SKU)"
echo "      2. Reboot if grub UMA config was applied"
echo "      3. Log out/in (docker group) then: ${PILLAR_DIR}/scripts/verify-gpu.sh"
echo "      4. ${PILLAR_DIR}/scripts/deploy.sh"
