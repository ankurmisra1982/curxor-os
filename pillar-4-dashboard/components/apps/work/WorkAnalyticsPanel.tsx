"use client";

import type { WorkQueueStatus } from "@/lib/work-queue-types";
import { REPLY_INTENT_LABELS } from "@/lib/work-reply-intent";

interface WorkAnalyticsPanelProps {
  analytics: WorkQueueStatus["analytics"];
  sendPolicy: WorkQueueStatus["sendPolicy"];
  lite?: boolean;
}

export function WorkAnalyticsPanel({ analytics, sendPolicy, lite }: WorkAnalyticsPanelProps) {
  const intents = lite ? [] : Object.entries(analytics.replyIntentBreakdown).filter(([, n]) => n > 0);

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
      {!lite && analytics.stepStats?.length ? (
        <div className="border border-line bg-panel/40 p-3 md:col-span-2">
          <p className="uppercase tracking-widest text-muted">Sequence step analytics</p>
          <div className="mt-2 space-y-1">
            {analytics.stepStats.map((row) => (
              <div key={row.stepIndex} className="flex flex-wrap gap-3 text-stark">
                <span>Step {row.stepIndex + 1}</span>
                <span className="text-muted">
                  sent {row.sent} · open {row.openRate ?? 0}% · reply {row.replyRate ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
