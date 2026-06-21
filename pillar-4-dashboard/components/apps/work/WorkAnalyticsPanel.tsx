"use client";

import type { WorkQueueStatus } from "@/lib/work-queue-types";
import { REPLY_INTENT_LABELS } from "@/lib/work-reply-intent";

interface WorkAnalyticsPanelProps {
  analytics: WorkQueueStatus["analytics"];
  sendPolicy: WorkQueueStatus["sendPolicy"];
}

export function WorkAnalyticsPanel({ analytics, sendPolicy }: WorkAnalyticsPanelProps) {
  const intents = Object.entries(analytics.replyIntentBreakdown).filter(([, n]) => n > 0);

  return (
    <div className="grid gap-3 font-mono text-[10px] md:grid-cols-2">
      <div className="border border-line bg-panel/40 p-3">
        <p className="uppercase tracking-widest text-muted">Send analytics</p>
        <p className="mt-2 text-stark">
          Sent {analytics.sentCount} · Opened {analytics.openedCount}
          {analytics.openRate !== null ? ` (${analytics.openRate}%)` : ""}
        </p>
        <p className="text-muted">
          Replied {analytics.repliedCount}
          {analytics.replyRate !== null ? ` (${analytics.replyRate}%)` : ""}
        </p>
      </div>
      <div className="border border-line bg-panel/40 p-3">
        <p className="uppercase tracking-widest text-muted">Mailbox policy</p>
        <p className="mt-2 text-stark">
          {sendPolicy.sendsToday}/{sendPolicy.dailySendLimit} sent today · {sendPolicy.remainingToday} remaining
        </p>
        <p className="text-muted">Stagger: {sendPolicy.sendStaggerMinutes} min between sends</p>
      </div>
      {intents.length > 0 ? (
        <div className="border border-line bg-panel/40 p-3 md:col-span-2">
          <p className="uppercase tracking-widest text-muted">Reply intent (indexed mail)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {intents.map(([key, count]) => (
              <span key={key} className="border border-line px-2 py-0.5 text-stark">
                {REPLY_INTENT_LABELS[key as keyof typeof REPLY_INTENT_LABELS]} · {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
