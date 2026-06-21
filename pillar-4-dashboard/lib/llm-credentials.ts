import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getLlmCredentialsPath } from "./user-settings-types";

export interface ProviderOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  tokenType: string;
  accountId: string | null;
  linkedAt: string;
}

interface LlmCredentialsFile {
  keys: Record<string, string>;
  oauth: Record<string, ProviderOAuthTokens>;
}

const EMPTY: LlmCredentialsFile = { keys: {}, oauth: {} };

export async function readLlmCredentials(): Promise<LlmCredentialsFile> {
  const filePath = getLlmCredentialsPath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LlmCredentialsFile>;
    return {
      keys: parsed.keys && typeof parsed.keys === "object" ? parsed.keys : {},
      oauth: parsed.oauth && typeof parsed.oauth === "object" ? parsed.oauth : {},
    };
  } catch {
    return { keys: {}, oauth: {} };
  }
}

async function writeLlmCredentials(data: LlmCredentialsFile): Promise<void> {
  const filePath = getLlmCredentialsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
}

export async function setProviderApiKey(providerId: string, apiKey: string): Promise<void> {
  const current = await readLlmCredentials();
  current.keys[providerId] = apiKey.trim();
  await writeLlmCredentials(current);
}

export async function getProviderApiKey(providerId: string): Promise<string | null> {
  const creds = await readLlmCredentials();
  const key = creds.keys[providerId];
  return typeof key === "string" && key.length > 0 ? key : null;
}

export async function removeProviderApiKey(providerId: string): Promise<void> {
  const current = await readLlmCredentials();
  delete current.keys[providerId];
  await writeLlmCredentials(current);
}

export async function setProviderOAuthTokens(
  providerId: string,
  tokens: Omit<ProviderOAuthTokens, "linkedAt">,
): Promise<void> {
  const current = await readLlmCredentials();
  current.oauth[providerId] = {
    ...tokens,
    linkedAt: new Date().toISOString(),
  };
  await writeLlmCredentials(current);
}

export async function getProviderOAuthTokens(
  providerId: string,
): Promise<ProviderOAuthTokens | null> {
  const creds = await readLlmCredentials();
  const entry = creds.oauth[providerId];
  return entry ?? null;
}

export async function removeProviderOAuthTokens(providerId: string): Promise<void> {
  const current = await readLlmCredentials();
  delete current.oauth[providerId];
  await writeLlmCredentials(current);
}

export async function hasProviderOAuth(providerId: string): Promise<boolean> {
  return Boolean(await getProviderOAuthTokens(providerId));
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export async function removeAllProviderCredentials(providerId: string): Promise<void> {
  const current = await readLlmCredentials();
  delete current.keys[providerId];
  delete current.oauth[providerId];
  await writeLlmCredentials(current);
}
