import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { readAppFreState } from "./app-fre-state";
import { loadDigitalEnv } from "./digital-env";
import {
  fetchAlpacaAccount,
  fetchAlpacaPositions,
  fetchPortfolioHistory,
  loadAlpacaCreds,
} from "./capital-alpaca-client";
import { buildBrokerStatus } from "./capital-broker-registry";
import { defaultPermissions, defaultRiskLimits } from "./capital-defaults";
import { defaultAutoApprovalPolicy } from "./capital-auto-approval-types";
import type {
  BrokerId,
  CapitalPilot,
  CapitalPosition,
  CapitalQueueFile,
  CapitalQueueStatus,
  CapitalRule,
  CapitalTrade,
  ConditionType,
  PilotSignal,
  PilotSubscription,
  RuleKind,
  RuleState,
  TradeAction,
  TradeSource,
} from "./capital-queue-types";
import { mergePilotCatalog } from "./capital-pilot-catalog";
import { computePortfolioHealth } from "./capital-portfolio-health";
import { buildTaxLotSummaries } from "./capital-tax-lots";
import { isCapitalLiveEnvEnabled } from "./capital-live-env";

function storePath(): string {
  return process.env.CURXOR_CAPITAL_QUEUE_PATH ?? "/etc/curxor/capital-queue.json";
}

/** Serializes JSON read-modify-write cycles to prevent lost updates under concurrent POSTs. */
let capitalMutationChain: Promise<unknown> = Promise.resolve();

