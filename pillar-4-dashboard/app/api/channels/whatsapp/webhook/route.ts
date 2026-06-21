export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  ensureWhatsAppVerifyToken,
  getChannelConfig,
} from "@/lib/agent-runtime/channel-store";
import { handleWhatsAppWebhook } from "@/lib/agent-runtime/channel-router";

function resolveVerifyToken(configured: string | null): string | null {
  return (
    configured?.trim() ||
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
    process.env.CURXOR_WHATSAPP_VERIFY_TOKEN?.trim() ||
    null
  );
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const config = await getChannelConfig();
  const expected =
    resolveVerifyToken(config.whatsapp.verifyToken) ?? (await ensureWhatsAppVerifyToken());

  if (mode === "subscribe" && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return Response.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = await getChannelConfig();
  if (!config.enabled || !config.whatsapp.enabled) {
    return Response.json({ ok: false, error: "WhatsApp channel disabled" }, { status: 503 });
  }

  const replies = await handleWhatsAppWebhook(body);
  return Response.json({ ok: true, count: replies.length, replies });
}
