"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CapitalThesisEntry } from "@/lib/capital-alpha-types";

interface CapitalThesisJournalPanelProps {
  symbol: string | null;
  promptDraft?: string | null;
  promptKey?: number;
  highlightSave?: boolean;
  onCreated?: () => void;
  onPromptDismiss?: () => void;
}

export function CapitalThesisJournalPanel({
  symbol,
  promptDraft,
  promptKey = 0,
  highlightSave = false,
  onCreated,
  onPromptDismiss,
}: CapitalThesisJournalPanelProps) {
  const [entries, setEntries] = useState<CapitalThesisEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/capital/intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_thesis", ticker: symbol ?? undefined }),
    });
    const json = (await res.json()) as { entries?: CapitalThesisEntry[] };
    if (json.entries) setEntries(json.entries);
  }, [symbol]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!promptDraft?.trim()) return;
    setDraft(promptDraft);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [promptDraft, promptKey]);

  const save = async () => {
    const sym = symbol?.trim().toUpperCase();
    const body = draft.trim();
    if (!sym || !body) return;
    setLoading(true);
    try {
      const res = await fetch("/api/capital/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_thesis", ticker: sym, body }),
      });
      if (!res.ok) return;
      setDraft("");
      await load();
      onCreated?.();
      onPromptDismiss?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 font-mono text-[10px]" data-capital-thesis-journal>
      <p className="text-muted uppercase tracking-widest">Thesis journal · local-first</p>
      {highlightSave && draft.trim() ? (
        <p className="border border-cursor-glow/50 bg-cursor-glow/5 px-2 py-1 text-[9px] text-cursor-glow">
          Demo fill logged — save your thesis to feed Alpha and unlock rule-from-thesis.
        </p>
      ) : null}
      {symbol ? (
        <div className="flex flex-col gap-1 sm:flex-row">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Why ${symbol}? Conviction, catalyst, risk…`}
            rows={2}
            className="min-h-[48px] flex-1 border border-line bg-transparent px-2 py-1 text-stark outline-none focus:border-cursor-glow"
          />
          <button
            type="button"
            disabled={loading || !draft.trim()}
            onClick={() => void save()}
            className={`border px-2 py-1 text-[9px] uppercase disabled:opacity-40 ${
              highlightSave && draft.trim()
                ? "border-cursor-glow bg-cursor-glow/10 text-cursor-glow animate-pulse"
                : "border-cursor-glow text-cursor-glow"
            }`}
          >
            Save thesis
          </button>
        </div>
      ) : (
        <p className="text-muted">Research a ticker to add a thesis entry</p>
      )}
      {entries.length === 0 ? (
        <p className="text-muted">No thesis entries yet</p>
      ) : (
        entries.slice(0, 8).map((e) => (
          <div key={e.id} className="border-b border-line/30 py-1">
            <div className="flex justify-between gap-2 text-[8px] text-muted">
              <span>
                {e.symbol} · {e.source}
              </span>
              <span>{new Date(e.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-0.5 text-stark">{e.body}</p>
          </div>
        ))
      )}
    </div>
  );
}
