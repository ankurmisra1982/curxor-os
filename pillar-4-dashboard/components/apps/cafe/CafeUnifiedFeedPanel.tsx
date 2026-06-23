"use client";

interface UnifiedCafeEvent {
  id: string;
  kind: string;
  appId: string;
  at: string;
  bubble?: string;
  xp?: { ascension: number; knowledge?: number; wealth?: number };
}

interface CafeUnifiedFeedPanelProps {
  events: UnifiedCafeEvent[];
  loading?: boolean;
}

export function CafeUnifiedFeedPanel({ events, loading }: CafeUnifiedFeedPanelProps) {
  if (loading) {
    return <p className="font-mono text-[10px] text-muted">Loading cross-Claw feed…</p>;
  }

  if (events.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No ascension events yet — use Work, Swarm, Forge, or Capital and tap Sync Claws.
      </p>
    );
  }

  return (
    <ul className="space-y-1 font-mono text-[10px]">
      {events.slice(0, 8).map((event) => (
        <li key={event.id} className="border border-line px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-stark">{event.bubble ?? event.kind.replace(/\./g, " · ")}</span>
            <span className="text-muted">{new Date(event.at).toLocaleString()}</span>
          </div>
          <p className="text-muted">
            {event.appId}
            {event.xp ? ` · +${event.xp.ascension} XP` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
