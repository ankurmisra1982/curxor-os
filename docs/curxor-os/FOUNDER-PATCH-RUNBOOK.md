# Founder patch runbook — update, deploy, debug

> **Audience:** Ankur only · one-page ops when something breaks or you ship a fix  
> **Browser (home):** **`http://10.0.0.1:3080/home`** · **SSH:** **`ssh curxor`** (HostName = router LAN IP in `~/.ssh/config`)

---

## Two addresses (don't mix them up)

| Purpose | URL / command | NIC / notes |
|---------|---------------|-------------|
| **Dogfood UI (operator home)** | **`http://10.0.0.1:3080/home`** | Command Port (`enp98s0`) |
| **Setup / FRE** | `http://10.0.0.1:3080/setup` | same |
| **SSH + deploy from laptop** | `ssh curxor` | **`HostName 10.0.0.1`** · laptop `10.0.0.2` on COMMAND cable |
| **On-box curl smoke** | `http://127.0.0.1:3080/...` | always works over SSH |

Pre–Part 4 only: router DHCP (e.g. `192.168.86.211`) worked for first `scp` — **obsolete** after captive portal.

---

## The three places (memorize this)

| Place | Path | What lives here |
|-------|------|-----------------|
| **Laptop** | `C:\Users\ankur\curxor-os` | Source code · edit in Cursor · git |
| **Box code** | `/opt/curxor/` | Shipped app · replaced every deploy |
| **Box data** | `/etc/curxor/` | YOUR settings, queues, FRE — **survives deploys** |

**Golden rule:** Edit on laptop → deploy → restart dashboard → UAT in browser.  
Never treat `/opt/curxor` as your main workspace.

---

## CRLF — Windows laptop → Linux box (memorize)

Scripts edited on Windows can ship with **CRLF** (`\r\n`). On the box, bash then fails with:

```text
: invalid option name
set: pipefail: invalid option
```

**Repo guard:** `.gitattributes` forces `*.sh` LF in git — but **scp of a single file to `/tmp` bypasses deploy** and can still carry `\r`.

### Canonical fix on the box (always use this)

**One file** (ad-hoc script in `/tmp`):

```bash
sed -i 's/\r$//' /tmp/your-script.sh
sudo bash /tmp/your-script.sh
```

**All shipped scripts** under `/opt/curxor` (deploy / manual rsync):

```bash
# Prefer script dirs only — avoids permission errors in node_modules/
sudo find /opt/curxor/scripts /opt/curxor/pillar-4-dashboard/scripts /opt/curxor/pillar-2-engine \
  -name '*.sh' -exec sed -i 's/\r$//' {} +
```

Broad find (can fail on `node_modules` permission denied):

```bash
sudo find /opt/curxor -name '*.sh' -exec sed -i 's/\r$//' {} +
```

**Helper** (same as above):

```bash
bash /opt/curxor/scripts/strip-sh-crlf.sh /tmp/your-script.sh
sudo bash /opt/curxor/scripts/strip-sh-crlf.sh /opt/curxor
```

### From laptop (scp + strip automatically)

```powershell
cd C:\Users\ankur\curxor-os
.\scripts\copy-script-to-box.ps1 scripts\reset-appliance-data.sh
# then on box: sudo bash /tmp/reset-appliance-data.sh
```

`deploy-to-box.ps1` strips CRLF after rsync (script dirs only) — you do **not** need a separate strip for full deploys.

### PowerShell trap (2026-07-01)

**Do not** put `sed -i 's/\r$//'` inside a PowerShell **double-quoted** string. `\r` becomes a real carriage return and the remote `sed` pattern is wrong — `post-update.sh` keeps CRLF and bash fails with:

```text
post-update.sh: line 13: syntax error near unexpected token `$'{\r''
post-update.sh: line 13: `log() {
```

**Fix in repo:** `deploy-to-box.ps1` uses `$shCrLfStrip = 's/\r$//'` (single-quoted) in a here-string.

**Recover on box** (tarball usually still at `/tmp/curxor-deploy.tar.gz`):

```bash
ssh -t curxor "sudo find /opt/curxor/scripts /opt/curxor/pillar-4-dashboard/scripts /opt/curxor/pillar-2-engine -name '*.sh' -exec sed -i 's/\r$//' {} + && sudo bash /opt/curxor/scripts/post-update.sh"
```

Or: `sudo bash /opt/curxor/scripts/box-apply-deploy.sh /tmp/curxor-deploy.tar.gz`

---

## Ship a patch (happy path)

### 1. Laptop — gate (optional but recommended)

```powershell
cd C:\Users\ankur\curxor-os\pillar-4-dashboard
npm.cmd run typecheck
```

### 2. Laptop — deploy

```powershell
cd C:\Users\ankur\curxor-os
.\scripts\deploy-to-box.ps1
```

