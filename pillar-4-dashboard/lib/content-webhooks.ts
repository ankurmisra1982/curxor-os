import "server-only";

import type { DigitalReceipt } from "./digital-protocol";
import { extractPublishedUrl } from "./digital-protocol";

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: Array<"publish.success" | "publish.failure">;
}

function webhookUrls(): string[] {
  const raw = process.env.CURXOR_CONTENT_WEBHOOK_URLS?.trim();
  if (!raw) return [];
  return raw.split(/[\s,]+/).filter((u) => u.startsWith("http"));
}

export async function notifyPublishWebhook(
  receipt: DigitalReceipt,
  postId: string | null,
): Promise<{ sent: number; errors: string[] }> {
  const urls = webhookUrls();
  if (urls.length === 0) return { sent: 0, errors: [] };

  const payload = {
    event: receipt.ok ? "publish.success" : "publish.failure",
    postId,
    tool: receipt.tool,
    ok: receipt.ok,
    url: extractPublishedUrl(receipt),
    error: receipt.error ?? null,
    timestamp: receipt.timestamp,
    receipt: receipt.receipt,
  };

  const secret = process.env.CURXOR_CONTENT_WEBHOOK_SECRET?.trim();
  const errors: string[] = [];
  let sent = 0;

  for (const url of urls) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) headers["X-CurXor-Signature"] = secret;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) sent++;
      else errors.push(`${url}: HTTP ${res.status}`);
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { sent, errors };
}
