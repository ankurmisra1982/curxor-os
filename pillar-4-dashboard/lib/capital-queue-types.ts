export type RuleState = "ARMED" | "PAUSED";

export type TradeAction = "buy" | "sell";

export type TradeStatus =
  | "queued"
  | "submitted"
  | "filled"
  | "failed"
  | "dry_run"
  | "simulated"
  | "pending_approval"
  | "blocked_risk";

export type PilotCategory = "tracker" | "thematic" | "ai" | "managed" | "index";

export type SubscriptionState = "active" | "paused";

export interface PilotHolding {
  symbol: string;
  weightPct: number;
}

export interface PilotPerformance {
  w1: number;
  m1: number;
  m3: number;
  m6: number;
  y1: number;
}

export interface CapitalPilot {
  id: string;
  name: string;
  author: string;
  category: PilotCategory;
  description: string;
  featured: boolean;
  referenceAumUsd: number;
  minAllocationUsd: number;
  holdings: PilotHolding[];
  performance: PilotPerformance;
  updatedAt: string;
  feedSource?: "demo" | "live_sec" | "live_quiver";
  lastFeedAt?: string | null;
  feedNote?: string | null;
  disclosureLagDays?: number | null;
  recentDisclosures?: Array<{
    ticker: string;
    tradedAt: string;
    filedAt: string;
    lagDays: number;
    politician: string;
  }>;
}

