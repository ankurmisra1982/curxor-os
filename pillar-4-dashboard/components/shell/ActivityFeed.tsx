"use client";

import { buildActivityFeedSummary } from "@/lib/activity-feed-summary";
import { useActivityFeed } from "@/hooks/useActivityFeed";

import { AttentionQueue } from "./AttentionQueue";
import { OvernightWorkSection } from "./OvernightWorkSection";

interface ActivityFeedProps {
  variant?: "home" | "rail";
  className?: string;
}

function FeedSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className={`border border-line bg-panel animate-pulse ${compact ? "h-16" : "h-20"}`} />
  );
}

export function ActivityFeed({ variant = "home", className = "" }: ActivityFeedProps) {
  const { loading, attention, items, summary, empty } = useActivityFeed();
  const compact = variant === "rail";

  if (loading) {
    return (
      <div className={compact ? `flex flex-1 flex-col gap-2 ${className}` : `space-y-4 ${className}`}>
        <FeedSkeleton compact={compact} />
        {!compact ? <FeedSkeleton compact={false} /> : null}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex flex-1 flex-col gap-2 overflow-y-auto ${className}`}>
        <AttentionQueue items={attention} compact />
        {empty ? (
          <p className="font-sans text-xs leading-relaxed text-muted">
            Your team is ready — run a demo tour or complete a desk action to populate the feed.
          </p>
        ) : (
          <OvernightWorkSection items={items.slice(0, 12)} summary={summary} compact />
        )}
      </div>
    );
  }

  return (
    <section className={`space-y-4 ${className}`}>
      <AttentionQueue items={attention} />
      {empty ? (
        <OvernightWorkSection items={[]} summary={buildActivityFeedSummary([])} />
      ) : (
        <OvernightWorkSection items={items} summary={summary} />
      )}
    </section>
  );
}
