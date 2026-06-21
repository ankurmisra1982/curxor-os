import type { ReplyIntent } from "./work-queue-types";

const OOO = /\b(out of office|ooo|away from|on vacation|auto.?reply|automatic reply)\b/i;
const OBJECTION = /\b(not interested|unsubscribe|remove me|stop emailing|no thanks|pass on)\b/i;
const INTERESTED = /\b(interested|schedule|book a call|demo|pricing|let'?s talk|sounds good|yes\b|call me)\b/i;

export function classifyReplyIntent(subject: string, snippet: string): ReplyIntent {
  const text = `${subject} ${snippet}`.trim();
  if (!text) return "unknown";
  if (OOO.test(text)) return "ooo";
  if (OBJECTION.test(text)) return "objection";
  if (INTERESTED.test(text)) return "interested";
  if (/\bre:\b/i.test(subject)) return "neutral";
  return "unknown";
}

export const REPLY_INTENT_LABELS: Record<ReplyIntent, string> = {
  interested: "Interested",
  objection: "Objection",
  ooo: "Out of office",
  neutral: "Neutral",
  unknown: "Unknown",
};

export type { ReplyIntent };
