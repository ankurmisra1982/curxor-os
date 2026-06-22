"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";

interface WorkExecutiveBriefPanelProps {
  growthLevel: GrowthLevel;
  stats: {
    leadsInPipeline: number;
    activeSequences: number;
    pendingSends: number;
    openTasks: number;
    repliesThisWeek: number;
  };
}

/** L5 scaffold — executive signal summary; full build deferred. */
export function WorkExecutiveBriefPanel({ growthLevel, stats }: WorkExecutiveBriefPanelProps) {
  if (growthLevel !== "L5") return null;

  return (
    <div className="space-y-2 border border-cursor-glow/30 bg-panel p-3 font-mono text-xs">
      <p className="text-[10px] uppercase tracking-widest text-cursor-glow">Executive brief</p>
      <ul className="space-y-1 text-[11px] text-stark">
        <li>
          Pipeline: {stats.leadsInPipeline} active · {stats.repliesThisWeek} replies this week
        </li>
        <li>
          Sequences: {stats.activeSequences} running · {stats.pendingSends} pending sends
        </li>
        <li>Open tasks: {stats.openTasks}</li>
      </ul>
      <p className="text-[10px] text-muted">
        Full executive dashboard (stall detection, SLA, team assignment) ships in a future sprint.
      </p>
    </div>
  );
}
