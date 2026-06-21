import "server-only";

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type AlpacaCreds = { key: string; secret: string; base: string };

export async function loadAlpacaCreds(): Promise<AlpacaCreds | null> {
  const { loadDigitalEnv } = await import("./digital-env");
  const env = await loadDigitalEnv();
  const key = env.ALPACA_API_KEY_ID?.trim() ?? "";
  const secret = env.ALPACA_API_SECRET_KEY?.trim() ?? "";
  const base = (env.ALPACA_PAPER_BASE_URL ?? "https://paper-api.alpaca.markets").replace(/\/$/, "");
  if (!key || !secret) return null;
  return { key, secret, base };
}

export async function fetchAlpacaAccount(creds: AlpacaCreds): Promise<{
  equity: number | null;
  buyingPower: number | null;
  currency: string;
} | null> {
  const res = await fetch(`${creds.base}/v2/account`, {
    headers: {
      "APCA-API-KEY-ID": creds.key,
      "APCA-API-SECRET-KEY": creds.secret,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { equity?: string; buying_power?: string; currency?: string };
  const equity = data.equity ? Number.parseFloat(data.equity) : null;
  const buyingPower = data.buying_power ? Number.parseFloat(data.buying_power) : null;
  return {
    equity: Number.isFinite(equity) ? equity : null,
    buyingPower: Number.isFinite(buyingPower) ? buyingPower : null,
    currency: data.currency ?? "USD",
  };
}

export async function fetchAlpacaPositions(creds: AlpacaCreds): Promise<
  Array<{
    symbol: string;
    qty: number;
    marketValue: number;
    avgEntryPrice: number;
    unrealizedPl: number;
    unrealizedPlPct: number;
  }>
> {
  const res = await fetch(`${creds.base}/v2/positions`, {
    headers: {
      "APCA-API-KEY-ID": creds.key,
      "APCA-API-SECRET-KEY": creds.secret,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{
    symbol?: string;
    qty?: string;
    market_value?: string;
    avg_entry_price?: string;
    unrealized_pl?: string;
    unrealized_plpc?: string;
  }>;
  return rows.map((p) => ({
    symbol: p.symbol ?? "",
    qty: Number.parseFloat(p.qty ?? "0"),
    marketValue: Number.parseFloat(p.market_value ?? "0"),
    avgEntryPrice: Number.parseFloat(p.avg_entry_price ?? "0"),
    unrealizedPl: Number.parseFloat(p.unrealized_pl ?? "0"),
    unrealizedPlPct: Number.parseFloat(p.unrealized_plpc ?? "0") * 100,
  }));
}

export async function fetchAlpacaBars(creds: AlpacaCreds, symbol: string, limit: number): Promise<AlpacaBar[]> {
  const sym = symbol.replace("-", "");
  const end = new Date().toISOString();
  const start = new Date(Date.now() - limit * 86400000).toISOString();
  const url = `${creds.base}/v2/stocks/${encodeURIComponent(sym)}/bars?timeframe=1Day&start=${start}&end=${end}&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": creds.key,
      "APCA-API-SECRET-KEY": creds.secret,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { bars?: AlpacaBar[] };
  return data.bars ?? [];
}

export async function fetchPortfolioHistory(creds: AlpacaCreds): Promise<Array<{ t: string; equity: number }>> {
  const url = `${creds.base}/v2/account/portfolio/history?period=1M&timeframe=1D`;
  const res = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": creds.key,
      "APCA-API-SECRET-KEY": creds.secret,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { timestamp?: number[]; equity?: number[] };
  const ts = data.timestamp ?? [];
  const eq = data.equity ?? [];
  return ts.map((t, i) => ({ t: new Date(t * 1000).toISOString(), equity: eq[i] ?? 0 }));
}
