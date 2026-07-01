"use client";

import { useCallback, useEffect, useState } from "react";

import type { ActivityFeedResponse } from "@/lib/activity-feed-types";

import { AttentionQueue } from "./AttentionQueue";
import { FeedRow } from "./FeedRow";

interface ActivityFeedProps {
  variant?: "home" | "rail";
  /** Mark home visit after load (Simple Home “since you last visit”). */
  markVisitOnMount?: boolean;
  className?: string;
}

export function ActivityFeed({
  variant = "home",
  markVisitOnMount = false,
  className = "",
}: ActivityFeedProps) {
  const [data, setData] = useState<ActivityFeedResponse | null>(null);
  const compact = variant === "rail";

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/activity/feed", { cache: "no-store" });
      if (!res.ok) return;
      setData((await res.json()) as ActivityFeedResponse);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!markVisitOnMount || !data) return;
    return () => {
      void fetch("/api/activity/visit", { method: "POST" });
    };
  }, [markVisitOnMount, data]);

  const attention = data?.attention ?? [];
  const items = data?.items ?? [];
  const sinceCount = [...attention, ...items].filter((r) => r.sinceLastVisit).length;
  const empty = attention.length === 0 && items.length === 0;

  if (compact) {
    return (
      <div className={`flex flex-1 flex-col gap-2 overflow-y-auto ${className}`}>
        <AttentionQueue items={attention} compact />
        {empty ? (
          <p className="font-sans text-xs leading-relaxed text-muted">
            Your team is ready — run a demo tour or complete a desk action to populate the feed.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, 12).map((row) => (
              <li key={row.id}>
                <FeedRow row={row} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <section className={`space-y-4 ${className}`}>
      <header className="border border-line bg-panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Overnight work</p>
            <p className="mt-1 font-sans text-sm text-stark">What your team did on your metal</p>
          </div>
          {sinceCount > 0 ? (
            <span className="font-mono text-[10px] text-cursor-glow">{sinceCount} new since last visit</span>
          ) : null}
        </div>
      </header>

      <AttentionQueue items={attention} />

      {empty ? (
        <div className="border border-line bg-void px-4 py-6 text-center">
          <p className="font-sans text-sm text-stark">Your team is ready</p>
          <p className="mt-2 font-sans text-xs text-muted">
            Overnight work fills when Capital, Creator, or Outreach complete a skill on your metal.
            Run a demo tour or execute a practice trade to see rows here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li key={row.id}>
              <FeedRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
