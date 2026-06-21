export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getChannelConfig } from "@/lib/agent-runtime/channel-store";
import { handleSlackEvent } from "@/lib/agent-runtime/channel-router";
import { resolveSlackSigningSecret, verifySlackSignature } from "@/lib/agent-runtime/slack-verify";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type === "url_verification" && typeof payload.challenge === "string") {
    return Response.json({ challenge: payload.challenge });
  }

  const config = await getChannelConfig();
  if (!config.enabled || !config.slack.enabled) {
    return Response.json({ ok: false, error: "Slack channel disabled" }, { status: 503 });
  }
  const signingSecret = resolveSlackSigningSecret(config.slack.signingSecret);
  const signature = request.headers.get("x-slack-signature");
  const timestamp = request.headers.get("x-slack-request-timestamp");

  if (signingSecret && !verifySlackSignature(signingSecret, rawBody, timestamp, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const reply = await handleSlackEvent(payload);
  return Response.json({ ok: true, reply });
}
