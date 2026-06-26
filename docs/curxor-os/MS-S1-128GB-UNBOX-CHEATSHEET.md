# MS-S1 MAX 128GB — Unbox Cheat Sheet

> **Audience:** Operator / founder first boot on the **128GB UMA** SKU  
> **Storefront tier:** **CurXor Pro 128** — **$4,999** once · **$0/mo API**  
> **Baseline tier:** CurXor Standard 64 — **$3,999** (same install path, different BIOS/env)  
> **Print with:** [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) (cables, Ubuntu, install-all)

Same platform as the 64GB appliance — Ryzen AI Max+ 395, Radeon 8060S (`gfx1151`), dual 10GbE. The 128GB SKU doubles unified memory for larger local models and heavier multi-Claw loads.

---

## SKU at a glance

| | **Standard 64** | **Pro 128** |
|---|-----------------|-------------|
| **Price** | $3,999 | **$4,999** |
| **RAM** | 64 GB LPDDR5X UMA (soldered) | **128 GB** LPDDR5X UMA (factory SKU — not user-upgradable from 64) |
| **BIOS UMA max (typical)** | ~48 GB GPU heap | **~96 GB** GPU heap (firmware-dependent — always pick **Maximum**) |
| **OS + services reserve** | ~12–16 GB | ~16–32 GB (generous headroom) |
| **Best for** | Flagship demo · 10 Claws · day-one GTM | Power operators · 70B-class quant · vision + reasoning hot-loaded |
| **Minisforum ref** | 64GB + 2TB SSD variant | [128GB + 2TB SSD](https://store.minisforum.com/products/minisforum-ms-s1-max-mini-pc?variant=48174703378677) |

Both SKUs run the **same CurXor OS stack** — no separate installer.

---

## 128GB first boot — checklist

Use the full [UNBOX-PRINTABLE-GUIDE](./UNBOX-PRINTABLE-GUIDE.md) for cables and Ubuntu install. **Only these steps differ** on Pro 128:

### A. BIOS (~15 min)

1. Monitor + keyboard → power on → **Del** or **F2** → BIOS.
2. **Advanced → AMD CBS → NBIO → UMA Frame Buffer Size** (or *GPU Memory / iGPU*).
3. Set to **Maximum** — expect **~96 GB** (not ~48 GB). If BIOS shows a number, pick the largest offered.
4. **iGPU:** Enabled · **Secure Boot:** Disabled (ROCm first deploy).
5. **F10** save → reboot.

### B. Env profile (before `deploy.sh --pull-models`)

**Copy the Pro 128 profile** (do this right after `install-all.sh`, before model pull):

```bash
sudo cp /opt/curxor/pillar-1-compute/config/compute.env.pro128.example /etc/curxor/compute.env
sudo ln -sfn /etc/curxor/compute.env /opt/curxor/pillar-1-compute/.env
```

Or edit **`/etc/curxor/compute.env`** manually:

```bash
# CurXor Pro 128 — MS-S1 MAX 128GB UMA
CURXOR_TOTAL_RAM_GB=128
CURXOR_GPU_HEAP_GB=96

OLLAMA_VLA_MODEL=moondream:1.8b
OLLAMA_REASONING_MODEL=qwen3:8b
OLLAMA_EXTRA_MODELS=qwen3-vl:8b,qwen3:14b,batiai/qwen3.6-35b:q4
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_KV_CACHE_TYPE=q8_0
VLLM_GPU_MEMORY_UTILIZATION=0.88
```

Align engine + dashboard inference (same default backbone):

```bash
# /etc/curxor/engine.env and /etc/curxor/dashboard.env
CURXOR_INFERENCE_MODEL=qwen3:8b
CURXOR_INFERENCE_BACKEND=ollama
CURXOR_OLLAMA_URL=http://127.0.0.1:11434
CURXOR_TOTAL_RAM_GB=128
CURXOR_GPU_HEAP_GB=96
```
### C. Kernel GTT (supplement to BIOS — reboot required)

```bash
sudo CURXOR_TOTAL_RAM_GB=128 CURXOR_GPU_HEAP_GB=96 \
  /opt/curxor/pillar-1-compute/scripts/configure-uma.sh --apply-grub
sudo reboot
```

This writes `amdgpu.gttsize=98304` (96 GB in MiB). BIOS carve-out remains primary.

### D. Verify (paste block)

```bash
# Unified memory visible
free -h

# ROCm + GPU heap
rocminfo | grep -i gfx1151
rocm-smi --showmeminfo vram 2>/dev/null || rocm-smi --showmeminfo

# CurXor helpers
/opt/curxor/pillar-1-compute/scripts/configure-uma.sh
/opt/curxor/pillar-1-compute/scripts/verify-gpu.sh

# Full unbox gate
sudo /opt/curxor/scripts/verify-unbox-day.sh
sudo /opt/curxor/scripts/verify-unbox-day.sh --post-models   # after deploy.sh --pull-models
```

**Golden rule:** If `rocm-smi` reports less VRAM than expected, re-enter BIOS and confirm UMA is **Maximum** — not “Auto” or 512 MB.

### E. Inference deploy

Same as 64GB SKU:

```bash
sudo /opt/curxor/pillar-1-compute/scripts/deploy.sh --pull-models
curl -sf http://127.0.0.1:11434/api/tags && echo OK
```

Open **`http://<eno1-ip>:3080`** → FRE at `/setup`.

---

## Memory budget (128 GB reference)

| Consumer | Typical allocation |
|----------|-------------------|
| GPU heap (BIOS UMA max) | **~96 GB** |
| Ubuntu + Pillars 2–4 + broker | **~16–32 GB** |
| Ollama hot model(s) | Fits in GPU heap |
| vLLM / OpenVLA | `VLLM_GPU_MEMORY_UTILIZATION=0.88` of heap |

If BIOS exposes **>96 GB** to the iGPU after firmware update, bump `CURXOR_GPU_HEAP_GB` and re-run `configure-uma.sh --apply-grub` — leave at least **16 GB** for the OS stack.

---

## What Pro 128 unlocks (honest)

| Capability | Standard 64 | Pro 128 |
|------------|-------------|---------|
| 10 Claws + Forge demo | ✓ | ✓ |
| Single hot VLA + Qwen3 8B backbone | ✓ | ✓ |
| **Qwen3-VL + Qwen3.6 coding MoE** (Forge / Build Plane) | Tight | **Pulled via `OLLAMA_EXTRA_MODELS`** |
| **Two hot models** (vision + reasoning) | Usually no | **Try** after verify |
| Heavier Cafe / multi-agent day jobs | Good | **Better** UMA headroom |

Still **sovereign edge** — no bundled cloud API. Optional frontier BYOK unchanged.

---

## Storefront copy block (paste into `curxor storefront`)

Use as second hardware option on pricing / pre-order page.

**Title:** CurXor Pro 128

**Price:** $4,999 · Pay once · $0/mo API

**One-liner:** Same sovereign CurXor appliance — **128 GB unified memory** for operators who want larger local models and heavier multi-Claw workloads without cloud rent.

**Bullets:**

- MINISFORUM MS-S1 MAX · AMD Ryzen AI Max+ 395 · **128 GB UMA**
- CurXor OS pre-config profile: **~96 GB GPU heap** for local inference
- Dual 10GbE — Command Port + Egress Port (pull the plug on outbound AI)
- 10 digital employees + The Forge · local LLM · optional frontier BYOK
- Ubuntu 24.04 + CurXor stack — **first-boot install session** (~2–4 hours), not a sealed iPhone OOTB image

**Comparison line:** Standard 64 ($3,999) is our flagship GTM tier. Pro 128 ($4,999) is for power operators and 70B-class local workloads.

**Fine print (honest):** Hardware sourced from MINISFORUM; CurXor OS installed during first-boot provisioning. Memory is soldered — choose 128 GB at order time. Software validated in dev; on-appliance ROCm validation completes at your first boot.

**CTA:** Pre-order · Same waitlist / Stripe flow as Standard 64 with SKU selector.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) | Full cable + Ubuntu + install walkthrough |
| [10-ms-s1-max-hardware-bios.md](../guides/10-ms-s1-max-hardware-bios.md) | BIOS detail (both SKUs) |
| [04-inference-compute.md](../guides/04-inference-compute.md) | Ollama / vLLM tuning |
| [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md) | Pre-arrival gate + day-zero session |
