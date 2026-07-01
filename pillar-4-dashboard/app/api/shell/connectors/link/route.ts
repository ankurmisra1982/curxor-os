export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { fetchAlpacaAccount, loadAlpacaCreds } from "@/lib/capital-alpaca-client";
import { buildSnapTradeLoginUrl } from "@/lib/capital-snaptrade-oauth";
import { getConnectorLinkDefinition } from "@/lib/connector-link-catalog";
import { writeDigitalEnvVars } from "@/lib/digital-env-store";
import { privacyEgressDeniedResponse } from "@/lib/egress-policy";
import { requireLanAuth } from "@/lib/lan-auth";
import { getSocialChannel } from "@/lib/social-channels";
import {
  buildWorkGoogleAuthorizeUrl,
  exchangeWorkGoogleCode,
} from "@/lib/work-google-oauth";
import {
  buildWorkHubSpotAuthorizeUrl,
  exchangeWorkHubSpotCode,
} from "@/lib/work-hubspot-oauth";
import {
  buildWorkMicrosoftAuthorizeUrl,
} from "@/lib/work-microsoft-oauth";
import { parseAuthorizationCode } from "@/lib/oauth/pkce";

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  const privacyDenied = await privacyEgressDeniedResponse();
  if (privacyDenied) return privacyDenied;

  let body: {
    connectorId?: string;
    action?: string;
    credentials?: Record<string, string>;
    code?: string;
    state?: string;
    callbackUrl?: string;
    accountLabel?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const connectorId = body.connectorId?.trim();
  const action = body.action?.trim() ?? "start";
  if (!connectorId) {
    return Response.json({ error: "connectorId required" }, { status: 400 });
  }

  const def = getConnectorLinkDefinition(connectorId);
  if (!def) {
    return Response.json({ error: "Unknown connector" }, { status: 400 });
  }

  if (connectorId === "google_workspace") {
    if (action === "start") {
      const link = buildWorkGoogleAuthorizeUrl();
      if ("error" in link) {
        return Response.json({
          ok: true,
          demo: true,
          detail: "Gmail is not wired on this box yet — skip for now or add Google OAuth keys in digital.env.",
          steps: [
            "Open Google Cloud Console and create an OAuth client (Web application).",
            "Add redirect URI: http://127.0.0.1:3080/api/work/google",
            "Set CURXOR_GOOGLE_OAUTH_CLIENT_ID and CURXOR_GOOGLE_OAUTH_CLIENT_SECRET in scripts/dev-qa/digital.env.",
            "Restart npm run dev, then connect from Settings → Integrations.",
          ],
          envKeys: ["CURXOR_GOOGLE_OAUTH_CLIENT_ID", "CURXOR_GOOGLE_OAUTH_CLIENT_SECRET"],
          docsUrl: def.docsUrl,
        });
      }
      return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
    }
    if (action === "exchange" || action === "link") {
      const code = parseAuthorizationCode(body.callbackUrl ?? body.code ?? "");
      if (!code || !body.state) {
        return Response.json({ error: "code and state required" }, { status: 400 });
      }
      const result = await exchangeWorkGoogleCode(code, body.state);
      if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
      return Response.json({ ok: true, linked: true, expiresAt: result.tokens.expiresAt });
    }
  }

  if (connectorId === "microsoft_365") {
    if (action === "start") {
      const link = buildWorkMicrosoftAuthorizeUrl();
      if ("error" in link) {
        return Response.json({ ok: true, demo: true, message: link.error });
      }
      return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
    }
  }

  if (connectorId === "hubspot") {
    if (action === "start") {
      const link = buildWorkHubSpotAuthorizeUrl();
      if ("authorizeUrl" in link) {
        return Response.json({ ok: true, authorizeUrl: link.authorizeUrl, state: link.state });
      }
      return Response.json({ ok: true, demo: true, detail: link.detail });
    }
    if (action === "exchange" || action === "link") {
      const code = parseAuthorizationCode(body.callbackUrl ?? body.code ?? "");
      if (!code || !body.state) {
        return Response.json({ error: "code and state required" }, { status: 400 });
      }
      const result = await exchangeWorkHubSpotCode(code, body.state);
      if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
      return Response.json({ ok: true, linked: true, hubId: result.tokens.hubId });
    }
  }

  if (connectorId === "alpaca_paper") {
    if (action === "verify") {
      const creds = await loadAlpacaCreds();
      if (!creds) {
        return Response.json({
          ok: true,
          connected: false,
          detail: "Add ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY to digital.env, then verify again.",
          envKeys: def.envKeys ?? [],
        });
      }
      const account = await fetchAlpacaAccount(creds);
      if (!account) {
        return Response.json({
          ok: true,
          connected: false,
          detail: "Keys found but Alpaca account unreachable — check paper base URL.",
        });
      }
      return Response.json({
        ok: true,
        connected: true,
        detail: `Alpaca paper connected · equity $${account.equity?.toFixed(2) ?? "—"}`,
        equity: account.equity,
      });
    }
    return Response.json({
      ok: true,
      mode: "guided",
      signupUrl: def.signupUrl,
      docsUrl: def.docsUrl,
      envKeys: def.envKeys ?? [],
      steps: [
        "Sign up for Alpaca paper trading (free).",
        "Generate API key + secret in the Alpaca dashboard.",
        `Paste ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY into digital.env on this appliance.`,
        'Return here and click "Verify connection".',
      ],
    });
  }

  if (connectorId === "bluesky") {
    if (action === "save" || action === "start") {
      const credentials = body.credentials ?? {};
      const ch = getSocialChannel("bluesky");
      const updates: Record<string, string> = {};
      for (const key of ch.envKeys) {
        const raw = credentials[key];
        if (typeof raw === "string" && raw.trim()) updates[key] = raw.trim();
      }
      if (Object.keys(updates).length === 0) {
        return Response.json({ ok: false, error: "Enter Bluesky handle and app password" }, { status: 400 });
      }
      await writeDigitalEnvVars(updates);
      return Response.json({ ok: true, saved: Object.keys(updates), connected: true });
    }
  }

  if (connectorId === "snaptrade" && action === "start") {
    const result = await buildSnapTradeLoginUrl();
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, authorizeUrl: result.loginLink, userId: result.userId });
  }

  if (connectorId === "robinhood_mcp" && action === "start") {
    return Response.json({
      ok: true,
      mode: "guided",
      mcpUrl: "https://agent.robinhood.com/mcp/trading",
      docsUrl: def.docsUrl,
      steps: [
        "Set ROBINHOOD_MCP_ENABLED=1 in digital.env.",
        "Open Robinhood Agentic Trading and complete OAuth.",
        "Add the MCP URL to your agent if needed.",
        "Mark connected in Capital Claw or POST /api/capital/robinhood.",
      ],
    });
  }

  return Response.json({ error: "Unsupported action for connector" }, { status: 400 });
}