function runCapitalMutation<T>(fn: () => Promise<T>): Promise<T> {
  const run = capitalMutationChain.then(fn, fn);
  capitalMutationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfTodayUtc(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function mapLegacyCondition(condition: string): { conditionType: ConditionType; params: Record<string, number | string> } {
  switch (condition) {
    case "price_drop_5pct":
      return { conditionType: "price_drop_pct", params: { thresholdPct: 5 } };
    case "breakout_daily":
      return { conditionType: "breakout_20d_high", params: {} };
    case "allocation_overweight":
      return { conditionType: "manual_trigger", params: {} };
    case "tradingview_webhook":
      return { conditionType: "tradingview_webhook", params: {} };
    default:
      if (condition === "price_drop_pct" || condition === "rsi_oversold" || condition === "pct_change_1d") {
        return { conditionType: condition as ConditionType, params: {} };
      }
      return { conditionType: "manual_trigger", params: {} };
  }
}

function migrateRule(raw: Partial<CapitalRule> & { condition?: string }): CapitalRule {
  const now = new Date().toISOString();
  const legacy = mapLegacyCondition(String(raw.conditionType ?? raw.condition ?? "manual_trigger"));
  const kind: RuleKind = raw.kind ?? (raw.targetWeight != null ? "rebalance" : "signal");
  return {
    id: String(raw.id ?? `RULE-${Date.now()}`),
    name: String(raw.name ?? "Rule"),
    asset: String(raw.asset ?? "SPY").toUpperCase(),
    kind,
    condition: String(raw.condition ?? legacy.conditionType),
    conditionType: (raw.conditionType as ConditionType | undefined) ?? legacy.conditionType,
    conditionParams: raw.conditionParams ?? legacy.params,
    action: (raw.action as TradeAction | undefined) ?? "buy",
    qty: typeof raw.qty === "number" ? raw.qty : 1,
    qtyMode: raw.qtyMode ?? "fixed",
    state: (raw.state as RuleState | undefined) ?? "PAUSED",
    brokerId: (raw.brokerId as BrokerId | undefined) ?? "alpaca",
    takeProfitPct: raw.takeProfitPct ?? null,
    stopLossPct: raw.stopLossPct ?? null,
    targetWeight: raw.targetWeight ?? null,
    driftThresholdPct: raw.driftThresholdPct ?? 10,
    schedule: raw.schedule ?? "market_close",
    note: String(raw.note ?? ""),
    backtest: raw.backtest ?? null,
    lastEvaluatedAt: raw.lastEvaluatedAt ?? null,
    lastFiredAt: raw.lastFiredAt ?? null,
    createdAt: String(raw.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? now),
  };
}

function migrateTrade(raw: Partial<CapitalTrade>): CapitalTrade {
  const now = new Date().toISOString();
  return {
    id: String(raw.id ?? `TRD-${Date.now()}`),
    ruleId: raw.ruleId ?? null,
    pilotId: raw.pilotId ?? null,
    subscriptionId: raw.subscriptionId ?? null,
    ticker: String(raw.ticker ?? "").toUpperCase(),
    action: (raw.action as TradeAction | undefined) ?? "buy",
    qty: typeof raw.qty === "number" ? raw.qty : 1,
    status: raw.status ?? "queued",
    mode: String(raw.mode ?? "paper"),
    brokerId: (raw.brokerId as BrokerId | undefined) ?? "alpaca",
    orderId: raw.orderId ?? null,
    filledPrice: raw.filledPrice ?? null,
    error: raw.error ?? null,
    intentId: raw.intentId ?? null,
    idempotencyKey: raw.idempotencyKey ?? null,
    riskDecision: raw.riskDecision ?? null,
    takeProfitPct: raw.takeProfitPct ?? null,
    stopLossPct: raw.stopLossPct ?? null,
    source: (raw.source as TradeSource | undefined) ?? "manual",
    approvalNote: raw.approvalNote ?? null,
    createdAt: String(raw.createdAt ?? now),
    submittedAt: raw.submittedAt ?? null,
    filledAt: raw.filledAt ?? null,
  };
}

function normalizeFile(parsed: Partial<CapitalQueueFile>, riskProfile: string): CapitalQueueFile {
  const day = todayUtc();
  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    tradingPaused: parsed.tradingPaused === true,
    permissions: {
      ...defaultPermissions(),
      ...(parsed.permissions ?? {}),
      activeBrokerId:
        parsed.permissions?.activeBrokerId ?? defaultPermissions().activeBrokerId,
    },
    autoApproval: {
      ...defaultAutoApprovalPolicy(),
      ...(parsed.autoApproval ?? {}),
    },
    riskLimits: { ...defaultRiskLimits(riskProfile), ...(parsed.riskLimits ?? {}) },
    dailyPnlPct: typeof parsed.dailyPnlPct === "number" ? parsed.dailyPnlPct : 0,
    autoTradesToday: typeof parsed.autoTradesToday === "number" ? parsed.autoTradesToday : 0,
    autoTradesDay: typeof parsed.autoTradesDay === "string" ? parsed.autoTradesDay : day,
    rules: Array.isArray(parsed.rules) ? parsed.rules.map((r) => migrateRule(r as Partial<CapitalRule>)) : [],
    trades: Array.isArray(parsed.trades) ? parsed.trades.map((t) => migrateTrade(t as Partial<CapitalTrade>)) : [],
    positions: Array.isArray(parsed.positions) ? (parsed.positions as CapitalPosition[]) : [],
    movers: Array.isArray(parsed.movers) ? parsed.movers : [],
    quotesUpdatedAt: parsed.quotesUpdatedAt ?? null,
    cachedPortfolioValue: typeof parsed.cachedPortfolioValue === "number" ? parsed.cachedPortfolioValue : null,
    pilots: mergePilotCatalog(Array.isArray(parsed.pilots) ? (parsed.pilots as CapitalPilot[]) : []),
    subscriptions: Array.isArray(parsed.subscriptions) ? (parsed.subscriptions as PilotSubscription[]) : [],
    pilotSignals: Array.isArray(parsed.pilotSignals) ? (parsed.pilotSignals as PilotSignal[]) : [],
    agentAuditLog: Array.isArray(parsed.agentAuditLog)
      ? (parsed.agentAuditLog as import("./capital-queue-types").AgentAuditEntry[]).slice(0, 100)
      : [],
  };
}

function emptyFile(riskProfile: string): CapitalQueueFile {
  return normalizeFile({ rules: [], trades: [] }, riskProfile);
}

export async function isAlpacaBridgeConfigured(): Promise<boolean> {
  const env = await loadDigitalEnv();
  return Boolean(env.ALPACA_API_KEY_ID?.trim() && env.ALPACA_API_SECRET_KEY?.trim());
}

async function writeCapitalFile(data: CapitalQueueFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function writeCapitalFilePartial(data: CapitalQueueFile): Promise<void> {
  return runCapitalMutation(async () => {
    await writeCapitalFile(data);
  });
}

export async function ensureCapitalQueue(): Promise<CapitalQueueFile> {
  const fre = await readAppFreState("my-capital");
  const riskProfile = typeof fre.config.riskProfile === "string" ? fre.config.riskProfile : "balanced";
  const filePath = storePath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<CapitalQueueFile>;
    return normalizeFile(parsed, riskProfile);
  } catch {
    const seeded = seedDemoQueue(riskProfile);
    await writeCapitalFile(seeded);
    return seeded;
  }
}

function seedDemoQueue(riskProfile: string): CapitalQueueFile {
  const now = new Date().toISOString();
  const rules: CapitalRule[] = [
    migrateRule({
      id: "RULE-01",
      name: "BTC dip buy",
      asset: "BTC-USD",
      condition: "price_drop_5pct",
      conditionType: "price_drop_pct",
      conditionParams: { thresholdPct: 5 },
      action: "buy",
      qty: 0.01,
      state: "ARMED",
      stopLossPct: 3,
      takeProfitPct: 8,
      note: "Demo rule — buy on 5% dip with bracket",
      createdAt: now,
      updatedAt: now,
    }),
    migrateRule({
      id: "RULE-02",
      name: "NVDA momentum",
      asset: "NVDA",
      condition: "breakout_daily",
      conditionType: "breakout_20d_high",
      action: "buy",
      qty: 1,
      state: "PAUSED",
      note: "Paused until earnings pass",
      createdAt: now,
      updatedAt: now,
    }),
    migrateRule({
      id: "RULE-03",
      name: "SPY rebalance trim",
      asset: "SPY",
      kind: "rebalance",
      condition: "allocation_overweight",
      action: "sell",
      qty: 2,
      targetWeight: 30,
      driftThresholdPct: 8,
      state: "PAUSED",
      note: "Trim when SPY drifts above target weight",
      createdAt: now,
      updatedAt: now,
    }),
  ];
  return normalizeFile({ tradingPaused: false, rules, trades: [] }, riskProfile);
}

function demoPortfolioValue(watchlist: string[]): number {
  const seed = watchlist.join("").length * 12_400;
  return 100_000 + seed;
}

async function computeDailyPnlPct(creds: Awaited<ReturnType<typeof loadAlpacaCreds>>): Promise<number> {
  if (!creds) return 0;
  const hist = await fetchPortfolioHistory(creds);
  if (hist.length < 2) return 0;
  const last = hist[hist.length - 1]!.equity;
  const prev = hist[hist.length - 2]!.equity;
  if (!prev) return 0;
  return ((last - prev) / prev) * 100;
}

export async function syncPositionsAndPnl(): Promise<CapitalQueueFile> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const creds = await loadAlpacaCreds();
    if (creds) {
      file.positions = await fetchAlpacaPositions(creds);
      file.dailyPnlPct = await computeDailyPnlPct(creds);
      const acct = await fetchAlpacaAccount(creds);
      file.cachedPortfolioValue = acct?.equity ?? null;
    }
    const day = todayUtc();
    if (file.autoTradesDay !== day) {
      file.autoTradesDay = day;
      file.autoTradesToday = 0;
    }
    await writeCapitalFile(file);
    return file;
  });
}

