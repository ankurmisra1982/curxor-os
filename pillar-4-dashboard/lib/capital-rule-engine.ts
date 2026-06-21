import "server-only";

import { createHash } from "node:crypto";

import type { CapitalRule } from "./capital-queue-types";
import { backtestRule } from "./capital-backtest";
import { canAutonomousTrade, requiresApprovalPerTrade } from "./capital-permissions";
import { evaluateRebalanceRules } from "./capital-rebalance";
import { evaluateCondition, fetchQuotesForSymbols, type QuoteBar } from "./capital-quotes";
import {
  ensureCapitalQueue,
  getCapitalRule,
  incrementAutoTradeCount,
  markRuleEvaluated,
  writeCapitalFilePartial,
} from "./capital-store";
import { executeCapitalTrade } from "./capital-trade-executor";

export function buildIdempotencyKey(ruleId: string, ticker: string, bucket: string): string {
  return createHash("sha256").update(`${ruleId}:${ticker}:${bucket}`).digest("hex").slice(0, 24);
}

export function idempotencyBucket(schedule: CapitalRule["schedule"]): string {
  const d = new Date();
  if (schedule === "hourly") return d.toISOString().slice(0, 13);
  return d.toISOString().slice(0, 10);
}

export async function refreshQuotesAndMovers(): Promise<void> {
  const file = await ensureCapitalQueue();
  const symbols = [
    ...file.rules.map((r) => r.asset),
    ...file.positions.map((p) => p.symbol),
  ];
  const quotes = await fetchQuotesForSymbols(symbols);
  const { quotesToMovers } = await import("./capital-quotes");
  file.movers = quotesToMovers(quotes);
  file.quotesUpdatedAt = new Date().toISOString();
  await writeCapitalFilePartial(file);
}

export async function evaluateArmedRules(options?: { force?: boolean }): Promise<{
  evaluated: number;
  fired: number;
  skipped: number;
}> {
  const file = await ensureCapitalQueue();
  if (file.tradingPaused) return { evaluated: 0, fired: 0, skipped: 0 };

  const symbols = file.rules.filter((r) => r.state === "ARMED").map((r) => r.asset);
  const quotes = await fetchQuotesForSymbols(symbols);
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  let evaluated = 0;
  let fired = 0;
  let skipped = 0;

  const rebalanceSignals = evaluateRebalanceRules(
    file.rules,
    file.positions,
    file.cachedPortfolioValue ?? null,
  );

  for (const rule of file.rules) {
    if (rule.state !== "ARMED") continue;
    evaluated += 1;

    const sym = rule.asset.replace("-", "");
    const quote: QuoteBar | null = quoteMap.get(sym) ?? quoteMap.get(rule.asset) ?? null;

    let shouldFire = options?.force === true;
    if (!shouldFire && rule.kind === "signal") {
      shouldFire = evaluateCondition(rule.conditionType, rule.conditionParams, quote);
    }

    if (rule.kind === "rebalance") {
      const sig = rebalanceSignals.find((s) => s.ruleId === rule.id);
      shouldFire = Boolean(sig);
    }

    if (!shouldFire) {
      skipped += 1;
      await markRuleEvaluated(rule.id, false);
      continue;
    }

    const bucket = idempotencyBucket(rule.schedule);
    const idem = buildIdempotencyKey(rule.id, rule.asset, bucket);
    const dup = file.trades.some(
      (t) =>
        t.idempotencyKey === idem &&
        ["submitted", "filled", "queued", "simulated", "pending_approval", "dry_run"].includes(t.status),
    );
    if (dup) {
      skipped += 1;
      continue;
    }

    const autonomous = canAutonomousTrade(file.permissions);
    const approvalEach = requiresApprovalPerTrade(file.permissions);
    if (!autonomous && !approvalEach && !options?.force) {
      skipped += 1;
      continue;
    }

    const sig = rebalanceSignals.find((s) => s.ruleId === rule.id);
    const result = await executeCapitalTrade({
      ruleId: rule.id,
      ticker: sig?.ticker ?? rule.asset,
      qty: sig?.qty ?? rule.qty,
      action: sig?.action ?? rule.action,
      source: autonomous ? "autonomous" : "agent",
      idempotencyKey: idem,
      skipAutonomousGate: options?.force === true,
    });

    if (result.ok) {
      fired += 1;
      await markRuleEvaluated(rule.id, true);
      await incrementAutoTradeCount();
    } else {
      skipped += 1;
    }
  }

  return { evaluated, fired, skipped };
}

export async function runRuleBacktest(ruleId: string): Promise<CapitalRule | null> {
  const rule = await getCapitalRule(ruleId);
  if (!rule) return null;
  const backtest = await backtestRule(rule);
  const file = await ensureCapitalQueue();
  const idx = file.rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return null;
  file.rules[idx] = { ...file.rules[idx]!, backtest, updatedAt: new Date().toISOString() };
  await writeCapitalFilePartial(file);
  return file.rules[idx]!;
}
