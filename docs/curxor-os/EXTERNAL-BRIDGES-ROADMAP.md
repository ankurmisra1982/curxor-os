# External Bridges — Firecrawl & Grok Ecosystem (ideas capture)

> **Room:** Vision & Strategy · capture only · **no build** until gated  
> **Roadmap:** Program **FC** (Firecrawl) · Program **GK** (Grok ecosystem) in [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)  
> **Last updated:** June 2026 · **Status:** scoped

---

## Executive verdict

| Integration | Leverage? | Where it fits | GTM |
|-------------|-----------|---------------|-----|
| **[Firecrawl](https://www.firecrawl.dev/)** | **Yes — high** | Operate plane · eno2 digital bridge · optional Build Plane MCP | **BYOK** optional · not bundled in $3,999 |
| **Grok Build Plugin Marketplace** | **Pattern yes · product partial** | Frontier inference BYOK · Forge skill-pack catalog design · **not** Build Plane replacement | **No** Grok Build as primary builder · learn SHA-pinning |

**Brutal honesty:** Firecrawl solves real Claw jobs (lead enrichment, margin scrape, research for fintwit). Grok's marketplace is a **distribution format** lesson — CurXor's Build Plane stays **Cursor Bridge**; Grok is optional frontier chat + long-term skill-pack inspiration.

---

## Sovereignty rules (both integrations)

1. **Local LLM remains default** — web tools augment, never replace Ollama for operator chat.
2. **eno2 gates all outbound** — Firecrawl calls only through `digital_bridges.py` on Egress Port; unplug eno2 = scrape stops.
3. **BYOK only** — user supplies `FIRECRAWL_API_KEY` / `XAI_API_KEY`; never subsidized in appliance price.
4. **No silent cloud** — every scrape/search intent shows receipt in Digital Action Layer UI.
5. **Build Plane ≠ Grok Build** — terminal plugin marketplaces are builder overlays; Operate Claws don't require them.

---

## Program FC — Firecrawl Web Context Bridge

### What Firecrawl is

[Firecrawl](https://www.firecrawl.dev/) is a **context API for the live web**: search, scrape, interact (browser actions), crawl. Returns LLM-ready markdown/JSON. Official **MCP server** + CLI (`npx firecrawl-cli`). **Open source** ([firecrawl/firecrawl](https://github.com/firecrawl/firecrawl), 130K+ stars) with hosted API option.

| Capability | CurXor use |
|------------|------------|
| **/search** | Capital intel · Work prospect research · Creator trend scouting |
| **/scrape** | Arbitrage margin rows · competitor pricing · fintwit source material |
| **/interact** | Login-gated supplier portals · paginated catalogs (Arbitrage L3+) |
| **/crawl** | Site maps for onboarding · Forge niche research |
| **MCP** | Build Plane / Cursor connects as outbound MCP (Settings pattern exists) |

### Architecture (fits existing digital layer)

```text
Claw agent (Work / Capital / Arbitrage / Creator)
    → engine tool: web.search | web.scrape | web.interact
    → ZMQ digital_out (:9200)
    → FirecrawlBridgeWorker (eno2 only)
    → Firecrawl API (hosted BYOK) OR self-hosted Firecrawl OSS
    → receipt → digital_in → CCP publish + Cafe event
```

Parallel path for **Build Plane** (eno1 / builder):

```text
Cursor / Grok terminal → outbound MCP client (existing)
    → https://api.firecrawl.dev OR local Firecrawl MCP
    → read-only research while extending curxor-os
```

### Claw mapping (Operate plane)

| Claw | Firecrawl job | Handshake synergy (Program HS) |
|------|---------------|--------------------------------|
| **Work** | Lead enrichment — scrape company site from email domain | Work→Cre: research → brand posts |
| **Capital** | Market/news scrape for rule context · social alpha sources | Cap→Cre: fintwit material from intel |
| **Creator** | Trend URL → draft seed · competitor content structure | Cre→Work: inbound from researched ICP |
| **Arbitrage** | **AB6** live price scrape via eno2 (planned) | Arb→Cre: product spotlight from margin wins |
| **Forge** | Niche research before mint | Forge→parent handshake |
| **Signal / Swarm** | Defer — hardware/mesh first | — |

### Deployment options

| Mode | Sovereignty | Operator cost |
|------|-------------|---------------|
| **Hosted API (BYOK)** | Keys in `/etc/curxor/digital.env` · egress auditable | Free tier 1K credits/mo · paid tiers |
| **Self-hosted OSS** | Full on-appliance or homelab · no per-page rent | Infra + ops burden on operator |
| **Hybrid** | Hosted for interact/search · local scrape for known URLs | Power-user choice in Settings |

**Recommendation:** Ship **hosted BYOK bridge first** (FC1–FC3); document **self-hosted OSS** as FC5 for sovereignty maximalists.

### Rollout priority (which use case first)

| Priority | Use case | Why first | Wave |
|----------|----------|-----------|------|
| **1** | **FC-UC-01** Work Clay-style enrichment | `enrich_lead` already shipped (Hunter/Apollo/demo) — Firecrawl adds **website context** sovereign path; flagship GTM | FC2 |
| **2** | **FC-UC-02** Capital intel digest | Feeds HS `fintwit_influencer` · rule context | FC2–FC4 |
| **3** | **FC-UC-03** Creator trend seed | Low credit · high handshake value | FC3 |
| **4** | **FC-UC-04** Arbitrage margin scrape | **AB6** · heavier interact later | FC4–FC6 |
| **5** | FC-UC-05 Forge niche crawl | Power-user · Forge mint flow | FC4 |

**Not Arbitrage-only** — margin scrape is credit-heavy and Tier C frozen until G4. **Work enrichment wins** because: (a) skill exists today, (b) flagship desk, (c) Clay narrative without Clay subscription, (d) 1–2 credits per lead vs crawl-heavy commerce.

---

## Firecrawl use case catalog

### Clay parity (Work Claw — honest)

| Clay capability | CurXor + Firecrawl | Also need |
|-----------------|-------------------|-----------|
| Company from email domain | **FC-UC-01** scrape `https://{domain}` + `/about` | — |
| Title / role | Hunter or Apollo (already in `work-lead-enrichment.ts`) | BYOK keys |
| LinkedIn URL | Apollo path today | — |
| Recent news / hooks for email | **FC-UC-01** `/search` company name + scrape top result | 2–4 credits/lead |
| Tech stack / hiring signals | Scrape careers or about · LLM extract locally | Ollama |
| Waterfall enrichment | **Order:** Hunter → Apollo → **Firecrawl site** → demo | FC2 wires this |
| Bulk table (1000 rows) | Defer — batch crawl FC parking lot | G4 |
| Always-on refresh | Scheduler job · weekly re-scrape open leads | G3 |

**GTM line:** *"Clay-style enrichment on your metal — optional Hunter/Apollo keys or Firecrawl BYOK for site context. No Clay subscription."*

---

### FC-UC-01 · Work — Clay-style lead enrichment (P0)

**Skill:** `enrich_lead` (L2+) · existing UI in pipeline panel  
**Extends:** `lib/work-lead-enrichment.ts` — add `enrichViaFirecrawl(domain)` after Hunter/Apollo miss or in parallel when `FIRECRAWL_API_KEY` set

**Flow:**

```text
Operator selects lead → Enrich Lead
    → extract domain from email
    → Hunter (if key) → Apollo (if key)
    → Firecrawl /scrape https://company.com + /about (if key)
    → local LLM extracts: summary, hooks, recent headline (from markdown)
    → upsert lead.notes + tags: ["firecrawl-enriched"]
    → CCP publish work.enrichment.{leadId}
    → optional HS: Work→Creator if L3+ and hooks look "brandable"
```

| Step | Firecrawl API | Credits (approx) |
|------|---------------|------------------|
| Homepage | `/scrape` | 1 |
| About page | `/scrape` (if linked) | 1 |
| News hook | `/search` "{company} news" · scrape #1 | 2–3 |

**Output fields on lead:**

| Field | Source |
|-------|--------|
| `company` | Hunter/Apollo or domain heuristic |
| `title` | Hunter/Apollo |
| `notes` | `--- Firecrawl ---\n{summary}\nHook: {line}` |
| `tags` | `firecrawl` · `enriched` |

**Agent copy:** *"I scraped their site via eno2 — here's a personalization hook for step 1."*

**Cafe:** Work sprite → mailbox · small XP · no handshake until HS Discover fires.

**Done when (FC2):** `enrich_lead` returns `source: "firecrawl"` on appliance with key; receipt visible in Digital panel.

---

### FC-UC-02 · Capital — intel digest for rules & fintwit (P1)

**Trigger:** Weekly scheduler or manual "Refresh intel" · L2+ Capital  
**Feeds:** HS `fintwit_influencer` · `finance.intel.*` CCP keys

**Flow:**

```text
Watchlist tickers + user topics (crypto, macro)
    → Firecrawl /search per topic (batched, rate-limited)
    → scrape top 3 URLs → markdown
    → local LLM → finance.intel.digest blob
    → Capital desk Intel panel + optional rule suggestion (human confirm)
    → HS Discover: Cap→Cre "turn this digest into a thread"
```

| Mode | API | Credits/day budget (suggested default) |
|------|-----|----------------------------------------|
| Light | 5 searches × 3 scrapes | ~20 |
| Heavy | User toggle L4+ | 50 cap in Settings |

**Anti-pattern:** Never auto-fire trades from scraped text.

---

### FC-UC-03 · Creator — trend URL → draft seed (P1)

**Trigger:** Paste URL in content queue · or agent "research this topic"  
**API:** `/scrape` single URL → `content.draft.seed` in CCP

**Flow:**

```text
URL in queue → Firecrawl scrape → markdown
    → Creator draft panel pre-fill (outline, not publish)
    → HS Cre→Work if CTA detected ("book a demo")
```

**Credits:** 1 per seed — cheap · good for demos.

**Handshake:** Cre→Work when scrape finds lead-magnet / contact page.

---

### FC-UC-04 · Arbitrage — margin & competitor scrape (P2 · AB6)

**Trigger:** SKU watchlist · margin tab refresh  
**API:** `/scrape` competitor product URL · `/interact` for paginated catalogs (FC6)

**Flow:**

```text
SKU row has competitor URL
    → scrape price + title + availability
    → update margin desk row (preview until G4 go-live)
    → HS Arb→Cre on margin win streak
```

| Sub-mode | API | Gate |
|----------|-----|------|
| Public price | `/scrape` | FC4 |
| Login catalog | `/interact` | FC6 · confirm modal |

**Why second tier:** Tier C frozen · interact burns credits · robots/ToS sensitivity — document operator responsibility.

---

### FC-UC-05 · Forge — niche crawl before mint (P2)

**Trigger:** Forge assist detects vertical intent ("dental outreach claw")  
**API:** `/search` + `/crawl` depth 2 on niche · cap 10 pages

**Flow:**

```text
Forge chat intent → Firecrawl crawl niche sites
    → summarized context in suggestedIntent
    → operator taps Forge → mint_handshake in Cafe
```

**Credits:** Cap 10 pages/mint in Settings default.

---

### FC-UC-06 · Work — ICP list building (P3 · G4)

**Clay-adjacent batch:** CSV of domains → crawl `/about` + `/team` → local table  
**Defer** until FC-UC-01 proven — batch = credit firehose.

---

### Credit budget defaults (Settings proposal)

| Profile | Daily cap | Claws |
|---------|-----------|-------|
| **Starter** | 25 credits | Work UC-01 only |
| **Growth** | 100 credits | Work + Creator + Capital light |
| **Operator** | 300 credits | + Arbitrage scrape |

Show running tally in Settings → Web Context · warn at 80%.

---

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **FC1** | `FIRECRAWL_API_KEY` in `digital.env` · `FirecrawlScrapeWorker` · receipt SSE | G2 | Single URL scrape → markdown in Digital Receipt panel |
| **FC2** | Engine tools `web.scrape` + `web.search` · wire **FC-UC-01** into `enrich_lead` | G2 | Work `enrich_lead` returns `source: firecrawl` with receipt |
| **FC3** | Settings: Firecrawl outbound MCP (Build Plane) · **FC-UC-03** Creator seed | G2 | MCP probe green · Creator URL scrape |
| **FC4** | **FC-UC-02** Capital intel panel + **FC-UC-04** Arbitrage AB6 scaffold | G3 | Margin row `source: firecrawl` |
| **FC5** | Self-hosted OSS install guide · optional `FIRECRAWL_BASE_URL` | G4 | `docs/guides/` addendum for air-gapped scrape |
| **FC6** | `/interact` for login flows — confirm gate + audit log | G4 | Arbitrage L3+ only · explicit operator OK |

### Anti-patterns

- Don't scrape without showing URL + receipt in UI.
- Don't bundle Firecrawl credits in $3,999.
- Don't route Firecrawl on eno1 Command Port by default — **eno2 only** for Operate.
- Don't use interact mode for Capital trade execution pages without human confirm.

---

## Program GK — Grok Ecosystem (frontier + marketplace patterns)

### What Grok Build Plugin Marketplace is

Launched **June 11, 2026** — built-in catalog for **Grok Build** terminal coding agent ([xAI announcement](https://x.ai/news/grok-plugin-marketplace)). Open index: [xai-org/plugin-marketplace](https://github.com/xai-org/plugin-marketplace).

| Property | Detail |
|----------|--------|
| **Plugin bundle** | Skills · slash commands · agents · hooks · **MCP servers** · LSPs |
| **Install** | `grok plugin install <name> --trust` or `/marketplace` in TUI |
| **Security** | Remote plugins **SHA-pinned** · re-verified at clone |
| **Compatibility** | Claude Code plugin format (`.grok-plugin` ≈ `.claude-plugin`) |
| **Launch partners** | MongoDB · Vercel · Sentry · **Chrome DevTools** · Cloudflare · Superpowers |
| **Access** | SuperGrok (~$300/mo) or X Premium Plus — **not free** |

### What we leverage (and what we don't)

| Leverage | Verdict |
|----------|---------|
| **Grok as Build Plane** | **No** — conflicts with Cursor Bridge strategy ([BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md)) |
| **Grok frontier inference (BYOK)** | **Yes** — optional Settings provider for Capital/Creator assist when user has xAI key |
| **Marketplace SHA-pin pattern** | **Yes** — adopt for future **Forge Skill Pack** catalog |
| **Chrome DevTools plugin** | **Inspiration** — validates Build Plane browser/computer-use direction (BP5+) |
| **Publish CurXor skill pack upstream** | **Maybe G4** — dev-community play; not GTM |
| **Superpowers plugin** | **Study only** — agent workflow patterns for Master AI delegation |

### GK waves

| Wave | Scope | Gate | Done when |
|------|-------|------|-----------|
| **GK1** | Add `xai` / Grok to `frontier-providers.ts` · API key in Settings | G2 | Optional frontier chat on one flagship claw |
| **GK2** | Docs: Grok vs Cursor vs Build Plane decision tree | G2 | Operator card + Settings copy — no confusion |
| **GK3** | **Forge Skill Pack** catalog spec — SHA-pinned remote packs (marketplace.json pattern) | G3 | Vision doc + schema; no store UI yet |
| **GK4** | Evaluate Chrome DevTools MCP for Build Plane remote worker | G3 | Parity note in BP5 scope |
| **GK5** | Optional: submit `curxor-os` maintainer skill pack to xAI/Claude marketplaces | G4 | Community dev onboarding — not customer GTM |
| **GK6** | Grok **inference** hook in Capital social-alpha research (not Grok Build CLI) | G4 | BYOK only · eno2 egress |

### What we explicitly do not ship

- Grok Build as bundled builder on appliance
- Mandatory X Premium / SuperGrok for CurXor to function
- Third-party marketplace plugins without SHA pin + operator `--trust` equivalent
- xAI partnership claims in storefront until legal/pricing clear

---

## Cross-program synergies

```text
Firecrawl (FC2) scrapes fintwit sources
    → Capital publishes finance.intel.* to CCP
    → Program HS Cap→Cre Discover suggests Creator
    → Creator drafts thread · Cafe handshake (HS-H3)

Grok frontier (GK1) optional summarize
    → local Ollama still default · Grok only if BYOK + enabled

Forge Skill Pack (GK3) distributes vertical Claw templates
    → mint → HS mint_handshake → Cafe
```

---

## Parking lot

| Idea | Program | Notes |
|------|---------|-------|
| Firecrawl Agent (autonomous gather) | FC | Preview pricing · high credit burn · G4+ |
| FC-UC-06 batch ICP crawl | FC | After UC-01 stable · G4 |
| Firecrawl Research Index for AI/ML papers | FC | Capital research desk niche |
| Grok computer-use vs Cursor computer-use bake-off | GK · BP5 | Build chat only |
| Combined "web context" Settings panel | FC · GK | Firecrawl + frontier providers unified UX |
| Competitor: Apify / Browserbase bridges | FC | Evaluate only if Firecrawl gaps |

---

## References

- Firecrawl: https://www.firecrawl.dev/ · MCP docs · OSS https://github.com/firecrawl/firecrawl
- Grok marketplace: https://x.ai/news/grok-plugin-marketplace · https://github.com/xai-org/plugin-marketplace
- CurXor digital layer: [12-digital-action-layer.md](../guides/12-digital-action-layer.md)
- Build Plane: [BUILD-PLANE-CURSOR.md](./BUILD-PLANE-CURSOR.md)
- Inter-Claw paths: [INTER-CLAW-HANDSHAKES.md](./INTER-CLAW-HANDSHAKES.md)
- Work enrichment today: `pillar-4-dashboard/lib/work-lead-enrichment.ts` · `enrich_lead` skill
- Outreach Clay parity notes: [BEST-IN-CLASS.md](../outreach-claw/BEST-IN-CLASS.md)
