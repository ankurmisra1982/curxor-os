import type { CapitalPosition, CapitalTrade, TaxLotSummary } from "./capital-queue-types";

export type { TaxLotSummary };

interface LotRow {
  qty: number;
  costPerShare: number;
  acquiredAt: string;
}

/** FIFO cost basis from buy/sell/simulated/filled trade history (beta). */
export function buildFifoLotsFromTrades(trades: CapitalTrade[]): Map<string, LotRow[]> {
  const lots = new Map<string, LotRow[]>();
  const sorted = [...trades]
    .filter((t) => ["filled", "simulated", "submitted"].includes(t.status))
    .sort((a, b) => Date.parse(a.filledAt ?? a.createdAt) - Date.parse(b.filledAt ?? b.createdAt));

  for (const t of sorted) {
    const sym = t.ticker.toUpperCase();
    const price = t.filledPrice ?? 100;
    const book = lots.get(sym) ?? [];
    if (t.action === "buy") {
      book.push({ qty: t.qty, costPerShare: price, acquiredAt: t.filledAt ?? t.createdAt });
      lots.set(sym, book);
    } else if (t.action === "sell") {
      let remaining = t.qty;
      while (remaining > 0 && book.length > 0) {
        const head = book[0]!;
        if (head.qty <= remaining) {
          remaining -= head.qty;
          book.shift();
        } else {
          head.qty -= remaining;
          remaining = 0;
        }
      }
      lots.set(sym, book);
    }
  }
  return lots;
}

function washSaleHint(trades: CapitalTrade[], symbol: string): string | null {
  const sym = symbol.toUpperCase();
  const sells = trades.filter(
    (t) => t.ticker === sym && t.action === "sell" && (t.status === "filled" || t.status === "simulated"),
  );
  const buys = trades.filter(
    (t) => t.ticker === sym && t.action === "buy" && (t.status === "filled" || t.status === "simulated"),
  );
  if (sells.length === 0 || buys.length === 0) return null;
  const lastSell = sells[sells.length - 1]!;
  const sellAt = Date.parse(lastSell.filledAt ?? lastSell.createdAt);
  const rebuy = buys.find((b) => {
    const buyAt = Date.parse(b.filledAt ?? b.createdAt);
    return buyAt > sellAt && buyAt - sellAt < 30 * 86_400_000;
  });
  if (rebuy) return "Possible wash-sale window — review before tax reporting";
  return null;
}

/** Cost basis from Alpaca positions or FIFO trade history. */
export function buildTaxLotSummaries(
  positions: CapitalPosition[],
  trades: CapitalTrade[] = [],
): TaxLotSummary[] {
  const fifo = buildFifoLotsFromTrades(trades);

  return positions.map((p) => {
    const avgCostAlpaca = p.avgEntryPrice > 0 ? p.avgEntryPrice : null;
    const fifoLots = fifo.get(p.symbol.toUpperCase()) ?? [];
    const fifoQty = fifoLots.reduce((s, l) => s + l.qty, 0);
    const fifoCost =
      fifoQty > 0
        ? fifoLots.reduce((s, l) => s + l.qty * l.costPerShare, 0) / fifoQty
        : null;

    const avgCost = avgCostAlpaca ?? fifoCost;
    const costBasis = avgCost != null ? p.qty * avgCost : null;
    const marketValue = p.marketValue ?? (avgCost != null ? p.qty * avgCost : 0);
    const source: TaxLotSummary["source"] = avgCostAlpaca
      ? "alpaca"
      : fifoCost != null
        ? "fifo_estimated"
        : "estimated";

    return {
      symbol: p.symbol,
      qty: p.qty,
      costBasisUsd: costBasis,
      avgCostUsd: avgCost,
      marketValueUsd: marketValue,
      unrealizedPlUsd: p.unrealizedPl ?? (costBasis != null ? marketValue - costBasis : null),
      source,
      washSaleHint: washSaleHint(trades, p.symbol),
    };
  });
}
