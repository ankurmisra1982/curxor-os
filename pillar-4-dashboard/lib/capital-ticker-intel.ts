import "server-only";

import { chatCompletion, isLocalInferenceAvailable } from "./local-inference";
import { fetchAlpacaCorporateActions } from "./capital-alpaca-corporate-actions";
import { fetchAlpacaNews, isAlpacaNewsAvailable } from "./capital-alpaca-news";
import { DIGEST_TTL_MS, isIntelStale, TICKER_INTEL_TTL_MS, type IntelProviderStatus } from "./capital-data-providers";
import { aggregateSentiment } from "./capital-intel-sentiment";
import {
  digestFromNews,
  fetchCnbcNews,
  fetchRedditChatter,
  fetchXFinTwitChatter,
  fetchYahooFundamentals,
} from "./capital-intel-fetchers";
import { publishDigestMesh, publishTickerIntelMesh } from "./capital-intel-mesh";
import { readIntelCache, writeIntelCache } from "./capital-intel-store";
import { fetchSecEdgarFilings, fetchSecForm4Filings } from "./capital-sec-edgar";
import type { CapitalIntelSnapshot, IntelChatterItem, TickerIntel } from "./capital-intel-types";

function mergeNews(...batches: IntelChatterItem[][]): IntelChatterItem[] {
  const merged: IntelChatterItem[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const item of batch) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  merged.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  return merged;
}

function buildCitations(news: IntelChatterItem[], chatter: IntelChatterItem[]): string[] {
  return [...news.slice(0, 2), ...chatter.slice(0, 2)].map(
    (i) => `${i.sourceLabel}: ${i.title.slice(0, 80)}`,
  );
}

function pctBullish(items: IntelChatterItem[]): number {
  if (items.length === 0) return 50;
  const bull = items.filter((i) => i.sentiment === "bullish").length;
  return Math.round((bull / items.length) * 100);
}

function detectSentimentContradiction(news: IntelChatterItem[], chatter: IntelChatterItem[]): string | null {
  const newsBull = pctBullish(news.slice(0, 6));
  const chatBull = pctBullish(chatter.slice(0, 8));
  const gap = Math.abs(newsBull - chatBull);
  if (gap < 35 || news.length < 2 || chatter.length < 2) return null;
  if (newsBull >= 60 && chatBull <= 40) {
    return `Headlines skew bullish (${newsBull}%) while social chatter is more bearish (${chatBull}% bull) — watch for narrative vs crowd divergence.`;
  }
  if (newsBull <= 40 && chatBull >= 60) {
    return `Social chatter is bullish (${chatBull}%) but headlines lean cautious (${newsBull}% bull) — crowd may be ahead of media.`;
  }
  return null;
}

export async function listIntelProviderStatus(): Promise<IntelProviderStatus[]> {
  const alpaca = await isAlpacaNewsAvailable();
  const { loadDigitalEnv } = await import("./digital-env");
  const env = await loadDigitalEnv();
  const xLive = Boolean(env.X_BEARER_TOKEN?.trim());
  return [
    { id: "yahoo", label: "Yahoo Finance", available: true, detail: "Fundamentals, chart, earnings" },
    {
      id: "alpaca_news",
      label: "Alpaca News",
      available: alpaca,
      detail: alpaca ? "Benzinga via data API" : "Set Alpaca keys in digital.env",
    },
    {
      id: "alpaca_corp",
      label: "Alpaca Corp Actions",
      available: alpaca,
      detail: alpaca ? "Dividends & splits" : "Set Alpaca keys in digital.env",
    },
    { id: "cnbc", label: "CNBC RSS", available: true, detail: "Headlines" },
    { id: "sec_edgar", label: "SEC EDGAR", available: true, detail: "8-K & Form 4 filings" },
    { id: "reddit", label: "Reddit", available: true, detail: "WSB · r/stocks · r/investing" },
    {
      id: "x_fintwit",
      label: "X FinTwit",
      available: xLive,
      detail: xLive ? "Live search" : "Set X_BEARER_TOKEN in digital.env",
    },
  ];
}

export async function buildTickerIntel(symbol: string): Promise<TickerIntel> {
  const sym = symbol.replace("-", "").trim().toUpperCase();
  if (!sym) throw new Error("Invalid ticker");

  const [{ fundamentals, chart, nextEarningsDate }, cnbc, alpaca, sec, form4, reddit, xItems, corporateActions] =
    await Promise.all([
    fetchYahooFundamentals(sym),
    fetchCnbcNews(sym),
    fetchAlpacaNews(sym),
    fetchSecEdgarFilings(sym),
    fetchSecForm4Filings(sym),
    fetchRedditChatter(sym),
    fetchXFinTwitChatter(sym),
    fetchAlpacaCorporateActions(sym),
  ]);

  const news = mergeNews(alpaca, cnbc, sec, form4);
  const chatter = [...reddit, ...xItems].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  const sentiment = aggregateSentiment([...news, ...chatter].map((i) => ({ sentiment: i.sentiment, score: i.score })));
  const citations = buildCitations(news, chatter);
  const contradictionNote = detectSentimentContradiction(news, chatter);
  const smartTake = await synthesizeSmartTake(sym, fundamentals, news, chatter, sentiment, citations);

  const intel: TickerIntel = {
    symbol: sym,
    fundamentals,
    chart,
    news: news.slice(0, 12),
    chatter: chatter.slice(0, 16),
    sentiment,
    smartTake,
    citations,
    corporateActions: corporateActions.length ? corporateActions : undefined,
    nextEarningsDate,
    contradictionNote,
    updatedAt: new Date().toISOString(),
  };

  const cache = await readIntelCache();
  cache.tickerBySymbol[sym] = intel;
  await writeIntelCache(cache);
  await publishTickerIntelMesh(intel);

  return intel;
}

