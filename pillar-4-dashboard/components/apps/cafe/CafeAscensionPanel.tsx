"use client";

import type { AscensionState } from "@/lib/claw-cafe-ascension";
import { ASCENSION_TIER_INDEX, MYTHIC_TITLES, NEUTRAL_TITLES } from "@/lib/claw-cafe-ascension";

interface CafeAscensionPanelProps {
  ascension: AscensionState;
  optOut?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
  onSync?: () => void;
}

export function CafeAscensionPanel({
  ascension,
  optOut,
  loading,
  onRefresh,
  onSync,
}: CafeAscensionPanelProps) {
  if (optOut) {
    return (
      <p className="font-mono text-[10px] text-muted">
        Gamification is off — enable in Settings → Appearance to track ascension.
      </p>
    );
  }

  const nextLabel =
    ascension.nextTier != null
      ? ascension.titleStyle === "neutral"
        ? NEUTRAL_TITLES[ascension.nextTier]
        : MYTHIC_TITLES[ascension.nextTier]
      : null;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="uppercase tracking-widest text-cursor-glow">{ascension.title}</p>
          <p className="text-muted">
            G{ASCENSION_TIER_INDEX[ascension.tier] + 1} · {ascension.ascensionXp} ascension XP
          </p>
        </div>
        <div className="flex gap-1">
          {onSync ? (
            <button
              type="button"
              onClick={onSync}
              disabled={loading}
              className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"
            >
              Sync Claws
            </button>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"
            >
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      <div className="border border-line bg-void px-2 py-2">
        <div className="mb-1 flex justify-between text-muted">
          <span>Progress</span>
          <span>
            {ascension.progressPct}%
            {nextLabel ? ` → ${nextLabel}` : " · MAX"}
          </span>
        </div>
        <div className="h-2 bg-panel">
          <div
            className="h-full bg-cursor-glow transition-all duration-500"
            style={{ width: `${ascension.progressPct}%` }}
          />
        </div>
        {ascension.xpToNext > 0 ? (
          <p className="mt-1 text-muted">{ascension.xpToNext} XP to next tier</p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="border border-line px-3 py-2">
          <p className="text-muted uppercase tracking-widest">Knowledge</p>
          <p className="text-stark">{ascension.affinities.knowledge}</p>
        </div>
        <div className="border border-line px-3 py-2">
          <p className="text-muted uppercase tracking-widest">Wealth</p>
          <p className="text-stark">{ascension.affinities.wealth}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {ascension.milestones.knowledgeEvent ? (
          <span className="border border-line px-2 py-0.5 text-cursor-glow">Knowledge</span>
        ) : null}
        {ascension.milestones.wealthEvent ? (
          <span className="border border-line px-2 py-0.5 text-cursor-glow">Wealth</span>
        ) : null}
        {ascension.milestones.crossClawHandshake ? (
          <span className="border border-line px-2 py-0.5 text-cursor-glow">Handshake</span>
        ) : null}
        {ascension.milestones.forgeMint ? (
          <span className="border border-line px-2 py-0.5 text-cursor-glow">Forge</span>
        ) : null}
      </div>
    </div>
  );
}
