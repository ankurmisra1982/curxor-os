import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getLlmCredentialsPath } from "./user-settings-types";

interface LlmCredentialsFile {
  keys: Record<string, string>;
}

const EMPTY: LlmCredentialsFile = { keys: {} };

export async function readLlmCredentials(): Promise<LlmCredentialsFile> {
  const filePath = getLlmCredentialsPath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LlmCredentialsFile>;
    return { keys: parsed.keys && typeof parsed.keys === "object" ? parsed.keys : {} };
  } catch {
    return { ...EMPTY };
  }
}

export async function setProviderApiKey(providerId: string, apiKey: string): Promise<void> {
  const filePath = getLlmCredentialsPath();
  const current = await readLlmCredentials();
  current.keys[providerId] = apiKey.trim();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, { mode: 0o600 });
}

export async function getProviderApiKey(providerId: string): Promise<string | null> {
  const creds = await readLlmCredentials();
  const key = creds.keys[providerId];
  return typeof key === "string" && key.length > 0 ? key : null;
}

export async function removeProviderApiKey(providerId: string): Promise<void> {
  const filePath = getLlmCredentialsPath();
  const current = await readLlmCredentials();
  delete current.keys[providerId];
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, { mode: 0o600 });
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
