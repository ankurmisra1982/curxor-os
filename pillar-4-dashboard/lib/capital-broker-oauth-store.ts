import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CapitalBrokerOAuthId = "webull" | "etrade";

export interface CapitalBrokerOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  accessTokenSecret: string | null;
  expiresAt: string | null;
  accountId: string | null;
  scope: string | null;
  updatedAt: string;
}

export interface CapitalBrokerOAuthState {
  version: 1;
  broker: CapitalBrokerOAuthId;
  linked: boolean;
  tokens: CapitalBrokerOAuthTokens | null;
  updatedAt: string;
}

export function capitalBrokerOAuthPath(broker: CapitalBrokerOAuthId): string {
  if (broker === "webull") {
    return process.env.CURXOR_CAPITAL_WEBULL_OAUTH_PATH ?? "/etc/curxor/capital-webull-oauth.json";
  }
  return process.env.CURXOR_CAPITAL_ETRADE_OAUTH_PATH ?? "/etc/curxor/capital-etrade-oauth.json";
}

export async function readCapitalBrokerOAuth(broker: CapitalBrokerOAuthId): Promise<CapitalBrokerOAuthState> {
  try {
    const raw = await readFile(capitalBrokerOAuthPath(broker), "utf8");
    const parsed = JSON.parse(raw) as CapitalBrokerOAuthState;
    if (parsed.version !== 1 || parsed.broker !== broker) throw new Error("invalid");
    return parsed;
  } catch {
    return { version: 1, broker, linked: false, tokens: null, updatedAt: new Date().toISOString() };
  }
}

export async function writeCapitalBrokerOAuthTokens(
  broker: CapitalBrokerOAuthId,
  tokens: Omit<CapitalBrokerOAuthTokens, "updatedAt">,
): Promise<CapitalBrokerOAuthState> {
  const state: CapitalBrokerOAuthState = {
    version: 1,
    broker,
    linked: true,
    tokens: { ...tokens, updatedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  const filePath = capitalBrokerOAuthPath(broker);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export async function clearCapitalBrokerOAuth(broker: CapitalBrokerOAuthId): Promise<CapitalBrokerOAuthState> {
  const state: CapitalBrokerOAuthState = {
    version: 1,
    broker,
    linked: false,
    tokens: null,
    updatedAt: new Date().toISOString(),
  };
  const filePath = capitalBrokerOAuthPath(broker);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export function isCapitalBrokerTokenExpired(tokens: CapitalBrokerOAuthTokens): boolean {
  if (!tokens.expiresAt) return false;
  const exp = Date.parse(tokens.expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp <= Date.now() + 60_000;
}
