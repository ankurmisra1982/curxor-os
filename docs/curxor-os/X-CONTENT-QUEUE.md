# @curxorai — X content queue & Go Live (X-only)

> **Audience:** Ankur only · internal · **not** storefront  
> **Account:** [@curxorai](https://x.com/curxorai)  
> **Agent:** **Founder Public Voice** — `.cursor/skills/founder-public-voice/` · say `daily X post` in that chat  
> **Status:** Bootstrapping — manual post from phone/web until Creator Claw live on MS-S1  
> **Related:** [FOUNDER-COCKPIT.md](./FOUNDER-COCKPIT.md) · [essay-playbook.md](../founder/essay-playbook.md) · Creator [STARTUP-GUIDE.md](../creator-claw/STARTUP-GUIDE.md)

---

## How to use

1. I draft here · you **copy → post** on X (no Premium or API required for manual).
2. When live: change `**Status:`** to `posted` and fill `**Posted:**` with date (and optional tweet URL).
3. After hardware G1: run **Go Live checklist** below · shift drafts to Creator Claw queue.

**Status:** `ready` · `posted` · `hold` · `creator` (publish from box)

**Example (item posted):**

```markdown
**Status:** `posted`
**Posted:** 2026-06-24 · https://x.com/curxorai/status/…
```

---

## Queue

### 1. Ben Cera reply — **posted**

**Reply to:** [Ben’s “Yep”](https://x.com/Bencera/status/2069910088199147771) on your OSS / CurXor thread  
**Status:** `posted`  
**Posted:** 2026-06-24 *(add tweet URL here if you want the permalink)*

```
Appreciate the Yep. Same macro — different layer: OSS on bare metal you own, not GPU rent forever. We’re shipping that desk ($3,999 once · local Claws · $0/mo inference). Pre-hardware on MS-S1; happy to compare notes when we have honest token/$ on box. No Polsia integration pitch — just building the metal side of the same escape.
```

**Notes:** No storefront link (you already attached card). No “100x” claim. Public reply > DM while bootstrapping.

posted

---

### 2. Post-hardware — golden path smoke — **hold**

**Trigger:** G1 `qa-smoke` pass on MS-S1 · real screenshot of Flight Command on box IP  
**Status:** `hold`  
**Posted:**

```
Unboxed the MS-S1. Flight Command on the desk — local inference, no API meter running.

Ten Claws on metal you own. Golden path in progress.

[attach: browser screenshot http://BOX_IP:3080/home — real hardware only; SSH: ssh curxor]
```

---

### 3. Post-hardware — inference economics — **hold**

**Trigger:** G1+ · one honest local vs frontier note from box (even informal: “heartbeat on Ollama, $0 that hour”)  
**Status:** `hold`  
**Posted:**

```
Everyone’s talking about escaping $1M/mo API bills.

Our answer isn’t another cloud subscription — it’s the box on your desk: local Claws, optional frontier BYOK, operate plane without rent.

We’ll publish real token/$ from MS-S1 when golden path is green. No hand-waving.
```

**Pairs:** IDEA-G09 (GTM-ECON-02)

---

### 4. Post-hardware — first Creator publish — **creator**

**Trigger:** Go Live checklist below complete · first **approved** post from Creator Claw  
**Status:** `hold`  
**Posted:**

```
First post from Creator Claw on the appliance — drafted local, approved, published via our X bridge on eno2.

Sovereign social ops: your keys, your metal, your confirm gate.

[body drafted in Creator · or same thesis in your voice]
```

---

## @curxorai — Creator Claw Go Live (X-only)

Minimum path to post and reply as `@curxorai` from the box — not full 10-platform setup.

### Prerequisites


| #   | Item                                              | Done |
| --- | ------------------------------------------------- | ---- |
| 1   | MS-S1 golden path · `curxor-dashboard` on `:3080` | ☐    |
| 2   | X Developer project · app with **Read + Write**   | ☐    |
| 3   | OAuth 1.0a user tokens for `@curxorai`            | ☐    |


### 1. X Developer (on laptop — one time)

1. [developer.x.com](https://developer.x.com) → create project + app.
2. Enable **OAuth 1.0a** · Read and write permissions.
3. Generate **API Key**, **API Secret**, **Access Token**, **Access Token Secret** for `@curxorai`.
4. Note: X API tiers/pricing change — confirm what your account needs for posting; budget when you upgrade next week if required.

### 2. Keys on appliance

On MS-S1, edit `/etc/curxor/digital.env` (see `config/digital/digital.env.example`):

```bash
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
```

```bash
sudo chmod 640 /etc/curxor/digital.env
sudo chown root:curxor /etc/curxor/digital.env
sudo systemctl restart curxor-telemetry-broker curxor-dashboard
```

### 3. Creator FRE (X only)

1. Open `http://BOX_IP:3080/my-content`
2. Complete FRE if prompted:
  - **Channels:** `x` only (uncheck others for now)
  - **Require approval before publish:** **ON** (keep until you trust pipeline)
  - **Require approval before replies:** **ON** for first week
3. **Go Live** → **Channels configured** = complete

### 4. Verify bridge

1. Creator → **Bridge Health** (or Go Live panel)
2. **X** should show **Ready to publish** (not unconfigured)
3. Optional test: draft short post → **Preflight** → **Queue** → **Approve** → **Publish**
4. Confirm tweet on [@curxorai](https://x.com/curxorai) · check audit in Creator

### 5. Engage / replies (Ben-style threads)

1. **Engage** tab in Creator (merged inbox — not Cafe)
2. Inbound mentions/DMs depend on X API access for your tier; if limited, keep **manual reply on phone** for speed
3. When engage items appear: **Engage Reply** skill → draft local → approve → **Publish Reply**

### 6. Optional nudges (when you want phone approve)

Telegram or Slack approval wiring — see [STARTUP-GUIDE.md](../creator-claw/STARTUP-GUIDE.md). Skip until X-only path works.

### Done when

- [ ] One post published from Creator with receipt (not `demo://local`)
- [ ] Go Live shows **ready** for X channel
- [ ] You’re comfortable moving queue item #4 to `creator` status

---

## What stays manual (for now)


| Action                           | Until                                          |
| -------------------------------- | ---------------------------------------------- |
| Copy/paste drafts from this doc  | Creator Go Live green                          |
| Ben follow-up DM                 | You choose · not required                      |
| X Premium on `@curxorai`         | Your call next week · not required for replies |
| Cursor chat posting as @curxorai | **Never** — no API hookup in IDE               |


---

## Parking

*Add new drafts below with status `ready` / `hold`.*


| Date     | Hook                  | Status  | Notes                          |
| -------- | --------------------- | ------- | ------------------------------ |
| Jun 2026 | Ben reply             | posted  | §1 above                       |
| Jun 2026 | HW smoke screenshot   | hold    | G1                             |
| Jun 2026 | API rent narrative    | hold    | GTM-ECON-02                    |
| Jun 2026 | First Creator publish | hold    | Go Live                        |
| 2026-06-27 | Grammar gap / shallow usage | ready | Founder Public Voice v0.2 · @ankurmisra thread + @curxorai pair |


