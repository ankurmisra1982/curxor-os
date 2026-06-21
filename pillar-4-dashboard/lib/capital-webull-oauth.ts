import "server-only";

import { createPkcePair, generateOAuthState } from "./oauth/pkce";
import {
  clearCapitalBrokerOAuth,
  isCapitalBrokerTokenExpired,
  readCapitalBrokerOAuth,
  writeCapitalBrokerOAuthTokens,
  type CapitalBrokerOAuthTokens,
} from "./capital-broker-oauth-store";

interface PendingWebullLink {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

const pending = new Map<string, PendingWebullLink>();
const PENDING_TTL_MS = 15 * 60 * 1000;

export function getWebullOAuthConfig(): {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
  apiBase: string;
} {
  const clientId = process.env.WEBULL_CLIENT_ID?.trim() || null;
  const clientSecret = process.env.WEBULL_CLIENT_SECRET?.trim() || null;
  const redirectUri =
    process.env.WEBULL_REDIRECT_URI?.trim() || "http://127.0.0.1:3080/api/capital/webull";
  const apiBase = (process.env.WEBULL_OAUTH_API_BASE ?? "https://us-oauth-open-api.uat.webullbroker.com").replace(
    /\/$/,
    "",
  );
  return { clientId, clientSecret, redirectUri, apiBase };
}

function purgePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, val] of pending) {
    if (val.createdAt < cutoff) pending.delete(key);
  }
}

export function buildWebullAuthorizeUrl(): { authorizeUrl: string; state: string } | { error: string } {
  const { clientId, redirectUri, apiBase } = getWebullOAuthConfig();
  if (!clientId) return { error: "WEBULL_CLIENT_ID not configured in digital.env" };

  purgePending();
  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = generateOAuthState();
  pending.set(state, { state, codeVerifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return { authorizeUrl: `${apiBase}/oauth-openapi/oauth/authorize?${params.toString()}`, state };
}

export async function exchangeWebullCode(
  code: string,
  state: string,
): Promise<{ ok: true; tokens: CapitalBrokerOAuthTokens } | { ok: false; error: string }> {
  const { clientId, clientSecret, redirectUri, apiBase } = getWebullOAuthConfig();
  if (!clientId || !clientSecret) return { ok: false, error: "Webull client credentials not configured" };

  const session = pending.get(state);
  pending.delete(state);
  if (!session) return { ok: false, error: "Invalid or expired OAuth state" };

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: session.codeVerifier,
  });

  const res = await fetch(`${apiBase}/oauth-openapi/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Webull token exchange failed: ${text.slice(0, 240)}` };
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!data.access_token) return { ok: false, error: "Webull response missing access_token" };

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const tokens: CapitalBrokerOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    accessTokenSecret: null,
    expiresAt,
    accountId: null,
    scope: data.scope ?? null,
    updatedAt: new Date().toISOString(),
  };

  await writeCapitalBrokerOAuthTokens("webull", tokens);
  return { ok: true, tokens };
}

export async function refreshWebullTokensIfNeeded(): Promise<CapitalBrokerOAuthTokens | null> {
  const state = await readCapitalBrokerOAuth("webull");
  if (!state.tokens) return null;
  if (!isCapitalBrokerTokenExpired(state.tokens)) return state.tokens;

  const { clientId, clientSecret, apiBase } = getWebullOAuthConfig();
  const refresh = state.tokens.refreshToken;
  if (!clientId || !clientSecret || !refresh) return state.tokens;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
  });

  const res = await fetch(`${apiBase}/oauth-openapi/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return state.tokens;

  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token) return state.tokens;

  const tokens: CapitalBrokerOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refresh,
    accessTokenSecret: null,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : state.tokens.expiresAt,
    accountId: state.tokens.accountId,
    scope: state.tokens.scope,
    updatedAt: new Date().toISOString(),
  };

  await writeCapitalBrokerOAuthTokens("webull", tokens);
  return tokens;
}

export async function isWebullBrokerLinked(): Promise<boolean> {
  const state = await readCapitalBrokerOAuth("webull");
  return state.linked && Boolean(state.tokens?.accessToken);
}

export async function unlinkWebullBroker(): Promise<void> {
  await clearCapitalBrokerOAuth("webull");
}
