"use client";

interface CafeXpEvent {
  id: string;
  kind: string;
  at: string;
}

interface WorkCafeXpPanelProps {
  events: CafeXpEvent[];
  streak: number;
  optOut?: boolean;
  bonusReason?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function WorkCafeXpPanel({ events, streak, optOut, bonusReason, loading, onRefresh }: WorkCafeXpPanelProps) {
  if (optOut) {
    return (
      <p className="font-mono text-[10px] text-muted">
        Work gamification is off — enable in Settings → Appearance to show XP streak here.
      </p>
    );
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          Work XP streak · {streak} · {events.length} recent event{events.length === 1 ? "" : "s"}
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
        <p className="text-muted">No work XP yet — activate a sequence or complete a handoff on the Work desk.</p>
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
