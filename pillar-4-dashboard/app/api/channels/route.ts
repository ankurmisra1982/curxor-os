export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  ensureIMessageWebhookSecret,
  ensureTelegramWebhookSecret,
  ensureWhatsAppVerifyToken,
  getChannelConfig,
  listChannelSessions,
  updateChannelConfig,
} from "@/lib/agent-runtime/channel-store";
import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const includeSessions = url.searchParams.get("sessions") === "1";
  const config = await getChannelConfig();
  const sessions = includeSessions ? await listChannelSessions() : undefined;
  return Response.json({ ok: true, config, sessions });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: {
    action?: string;
    enabled?: boolean;
    defaultAppId?: string;
    telegram?: { enabled?: boolean; botUsername?: string | null };
    slack?: { enabled?: boolean; signingSecret?: string | null };
    whatsapp?: { enabled?: boolean; verifyToken?: string | null; phoneNumberId?: string | null };
    imessage?: { enabled?: boolean; webhookSecret?: string | null };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "ensure_telegram_secret") {
    const secret = await ensureTelegramWebhookSecret();
    const config = await getChannelConfig();
    return Response.json({ ok: true, webhookSecret: secret, config });
  }

  if (body.action === "ensure_whatsapp_verify_token") {
    const token = await ensureWhatsAppVerifyToken();
    const config = await getChannelConfig();
    return Response.json({ ok: true, verifyToken: token, config });
  }

  if (body.action === "ensure_imessage_secret") {
    const secret = await ensureIMessageWebhookSecret();
    const config = await getChannelConfig();
    return Response.json({ ok: true, webhookSecret: secret, config });
  }

  const patch: Parameters<typeof updateChannelConfig>[0] = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.defaultAppId && isValidAppId(body.defaultAppId)) {
    patch.defaultAppId = body.defaultAppId as OotbAppId;
  }
  if (body.telegram) {
    const current = await getChannelConfig();
    patch.telegram = { ...current.telegram, ...body.telegram };
  }
  if (body.slack) {
    const current = await getChannelConfig();
    patch.slack = { ...current.slack, ...body.slack };
  }
  if (body.whatsapp) {
    const current = await getChannelConfig();
    patch.whatsapp = { ...current.whatsapp, ...body.whatsapp };
  }
  if (body.imessage) {
    const current = await getChannelConfig();
    patch.imessage = { ...current.imessage, ...body.imessage };
  }

  const config = await updateChannelConfig(patch);
  return Response.json({ ok: true, config });
}
