import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createPkcePair, generateOAuthState } from "./oauth/pkce";

export interface WorkGoogleOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
  updatedAt: string;
}

export interface WorkGoogleOAuthState {
  version: 1;
  linked: boolean;
  tokens: WorkGoogleOAuthTokens | null;
  updatedAt: string;
}

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

interface PendingGoogleLink {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

const pending = new Map<string, PendingGoogleLink>();
const PENDING_TTL_MS = 15 * 60 * 1000;

function oauthPath(): string {
  return process.env.CURXOR_WORK_GOOGLE_OAUTH_PATH ?? "/etc/curxor/work-google-oauth.json";
}

export function getWorkGoogleOAuthConfig(): {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
} {
  const clientId =
    process.env.GOOGLE_WORKSPACE_CLIENT_ID?.trim() ||
    process.env.CURXOR_GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    null;
  const clientSecret =
    process.env.GOOGLE_WORKSPACE_CLIENT_SECRET?.trim() ||
    process.env.CURXOR_GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    null;
  const redirectUri =
    process.env.GOOGLE_WORKSPACE_REDIRECT_URI?.trim() || "http://127.0.0.1:3080/api/work/google";
  return { clientId, clientSecret, redirectUri };
}

function purgePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, val] of pending) {
    if (val.createdAt < cutoff) pending.delete(key);
  }
}

export async function readWorkGoogleOAuth(): Promise<WorkGoogleOAuthState> {
  try {
    const raw = await readFile(oauthPath(), "utf8");
    const parsed = JSON.parse(raw) as WorkGoogleOAuthState;
    if (parsed.version !== 1) throw new Error("invalid");
    return parsed;
  } catch {
    return { version: 1, linked: false, tokens: null, updatedAt: new Date().toISOString() };
  }
}

async function writeWorkGoogleOAuth(state: WorkGoogleOAuthState): Promise<void> {
  const filePath = oauthPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function isWorkGoogleLinked(): Promise<boolean> {
  const state = await readWorkGoogleOAuth();
  return state.linked && Boolean(state.tokens?.accessToken);
}

export function buildWorkGoogleAuthorizeUrl(): { authorizeUrl: string; state: string } | { error: string } {
  const { clientId, redirectUri } = getWorkGoogleOAuthConfig();
  if (!clientId) return { error: "GOOGLE_WORKSPACE_CLIENT_ID or CURXOR_GOOGLE_OAUTH_CLIENT_ID not set" };

  purgePending();
  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = generateOAuthState();
  pending.set(state, { state, codeVerifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return { authorizeUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
}

export async function exchangeWorkGoogleCode(
  code: string,
  state: string,
): Promise<{ ok: true; tokens: WorkGoogleOAuthTokens } | { ok: false; error: string }> {
  const { clientId, clientSecret, redirectUri } = getWorkGoogleOAuthConfig();
  if (!clientId || !clientSecret) return { ok: false, error: "Google OAuth client credentials not configured" };

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

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Google token exchange failed: ${text.slice(0, 240)}` };
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!data.access_token) return { ok: false, error: "No access token in response" };

  const tokens: WorkGoogleOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scope: data.scope ?? null,
    updatedAt: new Date().toISOString(),
  };

  await writeWorkGoogleOAuth({ version: 1, linked: true, tokens, updatedAt: new Date().toISOString() });
  return { ok: true, tokens };
}

export async function unlinkWorkGoogle(): Promise<WorkGoogleOAuthState> {
  const state: WorkGoogleOAuthState = {
    version: 1,
    linked: false,
    tokens: null,
    updatedAt: new Date().toISOString(),
  };
  await writeWorkGoogleOAuth(state);
  return state;
}

export async function getWorkGoogleAccessToken(): Promise<string | null> {
  const state = await readWorkGoogleOAuth();
  if (!state.linked || !state.tokens?.accessToken) return null;
  if (state.tokens.expiresAt && Date.parse(state.tokens.expiresAt) <= Date.now() + 60_000) {
    const refreshed = await refreshWorkGoogleTokens();
    return refreshed?.accessToken ?? null;
  }
  return state.tokens.accessToken;
}

async function refreshWorkGoogleTokens(): Promise<WorkGoogleOAuthTokens | null> {
  const state = await readWorkGoogleOAuth();
  const refresh = state.tokens?.refreshToken;
  if (!refresh) return null;

  const { clientId, clientSecret } = getWorkGoogleOAuthConfig();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  const tokens: WorkGoogleOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: refresh,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scope: state.tokens?.scope ?? null,
    updatedAt: new Date().toISOString(),
  };

  await writeWorkGoogleOAuth({ version: 1, linked: true, tokens, updatedAt: new Date().toISOString() });
  return tokens;
}
