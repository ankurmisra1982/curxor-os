"use client";

import type { AscensionState } from "@/lib/claw-cafe-ascension";
import { ASCENSION_TIER_INDEX } from "@/lib/claw-cafe-ascension";
import { formatCafeProfileLine } from "@/lib/cafe-epithet";

interface CafeLevelUpModalProps {
  ascension: AscensionState | null;
  epithet?: string | null;
  onClose: () => void;
}

export function CafeLevelUpModal({ ascension, epithet, onClose }: CafeLevelUpModalProps) {
  if (!ascension) return null;

  const tierNum = ASCENSION_TIER_INDEX[ascension.tier] + 1;
  const profile = formatCafeProfileLine(ascension.title, epithet ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-md border border-cursor-glow/60 bg-panel p-5 font-mono text-[10px] shadow-cursor">
        <p className="text-[11px] uppercase tracking-[0.35em] text-cursor-glow">Ascension</p>
        <h2 className="mt-2 font-display text-sm uppercase tracking-[0.16em] text-stark">Tier G{tierNum}</h2>
        <p className="mt-2 text-stark">{profile}</p>
        <p className="mt-3 text-muted">
          Your Claws noticed — keep syncing habits across desks to climb toward Infinity.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 border border-cursor-glow px-4 py-2 uppercase tracking-widest text-cursor-glow hover:bg-surface"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