async function synthesizeSmartTake(
  symbol: string,
  fundamentals: TickerIntel["fundamentals"],
  news: TickerIntel["news"],
  chatter: TickerIntel["chatter"],
  sentiment: TickerIntel["sentiment"],
  citations: string[],
): Promise<string | null> {
  const headlines = [...news.slice(0, 3), ...chatter.slice(0, 2)].map((h) => h.title).join(" · ");
  const fallback = buildHeuristicTake(symbol, fundamentals, sentiment, headlines, citations);

  if (!(await isLocalInferenceAvailable())) return fallback;

  try {
    const result = await chatCompletion({
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are Capital Claw research. Write ONE intuitive sentence (max 32 words) blending price, headline tone, and social chatter. No financial advice disclaimer.",
        },
        {
          role: "user",
          content: JSON.stringify({
            symbol,
            price: fundamentals.price,
            change1d: fundamentals.changePct1d,
            sentiment: sentiment.label,
            headlines,
            sources: citations.slice(0, 3),
          }),
        },
      ],
    });
    const text = result.content.trim();
    return text.length > 10 ? text : fallback;
  } catch {
    return fallback;
  }
}

function buildHeuristicTake(
  symbol: string,
  fundamentals: TickerIntel["fundamentals"],
  sentiment: TickerIntel["sentiment"],
  headlines: string,
  citations: string[],
): string {
  const ch =
    fundamentals.changePct1d != null
      ? `${fundamentals.changePct1d >= 0 ? "+" : ""}${fundamentals.changePct1d.toFixed(1)}% today`
      : "price updating";
  const mood =
    sentiment.label === "quiet"
      ? "Social chatter is light"
      : `Chatter skews ${sentiment.label} (${sentiment.bullishPct}% bull / ${sentiment.bearishPct}% bear)`;
  const hook = citations[0] ?? (headlines ? headlines.slice(0, 90) : "Scanning CNBC, Alpaca, and Reddit");
  return `${symbol} ${ch} · ${mood}. ${hook}`;
}

export async function buildMarketDigest(watchlist: string[]): Promise<CapitalIntelSnapshot> {
  const tickers = watchlist.slice(0, 5).map((t) => t.replace("-", "").toUpperCase());
  const [topNews, alpacaTop, secTop, form4Top, ...rest] = await Promise.all([
    fetchCnbcNews(),
    fetchAlpacaNews(),
    fetchSecEdgarFilings(),
    fetchSecForm4Filings(),
    ...tickers.map((t) => fetchCnbcNews(t)),
    ...tickers.slice(0, 3).map((t) => fetchRedditChatter(t)),
    ...tickers.slice(0, 2).map((t) => fetchXFinTwitChatter(t)),
    ...tickers.slice(0, 3).map((t) => fetchAlpacaNews(t)),
  ]);

  const merged = mergeNews(alpacaTop, topNews, secTop, form4Top, ...rest);

  const digest = digestFromNews(merged).slice(0, 24);
  const snapshot: CapitalIntelSnapshot = {
    digest,
    featuredTickers: watchlist.slice(0, 8),
    updatedAt: new Date().toISOString(),
  };

  const cache = await readIntelCache();
  cache.digest = snapshot;
  await writeIntelCache(cache);
  await publishDigestMesh(snapshot);

  return snapshot;
}

export async function getCachedTickerIntel(
  symbol: string,
  opts?: { allowStale?: boolean },
): Promise<TickerIntel | null> {
  const cache = await readIntelCache();
  const intel = cache.tickerBySymbol[symbol.replace("-", "").toUpperCase()] ?? null;
  if (!intel) return null;
  if (!opts?.allowStale && isIntelStale(intel.updatedAt, TICKER_INTEL_TTL_MS)) return null;
  return intel;
}

export async function getCachedDigest(opts?: { allowStale?: boolean }): Promise<CapitalIntelSnapshot | null> {
  const cache = await readIntelCache();
  const digest = cache.digest;
  if (!digest) return null;
  if (!opts?.allowStale && isIntelStale(digest.updatedAt, DIGEST_TTL_MS)) return null;
  return digest;
}

export { TICKER_INTEL_TTL_MS, DIGEST_TTL_MS };
