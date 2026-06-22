import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateOAuthState } from "./oauth/pkce";

export interface WorkHubSpotOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  hubId: string | null;
  scope: string | null;
  updatedAt: string;
}

export interface WorkHubSpotOAuthState {
  version: 1;
  linked: boolean;
  tokens: WorkHubSpotOAuthTokens | null;
  updatedAt: string;
}

const HUBSPOT_SCOPES = ["crm.objects.contacts.read", "crm.objects.contacts.write", "oauth"].join(" ");

interface PendingHubSpotLink {
  state: string;
  createdAt: number;
}

const pending = new Map<string, PendingHubSpotLink>();
const PENDING_TTL_MS = 15 * 60 * 1000;

function oauthPath(): string {
  return process.env.CURXOR_WORK_HUBSPOT_OAUTH_PATH ?? "/etc/curxor/work-hubspot-oauth.json";
}

export function getWorkHubSpotOAuthConfig(): {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
} {
  const clientId = process.env.HUBSPOT_CLIENT_ID?.trim() || null;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET?.trim() || null;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI?.trim() || "http://127.0.0.1:3080/api/work/hubspot";
  return { clientId, clientSecret, redirectUri };
}

function purgePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, val] of pending) {
    if (val.createdAt < cutoff) pending.delete(key);
  }
}

export async function readWorkHubSpotOAuth(): Promise<WorkHubSpotOAuthState> {
  try {
    const raw = await readFile(oauthPath(), "utf8");
    const parsed = JSON.parse(raw) as WorkHubSpotOAuthState;
    if (parsed.version !== 1) throw new Error("invalid");
    return parsed;
  } catch {
    return { version: 1, linked: false, tokens: null, updatedAt: new Date().toISOString() };
  }
}

async function writeWorkHubSpotOAuth(state: WorkHubSpotOAuthState): Promise<void> {
  const filePath = oauthPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function isWorkHubSpotLinked(): Promise<boolean> {
  const state = await readWorkHubSpotOAuth();
  return state.linked && Boolean(state.tokens?.accessToken);
}

export function buildWorkHubSpotAuthorizeUrl():
  | { authorizeUrl: string; state: string }
  | { error: string; demo: true; detail: string } {
  const { clientId, redirectUri } = getWorkHubSpotOAuthConfig();
  if (!clientId) {
    return {
      error: "HUBSPOT_CLIENT_ID not set",
      demo: true,
      detail: "Demo mode — set HUBSPOT_CLIENT_ID + HUBSPOT_CLIENT_SECRET in digital.env",
    };
  }

  purgePending();
  const state = generateOAuthState();
  pending.set(state, { state, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: HUBSPOT_SCOPES,
    state,
  });

  return {
    authorizeUrl: `https://app.hubspot.com/oauth/authorize?${params.toString()}`,
    state,
  };
}

export async function exchangeWorkHubSpotCode(
  code: string,
  state: string,
): Promise<{ ok: true; tokens: WorkHubSpotOAuthTokens } | { ok: false; error: string }> {
  const { clientId, clientSecret, redirectUri } = getWorkHubSpotOAuthConfig();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "HubSpot OAuth client credentials not configured" };
  }

  const session = pending.get(state);
  pending.delete(state);
  if (!session) return { ok: false, error: "Invalid or expired OAuth state" };

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `HubSpot token exchange failed: ${text.slice(0, 240)}` };
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    hub_id?: number;
    scope?: string;
  };

  if (!data.access_token) return { ok: false, error: "No access token in response" };

  const tokens: WorkHubSpotOAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    hubId: data.hub_id != null ? String(data.hub_id) : null,
    scope: data.scope ?? null,
    updatedAt: new Date().toISOString(),
  };

  await writeWorkHubSpotOAuth({ version: 1, linked: true, tokens, updatedAt: new Date().toISOString() });
  return { ok: true, tokens };
}

export async function unlinkWorkHubSpot(): Promise<WorkHubSpotOAuthState> {
  const state: WorkHubSpotOAuthState = {
    version: 1,
    linked: false,
    tokens: null,
    updatedAt: new Date().toISOString(),
  };
  await writeWorkHubSpotOAuth(state);
  return state;
}

export async function resolveHubSpotAccessToken(): Promise<string | null> {
  const oauth = await readWorkHubSpotOAuth();
  if (oauth.linked && oauth.tokens?.accessToken) return oauth.tokens.accessToken;

  const envToken = process.env.HUBSPOT_ACCESS_TOKEN?.trim();
  if (envToken) return envToken;

  const { loadDigitalEnv } = await import("./digital-env");
  const env = await loadDigitalEnv();
  return env.HUBSPOT_ACCESS_TOKEN?.trim() || null;
}