export interface PilotSubscription {
  id: string;
  pilotId: string;
  allocationUsd: number;
  brokerId: BrokerId;
  state: SubscriptionState;
  copyEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PilotSignal {
  id: string;
  pilotId: string;
  ticker: string;
  action: TradeAction;
  pilotQty: number;
  pilotNotionalUsd: number | null;
  emittedAt: string;
  copiedCount: number;
}

export type TradeSource = "manual" | "agent" | "autonomous" | "tradingview" | "pilot_copy";

export type RuleKind = "signal" | "rebalance";

export type ConditionType =
  | "manual_trigger"
  | "price_drop_pct"
  | "price_above_ma"
  | "rsi_oversold"
  | "pct_change_1d"
  | "breakout_20d_high"
  | "tradingview_webhook"
  | "crypto_wallet_signal"
  | "options_iv_rank";

export type BrokerId =
  | "alpaca"
  | "webull"
  | "etrade"
  | "robinhood_mcp"
  | "tradingview"
  | "snaptrade"
  | "fidelity"
  | "public";

export interface TaxLotSummary {
  symbol: string;
  qty: number;
  costBasisUsd: number | null;
  avgCostUsd: number | null;
  marketValueUsd: number;
  unrealizedPlUsd: number | null;
  source: "alpaca" | "fifo_estimated" | "estimated";
  washSaleHint?: string | null;
}

export interface PortfolioHealthReport {
  score: number;
  label: "healthy" | "watch" | "concentrated";
  concentrationPct: number;
  topHoldings: Array<{ symbol: string; weightPct: number; unrealizedPlPct: number }>;
  sectorNotes: string[];
  suggestions: string[];
  costBasisBeta?: TaxLotSummary[];
}

export interface TradePreview {
  ticker: string;
  action: string;
  qty: number;
  referencePrice: number | null;
  estimatedNotionalUsd: number | null;
  brokerId: string;
  buyingPower: number | null;
  autoApproveEligible: boolean;
  riskNote: string | null;
}

export type BrokerTier = "live" | "webhook" | "mcp" | "planned" | "unavailable";

export type AutonomousMode = "off" | "approval_each" | "auto_armed_rules";

export interface CapitalRiskLimits {
  maxPositionPct: number;
  maxDailyLossPct: number;
  maxSectorPct: number;
  pdtGuard: boolean;
}

export interface CapitalPermissions {
  autonomousMode: AutonomousMode;
  autonomousGrantedAt: string | null;
  allowedBrokers: BrokerId[];
  activeBrokerId: BrokerId;
  maxAutoTradesPerDay: number;
  tradingviewWebhookSecret: string | null;
  liveMoneyConfirmedAt: string | null;
}

export interface RuleBacktestSummary {
  fires90d: number;
  lastRunAt: string | null;
  note: string;
  equityCurve?: Array<{ t: string; value: number }>;
  benchmarkReturnPct?: number;
  strategyReturnPct?: number;
  benchmarkCurve?: Array<{ t: string; value: number }>;
  estimatedFeesUsd?: number;
}

export interface CapitalRule {
  id: string;
  name: string;
  asset: string;
  kind: RuleKind;
  condition: string;
  conditionType: ConditionType;
  conditionParams: Record<string, number | string>;
  action: TradeAction;
  qty: number;
  qtyMode: "fixed" | "pct_equity";
  state: RuleState;
  brokerId: BrokerId;
  takeProfitPct: number | null;
  stopLossPct: number | null;
  targetWeight: number | null;
  driftThresholdPct: number | null;
  schedule: "manual" | "market_close" | "hourly";
  note: string;
  backtest: RuleBacktestSummary | null;
  lastEvaluatedAt: string | null;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapitalTrade {
  id: string;
  ruleId: string | null;
  pilotId: string | null;
  subscriptionId: string | null;
  ticker: string;
  action: TradeAction;
  qty: number;
  status: TradeStatus;
  mode: string;
  brokerId: BrokerId;
  orderId: string | null;
  filledPrice: number | null;
  error: string | null;
  intentId: string | null;
  idempotencyKey: string | null;
  riskDecision: string | null;
  takeProfitPct: number | null;
  stopLossPct: number | null;
  source: TradeSource;
  approvalNote: string | null;
  createdAt: string;
  submittedAt: string | null;
  filledAt: string | null;
}

export interface CapitalPosition {
  symbol: string;
  qty: number;
  marketValue: number;
  avgEntryPrice: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
}

export interface WatchlistMover {
  symbol: string;
  price: number | null;
  changePct1d: number | null;
  changePct5d: number | null;
  rsi14: number | null;
}

export interface BrokerIntegrationStatus {
  id: BrokerId;
  label: string;
  tier: BrokerTier;
  configured: boolean;
  detail: string;
}

export interface CapitalQueueFile {
  version: 1;
  updatedAt: string;
  tradingPaused: boolean;
  permissions: CapitalPermissions;
  autoApproval: import("./capital-auto-approval-types").AutoApprovalPolicy;
  riskLimits: CapitalRiskLimits;
  dailyPnlPct: number;
  autoTradesToday: number;
  autoTradesDay: string;
  rules: CapitalRule[];
  trades: CapitalTrade[];
  positions: CapitalPosition[];
  movers: WatchlistMover[];
  quotesUpdatedAt: string | null;
  cachedPortfolioValue: number | null;
  pilots: CapitalPilot[];
  subscriptions: PilotSubscription[];
  pilotSignals: PilotSignal[];
  agentAuditLog: AgentAuditEntry[];
}

export interface AgentAuditEntry {
  id: string;
  at: string;
  kind: "preview" | "execute" | "blocked" | "kill_switch" | "tool_call" | "mcp";
  source: "agent" | "claw" | "mcp" | "heartbeat";
  tool?: string;
  ticker?: string;
  qty?: number;
  action?: TradeAction;
  note: string;
  tradeId?: string | null;
}

export interface CapitalQueueStatus {
  source: "alpaca" | "demo";
  tradingMode: string;
  riskProfile: string;
  liveEnvEnabled: boolean;
  liveMoneyConfirmed: boolean;
  bridgeConfigured: boolean;
  tradingPaused: boolean;
  portfolioValue: number | null;
  portfolioLabel: string;
  buyingPower: number | null;
  currency: string;
  watchlist: string[];
  rules: CapitalRule[];
  trades: CapitalTrade[];
  positions: CapitalPosition[];
  movers: WatchlistMover[];
  permissions: CapitalPermissions;
  autoApproval: import("./capital-auto-approval-types").AutoApprovalPolicy;
  riskLimits: CapitalRiskLimits;
  brokers: BrokerIntegrationStatus[];
  dailyPnlPct: number;
  pilots: CapitalPilot[];
  subscriptions: PilotSubscription[];
  pilotSignals: PilotSignal[];
  updatedAt: string;
  portfolioHealth: PortfolioHealthReport;
  agentAuditLog: AgentAuditEntry[];
  stats: {
    armedRules: number;
    openTrades: number;
    filledToday: number;
    failedTrades: number;
    autoTradesRemaining: number;
    activePilotSubs: number;
  };
}