Default SSH target: **`curxor`** (`~/.ssh/config`). Optional `-BoxIp` only changes the browser URL printed at the end (use `-BoxIp 10.0.0.1` for captive hint).

**Must run from the repo folder** — not `C:\Users\ankur>`.

The script:
1. **tar** repo on laptop (skips `.git`, `node_modules`, `.next`) → faster, no permission spam
2. **scp** archive → `/tmp/curxor-deploy.tar.gz` on box
3. SSH: extract → `/tmp/curxor-os/` → `sudo rsync` → `/opt/curxor/`
4. Strip CRLF from `*.sh`, remove `.env.local`, fix permissions
5. `npm run build` in pillar-4-dashboard (~5–8 min)
6. Restart **`curxor-dashboard.service`**

**You must enter your sudo password when SSH prompts.** If you skip it, the script prints **`DEPLOY INCOMPLETE`** — the old build is still running.

### How to know deploy actually worked

| Check | Good | Bad (sudo skipped or build failed) |
|-------|------|-------------------------------------|
| Script output | `Post-update complete` + `dashboard OK` | `sudo: a password is required` |
| Box grep | `grep "Hide telemetry" /opt/curxor/pillar-4-dashboard/components/desktop/FlightCommandDesktop.tsx` finds a line | Permission denied or no match |
| Browser | Hard refresh shows your change | Same old UI |

### 3. Smoke (box or laptop browser)

```bash
# On box:
curl -s -o /dev/null -w "capital: %{http_code}\n" http://127.0.0.1:3080/api/capital/status
systemctl is-active curxor-dashboard.service
```

Expect **`capital: 200`** and **`active`**.

### 4. Browser

Hard refresh **`http://10.0.0.1:3080/home`** (`Ctrl+Shift+R`) → click your changed page.

---

## Finish a stuck deploy (sudo missed during script)

If the laptop script could not enter sudo, the tarball is usually at **`/tmp/curxor-deploy.tar.gz`**.  
**Never rsync into `/opt/curxor` until you verify the payload** — an empty `/tmp/curxor-os` will wipe the appliance (happened 2026-06-28).

**On the box:**

```bash
ssh curxor
ls -lh /tmp/curxor-deploy.tar.gz          # must exist (~20 MB)
sudo bash /opt/curxor/scripts/box-apply-deploy.sh
```

If `/opt/curxor` is already empty (no `box-apply-deploy.sh` yet), extract once by hand, verify, then rsync:

```bash
ls -lh /tmp/curxor-deploy.tar.gz
rm -rf /tmp/curxor-os && mkdir -p /tmp/curxor-os
tar -xzf /tmp/curxor-deploy.tar.gz -C /tmp/curxor-os
test -f /tmp/curxor-os/scripts/post-update.sh && test -f /tmp/curxor-os/pillar-4-dashboard/package.json && echo "payload OK"
sudo rsync -a --delete /tmp/curxor-os/ /opt/curxor/
sudo find /opt/curxor/scripts /opt/curxor/pillar-4-dashboard/scripts /opt/curxor/pillar-2-engine -name '*.sh' -exec sed -i 's/\r$//' {} +
sudo bash /opt/curxor/scripts/post-update.sh
```

Wait for **`Post-update complete`**, then hard-refresh the browser.

---

## Manual deploy (when script fails entirely)

**On laptop:**

```powershell
cd C:\Users\ankur\curxor-os
tar -czf $env:TEMP\curxor-deploy.tar.gz --exclude=.git --exclude=node_modules --exclude=.next .
scp $env:TEMP\curxor-deploy.tar.gz curxor:/tmp/
```

**On box (SSH):**

```bash
sudo bash -c 'rm -rf /tmp/curxor-os && mkdir -p /tmp/curxor-os && tar -xzf /tmp/curxor-deploy.tar.gz -C /tmp/curxor-os && rsync -a --delete /tmp/curxor-os/ /opt/curxor/ && find /opt/curxor/scripts /opt/curxor/pillar-4-dashboard/scripts /opt/curxor/pillar-2-engine -name "*.sh" -exec sed -i "s/\r$//" {} + && bash /opt/curxor/scripts/post-update.sh'
```

`post-update.sh` rebuilds the dashboard and restarts the service.  
**Do not** use `systemctl restart curxor-os.target` alone — it does not restart the dashboard.

---

