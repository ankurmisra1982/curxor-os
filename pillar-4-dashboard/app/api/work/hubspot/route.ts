export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { parseAuthorizationCode } from "@/lib/oauth/pkce";
import {
  buildWorkHubSpotAuthorizeUrl,
  exchangeWorkHubSpotCode,
  getWorkHubSpotOAuthConfig,
  isWorkHubSpotLinked,
  readWorkHubSpotOAuth,
  unlinkWorkHubSpot,
} from "@/lib/work-hubspot-oauth";
import { pullHubSpotWebhookStub, syncHubSpotLeads } from "@/lib/work-hubspot-sync";
import { fetchWorkStatus } from "@/lib/work-store";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    const result = await exchangeWorkHubSpotCode(code, state);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({
      ok: true,
      linked: true,
      hubId: result.tokens.hubId,
      expiresAt: result.tokens.expiresAt,
      message: "HubSpot linked. You can close this tab.",
    });
  }

  const oauth = await readWorkHubSpotOAuth();
  const config = getWorkHubSpotOAuthConfig();
  const linked = await isWorkHubSpotLinked();

  return Response.json({
    ok: true,
    linked,
    demo: !config.clientId,
    hubId: oauth.tokens?.hubId ?? null,
    expiresAt: oauth.tokens?.expiresAt ?? null,
    clientConfigured: Boolean(config.clientId && config.clientSecret),
    redirectUri: config.redirectUri,
    scopes: "crm.objects.contacts.read, crm.objects.contacts.write",
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
    const link = buildWorkHubSpotAuthorizeUrl();
    if ("authorizeUrl" in link) {
      return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
    }
    return Response.json({ ok: true, demo: true, detail: link.detail });
  }

  if (body.action === "link" || body.action === "exchange") {
    const code = parseAuthorizationCode(body.callbackUrl ?? body.code ?? "");
    if (!code || !body.state) {
      return Response.json({ error: "code and state required" }, { status: 400 });
    }
    const result = await exchangeWorkHubSpotCode(code, body.state);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, linked: true, hubId: result.tokens.hubId, expiresAt: result.tokens.expiresAt });
  }

  if (body.action === "unlink") {
    await unlinkWorkHubSpot();
    return Response.json({ ok: true, linked: false });
  }

  if (body.action === "webhook_pull_stub") {
    const result = await pullHubSpotWebhookStub();
    return Response.json({ ...result, status: await fetchWorkStatus() });
  }

  if (body.action === "sync" || body.action === "sync_hubspot" || !body.action) {
    const result = await syncHubSpotLeads();
    return Response.json({ ...result, status: await fetchWorkStatus() });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
