# MS-S1 MAX Hardware & BIOS Guide

Hardware-specific setup for the **MINISFORUM MS-S1 MAX** running CurXor OS.

## Platform summary

| Spec | Value |
|------|-------|
| CPU / APU | AMD Ryzen AI Max+ 395 |
| GPU | Radeon 8060S (integrated, gfx1151) |
| Memory | 64 GB or **128 GB** LPDDR5X **UMA** (single pool, soldered SKU) |
| ROCm arch | `gfx1151` (`HSA_OVERRIDE_GFX_VERSION=11.5.1`) |
| Networking | Dual 10GbE — **eno1** (user LAN), **eno2** (robotics mesh) |
| OS target | Ubuntu 24.04 LTS minimal |

CurXor OS treats this as a **sovereign edge appliance**: inference on localhost, robotics on eno2, operators on eno1.

## Physical layout

```
┌─────────────────────────────────────────────────────────┐
│  MINISFORUM MS-S1 MAX                                   │
│                                                         │
│  [eno1] ──► User LAN / Wi‑Fi AP / captive portal       │
│             CurXor: 10.0.0.1 (setup-captive-portal)   │
│                                                         │
│  [eno2] ──► Robotics mesh / cameras / claw controllers  │
│             CurXor: 10.77.0.1 (setup-mesh-network)      │
│                                                         │
│  [USB / storage] ──► Install media, offline model cache   │
└─────────────────────────────────────────────────────────┘
```

Label cables at install time. Swapping eno1/eno2 breaks captive portal vs mesh isolation.

## BIOS access

1. Connect display + keyboard (or IPMI/BMC if your SKU exposes it)
2. Power on → press **Del** or **F2** repeatedly (MINISFORUM default; confirm on splash)
3. Save & exit after changes — **F10**

Firmware menu names vary by revision. Look for **Advanced**, **Chipset**, **AMD CBS**, or **MINISFORUM** tabs.

## Critical settings (in order)

### 1. UMA / GPU memory carve-out (highest priority)

**Path (typical):** Advanced → AMD CBS → NBIO → UMA Frame Buffer Size  
**Or:** Advanced → GPU Memory / iGPU Configuration

| Setting | Recommended | Why |
|---------|-------------|-----|
| UMA Frame Buffer / GPU Memory | **Maximum** (~48 GB on 64 GB · **~96 GB on 128 GB**) | VLA + vision models need GPU-addressable UMA |
| iGPU | **Enabled** | Required for ROCm inference |
| Shared memory above 512 MB | **Enabled** if offered | Allows large heap |

Leave ~12–16 GB for Ubuntu, Pillar 2–4, and broker overhead.

Validate after boot:

```bash
/opt/curxor/pillar-1-compute/scripts/configure-uma.sh
/opt/curxor/pillar-1-compute/scripts/verify-gpu.sh
```

### 2. Boot order

| Priority | Device |
|----------|--------|
| 1 | Internal NVMe (Ubuntu root) |
| 2 | USB (recovery / autoinstall media only) |
| 3 | Network PXE (disable unless you use it) |

For factory imaging: boot USB once, then restore NVMe-first.

### 3. Secure Boot

| Setting | CurXor recommendation |
|---------|----------------------|
| Secure Boot | **Disabled** for ROCm/Docker simplicity on first deploy |

Re-enable only after you have signed kernel modules / MOK enrolled for your ROCm stack. Most field deployments leave Secure Boot off.

### 4. Virtualization (optional)

| Setting | When to enable |
|---------|----------------|
| SVM / AMD-V | Only if you run VMs alongside CurXor (not default) |
| IOMMU | Advanced users passing through PCIe devices |

CurXor pillars do not require virtualization.

### 5. Power & thermal

| Setting | Recommendation |
|---------|----------------|
| Power profile | **Performance** or **Balanced** (avoid aggressive power-save on inference nodes) |
| Fan curve | Default OK; monitor under sustained VLA load |
| Wake on LAN | Optional for remote power-on in rack deployments |

Thermal throttling shows up as inference latency spikes — check `journalctl` and dashboard Compute metrics.

### 6. Network firmware

- Enable both 10GbE controllers
- Disable unused Wi‑Fi if present (reduces attack surface on sovereign nodes)
- Do **not** enable NIC teaming across eno1+eno2 — CurXor requires isolation

## Kernel supplement (after BIOS)

`setup-rocm-host.sh` writes `/etc/default/grub.d/99-curxor-uma.cfg`:

```
GRUB_CMDLINE_LINUX_DEFAULT="$GRUB_CMDLINE_LINUX_DEFAULT amdgpu.gttsize=49152"
```

Apply:

```bash
sudo update-grub
sudo reboot
```

BIOS carve-out remains primary; kernel GTT is supplementary.

## Post-BIOS verification checklist

```bash
# ROCm sees gfx1151
rocminfo | grep -i gfx1151
rocm-smi --showmeminfo

# Docker GPU
/opt/curxor/pillar-1-compute/scripts/verify-gpu.sh

# NIC roles
ip link show eno1
ip link show eno2
ip addr | grep -E '10\.0\.0\.1|10\.77\.0\.1'

# Full stack
systemctl status curxor-os.target
```

## Memory budget by SKU

### Standard 64 GB ($3,999 tier)

| Consumer | Typical allocation |
|----------|-------------------|
| GPU heap (BIOS UMA) | ~48 GB |
| Ubuntu + services | ~8–12 GB |
| Ollama hot model | Fits in GPU heap |
| vLLM OpenVLA | 0.88 × heap (`VLLM_GPU_MEMORY_UTILIZATION`) |

Use **Economy** claw tier in Flight Command if operating closer to 32 GB effective heap.

### Pro 128 GB ($4,999 tier)

| Consumer | Typical allocation |
|----------|-------------------|
| GPU heap (BIOS UMA) | **~96 GB** (BIOS Maximum — verify with `rocm-smi`) |
| Ubuntu + services | ~16–32 GB |
| Ollama hot model(s) | Fits in GPU heap; **two hot models** possible after verify |
| vLLM / 70B-class Q4 | Realistic on Pro 128; tight on Standard 64 |

**128 GB unbox cheat sheet:** [MS-S1-128GB-UNBOX-CHEATSHEET.md](../curxor-os/MS-S1-128GB-UNBOX-CHEATSHEET.md)

## Storage

| Mount | Purpose |
|-------|---------|
| `/` | OS + `/opt/curxor` |
| `/var/lib/curxor/models` | Model weights (large — plan ≥ 200 GB NVMe) |
| `/var/backups/curxor` | OTA pre-update tarballs |

Use separate partition or disk for models if imaging many SKUs.

## Factory reset / re-image

1. Boot Ubuntu autoinstall USB with `/cdrom/curxor-os/` payload
2. Wipe NVMe or restore golden image
3. First boot → `curxor-first-boot-install.service`
4. Re-enter BIOS only if UMA was reset to default

## Related guides

- [Inference & Compute](04-inference-compute.md)
- [Installation](01-installation.md)
- [Networking](03-networking.md)
- [Operations & Troubleshooting](09-operations-troubleshooting.md)
