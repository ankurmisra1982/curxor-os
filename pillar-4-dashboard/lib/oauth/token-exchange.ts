import "server-only";

import type { OAuthProviderConfig } from "./provider-config";

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  tokenType: string;
  accountId: string | null;
}

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const payload = parts[1];
  if (!payload) throw new Error("Missing JWT payload");
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

function extractOpenAiAccountId(accessToken: string): string | null {
  try {
    const payload = decodeJwtPayload(accessToken);
    const auth = payload["https://api.openai.com/auth"] as Record<string, unknown> | undefined;
    if (auth && typeof auth.chatgpt_account_id === "string") return auth.chatgpt_account_id;
    return null;
  } catch {
    return null;
  }
}

export async function exchangeAuthorizationCode(
  config: OAuthProviderConfig,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<OAuthTokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as RawTokenResponse;
  if (!data.access_token) throw new Error("Token response missing access_token");

  const expiresAt =
    typeof data.expires_in === "number"
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

  const accountId =
    config.providerId === "openai" ? extractOpenAiAccountId(data.access_token) : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    tokenType: data.token_type ?? "Bearer",
    accountId,
  };
}

export async function refreshOAuthToken(
  config: OAuthProviderConfig,
  refreshToken: string,
): Promise<OAuthTokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as RawTokenResponse;
  if (!data.access_token) throw new Error("Refresh response missing access_token");

  const expiresAt =
    typeof data.expires_in === "number"
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

  const accountId =
    config.providerId === "openai" ? extractOpenAiAccountId(data.access_token) : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
    tokenType: data.token_type ?? "Bearer",
    accountId,
  };
}

export function buildAuthorizeUrl(
  config: OAuthProviderConfig,
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  if (config.extraAuthorizeParams) {
    for (const [key, value] of Object.entries(config.extraAuthorizeParams)) {
      params.set(key, value);
    }
  }

  if (config.providerId === "google") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}
