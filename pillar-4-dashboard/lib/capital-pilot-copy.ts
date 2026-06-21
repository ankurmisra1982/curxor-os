import "server-only";

import type { CapitalPilot, PilotHolding, PilotSubscription } from "./capital-queue-types";

export function proportionalQty(
  pilotQty: number,
  pilotReferenceAum: number,
  userAllocationUsd: number,
): number {
  if (pilotReferenceAum <= 0 || userAllocationUsd <= 0) return 0;
  const scale = userAllocationUsd / pilotReferenceAum;
  const qty = pilotQty * scale;
  return Math.max(0.001, Math.round(qty * 1000) / 1000);
}

export function targetQtyForHolding(
  holding: PilotHolding,
  allocationUsd: number,
  price: number,
): number {
  if (holding.symbol === "CASH" || price <= 0) return 0;
  const notional = (allocationUsd * holding.weightPct) / 100;
  return Math.max(0.001, Math.round((notional / price) * 1000) / 1000);
}

export function rebalanceDeltas(
  pilot: CapitalPilot,
  subscription: PilotSubscription,
  prices: Map<string, number>,
  currentQty: Map<string, number>,
): Array<{ ticker: string; action: "buy" | "sell"; qty: number; reason: string }> {
  const deltas: Array<{ ticker: string; action: "buy" | "sell"; qty: number; reason: string }> = [];

  for (const h of pilot.holdings) {
    if (h.symbol === "CASH") continue;
    const price = prices.get(h.symbol.replace("-", "")) ?? prices.get(h.symbol) ?? 0;
    if (price <= 0) continue;
    const target = targetQtyForHolding(h, subscription.allocationUsd, price);
    const current = currentQty.get(h.symbol) ?? 0;
    const diff = target - current;
    if (Math.abs(diff) < 0.01) continue;
    deltas.push({
      ticker: h.symbol,
      action: diff > 0 ? "buy" : "sell",
      qty: Math.abs(Math.round(diff * 1000) / 1000),
      reason: `Pilot ${pilot.id} weight ${h.weightPct}%`,
    });
  }
  return deltas;
}

export function subscriptionVirtualQty(
  trades: Array<{ subscriptionId: string | null; ticker: string; action: string; qty: number; status: string }>,
  subscriptionId: string,
): Map<string, number> {
  const qty = new Map<string, number>();
  for (const t of trades) {
    if (t.subscriptionId !== subscriptionId || t.status !== "filled") continue;
    const sym = t.ticker.replace("-", "");
    const cur = qty.get(sym) ?? 0;
    qty.set(sym, t.action === "buy" ? cur + t.qty : cur - t.qty);
  }
  return qty;
}
