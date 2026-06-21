import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { defaultContextualAdSlots } from "./capital-pfm-ads";
import { buildPfmSnapshot } from "./capital-pfm-analytics";
import { getPlaidStatus, syncPlaidToPfm } from "./capital-plaid-pfm";
import type { PfmFile, PfmSnapshot, WealthGoal } from "./capital-pfm-types";

function storePath(): string {
  return process.env.CURXOR_CAPITAL_PFM_PATH ?? "/etc/curxor/capital-pfm.json";
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function monthDayOffset(monthsBack: number, day: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - monthsBack);
  d.setUTCDate(day);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

function seedDemoFile(): PfmFile {
  const now = new Date().toISOString();
  const accounts = [
    {
      id: "acct-checking",
      name: "Everyday Checking",
      institution: "Chase",
      type: "checking" as const,
      balanceUsd: 4_280.42,
      currency: "USD",
      lastSyncedAt: now,
      maskedNumber: "••4821",
    },
    {
      id: "acct-savings",
      name: "High-Yield Savings",
      institution: "Marcus",
      type: "savings" as const,
      balanceUsd: 18_650,
      currency: "USD",
      lastSyncedAt: now,
      maskedNumber: "••9033",
    },
    {
      id: "acct-credit",
      name: "Sapphire Reserve",
      institution: "Chase",
      type: "credit" as const,
      balanceUsd: -2_140.88,
      currency: "USD",
      lastSyncedAt: now,
      maskedNumber: "••7712",
    },
    {
      id: "acct-invest",
      name: "Brokerage",
      institution: "Alpaca",
      type: "investment" as const,
      balanceUsd: 42_180.5,
      currency: "USD",
      lastSyncedAt: now,
      maskedNumber: "••0044",
    },
  ];

  const txns = [
    { id: "tx-payroll", accountId: "acct-checking", postedAt: monthDayOffset(0, 1), description: "Direct deposit", merchant: "Acme Corp", amountUsd: 6_250, category: "income" as const, isRecurring: true },
    { id: "tx-payroll-1", accountId: "acct-checking", postedAt: monthDayOffset(1, 1), description: "Direct deposit", merchant: "Acme Corp", amountUsd: 6_250, category: "income" as const, isRecurring: true },
    { id: "tx-payroll-2", accountId: "acct-checking", postedAt: monthDayOffset(2, 1), description: "Direct deposit", merchant: "Acme Corp", amountUsd: 6_250, category: "income" as const, isRecurring: true },
    { id: "tx-rent", accountId: "acct-checking", postedAt: monthDayOffset(0, 3), description: "Rent payment", merchant: "Greystar Apts", amountUsd: -2_150, category: "housing" as const, isRecurring: true },
    { id: "tx-rent-1", accountId: "acct-checking", postedAt: monthDayOffset(1, 3), description: "Rent payment", merchant: "Greystar Apts", amountUsd: -2_150, category: "housing" as const, isRecurring: true },
    { id: "tx-rent-2", accountId: "acct-checking", postedAt: monthDayOffset(2, 3), description: "Rent payment", merchant: "Greystar Apts", amountUsd: -2_150, category: "housing" as const, isRecurring: true },
    { id: "tx-electric", accountId: "acct-checking", postedAt: daysAgo(8), description: "Utility bill", merchant: "ConEd", amountUsd: -142.33, category: "utilities" as const, isRecurring: true },
    { id: "tx-electric-1", accountId: "acct-checking", postedAt: daysAgo(38), description: "Utility bill", merchant: "ConEd", amountUsd: -128.9, category: "utilities" as const, isRecurring: true },
    { id: "tx-grocery-1", accountId: "acct-credit", postedAt: daysAgo(2), description: "Groceries", merchant: "Whole Foods", amountUsd: -186.44, category: "groceries" as const },
    { id: "tx-grocery-2", accountId: "acct-credit", postedAt: daysAgo(9), description: "Groceries", merchant: "Trader Joe's", amountUsd: -94.2, category: "groceries" as const },
    { id: "tx-grocery-3", accountId: "acct-credit", postedAt: daysAgo(16), description: "Groceries", merchant: "Whole Foods", amountUsd: -201.11, category: "groceries" as const },
    { id: "tx-dining-1", accountId: "acct-credit", postedAt: daysAgo(1), description: "Dining", merchant: "Sweetgreen", amountUsd: -18.75, category: "dining" as const },
    { id: "tx-dining-2", accountId: "acct-credit", postedAt: daysAgo(4), description: "Dining", merchant: "DoorDash", amountUsd: -62.4, category: "dining" as const },
    { id: "tx-dining-3", accountId: "acct-credit", postedAt: daysAgo(11), description: "Dining", merchant: "Nobu", amountUsd: -248, category: "dining" as const },
    { id: "tx-sub-netflix", accountId: "acct-credit", postedAt: daysAgo(5), description: "Subscription", merchant: "Netflix", amountUsd: -15.99, category: "subscriptions" as const, isRecurring: true },
    { id: "tx-sub-spotify", accountId: "acct-credit", postedAt: daysAgo(5), description: "Subscription", merchant: "Spotify", amountUsd: -11.99, category: "subscriptions" as const, isRecurring: true },
    { id: "tx-sub-gym", accountId: "acct-credit", postedAt: daysAgo(6), description: "Subscription", merchant: "Equinox", amountUsd: -220, category: "subscriptions" as const, isRecurring: true },
    { id: "tx-transport-1", accountId: "acct-credit", postedAt: daysAgo(3), description: "Ride share", merchant: "Uber", amountUsd: -34.5, category: "transport" as const },
    { id: "tx-transport-2", accountId: "acct-checking", postedAt: daysAgo(7), description: "Metro card", merchant: "MTA", amountUsd: -127, category: "transport" as const, isRecurring: true },
    { id: "tx-shop-1", accountId: "acct-credit", postedAt: daysAgo(6), description: "Shopping", merchant: "Amazon", amountUsd: -89.99, category: "shopping" as const },
    { id: "tx-shop-2", accountId: "acct-credit", postedAt: daysAgo(14), description: "Shopping", merchant: "Apple Store", amountUsd: -1_299, category: "shopping" as const },
    { id: "tx-health", accountId: "acct-checking", postedAt: daysAgo(12), description: "Copay", merchant: "One Medical", amountUsd: -45, category: "healthcare" as const },
    { id: "tx-invest-auto", accountId: "acct-checking", postedAt: monthDayOffset(0, 5), description: "Auto invest", merchant: "Alpaca", amountUsd: -500, category: "investment" as const, isRecurring: true },
    { id: "tx-invest-auto-1", accountId: "acct-checking", postedAt: monthDayOffset(1, 5), description: "Auto invest", merchant: "Alpaca", amountUsd: -500, category: "investment" as const, isRecurring: true },
    { id: "tx-savings-xfer", accountId: "acct-checking", postedAt: daysAgo(10), description: "Transfer to savings", merchant: "Marcus", amountUsd: -800, category: "transfer" as const },
    { id: "tx-savings-in", accountId: "acct-savings", postedAt: daysAgo(10), description: "Transfer from checking", merchant: "Chase", amountUsd: 800, category: "transfer" as const },
    { id: "tx-fee", accountId: "acct-checking", postedAt: daysAgo(20), description: "ATM fee", merchant: "Chase", amountUsd: -3, category: "fees" as const },
  ];

  const goals: WealthGoal[] = [
    {
      id: "goal-emergency",
      name: "Emergency fund",
      targetUsd: 25_000,
      currentUsd: 18_650,
      targetDate: "2026-12-31",
      monthlyContributionUsd: 800,
      linkedCategory: "transfer",
    },
    {
      id: "goal-house",
      name: "Down payment",
      targetUsd: 80_000,
      currentUsd: 22_400,
      targetDate: "2028-06-01",
      monthlyContributionUsd: 1_200,
    },
    {
      id: "goal-retire",
      name: "Brokerage growth",
      targetUsd: 100_000,
      currentUsd: 42_180.5,
      targetDate: null,
      monthlyContributionUsd: 500,
      linkedCategory: "investment",
    },
  ];

  return {
    version: 1,
    accounts,
    transactions: txns,
    goals,
    adSlots: defaultContextualAdSlots(),
    dataSource: "demo",
    updatedAt: now,
  };
}

function migrateFile(parsed: Partial<PfmFile>): PfmFile {
  const seed = seedDemoFile();
  return {
    version: 1,
    accounts: Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : seed.accounts,
    transactions:
      Array.isArray(parsed.transactions) && parsed.transactions.length > 0 ? parsed.transactions : seed.transactions,
    goals: Array.isArray(parsed.goals) && parsed.goals.length > 0 ? parsed.goals : seed.goals,
    adSlots: Array.isArray(parsed.adSlots) && parsed.adSlots.length > 0 ? parsed.adSlots : seed.adSlots,
    dataSource: parsed.dataSource === "plaid" ? "plaid" : "demo",
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
  };
}

export async function ensurePfmFile(): Promise<PfmFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PfmFile>;
    return migrateFile(parsed);
  } catch {
    const seed = seedDemoFile();
    await writePfmFile(seed);
    return seed;
  }
}

