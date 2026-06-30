# Founder cockpit — laptop + MS-S1 daily loop

> **Audience:** Ankur only (founder operator + builder)  
> **Status:** Internal ops · **not** storefront / GTM / buyer docs  
> **Goal:** Use CurXor as the end user **and** ship code from Cursor on Windows, with agent visibility on front + back.

---

## Mental model

| Place | Role |
|-------|------|
| **Laptop** `C:\Users\ankur\curxor-os` | Source of truth · Cursor · `git` · `npm run qa:local` |
| **MS-S1** `/opt/curxor/` | Shipped code (replace on deploy) |
| **MS-S1** `/etc/curxor/` | **Your** operator data (persists across code deploys) |
| **SSH** `ssh curxor` | Laptop → box on **COMMAND cable** (`HostName 10.0.0.1`) |
| **Browser** **`http://10.0.0.1:3080/home`** | Operator home (Command Port captive) — dogfood UI |

**Rule:** Code on laptop → gate green → deploy to box → UAT in browser.  
**Don't** treat `/opt/curxor` as your main editor; hotfixes on the box must be copied back to the laptop same day.

**@curxorai posts:** draft queue + X-only Go Live → [X-CONTENT-QUEUE.md](./X-CONTENT-QUEUE.md)

---

## One-time setup (after Ubuntu + `install-all.sh`)

### 1. Note the box addresses

| Use | Address |
|-----|---------|
| **Browser (operator home)** | **`http://10.0.0.1:3080/home`** (Command Port) |
| **SSH from laptop** | **`10.0.0.1`** on COMMAND USB Ethernet · laptop **`10.0.0.2/24`** (static or DHCP from dnsmasq) |

MS-S1 interface map: **`enp98s0`** = Command · **`enp97s0`** = Egress/mesh. See [UNBOX-FIELD-LOG.md](./UNBOX-FIELD-LOG.md).

On the MS-S1, confirm:

```bash
ip -4 addr show enp98s0 enp97s0
```

**Do not use** pre-mesh router IPs (e.g. `192.168.86.211`) after Part 4 — they are obsolete.

### 2. Enable SSH (on the box)

```bash
sudo apt-get install -y openssh-server
sudo systemctl enable --now ssh
```

Create your login (if not already):

```bash
sudo adduser ankur
sudo usermod -aG sudo ankur
```

### 3. SSH key from Windows laptop

PowerShell:

```powershell
# If you don't have a key yet:
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519 -N '""'

# Copy key to box (enter password once — use IP before Host alias exists):
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh ankur@BOX_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3b. SSH Host alias (recommended — one-time on laptop)

Add to **`%USERPROFILE%\.ssh\config`** (Windows) so deploy + daily ops use **`ssh curxor`** instead of remembering IP:

```
Host curxor
    HostName 10.0.0.1
    User ankur
    IdentityFile ~/.ssh/id_ed25519
```

Set **`HostName 10.0.0.1`** when the laptop is on the COMMAND cable (`10.0.0.2`). Browser home stays **`http://10.0.0.1:3080/home`**.

Test:

```powershell
ssh curxor "hostname && systemctl is-active curxor-dashboard"
```

All commands below use **`ssh curxor`** / **`scp … curxor:`** when this block is present. Legacy form `ankur@BOX_IP` still works.

### 3c. COMMAND port split-route (Windows, one-time)

Plug COMMAND USB Ethernet + stay on Wi-Fi. Run once as Administrator from repo root:

```powershell
cd C:\Users\ankur\curxor-os
powershell -ExecutionPolicy Bypass -File .\scripts\install-laptop-command-port.ps1
```

This registers scheduled tasks so routing self-heals at logon and when the cable connects. COMMAND adapter: **`10.0.0.2/24`**, gateway **blank**, DNS **automatic**. Wi-Fi keeps internet; cable reaches the box only.

Re-apply manually after adapter changes:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-laptop-command-port.ps1
```

See [Networking — dual-homed laptop](../guides/03-networking.md#dual-homed-laptop-wi-fi--command-cable-simultaneously).

### 4. Bookmarks

| What | URL / path |
|------|------------|
| **Flight Command (home)** | **`http://10.0.0.1:3080/home`** |
| Setup / FRE | `http://10.0.0.1:3080/setup` |
| Health API | `http://10.0.0.1:3080/api/setup/status` |
| Local LLM tags | `http://127.0.0.1:11434/api/tags` (on box via SSH + curl) |

### 5. Cursor workspace

Keep **`C:\Users\ankur\curxor-os`** as the primary Agent workspace for all product work.

Optional second window: **Remote-SSH** to **`curxor`** → open `/opt/curxor` only when debugging appliance-only issues (ROCm, mesh, systemd).

---

## Daily loop

