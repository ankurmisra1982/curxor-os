import "server-only";

import { classifyReplyIntent } from "./work-reply-intent";

const QUOTE_MARKERS = [
  /^On .+ wrote:$/im,
  /^-{2,}\s*Original Message\s*-{2,}$/im,
  /^From:\s.+$/im,
  /^_{3,}$/im,
  /^>{1,}\s/m,
];

/** Strip quoted reply tails (email-reply-parser style) for intent detection. */
export function stripQuotedReply(text: string): string {
  let out = text.replace(/\r\n/g, "\n").trim();
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(out);
    if (match?.index != null && match.index > 0) {
      out = out.slice(0, match.index).trim();
    }
  }
  const lines = out.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (/^>{1,}/.test(line.trim())) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

export function parseReplyForIntent(subject: string, body: string): { subject: string; snippet: string; intent: ReturnType<typeof classifyReplyIntent> } {
  const visible = stripQuotedReply(body);
  const snippet = visible.slice(0, 240) || body.slice(0, 240);
  return {
    subject,
    snippet,
    intent: classifyReplyIntent(subject, snippet),
  };
}

export { classifyReplyIntent } from "./work-reply-intent";