export async function fetchCapitalStatus(): Promise<CapitalQueueStatus> {
  const fre = await readAppFreState("my-capital");
  const tradingMode = typeof fre.config.tradingMode === "string" ? fre.config.tradingMode : "paper";
  const riskProfile = typeof fre.config.riskProfile === "string" ? fre.config.riskProfile : "balanced";
  const watchlist = Array.isArray(configWatchlist(fre.config.seedWatchlist))
    ? configWatchlist(fre.config.seedWatchlist)
    : ["BTC-USD", "NVDA", "SPY"];

  const [file, bridgeConfigured, brokers, creds] = await Promise.all([
    syncPositionsAndPnl(),
    isAlpacaBridgeConfigured(),
    buildBrokerStatus(),
    loadAlpacaCreds(),
  ]);

  const account = creds ? await fetchAlpacaAccount(creds) : null;
  const todayStart = startOfTodayUtc();
  const filledToday = file.trades.filter(
    (t) => t.status === "filled" && t.filledAt && Date.parse(t.filledAt) >= todayStart,
  ).length;
  const autoRemaining = Math.max(0, file.permissions.maxAutoTradesPerDay - file.autoTradesToday);
  const demoVal = demoPortfolioValue(watchlist);
  const portfolioHealth = {
    ...computePortfolioHealth(file.positions, account?.equity ?? demoVal),
    costBasisBeta: buildTaxLotSummaries(file.positions, file.trades),
  };

  const base = {
    tradingMode,
    riskProfile,
    liveEnvEnabled: await isCapitalLiveEnvEnabled(),
    liveMoneyConfirmed: Boolean(file.permissions.liveMoneyConfirmedAt),
    bridgeConfigured,
    tradingPaused: file.tradingPaused,
    watchlist,
    rules: file.rules,
    trades: file.trades,
    positions: file.positions,
    movers: file.movers,
    permissions: file.permissions,
    autoApproval: file.autoApproval,
    riskLimits: file.riskLimits,
    brokers,
    dailyPnlPct: file.dailyPnlPct,
    pilots: file.pilots,
    subscriptions: file.subscriptions,
    pilotSignals: file.pilotSignals,
    updatedAt: file.updatedAt,
    portfolioHealth,
    agentAuditLog: file.agentAuditLog,
    stats: {
      armedRules: file.rules.filter((r) => r.state === "ARMED").length,
      openTrades: file.trades.filter((t) => t.status === "queued" || t.status === "submitted").length,
      filledToday,
      failedTrades: file.trades.filter((t) => t.status === "failed").length,
      autoTradesRemaining: autoRemaining,
      activePilotSubs: file.subscriptions.filter((s) => s.state === "active").length,
    },
  };

  if (account) {
    return {
      ...base,
      source: "alpaca",
      portfolioValue: account.equity,
      portfolioLabel: tradingMode,
      buyingPower: account.buyingPower,
      currency: account.currency,
    };
  }

  const demoValue = demoPortfolioValue(watchlist);
  return {
    ...base,
    source: "demo",
    portfolioValue: demoValue,
    portfolioLabel: bridgeConfigured ? `${tradingMode} · offline` : `${tradingMode} · demo`,
    buyingPower: demoValue * 0.25,
    currency: "USD",
  };
}

