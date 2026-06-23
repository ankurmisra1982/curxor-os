import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveDigitalEnvVar } from "./digital-env";

export interface PrintifyLinkState {
  accessToken: string;
  shopId: string;
  shopTitle: string | null;
  linkedAt: string;
  lastSyncAt: string | null;
  lastReceiptId: string | null;
  lastSyncOk: boolean | null;
}

function storePath(): string {
  return process.env.CURXOR_COMMERCE_PRINTIFY_PATH ?? "/etc/curxor/commerce-printify.json";
}

export async function readPrintifyLink(): Promise<PrintifyLinkState | null> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PrintifyLinkState>;
    if (!parsed.accessToken?.trim() || !parsed.shopId?.trim()) return null;
    return {
      accessToken: parsed.accessToken.trim(),
      shopId: parsed.shopId.trim(),
      shopTitle: parsed.shopTitle ?? null,
      linkedAt: String(parsed.linkedAt ?? new Date().toISOString()),
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastReceiptId: parsed.lastReceiptId ?? null,
      lastSyncOk: typeof parsed.lastSyncOk === "boolean" ? parsed.lastSyncOk : null,
    };
  } catch {
    return null;
  }
}

export async function writePrintifyLink(input: {
  accessToken: string;
  shopId: string;
  shopTitle?: string | null;
}): Promise<PrintifyLinkState> {
  const existing = await readPrintifyLink();
  const state: PrintifyLinkState = {
    accessToken: input.accessToken.trim(),
    shopId: input.shopId.trim(),
    shopTitle: input.shopTitle?.trim() ?? existing?.shopTitle ?? null,
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

export async function patchPrintifySyncMeta(
  patch: Partial<Pick<PrintifyLinkState, "lastSyncAt" | "lastReceiptId" | "lastSyncOk">>,
): Promise<PrintifyLinkState | null> {
  const existing = await readPrintifyLink();
  if (!existing) return null;
  const next = { ...existing, ...patch };
  await writeFile(storePath(), `${JSON.stringify(next, null, 2)}\n`, { mode: 0o640 });
  return next;
}

export async function clearPrintifyLink(): Promise<void> {
  try {
    await writeFile(storePath(), "{}\n", { mode: 0o640 });
  } catch {
    /* ignore */
  }
}

export async function resolvePrintifyCredentials(): Promise<PrintifyLinkState | null> {
  const fromFile = await readPrintifyLink();
  if (fromFile) return fromFile;
  const token = (await resolveDigitalEnvVar("PRINTIFY_API_TOKEN")) ?? "";
  const shopId = (await resolveDigitalEnvVar("PRINTIFY_SHOP_ID")) ?? "";
  if (!token.trim() || !shopId.trim()) return null;
  return {
    accessToken: token.trim(),
    shopId: shopId.trim(),
    shopTitle: null,
    linkedAt: new Date().toISOString(),
    lastSyncAt: null,
    lastReceiptId: null,
    lastSyncOk: null,
  };
}

export async function isPrintifyConfigured(): Promise<boolean> {
  return (await resolvePrintifyCredentials()) !== null;
}
