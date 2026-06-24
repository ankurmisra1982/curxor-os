"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { PatronBriefMode } from "@/lib/cafe-master-chamber";

interface CafeMasterAiFlyoutProps {
  mode: PatronBriefMode;
  locked: boolean;
  onClose?: () => void;
}

export function CafeMasterAiFlyout({ mode, locked, onClose }: CafeMasterAiFlyoutProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(!locked);
  const [whisper, setWhisper] = useState<string | null>(locked ? "The chamber does not answer yet." : null);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestMessage, setSuggestMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (locked) return;
    setLoading(true);
    try {
      const res = await fetch("/api/cafe/patron-brief", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        locked?: boolean;
        lines?: string[];
        whisper?: string;
        mode?: PatronBriefMode;
      };
      if (json.locked) {
        setWhisper(json.whisper ?? "Not yet.");
        setLines([]);
        return;
      }
      setLines(json.lines ?? []);
      setWhisper(null);
    } catch {
      setWhisper("Ledger unreachable — try again.");
    } finally {
      setLoading(false);
    }
  }, [locked]);

  useEffect(() => {
    void load();
  }, [load]);

  const suggestBuildTask = useCallback(async () => {
    setSuggestBusy(true);
    setSuggestMessage(null);
    try {
      const res = await fetch("/api/build/delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest_demo" }),
      });
      const json = (await res.json()) as { error?: string; pendingCount?: number };
      if (!res.ok) throw new Error(json.error ?? "Suggest failed");
      setSuggestMessage("Build task suggested — approve in Settings → Build Plane.");
    } catch (err) {
      setSuggestMessage(err instanceof Error ? err.message : "Suggest failed");
    } finally {
      setSuggestBusy(false);
    }
  }, []);

  return (
    <div className="border border-violet-500/50 bg-panel p-3 font-mono text-[10px] shadow-cursor">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="uppercase tracking-widest text-violet-300">Master AI</p>
          <p className="text-muted">hidden chamber · {mode}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow"
          >
            Leave
          </button>
        ) : null}
      </div>
      {locked || whisper ? (
        <p className="mt-3 text-muted italic">{whisper ?? "…"}</p>
      ) : loading ? (
        <p className="mt-3 text-muted">Reading today&apos;s ledger…</p>
      ) : (
        <ul className="mt-3 space-y-1 text-stark">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {!locked && mode !== "daily" ? (
        <p className="mt-3 text-muted">
          {mode === "orchestration"
            ? "Cross-Claw orchestration hints — suggest build tasks with confirm gate."
            : "Full patron memory — ledger + ascension on this box."}
        </p>
      ) : null}
      {!locked && (mode === "orchestration" || mode === "full") ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={suggestBusy}
            onClick={() => void suggestBuildTask()}
            className="border border-violet-400/60 px-3 py-1 uppercase tracking-widest text-violet-200 hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"
          >
            Suggest build task
          </button>
          <Link
            href="/settings"
            className="border border-line px-3 py-1 uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-cursor-glow"
          >
            Delegation queue
          </Link>
        </div>
      ) : null}
      {suggestMessage ? <p className="mt-2 text-muted">{suggestMessage}</p> : null}
      <Link
        href="/claw-cafe"
        className="mt-3 inline-block border border-line px-3 py-1 uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-cursor-glow"
      >
        Return to room
      </Link>
    </div>
  );
}
