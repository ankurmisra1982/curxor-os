"use client";

export interface ContentGapRow {
  platform: string;
  label: string;
  daysSinceLastPost: number;
  severity: string;
  message: string;
}

export interface FillPlanRow {
  platform: string;
  scheduledAt: string;
  source: string;
  draftSeed: string;
}

export interface ContentPlanReportRow {
  gaps: ContentGapRow[];
  fillPlan: FillPlanRow[];
  weekTheme: string | null;
}

interface ContentPlanPanelProps {
  plan: ContentPlanReportRow | null;
  onRefresh: () => void;
  onFillWeek: () => void;
  busy?: boolean;
}

export function ContentPlanPanel({ plan, onRefresh, onFillWeek, busy }: ContentPlanPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh plan
        </button>
        <button type="button" disabled={busy} onClick={onFillWeek} className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50">
          Fill week from plan
        </button>
      </div>
      {plan?.weekTheme ? <p className="text-muted">Theme: {plan.weekTheme}</p> : null}
      {plan?.gaps.length ? (
        <ul className="space-y-1">
          {plan.gaps.map((g) => (
            <li key={g.platform} className={g.severity === "warn" ? "text-amber-400" : "text-muted"}>
              {g.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-cursor-glow">All enabled channels have recent coverage.</p>
      )}
      {plan?.fillPlan.length ? (
        <div className="border border-line/60 p-2">
          <p className="mb-2 uppercase tracking-widest text-muted">Suggested fills</p>
          <ul className="space-y-1">
            {plan.fillPlan.map((f, i) => (
              <li key={`${f.platform}-${i}`} className="text-stark">
                {f.platform} · {new Date(f.scheduledAt).toLocaleString()} · {f.source}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
