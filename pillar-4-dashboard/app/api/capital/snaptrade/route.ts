export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  buildSnapTradeLoginUrl,
  isSnapTradeBrokerLinked,
  markSnapTradeLinked,
  unlinkSnapTradeBroker,
} from "@/lib/capital-snaptrade-oauth";
import { isSnapTradeConfigured, readSnapTradeLink, snapTradeEnv } from "@/lib/capital-snaptrade-store";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const linkedParam = url.searchParams.get("linked");

  if (linkedParam === "1") {
    await markSnapTradeLinked();
    return Response.json({
      ok: true,
      linked: true,
      message: "SnapTrade connection marked linked. You can close this tab.",
    });
  }

  const link = await readSnapTradeLink();
  const config = await snapTradeEnv();

  return Response.json({
    ok: true,
    linked: await isSnapTradeBrokerLinked(),
    clientConfigured: await isSnapTradeConfigured(),
    redirectUri: config.redirectUri,
    userId: link?.userId ?? null,
    institutionName: link?.institutionName ?? null,
    linkedAt: link?.linkedAt ?? null,
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { action?: string; institutionName?: string; brokerAccountId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "start") {
    const result = await buildSnapTradeLoginUrl();
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, loginLink: result.loginLink, userId: result.userId });
  }

  if (body.action === "mark_linked") {
    const link = await markSnapTradeLinked({
      institutionName: body.institutionName,
      brokerAccountId: body.brokerAccountId,
    });
    if (!link) return Response.json({ ok: false, error: "Register SnapTrade user first" }, { status: 400 });
    return Response.json({ ok: true, linked: true, link });
  }

  if (body.action === "unlink") {
    await unlinkSnapTradeBroker();
    return Response.json({ ok: true, linked: false });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
