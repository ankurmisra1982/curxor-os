export type PfmAccountType = "checking" | "savings" | "credit" | "investment" | "loan";

export type TransactionCategory =
  | "income"
  | "transfer"
  | "housing"
  | "utilities"
  | "groceries"
  | "dining"
  | "transport"
  | "healthcare"
  | "subscriptions"
  | "shopping"
  | "entertainment"
  | "education"
  | "investment"
  | "fees"
  | "other";

export interface PfmAccount {
  id: string;
  name: string;
  institution: string;
  type: PfmAccountType;
  balanceUsd: number;
  currency: string;
  lastSyncedAt: string;
  maskedNumber?: string;
}

export interface PfmTransaction {
  id: string;
  accountId: string;
  postedAt: string;
  description: string;
  merchant: string;
  amountUsd: number;
  category: TransactionCategory;
  isRecurring?: boolean;
  tags?: string[];
}

export interface WealthGoal {
  id: string;
  name: string;
  targetUsd: number;
  currentUsd: number;
  targetDate: string | null;
  monthlyContributionUsd: number;
  linkedCategory?: TransactionCategory;
}

export interface SpendingByCategory {
  category: TransactionCategory;
  label: string;
  amountUsd: number;
  pctOfSpend: number;
  trendPctMoM: number | null;
}

export interface CashFlowSummary {
  periodDays: number;
  incomeUsd: number;
  spendUsd: number;
  netUsd: number;
  savingsRatePct: number;
  investableSurplusUsd: number;
}

export interface FinancialSuggestion {
  id: string;
  kind: "save" | "invest" | "reduce_spend" | "rebalance" | "goal" | "alert";
  priority: "high" | "medium" | "low";
  title: string;
  body: string;
  actionLabel?: string;
  actionType?: "create_dip_rule" | "add_watchlist" | "set_goal_contribution" | "arm_rule" | "subscribe_pilot";
  actionPayload?: Record<string, string | number>;
  relatedCategory?: TransactionCategory;
}

export interface ContextualAdSlot {
  id: string;
  placement: "pfm_overview" | "suggestions" | "wealth_plan";
  sponsor: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string | null;
  disclosure: string;
  enabled: boolean;
}

export interface PfmSnapshot {
  accounts: PfmAccount[];
  transactions: PfmTransaction[];
  goals: WealthGoal[];
  cashFlow: CashFlowSummary;
  spendingByCategory: SpendingByCategory[];
  suggestions: FinancialSuggestion[];
  contextualAds: ContextualAdSlot[];
  netWorthUsd: number;
  netWorthDelta30dPct: number | null;
  dataSource: "demo" | "plaid";
  updatedAt: string;
}

export interface PfmFile {
  version: 1;
  accounts: PfmAccount[];
  transactions: PfmTransaction[];
  goals: WealthGoal[];
  adSlots: ContextualAdSlot[];
  dataSource?: "demo" | "plaid";
  updatedAt: string;
}
