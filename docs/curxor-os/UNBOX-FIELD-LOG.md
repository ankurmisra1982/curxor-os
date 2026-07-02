# Unbox field log — MS-S1 MAX (Ankur)

> **Maps to:** [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md)  
> **Box:** `curxor` · **SKU:** Standard 64 GB · **Software:** **1.0.0** (box verified)  
> **Golden path:** **COMPLETE 2026-07-01** — verify PASS · Nest Pro egress restored · smile test PASS · G1 ✓

### Current ops (post–Part 4)

| What | Value |
|------|--------|
| **Browser home** | **`http://10.0.0.1:3080/home`** |
| **SSH** | **`ssh ankur@10.0.0.1`** (COMMAND cable · laptop `10.0.0.2`) |
| **Deploy** | `.\scripts\deploy-to-box.ps1` from laptop (use `dos2unix` / `copy-script-to-box.ps1` for `.sh`) |

### MS-S1 MAX interface map (verified)

| Role | CurXor name | **Linux iface** | IPv4 |
|------|-------------|-----------------|------|
| COMMAND | Command Port | **`enp98s0`** | **`10.0.0.1/24`** |
| EGRESS | Egress Port / mesh | **`enp97s0`** | **`10.77.0.1/24`** |

**Not `eno1`/`eno2` on this hardware.** Scripts default to `enp98s0`/`enp97s0` via `scripts/lib/network-defaults.sh`.

**Obsolete:** `192.168.86.211` was USB dongle → router DHCP during first install only. After mesh + captive portal, use **`10.0.0.1`** only.

---

## Timeline vs guide

| Guide block | Status | Session notes |
|-------------|--------|---------------|
| **0–3** | **Done** | BIOS 48 GB UMA · Ubuntu 24.04.4 · `/opt/curxor` · models pulled |
| **4** | **Done** | EGRESS → Nest Pro (2026-07-01 swap) · COMMAND → laptop USB Ethernet · captive + mesh scripts |
| **5** | **Done** | FRE: `my-capital`, `my-content-creator`, `my-work` |
| **6** | **Done** | `verify-unbox-day.sh --post-models` PASS · smile test PASS |

---

## Pitfalls & fixes (Windows → Linux)

### COMMAND cable steals laptop internet (dual-homed Wi-Fi + cable)

**Symptom:** Google/DNS broken, "no internet" on Ethernet, or captive portal when Wi-Fi is still connected.

**Root cause (old box config):** DHCP `option:router` + wildcard DNS `address=/#/10.0.0.1`. Laptop static `10.0.0.2` with gateway `10.0.0.1` has the same effect. DNS set to home router (e.g. `192.168.86.1`) on the COMMAND adapter does **not** fix it — router is not on `10.0.0.0/24`.

**Box fix:**

```bash
sudo /opt/curxor/scripts/setup-captive-portal.sh
grep -E 'option:router|address=/#/' /etc/dnsmasq.d/curxor-captive.conf && echo BAD || echo OK
```

`verify-unbox-day.sh` warns if wildcard DNS or `option:router` remains. Probe domains only: `config/captive-portal/captive-dns-domains.txt`.

**Laptop fix (Windows):** IP `10.0.0.2/24`, gateway **blank**, DNS **automatic**. One-time:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-laptop-command-port.ps1
```

**Session notes (2026-06-29):**

- Box reboot cleared stale ARP when L2 lookup worked but TCP to `10.0.0.2` failed
- `ip neigh show dev enp98s0` — `STALE` entry for `10.0.0.2` MAC confirms correct cable
- `curl http://10.0.0.1` port 80 from **on box** returns `000` — normal (iptables redirect is inbound-only)
- `curl -sf http://10.0.0.1:3080/api/setup/status` on box must be **200**
- Browser must use **`http://`** not `https://`; incognito fixes false "down"
- SSH `~/.ssh/config` `HostName` must be **`10.0.0.1`**, not `192.168.86.211`
- `install-laptop-command-port.ps1` looked hung: silent `schtasks` + slow `Test-NetConnection` — repo now prints progress and uses `-SkipVerification` on install
- Windows: no `New-NetRoute -PolicyStore PersistentStore`; `setup-laptop-command-port.ps1` uses `route add -p`

### CRLF (required after `scp` from Windows)

