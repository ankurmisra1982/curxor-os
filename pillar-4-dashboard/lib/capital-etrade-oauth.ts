import "server-only";

import { buildOAuth1AuthorizationHeader } from "./oauth/oauth1-sign";
import {
  clearCapitalBrokerOAuth,
  readCapitalBrokerOAuth,
  writeCapitalBrokerOAuthTokens,
  type CapitalBrokerOAuthTokens,
} from "./capital-broker-oauth-store";

interface PendingEtradeLink {
  requestToken: string;
  requestTokenSecret: string;
  createdAt: number;
}

const pending = new Map<string, PendingEtradeLink>();
const PENDING_TTL_MS = 15 * 60 * 1000;

export function getEtradeOAuthConfig(): {
  consumerKey: string | null;
  consumerSecret: string | null;
  redirectUri: string;
  sandbox: boolean;
  oauthBase: string;
  apiBase: string;
} {
  const consumerKey = process.env.ETRADE_CONSUMER_KEY?.trim() || null;
  const consumerSecret = process.env.ETRADE_CONSUMER_SECRET?.trim() || null;
  const redirectUri = process.env.ETRADE_REDIRECT_URI?.trim() || "http://127.0.0.1:3080/api/capital/etrade";
  const sandbox = process.env.ETRADE_SANDBOX?.trim() === "1" || process.env.ETRADE_SANDBOX?.trim() === "true";
  const oauthBase = "https://api.etrade.com";
  const apiBase = sandbox ? "https://apisb.etrade.com" : "https://api.etrade.com";
  return { consumerKey, consumerSecret, redirectUri, sandbox, oauthBase, apiBase };
}

function purgePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, val] of pending) {
    if (val.createdAt < cutoff) pending.delete(key);
  }
}

function parseFormBody(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

export async function startEtradeOAuth(): Promise<
  { ok: true; authorizeUrl: string; state: string } | { ok: false; error: string }
> {
  const { consumerKey, consumerSecret, redirectUri, oauthBase } = getEtradeOAuthConfig();
  if (!consumerKey || !consumerSecret) {
    return { ok: false, error: "ETRADE_CONSUMER_KEY / ETRADE_CONSUMER_SECRET not configured" };
  }

  purgePending();
  const requestUrl = `${oauthBase}/oauth/request_token`;
  const { header } = buildOAuth1AuthorizationHeader({
    method: "GET",
    url: requestUrl,
    consumerKey,
    consumerSecret,
    callback: redirectUri,
  });

  const res = await fetch(requestUrl, { headers: { Authorization: header } });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: `E*TRADE request_token failed: ${text.slice(0, 200)}` };

  const data = parseFormBody(text);
  const requestToken = data.oauth_token;
  const requestTokenSecret = data.oauth_token_secret;
  if (!requestToken || !requestTokenSecret) {
    return { ok: false, error: "E*TRADE request_token response missing tokens" };
  }

  const state = requestToken;
  pending.set(state, { requestToken, requestTokenSecret, createdAt: Date.now() });

  const authorizeUrl = `https://us.etrade.com/e/t/etws/authorize?key=${encodeURIComponent(consumerKey)}&token=${encodeURIComponent(requestToken)}`;
  return { ok: true, authorizeUrl, state };
}

export async function exchangeEtradeVerifier(
  verifier: string,
  state: string,
): Promise<{ ok: true; tokens: CapitalBrokerOAuthTokens } | { ok: false; error: string }> {
  const { consumerKey, consumerSecret, oauthBase } = getEtradeOAuthConfig();
  if (!consumerKey || !consumerSecret) return { ok: false, error: "E*TRADE credentials not configured" };

  const session = pending.get(state);
  pending.delete(state);
  if (!session) return { ok: false, error: "Invalid or expired E*TRADE OAuth session" };

  const accessUrl = `${oauthBase}/oauth/access_token`;
  const { header } = buildOAuth1AuthorizationHeader({
    method: "GET",
    url: accessUrl,
    consumerKey,
    consumerSecret,
    token: session.requestToken,
    tokenSecret: session.requestTokenSecret,
    verifier,
  });

  const res = await fetch(`${accessUrl}?oauth_verifier=${encodeURIComponent(verifier)}`, {
    headers: { Authorization: header },
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: `E*TRADE access_token failed: ${text.slice(0, 200)}` };

  const data = parseFormBody(text);
  const accessToken = data.oauth_token;
  const accessTokenSecret = data.oauth_token_secret;
  if (!accessToken || !accessTokenSecret) {
    return { ok: false, error: "E*TRADE access_token response missing tokens" };
  }

  const tokens: CapitalBrokerOAuthTokens = {
    accessToken,
    refreshToken: null,
    accessTokenSecret,
    expiresAt: null,
    accountId: null,
    scope: null,
    updatedAt: new Date().toISOString(),
  };

  await writeCapitalBrokerOAuthTokens("etrade", tokens);
  return { ok: true, tokens };
}

export async function isEtradeBrokerLinked(): Promise<boolean> {
  const state = await readCapitalBrokerOAuth("etrade");
  return state.linked && Boolean(state.tokens?.accessToken && state.tokens.accessTokenSecret);
}

export async function unlinkEtradeBroker(): Promise<void> {
  await clearCapitalBrokerOAuth("etrade");
}
