# CurXor OS — Kiosk Mode (Flight Command on boot)

> **Status:** v1 in repo · **not GTM** until hardware-validated reboot smoke  
> **Owner:** Ankur (product) · CTO agent (architecture)  
> **Trigger:** After first on-device UAT smile · before demo captures / unbox video  
> **Internal only** — do not surface on storefront until shipped and verified

---

## Goal

Power on + monitor → **Flight Command fullscreen** at `http://127.0.0.1:3080` — no Ubuntu desktop tour, no manual `:3080` URL.

Laptop-on-eno1 remains supported; kiosk is the **monitor-on-box** product finish.

---

## v1 scope

| In | Out |
|----|-----|
| Optional `install-kiosk-mode.sh` (not default in `install-all.sh`) | Custom Linux distro |
| `curxor-display` user + tty1 autologin + `startx` | Electron shell |
| Chromium kiosk after dashboard health check | Hide SSH / expert paths |
| Screen blanking disabled (`xset` in `kiosk-launch.sh`) | HDMI hotplug polish |
| `CURXOR_ENABLE_KIOSK=1` hook in meta-installer | Auto-enable on every install |

**Expert escape:** `Ctrl+Alt+F3` → login → `sudo systemctl stop getty@tty1` or disable kiosk drop-in.

---

## Repo artifacts (v1)

| Path | Role |
|------|------|
| `scripts/install-kiosk-mode.sh` | Install / `--uninstall` autologin + packages |
| `scripts/kiosk-launch.sh` | Wait for `/api/setup/status`, launch Chromium kiosk |
| `scripts/verify-kiosk-mode.sh` | Post-install smoke; `--session` for Xvfb VM test |
| `config/kiosk/xinitrc` | Installed → `~curxor-display/.xinitrc` (retry loop) |
| `config/kiosk/bash_profile` | Installed → `~curxor-display/.bash_profile` (`startx` on tty1) |
| `config/kiosk/getty-autologin.conf` | systemd drop-in → `getty@tty1.service.d/curxor-kiosk.conf` |
| `/etc/curxor/kiosk-enabled` | Flag written on install |
| `/etc/curxor/kiosk-chromium.env` | Resolved `CURXOR_CHROMIUM_BIN` (deb vs snap) |

`install-all.sh` chmods kiosk scripts and runs `install-kiosk-mode.sh` only when `CURXOR_ENABLE_KIOSK=1`.

---

## Done when

```bash
# On appliance after golden path:
sudo /opt/curxor/scripts/install-kiosk-mode.sh
# or: sudo CURXOR_ENABLE_KIOSK=1 /opt/curxor/scripts/install-all.sh
sudo /opt/curxor/scripts/verify-kiosk-mode.sh          # optional before reboot
# VM only: sudo apt install -y xvfb && sudo .../verify-kiosk-mode.sh --session
sudo reboot
# → tty1 autologs in → Chromium fullscreen → FRE or Home
curl -sf http://127.0.0.1:3080/api/setup/status
```

Disable: `sudo /opt/curxor/scripts/install-kiosk-mode.sh --uninstall` then reboot.

- [x] `install-kiosk-mode.sh` + `kiosk-launch.sh` + `config/kiosk/*`
- [x] `verify-kiosk-mode.sh` post-install smoke (+ `--session` Xvfb on VM)
- [x] Dashboard crash → kiosk retries (xinitrc wrapper loop)
- [ ] Reboot lands on Flight Command without typing a URL *(appliance sign-off)*
- [ ] OAuth frontier link flow usable in kiosk (popup or same-tab — verify manually)
- [ ] Headless appliance (no monitor): stack still runs; no blocking hang on tty1 *(appliance sign-off)*
- [x] `docs/guides/19-kiosk-mode.md` operator section

---

## Build chat handoff

```
Sprint: Kiosk mode v1
Goal: Optional monitor-first boot → Flight Command fullscreen
Done when: install-kiosk-mode.sh + reboot smoke on appliance (or VM with X)
@ docs/curxor-os/KIOSK-MODE-BUILD-PLAN.md
@ scripts/install-kiosk-mode.sh
@ scripts/kiosk-launch.sh
@ scripts/verify-kiosk-mode.sh
@ config/kiosk/xinitrc
@ config/kiosk/bash_profile
@ config/kiosk/getty-autologin.conf
@ docs/guides/19-kiosk-mode.md
Out of scope: storefront copy, Settings UI toggle, Wayland/GDM, pillar rewrites, `--uninstall` UX in Settings
```

---

## Sequencing

```text
Hardware UAT smile  →  enable kiosk on golden path  →  demo captures
                      →  optional Settings toggle (v1.5)
```

**Priority:** Below flagship exit-demo on metal · Above Cafe C11+ breadth.

---

## References

- [Kiosk operator guide](../guides/19-kiosk-mode.md)
- [UNBOX-PRINTABLE-GUIDE.md](./UNBOX-PRINTABLE-GUIDE.md) — monitor + keyboard path
- [Flight Command](../guides/07-flight-command-dashboard.md)
