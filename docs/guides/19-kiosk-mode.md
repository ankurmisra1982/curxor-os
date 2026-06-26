# Kiosk Mode — Flight Command on boot

Optional **monitor-first** operator path for the CurXor appliance. Internal / ops — **not storefront/GTM** until validated on hardware.

## What it does

After `install-kiosk-mode.sh` and reboot:

1. **tty1** autologs in as `curxor-display`
2. **X11** starts via `startx`
3. Script waits for `GET /api/setup/status` (up to 5 min)
4. **Chromium** opens fullscreen to `http://127.0.0.1:3080`
5. If Chromium exits, the session **retries** after a short pause (dashboard restart, OOM, etc.)

Laptop control via eno1 / LAN IP is unchanged.

## Install

**On appliance after golden path** (UAT smile + on-device smoke — not during first `install-all.sh` unless you use the `CURXOR_ENABLE_KIOSK` line below):

```bash
sudo /opt/curxor/scripts/install-kiosk-mode.sh
# or: sudo CURXOR_ENABLE_KIOSK=1 /opt/curxor/scripts/install-all.sh
sudo reboot
```

Smoke before reboot (optional):

```bash
sudo /opt/curxor/scripts/verify-kiosk-mode.sh
```

Kiosk is **not** enabled by default — only when you run `install-kiosk-mode.sh` or set `CURXOR_ENABLE_KIOSK=1` on meta-install.

## Verify (no reboot)

```bash
curl -sf http://127.0.0.1:3080/api/setup/status
systemctl is-active curxor-dashboard.service
cat /etc/curxor/kiosk-enabled
sudo /opt/curxor/scripts/verify-kiosk-mode.sh
```

**Linux VM / CI** — optional Xvfb session test (needs `xvfb` package):

```bash
sudo apt install -y xvfb
sudo /opt/curxor/scripts/verify-kiosk-mode.sh --session
```

On tty1 with a monitor after reboot: Flight Command should be fullscreen without opening a browser manually.

## Disable (expert)

```bash
sudo /opt/curxor/scripts/install-kiosk-mode.sh --uninstall
sudo reboot
```

Or switch to another virtual console: **Ctrl+Alt+F3** → log in as your admin user.

## Requirements

| Item | Notes |
|------|-------|
| `curxor-dashboard.service` | Must be running before kiosk opens (waits up to `CURXOR_KIOSK_WAIT_SEC`, default 300) |
| Monitor | HDMI / USB-C on MS-S1 |
| Keyboard | Required for FRE first time; optional after |
| Packages | `xorg`, `xinit`, `chromium` (deb or snap) — installed by script |

## Environment (optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `CURXOR_KIOSK_URL` | `http://127.0.0.1:3080` | Chromium start URL |
| `CURXOR_KIOSK_STATUS_URL` | `…/api/setup/status` | Health wait endpoint |
| `CURXOR_KIOSK_WAIT_SEC` | `300` | Max wait for dashboard |
| `CURXOR_KIOSK_RESTART_SEC` | `3` | Pause before relaunching Chromium |
| `CURXOR_CHROMIUM_BIN` | auto-detect | Override browser path (`/etc/curxor/kiosk-chromium.env`) |

## Headless appliances

Kiosk only affects **tty1**. If no monitor is attached, the graphical session may fail harmlessly on tty1; systemd services and laptop access over the network are unaffected.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Black screen on tty1 | `journalctl -u getty@tty1` · `cat /home/curxor-display/.xinitrc` |
| Browser never opens | `systemctl status curxor-dashboard` · `curl http://127.0.0.1:3080/api/setup/status` |
| Chromium snap + X errors | `cat /etc/curxor/kiosk-chromium.env` · try `apt install chromium` deb |
| Wrong URL | `CURXOR_KIOSK_URL` or edit `kiosk-launch.sh` |
| Stuck in login loop | Run `--uninstall` from SSH on another tty |
| OAuth / frontier link | Verify manually in kiosk — popups may need same-tab flow (v1.5 Settings toggle out of scope) |

## Related

- [KIOSK-MODE-BUILD-PLAN.md](../curxor-os/KIOSK-MODE-BUILD-PLAN.md) — sprint scope
- [07-flight-command-dashboard.md](./07-flight-command-dashboard.md) — UI guide
- [10-ms-s1-max-hardware-bios.md](./10-ms-s1-max-hardware-bios.md) — BIOS + display
