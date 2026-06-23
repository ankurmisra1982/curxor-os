"use client";

interface SwarmXpEventRow {
  id: string;
  kind: string;
  at: string;
}

interface SwarmCafeXpPanelProps {
  events: SwarmXpEventRow[];
  streak: number;
  bonusReason?: string;
  optOut?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
}

export function SwarmCafeXpPanel({
  events,
  streak,
  bonusReason,
  optOut,
  loading,
  onRefresh,
}: SwarmCafeXpPanelProps) {
  if (optOut) {
    return (
      <p className="font-mono text-[10px] text-muted">
        Gamification is off — enable in Settings to show Swarm XP toward Claw Cafe ascension.
      </p>
    );
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          Swarm XP streak · {streak} · {events.length} recent event{events.length === 1 ? "" : "s"}
        </p>
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
      {bonusReason ? <p className="border border-cursor-glow/40 px-2 py-1 text-cursor-glow">{bonusReason}</p> : null}
      {events.length === 0 ? (
        <p className="text-muted">No Swarm XP yet — dispatch a route or receive a cross-claw handoff.</p>
      ) : (
        events.slice(0, 5).map((event) => (
          <div key={event.id} className="border border-line px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="uppercase text-cursor-glow">{event.kind.replace(/_/g, " ")}</span>
              <span className="text-muted">{new Date(event.at).toLocaleString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
