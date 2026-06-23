"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { AnimatedCafeCharacter } from "@/lib/cafe-pixel-engine";
import { hrefForCafeApp } from "@/lib/cafe-pixel-engine";

function formatMasteryStars(stars: number): string {
  if (stars <= 0) return "—";
  return "★".repeat(stars) + "☆".repeat(Math.max(0, 5 - stars));
}

interface CafeInspectFlyoutProps {
  character: AnimatedCafeCharacter;
  ascensionSnippet?: string | null;
  onClose?: () => void;
}

export function CafeInspectFlyout({ character, ascensionSnippet, onClose }: CafeInspectFlyoutProps) {
  const href = character.approvalHref ?? hrefForCafeApp(character.appId);
  const [mastery, setMastery] = useState<{ stars: number; summary: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/cafe/mastery?appId=${encodeURIComponent(character.appId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { mastery?: { stars: number; summary: string } };
        if (!cancelled && json.mastery) setMastery(json.mastery);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [character.appId]);

  return (
    <div className="border border-cursor-glow/60 bg-panel p-3 font-mono text-[10px] shadow-cursor">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="uppercase tracking-widest text-cursor-glow">{character.label}</p>
          <p className="text-muted">
            {character.station.replace(/_/g, " ")} · {character.displayState}
            {mastery ? ` · ${formatMasteryStars(mastery.stars)}` : ""}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow"
          >
            Close
          </button>
        ) : null}
      </div>
      {character.needsApproval ? (
        <p className="mt-2 border border-amber-500/50 px-2 py-1 text-amber-300">Needs your OK — tap Open Claw</p>
      ) : null}
      {character.bubble ? (
        <p className="mt-2 border border-line/60 px-2 py-1 text-stark">&ldquo;{character.bubble}&rdquo;</p>
      ) : (
        <p className="mt-2 text-muted">No recent activity bubble.</p>
      )}
      {mastery?.summary ? <p className="mt-2 text-muted">{mastery.summary}</p> : null}
      {ascensionSnippet ? <p className="mt-2 text-muted">{ascensionSnippet}</p> : null}
      <Link
        href={href}
        className="mt-3 inline-block border border-cursor-glow px-3 py-1 uppercase tracking-widest text-cursor-glow hover:bg-surface"
      >
        {character.needsApproval ? "Review & approve" : "Open Claw"}
      </Link>
    </div>
  );
}
