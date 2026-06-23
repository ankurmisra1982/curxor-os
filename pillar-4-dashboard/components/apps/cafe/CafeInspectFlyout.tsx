"use client";

import Link from "next/link";

import type { AnimatedCafeCharacter } from "@/lib/cafe-pixel-engine";
import { hrefForCafeApp } from "@/lib/cafe-pixel-engine";

interface CafeInspectFlyoutProps {
  character: AnimatedCafeCharacter;
  ascensionSnippet?: string | null;
  onClose?: () => void;
}

export function CafeInspectFlyout({ character, ascensionSnippet, onClose }: CafeInspectFlyoutProps) {
  const href = hrefForCafeApp(character.appId);

  return (
    <div className="border border-cursor-glow/60 bg-panel p-3 font-mono text-[10px] shadow-cursor">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="uppercase tracking-widest text-cursor-glow">{character.label}</p>
          <p className="text-muted">{character.station.replace(/_/g, " ")} · {character.displayState}</p>
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
      {character.bubble ? (
        <p className="mt-2 border border-line/60 px-2 py-1 text-stark">&ldquo;{character.bubble}&rdquo;</p>
      ) : (
        <p className="mt-2 text-muted">No recent activity bubble.</p>
      )}
      {ascensionSnippet ? <p className="mt-2 text-muted">{ascensionSnippet}</p> : null}
      <Link
        href={href}
        className="mt-3 inline-block border border-cursor-glow px-3 py-1 uppercase tracking-widest text-cursor-glow hover:bg-surface"
      >
        Open Claw
      </Link>
    </div>
  );
}