export async function writePfmFile(data: PfmFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function fetchPfmSnapshot(): Promise<PfmSnapshot> {
  const file = await ensurePfmFile();
  return buildPfmSnapshot(file);
}

export async function updateWealthGoal(
  goalId: string,
  patch: Partial<Pick<WealthGoal, "monthlyContributionUsd" | "targetUsd" | "currentUsd" | "targetDate" | "name">>,
): Promise<WealthGoal | null> {
  const file = await ensurePfmFile();
  const idx = file.goals.findIndex((g) => g.id === goalId);
  if (idx < 0) return null;
  file.goals[idx] = { ...file.goals[idx]!, ...patch };
  await writePfmFile(file);
  return file.goals[idx]!;
}

export async function refreshPfmData(): Promise<PfmSnapshot> {
  const file = await ensurePfmFile();
  const plaidStatus = await getPlaidStatus();
  if (plaidStatus.linked) {
    try {
      const synced = await syncPlaidToPfm();
      if (synced && synced.accounts.length > 0) {
        file.accounts = synced.accounts;
        if (synced.transactions.length > 0) {
          const byId = new Map(file.transactions.map((t) => [t.id, t]));
          for (const t of synced.transactions) byId.set(t.id, t);
          file.transactions = [...byId.values()];
        }
        file.dataSource = "plaid";
      }
    } catch {
      /* keep demo/local data on sync failure */
    }
  }
  file.accounts = file.accounts.map((a) => ({ ...a, lastSyncedAt: new Date().toISOString() }));
  await writePfmFile(file);
  return buildPfmSnapshot(file);
}