```bash
sudo find /opt/curxor -name '*.sh' -exec dos2unix {} +
sudo dos2unix /etc/systemd/system/curxor-*.service
# Symptom: bash\r: No such file or directory | set: pipefail: invalid option
```

### dnsmasq `bind-dynamic` vs `bind-interfaces`

Ubuntu 24.04 default `/etc/dnsmasq.conf` may have **`bind-dynamic`** — conflicts with captive portal **`bind-interfaces`**.

```text
cannot set --bind-interfaces and --bind-dynamic
```

**Fix:** `setup-captive-portal.sh` now comments both out; re-run script or `sudo sed -i 's/^bind-dynamic/#bind-dynamic/' /etc/dnsmasq.conf`. Do **not** copy `config/captive-portal/dnsmasq-captive.conf` verbatim — script **generates** iface names.

### Telemetry broker — pyzmq 27 `TCP_NODELAY`

**Symptom:** `AttributeError: module 'zmq' has no attribute 'TCP_NODELAY'` · broker crash loop.

**Fix (repo):** removed redundant `setsockopt` — libzmq disables Nagle on all TCP sockets. On box without redeploy:

```bash
sudo sed -i '/zmq\.TCP_NODELAY/d' \
  /opt/curxor/pillar-3-telemetry/.venv/lib/python3.12/site-packages/curxor_broker/*.py
sudo systemctl restart curxor-telemetry-broker
```

### verify-gpu — `/dev/dri/card1` not card0

MS-S1 iGPU is often **`card1`**. Repo `verify-gpu.sh` accepts any `/dev/dri/card*`.

### ~15 Gi in `free -h` is normal

64 GB SKU + **48 GB UMA BIOS** → Linux sees **~15–16 Gi** system RAM; rest is GPU carve-out. Dashboard `gpuHeapGb: 48` confirms UMA.

### Interface env vars (all network scripts)

```bash
export CURXOR_CMD_IFACE=enp98s0
export CURXOR_MESH_IFACE=enp97s0
sudo CURXOR_CMD_IFACE=enp98s0 CURXOR_MESH_IFACE=enp97s0 \
  /opt/curxor/scripts/verify-unbox-day.sh --post-models
```

### Temporary internet on box (apt/pip)

Mesh isolates EGRESS. For apt during unbox: temporary Nest IP on `enp97s0` + `echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf`, then restore mesh.

### Docker render group

`unable to find group render` after reboot → `sudo systemctl restart docker` or numeric GIDs in compose.

### Ollama

Healthcheck: `ollama list` not `curl`. `OLLAMA_IGPU_ENABLE=1` for gfx1151.

### Engine ZMQ `EBUSY` (Promise.race on vision receive)

**Symptom:** `curxor-engine` crash loop · `Socket is busy reading; only one receive operation may be in progress`.

**Cause:** `mesh-client.ts` used `Promise.race` between `visionSub.receive()` and timeout — orphaned receive on next loop.

**Fix (repo):** use `visionSub.receiveTimeout` instead. Hot-patched on box 2026-07-01; ship via next `deploy-to-box.ps1`.

---

## Verification snapshot (2026-07-01 — Nest Pro egress swap)

```text
# CurXor unbox verification — curxor — 2026-07-01T17:09:26-04:00
- OS: Ubuntu 24.04.4 LTS · kernel 6.17.0-35-generic
- Path: clean Ubuntu vs vendor image → (record A or B)
- enp98s0: 10.0.0.1 (want 10.0.0.1)
- enp97s0: 10.77.0.1 (want 10.77.0.1)
- rocminfo gfx1151: gfx1151
- Ollama :11434: OK
- verify-mesh: PASS
- Failures: 0 · Warnings: 4

Post-install-all (same session):
  curxor-dashboard          : active
  curxor-telemetry-broker   : active · 10.77.0.1:9100-9201 listening
  curxor-compute            : active (Ollama Docker · qwen3:8b, moondream:1.8b)
  egress WAN                : 192.168.86.240 via Nest Pro · verify-egress-wan.sh PASS
```

## Verification snapshot (2026-06-29 — initial unbox)

```text
verify-unbox-day.sh --post-models : PASS (0 failures, 4 warnings)
  Warnings: rocm-smi, curxor-compute/engine not installed (Ollama Docker OK)
curxor-telemetry-broker : active
10.77.0.1:9100-9201     : listening
Ollama                  : qwen3:8b, moondream:1.8b
Dashboard               : /api/setup/status OK, gpuHeapGb 48
```

