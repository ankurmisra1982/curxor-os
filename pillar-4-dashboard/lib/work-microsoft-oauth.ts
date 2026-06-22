import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createPkcePair, generateOAuthState } from "./oauth/pkce";

export interface WorkMicrosoftOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
  updatedAt: string;
}

export interface WorkMicrosoftOAuthState {
  version: 1;
  linked: boolean;
  tokens: WorkMicrosoftOAuthTokens | null;
  updatedAt: string;
}

const M365_SCOPES = ["openid", "email", "profile", "offline_access", "Mail.Read", "Calendars.Read"].join(" ");

interface PendingMicrosoftLink {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

const pending = new Map<string, PendingMicrosoftLink>();
const PENDING_TTL_MS = 15 * 60 * 1000;

function oauthPath(): string {
  return process.env.CURXOR_WORK_MICROSOFT_OAUTH_PATH ?? "/etc/curxor/work-microsoft-oauth.json";
}

export function getWorkMicrosoftOAuthConfig(): {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
  tenant: string;
} {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim() || null;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim() || null;
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI?.trim() || "http://127.0.0.1:3080/api/work/microsoft";
  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || "common";
  return { clientId, clientSecret, redirectUri, tenant };
}

function purgePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, val] of pending) {
    if (val.createdAt < cutoff) pending.delete(key);
  }
}

export async function readWorkMicrosoftOAuth(): Promise<WorkMicrosoftOAuthState> {
  try {
    const raw = await readFile(oauthPath(), "utf8");
    const parsed = JSON.parse(raw) as WorkMicrosoftOAuthState;
    if (parsed.version !== 1) throw new Error("invalid");
    return parsed;
  } catch {
    return { version: 1, linked: false, tokens: null, updatedAt: new Date().toISOString() };
  }
}

async function writeWorkMicrosoftOAuth(state: WorkMicrosoftOAuthState): Promise<void> {
  const filePath = oauthPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function isWorkMicrosoftLinked(): Promise<boolean> {
  const state = await readWorkMicrosoftOAuth();
  return state.linked && Boolean(state.tokens?.accessToken);
}

export function buildWorkMicrosoftAuthorizeUrl(): { authorizeUrl: string; state: string } | { error: string } {
  const { clientId, redirectUri, tenant } = getWorkMicrosoftOAuthConfig();
  if (!clientId) return { error: "MICROSOFT_CLIENT_ID not set" };

  purgePending();
  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = generateOAuthState();
  pending.set(state, { state, codeVerifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: M365_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    prompt: "consent",
  });

  return {
    authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`,
    state,
  };
}

export async function exchangeWorkMicrosoftCode(
  code: string,
  state: string,
): Promise<{ ok: true; tokens: WorkMicrosoftOAuthTokens } | { ok: false; error: string }> {
  const { clientId, clientSecret, redirectUri, tenant } = getWorkMicrosoftOAuthConfig();
  if (!clientId || !clientSecret) return { ok: false, error: "Microsoft OAuth client credentials not configured" };

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

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Microsoft token exchange failed: ${text.slice(0, 240)}` };
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!data.access_token) return { ok: false, error: "No access token in response" };

  const tokens: WorkMicrosoftOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scope: data.scope ?? null,
    updatedAt: new Date().toISOString(),
  };

  await writeWorkMicrosoftOAuth({ version: 1, linked: true, tokens, updatedAt: new Date().toISOString() });
  return { ok: true, tokens };
}

export async function unlinkWorkMicrosoft(): Promise<WorkMicrosoftOAuthState> {
  const state: WorkMicrosoftOAuthState = {
    version: 1,
    linked: false,
    tokens: null,
    updatedAt: new Date().toISOString(),
  };
  await writeWorkMicrosoftOAuth(state);
  return state;
}

export async function getWorkMicrosoftAccessToken(): Promise<string | null> {
  const state = await readWorkMicrosoftOAuth();
  if (!state.linked || !state.tokens?.accessToken) return null;
  if (state.tokens.expiresAt && Date.parse(state.tokens.expiresAt) <= Date.now() + 60_000) {
    const refreshed = await refreshWorkMicrosoftTokens();
    return refreshed?.accessToken ?? null;
  }
  return state.tokens.accessToken;
}

async function refreshWorkMicrosoftTokens(): Promise<WorkMicrosoftOAuthTokens | null> {
  const state = await readWorkMicrosoftOAuth();
  const refresh = state.tokens?.refreshToken;
  if (!refresh) return null;

  const { clientId, clientSecret, tenant } = getWorkMicrosoftOAuthConfig();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
    scope: M365_SCOPES,
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  const tokens: WorkMicrosoftOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: refresh,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scope: state.tokens?.scope ?? null,
    updatedAt: new Date().toISOString(),
  };

  await writeWorkMicrosoftOAuth({ version: 1, linked: true, tokens, updatedAt: new Date().toISOString() });
  return tokens;
}
