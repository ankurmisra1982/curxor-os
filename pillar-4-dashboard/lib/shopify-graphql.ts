import "server-only";

import type { ShopifyLinkState } from "./commerce-shopify-store";

const CATALOG_QUERY = `
query ShopCatalogSync($productCount: Int!, $orderCount: Int!) {
  products(first: $productCount) {
    edges {
      node {
        id
        title
        handle
        variants(first: 10) {
          edges {
            node {
              id
              sku
              price
              inventoryItem {
                unitCost {
                  amount
                }
              }
            }
          }
        }
      }
    }
  }
  orders(first: $orderCount, sortKey: PROCESSED_AT, reverse: true) {
    edges {
      node {
        id
        name
        processedAt
        lineItems(first: 10) {
          edges {
            node {
              sku
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

function normalizeDomain(domain: string): string {
  let d = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!d.includes(".")) d = `${d}.myshopify.com`;
  return d;
}

export interface ShopifyCatalogPayload {
  shopDomain: string;
  spreads: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  productCount: number;
  orderLineCount: number;
}

/** Dev fallback when digital bridge is offline — same GraphQL as eno2 worker. */
export async function fetchShopifyCatalogInline(
  creds: ShopifyLinkState,
  productCount = 20,
  orderCount = 10,
): Promise<ShopifyCatalogPayload> {
  const domain = normalizeDomain(creds.shopDomain);
  const version = creds.apiVersion || "2025-01";
  const url = `https://${domain}/admin/api/${version}/graphql.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": creds.accessToken,
    },
    body: JSON.stringify({
      query: CATALOG_QUERY,
      variables: {
        productCount: Math.min(Math.max(productCount, 1), 50),
        orderCount: Math.min(Math.max(orderCount, 1), 25),
      },
    }),
    cache: "no-store",
  });

  const json = (await res.json()) as {
    errors?: unknown;
    data?: Record<string, unknown>;
  };

  if (!res.ok || json.errors) {
    throw new Error(`Shopify GraphQL failed: ${JSON.stringify(json.errors ?? res.status)}`);
  }

  const data = json.data ?? {};
  const spreads = normalizeProductSpreads(data);
  const orders = normalizeOrderLines(data);

  return {
    shopDomain: creds.shopDomain,
    spreads,
    orders,
    productCount: spreads.length,
    orderLineCount: orders.length,
  };
}

function normalizeProductSpreads(data: Record<string, unknown>): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const products = ((data.products as { edges?: unknown[] })?.edges ?? []) as Array<{ node?: Record<string, unknown> }>;
  for (const edge of products) {
    const node = edge.node;
    if (!node) continue;
    const title = String(node.title ?? "");
    const handle = String(node.handle ?? "");
    const variants = ((node.variants as { edges?: unknown[] })?.edges ?? []) as Array<{ node?: Record<string, unknown> }>;
    for (const vEdge of variants) {
      const variant = vEdge.node;
      if (!variant) continue;
      const sku = String(variant.sku ?? handle ?? variant.id ?? "").trim();
      if (!sku) continue;
      const sell = parseFloat(String(variant.price ?? "0")) || 0;
      let buy = 0;
      const inv = variant.inventoryItem as { unitCost?: { amount?: string } } | undefined;
      if (inv?.unitCost?.amount) buy = parseFloat(inv.unitCost.amount) || 0;
      const marginPct = sell > 0 && buy > 0 ? ((sell - buy) / sell) * 100 : 0;
      rows.push({
        sku,
        label: title,
        channelBuy: buy > 0 ? "Unit cost" : "COGS unset",
        channelSell: "Shopify",
        buyPrice: buy,
        sellPrice: sell,
        marginPct: Math.round(marginPct * 10) / 10,
        alert: marginPct >= 15,
        source: "shopify",
      });
    }
  }
  return rows;
}

function normalizeOrderLines(data: Record<string, unknown>): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const orders = ((data.orders as { edges?: unknown[] })?.edges ?? []) as Array<{ node?: Record<string, unknown> }>;
  for (const edge of orders) {
    const node = edge.node;
    if (!node) continue;
    const orderName = String(node.name ?? node.id ?? "");
    const items = ((node.lineItems as { edges?: unknown[] })?.edges ?? []) as Array<{ node?: Record<string, unknown> }>;
    for (const iEdge of items) {
      const item = iEdge.node;
      if (!item) continue;
      rows.push({
        orderName,
        sku: String(item.sku ?? item.title ?? orderName),
        title: String(item.title ?? ""),
        quantity: item.quantity,
        sellPrice: parseFloat(String((item.originalUnitPriceSet as { shopMoney?: { amount?: string } })?.shopMoney?.amount ?? "0")) || 0,
        processedAt: node.processedAt,
      });
    }
  }
  return rows;
}
