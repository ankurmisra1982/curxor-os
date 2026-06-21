# Creator Claw — Release Notes

## Implemented (tier 1–3 product layer)

### Universal experience levels (all Claw apps)
- **Three tiers** — Beginner · Standard · Expert in Settings → Appearance
- **Progressive disclosure** — `ExperienceAppSection` + `ExperienceGate` + dismissible coach tips per section
- **Persistence** — `user-settings.json` `appearance.experienceLevel` + localStorage sync
- **Backward compatible** — legacy `uiMode` simple/expert maps to beginner/expert

### Creator Claw ops & intelligence (tier A/B features)
- **Pre-flight validation** — char limits, media, brand kit (banned words, hashtags, disclaimers, link allowlist), bridge readiness
- **Engage inbox intelligence** — priority scoring, VIP/keyword/spam rules, SLA breach, auto-triage on poll
- **Crisis mode** — pause all publishing/scheduling/replies/metrics rules · `/pause` `/resume` on Telegram & Slack
- **Weekly ops digest** — heartbeat → Telegram operator chats
- **Slack approval parity** — `/approve` `/reject` `/approvals` in authorized Slack channels
- **Platform layout preview** — thread/carousel/link-card hints in publish preview
- **Structured experiments** — hook/thumb A/B with auto-winner after view threshold (metrics pull)

### Telegram approve / reject
- **Commands** — `/approvals`, `/approve POST-001`, `/reject POST-001 [reason]`, `/approve reply <id>`, `/reject reply <id>`
- **Inline buttons** — approve/reject on pending notifications (callback queries)
- **Authorization** — only chats in `CURXOR_APPROVAL_TELEGRAM_CHAT_IDS`, FRE `approvalTelegramChatIds`, or `TELEGRAM_DEFAULT_CHAT_ID`
- **Notifications** — ping operators when posts/replies enter `PENDING_APPROVAL` / `pending_approval`
- **Audit** — actions recorded with actor `telegram:<chatId>`
- **FRE** — `notifyApprovalOnTelegram` · `approvalTelegramChatIds`

### Bridge health dashboard
- **Per-platform health** — ready · degraded · auth_expired · unconfigured · planned
- **Activity log** — last success/failure, error classification (auth, rate_limit, validation), consecutive failure streak
- **Token hints** — JWT exp decode for Meta/LinkedIn tokens when applicable
- **Fix hints** — missing env keys, CURXOR_CONTENT_PUBLIC_BASE, board IDs, etc.
- **Store** — `/etc/curxor/content-bridge-health.json` updated on every publish/reply receipt
- **API** — `bridge_health` · UI replaces Platform Vault with Bridge Health panel

### Best-time scheduling (learned from your metrics)
- **Schedule insights** — aggregates engagement by platform × day-of-week × hour from `content-analytics.json` + publish timestamps
- **Fallback** — industry defaults when sample count &lt; 2 (same as legacy calendar heuristics)
- **API** — `schedule_insights` · `schedule_suggest` · `schedule` with `useBestTime: true`
- **UI** — Best time panel on calendar + “Schedule at best time” for selected post; drag-drop uses learned hour
- **Fan-out / auto-schedule** — per-platform optimal slot + stagger when auto-schedule is on
- **FRE** — `useDataDrivenSchedule` toggle (default on) · respects `timezone` from FRE

### Metrics rules (auto-repurpose / auto-hook)
- **Rules engine** — fires after each scheduled metrics pull when `autoMetricsRules` FRE toggle or `CURXOR_METRICS_RULES_ENABLED` is on
- **Default rules** — repurpose posts with 500+ views; apply winning hook to next draft (per-rule enable + cooldown)
- **Store** — `/etc/curxor/content-metrics-rules.json` (rules + fire log)
- **API** — `metrics_rules_list` · `metrics_rules_run` · `metrics_rules_update`
- **UI** — Metrics rules panel under Analytics with per-rule toggles and recent auto-actions

### Approve-before-publish + audit trail
- **Approval gate** — `PENDING_APPROVAL` post stage + `pending_approval` reply status when FRE toggles or env flags are on
- **FRE toggles** — `requirePublishApproval` · `requireReplyApproval` in Creator Claw setup
- **Env overrides** — `CURXOR_REQUIRE_PUBLISH_APPROVAL` · `CURXOR_REQUIRE_REPLY_APPROVAL`
- **Audit log** — `/etc/curxor/content-audit.json` (submit/approve/reject/publish events)
- **API** — `approval_list` · `approve_post` · `reject_post` · `approve_reply` · `reject_reply` · `audit_list`
- **UI** — Publish approval panel with queue + audit trail; engage auto-publish respects reply gate

### Engage → reply → publish (closed loop)
- **Social comment/mention ingest** — poll X mentions + replies (OAuth1 + optional bearer search), LinkedIn comments, Threads replies; Meta webhook at `/api/engage/social/webhook`
- **Scheduled social poll** — heartbeat `social_engage_poll` every `CURXOR_SOCIAL_ENGAGE_POLL_INTERVAL_MINUTES` (default 15m)
- **Auto-anchor** — comments link to published queue posts via `platformPostId` for one-click reply
- **Engage inbox → LLM draft** — `engage_draft_reply` generates reply text locally
- **Engage → reply queue** — `engage_enqueue_reply` → `content.publish_reply` with auto-publish option
- **Anchor post resolution** — replies attach to published post (selected or platform hint)
- **UI** — EngageInboxPanel: Draft reply → Queue & publish; receipt toasts

