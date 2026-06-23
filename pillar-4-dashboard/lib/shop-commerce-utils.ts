import "server-only";

import type { DigitalReceipt } from "./digital-protocol";
import type { SkuSpreadRow, SpreadSource } from "./shop-margin-watch";
import { getMeshBridge } from "./zmq-bridge";

export function waitForDigitalReceipt(intentId: string, timeoutMs: number): Promise<DigitalReceipt | null> {
  const bridge = getMeshBridge();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (receipt: DigitalReceipt | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      resolve(receipt);
    };
    const unsub = bridge.subscribeDigital((receipt) => {
      if (receipt.id === intentId) finish(receipt);
    });
    void bridge.ensureStarted();
    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

export function spreadsFromReceipt(receipt: DigitalReceipt, source: SpreadSource): SkuSpreadRow[] {
  const raw = receipt.receipt.spreads;
  if (!Array.isArray(raw)) return [];
  const out: SkuSpreadRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const sku = String(r.sku ?? "").trim();
    if (!sku) continue;
    out.push({
      sku,
      label: String(r.label ?? sku),
      channelBuy: String(r.channelBuy ?? "—"),
      channelSell: String(r.channelSell ?? source),
      buyPrice: Number(r.buyPrice ?? 0),
      sellPrice: Number(r.sellPrice ?? 0),
      marginPct: Number(r.marginPct ?? 0),
      alert: Boolean(r.alert),
      source: (r.source as SpreadSource | undefined) ?? source,
    });
  }
  return out;
}

export function mergeSpreadRows(...groups: SkuSpreadRow[][]): SkuSpreadRow[] {
  const seen = new Set<string>();
  const out: SkuSpreadRow[] = [];
  for (const group of groups) {
    for (const row of group) {
      const key = `${row.source ?? "demo"}:${row.sku}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
  }
  return out;
}

export type CommerceSyncVia = "eno2" | "inline" | "mock";

export interface CommerceSyncResultBase {
  ok: boolean;
  receiptId: string | null;
  tool: string;
  error?: string;
  via: CommerceSyncVia;
}
