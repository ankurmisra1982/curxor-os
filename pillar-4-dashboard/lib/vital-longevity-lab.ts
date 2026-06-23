import "server-only";

import { generateText, isLocalInferenceAvailable } from "./local-inference";
import { VITAL_LONGEVITY_DISCLAIMER, longevityPreviewReply } from "./vital-longevity-knowledge";
import { allLiteratureForLens, literatureCorpusSize, searchLongevityLiterature } from "./vital-longevity-rag";
import {
  availableExpertLenses,
  buildProtocolDiffReport,
  expertLensLabel,
} from "./vital-protocol-lenses";
import type {
  VitalExpertLensId,
  VitalLabAskResult,
  VitalLabStatus,
  VitalLiteratureHit,
  VitalProtocolDiffReport,
} from "./vital-lab-types";
import type { VitalHealthState, VitalReading } from "./vital-health-types";

function cfgStr(config: Record<string, unknown>, key: string, fallback: string): string {
  const v = config[key];
  return typeof v === "string" ? v : fallback;
}

function resolveExpertLens(raw: unknown): VitalExpertLensId {
  const v = typeof raw === "string" ? raw : "balanced";
  if (v === "sinclair" || v === "johnson" || v === "attia" || v === "huberman" || v === "patrick" || v === "balanced") {
    return v;
  }
  return "balanced";
}

function focusLabel(focus: string): string {
  if (focus === "cardio") return "cardiovascular";
  if (focus === "cognitive") return "cognitive longevity";
  if (focus === "athletic") return "athletic performance";
  return "metabolic health";
}

function formatVitals(vitals: VitalReading[]): string {
  if (vitals.length === 0) return "No vitals synced yet.";
  return vitals
    .map((v) => `${v.metric.replace(/_/g, " ")}: ${v.value} ${v.unit} (${v.source})`)
    .join("; ");
}

function formatReports(state: VitalHealthState): string {
  if (state.reports.length === 0) return "No lab reports in vault.";
  return state.reports
    .slice(0, 4)
    .map((r) => `${r.title} (${r.provider}): ${r.summary}`)
    .join(" | ");
}

function formatProtocol(protocol: VitalHealthState["protocol"]): string {
  if (protocol.length === 0) return "No active protocol steps.";
  return protocol.map((s) => `${s.category}: ${s.title} (${s.frequency})`).join("; ");
}

function buildStructuredAnswer(
  query: string,
  state: VitalHealthState,
  config: Record<string, unknown>,
  expertLens: VitalExpertLensId,
  citations: VitalLiteratureHit[],
): string {
  const q = query.toLowerCase();
  const focus = cfgStr(config, "longevityFocus", "metabolic");
  const vitalsLine = formatVitals(state.vitals);
  const sleep = state.vitals.find((v) => v.metric === "sleep_score");
  const hrv = state.vitals.find((v) => v.metric === "hrv");
  const hr = state.vitals.find((v) => v.metric === "resting_hr");

  const preview = longevityPreviewReply(query);
  const citationNote =
    citations.length > 0
      ? `\n\nSources (on-box corpus): ${citations.map((c) => c.title).join(" · ")}`
      : "";

  if (/sleep|hrv|resting|hr\b/.test(q) && (sleep || hrv || hr)) {
    return `Your vault shows sleep score ${sleep?.value ?? "—"}, HRV ${hrv?.value ?? "—"} ms, resting HR ${hr?.value ?? "—"} bpm. ${expertLensLabel(expertLens)} would treat sleep consistency as the first lever — your protocol tab already encodes local steps. Align evening behavior before adding supplements.${citationNote}`;
  }

  if (/lab|report|a1c|glucose|ldl|metabolic/.test(q) && state.reports.length > 0) {
    return `Using your report vault (${state.reports.length} on file): ${formatReports(state)}. For ${focusLabel(focus)}, prioritize nutrition and movement steps that map to these markers — not generic stacks.${citationNote}`;
  }

  if (/protocol|diff|align|missing/.test(q)) {
    const diff = buildProtocolDiffReport(state.protocol, expertLens);
    return `${diff.summary} Aligned: ${diff.aligned.length}. Missing: ${diff.missing.map((m) => m.title).join(", ") || "none"}. Use Protocol diff in Lab for full view.${citationNote}`;
  }

  if (preview) {
    return `${preview}\n\nYour context — focus: ${focusLabel(focus)}; vitals: ${vitalsLine}.${citationNote}`;
  }

  return `Question noted for ${focusLabel(focus)} focus. Current vitals: ${vitalsLine}. Reports: ${state.reports.length}. Protocol steps: ${state.protocol.length}. ${citations[0]?.excerpt ?? "Explore expert lenses and protocol diff in Lab."}${citationNote}`;
}

