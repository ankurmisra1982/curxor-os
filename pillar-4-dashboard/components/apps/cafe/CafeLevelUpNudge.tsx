"use client";

import type { AscensionMilestones, AscensionState } from "@/lib/claw-cafe-ascension";

interface CafeLevelUpNudgeProps {
  ascension: AscensionState | null;
  optOut?: boolean;
  loading?: boolean;
  onSync?: () => void;
}

function milestonesIncomplete(milestones: AscensionMilestones): boolean {
  return (
    !milestones.knowledgeEvent ||
    !milestones.wealthEvent ||
    !milestones.crossClawHandshake ||
    !milestones.forgeMint
  );
}

function missingMilestoneHints(milestones: AscensionMilestones): string[] {
  const hints: string[] = [];
  if (!milestones.knowledgeEvent) hints.push("Creator or Forge knowledge event");
  if (!milestones.wealthEvent) hints.push("Work or Capital wealth event");
  if (!milestones.crossClawHandshake) hints.push("cross-Claw handshake");
  if (!milestones.forgeMint) hints.push("Forge mint");
  return hints;
}

export function CafeLevelUpNudge({ ascension, optOut, loading, onSync }: CafeLevelUpNudgeProps) {
  if (optOut || !ascension || ascension.nextTier == null) return null;
  if (!milestonesIncomplete(ascension.milestones)) return null;

  const hints = missingMilestoneHints(ascension.milestones);

  return (
    <div className="border border-cursor-glow/40 bg-panel px-3 py-2 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-cursor-glow">Room is listening</p>
      <p className="mt-1 text-muted">
        Events stream live from your Claws. Use Repair sync only if the ledger missed something.
      </p>
      <p className="mt-1 text-stark">
        {ascension.xpToNext > 0
          ? `${ascension.xpToNext} XP to ${ascension.titleStyle === "neutral" ? "next tier" : "next ascension"} — unlock milestones across desks.`
          : "Complete cross-Claw milestones to climb toward Infinity."}
      </p>
      {hints.length > 0 ? (
        <p className="mt-1 text-muted">Still open: {hints.join(" · ")}</p>
      ) : null}
      {onSync ? (
        <button
          type="button"
          disabled={loading}
          onClick={onSync}
          className="mt-2 border border-cursor-glow px-3 py-1 uppercase tracking-widest text-cursor-glow disabled:opacity-40"
        >
          Repair sync
        </button>
      ) : null}
    </div>
  );
}
