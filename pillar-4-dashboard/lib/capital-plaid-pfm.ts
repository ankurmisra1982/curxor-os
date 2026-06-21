import "server-only";

import type { PfmAccount, PfmTransaction, TransactionCategory } from "./capital-pfm-types";
import {
  isPlaidConfigured,
  plaidBaseUrl,
  plaidEnv,
  readPlaidLink,
  writePlaidLink,
  type PlaidLinkState,
} from "./capital-plaid-store";

export interface PlaidStatus {
  configured: boolean;
  linked: boolean;
  institutionName: string | null;
  lastSyncAt: string | null;
  mode: "demo" | "plaid";
  note: string;
}

export async function getPlaidStatus(): Promise<PlaidStatus> {
  const linked = await readPlaidLink();
  const configured = await isPlaidConfigured();
  if (!configured) {
    return {
      configured: false,
      linked: false,
      institutionName: null,
      lastSyncAt: null,
      mode: "demo",
      note: "Set PLAID_CLIENT_ID + PLAID_SECRET in digital.env · link via POST /api/capital/plaid",
    };
  }
  if (!linked) {
    return {
      configured: true,
      linked: false,
      institutionName: null,
      lastSyncAt: null,
      mode: "demo",
      note: "Plaid credentials set — complete Link flow to replace demo PFM data",
    };
  }
  return {
    configured: true,
    linked: true,
    institutionName: linked.institutionName,
    lastSyncAt: linked.lastSyncAt,
    mode: "plaid",
    note: linked.institutionName
      ? `Linked · ${linked.institutionName}`
      : "Plaid item linked · read-only transactions",
  };
}

function mapPlaidCategory(primary: string | undefined): TransactionCategory {
  const p = (primary ?? "").toLowerCase();
  if (p.includes("food") || p.includes("restaurant")) return "dining";
  if (p.includes("grocer")) return "groceries";
  if (p.includes("rent") || p.includes("mortgage")) return "housing";
  if (p.includes("utilities") || p.includes("electric")) return "utilities";
  if (p.includes("travel") || p.includes("transport")) return "transport";
  if (p.includes("health")) return "healthcare";
  if (p.includes("subscription") || p.includes("service")) return "subscriptions";
  if (p.includes("shop") || p.includes("merchandise")) return "shopping";
  if (p.includes("transfer")) return "transfer";
  if (p.includes("income") || p.includes("payroll")) return "income";
  if (p.includes("invest")) return "investment";
  if (p.includes("fee") || p.includes("bank fees")) return "fees";
  return "other";
}

function mapPlaidAccountType(type: string | undefined, subtype: string | undefined): PfmAccount["type"] {
  const t = `${type ?? ""} ${subtype ?? ""}`.toLowerCase();
  if (t.includes("credit")) return "credit";
  if (t.includes("savings")) return "savings";
  if (t.includes("invest") || t.includes("brokerage")) return "investment";
  if (t.includes("loan")) return "loan";
  return "checking";
}

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { clientId, secret, env } = await plaidEnv();
  if (!clientId || !secret) throw new Error("Plaid not configured");
  const res = await fetch(`${plaidBaseUrl(env)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error_message?: string };
    throw new Error(err.error_message ?? `Plaid ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function createPlaidLinkToken(userId = "curxor-capital"): Promise<{ linkToken: string; expiration: string }> {
  const out = await plaidPost<{ link_token: string; expiration: string }>("/link/token/create", {
    user: { client_user_id: userId },
    client_name: "Capital Claw",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en",
  });
  return { linkToken: out.link_token, expiration: out.expiration };
}

export async function exchangePlaidPublicToken(
  publicToken: string,
  institutionName?: string,
): Promise<PlaidLinkState> {
  const out = await plaidPost<{ access_token: string; item_id: string }>("/item/public_token/exchange", {
    public_token: publicToken,
  });
  const state: PlaidLinkState = {
    accessToken: out.access_token,
    itemId: out.item_id,
    institutionName: institutionName ?? null,
    linkedAt: new Date().toISOString(),
    lastSyncAt: null,
    cursor: null,
  };
  await writePlaidLink(state);
  return state;
}

export interface PlaidSyncResult {
  accounts: PfmAccount[];
  transactions: PfmTransaction[];
  cursor: string | null;
}

export async function syncPlaidToPfm(): Promise<PlaidSyncResult | null> {
  const link = await readPlaidLink();
  if (!link) return null;

  const accountsOut = await plaidPost<{
    accounts: Array<{
      account_id: string;
      name: string;
      official_name?: string;
      type?: string;
      subtype?: string;
      mask?: string;
      balances?: { current?: number; iso_currency_code?: string };
    }>;
  }>("/accounts/balance/get", { access_token: link.accessToken });

  const txOut = await plaidPost<{
    added: Array<{
      transaction_id: string;
      account_id: string;
      date: string;
      name: string;
      merchant_name?: string;
      amount: number;
      personal_finance_category?: { primary?: string };
    }>;
    next_cursor: string;
    has_more: boolean;
  }>("/transactions/sync", {
    access_token: link.accessToken,
    cursor: link.cursor ?? undefined,
    count: 100,
  });

  const now = new Date().toISOString();
  const accounts: PfmAccount[] = accountsOut.accounts.map((a) => ({
    id: a.account_id,
    name: a.official_name ?? a.name,
    institution: link.institutionName ?? "Plaid",
    type: mapPlaidAccountType(a.type, a.subtype),
    balanceUsd: a.balances?.current ?? 0,
    currency: a.balances?.iso_currency_code ?? "USD",
    lastSyncedAt: now,
    maskedNumber: a.mask ? `••${a.mask}` : undefined,
  }));

  const transactions: PfmTransaction[] = txOut.added.map((t) => ({
    id: t.transaction_id,
    accountId: t.account_id,
    postedAt: new Date(`${t.date}T12:00:00Z`).toISOString(),
    description: t.name,
    merchant: t.merchant_name ?? t.name,
    amountUsd: -t.amount,
    category: mapPlaidCategory(t.personal_finance_category?.primary),
  }));

  await writePlaidLink({
    ...link,
    lastSyncAt: now,
    cursor: txOut.next_cursor,
  });

  return { accounts, transactions, cursor: txOut.next_cursor };
}
