"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import type { WorkExecutiveBrief } from "@/lib/work-executive-brief";

/** @deprecated use WorkExecutiveBrief */
export interface ExecutiveBriefPanelData {
  summary: string;
  stalled: Array<{ leadId: string; name: string; daysSinceTouch: number; stage: string }>;
  needsYou: { total: number };
  impact: { sendsThisWeek: number; repliesThisWeek: number };
}

interface WorkExecutiveBriefPanelProps {
  growthLevel: GrowthLevel;
  brief: WorkExecutiveBrief | ExecutiveBriefPanelData | null;
  onRefresh?: () => void;
}

function isModernBrief(brief: WorkExecutiveBrief | ExecutiveBriefPanelData): brief is WorkExecutiveBrief {
  return "headline" in brief && "sections" in brief;
}

export function WorkExecutiveBriefPanel({ growthLevel, brief, onRefresh }: WorkExecutiveBriefPanelProps) {
  if (growthLevel !== "L5") return null;
  if (!brief) {
    return <p className="font-mono text-[10px] text-muted">Loading executive brief…</p>;
  }

  if (isModernBrief(brief)) {
    return (
      <div className="space-y-3 border border-cursor-glow/30 bg-panel p-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] uppercase tracking-widest text-cursor-glow">Executive brief</p>
          {onRefresh ? (
            <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted">
              Refresh
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-stark">{brief.headline}</p>
        {brief.sections.map((section) => (
          <div key={section.heading}>
            <p className="mb-1 text-[10px] uppercase text-muted">{section.heading}</p>
            <ul className="space-y-1 text-[11px] text-stark">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-[10px] text-muted">
          {brief.stats.leadsInPipeline} pipeline · {brief.stats.stalls} stalls · {brief.stats.repliesThisWeek} replies (7d)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-cursor-glow/30 bg-panel p-3 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] uppercase tracking-widest text-cursor-glow">Executive brief</p>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted">
            Refresh
          </button>
        ) : null}
      </div>
      <pre className="whitespace-pre-wrap text-[11px] text-stark">{brief.summary}</pre>
      <p className="text-[10px] text-muted">
        Needs you: {brief.needsYou.total} · Impact: {brief.impact.sendsThisWeek} sends / {brief.impact.repliesThisWeek} replies (7d)
      </p>
    </div>
  );
}
