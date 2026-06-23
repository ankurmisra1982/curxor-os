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
            ? "Cross-Claw orchestration hints — no autonomous Claw banter."
            : "Full patron memory — ledger + ascension on this box."}
        </p>
      ) : null}
      <Link
        href="/claw-cafe"
        className="mt-3 inline-block border border-line px-3 py-1 uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-cursor-glow"
      >
        Return to room
      </Link>
    </div>
  );
}
