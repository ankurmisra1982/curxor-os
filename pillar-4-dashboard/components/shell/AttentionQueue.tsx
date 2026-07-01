"use client";

import type { ActivityFeedRow } from "@/lib/activity-feed-types";

import { FeedRow } from "./FeedRow";

interface AttentionQueueProps {
  items: ActivityFeedRow[];
  compact?: boolean;
  className?: string;
}

export function AttentionQueue({ items, compact = false, className = "" }: AttentionQueueProps) {
  if (items.length === 0) return null;

  return (
    <section className={`border border-amber-500/40 bg-amber-500/5 ${className}`}>
      <header className={`border-b border-amber-500/30 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">Needs your OK</p>
        {!compact ? (
          <p className="mt-1 font-sans text-xs text-muted">
            Trades, sends, and publishes waiting on sovereign approval.
          </p>
        ) : null}
      </header>
      <ul className="divide-y divide-amber-500/20">
        {items.map((row) => (
          <li key={row.id}>
            <FeedRow row={row} compact={compact} />
          </li>
        ))}
      </ul>
    </section>
  );
}