function configWatchlist(seed: unknown): string[] {
  return Array.isArray(seed) ? seed.filter((x): x is string => typeof x === "string") : [];
}

export async function getCapitalRule(ruleId: string): Promise<CapitalRule | null> {
  const file = await ensureCapitalQueue();
  return file.rules.find((r) => r.id === ruleId) ?? null;
}

function nextRuleId(rules: CapitalRule[]): string {
  const maxNum = rules.reduce((max, r) => {
    const m = /^RULE-(\d+)$/.exec(r.id);
    const n = m ? Number.parseInt(m[1]!, 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `RULE-${String(maxNum + 1).padStart(2, "0")}`;
}

export async function createRule(input: {
  name: string;
  asset: string;
  condition?: string;
  conditionType?: ConditionType;
  conditionParams?: Record<string, number | string>;
  action?: TradeAction;
  qty?: number;
  note?: string;
  kind?: RuleKind;
  brokerId?: BrokerId;
  takeProfitPct?: number | null;
  stopLossPct?: number | null;
  targetWeight?: number | null;
  driftThresholdPct?: number | null;
  schedule?: CapitalRule["schedule"];
}): Promise<CapitalRule> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const now = new Date().toISOString();
    const legacy = mapLegacyCondition(input.conditionType ?? input.condition ?? "manual_trigger");
    const rule = migrateRule({
      id: nextRuleId(file.rules),
      name: input.name.trim(),
      asset: input.asset.trim().toUpperCase(),
      kind: input.kind ?? (input.targetWeight != null ? "rebalance" : "signal"),
      condition: input.condition?.trim() || legacy.conditionType,
      conditionType: input.conditionType ?? legacy.conditionType,
      conditionParams: input.conditionParams ?? legacy.params,
      action: input.action ?? "buy",
      qty: input.qty ?? 1,
      state: "PAUSED",
      brokerId: input.brokerId ?? file.permissions.activeBrokerId ?? "alpaca",
      takeProfitPct: input.takeProfitPct ?? null,
      stopLossPct: input.stopLossPct ?? null,
      targetWeight: input.targetWeight ?? null,
      driftThresholdPct: input.driftThresholdPct ?? 10,
      schedule: input.schedule ?? "market_close",
      note: input.note?.trim() ?? "",
      createdAt: now,
      updatedAt: now,
    });
    file.rules.push(rule);
    await writeCapitalFile(file);
    return rule;
  });
}

