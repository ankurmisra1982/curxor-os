import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveDigitalEnvVar } from "./digital-env";

export type EbayEnvironment = "production" | "sandbox";

export interface EbayLinkState {
  accessToken: string;
  refreshToken: string | null;
  environment: EbayEnvironment;
  linkedAt: string;
  lastSyncAt: string | null;
  lastReceiptId: string | null;
  lastSyncOk: boolean | null;
}

function storePath(): string {
  return process.env.CURXOR_COMMERCE_EBAY_PATH ?? "/etc/curxor/commerce-ebay.json";
}

export function ebayApiBase(env: EbayEnvironment): string {
  return env === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

export async function readEbayLink(): Promise<EbayLinkState | null> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<EbayLinkState>;
    if (!parsed.accessToken?.trim()) return null;
    return {
      accessToken: parsed.accessToken.trim(),
      refreshToken: parsed.refreshToken?.trim() ?? null,
      environment: parsed.environment === "sandbox" ? "sandbox" : "production",
      linkedAt: String(parsed.linkedAt ?? new Date().toISOString()),
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastReceiptId: parsed.lastReceiptId ?? null,
      lastSyncOk: typeof parsed.lastSyncOk === "boolean" ? parsed.lastSyncOk : null,
    };
  } catch {
    return null;
  }
}

export async function writeEbayLink(input: {
  accessToken: string;
  refreshToken?: string | null;
  environment?: EbayEnvironment;
}): Promise<EbayLinkState> {
  const existing = await readEbayLink();
  const state: EbayLinkState = {
    accessToken: input.accessToken.trim(),
    refreshToken: input.refreshToken?.trim() ?? existing?.refreshToken ?? null,
    environment: input.environment ?? existing?.environment ?? "production",
    linkedAt: existing?.linkedAt ?? new Date().toISOString(),
    lastSyncAt: existing?.lastSyncAt ?? null,
    lastReceiptId: existing?.lastReceiptId ?? null,
    lastSyncOk: existing?.lastSyncOk ?? null,
  };
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export async function patchEbaySyncMeta(
  patch: Partial<Pick<EbayLinkState, "lastSyncAt" | "lastReceiptId" | "lastSyncOk">>,
): Promise<EbayLinkState | null> {
  const existing = await readEbayLink();
  if (!existing) return null;
  const next = { ...existing, ...patch };
  await writeFile(storePath(), `${JSON.stringify(next, null, 2)}\n`, { mode: 0o640 });
  return next;
}

export async function clearEbayLink(): Promise<void> {
  try {
    await writeFile(storePath(), "{}\n", { mode: 0o640 });
  } catch {
    /* ignore */
  }
}

export async function resolveEbayCredentials(): Promise<EbayLinkState | null> {
  const fromFile = await readEbayLink();
  if (fromFile) return fromFile;
  const token = (await resolveDigitalEnvVar("EBAY_ACCESS_TOKEN")) ?? "";
  if (!token.trim()) return null;
  const envRaw = (await resolveDigitalEnvVar("EBAY_ENVIRONMENT"))?.toLowerCase();
  return {
    accessToken: token.trim(),
    refreshToken: null,
    environment: envRaw === "sandbox" ? "sandbox" : "production",
    linkedAt: new Date().toISOString(),
    lastSyncAt: null,
    lastReceiptId: null,
    lastSyncOk: null,
  };
}

export async function isEbayConfigured(): Promise<boolean> {
  return (await resolveEbayCredentials()) !== null;
}
