export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { parseAuthorizationCode } from "@/lib/oauth/pkce";
import {
  buildWorkGoogleAuthorizeUrl,
  exchangeWorkGoogleCode,
  getWorkGoogleOAuthConfig,
  isWorkGoogleLinked,
  readWorkGoogleOAuth,
  unlinkWorkGoogle,
} from "@/lib/work-google-oauth";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    const result = await exchangeWorkGoogleCode(code, state);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({
      ok: true,
      linked: true,
      expiresAt: result.tokens.expiresAt,
      message: "Google Workspace linked. You can close this tab.",
    });
  }

  const oauth = await readWorkGoogleOAuth();
  const config = getWorkGoogleOAuthConfig();
  const linked = await isWorkGoogleLinked();

  return Response.json({
    ok: true,
    linked,
    expiresAt: oauth.tokens?.expiresAt ?? null,
    clientConfigured: Boolean(config.clientId && config.clientSecret),
    redirectUri: config.redirectUri,
    scopes: "gmail.readonly, calendar.readonly",
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
    const link = buildWorkGoogleAuthorizeUrl();
    if ("error" in link) return Response.json({ ok: false, error: link.error }, { status: 400 });
    return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
  }

  if (body.action === "link" || body.action === "exchange") {
    const code = parseAuthorizationCode(body.callbackUrl ?? body.code ?? "");
    if (!code || !body.state) {
      return Response.json({ error: "code and state required" }, { status: 400 });
    }
    const result = await exchangeWorkGoogleCode(code, body.state);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, linked: true, expiresAt: result.tokens.expiresAt });
  }

  if (body.action === "unlink") {
    await unlinkWorkGoogle();
    return Response.json({ ok: true, linked: false });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
