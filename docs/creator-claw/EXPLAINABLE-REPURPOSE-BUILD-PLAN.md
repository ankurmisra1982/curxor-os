# Creator Claw — Explainable Repurpose (Release 8)

> **Status:** Roadmap only — **do not build until post-unbox + MS-S1 hardware install**  
> **Inspiration:** [Quip](https://quip.ink/) explainable clip layer (ranked moments + reasons), adapted for sovereign appliance  
> **Framework:** [GROWTH-LEVEL-FRAMEWORK.md](../curxor-os/GROWTH-LEVEL-FRAMEWORK.md) · [LEVELING-PLACEHOLDER.md](./LEVELING-PLACEHOLDER.md)

## North star

**Don’t spam clips. Post with intent.**

Long-form video (podcast, interview, stream, lecture) goes in. Creator Claw returns **3–5 ranked moments** — each with hook, confidence, moment type, and a one-line *why it works* — then feeds the **existing** queue → pre-flight → publish → engage → analytics loop.

CurXor moat vs cloud clippers: same explainability story, but **on-box**, governed, and wired to bridges — not a $15/mo export tool.

## Deploy gate

| Gate | Requirement |
|------|-------------|
| **Hardware** | MS-S1 MAX unboxed, ROCm/Ollama validated on appliance |
| **Compute** | Local transcribe + LLM path stable under real load (serialized queue OK) |
| **Baseline** | Creator leveling (L1–L5) + Go Live demo path green on hardware |
| **GTM** | Day-one demo pack captured on appliance — not dev-qa only |

Until then: **no implementation PRs** — this doc is the sprint kickoff source.

---

## What we adopt vs skip (Quip lens)

| Adopt | Skip |
|-------|------|
| Few clips, confidence-ranked | 30+ clip volume UX |
| Moment taxonomy + “why it works” | Cloud YouTube paste as primary ingest |
| Hook line per moment | Credit/subscription pricing UX |
| Post-with-intent operator flow | Standalone clip-SaaS positioning |

## Growth level fit

| Level | Label | Surface |
|-------|-------|---------|
| **L2** | Maker | Upload long video · see ranked moments (read-only preview) |
| **L3** | Publisher | Queue selected moments · schedule · publish |
| **L4** | Brand | Brand hook plate on export · multi-ratio fan-out from one moment |
| **L5** | Studio | Team review on moment picks · experiments on hook variants |

Gate in `creator-level-gates.ts`: panel `explainable-repurpose` at **L2+**; queue-from-moment at **L3+**.

---

## Operator flow (target UX)

```
Upload / attach long video (≤90 min)
  → Local transcribe (Whisper or existing pipeline)
  → Moment detect (3–5 candidates max)
  → For each: hook · confidence · type · reason
  → Operator picks 1–N → Creation Studio clip + caption
  → Pre-flight → schedule or publish (existing path)
```

**Demo target (exit criteria):** 20-min sample upload → 3 ranked clips with reasons → 1 scheduled post in **&lt;5 min** on appliance.

---

## Moment model

```ts
type MomentType = "hook" | "emotional_peak" | "complete_thought" | "strong_quote";

interface ExplainableMoment {
  id: string;
  startSec: number;
  endSec: number;
  hook: string;           // scroll-stopping opener for this cut
  confidence: number;     // 0–100, honest rank — not inflated
  momentType: MomentType;
  reason: string;           // one sentence: open loop, payoff, tension, etc.
  transcriptExcerpt: string;
}
```

Store run artifacts: `/etc/curxor/content-repurpose-runs.json` (or per-run files under `content-assets/`).

---

## Build slices (one sprint wave)

### Slice 1 — Backend (`lib/content-explainable-repurpose.ts`)

- `repurpose_analyze` — ingest `assetId` or upload path → transcript + moments[]
- `repurpose_clip` — cut segment via ffmpeg (frame-accurate in/out)
- `repurpose_to_queue` — moment → `ContentPost` draft(s) with metadata on post
- Reuse: `content-creation-service.ts` repurpose presets, `content-assets-store.ts` concat/cut

### Slice 2 — UI (`ContentExplainableRepurposePanel.tsx`)

- Tab: **Create** (L2+)
- Ranked cards: confidence badge, type chip, hook, reason, excerpt
- Actions: **Preview clip** · **Queue post** · **Queue + schedule best time**
- Empty state: link to sample asset in demo pack

### Slice 3 — Agent + pre-flight

- Skill: `analyze_long_video` (plan) · extend `repurpose_content` to accept moment id
- Pre-flight: show moment confidence + `performance_predict` together
- Metrics rules: optional trigger repurpose only when `confidence >= N`

### Slice 4 — Craft (P2 — same release or fast follow)

| Item | Scope |
|------|--------|
| Active-word caption style | Fourth `captionStyle`: `word-pop` on existing ffmpeg path |
| Brand hook plate | Brand studio overlay template on clip export |
| Multi-ratio from moment | One moment → 9:16 / 1:1 / 4:5 via existing fan-out |
| Active-speaker reframe | **Defer** until GPU/CPU profiled on MS-S1 — do not block R8 ship |

---

## API actions (add to `/api/content/status`)

| Action | Purpose |
|--------|---------|
| `repurpose_analyze` | Long asset → `{ moments[], transcriptPath }` |
| `repurpose_preview` | Moment id → short preview clip path |
| `repurpose_to_queue` | Moment id → post id(s) + optional auto-schedule |
| `repurpose_runs_list` | Recent analyze runs for operator audit |

---

## QA

- `scripts/creator-checklist.mjs` — analyze sample → queue → preflight
- `scripts/qa-creator-levels.mjs` — L2 sees panel, L1 does not
- Demo asset: `docs/demo-pack/sample-long-interview.mp4` (or bundled dev-qa clip)
- Smoke: `repurpose_analyze` returns ≥1 moment with `confidence` and `reason`

---

## Cross-Claw hooks (Release 8 lite)

- **Signal Claw** → item in `signal-feed.json` with video ref → `repurpose_analyze` (extends Release 7)
- **Work Claw** — out of scope for R8; note for L4 guest-clip outreach later

---

## References

- Existing: `repurpose_content`, `render_video`, `generate_hooks`, `performance_predict`, Creation Studio
- Competitive: Quip explainability UX — [quip.ink](https://quip.ink/)
- Release tracker: [RELEASE-NEXT.md](./RELEASE-NEXT.md) · Release 8