### Analytics → recommendations
- **Recommendation engine** — `content-recommendations.ts` rule-based winners (hooks, platforms, repurpose, schedule, campaign)
- **API** — `analytics_recommendations` + Apply buttons in Analytics panel
- **Thumb A/B tracking** — `thumbnailVariantId` on metrics + `compareThumbnailPerformance`

### Campaign UX (one story, many channels)
- **Master draft editor** — shared story textarea + channel multiselect in Campaign panel
- **Campaign fan-out** — `campaign_fan_out` creates seed post + fans out to campaign channels with auto-schedule
- **Campaign detail** — expand card shows linked posts per platform/stage

### Video polish
- **Carousel slide AI images** — `generate_carousel_image` per slide
- **Caption style** — `burned` | `drawtext` | `srt-only` | `none` on post + ffmpeg render
- **Thumb A/B** — `generate_thumb_variants`, `select_thumb`, analytics comparison

### Product polish
- **Creation wizard** — 4-step modal (channel → draft → thumbnail → schedule)
- **Post inspector** — consolidated stage, hooks, carousel, metrics, replies, jobs
- **Notifications** — toast stack on publish/reply receipts and recommendation apply

### Best-in-class growth release (tier 4)
- **UTM + click attribution** — auto-tag outbound links · `/api/content/click` redirect · funnel by platform
- **Content library + evergreen** — save posts/assets · auto-recycle via heartbeat · clone to queue
- **Playbook studio** — template CRUD · apply to draft · new post from playbook
- **Brand studio** — style guide · voice/emoji/POV rules · pre-flight voice scoring
- **Performance prediction** — local heuristic score in pre-flight (hook, media, history)
- **First comment queue** — scheduled reply after publish receipt
- **X thread splitter** — split long draft into thread parts in publish payload
- **Instagram grid planner** — 3×3 visual preview with gap warnings
- **Full-funnel analytics** — platform rollup · top posts · manual metrics import (IG/TikTok/YT)
- **Team review** — draft comments · request changes · local review log

**API actions:** `analytics_funnel` · `metrics_import` · `clicks_list` · `library_list` · `library_save` · `library_create_post` · `evergreen_recycle` · `templates_list` · `templates_save` · `brand_kit_update` · `publish_meta` · `thread_split` · `ig_grid` · `team_comments` · `performance_predict`

### Releases 5–7 (pragmatic best-in-class)

**Release 5 — Close the loop**
- Live metrics pull for **YouTube · Instagram · TikTok** (plus X/LinkedIn)
- **Instagram comment poll** in social engage ingest
- **Publish recovery** panel — failed publish list · fix hints · retry · dismiss
- **LLM performance coach** — local inference tips in pre-flight (`performance_predict` + `subAction: coach`)

**Release 6 — Planner UX**
- **Content planner** — channel gap detection · fill week from evergreen/playbooks
- **Caption A/B experiments** — third experiment kind alongside hook/thumb
- **Hashtag intelligence** — banned/suggested tags · performance from history · pre-flight checks
- **Scheduled first comment** — datetime picker · alt-text generation · publish payload `alt_text`

**Release 7 (lite) — Cross-Claw**
- **Signal feed** — `/etc/curxor/signal-feed.json` · reactive draft + schedule from Signal Claw items

**Deferred (not needed for 90% day-one):** MCP server · multi-brand workspaces · blog atomization · X streaming webhook · Reddit/Discord reply bridges · mobile PWA · compliance archive · dedicated job worker unit

**Day-one release polish**
- **Go Live checklist** — FRE + bridge + public base + first post · Today strip (next schedule, approvals, recovery)
- **Publish failure alerts** — Telegram/Slack when bridge publish fails (same operator chats as approval)
- **Media attach** — upload image/video from disk → local assets + public URL
- **Demo seed** — `scripts/dev-qa/content-queue.json` · screenshot `08-creator-claw.png`
- **Operator guide** — [GETTING-STARTED.md](./GETTING-STARTED.md)

**New API actions:** `recovery_list` · `recovery_retry` · `recovery_clear` · `content_plan` · `hashtag_intel` · `alt_text` · `signal_feed` · `go_live` · `POST /api/content/upload`

### Previously shipped (tier 1 + 2)
- Metrics ingest, live + scheduled pull, reply bridges, campaigns entity, creation studio, calendar, webhooks, jobs worker, etc.

---

## Still deferred

| Item | Why deferred |
|------|----------------|
| X Account Activity streaming webhook | Polling + bearer search covers mentions/replies on appliance |
| Reply bridges for Reddit/Discord DMs | Platform-specific threading |
| Full MCP server registration | REST tools only |
| Dedicated job worker systemd unit | Heartbeat poll sufficient for appliance |
| Watermark at publish-time | Applied at render-time |

---

Previous tier-1 items (validation, preview, calendar, hooks, brand kit, repurpose) remain in place.
