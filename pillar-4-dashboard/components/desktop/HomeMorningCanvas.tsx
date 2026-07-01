"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { AttentionQueue } from "@/components/shell/AttentionQueue";
import { OvernightWorkSection } from "@/components/shell/OvernightWorkSection";
import { buildActivityFeedSummary } from "@/lib/activity-feed-summary";
import { useActivityFeed } from "@/hooks/useActivityFeed";

interface HomeMorningCanvasProps {
  hero: ReactNode;
  jobs: ReactNode;
  /** xl+ two-column: feed left, hero + jobs right */
  wideLayout?: boolean;
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-16 animate-pulse border border-line bg-panel" />
      <div className="h-14 animate-pulse border border-line bg-panel/60" />
    </div>
  );
}

export function HomeMorningCanvas({ hero, jobs, wideLayout = false }: HomeMorningCanvasProps) {
  const { loading, attention, items, summary, empty } = useActivityFeed();
  const [overnightExpanded, setOvernightExpanded] = useState(false);

  const hasAttention = attention.length > 0;
  const hasNew = summary.sinceLastVisit > 0;
  const interruptMode = hasAttention || hasNew || overnightExpanded;

  if (loading) {
    return (
      <div className="space-y-4">
        <FeedSkeleton />
        {hero}
      </div>
    );
  }

  const overnight = (
    <OvernightWorkSection
      items={items}
      summary={empty ? buildActivityFeedSummary([]) : summary}
      onExpandedChange={setOvernightExpanded}
    />
  );

  // Keep OvernightWorkSection at a stable tree position — moving it between branches
  // on expand used to remount it and flip onExpandedChange, causing a refresh loop.
  if (wideLayout) {
    return (
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,26rem)] lg:items-start lg:gap-5 lg:space-y-0 xl:gap-6">
        <div className="space-y-4">
          {interruptMode ? <AttentionQueue items={attention} /> : null}
          {overnight}
          {interruptMode ? hero : null}
        </div>
        <div className="space-y-4">
          {!interruptMode ? hero : null}
          {jobs}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interruptMode ? <AttentionQueue items={attention} /> : null}
      {!interruptMode ? hero : null}
      {overnight}
      {interruptMode ? hero : null}
      {jobs}
    </div>
  );
}
