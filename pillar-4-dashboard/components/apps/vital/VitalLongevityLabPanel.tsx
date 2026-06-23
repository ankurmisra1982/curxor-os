"use client";

import { useCallback, useState } from "react";

import { VitalProtocolDiffPanel } from "@/components/apps/vital/VitalProtocolDiffPanel";
import {
  LONGEVITY_EXPERTS,
  LONGEVITY_PILLARS,
  LONGEVITY_SAMPLE_QUESTIONS,
  VITAL_LONGEVITY_DISCLAIMER,
} from "@/lib/vital-longevity-knowledge";
import type { VitalExpertLensId, VitalLabAskResult, VitalLiteratureHit, VitalProtocolDiffReport } from "@/lib/vital-lab-types";

const LENS_OPTIONS: { value: VitalExpertLensId; label: string }[] = [
  { value: "balanced", label: "Balanced stack" },
  { value: "sinclair", label: "Sinclair" },
  { value: "johnson", label: "Blueprint / Don't Die" },
  { value: "attia", label: "Attia" },
  { value: "huberman", label: "Huberman" },
  { value: "patrick", label: "Patrick" },
];

interface VitalLongevityLabPanelProps {
  longevityFocus?: string;
  onLabUsed?: () => void;
}

export function VitalLongevityLabPanel({ longevityFocus, onLabUsed }: VitalLongevityLabPanelProps) {
  const focusLabel =
    longevityFocus === "cardio"
      ? "cardiovascular"
      : longevityFocus === "cognitive"
        ? "cognitive"
        : longevityFocus === "athletic"
          ? "athletic performance"
          : "metabolic";

  const [expertLens, setExpertLens] = useState<VitalExpertLensId>("balanced");
  const [question, setQuestion] = useState("");
  const [askResult, setAskResult] = useState<VitalLabAskResult | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [diff, setDiff] = useState<VitalProtocolDiffReport | null>(null);
  const [diffBusy, setDiffBusy] = useState(false);
  const [litQuery, setLitQuery] = useState("");
  const [litHits, setLitHits] = useState<VitalLiteratureHit[]>([]);
  const [litBusy, setLitBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const runAsk = useCallback(
    async (q: string) => {
      setAskBusy(true);
      setExportNote(null);
      try {
        const res = await fetch("/api/vital/lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ask", query: q, expertLens }),
        });
        const data = (await res.json()) as VitalLabAskResult & { ok?: boolean };
        if (res.ok) {
          setAskResult(data);
          onLabUsed?.();
        }
      } finally {
        setAskBusy(false);
      }
    },
    [expertLens, onLabUsed],
  );

  const runDiff = useCallback(async () => {
    setDiffBusy(true);
    try {
      const res = await fetch("/api/vital/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "protocol_diff", expertLens }),
      });
      const data = (await res.json()) as { ok?: boolean; diff?: VitalProtocolDiffReport };
      if (res.ok && data.diff) setDiff(data.diff);
    } finally {
      setDiffBusy(false);
    }
  }, [expertLens]);

  const runLiteratureSearch = useCallback(async () => {
    setLitBusy(true);
    try {
      const res = await fetch("/api/vital/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search_literature", query: litQuery, expertLens, limit: 6 }),
      });
      const data = (await res.json()) as { ok?: boolean; hits?: VitalLiteratureHit[] };
      if (res.ok && data.hits) setLitHits(data.hits);
    } finally {
      setLitBusy(false);
    }
  }, [expertLens, litQuery]);

  const runExport = useCallback(async () => {
    setExportBusy(true);
    setExportNote(null);
    try {
      const res = await fetch("/api/vital/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clinician_export" }),
      });
      const data = (await res.json()) as { ok?: boolean; markdown?: string; filename?: string };
      if (!res.ok || !data.markdown) {
        setExportNote("Export failed.");
        return;
      }
      const blob = new Blob([data.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename ?? "vital-clinician-summary.md";
      a.click();
      URL.revokeObjectURL(url);
      setExportNote("Clinician summary downloaded — you control what leaves the appliance.");
    } finally {
      setExportBusy(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="border border-cursor-glow/40 bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">Longevity Lab · Live</p>
        <p className="mt-2 font-sans text-sm text-stark">
          Personalized Q&A, on-box literature, and protocol diff — grounded in your vitals, labs, and FRE focus (
          {focusLabel}). Sinclair, Bryan Johnson (Don&apos;t Die / Blueprint), Attia, Huberman, Patrick.
        </p>
      </div>

      <p className="font-mono text-[9px] leading-relaxed text-muted">{VITAL_LONGEVITY_DISCLAIMER}</p>

      <section className="space-y-3">
        <h3 className="font-sans text-sm font-semibold text-stark">Ask Vital</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={expertLens}
            onChange={(e) => setExpertLens(e.target.value as VitalExpertLensId)}
            className="border border-line bg-void px-2 py-1.5 font-mono text-[10px] text-stark"
          >
            {LENS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="e.g. Given my sleep score and labs, what would Attia prioritize?"
          className="w-full border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={askBusy || !question.trim()}
            onClick={() => void runAsk(question)}
            className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow disabled:opacity-50"
          >
            {askBusy ? "Thinking…" : "Ask (local)"}
          </button>
        </div>
        <ul className="flex flex-wrap gap-1">
          {LONGEVITY_SAMPLE_QUESTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setQuestion(s.question);
                  void runAsk(s.question);
                }}
                className="border border-line px-2 py-1 font-mono text-[9px] text-muted hover:border-cursor-glow hover:text-stark"
              >
                {s.question.length > 48 ? `${s.question.slice(0, 48)}…` : s.question}
              </button>
            </li>
          ))}
        </ul>
        {askResult ? (
          <div className="border border-line bg-void p-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
              {askResult.mode === "llm" ? "Local LLM" : askResult.mode === "structured" ? "Structured + RAG" : "Fallback"} ·{" "}
              {askResult.expertLens}
            </p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-stark">{askResult.answer}</p>
            {askResult.citations.length > 0 ? (
              <ul className="mt-3 space-y-2 border-t border-line pt-3">
                {askResult.citations.map((c) => (
                  <li key={c.id} className="font-sans text-xs text-muted">
                    <span className="text-cursor-glow">{c.title}</span> — {c.excerpt}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 font-mono text-[9px] text-muted">{askResult.disclaimer}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-sm font-semibold text-stark">Protocol diff</h3>
          <button
            type="button"
            disabled={diffBusy}
            onClick={() => void runDiff()}
            className="border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-stark hover:border-cursor-glow"
          >
            {diffBusy ? "Diffing…" : "Run diff"}
          </button>
        </div>
        <VitalProtocolDiffPanel diff={diff} loading={diffBusy} />
      </section>

      <section className="space-y-3">
        <h3 className="font-sans text-sm font-semibold text-stark">Literature (on-box RAG)</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={litQuery}
            onChange={(e) => setLitQuery(e.target.value)}
            placeholder="Search corpus — NAD+, Zone 2, sleep…"
            className="min-w-[200px] flex-1 border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
          />
          <button
            type="button"
            disabled={litBusy}
            onClick={() => void runLiteratureSearch()}
            className="border border-line px-3 py-2 font-mono text-[10px] uppercase text-stark hover:border-cursor-glow"
          >
            {litBusy ? "…" : "Search"}
          </button>
        </div>
        <ul className="space-y-2">
          {litHits.map((hit) => (
            <li key={hit.id} className="border border-line px-3 py-2">
              <p className="font-sans text-sm text-stark">{hit.title}</p>
              <p className="mt-1 font-mono text-[9px] text-muted">{hit.source}</p>
              <p className="mt-1 font-sans text-xs text-muted">{hit.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="font-sans text-sm font-semibold text-stark">Clinician export</h3>
        <p className="font-sans text-xs text-muted">
          Download markdown summary of vitals, reports, and protocol — you choose whether to share it.
        </p>
        <button
          type="button"
          disabled={exportBusy}
          onClick={() => void runExport()}
          className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow disabled:opacity-50"
        >
          {exportBusy ? "Exporting…" : "Download clinician summary"}
        </button>
        {exportNote ? <p className="font-mono text-[10px] text-muted">{exportNote}</p> : null}
      </section>

      <section>
        <h3 className="font-sans text-sm font-semibold text-stark">Why Vital on sovereign metal</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LONGEVITY_PILLARS.map((pillar) => (
            <li key={pillar.id} className="border border-line px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">{pillar.title}</p>
              <p className="mt-1 font-sans text-xs text-muted">{pillar.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-sans text-sm font-semibold text-stark">Expert lenses</h3>
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {LONGEVITY_EXPERTS.map((expert) => (
            <li key={expert.id} className="border border-line bg-panel p-3">
              <p className="font-sans text-sm font-medium text-stark">{expert.name}</p>
              <p className="mt-1 font-sans text-xs text-muted">{expert.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
