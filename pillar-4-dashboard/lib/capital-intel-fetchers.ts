import "server-only";

import { createHash } from "node:crypto";

import { loadDigitalEnv } from "./digital-env";
import { scoreSentiment } from "./capital-intel-sentiment";
import type { IntelChatterItem, IntelSource, MarketDigestItem, TickerChartPoint, TickerFundamentals } from "./capital-intel-types";

const UA = "CurXorCapital/1.0 (sovereign research; +https://curxor.local)";

function idFor(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 14);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchYahooFundamentals(symbol: string): Promise<{
  fundamentals: TickerFundamentals;
  chart: TickerChartPoint[];
  nextEarningsDate: string | null;
}> {
  const sym = symbol.replace("-", "").toUpperCase();
  const empty: TickerFundamentals = {
    symbol: sym,
    name: null,
    price: null,
    changePct1d: null,
    changePct5d: null,
    marketCap: null,
    peRatio: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    volume: null,
    avgVolume: null,
  };

  try {
    const [chartRes, summaryRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`, {
        headers: { "User-Agent": UA },
        cache: "no-store",
      }),
      fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price,summaryDetail,defaultKeyStatistics,calendarEvents`,
        { headers: { "User-Agent": UA }, cache: "no-store" },
      ),
    ]);

    const chartJson = chartRes.ok ? ((await chartRes.json()) as Record<string, unknown>) : null;
    const summaryJson = summaryRes.ok ? ((await summaryRes.json()) as Record<string, unknown>) : null;

    const result = chartJson?.chart as { result?: Array<Record<string, unknown>> } | undefined;
    const meta = result?.result?.[0]?.meta as Record<string, unknown> | undefined;
    const timestamps = (result?.result?.[0]?.timestamp as number[] | undefined) ?? [];
    const closes = ((result?.result?.[0]?.indicators as { quote?: Array<{ close?: number[] }> })?.quote?.[0]
      ?.close ?? []) as number[];

    const volumes = ((result?.result?.[0]?.indicators as { quote?: Array<{ volume?: number[] }> })?.quote?.[0]
      ?.volume ?? []) as number[];

    const chart: TickerChartPoint[] = timestamps
      .map((t, i) => ({
        t: new Date(t * 1000).toISOString(),
        close: closes[i] ?? 0,
        volume: volumes[i] ?? undefined,
      }))
      .filter((p) => p.close > 0)
      .slice(-90);

    const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const prev = typeof meta?.previousClose === "number" ? meta.previousClose : null;
    const changePct1d = price && prev ? ((price - prev) / prev) * 100 : null;

    const fiveAgo = chart.length >= 6 ? chart[chart.length - 6]!.close : null;
    const changePct5d = price && fiveAgo ? ((price - fiveAgo) / fiveAgo) * 100 : null;

    const q = summaryJson?.quoteSummary as { result?: Array<Record<string, unknown>> } | undefined;
    const summary = q?.result?.[0] as Record<string, Record<string, { raw?: number; fmt?: string }>> | undefined;
    const sd = summary?.summaryDetail;
    const pk = summary?.price;
    const ks = summary?.defaultKeyStatistics;

    const cal = summary?.calendarEvents as { earnings?: { earningsDate?: Array<{ raw?: number }> } } | undefined;
    const earningsRaw = cal?.earnings?.earningsDate?.[0]?.raw;
    const nextEarningsDate =
      typeof earningsRaw === "number" ? new Date(earningsRaw * 1000).toISOString().slice(0, 10) : null;

    return {
      fundamentals: {
        symbol: sym,
        name: typeof meta?.longName === "string" ? meta.longName : typeof meta?.shortName === "string" ? meta.shortName : null,
        price,
        changePct1d,
        changePct5d,
        marketCap: sd?.marketCap?.raw ?? null,
        peRatio: sd?.trailingPE?.raw ?? null,
        fiftyTwoWeekHigh: sd?.fiftyTwoWeekHigh?.raw ?? null,
        fiftyTwoWeekLow: sd?.fiftyTwoWeekLow?.raw ?? null,
        volume: pk?.regularMarketVolume?.raw ?? null,
        avgVolume: sd?.averageVolume?.raw ?? null,
      },
      chart,
      nextEarningsDate,
    };
  } catch {
    return { fundamentals: empty, chart: [], nextEarningsDate: null };
  }
}

async function fetchRedditSubSearch(
  subreddit: string,
  query: string,
  source: IntelSource,
  sourceLabel: string,
): Promise<IntelChatterItem[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=hot&limit=8`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: { children?: Array<{ data?: Record<string, unknown> }> };
    };
    const children = data.data?.children ?? [];
    return children
      .map((c) => c.data)
      .filter(Boolean)
      .map((d) => {
        const title = String(d!.title ?? "");
        const selftext = String(d!.selftext ?? "").slice(0, 280);
        const text = `${title} ${selftext}`;
        const { sentiment, score } = scoreSentiment(text);
        const permalink = d!.permalink ? `https://www.reddit.com${String(d!.permalink)}` : null;
        const created = typeof d!.created_utc === "number" ? new Date(d!.created_utc * 1000).toISOString() : null;
        return {
          id: idFor([source, String(d!.id ?? title)]),
          source,
          sourceLabel,
          title,
          excerpt: selftext || title,
          url: permalink,
          sentiment,
          score,
          publishedAt: created,
          engagement: {
            likes: typeof d!.ups === "number" ? d!.ups : undefined,
            comments: typeof d!.num_comments === "number" ? d!.num_comments : undefined,
          },
        } satisfies IntelChatterItem;
      });
  } catch {
    return [];
  }
}

