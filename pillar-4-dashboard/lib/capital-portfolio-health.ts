import type { CapitalPosition, PortfolioHealthReport } from "./capital-queue-types";

export type { PortfolioHealthReport };

const SECTOR_MAP: Record<string, string> = {
  NVDA: "Technology",
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Technology",
  META: "Technology",
  AMZN: "Consumer",
  TSLA: "Consumer",
  SPY: "Broad market",
  QQQ: "Technology",
  BTC: "Crypto",
  ETH: "Crypto",
};

function sectorForSymbol(symbol: string): string {
  const base = symbol.replace(/-USD$/, "").split("/")[0] ?? symbol;
  return SECTOR_MAP[base] ?? "Other";
}

export function computePortfolioHealth(
  positions: CapitalPosition[],
  portfolioValue: number | null,
): PortfolioHealthReport {
  const total = portfolioValue && portfolioValue > 0
    ? portfolioValue
    : positions.reduce((s, p) => s + Math.abs(p.marketValue ?? p.qty * p.avgEntryPrice), 0);

  if (positions.length === 0 || total <= 0) {
    return {
      score: 70,
      label: "healthy",
      concentrationPct: 0,
      topHoldings: [],
      sectorNotes: ["No open positions — paper portfolio is empty."],
      suggestions: ["Arm a dip rule or subscribe to a pilot to start building exposure."],
    };
  }

  const weights = positions.map((p) => {
    const mv = p.marketValue ?? p.qty * p.avgEntryPrice;
    return {
      symbol: p.symbol,
      weightPct: (mv / total) * 100,
      unrealizedPlPct: p.unrealizedPlPct,
      sector: sectorForSymbol(p.symbol),
    };
  });

  weights.sort((a, b) => b.weightPct - a.weightPct);
  const top = weights[0];
  const concentrationPct = top?.weightPct ?? 0;

  const sectorWeights = new Map<string, number>();
  for (const w of weights) {
    sectorWeights.set(w.sector, (sectorWeights.get(w.sector) ?? 0) + w.weightPct);
  }

  const sectorNotes = [...sectorWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, pct]) => `${sector}: ${pct.toFixed(1)}%`);

  const suggestions: string[] = [];
  if (concentrationPct > 40) {
    suggestions.push(`${top?.symbol} is ${concentrationPct.toFixed(0)}% of portfolio — consider trimming or adding uncorrelated assets.`);
  }
  const rebalanceHints: PortfolioHealthReport["rebalanceHints"] = [];
  if (concentrationPct > 30 && top) {
    const target = Math.min(25, Math.max(15, Math.round(concentrationPct / 2)));
    rebalanceHints.push({
      symbol: top.symbol,
      currentWeightPct: Math.round(concentrationPct * 10) / 10,
      targetWeightPct: target,
    });
  }
  const techPct = sectorWeights.get("Technology") ?? 0;
  if (techPct > 60) {
    suggestions.push(`Technology sector at ${techPct.toFixed(0)}% — add SPY or a value pilot for balance.`);
  }
  const losers = weights.filter((w) => w.unrealizedPlPct < -10);
  if (losers.length > 0) {
    suggestions.push(`${losers.map((l) => l.symbol).join(", ")} down >10% — review stop-loss rules or thesis.`);
  }
  if (suggestions.length === 0) {
    suggestions.push("Allocation looks balanced for a paper portfolio. Revisit after pilot sync or new rules fire.");
  }

  let score = 85;
  if (concentrationPct > 50) score -= 25;
  else if (concentrationPct > 35) score -= 12;
  if (techPct > 70) score -= 10;
  score = Math.max(20, Math.min(100, score));

  const label: PortfolioHealthReport["label"] =
    concentrationPct > 45 ? "concentrated" : score < 65 ? "watch" : "healthy";

  return {
    score,
    label,
    concentrationPct: Math.round(concentrationPct * 10) / 10,
    topHoldings: weights.slice(0, 5).map((w) => ({
      symbol: w.symbol,
      weightPct: Math.round(w.weightPct * 10) / 10,
      unrealizedPlPct: w.unrealizedPlPct,
    })),
    sectorNotes,
    suggestions,
    rebalanceHints: rebalanceHints.length > 0 ? rebalanceHints : undefined,
  };
}
