"use client";

import Link from "next/link";
import { useState } from "react";

import type { ActivityFeedRow } from "@/lib/activity-feed-types";

const TIER_BORDER: Record<ActivityFeedRow["tier"], string> = {
  approval: "border-amber-500/40",
  error: "border-red-500/40",
  success: "border-emerald-500/30",
  info: "border-cursor-glow/30",
  system: "border-line",
};

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const delta = Date.now() - t;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface FeedRowProps {
  row: ActivityFeedRow;
  compact?: boolean;
}

export function FeedRow({ row, compact = false }: FeedRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasEvidence = Boolean(row.evidence);

  const body = (
    <div
      className={`border bg-void transition hover:bg-panel ${TIER_BORDER[row.tier]} ${compact ? "px-3 py-2" : "px-4 py-3"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-cursor-glow">{row.claw}</span>
            {row.sinceLastVisit ? (
              <span className="rounded bg-cursor-glow/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-cursor-glow">
                New
              </span>
            ) : null}
          </div>
          <p className={`mt-1 font-sans text-stark ${compact ? "text-xs" : "text-sm"}`}>{row.summary}</p>
          {hasEvidence && expanded ? (
            <p className="mt-1 font-sans text-[11px] leading-relaxed text-muted">{row.evidence}</p>
          ) : hasEvidence ? (
            <p className="mt-0.5 truncate font-sans text-[11px] text-muted">{row.evidence}</p>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-[9px] text-muted">{formatWhen(row.timestamp)}</span>
      </div>
      {hasEvidence && !row.href ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 font-sans text-[10px] text-cursor-glow hover:underline"
        >
          {expanded ? "Hide evidence" : "Show evidence"}
        </button>
      ) : null}
    </div>
  );

  if (row.href) {
    return (
      <Link href={row.href} className="block">
        {body}
      </Link>
    );
  }

  return body;
}
