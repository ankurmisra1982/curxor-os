import "server-only";

import type { PrintifyLinkState } from "./commerce-printify-store";

export interface PrintifyCatalogPayload {
  shopId: string;
  shopTitle: string | null;
  productCount: number;
  spreads: Array<Record<string, unknown>>;
}

function centsToDollars(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 100 ? n / 100 : n;
}

function normalizePrintifyProducts(data: unknown): Array<Record<string, unknown>> {
  const products = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] })?.data)
      ? (data as { data: unknown[] }).data
      : [];

  const spreads: Array<Record<string, unknown>> = [];

  for (const product of products) {
    if (!product || typeof product !== "object") continue;
    const p = product as Record<string, unknown>;
    const title = String(p.title ?? "");
    const variants = Array.isArray(p.variants) ? p.variants : [];
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") continue;
      const v = variant as Record<string, unknown>;
      const sku = String(v.sku ?? v.id ?? title).trim();
      if (!sku) continue;
      const sell = centsToDollars(v.price);
      const buy = centsToDollars(v.cost ?? v.production_cost);
      const marginPct = sell > 0 && buy > 0 ? Math.round(((sell - buy) / sell) * 1000) / 10 : 0;
      spreads.push({
        sku,
        label: title,
        channelBuy: buy > 0 ? "Printify production" : "Cost pending",
        channelSell: "Printify retail",
        buyPrice: buy,
        sellPrice: sell,
        marginPct,
        alert: marginPct >= 15,
        source: "printify",
      });
    }
  }

  return spreads;
}

/** Dev fallback when digital bridge is offline — same REST as eno2 worker. */
export async function fetchPrintifyCatalogInline(
  creds: PrintifyLinkState,
  limit = 20,
): Promise<PrintifyCatalogPayload> {
  const capped = Math.min(Math.max(limit, 1), 50);
  const url = `https://api.printify.com/v1/shops/${encodeURIComponent(creds.shopId)}/products.json?limit=${capped}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = (await res.json()) as unknown;
  if (!res.ok) {
    throw new Error(`Printify catalog failed: ${JSON.stringify(json)}`);
  }

  const spreads = normalizePrintifyProducts(json);
  return {
    shopId: creds.shopId,
    shopTitle: creds.shopTitle,
    productCount: spreads.length,
    spreads,
  };
}