export async function fetchRedditChatter(symbol: string): Promise<IntelChatterItem[]> {
  const q = `$${symbol} OR ${symbol}`;
  const [wsb, stocks, investing] = await Promise.all([
    fetchRedditSubSearch("wallstreetbets", q, "reddit_wsb", "Reddit · WSB"),
    fetchRedditSubSearch("stocks", symbol, "reddit_stocks", "Reddit · r/stocks"),
    fetchRedditSubSearch("investing", symbol, "reddit_investing", "Reddit · r/investing"),
  ]);
  const seen = new Set<string>();
  return [...wsb, ...stocks, ...investing].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function fetchCnbcNews(symbol?: string): Promise<IntelChatterItem[]> {
  const urls = symbol
    ? [
        `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114&keywords=${encodeURIComponent(symbol)}`,
      ]
    : ["https://www.cnbc.com/id/100003114/device/rss/rss.html"];

  const items: IntelChatterItem[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
      if (!res.ok) continue;
      const xml = await res.text();
      const entries = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
      for (const block of entries.slice(0, 12)) {
        const title = stripHtml(block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? "");
        const link = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() ?? null;
        const desc = stripHtml(block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] ?? "").slice(0, 280);
        const pub = block.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1]?.trim() ?? null;
        if (!title) continue;
        const { sentiment, score } = scoreSentiment(`${title} ${desc}`);
        items.push({
          id: idFor(["cnbc", title, link ?? ""]),
          source: "cnbc",
          sourceLabel: "CNBC",
          title,
          excerpt: desc || title,
          url: link,
          sentiment,
          score,
          publishedAt: pub ? new Date(pub).toISOString() : null,
        });
      }
    } catch {
      /* offline */
    }
  }
  return items;
}

export async function fetchXFinTwitChatter(symbol: string): Promise<IntelChatterItem[]> {
  const env = await loadDigitalEnv();
  const bearer = env.X_BEARER_TOKEN?.trim();
  if (!bearer) return demoXChatter(symbol);

  const query = encodeURIComponent(`($${symbol} OR ${symbol}) (finTwit OR fintwit OR stocks) -is:retweet lang:en`);
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username`,
      { headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store" },
    );
    if (!res.ok) return demoXChatter(symbol);
    const data = (await res.json()) as {
      data?: Array<{ id: string; text: string; created_at?: string; public_metrics?: { like_count?: number; reply_count?: number }; author_id?: string }>;
      includes?: { users?: Array<{ id: string; username?: string }> };
    };
    const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u.username]));
    return (data.data ?? []).map((t) => {
      const username = t.author_id ? users.get(t.author_id) : null;
      const { sentiment, score } = scoreSentiment(t.text);
      return {
        id: idFor(["x", t.id]),
        source: "x_fintwit" as const,
        sourceLabel: username ? `X · @${username}` : "X · FinTwit",
        title: t.text.slice(0, 120),
        excerpt: t.text,
        url: username ? `https://x.com/${username}/status/${t.id}` : null,
        sentiment,
        score,
        publishedAt: t.created_at ?? null,
        engagement: { likes: t.public_metrics?.like_count, comments: t.public_metrics?.reply_count },
      };
    });
  } catch {
    return demoXChatter(symbol);
  }
}

function demoXChatter(symbol: string): IntelChatterItem[] {
  return [
    {
      id: idFor(["x-demo", symbol, "1"]),
      source: "x_general",
      sourceLabel: "X · FinTwit (demo)",
      title: `$${symbol} on watch — link X_BEARER_TOKEN for live FinTwit search`,
      excerpt: "Configure X API in digital.env to pull live cashtag chatter from FinTwit and finance spaces.",
      url: null,
      sentiment: "neutral",
      score: 0,
      publishedAt: new Date().toISOString(),
    },
  ];
}

export function digestFromNews(items: IntelChatterItem[]): MarketDigestItem[] {
  return items.slice(0, 20).map((n) => ({
    id: n.id,
    headline: n.title,
    source: n.sourceLabel,
    url: n.url,
    tickers: extractTickers(`${n.title} ${n.excerpt}`),
    sentiment: n.sentiment,
    publishedAt: n.publishedAt,
  }));
}

export function extractTickers(text: string): string[] {
  const found = new Set<string>();
  const cashtag = text.match(/\$[A-Z]{1,5}\b/g) ?? [];
  for (const c of cashtag) found.add(c.slice(1));
  const upper = text.match(/\b[A-Z]{2,5}\b/g) ?? [];
  const skip = new Set(["USD", "CEO", "ETF", "IPO", "FDA", "SEC", "AI", "USA", "GDP", "CPI", "EPS", "ATH", "WSB"]);
  for (const u of upper) {
    if (!skip.has(u) && u.length <= 5) found.add(u);
  }
  return [...found].slice(0, 6);
}
