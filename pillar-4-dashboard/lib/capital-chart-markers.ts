import type { ChartTradeMarker } from "./capital-alpha-types";
import type { CapitalTrade, PilotSignal } from "./capital-queue-types";

export function chartMarkersForSymbol(
  symbol: string,
  trades: CapitalTrade[],
  signals: PilotSignal[],
): ChartTradeMarker[] {
  const sym = symbol.toUpperCase();
  const markers: ChartTradeMarker[] = [];

  for (const t of trades) {
    if (t.ticker.toUpperCase() !== sym) continue;
    if (!["filled", "simulated", "submitted"].includes(t.status)) continue;
    const day = (t.filledAt ?? t.submittedAt ?? t.createdAt).slice(0, 10);
    markers.push({
      t: day,
      price: t.filledPrice ?? 0,
      kind: t.action === "sell" ? "sell" : "buy",
      label: `${t.action} ${t.qty}`,
    });
  }

  for (const s of signals) {
    if (s.ticker.toUpperCase() !== sym) continue;
    markers.push({
      t: s.emittedAt.slice(0, 10),
      price: 0,
      kind: "pilot",
      label: `Pilot ${s.action}`,
    });
  }

  return markers;
}
