import "server-only";

import { createPkcePair, generateOAuthState } from "./oauth/pkce";
import {
  getGarminOAuthConfig,
  isGarminTokenExpired,
  readGarminOAuthState,
  writeGarminOAuthTokens,
  type GarminOAuthTokens,
} from "./garmin-oauth-store";

const GARMIN_AUTH_URL = "https://connect.garmin.com/oauth2Confirm";
const GARMIN_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";

interface PendingGarminLink {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

const pending = new Map<string, PendingGarminLink>();
const PENDING_TTL_MS = 15 * 60 * 1000;

function purgePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, val] of pending) {
    if (val.createdAt < cutoff) pending.delete(key);
  }
}

export function buildGarminAuthorizeUrl(): { authorizeUrl: string; state: string } | { error: string } {
  const { clientId, redirectUri } = getGarminOAuthConfig();
  if (!clientId) return { error: "GARMIN_CLIENT_ID not configured" };

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

  return { authorizeUrl: `${GARMIN_AUTH_URL}?${params.toString()}`, state };
}

export async function exchangeGarminCode(
  code: string,
  state: string,
): Promise<{ ok: true; tokens: GarminOAuthTokens } | { ok: false; error: string }> {
  const { clientId, clientSecret, redirectUri } = getGarminOAuthConfig();
  if (!clientId || !clientSecret) return { ok: false, error: "Garmin client credentials not configured" };

  const session = pending.get(state);
  pending.delete(state);
  if (!session) return { ok: false, error: "Invalid or expired OAuth state" };

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: session.codeVerifier,
    redirect_uri: redirectUri,
  });

  const res = await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Garmin token exchange failed: ${text.slice(0, 200)}` };
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!data.access_token || !data.refresh_token) {
    return { ok: false, error: "Garmin response missing tokens" };
  }

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  const tokens: GarminOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scope: data.scope ?? null,
    updatedAt: new Date().toISOString(),
  };

  await writeGarminOAuthTokens(tokens);
  return { ok: true, tokens };
}

export async function refreshGarminTokensIfNeeded(): Promise<GarminOAuthTokens | null> {
  const state = await readGarminOAuthState();
  if (!state.tokens) return null;
  if (!isGarminTokenExpired(state.tokens)) return state.tokens;

  const { clientId, clientSecret } = getGarminOAuthConfig();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: state.tokens.refreshToken,
  });

  const res = await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!data.access_token) return null;

  const tokens: GarminOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? state.tokens.refreshToken,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    scope: data.scope ?? state.tokens.scope,
    updatedAt: new Date().toISOString(),
  };

  await writeGarminOAuthTokens(tokens);
  return tokens;
}
