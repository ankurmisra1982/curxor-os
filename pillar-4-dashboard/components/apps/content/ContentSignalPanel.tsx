"use client";

export interface SignalFeedItemRow {
  id: string;
  title: string;
  summary: string;
  source: string;
  urgency: string;
  suggestedPlatforms: string[];
  createdAt: string;
}

interface ContentSignalPanelProps {
  items: SignalFeedItemRow[];
  onRefresh: () => void;
  onDraft: (signalId: string, platform: string) => void;
}

export function ContentSignalPanel({ items, onRefresh, onDraft }: ContentSignalPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[10px]">
      <p className="text-muted">Reactive drafts from Signal Claw feed (`/etc/curxor/signal-feed.json`).</p>
      <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted">
        Refresh
      </button>
      {items.length === 0 ? (
        <p className="text-muted">No active signals — ingest via API or wire Signal Claw later.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="border border-line/60 p-2">
              <div className="flex justify-between gap-2">
                <span className="text-stark">{item.title}</span>
                <span className={item.urgency === "high" ? "text-amber-400" : "text-muted"}>{item.urgency}</span>
              </div>
              <p className="mt-1 text-muted">{item.summary.slice(0, 160)}</p>
              <button
                type="button"
                onClick={() => onDraft(item.id, item.suggestedPlatforms[0] ?? "x")}
                className="mt-2 border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow"
              >
                Draft reactive post
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
