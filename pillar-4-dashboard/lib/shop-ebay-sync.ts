import "server-only";

import type { DigitalReceipt } from "./digital-protocol";
import { EBAY_COMMERCE_TOOLS } from "./commerce-bridge-roadmap";
import { patchEbaySyncMeta, resolveEbayCredentials } from "./commerce-ebay-store";
import { fetchEbayFulfillmentInline } from "./ebay-fulfillment-client";
import { publishDigitalIntent } from "./mesh-publish";
import { buildDemoSkuSpreads, type SkuSpreadRow } from "./shop-margin-watch";
import { patchChannelSync } from "./shop-sync-store";
import { spreadsFromReceipt, waitForDigitalReceipt, type CommerceSyncVia } from "./shop-commerce-utils";
import type { ShopPipelineOrder } from "./shop-dashboard-types";

export interface EbaySyncResult {
  ok: boolean;
  receiptId: string | null;
  tool: string;
  spreads: SkuSpreadRow[];
  pipelineOrders: ShopPipelineOrder[];
  orderLineCount: number;
  environment: string | null;
  source: "ebay" | "demo";
  error?: string;
  via: CommerceSyncVia;
}

function pipelineFromReceipt(receipt: DigitalReceipt): ShopPipelineOrder[] {
  const raw = receipt.receipt.pipelineOrders;
  if (!Array.isArray(raw)) return [];
  const out: ShopPipelineOrder[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id ?? "").trim();
    const sku = String(r.sku ?? "").trim();
    if (!id || !sku) continue;
    const stage = String(r.stage ?? "INGEST") as ShopPipelineOrder["stage"];
    out.push({
      id,
      sku,
      stage: ["INGEST", "SORT", "PICK", "SHIP"].includes(stage) ? stage : "INGEST",
      eta: String(r.eta ?? "live"),
      source: "ebay",
    });
  }
  return out;
}

async function mockEbaySync(storeName: string): Promise<EbaySyncResult> {
  const spreads = buildDemoSkuSpreads(storeName)
    .slice(0, 2)
    .map((row) => ({
      ...row,
      channelSell: "eBay (mock)",
      source: "ebay" as const,
    }));
  const pipelineOrders: ShopPipelineOrder[] = [
    { id: "EBAY-MOCK-1", sku: spreads[0]?.sku ?? "GEAR-KIT-A", stage: "INGEST", eta: "live", source: "ebay" },
    { id: "EBAY-MOCK-2", sku: spreads[1]?.sku ?? "CLAW-PRIZE-03", stage: "PICK", eta: "live", source: "ebay" },
  ];
  await patchChannelSync("ebay", {
    label: "sandbox",
    syncedAt: new Date().toISOString(),
    receiptId: "mock-ebay-receipt",
    spreads,
    orderLineCount: pipelineOrders.length,
    pipelineOrders,
  });
  return {
    ok: true,
    receiptId: "mock-ebay-receipt",
    tool: EBAY_COMMERCE_TOOLS.fulfillmentSync,
    spreads,
    pipelineOrders,
    orderLineCount: pipelineOrders.length,
    environment: "sandbox",
    source: "ebay",
    via: "mock",
  };
}

export async function syncEbayFulfillment(options?: {
  storeName?: string;
  orderLimit?: number;
  allowMock?: boolean;
}): Promise<EbaySyncResult> {
  const creds = await resolveEbayCredentials();
  const storeName = options?.storeName ?? "Arbitrage Desk";

  if (!creds) {
    if (options?.allowMock && process.env.CURXOR_EBAY_MOCK === "1") {
      return mockEbaySync(storeName);
    }
    return {
      ok: false,
      receiptId: null,
      tool: EBAY_COMMERCE_TOOLS.fulfillmentSync,
      spreads: [],
      pipelineOrders: [],
      orderLineCount: 0,
      environment: null,
      source: "demo",
      via: "eno2",
      error: "eBay not linked",
    };
  }

  const payload = { orderLimit: options?.orderLimit ?? 25 };
  const published = await publishDigitalIntent({
    tool: EBAY_COMMERCE_TOOLS.fulfillmentSync,
    payload,
  });

  if (!published.ok) {
    return {
      ok: false,
      receiptId: null,
      tool: EBAY_COMMERCE_TOOLS.fulfillmentSync,
      spreads: [],
      pipelineOrders: [],
      orderLineCount: 0,
      environment: creds.environment,
      source: "demo",
      via: "eno2",
      error: published.error ?? "digital publish failed",
    };
  }

  let receipt = await waitForDigitalReceipt(published.id, 8000);
  let via: CommerceSyncVia = "eno2";

  if (!receipt) {
    try {
      const inline = await fetchEbayFulfillmentInline(creds, payload.orderLimit);
      receipt = {
        id: published.id,
        tool: EBAY_COMMERCE_TOOLS.fulfillmentSync,
        ok: true,
        timestamp: new Date().toISOString(),
        receipt: {
          environment: inline.environment,
          orderLineCount: inline.orderLineCount,
          orders: inline.orders,
          spreads: inline.spreads,
          pipelineOrders: inline.pipelineOrders,
        },
      };
      via = "inline";
    } catch (err) {
      await patchEbaySyncMeta({
        lastSyncAt: new Date().toISOString(),
        lastReceiptId: published.id,
        lastSyncOk: false,
      });
      return {
        ok: false,
        receiptId: published.id,
        tool: EBAY_COMMERCE_TOOLS.fulfillmentSync,
        spreads: [],
        pipelineOrders: [],
        orderLineCount: 0,
        environment: creds.environment,
        source: "demo",
        via: "eno2",
        error: err instanceof Error ? err.message : "eBay sync timed out",
      };
    }
  }

  const spreads = receipt.ok ? spreadsFromReceipt(receipt, "ebay") : [];
  const pipelineOrders = receipt.ok ? pipelineFromReceipt(receipt) : [];
  const orderLineCount =
    typeof receipt.receipt.orderLineCount === "number" ? receipt.receipt.orderLineCount : pipelineOrders.length;

  await patchEbaySyncMeta({
    lastSyncAt: new Date().toISOString(),
    lastReceiptId: receipt.id,
    lastSyncOk: receipt.ok,
  });

  if (receipt.ok && (spreads.length > 0 || pipelineOrders.length > 0)) {
    await patchChannelSync("ebay", {
      label: creds.environment,
      syncedAt: new Date().toISOString(),
      receiptId: receipt.id,
      spreads,
      orderLineCount,
      pipelineOrders,
    });
  }

  return {
    ok: receipt.ok,
    receiptId: receipt.id,
    tool: receipt.tool,
    spreads,
    pipelineOrders,
    orderLineCount,
    environment: String(receipt.receipt.environment ?? creds.environment),
    source: receipt.ok && (spreads.length > 0 || pipelineOrders.length > 0) ? "ebay" : "demo",
    via,
    error: receipt.ok ? undefined : receipt.error ?? "eBay sync failed",
  };
}
