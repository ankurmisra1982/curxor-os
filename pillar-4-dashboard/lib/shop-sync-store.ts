import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { mergeSpreadRows } from "./shop-commerce-utils";
import type { SkuSpreadRow } from "./shop-margin-watch";
import type { ShopPipelineOrder } from "./shop-dashboard-types";

export type CommerceChannelId = "shopify" | "ebay" | "printify";

export interface ChannelSyncSlice {
  label: string | null;
  syncedAt: string | null;
  receiptId: string | null;
  spreads: SkuSpreadRow[];
  orderLineCount: number;
  pipelineOrders: ShopPipelineOrder[];
}

export interface ShopSyncStateV2 {
  version: 2;
  mergedSpreads: SkuSpreadRow[];
  mergedPipelineOrders: ShopPipelineOrder[];
  channels: Record<CommerceChannelId, ChannelSyncSlice>;
}

/** @deprecated v1 legacy — migrated on read */
export interface ShopSyncStateV1 {
  version: 1;
  source: "demo" | "shopify";
  shopDomain: string | null;
  syncedAt: string;
  receiptId: string | null;
  spreads: SkuSpreadRow[];
  orderLineCount: number;
}

export type ShopSyncState = ShopSyncStateV2;

function emptyChannel(): ChannelSyncSlice {
  return {
    label: null,
    syncedAt: null,
    receiptId: null,
    spreads: [],
    orderLineCount: 0,
    pipelineOrders: [],
  };
}

export function emptyShopSyncState(): ShopSyncStateV2 {
  return {
    version: 2,
    mergedSpreads: [],
    mergedPipelineOrders: [],
    channels: {
      shopify: emptyChannel(),
      ebay: emptyChannel(),
      printify: emptyChannel(),
    },
  };
}

function recomputeMerged(state: ShopSyncStateV2): ShopSyncStateV2 {
  const spreads = mergeSpreadRows(
    state.channels.shopify.spreads,
    state.channels.ebay.spreads,
    state.channels.printify.spreads,
  );
  const pipelineOrders = [
    ...state.channels.ebay.pipelineOrders,
    ...state.channels.shopify.pipelineOrders,
  ];
  return { ...state, mergedSpreads: spreads, mergedPipelineOrders: pipelineOrders };
}

function migrateV1(parsed: ShopSyncStateV1): ShopSyncStateV2 {
  const base = emptyShopSyncState();
  if (parsed.source === "shopify" && parsed.spreads.length > 0) {
    base.channels.shopify = {
      label: parsed.shopDomain,
      syncedAt: parsed.syncedAt,
      receiptId: parsed.receiptId,
      spreads: parsed.spreads,
      orderLineCount: parsed.orderLineCount,
      pipelineOrders: [],
    };
  }
  return recomputeMerged(base);
}

function storePath(): string {
  return process.env.CURXOR_SHOP_SYNC_PATH ?? "/etc/curxor/shop-sync.json";
}

/** Serialize read-modify-write — parallel channel syncs must not clobber each other. */
let shopSyncWriteLock: Promise<void> = Promise.resolve();

async function withShopSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = shopSyncWriteLock.then(fn);
  shopSyncWriteLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function readShopSync(): Promise<ShopSyncStateV2 | null> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;

    if (obj.version === 2 && obj.channels && typeof obj.channels === "object") {
      const channels = obj.channels as Record<string, Partial<ChannelSyncSlice>>;
      const state: ShopSyncStateV2 = {
        version: 2,
        mergedSpreads: Array.isArray(obj.mergedSpreads) ? (obj.mergedSpreads as SkuSpreadRow[]) : [],
        mergedPipelineOrders: Array.isArray(obj.mergedPipelineOrders)
          ? (obj.mergedPipelineOrders as ShopPipelineOrder[])
          : [],
        channels: {
          shopify: { ...emptyChannel(), ...channels.shopify },
          ebay: { ...emptyChannel(), ...channels.ebay },
          printify: { ...emptyChannel(), ...channels.printify },
        },
      };
      return recomputeMerged(state);
    }

    if (Array.isArray(obj.spreads)) {
      return migrateV1({
        version: 1,
        source: obj.source === "shopify" ? "shopify" : "demo",
        shopDomain: typeof obj.shopDomain === "string" ? obj.shopDomain : null,
        syncedAt: String(obj.syncedAt ?? new Date().toISOString()),
        receiptId: typeof obj.receiptId === "string" ? obj.receiptId : null,
        spreads: obj.spreads as SkuSpreadRow[],
        orderLineCount: typeof obj.orderLineCount === "number" ? obj.orderLineCount : 0,
      });
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeShopSync(state: ShopSyncStateV2): Promise<void> {
  await withShopSyncLock(async () => {
    const filePath = storePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    const normalized = recomputeMerged(state);
    await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o640 });
  });
}

export async function patchChannelSync(
  channel: CommerceChannelId,
  patch: {
    label?: string | null;
    syncedAt?: string;
    receiptId?: string | null;
    spreads?: SkuSpreadRow[];
    orderLineCount?: number;
    pipelineOrders?: ShopPipelineOrder[];
  },
): Promise<ShopSyncStateV2> {
  return withShopSyncLock(async () => {
    const existing = (await readShopSync()) ?? emptyShopSyncState();
    const slice = existing.channels[channel];
    existing.channels[channel] = {
      ...slice,
      ...patch,
      spreads: patch.spreads ?? slice.spreads,
      pipelineOrders: patch.pipelineOrders ?? slice.pipelineOrders,
    };
    const filePath = storePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    const normalized = recomputeMerged(existing);
    await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o640 });
    return normalized;
  });
}

export function channelConnected(slice: ChannelSyncSlice): boolean {
  return Boolean(slice.receiptId && (slice.spreads.length > 0 || slice.pipelineOrders.length > 0));
}
