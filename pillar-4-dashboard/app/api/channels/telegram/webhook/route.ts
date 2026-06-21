export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getChannelConfig } from "@/lib/agent-runtime/channel-store";
import { handleTelegramUpdate } from "@/lib/agent-runtime/channel-router";

export async function POST(request: Request): Promise<Response> {
  const config = await getChannelConfig();
  if (!config.telegram.enabled) {
    return Response.json({ ok: false, error: "Telegram channel disabled" }, { status: 503 });
  }

  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (config.telegram.webhookSecret && secret !== config.telegram.webhookSecret) {
    return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  let update: Record<string, unknown>;
  try {
    update = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reply = await handleTelegramUpdate(update);
  return Response.json({ ok: true, reply });
}
