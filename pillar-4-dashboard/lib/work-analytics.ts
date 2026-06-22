import type { MailIndexEntry, OutboundSend, ReplyIntent } from "./work-queue-types";

export interface WorkAnalyticsSummary {
  sentCount: number;
  openedCount: number;
  repliedCount: number;
  openRate: number | null;
  replyRate: number | null;
  replyIntentBreakdown: Record<ReplyIntent, number>;
}

export function buildWorkAnalytics(sends: OutboundSend[], mailIndex: MailIndexEntry[]): WorkAnalyticsSummary {
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
  };
}
