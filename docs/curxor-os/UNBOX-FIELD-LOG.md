# Unbox field log — MS-S1 MAX (Ankur)

> **Maps to:** [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md)  
> **Box:** `curxor` · **SKU:** Standard 64 GB · **Software:** 0.9.1  
> **Golden path:** **COMPLETE 2026-06-29** — verify PASS · smile test PASS

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
| **4** | **Done** | EGRESS → Nest router · COMMAND → laptop USB Ethernet · captive + mesh scripts |
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

---

## Verification snapshot (2026-06-29)

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

## Related

| Doc | When |
|-----|------|
| [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) | Step-by-step checklist |
| [10-ms-s1-max-hardware-bios.md](../guides/10-ms-s1-max-hardware-bios.md) | BIOS + NIC names |
| [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) | Daily laptop ↔ box loop |
| [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) | Deploy + CRLF |
