export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  buildWebullAuthorizeUrl,
  exchangeWebullCode,
  getWebullOAuthConfig,
  refreshWebullTokensIfNeeded,
  unlinkWebullBroker,
} from "@/lib/capital-webull-oauth";
import { readCapitalBrokerOAuth } from "@/lib/capital-broker-oauth-store";
import { parseAuthorizationCode } from "@/lib/oauth/pkce";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    const result = await exchangeWebullCode(code, state);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({
      ok: true,
      linked: true,
      expiresAt: result.tokens.expiresAt,
      message: "Webull linked. You can close this tab.",
    });
  }

  await refreshWebullTokensIfNeeded();
  const oauth = await readCapitalBrokerOAuth("webull");
  const config = getWebullOAuthConfig();

  return Response.json({
    ok: true,
    linked: oauth.linked,
    expiresAt: oauth.tokens?.expiresAt ?? null,
    clientConfigured: Boolean(config.clientId && config.clientSecret),
    redirectUri: config.redirectUri,
    apiBase: config.apiBase,
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { action?: string; code?: string; state?: string; callbackUrl?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "start") {
    const link = buildWebullAuthorizeUrl();
    if ("error" in link) return Response.json({ ok: false, error: link.error }, { status: 400 });
    return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
  }

  if (body.action === "exchange") {
    const code = parseAuthorizationCode(body.callbackUrl ?? body.code ?? "");
    if (!code || !body.state) {
      return Response.json({ error: "code and state required" }, { status: 400 });
    }
    const result = await exchangeWebullCode(code, body.state);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, linked: true, expiresAt: result.tokens.expiresAt });
  }

  if (body.action === "refresh") {
    const tokens = await refreshWebullTokensIfNeeded();
    if (!tokens) return Response.json({ ok: false, error: "No linked Webull account" }, { status: 404 });
    return Response.json({ ok: true, expiresAt: tokens.expiresAt });
  }

  if (body.action === "unlink") {
    await unlinkWebullBroker();
    return Response.json({ ok: true, linked: false });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
