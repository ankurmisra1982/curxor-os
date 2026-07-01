"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ActivityFeedResponse } from "@/lib/activity-feed-types";
import { buildActivityFeedSummary } from "@/lib/activity-feed-summary";

export function useActivityFeed(pollMs = 30_000) {
  const [data, setData] = useState<ActivityFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/activity/feed", { cache: "no-store" });
      if (!res.ok) return;
      setData((await res.json()) as ActivityFeedResponse);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  const attention = data?.attention ?? [];
  const items = data?.items ?? [];
  const summary = useMemo(
    () => data?.summary ?? buildActivityFeedSummary(items),
    [data?.summary, items],
  );
  const empty = !loading && attention.length === 0 && items.length === 0;

  return { loading, attention, items, summary, empty, reload: load };
}