**Before you build:** Wi-Fi on, COMMAND cable in, open **`http://10.0.0.1:3080/home`**. Use **`ssh curxor`** for box commands. Both links stay up; you do not unplug the cable for internet after [split-route install](#3c-command-port-split-route-windows-one-time).

```
┌─────────────────────────────────────────────────────────┐
│ 1. BUILD (laptop)     npm run dev / edit · qa:local     │
│ 2. DEPLOY (laptop→box) scp/rsync → post-update          │
│ 3. RESTART (box)      post-update.sh restarts curxor-dashboard │
│ 4. OPERATE (browser)  http://BOX_IP:3080 — dogfood      │
│ 5. COMMIT (laptop)    git commit when box + qa green    │
└─────────────────────────────────────────────────────────┘
```

### Step 1 — Gate on laptop

```powershell
cd C:\Users\ankur\curxor-os\pillar-4-dashboard
npm.cmd run typecheck
npm.cmd run qa:local -- --port 3081
```

Fix until green before deploying.

### Step 2 — Deploy code to box

**Option A — `deploy-to-box.ps1` (recommended on Windows)**

From repo root on the laptop (after `qa:local` is green):

```powershell
cd C:\Users\ankur\curxor-os
.\scripts\deploy-to-box.ps1
```

Default target: **`curxor`** (`~/.ssh/config` Host). Optional `-BoxIp BOX_IP` only for browser URL hint in script output.

The script: **tar** (no `.git`/`.next`) → **scp** → on-box extract + `rsync` to `/opt/curxor/` → **`sed -i 's/\r$//'` on all `*.sh`** → `post-update.sh` (rebuild, restart dashboard) → curl smoke.

**CRLF:** Any script you **scp alone** to `/tmp` must be stripped on the box before `bash`: `sed -i 's/\r$//' /tmp/script.sh`. Or use `.\scripts\copy-script-to-box.ps1` from the laptop. Full detail: [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) — **CRLF** section.

**Enter sudo password when SSH prompts.** If you miss it, see [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) — **Finish a stuck deploy**.

**Quick reference:** [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) — deploy, debug, hotfix one-liners.

Flags: `-SshHost curxor` (default) · `-BoxIp 10.0.0.1` (browser URL hint only) · `-SkipPack` if tarball already on box · `-WhatIf` to print steps without running.

**Option A2 — Manual** (same steps as the script)

```powershell
cd C:\Users\ankur\curxor-os
scp -r . curxor:/tmp/curxor-os
```

On the box:

```bash
sudo rsync -a --delete /tmp/curxor-os/ /opt/curxor/
sudo find /opt/curxor -name '*.sh' -exec sed -i 's/\r$//' {} +
sudo bash /opt/curxor/scripts/post-update.sh
```

`post-update.sh` rebuilds pillar-4-dashboard and runs `systemctl restart curxor-dashboard.service`.  
**Do not** rely on `systemctl restart curxor-os.target` alone — it does not recycle the dashboard process.

**Option B — USB** (no network)

Copy `curxor-os` folder to USB on laptop → on box:

```bash
sudo rsync -a --delete /media/$USER/*/curxor-os/ /opt/curxor/
sudo find /opt/curxor -name '*.sh' -exec sed -i 's/\r$//' {} +
sudo bash /opt/curxor/scripts/post-update.sh
```

**First install only** (blank box): use `install-all.sh` instead of `post-update.sh`:

```bash
sudo rsync -a /tmp/curxor-os/ /opt/curxor/
sudo bash /opt/curxor/scripts/install-all.sh
```

### Step 3 — Smoke on box

SSH (`ssh curxor`):

```bash
curl -sf http://127.0.0.1:3080/api/setup/status
curl -sf http://127.0.0.1:11434/api/tags && echo "Ollama OK" || echo "Ollama down (frontier fallback OK)"
systemctl status curxor-dashboard --no-pager
```

Browser on laptop: open `http://BOX_IP:3080` and click your change.

### Step 4 — Commit on laptop

Only after laptop `qa:local` **and** box UAT look good.

---

## Operate vs build (same box, two hats)

| Mode | You | Data |
|------|-----|------|
| **Operate** | Use Capital, Creator, Work, Forge, Cafe like a buyer | Writes to `/etc/curxor/` |
| **Build** | Edit repo on laptop, deploy, re-test | `/opt/curxor/` replaced; `/etc/curxor/` kept |

Your dogfood state (FRE, queues, settings, workspaces) **survives deploys**.  
If you need a clean slate: backup `/etc/curxor` first, then `seed-appliance-data.sh` (destructive — rarely).

---

## Giving the Cursor agent "eyes" (front + back)

The agent does **not** auto-watch the box. In an Agent chat, provide:

```
SSH: curxor (key auth · ~/.ssh/config Host curxor → BOX_IP)
Box IP: <BOX_IP>  (browser only — http://BOX_IP:3080)
Issue: [what you see in browser + what you changed]
```

| Layer | How agent helps |
|-------|-----------------|
| **Backend code** | `@` files in `curxor-os` on laptop |
| **Backend runtime** | Agent runs `ssh curxor 'journalctl -u curxor-dashboard -n 50'` etc. |
| **API** | `curl http://BOX_IP:3080/api/...` from laptop or via SSH |
| **Frontend** | Ask agent to open `http://BOX_IP:3080/...` with browser tools |

**Paste when stuck:** browser error, screenshot, or:

```bash
journalctl -u curxor-dashboard -u curxor-engine -u curxor-telemetry-broker -n 80 --no-pager
```

---

## Useful SSH commands (back end)

```bash
# Stack health
systemctl status curxor-os.target
systemctl status curxor-dashboard curxor-compute curxor-engine curxor-telemetry-broker

# Logs (live)
journalctl -u curxor-dashboard -f

# GPU / inference
/opt/curxor/pillar-1-compute/scripts/verify-gpu.sh
curl -s http://127.0.0.1:11434/api/tags | head

# Your operator data (read-only peek)
sudo ls -la /etc/curxor/
sudo cat /etc/curxor/fre-state.json

# Mesh / Egress Port
ip addr show enp98s0 enp97s0
/opt/curxor/pillar-3-telemetry/scripts/verify-mesh.sh

# Full verify
sudo /opt/curxor/scripts/verify-unbox-day.sh
```

---

## Cursor on the box (optional — founder only)

| Do | Don't |
|----|--------|
| Install Cursor on Ubuntu desktop for ROCm-only bugs | Use box as primary git workspace |
| Use Remote-SSH from laptop (lighter) | Ship Cursor to customers |
| Short experiments on `/opt/curxor` | Leave uncommitted box edits |

Customers get **Flight Command only** — no IDE on appliance images.

---

## Optional: kiosk (monitor on box)

After stack is healthy:

```bash
sudo /opt/curxor/scripts/install-kiosk-mode.sh
sudo reboot
```

See [19-kiosk-mode.md](../guides/19-kiosk-mode.md). Laptop browser still works in parallel.

---

## Later: OTA (when release mirror exists)

Manual rsync = founder loop today. Production path:

1. Tag release in git  
2. Publish artifact + `version.json` to OTA URL  
3. Box runs `ota-updater.sh` (nightly cron) or manual trigger  

Config: [08-ota-updates.md](../guides/08-ota-updates.md)

Until OTA URL is live, **rsync + post-update** is correct.

---

## Quick troubleshooting

| Symptom | Check |
|---------|--------|
| Browser can't reach box | **`http://10.0.0.1:3080/home`** (not `https://`) · incognito if cached · `ss -tlnp \| grep 3080` on box |
| Internet dies when cable plugged in | COMMAND gateway/DNS blank · `install-laptop-command-port.ps1` · box: no `address=/#/` in dnsmasq |
| L2 OK, TCP to box fails | Box reboot · `ip neigh show dev enp98s0` should list `10.0.0.2` |
| 500 after deploy | `journalctl -u curxor-dashboard` · `.env.local` on box? · re-run `post-update.sh` |
| Dashboard won't start (CHDIR) | `ls -la /opt/curxor` — fix perms: `chmod 755` + `chown curxor:curxor pillar-4-dashboard` |
| post-update fails | Use `sudo bash post-update.sh` · CRLF: `sed -i 's/\r$//' /path/to/script.sh` before bash |
| QA green on laptop, broken on box | ROCm/Ollama · env in `/etc/curxor/*.env` · paths differ from dev-qa |
| Data "reset" after deploy | Should not happen — if it did, check writes going to `/etc/curxor` not `/opt/curxor/scripts/dev-qa` |
| SSH refused | `HostName 10.0.0.1` in `~/.ssh/config` (not `192.168.86.211`) · `sudo systemctl status ssh` |

---

## Related docs

| Doc | Use |
|-----|-----|
| [FOUNDER-PATCH-RUNBOOK.md](./FOUNDER-PATCH-RUNBOOK.md) | **Deploy · debug · hotfix** (start here when stuck) |
| [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) | First boot |
| [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md) | Golden path |
| [07-flight-command-dashboard.md](../guides/07-flight-command-dashboard.md) | Operator UI |
| [09-operations-troubleshooting.md](../guides/09-operations-troubleshooting.md) | Day-2 ops |

---

*Browser home: **`http://10.0.0.1:3080/home`**. SSH `HostName` is always **`10.0.0.1`** on COMMAND cable (not pre-mesh router IPs). See [UNBOX-FIELD-LOG.md](./UNBOX-FIELD-LOG.md).*
