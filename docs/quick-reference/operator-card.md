# CurXor OS — Operator Quick Reference

**MINISFORUM MS-S1 MAX · Ubuntu 24.04 · Sovereign Edge · No Cloud**

Print this card and keep it at the rack / bench. Full guides: `docs/README.md`

---

## Access

| What | Where |
|------|-------|
| Dashboard (direct) | `http://<appliance-ip>:3080` |
| Captive portal (eno1) | Any URL → `http://10.0.0.1` |
| FRE wizard | `/setup` (first boot only) |
| System Health (OTA logs) | Header → **System Health** |

---

## Network (do not swap)

| NIC | IP | Role |
|-----|-----|------|
| **eno1** | `10.0.0.1` | Users, DHCP, captive portal |
| **eno2** | `10.77.0.1` | Robotics ZMQ mesh only |

Mesh ports: vision **9100/9101** · motor **9200/9201**

---

## One-line health check

```bash
systemctl status curxor-os.target && curl -sf http://127.0.0.1:3080/api/setup/status
```

---

## Start / stop stack

```bash
sudo systemctl restart curxor-os.target    # all pillars
sudo systemctl stop curxor-os.target
journalctl -u curxor-engine -f             # agent logs
journalctl -u curxor-dashboard -f          # UI logs
```

---

## Key paths

| Path | Purpose |
|------|---------|
| `/opt/curxor/` | Application tree |
| `/etc/curxor/*.env` | Pillar config |
| `/var/log/curxor/ota-update.log` | OTA log |
| `/var/backups/curxor/` | OTA backups |

---

## First boot checklist

1. BIOS → UMA GPU memory **MAX** (~48 GB)
2. `sudo /opt/curxor/scripts/install-all.sh`
3. `sudo …/pillar-1-compute/scripts/deploy.sh --pull-models`
4. Optional: `sudo …/setup-captive-portal.sh`
5. Optional: `sudo …/install-ota-cron.sh`
6. Open dashboard → complete **FRE** at `/setup`

---

## OTA (manual)

```bash
sudo /opt/curxor/scripts/ota-updater.sh --dry-run
sudo tail -f /var/log/curxor/ota-update.log
```

Nightly check: **03:00** via `/etc/cron.d/curxor-ota`

---

## When things break

| Problem | Try |
|---------|-----|
| No mesh telemetry | `ip addr eno2` · `systemctl restart curxor-telemetry-broker` |
| No inference | `curl http://127.0.0.1:11434/api/tags` · restart `curxor-compute` |
| Dashboard blank SSE | Check `CURXOR_MESH_BROKER_IP=10.77.0.1` in dashboard.env |
| Stuck on /setup | Reset FRE → see Installation guide |
| OTA failed | `tail /var/log/curxor/ota-update.log` · restore from `/var/backups/curxor/` |

---

## Emergency rollback (OTA)

```bash
sudo systemctl stop curxor-os.target
sudo tar -xzf /var/backups/curxor/curxor-pre-ota-*.tar.gz -C /
sudo systemctl restart curxor-os.target
```

---

## Support data bundle

```bash
sudo journalctl -u curxor-engine -u curxor-dashboard -u curxor-telemetry-broker --since today > /tmp/curxor-journal.txt
sudo cp /var/log/curxor/ota-update.log /tmp/ 2>/dev/null
tar -czf curxor-support-$(hostname -s).tar.gz /tmp/curxor-journal.txt /tmp/ota-update.log
```

---

*CurXor OS · Flight Command Desktop · Pillars 1–4 · Offline First*
