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
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-16 animate-pulse border border-line bg-panel" />
      <div className="h-14 animate-pulse border border-line bg-panel/60" />
    </div>
  );
}

export function HomeMorningCanvas({ hero, jobs }: HomeMorningCanvasProps) {
  const { loading, attention, items, summary, empty } = useActivityFeed();
  const [overnightExpanded, setOvernightExpanded] = useState(false);

  const hasAttention = attention.length > 0;
  const hasNew = summary.sinceLastVisit > 0;
  const interruptMode = hasAttention || hasNew || overnightExpanded;

  const overnight = (
    <OvernightWorkSection
      items={items}
      summary={empty ? buildActivityFeedSummary([]) : summary}
      onExpandedChange={setOvernightExpanded}
    />
  );

  const feedStack = (
    <div className="space-y-3">
      <AttentionQueue items={attention} />
      {overnight}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <FeedSkeleton />
        {hero}
      </div>
    );
  }

  if (interruptMode) {
    return (
      <div className="space-y-4">
        {feedStack}
        {hero}
        {jobs}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hero}
      {!empty ? overnight : null}
      {jobs}
      {empty ? overnight : null}
    </div>
  );
}
