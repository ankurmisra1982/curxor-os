import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface GarminOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string | null;
  updatedAt: string;
}

export interface GarminOAuthState {
  version: 1;
  linked: boolean;
  tokens: GarminOAuthTokens | null;
  updatedAt: string;
}

function storePath(): string {
  return process.env.CURXOR_GARMIN_OAUTH_PATH ?? "/etc/curxor/garmin-oauth.json";
}

export function getGarminOAuthConfig(): {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
} {
  const clientId = process.env.GARMIN_CLIENT_ID?.trim() || process.env.CURXOR_GARMIN_CLIENT_ID?.trim() || null;
  const clientSecret =
    process.env.GARMIN_CLIENT_SECRET?.trim() || process.env.CURXOR_GARMIN_CLIENT_SECRET?.trim() || null;
  const redirectUri =
    process.env.GARMIN_REDIRECT_URI?.trim() ||
    process.env.CURXOR_GARMIN_REDIRECT_URI?.trim() ||
    "http://127.0.0.1:3080/api/vital/garmin/callback";
  return { clientId, clientSecret, redirectUri };
}

export async function readGarminOAuthState(): Promise<GarminOAuthState> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as GarminOAuthState;
    if (parsed.version !== 1) throw new Error("invalid");
    return parsed;
  } catch {
    return { version: 1, linked: false, tokens: null, updatedAt: new Date().toISOString() };
  }
}

export async function writeGarminOAuthTokens(tokens: Omit<GarminOAuthTokens, "updatedAt">): Promise<GarminOAuthState> {
  const state: GarminOAuthState = {
    version: 1,
    linked: true,
    tokens: { ...tokens, updatedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export async function clearGarminOAuth(): Promise<GarminOAuthState> {
  const state: GarminOAuthState = {
    version: 1,
    linked: false,
    tokens: null,
    updatedAt: new Date().toISOString(),
  };
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export function isGarminTokenExpired(tokens: GarminOAuthTokens): boolean {
  const exp = Date.parse(tokens.expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp <= Date.now() + 60_000;
}
