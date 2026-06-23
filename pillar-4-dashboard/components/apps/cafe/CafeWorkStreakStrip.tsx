"use client";

interface CafeWorkStreakStripProps {
  streak: number;
  eventCount: number;
  optOut?: boolean;
  bonusReason?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function CafeWorkStreakStrip({
  streak,
  eventCount,
  optOut,
  bonusReason,
  loading,
  onRefresh,
}: CafeWorkStreakStripProps) {
  if (optOut) {
    return (
      <p className="font-mono text-[10px] text-muted">
        Work streak hidden — enable gamification in Settings → Appearance.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-void px-3 py-2 font-mono text-[10px]">
      <div className="text-muted">
        <span className="uppercase tracking-widest text-stark">Work streak</span>
        {" · "}
        {streak} day{streak === 1 ? "" : "s"} · {eventCount} recent event{eventCount === 1 ? "" : "s"}
        {bonusReason ? (
          <span className="mt-1 block text-cursor-glow">{bonusReason}</span>
        ) : null}
      </div>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"
        >
          Refresh streak
        </button>
      ) : null}
    </div>
  );
}