export async function setRuleState(ruleId: string, state: RuleState): Promise<CapitalRule | null> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const idx = file.rules.findIndex((r) => r.id === ruleId);
    if (idx < 0) return null;
    file.rules[idx] = { ...file.rules[idx]!, state, updatedAt: new Date().toISOString() };
    await writeCapitalFile(file);
    return file.rules[idx]!;
  });
}

export async function deleteRule(ruleId: string): Promise<boolean> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const before = file.rules.length;
    file.rules = file.rules.filter((r) => r.id !== ruleId);
    if (file.rules.length === before) return false;
    await writeCapitalFile(file);
    return true;
  });
}

export async function setTradingPaused(paused: boolean): Promise<void> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    file.tradingPaused = paused;
    await writeCapitalFile(file);
  });
}

export async function setRiskLimits(patch: Partial<CapitalQueueFile["riskLimits"]>): Promise<void> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    file.riskLimits = { ...file.riskLimits, ...patch };
    await writeCapitalFile(file);
  });
}

export async function recordTrade(trade: Omit<CapitalTrade, "id" | "createdAt">): Promise<CapitalTrade> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const row: CapitalTrade = {
      ...trade,
      id: `TRD-${String(file.trades.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
    };
    file.trades.unshift(row);
    file.trades = file.trades.slice(0, 200);
    await writeCapitalFile(file);
    return row;
  });
}

export async function updateTrade(
  tradeId: string,
  patch: Partial<
    Pick<
      CapitalTrade,
      "status" | "orderId" | "filledPrice" | "error" | "intentId" | "submittedAt" | "filledAt" | "riskDecision" | "approvalNote"
    >
  >,
): Promise<CapitalTrade | null> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const idx = file.trades.findIndex((t) => t.id === tradeId);
    if (idx < 0) return null;
    file.trades[idx] = { ...file.trades[idx]!, ...patch };
    await writeCapitalFile(file);
    return file.trades[idx]!;
  });
}

export async function listFailedTrades(): Promise<CapitalTrade[]> {
  const file = await ensureCapitalQueue();
  return file.trades.filter((t) => t.status === "failed");
}

export async function markRuleEvaluated(ruleId: string, fired: boolean): Promise<void> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const idx = file.rules.findIndex((r) => r.id === ruleId);
    if (idx < 0) return;
    const now = new Date().toISOString();
    file.rules[idx] = {
      ...file.rules[idx]!,
      lastEvaluatedAt: now,
      lastFiredAt: fired ? now : file.rules[idx]!.lastFiredAt,
      updatedAt: now,
    };
    await writeCapitalFile(file);
  });
}

export async function incrementAutoTradeCount(): Promise<void> {
  return runCapitalMutation(async () => {
    const file = await ensureCapitalQueue();
    const day = todayUtc();
    if (file.autoTradesDay !== day) {
      file.autoTradesDay = day;
      file.autoTradesToday = 0;
    }
    file.autoTradesToday += 1;
    await writeCapitalFile(file);
  });
}

export function defaultQtyForRisk(riskProfile: string, asset: string): number {
  const crypto = asset.includes("-") || asset.includes("/");
  switch (riskProfile) {
    case "conservative":
      return crypto ? 0.005 : 1;
    case "aggressive":
      return crypto ? 0.05 : 5;
    default:
      return crypto ? 0.01 : 2;
  }
}

export async function seedRulesFromWatchlistIfEmpty(): Promise<number> {
  const file = await ensureCapitalQueue();
  if (file.rules.length > 0) return 0;
  const fre = await readAppFreState("my-capital");
  const watchlist = configWatchlist(fre.config.seedWatchlist);
  const list = watchlist.length > 0 ? watchlist : ["BTC-USD", "NVDA", "SPY"];
  const risk = typeof fre.config.riskProfile === "string" ? fre.config.riskProfile : "balanced";
  for (const asset of list) {
    await createRule({
      name: `${asset} watch`,
      asset,
      conditionType: "manual_trigger",
      action: "buy",
      qty: defaultQtyForRisk(risk, asset),
    });
  }
  const refreshed = await ensureCapitalQueue();
  if (refreshed.rules[0]) {
    await setRuleState(refreshed.rules[0].id, "ARMED");
  }
  return list.length;
}

export { defaultRiskLimits };