async function buildLlmAnswer(
  query: string,
  state: VitalHealthState,
  config: Record<string, unknown>,
  expertLens: VitalExpertLensId,
  citations: VitalLiteratureHit[],
): Promise<string | null> {
  if (!(await isLocalInferenceAvailable())) return null;

  const focus = cfgStr(config, "longevityFocus", "metabolic");
  const ragBlock =
    citations.length > 0
      ? citations.map((c) => `[${c.title}] ${c.excerpt}`).join("\n\n")
      : "No corpus hits — answer from general longevity principles only.";

  const system = `You are Vital Claw on a sovereign CurXor appliance. Answer longevity questions using ONLY the operator's on-box data and corpus excerpts below.
Rules:
- Educational only — NOT medical advice. Never prescribe doses or tell them to start/stop medications.
- Ground answers in their vitals, lab summaries, and protocol when provided.
- Reference the ${expertLensLabel(expertLens)} lens when relevant — do not claim endorsement.
- Keep answers under 180 words, plain language, actionable habits first.
- Never mention cloud APIs.`;

  const user = `Operator focus: ${focusLabel(focus)}
Expert lens: ${expertLensLabel(expertLens)}

Vitals: ${formatVitals(state.vitals)}
Lab vault: ${formatReports(state)}
Active protocol: ${formatProtocol(state.protocol)}

Corpus excerpts:
${ragBlock}

Question: ${query}`;

  return generateText(system, user);
}

export function getVitalLabStatus(): VitalLabStatus {
  return {
    literatureChunks: literatureCorpusSize(),
    expertLenses: availableExpertLenses(),
    features: {
      personalizedQa: true,
      literatureRag: true,
      protocolDiff: true,
      clinicianExport: true,
    },
  };
}

export async function askVitalLongevityLab(
  query: string,
  config: Record<string, unknown>,
  state: VitalHealthState,
  expertLensRaw?: unknown,
): Promise<VitalLabAskResult> {
  const trimmed = query.trim();
  const expertLens = resolveExpertLens(expertLensRaw ?? config.expertLens);
  const citations = searchLongevityLiterature(trimmed, 4, expertLens);
  const contextUsed = {
    focus: cfgStr(config, "longevityFocus", "metabolic"),
    vitalsCount: state.vitals.length,
    reportCount: state.reports.length,
    protocolSteps: state.protocol.length,
  };

  if (!trimmed) {
    return {
      query: trimmed,
      answer: 'Ask a longevity question — e.g. "How does my sleep score compare to Huberman\'s advice?" or "What am I missing vs Blueprint?"',
      mode: "fallback",
      expertLens,
      citations: [],
      contextUsed,
      disclaimer: VITAL_LONGEVITY_DISCLAIMER,
    };
  }

  const llm = await buildLlmAnswer(trimmed, state, config, expertLens, citations);
  if (llm) {
    return {
      query: trimmed,
      answer: llm,
      mode: "llm",
      expertLens,
      citations,
      contextUsed,
      disclaimer: VITAL_LONGEVITY_DISCLAIMER,
    };
  }

  return {
    query: trimmed,
    answer: buildStructuredAnswer(trimmed, state, config, expertLens, citations),
    mode: citations.length > 0 ? "structured" : "fallback",
    expertLens,
    citations,
    contextUsed,
    disclaimer: VITAL_LONGEVITY_DISCLAIMER,
  };
}

export function runProtocolDiff(
  protocol: VitalHealthState["protocol"],
  expertLensRaw?: unknown,
): VitalProtocolDiffReport {
  return buildProtocolDiffReport(protocol, resolveExpertLens(expertLensRaw));
}

export function searchLabLiterature(query: string, expertLensRaw?: unknown, limit = 6): VitalLiteratureHit[] {
  const lens = resolveExpertLens(expertLensRaw);
  const hits = searchLongevityLiterature(query, limit, lens);
  if (hits.length > 0) return hits;
  if (!query.trim()) return allLiteratureForLens(lens, limit);
  return [];
}

export function buildClinicianExportMarkdown(
  state: VitalHealthState,
  config: Record<string, unknown>,
): string {
  const focus = focusLabel(cfgStr(config, "longevityFocus", "metabolic"));
  const generated = new Date().toISOString();
  const lines = [
    "# Vital Claw — clinician summary (operator-controlled export)",
    "",
    `Generated: ${generated}`,
    `Focus: ${focus}`,
    "",
    VITAL_LONGEVITY_DISCLAIMER,
    "",
    "## Latest vitals",
    ...state.vitals.map((v) => `- ${v.metric.replace(/_/g, " ")}: ${v.value} ${v.unit} (${v.source}, ${v.recordedAt})`),
    "",
    "## Medical reports",
    ...(state.reports.length
      ? state.reports.map(
          (r) => `- **${r.title}** (${r.provider}, ${r.receivedAt})\n  ${r.summary}\n  Tags: ${r.tags.join(", ")}`,
        )
      : ["- None on file"]),
    "",
    "## Active longevity protocol",
    ...state.protocol.map((s) => `- **${s.title}** (${s.category}, ${s.frequency}): ${s.detail}`),
    "",
    "## Connected bridges",
    ...state.healthAppSync.map(
      (b) => `- ${b.app}: ${b.connected ? "connected" : "not connected"}${b.lastSyncAt ? ` · last sync ${b.lastSyncAt}` : ""}`,
    ),
    "",
    "_Exported from CurXor Vital Claw on sovereign appliance. Operator chose what to share._",
  ];
  return lines.join("\n");
}
