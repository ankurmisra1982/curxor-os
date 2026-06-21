import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/** Verify Slack Events API request signature (v0). */
export function verifySlackSignature(
  signingSecret: string,
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  maxAgeSec = 60 * 5,
): boolean {
  if (!signingSecret || !timestamp || !signature) return false;
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const age = Math.abs(Date.now() / 1000 - ts);
  if (age > maxAgeSec) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const digest = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function resolveSlackSigningSecret(
  configSecret: string | null | undefined,
  envSecret?: string,
): string {
  return (configSecret ?? "").trim() || (envSecret ?? "").trim() || process.env.SLACK_SIGNING_SECRET?.trim() || "";
}
