import "server-only";

import { randomBytes } from "node:crypto";

import {
  clearSnapTradeLink,
  isSnapTradeConfigured,
  readSnapTradeLink,
  snapTradeEnv,
  writeSnapTradeLink,
  type SnapTradeLinkState,
} from "./capital-snaptrade-store";

const API_BASE = "https://api.snaptrade.com/api/v1";

async function snapTradePost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { clientId, consumerSecret } = await snapTradeEnv();
  if (!clientId || !consumerSecret) throw new Error("SnapTrade not configured");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      clientId,
      consumerKey: consumerSecret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string; message?: string };
    throw new Error(err.detail ?? err.message ?? `SnapTrade ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function newSnapTradeUserId(): string {
  return `curxor-${randomBytes(8).toString("hex")}`;
}

export async function ensureSnapTradeUser(): Promise<SnapTradeLinkState> {
  const existing = await readSnapTradeLink();
  if (existing) return existing;

  const userId = newSnapTradeUserId();
  const out = await snapTradePost<{ userId: string; userSecret: string }>("/snapTrade/registerUser", {
    userId,
  });

  const state: SnapTradeLinkState = {
    userId: out.userId ?? userId,
    userSecret: out.userSecret,
    linkedAt: null,
    brokerAccountId: null,
    institutionName: null,
  };
  await writeSnapTradeLink(state);
  return state;
}

export async function buildSnapTradeLoginUrl(): Promise<
  { ok: true; loginLink: string; userId: string } | { ok: false; error: string }
> {
  if (!(await isSnapTradeConfigured())) {
    return { ok: false, error: "Set SNAPTRADE_CLIENT_ID + SNAPTRADE_CONSUMER_SECRET in digital.env" };
  }

  try {
    const user = await ensureSnapTradeUser();
    const { redirectUri } = await snapTradeEnv();
    const out = await snapTradePost<{ redirectURI?: string; redirectUri?: string }>("/snapTrade/login", {
      userId: user.userId,
      userSecret: user.userSecret,
      immediateRedirect: true,
      customRedirect: redirectUri,
    });
    const loginLink = out.redirectURI ?? out.redirectUri;
    if (!loginLink) return { ok: false, error: "SnapTrade login response missing redirect URI" };
    return { ok: true, loginLink, userId: user.userId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "SnapTrade login failed" };
  }
}

export async function markSnapTradeLinked(input?: {
  institutionName?: string;
  brokerAccountId?: string;
}): Promise<SnapTradeLinkState | null> {
  const user = await readSnapTradeLink();
  if (!user) return null;
  const next: SnapTradeLinkState = {
    ...user,
    linkedAt: new Date().toISOString(),
    institutionName: input?.institutionName ?? user.institutionName,
    brokerAccountId: input?.brokerAccountId ?? user.brokerAccountId,
  };
  await writeSnapTradeLink(next);
  return next;
}

export async function isSnapTradeBrokerLinked(): Promise<boolean> {
  const link = await readSnapTradeLink();
  return Boolean(link?.linkedAt);
}

export async function unlinkSnapTradeBroker(): Promise<void> {
  await clearSnapTradeLink();
}
