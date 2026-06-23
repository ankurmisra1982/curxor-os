import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveDigitalEnvVar } from "./digital-env";

export interface ShopifyLinkState {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
  linkedAt: string;
  lastSyncAt: string | null;
  lastReceiptId: string | null;
  lastSyncOk: boolean | null;
}

function storePath(): string {
  return process.env.CURXOR_COMMERCE_SHOPIFY_PATH ?? "/etc/curxor/commerce-shopify.json";
}

export async function readShopifyLink(): Promise<ShopifyLinkState | null> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ShopifyLinkState>;
    if (!parsed.accessToken?.trim() || !parsed.shopDomain?.trim()) return null;
    return {
      shopDomain: parsed.shopDomain.trim(),
      accessToken: parsed.accessToken.trim(),
      apiVersion: parsed.apiVersion?.trim() || "2025-01",
      linkedAt: String(parsed.linkedAt ?? new Date().toISOString()),
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastReceiptId: parsed.lastReceiptId ?? null,
      lastSyncOk: typeof parsed.lastSyncOk === "boolean" ? parsed.lastSyncOk : null,
    };
  } catch {
    return null;
  }
}

export async function writeShopifyLink(input: {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}): Promise<ShopifyLinkState> {
  const existing = await readShopifyLink();
  const state: ShopifyLinkState = {
    shopDomain: input.shopDomain.trim(),
    accessToken: input.accessToken.trim(),
    apiVersion: input.apiVersion?.trim() || "2025-01",
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

export async function patchShopifySyncMeta(
  patch: Partial<Pick<ShopifyLinkState, "lastSyncAt" | "lastReceiptId" | "lastSyncOk">>,
): Promise<ShopifyLinkState | null> {
  const existing = await readShopifyLink();
  if (!existing) return null;
  const next = { ...existing, ...patch };
  const filePath = storePath();
  await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o640 });
  return next;
}

export async function clearShopifyLink(): Promise<void> {
  try {
    await writeFile(storePath(), "{}\n", { mode: 0o640 });
  } catch {
    /* ignore */
  }
}

/** Env overrides file for dev-qa. */
export async function resolveShopifyCredentials(): Promise<ShopifyLinkState | null> {
  const fromFile = await readShopifyLink();
  if (fromFile) return fromFile;

  const domain = (await resolveDigitalEnvVar("SHOPIFY_SHOP_DOMAIN")) ?? "";
  const token = (await resolveDigitalEnvVar("SHOPIFY_ACCESS_TOKEN")) ?? "";
  if (!domain.trim() || !token.trim()) return null;

  return {
    shopDomain: domain.trim(),
    accessToken: token.trim(),
    apiVersion: (await resolveDigitalEnvVar("SHOPIFY_API_VERSION"))?.trim() || "2025-01",
    linkedAt: new Date().toISOString(),
    lastSyncAt: null,
    lastReceiptId: null,
    lastSyncOk: null,
  };
}

export async function isShopifyConfigured(): Promise<boolean> {
  return (await resolveShopifyCredentials()) !== null;
}
