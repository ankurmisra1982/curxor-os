export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  ingestMetaSocialWebhook,
  verifyMetaWebhookSignature,
} from "@/lib/content-social-engage-ingest";
import { loadDigitalEnv } from "@/lib/digital-env";

function verifyToken(): string {
  return process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ?? process.env.CURXOR_SOCIAL_WEBHOOK_VERIFY_TOKEN?.trim() ?? "curxor-social-engage";
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken() && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return Response.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const env = await loadDigitalEnv();
  if (!verifyMetaWebhookSignature(rawBody, signature, env.META_APP_SECRET)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ingested = await ingestMetaSocialWebhook(body);
  return Response.json({ ok: true, ingested });
}
