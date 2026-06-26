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
| **Browser** `http://<BOX_IP>:3080` | Dogfood UI — same as end user |

**Rule:** Code on laptop → gate green → deploy to box → UAT in browser.  
**Don’t** treat `/opt/curxor` as your main editor; hotfixes on the box must be copied back to the laptop same day.

**@curxorai posts:** draft queue + X-only Go Live → [X-CONTENT-QUEUE.md](./X-CONTENT-QUEUE.md)

---

## One-time setup (after Ubuntu + `install-all.sh`)

### 1. Note the box IP

On the MS-S1:

```bash
ip addr | grep "inet "
```

Write down **eno1** LAN IP (e.g. `10.0.0.x` captive mode or DHCP from router). Call this **`BOX_IP`**.

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

# Copy key to box (enter password once):
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh ankur@BOX_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Test:

```powershell
ssh ankur@BOX_IP "hostname && systemctl is-active curxor-dashboard"
```

### 4. Bookmarks

| What | URL / path |
|------|------------|
| Flight Command | `http://BOX_IP:3080` |
| Setup / FRE | `http://BOX_IP:3080/setup` |
| Health | `http://BOX_IP:3080/api/setup/status` |
| Local LLM tags | `http://BOX_IP:11434/api/tags` (on box via SSH + curl) |

### 5. Cursor workspace

Keep **`C:\Users\ankur\curxor-os`** as the primary Agent workspace for all product work.

Optional second window: **Remote-SSH** to `ankur@BOX_IP` → open `/opt/curxor` only when debugging appliance-only issues (ROCm, mesh, systemd).

---

## Daily loop

```
┌─────────────────────────────────────────────────────────┐
│ 1. BUILD (laptop)     npm run dev / edit · qa:local     │
│ 2. DEPLOY (laptop→box) scp/rsync → post-update          │
│ 3. RESTART (box)      systemctl restart curxor-os.target│
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
.\scripts\deploy-to-box.ps1 -BoxIp BOX_IP
```

The script: `scp` whole tree → on-box `rsync` to `/opt/curxor/` → `post-update.sh` → `systemctl restart curxor-os.target` → quick curl smoke.

Flags: `-BoxUser ankur` (default) · `-SkipScp` if payload is already in `/tmp/curxor-os` · `-WhatIf` to print steps without running.

**Option A2 — Manual SCP** (same steps as the script)

```powershell
scp -r C:\Users\ankur\curxor-os ankur@BOX_IP:/tmp/curxor-os
```

On the box:

```bash
sudo rsync -a --delete /tmp/curxor-os/ /opt/curxor/
sudo bash /opt/curxor/scripts/post-update.sh
sudo systemctl restart curxor-os.target
```

**Option B — USB** (no network)

Copy `curxor-os` folder to USB on laptop → on box:

```bash
sudo rsync -a --delete /media/$USER/*/curxor-os/ /opt/curxor/
sudo bash /opt/curxor/scripts/post-update.sh
sudo systemctl restart curxor-os.target
```

**First install only** (blank box): use `install-all.sh` instead of `post-update.sh`:

```bash
sudo rsync -a /tmp/curxor-os/ /opt/curxor/
sudo bash /opt/curxor/scripts/install-all.sh
```

### Step 3 — Smoke on box

SSH:

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

## Giving the Cursor agent “eyes” (front + back)

The agent does **not** auto-watch the box. In an Agent chat, provide:

```
Box IP: <BOX_IP>
SSH: ankur@BOX_IP (key auth works)
Issue: [what you see in browser + what you changed]
```

| Layer | How agent helps |
|-------|-----------------|
| **Backend code** | `@` files in `curxor-os` on laptop |
| **Backend runtime** | Agent runs `ssh ankur@BOX_IP 'journalctl -u curxor-dashboard -n 50'` etc. |
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

# Mesh / eno2
ip addr show eno1 eno2
/opt/curxor/pillar-3-telemetry/scripts/verify-mesh.sh

# Full verify
sudo /opt/curxor/scripts/verify-unbox-day.sh
```

---

## Cursor on the box (optional — founder only)

| Do | Don’t |
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
| Browser can’t reach box | `ping BOX_IP` · same LAN · firewall · `ss -tlnp \| grep 3080` on box |
| 500 after deploy | `journalctl -u curxor-dashboard` · re-run `post-update.sh` |
| QA green on laptop, broken on box | ROCm/Ollama · env in `/etc/curxor/*.env` · paths differ from dev-qa |
| Data “reset” after deploy | Should not happen — if it did, check writes going to `/etc/curxor` not `/opt/curxor/scripts/dev-qa` |
| SSH refused | `sudo systemctl status ssh` · box IP changed |

---

## Related docs

| Doc | Use |
|-----|-----|
| [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) | First boot |
| [HW-READINESS-CHECKLIST.md](./HW-READINESS-CHECKLIST.md) | Golden path |
| [07-flight-command-dashboard.md](../guides/07-flight-command-dashboard.md) | Operator UI |
| [09-operations-troubleshooting.md](../guides/09-operations-troubleshooting.md) | Day-2 ops |

---

*Update `BOX_IP` at the top of your notes when DHCP changes.*
