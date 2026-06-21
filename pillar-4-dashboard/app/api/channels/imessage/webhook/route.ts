export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createHash, timingSafeEqual } from "node:crypto";

import {
  ensureIMessageWebhookSecret,
  getChannelConfig,
} from "@/lib/agent-runtime/channel-store";
import { handleIMessageWebhook } from "@/lib/agent-runtime/channel-router";

function verifySecret(header: string | null, expected: string): boolean {
  if (!header) return false;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const config = await getChannelConfig();
  if (!config.enabled || !config.imessage.enabled) {
    return Response.json({ ok: false, error: "iMessage channel disabled" }, { status: 503 });
  }

  const secret =
    config.imessage.webhookSecret?.trim() ||
    process.env.IMESSAGE_WEBHOOK_SECRET?.trim() ||
    (await ensureIMessageWebhookSecret());

  const authHeader = request.headers.get("x-curxor-imessage-secret");
  if (!verifySecret(authHeader, secret)) {
    return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reply = await handleIMessageWebhook(body);
  return Response.json({ ok: true, reply });
}

export async function GET(): Promise<Response> {
  const config = await getChannelConfig();
  const secret = config.imessage.webhookSecret ?? (await ensureIMessageWebhookSecret());
  return Response.json({
    ok: true,
    webhook: "/api/channels/imessage/webhook",
    header: "x-curxor-imessage-secret",
    secretConfigured: Boolean(secret),
    enabled: config.imessage.enabled,
  });
}
