import "server-only";

import { createHash } from "node:crypto";

import { loadAlpacaCreds } from "./capital-alpaca-client";
import { scoreSentiment } from "./capital-intel-sentiment";
import type { IntelChatterItem } from "./capital-intel-types";

function idFor(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 14);
}

function dataBaseUrl(): string {
  return (process.env.ALPACA_DATA_BASE_URL ?? "https://data.alpaca.markets").replace(/\/$/, "");
}

export async function fetchAlpacaNews(symbol?: string): Promise<IntelChatterItem[]> {
  const creds = await loadAlpacaCreds();
  if (!creds) return [];

  const params = new URLSearchParams({
    limit: "12",
    sort: "desc",
    exclude_contentless: "true",
  });
  if (symbol) params.set("symbols", symbol.replace("-", "").toUpperCase());

  try {
    const res = await fetch(`${dataBaseUrl()}/v1beta1/news?${params}`, {
      headers: {
        "APCA-API-KEY-ID": creds.key,
        "APCA-API-SECRET-KEY": creds.secret,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      news?: Array<{
        id?: number;
        headline?: string;
        summary?: string;
        url?: string;
        created_at?: string;
        updated_at?: string;
        source?: string;
        symbols?: string[];
      }>;
    };

    return (data.news ?? []).map((n) => {
      const title = n.headline ?? "";
      const excerpt = (n.summary ?? title).slice(0, 280);
      const { sentiment, score } = scoreSentiment(`${title} ${excerpt}`);
      return {
        id: idFor(["alpaca", String(n.id ?? title), n.url ?? ""]),
        source: "alpaca_news" as const,
        sourceLabel: n.source ? `Alpaca · ${n.source}` : "Alpaca · Benzinga",
        title,
        excerpt,
        url: n.url ?? null,
        sentiment,
        score,
        publishedAt: n.updated_at ?? n.created_at ?? null,
      } satisfies IntelChatterItem;
    });
  } catch {
    return [];
  }
}

export async function isAlpacaNewsAvailable(): Promise<boolean> {
  return (await loadAlpacaCreds()) != null;
}
