export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildGarminAuthorizeUrl, exchangeGarminCode, refreshGarminTokensIfNeeded } from "@/lib/garmin-oauth-flow";
import { clearGarminOAuth, getGarminOAuthConfig, readGarminOAuthState } from "@/lib/garmin-oauth-store";
import { parseAuthorizationCode } from "@/lib/oauth/pkce";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    const result = await exchangeGarminCode(code, state);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({
      ok: true,
      linked: true,
      expiresAt: result.tokens.expiresAt,
      message: "Garmin linked. You can close this tab.",
    });
  }

  await refreshGarminTokensIfNeeded();
  const refreshed = await readGarminOAuthState();
  const config = getGarminOAuthConfig();

  return Response.json({
    ok: true,
    linked: refreshed.linked,
    expiresAt: refreshed.tokens?.expiresAt ?? null,
    clientConfigured: Boolean(config.clientId && config.clientSecret),
    redirectUri: config.redirectUri,
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
    const link = buildGarminAuthorizeUrl();
    if ("error" in link) return Response.json({ ok: false, error: link.error }, { status: 400 });
    return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
  }

  if (body.action === "exchange") {
    const code = parseAuthorizationCode(body.callbackUrl ?? body.code ?? "");
    if (!code || !body.state) {
      return Response.json({ error: "code and state required" }, { status: 400 });
    }
    const result = await exchangeGarminCode(code, body.state);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, linked: true, expiresAt: result.tokens.expiresAt });
  }

  if (body.action === "refresh") {
    const tokens = await refreshGarminTokensIfNeeded();
    if (!tokens) return Response.json({ ok: false, error: "No linked Garmin account" }, { status: 404 });
    return Response.json({ ok: true, expiresAt: tokens.expiresAt });
  }

  if (body.action === "unlink") {
    await clearGarminOAuth();
    return Response.json({ ok: true, linked: false });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
