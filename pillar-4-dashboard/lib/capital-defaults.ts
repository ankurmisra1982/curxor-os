import type { CapitalPermissions, CapitalRiskLimits } from "./capital-queue-types";

export function defaultPermissions(): CapitalPermissions {
  return {
    autonomousMode: "off",
    autonomousGrantedAt: null,
    allowedBrokers: ["alpaca", "tradingview", "webull", "etrade", "robinhood_mcp", "snaptrade"],
    activeBrokerId: "alpaca",
    maxAutoTradesPerDay: 10,
    tradingviewWebhookSecret: null,
    liveMoneyConfirmedAt: null,
  };
}

export function defaultRiskLimits(riskProfile = "balanced"): CapitalRiskLimits {
  switch (riskProfile) {
    case "conservative":
      return { maxPositionPct: 8, maxDailyLossPct: 2, maxSectorPct: 25, pdtGuard: true };
    case "aggressive":
      return { maxPositionPct: 25, maxDailyLossPct: 8, maxSectorPct: 60, pdtGuard: false };
    default:
      return { maxPositionPct: 15, maxDailyLossPct: 4, maxSectorPct: 40, pdtGuard: true };
  }
}
