"use client";

export interface PlatformScheduleInsightRow {
  platform: string;
  bestDayOfWeek: number;
  bestHour: number;
  avgEngagement: number;
  sampleCount: number;
  source: "data" | "fallback";
  label: string;
}

export interface ScheduleSlotRow {
  platform: string;
  postId?: string;
  scheduledAt: string;
  label: string;
  source: "data" | "fallback";
  confidence: number;
  detail: string;
}

interface ContentBestTimePanelProps {
  insights: PlatformScheduleInsightRow[];
  weekSlots: ScheduleSlotRow[];
  timeZone: string;
  selectedPostId?: string;
  selectedPlatform?: string;
  suggestion?: ScheduleSlotRow | null;
  onScheduleBest: (postId: string) => void;
  onRefresh: () => void;
  busy?: boolean;
}

export function ContentBestTimePanel({
  insights,
  weekSlots,
  timeZone,
  selectedPostId,
  selectedPlatform,
  suggestion,
  onScheduleBest,
  onRefresh,
  busy,
}: ContentBestTimePanelProps) {
  const platformInsight = selectedPlatform
    ? insights.find((i) => i.platform === selectedPlatform)
    : null;

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          Best times from your metrics · tz {timeZone}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {suggestion && selectedPostId ? (
        <div className="border border-cursor-glow/40 bg-panel p-2">
          <p className="text-stark">
            Selected post → {suggestion.label}{" "}
            <span className={suggestion.source === "data" ? "text-cursor-glow" : "text-muted"}>
              ({suggestion.source === "data" ? "your data" : "default"})
            </span>
          </p>
          <p className="mt-1 text-muted">{suggestion.detail}</p>
          <p className="mt-1 text-muted">
            {new Date(suggestion.scheduledAt).toLocaleString()} ·{" "}
            {Math.round(suggestion.confidence * 100)}% confidence
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onScheduleBest(selectedPostId)}
            className="mt-2 border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
          >
            Schedule at best time
          </button>
        </div>
      ) : null}

      {platformInsight ? (
        <p className="text-muted">
          {selectedPlatform}: best slot {platformInsight.label}{" "}
          ({platformInsight.source === "data" ? `${platformInsight.sampleCount} samples` : "fallback"})
        </p>
      ) : null}

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {insights.slice(0, 9).map((row) => (
          <div key={row.platform} className="border border-line bg-panel p-2">
            <div className="flex justify-between gap-2">
              <span className="text-stark uppercase">{row.platform}</span>
              <span className={row.source === "data" ? "text-cursor-glow" : "text-muted"}>
                {row.source === "data" ? "learned" : "default"}
              </span>
            </div>
            <p className="mt-1 text-muted">{row.label}</p>
            {row.source === "data" ? (
              <p className="text-[9px] text-muted/80">
                n={row.sampleCount} · {(row.avgEngagement * 100).toFixed(1)}% engagement
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {weekSlots.length > 0 ? (
        <div className="border border-line bg-panel p-2">
          <p className="mb-2 uppercase tracking-widest text-muted">Suggested slots this week</p>
          <ul className="max-h-32 space-y-1 overflow-y-auto">
            {weekSlots.slice(0, 12).map((slot, idx) => (
              <li key={`${slot.platform}-${slot.scheduledAt}-${idx}`} className="flex flex-wrap gap-x-2 text-muted">
                <span className="text-stark">{slot.platform}</span>
                <span>{slot.label}</span>
                <span>{new Date(slot.scheduledAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
