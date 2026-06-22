import "server-only";

import type { CapitalQueueStatus } from "./capital-queue-types";
import { buildCapitalTradeAnalytics, buildRuleScorecards, buildPortfolioBenchmark } from "./capital-analytics";

export interface NlQueryResult {
  query: string;
  intent: string;
  answer: string;
  data?: Record<string, unknown>;
}

export function answerPortfolioQuery(query: string, status: CapitalQueueStatus): NlQueryResult {
  const q = query.trim().toLowerCase();
  const analytics = buildCapitalTradeAnalytics(status.trades, status.dailyPnlPct);
  const scorecards = buildRuleScorecards(status.rules, status.trades);
  const benchmark = buildPortfolioBenchmark(status.trades, status.positions, status.dailyPnlPct);
  const health = status.portfolioHealth;

  if (/exposure|weight|hold|position/.test(q)) {
    const sym = extractSymbol(q) ?? status.watchlist[0] ?? "SPY";
    const pos = status.positions.find((p) => p.symbol.toUpperCase() === sym.toUpperCase());
    const holding = health.topHoldings.find((h) => h.symbol.toUpperCase() === sym.toUpperCase());
    if (pos || holding) {
      const weight = holding?.weightPct ?? null;
      return {
        query,
        intent: "exposure",
        answer: `${sym}: ${pos?.qty ?? "—"} shares · ${weight != null ? `${weight}% of portfolio` : "weight unknown"} · uP&L ${holding?.unrealizedPlPct != null ? `${holding.unrealizedPlPct.toFixed(1)}%` : "—"}`,
        data: { symbol: sym, position: pos, holding },
      };
    }
    return {
      query,
      intent: "exposure",
      answer: `No open position in ${sym}. Watchlist includes ${status.watchlist.slice(0, 5).join(", ")}.`,
    };
  }

  if (/armed|active rule/.test(q)) {
    const armed = status.rules.filter((r) => r.state === "ARMED");
    return {
      query,
      intent: "armed_rules",
      answer:
        armed.length > 0
          ? `${armed.length} armed: ${armed.map((r) => `${r.id} (${r.asset})`).join(", ")}`
          : "No armed rules — arm a rule in Trade tab or run demo tour.",
      data: { count: armed.length, rules: armed.map((r) => r.id) },
    };
  }

  if (/trade|fill|execut/.test(q) && /today|todays/.test(q)) {
    return {
      query,
      intent: "trades_today",
      answer: `${analytics.filledToday} execution(s) today · ${analytics.simulatedTotal} simulated total · ${analytics.pendingApproval} pending approval`,
      data: analytics as unknown as Record<string, unknown>,
    };
  }

  if (/health|concentrat|diversif/.test(q)) {
    return {
      query,
      intent: "portfolio_health",
      answer: `Health score ${health.score} (${health.label}) · top concentration ${health.concentrationPct}% · ${health.suggestions[0] ?? "No suggestions"}`,
      data: { score: health.score, label: health.label },
    };
  }

  if (/spy|benchmark|vs market|alpha/.test(q)) {
    return {
      query,
      intent: "benchmark",
      answer: `Portfolio ${benchmark.portfolioReturnPct ?? "—"}% · daily P&L ${status.dailyPnlPct?.toFixed(2) ?? "—"}% · ${benchmark.label}`,
      data: benchmark as unknown as Record<string, unknown>,
    };
  }

  if (/pending|approval|waiting/.test(q)) {
    return {
      query,
      intent: "pending",
      answer:
        analytics.pendingApproval > 0
          ? `${analytics.pendingApproval} trade(s) awaiting approval — check banner or Trade log`
          : "No trades pending approval.",
    };
  }

  if (/best|top|perform/.test(q) && /rule/.test(q)) {
    const top = [...scorecards].sort((a, b) => (b.fillsLive ?? 0) - (a.fillsLive ?? 0))[0];
    return {
      query,
      intent: "rule_performance",
      answer: top
        ? `Most active: ${top.ruleName} (${top.ruleId}) · ${top.fillsLive} fills · backtest ${top.strategyReturnPct ?? "—"}%`
        : "No rule activity yet — create and arm a rule to start.",
      data: top as unknown as Record<string, unknown>,
    };
  }

  if (/portfolio|buying|value|worth/.test(q)) {
    return {
      query,
      intent: "portfolio_summary",
      answer: `Portfolio ${status.portfolioValue != null ? `$${status.portfolioValue.toLocaleString()}` : "—"} · buying power ${status.buyingPower != null ? `$${status.buyingPower.toLocaleString()}` : "—"} · ${status.portfolioLabel ?? status.source}`,
    };
  }

  return {
    query,
    intent: "help",
    answer:
      'Try: "NVDA exposure", "armed rules", "trades today", "portfolio health", "pending approval", "portfolio value".',
  };
}

function extractSymbol(q: string): string | null {
  const m = /\b([A-Z]{1,5}(?:-USD)?)\b/i.exec(q.toUpperCase());
  if (m) return m[1]!.toUpperCase();
  const names: Record<string, string> = {
    nvidia: "NVDA",
    apple: "AAPL",
    tesla: "TSLA",
    bitcoin: "BTC-USD",
    spy: "SPY",
  };
  for (const [name, sym] of Object.entries(names)) {
    if (q.includes(name)) return sym;
  }
  return null;
}
