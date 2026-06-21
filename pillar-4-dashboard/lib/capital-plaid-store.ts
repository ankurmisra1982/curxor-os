import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveDigitalEnvVar } from "./digital-env";

export interface PlaidLinkState {
  accessToken: string;
  itemId: string;
  institutionName: string | null;
  linkedAt: string;
  lastSyncAt: string | null;
  cursor: string | null;
}

function storePath(): string {
  return process.env.CURXOR_CAPITAL_PLAID_PATH ?? "/etc/curxor/capital-plaid.json";
}

export async function plaidEnv(): Promise<{
  clientId: string | null;
  secret: string | null;
  env: "sandbox" | "production";
}> {
  const clientId = (await resolveDigitalEnvVar("PLAID_CLIENT_ID")) ?? null;
  const secret = (await resolveDigitalEnvVar("PLAID_SECRET")) ?? null;
  const envRaw = (await resolveDigitalEnvVar("PLAID_ENV"))?.toLowerCase();
  const env = envRaw === "production" ? "production" : "sandbox";
  return { clientId, secret, env };
}

export async function isPlaidConfigured(): Promise<boolean> {
  const { clientId, secret } = await plaidEnv();
  return Boolean(clientId && secret);
}

export async function readPlaidLink(): Promise<PlaidLinkState | null> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PlaidLinkState>;
    if (!parsed.accessToken?.trim()) return null;
    return {
      accessToken: parsed.accessToken,
      itemId: String(parsed.itemId ?? ""),
      institutionName: parsed.institutionName ?? null,
      linkedAt: String(parsed.linkedAt ?? new Date().toISOString()),
      lastSyncAt: parsed.lastSyncAt ?? null,
      cursor: parsed.cursor ?? null,
    };
  } catch {
    return null;
  }
}

export async function writePlaidLink(state: PlaidLinkState): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function clearPlaidLink(): Promise<void> {
  try {
    await writeFile(storePath(), "{}\n", { mode: 0o640 });
  } catch {
    /* ignore */
  }
}

export function plaidBaseUrl(env: "sandbox" | "production"): string {
  return env === "production" ? "https://production.plaid.com" : "https://sandbox.plaid.com";
}
