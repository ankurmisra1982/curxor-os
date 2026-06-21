import type {
  CashFlowSummary,
  FinancialSuggestion,
  PfmAccount,
  SpendingByCategory,
  WealthGoal,
} from "./capital-pfm-types";

export function buildFinancialSuggestions(input: {
  cashFlow: CashFlowSummary;
  spendingByCategory: SpendingByCategory[];
  goals: WealthGoal[];
  accounts: PfmAccount[];
  recurringMerchants: string[];
}): FinancialSuggestion[] {
  const out: FinancialSuggestion[] = [];
  let seq = 1;
  const id = () => `sug-${String(seq++).padStart(2, "0")}`;

  const dining = input.spendingByCategory.find((s) => s.category === "dining");
  if (dining && (dining.trendPctMoM ?? 0) > 10) {
    out.push({
      id: id(),
      kind: "reduce_spend",
      priority: "medium",
      title: "Dining spend is trending up",
      body: `Dining is ${dining.trendPctMoM}% higher than last month ($${dining.amountUsd.toFixed(0)}). Trimming $50/mo frees ~$600/yr for investing.`,
      actionLabel: "Create dip-buy rule for SPY",
      actionType: "create_dip_rule",
      actionPayload: { ticker: "SPY", dropPct: 5 },
      relatedCategory: "dining",
    });
  }

  const subs = input.spendingByCategory.find((s) => s.category === "subscriptions");
  if (subs && subs.amountUsd > 200) {
    out.push({
      id: id(),
      kind: "reduce_spend",
      priority: "low",
      title: "Review recurring subscriptions",
      body: `Subscriptions total $${subs.amountUsd.toFixed(0)}/mo (${input.recurringMerchants.slice(0, 3).join(", ")}). Cancel one unused service to boost savings rate.`,
      relatedCategory: "subscriptions",
    });
  }

  if (input.cashFlow.savingsRatePct < 15 && input.cashFlow.incomeUsd > 0) {
    out.push({
      id: id(),
      kind: "save",
      priority: "high",
      title: "Boost your savings rate",
      body: `Current savings rate is ${input.cashFlow.savingsRatePct}% — aim for 20%+. Increasing auto-transfer by $200/mo closes the gap on your emergency fund.`,
      actionLabel: "Update emergency fund contribution",
      actionType: "set_goal_contribution",
      actionPayload: { goalId: "goal-emergency", monthlyContributionUsd: 1000 },
    });
  }

  if (input.cashFlow.investableSurplusUsd >= 300) {
    out.push({
      id: id(),
      kind: "invest",
      priority: "high",
      title: "Investable surplus detected",
      body: `$${input.cashFlow.investableSurplusUsd.toFixed(0)} net surplus this month. Consider automating a dip-buy rule on NVDA or SPY when price drops 5%.`,
      actionLabel: "Create NVDA dip rule",
      actionType: "create_dip_rule",
      actionPayload: { ticker: "NVDA", dropPct: 5 },
    });
  }

  const emergency = input.goals.find((g) => g.id === "goal-emergency");
  if (emergency) {
    const pct = (emergency.currentUsd / emergency.targetUsd) * 100;
    if (pct < 100 && pct >= 70) {
      out.push({
        id: id(),
        kind: "goal",
        priority: "medium",
        title: "Emergency fund almost complete",
        body: `You're at ${pct.toFixed(0)}% of your $${emergency.targetUsd.toLocaleString()} target. Keep $${emergency.monthlyContributionUsd}/mo to finish by ${emergency.targetDate ?? "your target date"}.`,
        actionLabel: "Increase contribution",
        actionType: "set_goal_contribution",
        actionPayload: { goalId: emergency.id, monthlyContributionUsd: emergency.monthlyContributionUsd + 200 },
      });
    }
  }

  const credit = input.accounts.find((a) => a.type === "credit" && a.balanceUsd < 0);
  if (credit && Math.abs(credit.balanceUsd) > 1_500) {
    out.push({
      id: id(),
      kind: "alert",
      priority: "medium",
      title: "Credit balance watch",
      body: `Card balance is $${Math.abs(credit.balanceUsd).toFixed(0)}. Pay down before adding risk in the brokerage — interest often exceeds market returns.`,
    });
  }

  const shopping = input.spendingByCategory.find((s) => s.category === "shopping");
  if (shopping && shopping.amountUsd > 500) {
    out.push({
      id: id(),
      kind: "rebalance",
      priority: "low",
      title: "Large discretionary spend",
      body: `Shopping was $${shopping.amountUsd.toFixed(0)} this month. Pair restraint with a pilot subscription to stay invested while cutting impulse buys.`,
      actionLabel: "Browse pilots",
      actionType: "subscribe_pilot",
      actionPayload: { pilotId: "PILOT-NDAQ10", allocationUsd: 500 },
      relatedCategory: "shopping",
    });
  }

  return out.slice(0, 8);
}
