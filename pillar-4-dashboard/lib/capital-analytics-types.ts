export interface CapitalTradeAnalytics {
  filledToday: number;
  filledTotal: number;
  simulatedTotal: number;
  pendingApproval: number;
  failedTotal: number;
  winRatePct: number | null;
  avgNotionalUsd: number | null;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  dailyPnlPct: number | null;
}

export interface RuleScorecard {
  ruleId: string;
  ruleName: string;
  asset: string;
  kind: string;
  state: string;
  firesBacktest: number;
  fillsLive: number;
  lastFiredAt: string | null;
  strategyReturnPct: number | null;
  benchmarkReturnPct: number | null;
  alphaVsSpyPct: number | null;
}

export interface PortfolioBenchmark {
  portfolioReturnPct: number | null;
  spyReturnPct: number | null;
  alphaPct: number | null;
  label: string;
  asOf: string;
}
