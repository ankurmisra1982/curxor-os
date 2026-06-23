import "server-only";

import { ebayApiBase, type EbayLinkState } from "./commerce-ebay-store";
import type { ShopPipelineOrder } from "./shop-dashboard-types";

export interface EbayFulfillmentPayload {
  environment: EbayLinkState["environment"];
  orderLineCount: number;
  orders: Array<Record<string, unknown>>;
  spreads: Array<Record<string, unknown>>;
  pipelineOrders: ShopPipelineOrder[];
}

function mapFulfillmentStage(status: string): ShopPipelineOrder["stage"] {
  const s = status.toUpperCase();
  if (s === "FULFILLED") return "SHIP";
  if (s === "IN_PROGRESS") return "PICK";
  if (s === "NOT_STARTED") return "INGEST";
  return "INGEST";
}

function normalizeEbayPayload(data: Record<string, unknown>): EbayFulfillmentPayload {
  const ordersRaw = Array.isArray(data.orders) ? data.orders : [];
  const orderLines: Array<Record<string, unknown>> = [];
  const spreads: Array<Record<string, unknown>> = [];
  const pipelineOrders: ShopPipelineOrder[] = [];

  for (const order of ordersRaw) {
    if (!order || typeof order !== "object") continue;
    const o = order as Record<string, unknown>;
    const orderId = String(o.orderId ?? o.legacyOrderId ?? "").trim();
    const status = String(o.orderFulfillmentStatus ?? "NOT_STARTED");
    const stage = mapFulfillmentStage(status);
    const lineItems = Array.isArray(o.lineItems) ? o.lineItems : [];

    for (const item of lineItems) {
      if (!item || typeof item !== "object") continue;
      const li = item as Record<string, unknown>;
      const sku = String(li.sku ?? li.title ?? orderId).trim();
      if (!sku) continue;
      const qty = Number(li.quantity ?? 1);
      let sell = 0;
      const cost = li.lineItemCost;
      if (cost && typeof cost === "object") {
        sell = Number((cost as Record<string, unknown>).value ?? 0);
      }
      orderLines.push({
        orderId,
        sku,
        title: String(li.title ?? ""),
        quantity: qty,
        sellPrice: sell,
        fulfillmentStatus: status,
      });
      spreads.push({
        sku,
        label: String(li.title ?? sku),
        channelBuy: "Acquisition cost",
        channelSell: "eBay",
        buyPrice: 0,
        sellPrice: sell,
        marginPct: 0,
        alert: false,
        source: "ebay",
      });
      pipelineOrders.push({
        id: orderId ? `${orderId}-${sku}` : sku,
        sku,
        stage,
        eta: status === "FULFILLED" ? "shipped" : "live",
        source: "ebay",
      });
    }
  }

  return {
    environment: "production",
    orderLineCount: orderLines.length,
    orders: orderLines,
    spreads,
    pipelineOrders,
  };
}

/** Dev fallback when digital bridge is offline — same REST as eno2 worker. */
export async function fetchEbayFulfillmentInline(
  creds: EbayLinkState,
  limit = 25,
): Promise<EbayFulfillmentPayload> {
  const base = ebayApiBase(creds.environment);
  const url = `${base}/sell/fulfillment/v1/order?limit=${Math.min(Math.max(limit, 1), 50)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`eBay Fulfillment failed: ${JSON.stringify(json)}`);
  }

  const payload = normalizeEbayPayload(json);
  return { ...payload, environment: creds.environment };
}
