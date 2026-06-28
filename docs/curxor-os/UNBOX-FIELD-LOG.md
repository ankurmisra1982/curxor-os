# Unbox field log — MS-S1 MAX (Ankur)

> **Maps to:** [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md)  
> **Box:** `curxor` · **SKU:** Standard 64 GB · **Software:** 0.9.1  
> **Golden path:** FRE green **2026-06-28** · Part 4 cables **pending**

---

## Timeline vs guide

| Guide block | Guide step | Status | Session notes |
|-------------|------------|--------|---------------|
| **0** | Unbox · power · monitor | **Done** | HDMI + USB keyboard/mouse; ran Windows briefly before Ubuntu |
| **1** | BIOS UMA ~48 GB | **Done** | MINISFORUM AMI `02.22.0058` · **Advanced → AMD CBS → NBIO Common Options → GFX Configuration** · UMA Mode **UMA_SPECIFIED** · Frame buffer **48 GB** · Secure Boot **Disabled** |
| **2** | Ubuntu 24.04 USB | **Done** | ISO: `ubuntu-24.04.4-desktop-amd64.iso` · Rufus **GPT + UEFI + ISO mode** · **Interactive** install · **Default** apps · 3rd-party graphics/Wi‑Fi **yes** · media codecs **no** · hostname **`curxor`** · user **`ankur`** |
| **2.2** | First login · SSH | **Done** | `openssh-server` enabled · **BOX_IP:** `192.168.86.211` · NIC: `enp97s0` (USB LAN dongle to router) |
| **3** | Copy + `install-all.sh` | **Done** | Laptop `scp` → `/tmp/curxor-os` → `/opt/curxor` · see **Pitfalls** below |
| **3.2** | `deploy.sh --pull-models` | **Done** | `moondream:1.8b` + `qwen3:8b` pulled · warm step slow but **init exited 0** |
| **4** | eno cables + network scripts | **Pending** | `eno2 not found` during install (expected until built-in ports cabled) |
| **5** | Dashboard + FRE | **Done** | `http://192.168.86.211:3080` · FRE apps: `my-capital`, `my-content-creator`, `my-work` |
| **6** | Smile test / verify script | **Partial** | FRE + dashboard OK · full flagship click-through + `verify-unbox-day.sh --post-models` **not run yet** |

---

## Guide section checklist (pen-and-paper boxes)

### Part 1 — BIOS

| Guide item | Actual |
|------------|--------|
| UMA path | **GFX Configuration** (not top-level NBIO only) |
| UMA value | **48 GB** on 64 GB SKU |
| iGPU | Enabled (via UMA_SPECIFIED) |
| Secure Boot | Disabled → triggers Windows BitLocker until disk erased |

### Part 2 — Ubuntu

| Guide item | Actual |
|------------|--------|
| Wrong ISO trap | **Do not** use `ubuntu-26.04` — use **24.04 LTS** |
| BitLocker loop | Set **USB #1 in BIOS Boot tab**; don't need recovery key if erasing disk |
| Live vs installed | Purple desktop + **Install Ubuntu** icon = still on USB; must run installer to disk |
| Boot priority | **USB Device: UEFI: Samsung…** #1 · Quiet Boot off for debugging |

### Part 3 — CurXor install

| Guide item | Actual |
|------------|--------|
| First copy | `scp -r C:\Users\ankur\curxor-os ankur@192.168.86.211:/tmp/curxor-os` from **laptop** |
| `deploy-to-box.ps1` | **Updates only** — not first-time install |
| `install-all.sh` | Ran after `dos2unix` on `*.sh` |
| ROCm apt conflict | Remove Ubuntu `rocminfo`; install from AMD ROCm 7.2 repo |
| `amdkfd` at install | Normal before reboot; `/dev/kfd` present after reboot |
| Models | Standard 64: `moondream:1.8b`, `qwen3:8b` ✓ |

### Part 4 — Cables (next session)

| Guide item | Plan |
|------------|------|
| COMMAND | Built-in port → laptop or router → **eno1** |
| EGRESS | Other built-in port → router → **eno2** |
| USB dongle | Fine for install; **not** final COMMAND/EGRESS layout |
| Scripts | `setup-captive-portal.sh` · `setup-mesh-network.sh` |
| Verify | `verify-unbox-day.sh --post-models` |

### Part 5 — FRE (completed)

```json
{
  "initialized": true,
  "selectedApps": ["my-capital", "my-content-creator", "my-work"],
  "provisionedAt": "2026-06-28T06:23:17.645Z"
}
```

Browser: **http://192.168.86.211:3080/setup** → Step 2 Pick Claws → **BEGIN PROVISIONING**

---

## Pitfalls & fixes (Windows → Linux copy path)

Run these on the box when copying from a Windows laptop:

```bash
# 1. CRLF in shell scripts and env files
sudo apt-get install -y dos2unix
sudo find /opt/curxor -type f \( -name '*.sh' -o -name '*.env' -o -name '*.example' \) -exec dos2unix {} +
sudo dos2unix /etc/curxor/*.env

# 2. Docker "unable to find group render"
sudo groupadd -r render 2>/dev/null || true
sudo systemctl restart docker
# If still fails, in docker-compose.yml group_add use numeric GIDs:
#   video → "44"   render → "992"  (verify with getent group)

# 3. Ollama healthcheck (image has no curl)
# Use compose with: test: ["CMD", "ollama", "list"]  start_period: 120s
# Add OLLAMA_IGPU_ENABLE: "1" for gfx1151 / Strix Halo

# 4. Dashboard CHDIR / permission denied
sudo chmod 755 /opt/curxor
sudo chown -R curxor:curxor /opt/curxor/pillar-4-dashboard
sudo dos2unix /etc/systemd/system/curxor-*.service
sudo systemctl daemon-reload
sudo systemctl enable --now curxor-dashboard
```

**Compose note:** `ollama-init` inline `command` with `$${...}` breaks `docker compose` on some versions — use `config/ollama/init-models.sh` bind-mount (fixed in repo `docker-compose.yml`).

**Warm step:** `[curxor] Warming VLA weights into UMA heap...` can sit **10–20+ min** on first ROCm run; `curxor-ollama-init` **Exited (0)** = success even if deploy terminal looks stuck.

---

## Smoke commands (post-FRE)

```bash
curl -sf http://127.0.0.1:11434/api/tags && echo " ollama OK"
curl -sf http://127.0.0.1:3080/api/setup/status && echo " dashboard OK"
systemctl is-active curxor-dashboard curxor-compute
sudo docker ps | grep ollama
```

---

## Quick reference (this box)

| Field | Value |
|-------|--------|
| Hostname | `curxor` |
| User | `ankur` |
| LAN IP | `192.168.86.211` (router DHCP; may change) |
| Dashboard | http://192.168.86.211:3080 |
| SSH | `ssh ankur@192.168.86.211` |
| SKU | Standard 64 GB · UMA 48 GB |
| Inference | Ollama ROCm · `moondream:1.8b` · `qwen3:8b` |

---

## Related

| Doc | When |
|-----|------|
| [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) | Step-by-step checklist |
| [10-ms-s1-max-hardware-bios.md](../guides/10-ms-s1-max-hardware-bios.md) | BIOS detail |
| [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) | Daily laptop ↔ box loop |