---

## Quick reference (this box)

| Field | Value |
|-------|--------|
| Hostname | `curxor` |
| User | `ankur` |
| COMMAND | `enp98s0` @ `10.0.0.1` |
| EGRESS/mesh | `enp97s0` @ `10.77.0.1` |
| Dashboard | http://10.0.0.1:3080/home |
| SSH | `ssh ankur@10.0.0.1` (laptop static `10.0.0.2/24`) |
| SKU | Standard 64 GB · UMA 48 GB |
| Inference | Ollama ROCm · `moondream:1.8b` · `qwen3:8b` |

---

## Flagship appliance pass (D01–D04 · Lane D · 2026-07-02)

**Gate:** G1 ✓ · P1  
**Deploy stamp:** `b89d4ead47d58c165cb65690e2b07188cb85d48f` (master)  
**Target:** `http://10.0.0.1:3080`

| Check | Result | Notes |
|-------|--------|-------|
| **D01 Work** `qa:work-checklist` | **PASS** (73/73) | `source=live` (SMTP + Gmail OAuth linked); wizard activate deferred when `physicalAddress` missing — honest |
| **D02 Capital** `qa:capital-checklist` | **PASS** (8/8) | `source=demo` — no Alpaca paper keys in `/etc/curxor/digital.env` |
| **D04 Forge→Cafe** `qa:forge-checklist` | **PASS** (23/23) | Cafe mint consumer + `cafeEvents` ledger OK |
| **Box smoke** `box-smoke.sh` | **PASS** | All API routes 2xx · `curxor-dashboard` active |
| **Laptop** `npm run qa:local` | **208/209** | 1 pre-existing fail: `build plane delegation suggest approve` (BP5 — out of scope) |

### Keys / config on box

| Key / surface | Status |
|---------------|--------|
| `ALPACA_API_KEY_ID` / `ALPACA_API_SECRET_KEY` | **Not set** — Capital runs demo/simulated path |
| `SMTP_HOST` / `SMTP_FROM` | **Set** — Work bridge reports live |
| Google Workspace OAuth | **Linked** — morning brief uses Gmail (live) |
| `physicalAddress` / `optOutLine` (Work FRE) | **Missing** — pre-send gate warns; sequences activate deferred (no fake send) |
| `N8N_WEBHOOK_URL` | **Not set** — webhook test correctly noops (demo) |

### Appliance fix shipped

`activate_sequence` no longer returns HTTP 422 when the pre-send compliance gate fails (missing CAN-SPAM fields). Sequences activate with `autoSendPolicy: deferred` until compliance is completed — matches demo-honest behavior on partial live config.

```text
# Re-verify (laptop)
cd pillar-4-dashboard
npm run qa:work-checklist -- http://10.0.0.1:3080
npm run qa:capital-checklist -- http://10.0.0.1:3080
npm run qa:forge-checklist -- http://10.0.0.1:3080
ssh curxor "bash /opt/curxor/scripts/box-smoke.sh http://127.0.0.1:3080"
```

**Verdict:** Flagship four desks + Forge are demo-ready on real MS-S1 hardware. Optional: `.\scripts\push-ops-env-to-box.ps1` for Alpaca paper smoke; add `physicalAddress` + `optOutLine` in Work setup for full live outbound.

**2026-07-02 — OL1 + FF0 shipped:** Cafe = Patron Hall (universal strip); Engage inbox under Creator only; FRE picker excludes Cafe · Signal · Kin.

**2026-07-02 — OL-Kin1 shipped:** Kin rename sweep — household mapper (not operate employee); nav "Kin" · GTM "your household on the box".

---

## Related

| Doc | When |
|-----|------|
| [01-installation.md](../guides/01-installation.md#golden-path-notes-ms-s1-max--verified-2026-07-01) | **Canonical post-unbox guide — GOLDEN PATH NOTES** |
| [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) | Step-by-step checklist |
| [10-ms-s1-max-hardware-bios.md](../guides/10-ms-s1-max-hardware-bios.md) | BIOS + NIC names |
| [08-ota-updates.md](../guides/08-ota-updates.md) | OTA daemon · Settings → Updates (post GR-1) |
| [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) | Daily laptop ↔ box loop |
| [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) | Deploy + CRLF |
