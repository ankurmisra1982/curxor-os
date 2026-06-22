export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { parseAuthorizationCode } from "@/lib/oauth/pkce";
import {
  buildWorkMicrosoftAuthorizeUrl,
  exchangeWorkMicrosoftCode,
  getWorkMicrosoftOAuthConfig,
  isWorkMicrosoftLinked,
  readWorkMicrosoftOAuth,
  unlinkWorkMicrosoft,
} from "@/lib/work-microsoft-oauth";
import { getWorkMicrosoftStatus } from "@/lib/work-microsoft-client";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    const result = await exchangeWorkMicrosoftCode(code, state);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({
      ok: true,
      linked: true,
      expiresAt: result.tokens.expiresAt,
      message: "Microsoft 365 linked. You can close this tab.",
    });
  }

  const oauth = await readWorkMicrosoftOAuth();
  const config = getWorkMicrosoftOAuthConfig();
  const linked = await isWorkMicrosoftLinked();
  const status = await getWorkMicrosoftStatus();

  return Response.json({
    ok: true,
    ...status,
    expiresAt: oauth.tokens?.expiresAt ?? null,
    redirectUri: config.redirectUri,
    clientConfigured: Boolean(config.clientId && config.clientSecret),
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
    const link = buildWorkMicrosoftAuthorizeUrl();
    if ("error" in link) {
      const status = await getWorkMicrosoftStatus();
      return Response.json({
        ok: true,
        demo: true,
        message: link.error,
        status,
      });
    }
    return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
  }

  if (body.action === "link" || body.action === "exchange") {
    const code = parseAuthorizationCode(body.callbackUrl ?? body.code ?? "");
    if (!code || !body.state) {
      return Response.json({ error: "code and state required" }, { status: 400 });
    }
    const result = await exchangeWorkMicrosoftCode(code, body.state);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, linked: true, expiresAt: result.tokens.expiresAt });
  }

  if (body.action === "unlink") {
    await unlinkWorkMicrosoft();
    return Response.json({ ok: true, linked: false });
  }

  const status = await getWorkMicrosoftStatus();
  return Response.json({ ok: true, ...status });
}
