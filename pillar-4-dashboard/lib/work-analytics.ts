import type { MailIndexEntry, OutboundSend, ReplyIntent, WorkSequence } from "./work-queue-types";

export interface SequenceStepAnalyticsRow {
  stepIndex: number;
  sent: number;
  opened: number;
  replied: number;
  openRate: number | null;
  replyRate: number | null;
}

export interface WorkAnalyticsSummary {
  sentCount: number;
  openedCount: number;
  repliedCount: number;
  openRate: number | null;
  replyRate: number | null;
  replyIntentBreakdown: Record<ReplyIntent, number>;
  stepStats: SequenceStepAnalyticsRow[];
}

export function buildSequenceStepAnalytics(
  sends: OutboundSend[],
  sequences: WorkSequence[],
): SequenceStepAnalyticsRow[] {
  const stepIndexByKey = new Map<string, number>();
  for (const seq of sequences) {
    seq.steps.forEach((step, idx) => stepIndexByKey.set(`${seq.id}:${step.id}`, idx));
  }

  const buckets = new Map<number, { sent: number; opened: number; replied: number }>();
  for (const send of sends.filter((s) => s.status === "sent" || s.status === "simulated")) {
    const idx = stepIndexByKey.get(`${send.sequenceId}:${send.stepId}`) ?? 0;
    const bucket = buckets.get(idx) ?? { sent: 0, opened: 0, replied: 0 };
    bucket.sent += 1;
    if (send.openedAt) bucket.opened += 1;
    if (send.repliedAt) bucket.replied += 1;
    buckets.set(idx, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([stepIndex, stats]) => ({
      stepIndex,
      sent: stats.sent,
      opened: stats.opened,
      replied: stats.replied,
      openRate: stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : null,
      replyRate: stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : null,
    }));
}

export function buildWorkAnalytics(
  sends: OutboundSend[],
  mailIndex: MailIndexEntry[],
  sequences: WorkSequence[] = [],
): WorkAnalyticsSummary {
  const sent = sends.filter((s) => s.status === "sent" || s.status === "simulated");
  const openedCount = sent.filter((s) => s.openedAt).length;
  const repliedCount = sent.filter((s) => s.repliedAt).length;
  const sentCount = sent.length;

  const breakdown: Record<ReplyIntent, number> = {
    interested: 0,
    objection: 0,
    ooo: 0,
    neutral: 0,
    unknown: 0,
  };

  for (const row of mailIndex) {
    if (!row.matchedReply || !row.replyIntent) continue;
    breakdown[row.replyIntent as ReplyIntent] += 1;
  }

  return {
    sentCount,
    openedCount,
    repliedCount,
    openRate: sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : null,
    replyRate: sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : null,
    replyIntentBreakdown: breakdown,
    stepStats: buildSequenceStepAnalytics(sends, sequences),
  };
}
