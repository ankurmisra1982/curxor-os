import "server-only";

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(your\s+)?(system|safety)\s+(prompt|rules?)/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /<\s*system\s*>/gi,
  /\[INST\]/gi,
  /###\s*instruction/gi,
  /act\s+as\s+(if\s+)?you\s+(are|were)/gi,
];

/** Strip common prompt-injection patterns from inbound mail before LLM context. */
export function sanitizeMailBody(text: string): string {
  let out = text.replace(/\0/g, "").slice(0, 8000);
  for (const pattern of INJECTION_PATTERNS) {
    out = out.replace(pattern, "[filtered]");
  }
  return out.trim();
}

export function sanitizeMailForLlm(subject: string, body: string): { subject: string; body: string } {
  return {
    subject: sanitizeMailBody(subject).slice(0, 500),
    body: sanitizeMailBody(body),
  };
}
