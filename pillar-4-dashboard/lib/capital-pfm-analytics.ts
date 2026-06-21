import type {
  CashFlowSummary,
  PfmAccount,
  PfmFile,
  PfmSnapshot,
  PfmTransaction,
  SpendingByCategory,
  TransactionCategory,
} from "./capital-pfm-types";
import { buildFinancialSuggestions } from "./capital-pfm-suggestions";

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  income: "Income",
  transfer: "Transfers",
  housing: "Housing",
  utilities: "Utilities",
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  healthcare: "Healthcare",
  subscriptions: "Subscriptions",
  shopping: "Shopping",
  entertainment: "Entertainment",
  education: "Education",
  investment: "Investments",
  fees: "Fees",
  other: "Other",
};

export function categoryLabel(cat: TransactionCategory): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function inPeriod(iso: string, periodDays: number): boolean {
  const cutoff = Date.now() - periodDays * 86_400_000;
  return Date.parse(iso) >= cutoff;
}

function priorPeriod(iso: string, periodDays: number): boolean {
  const end = Date.now() - periodDays * 86_400_000;
  const start = end - periodDays * 86_400_000;
  const t = Date.parse(iso);
  return t >= start && t < end;
}

export function computeCashFlow(transactions: PfmTransaction[], periodDays = 30): CashFlowSummary {
  const current = transactions.filter((t) => inPeriod(t.postedAt, periodDays));
  const incomeUsd = current.filter((t) => t.amountUsd > 0 && t.category !== "transfer").reduce((s, t) => s + t.amountUsd, 0);
  const spendUsd = current
    .filter((t) => t.amountUsd < 0 && t.category !== "transfer" && t.category !== "investment")
    .reduce((s, t) => s + Math.abs(t.amountUsd), 0);
  const investUsd = current.filter((t) => t.category === "investment" && t.amountUsd < 0).reduce((s, t) => s + Math.abs(t.amountUsd), 0);
  const netUsd = incomeUsd - spendUsd - investUsd;
  const savingsRatePct = incomeUsd > 0 ? Math.round((netUsd / incomeUsd) * 1000) / 10 : 0;
  const investableSurplusUsd = Math.max(0, netUsd);

  return {
    periodDays,
    incomeUsd: Math.round(incomeUsd * 100) / 100,
    spendUsd: Math.round(spendUsd * 100) / 100,
    netUsd: Math.round(netUsd * 100) / 100,
    savingsRatePct,
    investableSurplusUsd: Math.round(investableSurplusUsd * 100) / 100,
  };
}

export function computeSpendingByCategory(
  transactions: PfmTransaction[],
  periodDays = 30,
): SpendingByCategory[] {
  const current = transactions.filter(
    (t) => inPeriod(t.postedAt, periodDays) && t.amountUsd < 0 && t.category !== "transfer" && t.category !== "investment",
  );
  const prior = transactions.filter(
    (t) =>
      priorPeriod(t.postedAt, periodDays) && t.amountUsd < 0 && t.category !== "transfer" && t.category !== "investment",
  );

  const totals = new Map<TransactionCategory, number>();
  for (const t of current) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amountUsd));
  }
  const priorTotals = new Map<TransactionCategory, number>();
  for (const t of prior) {
    priorTotals.set(t.category, (priorTotals.get(t.category) ?? 0) + Math.abs(t.amountUsd));
  }

  const totalSpend = [...totals.values()].reduce((a, b) => a + b, 0) || 1;

  return [...totals.entries()]
    .map(([category, amountUsd]) => {
      const priorAmt = priorTotals.get(category) ?? 0;
      const trendPctMoM =
        priorAmt > 0 ? Math.round(((amountUsd - priorAmt) / priorAmt) * 1000) / 10 : null;
      return {
        category,
        label: categoryLabel(category),
        amountUsd: Math.round(amountUsd * 100) / 100,
        pctOfSpend: Math.round((amountUsd / totalSpend) * 1000) / 10,
        trendPctMoM,
      };
    })
    .sort((a, b) => b.amountUsd - a.amountUsd);
}

export function detectRecurringMerchants(transactions: PfmTransaction[]): string[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    if (t.isRecurring) counts.set(t.merchant, (counts.get(t.merchant) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .map(([m]) => m);
}

export function computeNetWorth(accounts: PfmAccount[]): number {
  return Math.round(accounts.reduce((s, a) => s + a.balanceUsd, 0) * 100) / 100;
}

export function buildPfmSnapshot(file: PfmFile): PfmSnapshot {
  const periodDays = 30;
  const cashFlow = computeCashFlow(file.transactions, periodDays);
  const spendingByCategory = computeSpendingByCategory(file.transactions, periodDays);
  const suggestions = buildFinancialSuggestions({
    cashFlow,
    spendingByCategory,
    goals: file.goals,
    accounts: file.accounts,
    recurringMerchants: detectRecurringMerchants(file.transactions),
  });
  const netWorthUsd = computeNetWorth(file.accounts);
  const priorNet = netWorthUsd - cashFlow.netUsd;
  const netWorthDelta30dPct =
    priorNet > 0 ? Math.round((cashFlow.netUsd / priorNet) * 1000) / 10 : null;

  return {
    accounts: file.accounts,
    transactions: file.transactions.slice().sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt)),
    goals: file.goals,
    cashFlow,
    spendingByCategory,
    suggestions,
    contextualAds: file.adSlots,
    netWorthUsd,
    netWorthDelta30dPct,
    dataSource: file.dataSource ?? "demo",
    updatedAt: file.updatedAt,
  };
}
