export type IntelSource =
  | "cnbc"
  | "alpaca_news"
  | "sec_edgar"
  | "reddit_wsb"
  | "reddit_stocks"
  | "reddit_investing"
  | "x_fintwit"
  | "x_general";

export type SentimentLabel = "bullish" | "bearish" | "neutral";

export interface IntelChatterItem {
  id: string;
  source: IntelSource;
  sourceLabel: string;
  title: string;
  excerpt: string;
  url: string | null;
  sentiment: SentimentLabel;
  score: number;
  publishedAt: string | null;
  engagement?: { likes?: number; comments?: number };
}

export interface TickerFundamentals {
  symbol: string;
  name: string | null;
  price: number | null;
  changePct1d: number | null;
  changePct5d: number | null;
  marketCap: number | null;
  peRatio: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  avgVolume: number | null;
}

export interface TickerChartPoint {
  t: string;
  close: number;
  volume?: number;
}

export interface CorporateActionItem {
  id: string;
  type: "dividend" | "split" | "other";
  label: string;
  exDate: string | null;
  amount: string | null;
}

export interface TickerSentimentSummary {
  label: "bullish" | "bearish" | "mixed" | "quiet";
  score: number;
  bullishPct: number;
  bearishPct: number;
  sampleSize: number;
}

export interface TickerIntel {
  symbol: string;
  fundamentals: TickerFundamentals;
  chart: TickerChartPoint[];
  news: IntelChatterItem[];
  chatter: IntelChatterItem[];
  sentiment: TickerSentimentSummary;
  smartTake: string | null;
  citations?: string[];
  corporateActions?: CorporateActionItem[];
  nextEarningsDate?: string | null;
  contradictionNote?: string | null;
  updatedAt: string;
}

export type IntelAlertKind =
  | "sentiment_bearish"
  | "sentiment_bullish"
  | "headline_keyword"
  | "price_drop_pct";

export interface IntelAlertRule {
  id: string;
  symbol: string;
  kind: IntelAlertKind;
  keyword?: string;
  thresholdPct?: number;
  enabled: boolean;
  createdAt: string;
  lastFiredAt: string | null;
}

export interface IntelAlertFire {
  id: string;
  ruleId: string;
  symbol: string;
  message: string;
  firedAt: string;
}

export interface MarketDigestItem {
  id: string;
  headline: string;
  source: string;
  url: string | null;
  tickers: string[];
  sentiment: SentimentLabel;
  publishedAt: string | null;
}

export interface CapitalIntelSnapshot {
  digest: MarketDigestItem[];
  featuredTickers: string[];
  updatedAt: string;
}
