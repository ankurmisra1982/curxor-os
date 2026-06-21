export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  exchangeEtradeVerifier,
  getEtradeOAuthConfig,
  isEtradeBrokerLinked,
  startEtradeOAuth,
  unlinkEtradeBroker,
} from "@/lib/capital-etrade-oauth";
import { readCapitalBrokerOAuth } from "@/lib/capital-broker-oauth-store";
import { requireLanAuth } from "@/lib/lan-auth";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const verifier = url.searchParams.get("oauth_verifier") ?? url.searchParams.get("verifier");
  const state = url.searchParams.get("oauth_token") ?? url.searchParams.get("state");

  if (verifier && state) {
    const result = await exchangeEtradeVerifier(verifier, state);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({
      ok: true,
      linked: true,
      message: "E*TRADE linked. You can close this tab.",
    });
  }

  const oauth = await readCapitalBrokerOAuth("etrade");
  const config = getEtradeOAuthConfig();

  return Response.json({
    ok: true,
    linked: oauth.linked,
    clientConfigured: Boolean(config.consumerKey && config.consumerSecret),
    sandbox: config.sandbox,
    redirectUri: config.redirectUri,
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { action?: string; verifier?: string; state?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "start") {
    const result = await startEtradeOAuth();
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, authorizeUrl: result.authorizeUrl, state: result.state });
  }

  if (body.action === "exchange") {
    if (!body.verifier || !body.state) {
      return Response.json({ error: "verifier and state required" }, { status: 400 });
    }
    const result = await exchangeEtradeVerifier(body.verifier, body.state);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, linked: true });
  }

  if (body.action === "unlink") {
    await unlinkEtradeBroker();
    return Response.json({ ok: true, linked: false });
  }

  if (body.action === "status") {
    return Response.json({ ok: true, linked: await isEtradeBrokerLinked() });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
