import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { readAppFreState } from "./app-fre-state";

export interface CapitalRule {
  id: string;
  name: string;
  asset: string;
  state: "ARMED" | "PAUSED";
}

export interface CapitalStatus {
  source: "alpaca" | "demo";
  tradingMode: string;
  riskProfile: string;
  bridgeConfigured: boolean;
  portfolioValue: number | null;
  portfolioLabel: string;
  buyingPower: number | null;
  currency: string;
  watchlist: string[];
  rules: CapitalRule[];
  updatedAt: string;
}

function digitalEnvPath(): string {
  return process.env.CURXOR_DIGITAL_ENV_PATH ?? "/etc/curxor/digital.env";
}

async function loadAlpacaCreds(): Promise<{ key: string; secret: string; base: string } | null> {
  try {
    const raw = await readFile(digitalEnvPath(), "utf8");
    const vars: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [k, ...rest] = trimmed.split("=");
      vars[k!.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
    const key = vars.ALPACA_API_KEY_ID ?? "";
    const secret = vars.ALPACA_API_SECRET_KEY ?? "";
    const base = (vars.ALPACA_PAPER_BASE_URL ?? "https://paper-api.alpaca.markets").replace(/\/$/, "");
    if (!key || !secret) return null;
    return { key, secret, base };
  } catch {
    return null;
  }
}

function rulesFromWatchlist(watchlist: string[]): CapitalRule[] {
  return watchlist.map((asset, i) => ({
    id: `RULE-${String(i + 1).padStart(2, "0")}`,
    name: `${asset} watch`,
    asset,
    state: i === 0 ? "ARMED" : ("PAUSED" as const),
  }));
}

function demoPortfolioValue(watchlist: string[]): number {
  const seed = watchlist.join("").length * 12_400;
  return 100_000 + seed;
}

export async function fetchCapitalStatus(): Promise<CapitalStatus> {
  const fre = await readAppFreState("my-capital");
  const config = fre.config;
  const tradingMode = typeof config.tradingMode === "string" ? config.tradingMode : "paper";
  const riskProfile = typeof config.riskProfile === "string" ? config.riskProfile : "balanced";
  const watchlist = Array.isArray(config.seedWatchlist)
    ? config.seedWatchlist.filter((x): x is string => typeof x === "string")
    : ["BTC-USD", "NVDA", "SPY"];

  const rules = rulesFromWatchlist(watchlist.length > 0 ? watchlist : ["BTC-USD"]);
  const creds = await loadAlpacaCreds();
  const bridgeConfigured = Boolean(creds);

  if (creds) {
    try {
      const res = await fetch(`${creds.base}/v2/account`, {
        headers: {
          "APCA-API-KEY-ID": creds.key,
          "APCA-API-SECRET-KEY": creds.secret,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          equity?: string;
          buying_power?: string;
          currency?: string;
        };
        const equity = data.equity ? Number.parseFloat(data.equity) : null;
        const buyingPower = data.buying_power ? Number.parseFloat(data.buying_power) : null;
        return {
          source: "alpaca",
          tradingMode,
          riskProfile,
          bridgeConfigured: true,
          portfolioValue: Number.isFinite(equity) ? equity : null,
          portfolioLabel: tradingMode,
          buyingPower: Number.isFinite(buyingPower) ? buyingPower : null,
          currency: data.currency ?? "USD",
          watchlist,
          rules,
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      /* fall through to demo */
    }
  }

  const demoValue = demoPortfolioValue(watchlist);
  return {
    source: "demo",
    tradingMode,
    riskProfile,
    bridgeConfigured,
    portfolioValue: demoValue,
    portfolioLabel: bridgeConfigured ? `${tradingMode} · offline` : `${tradingMode} · demo`,
    buyingPower: demoValue * 0.25,
    currency: "USD",
    watchlist,
    rules,
    updatedAt: new Date().toISOString(),
  };
}