## Debug cheat sheet

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **`capital: 500`** or **`mkdir('.')` in logs** | `.env.local` with Windows paths on box | `sudo rm -f /opt/curxor/pillar-4-dashboard/.env.local` then restart dashboard |
| **`capital: 000`** / site down | Dashboard crash-loop | `journalctl -u curxor-dashboard -n 30` — often **Permission denied** on WorkingDirectory |
| **`Permission denied` / `CHDIR`** | `/opt/curxor` owned `ankur:700` after scp | `sudo chmod 755 /opt/curxor` · `sudo chown -R curxor:curxor /opt/curxor/pillar-4-dashboard` · restart |
| **`post-update.sh: Permission denied`** | Script not executable | `sudo bash /opt/curxor/scripts/post-update.sh` (not `./post-update.sh`) |
| **`set: pipefail: invalid option`** | CRLF in shell script (Windows scp) | `sed -i 's/\r$//' /path/to/script.sh` then re-run — see **CRLF** section above |
| **`syntax error near unexpected token $'{\r''` on `log()`** | CRLF survived deploy (`post-update.sh`) | Strip script dirs (CRLF section) then `sudo bash /opt/curxor/scripts/post-update.sh` |
| **`invalid option name` on line 1** | Same CRLF issue | `sed -i 's/\r$//' …` before `sudo bash` |
| **Patron FAB bottom-left, tiny** | Old build has `relative` on `fixed` button | Rebuild dashboard (post-update) or sed fix on `PatronAskFab.tsx` + `npm run build` |
| **`/ask` client crash** | Stale `.next` or missing PatronAskProvider wrap | Full post-update rebuild + restart |
| **Restart did nothing** | Used `curxor-os.target` instead of dashboard | `sudo systemctl restart curxor-dashboard.service` |
| **Every page redirects to `/ask`** | Patron saved as fullscreen | Open `/ask` → **Minimize**, or Settings → clear Patron state |
| **Deploy script not found** | Wrong directory on laptop | `cd C:\Users\ankur\curxor-os` first |
| **Script says complete but UI unchanged** | Sudo password not entered over SSH | See **Finish a stuck deploy** above |
| **`post-update.sh: No such file`** after rsync | Empty `/tmp/curxor-os` or missing tarball — **wiped `/opt/curxor`** | Restore from `/tmp/curxor-deploy.tar.gz` (laptop re-scp if missing); **verify payload before rsync** |
| **scp `.git` permission denied spam** | Old script copied whole repo | Use current `deploy-to-box.ps1` (tar, no `.git`) |

---

## Logs & probes (copy/paste on box)

```bash
# Service status
systemctl status curxor-dashboard.service --no-pager | head -12

# Last 40 log lines
journalctl -u curxor-dashboard -n 40 --no-pager

# API health
for p in /api/capital/status /api/patron/context /api/cafe/status /api/build/delegation; do
  curl -s -o /dev/null -w "$p: %{http_code}\n" "http://127.0.0.1:3080$p"
done

# Operator data (read-only)
sudo ls -la /etc/curxor/*.json | head -20

# Poison check
ls -la /opt/curxor/pillar-4-dashboard/.env.local 2>&1   # should NOT exist
```

---

## Hotfix one file (no full laptop deploy)

**Example — Patron FAB on box only:**

```bash
# After scp'ing single file to /tmp/ on box:
sudo cp /tmp/PatronAskFab.tsx /opt/curxor/pillar-4-dashboard/components/patron/
sudo chown curxor:curxor /opt/curxor/pillar-4-dashboard/components/patron/PatronAskFab.tsx
sudo bash -c 'cd /opt/curxor/pillar-4-dashboard && npm run build'
sudo systemctl restart curxor-dashboard.service
```

Copy the same change back to the laptop repo the same day.

---

## What survives deploy vs what doesn't

| Survives | Replaced |
|----------|----------|
| `/etc/curxor/*` (settings, queues, FRE) | `/opt/curxor/` code + `.next` build |
| Your claw data, capital-queue, work-queue | Old `.env.local` (removed on purpose) |

---

## Agent handoff (Cursor UAT)

Paste in an Agent chat:

```
Box: http://10.0.0.1:3080/home
SSH: curxor
Issue: [what you see]
Just deployed: [yes/no · branch or commit]
```

---

## Reset operator data (clean dogfood / after QA pollution)

Wipes **`/etc/curxor`** JSON state (queues, FRE, forged apps, XP, settings) but **keeps** `*.env` (API keys, inference config). Backs up to `/var/backups/curxor/` first.

**From laptop (scp + CRLF strip):**

```powershell
.\scripts\copy-script-to-box.ps1 scripts\reset-appliance-data.sh
```

**On box:**

```bash
ssh curxor
sed -i 's/\r$//' /tmp/reset-appliance-data.sh   # required if you scp'd by hand
sudo bash /tmp/reset-appliance-data.sh
# or after deploy: sudo bash /opt/curxor/scripts/reset-appliance-data.sh
```

Then open **`http://10.0.0.1:3080/setup`** and pick claws again. Capital/Creator/Work queues re-seed demo defaults on first visit.

---

## Related

- [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) — daily loop, SSH setup, operate vs build
- [09-operations-troubleshooting.md](../guides/09-operations-troubleshooting.md) — day-2 ops

---

*Last hardened: 2026-07-01 — deploy-to-box.ps1 CRLF here-string fix; script-dir-only find; onboarding ship on box.*
