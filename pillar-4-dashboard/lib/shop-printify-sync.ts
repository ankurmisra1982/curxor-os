import "server-only";

import type { DigitalReceipt } from "./digital-protocol";
import { PRINTIFY_COMMERCE_TOOLS } from "./commerce-bridge-roadmap";
import { patchPrintifySyncMeta, resolvePrintifyCredentials } from "./commerce-printify-store";
import { fetchPrintifyCatalogInline } from "./printify-catalog-client";
import { publishDigitalIntent } from "./mesh-publish";
import { buildDemoSkuSpreads, type SkuSpreadRow } from "./shop-margin-watch";
import { patchChannelSync } from "./shop-sync-store";
import { spreadsFromReceipt, waitForDigitalReceipt, type CommerceSyncVia } from "./shop-commerce-utils";

export interface PrintifySyncResult {
  ok: boolean;
  receiptId: string | null;
  tool: string;
  spreads: SkuSpreadRow[];
  productCount: number;
  shopId: string | null;
  shopTitle: string | null;
  source: "printify" | "demo";
  error?: string;
  via: CommerceSyncVia;
}

async function mockPrintifySync(storeName: string): Promise<PrintifySyncResult> {
  const spreads = buildDemoSkuSpreads(storeName)
    .slice(0, 3)
    .map((row) => ({
      ...row,
      channelBuy: "Printify production (mock)",
      channelSell: "Printify retail",
      source: "printify" as const,
    }));
  await patchChannelSync("printify", {
    label: "mock-shop",
    syncedAt: new Date().toISOString(),
    receiptId: "mock-printify-receipt",
    spreads,
    orderLineCount: 0,
    pipelineOrders: [],
  });
  return {
    ok: true,
    receiptId: "mock-printify-receipt",
    tool: PRINTIFY_COMMERCE_TOOLS.catalogSync,
    spreads,
    productCount: spreads.length,
    shopId: "mock-shop",
    shopTitle: "Mock POD shop",
    source: "printify",
    via: "mock",
  };
}

export async function syncPrintifyCatalog(options?: {
  storeName?: string;
  productLimit?: number;
  allowMock?: boolean;
}): Promise<PrintifySyncResult> {
  const creds = await resolvePrintifyCredentials();
  const storeName = options?.storeName ?? "Arbitrage Desk";

  if (!creds) {
    if (options?.allowMock && process.env.CURXOR_PRINTIFY_MOCK === "1") {
      return mockPrintifySync(storeName);
    }
    return {
      ok: false,
      receiptId: null,
      tool: PRINTIFY_COMMERCE_TOOLS.catalogSync,
      spreads: buildDemoSkuSpreads(storeName),
      productCount: 0,
      shopId: null,
      shopTitle: null,
      source: "demo",
      via: "eno2",
      error: "Printify not linked",
    };
  }

  const payload = { productLimit: options?.productLimit ?? 20 };
  const published = await publishDigitalIntent({
    tool: PRINTIFY_COMMERCE_TOOLS.catalogSync,
    payload,
  });

  if (!published.ok) {
    return {
      ok: false,
      receiptId: null,
      tool: PRINTIFY_COMMERCE_TOOLS.catalogSync,
      spreads: buildDemoSkuSpreads(storeName),
      productCount: 0,
      shopId: creds.shopId,
      shopTitle: creds.shopTitle,
      source: "demo",
      via: "eno2",
      error: published.error ?? "digital publish failed",
    };
  }

  let receipt = await waitForDigitalReceipt(published.id, 8000);
  let via: CommerceSyncVia = "eno2";

  if (!receipt) {
    try {
      const inline = await fetchPrintifyCatalogInline(creds, payload.productLimit);
      receipt = {
        id: published.id,
        tool: PRINTIFY_COMMERCE_TOOLS.catalogSync,
        ok: true,
        timestamp: new Date().toISOString(),
        receipt: {
          shopId: inline.shopId,
          shopTitle: inline.shopTitle,
          productCount: inline.productCount,
          spreads: inline.spreads,
        },
      };
      via = "inline";
    } catch (err) {
      await patchPrintifySyncMeta({
        lastSyncAt: new Date().toISOString(),
        lastReceiptId: published.id,
        lastSyncOk: false,
      });
      return {
        ok: false,
        receiptId: published.id,
        tool: PRINTIFY_COMMERCE_TOOLS.catalogSync,
        spreads: buildDemoSkuSpreads(storeName),
        productCount: 0,
        shopId: creds.shopId,
        shopTitle: creds.shopTitle,
        source: "demo",
        via: "eno2",
        error: err instanceof Error ? err.message : "Printify sync timed out",
      };
    }
  }

  const spreads = receipt.ok ? spreadsFromReceipt(receipt, "printify") : [];
  const productCount =
    typeof receipt.receipt.productCount === "number" ? receipt.receipt.productCount : spreads.length;

  await patchPrintifySyncMeta({
    lastSyncAt: new Date().toISOString(),
    lastReceiptId: receipt.id,
    lastSyncOk: receipt.ok,
  });

  if (receipt.ok && spreads.length > 0) {
    await patchChannelSync("printify", {
      label: creds.shopId,
      syncedAt: new Date().toISOString(),
      receiptId: receipt.id,
      spreads,
      orderLineCount: 0,
      pipelineOrders: [],
    });
  }

  return {
    ok: receipt.ok,
    receiptId: receipt.id,
    tool: receipt.tool,
    spreads: spreads.length > 0 ? spreads : buildDemoSkuSpreads(storeName),
    productCount,
    shopId: String(receipt.receipt.shopId ?? creds.shopId),
    shopTitle: creds.shopTitle,
    source: receipt.ok && spreads.length > 0 ? "printify" : "demo",
    via,
    error: receipt.ok ? undefined : receipt.error ?? "Printify sync failed",
  };
}
