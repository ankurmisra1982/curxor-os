import "server-only";

import { SHOPIFY_COMMERCE_TOOLS } from "./commerce-bridge-roadmap";
import { patchShopifySyncMeta, resolveShopifyCredentials } from "./commerce-shopify-store";
import { publishDigitalIntent } from "./mesh-publish";
import { buildDemoSkuSpreads, type SkuSpreadRow } from "./shop-margin-watch";
import { patchChannelSync } from "./shop-sync-store";
import { spreadsFromReceipt, waitForDigitalReceipt, type CommerceSyncVia } from "./shop-commerce-utils";
import { fetchShopifyCatalogInline } from "./shopify-graphql";

export interface ShopifySyncResult {
  ok: boolean;
  receiptId: string | null;
  tool: string;
  spreads: SkuSpreadRow[];
  orderLineCount: number;
  shopDomain: string | null;
  source: "shopify" | "demo";
  error?: string;
  via: CommerceSyncVia;
}

async function mockShopifySync(storeName: string): Promise<ShopifySyncResult> {
  const spreads = buildDemoSkuSpreads(storeName).map((row) => ({
    ...row,
    channelSell: row.channelSell === "Own storefront" ? "Shopify (mock)" : row.channelSell,
    source: "shopify" as const,
  }));
  await patchChannelSync("shopify", {
    label: "mock.myshopify.com",
    syncedAt: new Date().toISOString(),
    receiptId: "mock-receipt",
    spreads,
    orderLineCount: 3,
    pipelineOrders: [],
  });
  return {
    ok: true,
    receiptId: "mock-receipt",
    tool: SHOPIFY_COMMERCE_TOOLS.catalogSync,
    spreads,
    orderLineCount: 3,
    shopDomain: "mock.myshopify.com",
    source: "shopify",
    via: "mock",
  };
}

export async function syncShopifyCatalog(options?: {
  storeName?: string;
  productCount?: number;
  orderCount?: number;
  allowMock?: boolean;
}): Promise<ShopifySyncResult> {
  const creds = await resolveShopifyCredentials();
  const storeName = options?.storeName ?? "Arbitrage Desk";

  if (!creds) {
    if (options?.allowMock && process.env.CURXOR_SHOPIFY_MOCK === "1") {
      return mockShopifySync(storeName);
    }
    return {
      ok: false,
      receiptId: null,
      tool: SHOPIFY_COMMERCE_TOOLS.catalogSync,
      spreads: buildDemoSkuSpreads(storeName),
      orderLineCount: 0,
      shopDomain: null,
      source: "demo",
      via: "eno2",
      error: "Shopify not linked",
    };
  }

  const payload = {
    productCount: options?.productCount ?? 20,
    orderCount: options?.orderCount ?? 10,
  };

  const published = await publishDigitalIntent({
    tool: SHOPIFY_COMMERCE_TOOLS.catalogSync,
    payload,
  });

  if (!published.ok) {
    return {
      ok: false,
      receiptId: null,
      tool: SHOPIFY_COMMERCE_TOOLS.catalogSync,
      spreads: buildDemoSkuSpreads(storeName),
      orderLineCount: 0,
      shopDomain: creds.shopDomain,
      source: "demo",
      via: "eno2",
      error: published.error ?? "digital publish failed",
    };
  }

  let receipt = await waitForDigitalReceipt(published.id, 8000);
  let via: CommerceSyncVia = "eno2";

  if (!receipt) {
    try {
      const inline = await fetchShopifyCatalogInline(creds, payload.productCount, payload.orderCount);
      receipt = {
        id: published.id,
        tool: SHOPIFY_COMMERCE_TOOLS.catalogSync,
        ok: true,
        timestamp: new Date().toISOString(),
        receipt: {
          shopDomain: inline.shopDomain,
          productCount: inline.productCount,
          orderLineCount: inline.orderLineCount,
          spreads: inline.spreads,
          orders: inline.orders,
        },
      };
      via = "inline";
    } catch (err) {
      await patchShopifySyncMeta({
        lastSyncAt: new Date().toISOString(),
        lastReceiptId: published.id,
        lastSyncOk: false,
      });
      return {
        ok: false,
        receiptId: published.id,
        tool: SHOPIFY_COMMERCE_TOOLS.catalogSync,
        spreads: buildDemoSkuSpreads(storeName),
        orderLineCount: 0,
        shopDomain: creds.shopDomain,
        source: "demo",
        via: "eno2",
        error: err instanceof Error ? err.message : "Shopify sync timed out",
      };
    }
  }

  const spreads = receipt.ok ? spreadsFromReceipt(receipt, "shopify") : [];
  const orderLineCount =
    typeof receipt.receipt.orderLineCount === "number" ? receipt.receipt.orderLineCount : 0;

  await patchShopifySyncMeta({
    lastSyncAt: new Date().toISOString(),
    lastReceiptId: receipt.id,
    lastSyncOk: receipt.ok,
  });

  if (receipt.ok && spreads.length > 0) {
    await patchChannelSync("shopify", {
      label: String(receipt.receipt.shopDomain ?? creds.shopDomain),
      syncedAt: new Date().toISOString(),
      receiptId: receipt.id,
      spreads,
      orderLineCount,
      pipelineOrders: [],
    });
  }

  return {
    ok: receipt.ok,
    receiptId: receipt.id,
    tool: receipt.tool,
    spreads: spreads.length > 0 ? spreads : buildDemoSkuSpreads(storeName),
    orderLineCount,
    shopDomain: String(receipt.receipt.shopDomain ?? creds.shopDomain),
    source: receipt.ok && spreads.length > 0 ? "shopify" : "demo",
    via,
    error: receipt.ok ? undefined : receipt.error ?? "Shopify sync failed",
  };
}
