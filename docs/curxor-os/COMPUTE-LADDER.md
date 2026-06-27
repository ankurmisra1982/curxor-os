# CurXor — Open-Weight Compute Ladder

> **Audience:** Storefront · press · investor deck · operator docs  
> **Canonical OS spec:** [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) · [IDEA-H05](#) · [04-inference-compute.md](../guides/04-inference-compute.md)  
> **Storefront handoff:** Copy this file to `curxor storefront/docs/COMPUTE-LADDER.md` and wire into [curxor.ai/press](https://curxor.ai/press) + pricing compare.  
> **Last updated:** June 2026

---

## The promise (never changes)

**Mint autonomous employees on bare metal you own.**  
Operate-plane inference runs on your appliance — **not** a rented API meter. Pull the plug on outbound AI (eno2). Optional frontier BYOK exists; it is never the default story.

**What evolves:** CurXor OS tracks the best **open-weight** models each tier can honestly run. Hardware scales up; software updates on metal you already own.

---

## Compute ladder (honest tiers)

| | **Standard** | **Pro 128** | **CurXor Studio** *(future)* |
|---|--------------|-------------|------------------------------|
| **Status** | **Shipping path** (MS-S1 Max 64 GB) | Spec + unbox profile · SKU at G4 | Post-traction · custom CurXor box (IDEA-H01) |
| **Price anchor** | **$3,999** once · **$0/mo** operate inference | **$4,999** once · **$0/mo** operate inference | TBD post-validation |
| **Platform** | MINISFORUM MS-S1 Max · Ryzen AI Max+ 395 | Same platform · 128 GB factory SKU | CurXor-branded · CurXor OS factory profile |
| **System RAM (UMA)** | 64 GB LPDDR5X | 128 GB LPDDR5X | **256 GB+** unified (target) |
| **GPU heap (BIOS max)** | ~48 GB | ~96 GB | TBD · designed for frontier OSS quants |
| **Default local stack** | `moondream:1.8b` + `qwen3:8b` | Above + `qwen3-vl:8b` · `qwen3:14b` · `batiai/qwen3.6-35b:q4` | Largest open-weight models at usable quant (e.g. GLM / DeepSeek-class MoE) |
| **Best for** | Ten Claws · GTM demo · daily operate | Power operators · coding/agent depth · dual hot-load | Frontier local coding · long-context OSS · no cloud rent |
| **CurXor OS profile** | `pillar-1-compute/.env.example` | `config/compute.env.pro128.example` | Factory image + Studio env (TBD) |

**Do not claim:** Standard 64 GB runs 744B-class models locally. Those belong on **Studio** or operator BYOK — not today's box.

---

## Why open-weight matters for CurXor

The frontier moves fast (Qwen3 → Qwen3.6, community benchmarks on Strix Halo, pi-bench on AMD UMA). CurXor's job is not to pick one model forever — it is to ship **tier profiles** so each appliance runs the best open weights **its memory allows**.

| Layer | What scales |
|-------|-------------|
| **Hardware** | RAM / UMA heap · optional custom chassis post-investor |
| **CurXor OS** | Model catalog · env templates · `deploy.sh` pull sets · Forge recommendations · OTA |
| **Story** | Sovereign mint-on-metal · $0/mo operate inference |

Evidence anchor (same silicon class as MS-S1): [pi-local-coding-bench.dev](https://pi-local-coding-bench.dev/) — Strix Halo local coding benchmarks. Use as **directional**, not a storefront guarantee until validated on your SKU.

---

## Standard 64 GB — your box today

**Hardware:** MINISFORUM MS-S1 Max · AMD Ryzen AI Max+ 395 · **64 GB RAM** · 2 TB SSD · US.

**Day-one pull** (`deploy.sh --pull-models`):

- Vision: `moondream:1.8b`
- Reasoning backbone: `qwen3:8b`

**Optional later** (single hot model; ~19 GB fits in 48 GB heap):

- Coding MoE: `batiai/qwen3.6-35b:q4` (pi-bench leader on Strix Halo class silicon)

**Skip on 64 GB:** Pro 128 env profile (`compute.env.pro128.example`).

---

## Press-ready copy blocks

### Hero line

> The open-weight frontier moves fast. Your appliance shouldn't rent it — it should grow into it.

### Subhead

> CurXor OS — mint autonomous employees on bare metal. Standard 64 GB today. Pro and CurXor Studio tomorrow. Same sovereignty. Stronger models as memory allows.

### One paragraph

CurXor is a sovereign AI appliance: ten digital employees, one local operating system, zero monthly inference rent on the operate plane. Today that starts on the MINISFORUM MS-S1 Max — 64 GB unified memory and a Qwen3 stack sized for real multi-Claw workloads. Open-weight AI keeps advancing; CurXor OS evolves with it through model catalogs and tier profiles, so you update the stack on hardware you own instead of rebuying the story every six months. Standard for flagship operators, Pro 128 for heavier local models, and CurXor Studio — post-traction custom compute built to CurXor OS specs — for the largest open-weight models when your work demands it. Optional frontier BYOK exists; the default is still mint on metal, not API rent.

### Honest footnote (pricing / press)

**$0/mo operate inference** = local LLM on the appliance for the operate plane (chat, planning, Forge assist). Does not include optional third-party BYOK, trading/social bridges, or your power bill.

---

## Gates (when to publish what)

| Gate | Storefront / press |
|------|-------------------|
| **G1** | "Validated on MS-S1 Max 64 GB" only after unbox smoke |
| **G3** | Compute ladder compare table · `/press` copy · no Studio ship dates |
| **G4** | Pro 128 live SKU · expanded pulls · on-box benchmark notes |
| **G4 + traction** | CurXor Studio fundraise · custom box (extends IDEA-H01) |

**Pre-G1 do not publish:** Token/$ vs cloud GPT · "runs GLM 5.2 / DeepSeek V4" on Standard · Studio availability dates.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [MS-S1-128GB-UNBOX-CHEATSHEET.md](./MS-S1-128GB-UNBOX-CHEATSHEET.md) | Pro 128 env + pulls |
| [04-inference-compute.md](../guides/04-inference-compute.md) | Pillar 1 technical guide |
| [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) · IDEA-H05 | Program + gates |
| [IDEA-G09](./FUTURE-ROADMAP.md) | API rent → OSS on metal narrative |
