import type { SentimentLabel } from "./capital-intel-types";

const BULLISH = [
  "moon",
  "rocket",
  "buy",
  "calls",
  "bull",
  "breakout",
  "beat",
  "upgrade",
  "surge",
  "rally",
  "long",
  "undervalued",
  "growth",
  "strong",
  "record high",
  "outperform",
  "green",
  "rip",
  "pump",
  "accumulate",
  "load",
  "yolo",
];

const BEARISH = [
  "crash",
  "dump",
  "sell",
  "puts",
  "bear",
  "downgrade",
  "miss",
  "plunge",
  "short",
  "overvalued",
  "bubble",
  "fraud",
  "investigation",
  "layoff",
  "warning",
  "decline",
  "red",
  "tank",
  "bagholder",
  "rug",
  "sec probe",
];

const NEGATIONS = ["not ", "no ", "never ", "don't ", "dont ", "isn't ", "isnt ", "won't ", "wont "];

const INTENSIFIERS = ["very", "super", "extremely", "massive", "huge"];

const BULL_EMOJI = ["🚀", "🌙", "📈", "💎", "🙌", "💪"];
const BEAR_EMOJI = ["📉", "💀", "🔻", "😱", "⚠️"];

function countMatches(lower: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    if (lower.includes(w)) n += 1;
  }
  return n;
}

function applyNegation(lower: string, bull: number, bear: number): { bull: number; bear: number } {
  let b = bull;
  let r = bear;
  for (const neg of NEGATIONS) {
    if (!lower.includes(neg)) continue;
    const after = lower.slice(lower.indexOf(neg) + neg.length);
    const bullHit = BULLISH.some((w) => after.startsWith(w) || after.includes(` ${w}`));
    const bearHit = BEARISH.some((w) => after.startsWith(w) || after.includes(` ${w}`));
    if (bullHit && b > 0) b -= 1;
    if (bearHit && r > 0) r -= 1;
  }
  return { bull: b, bear: r };
}

export function scoreSentiment(text: string): { sentiment: SentimentLabel; score: number } {
  return scoreSentimentAdvanced(text);
}

export function scoreSentimentAdvanced(text: string): {
  sentiment: SentimentLabel;
  score: number;
  confidence: number;
  signals: { bull: number; bear: number };
} {
  const lower = text.toLowerCase();
  let bull = countMatches(lower, BULLISH);
  let bear = countMatches(lower, BEARISH);

  for (const e of BULL_EMOJI) {
    if (text.includes(e)) bull += 1;
  }
  for (const e of BEAR_EMOJI) {
    if (text.includes(e)) bear += 1;
  }

  for (const intens of INTENSIFIERS) {
    if (lower.includes(intens)) {
      if (BULLISH.some((w) => lower.includes(`${intens} ${w}`))) bull += 0.5;
      if (BEARISH.some((w) => lower.includes(`${intens} ${w}`))) bear += 0.5;
    }
  }

  const negated = applyNegation(lower, bull, bear);
  bull = negated.bull;
  bear = negated.bear;

  const total = bull + bear;
  const score = total === 0 ? 0 : (bull - bear) / total;
  const confidence = Math.min(1, total / 4);

  let sentiment: SentimentLabel = "neutral";
  if (score > 0.15) sentiment = "bullish";
  else if (score < -0.15) sentiment = "bearish";

  return { sentiment, score, confidence, signals: { bull, bear } };
}

export function aggregateSentiment(
  items: Array<{ sentiment: SentimentLabel; score: number }>,
): {
  label: "bullish" | "bearish" | "mixed" | "quiet";
  score: number;
  bullishPct: number;
  bearishPct: number;
  sampleSize: number;
} {
  if (items.length === 0) {
    return { label: "quiet", score: 0, bullishPct: 0, bearishPct: 0, sampleSize: 0 };
  }
  const bullish = items.filter((i) => i.sentiment === "bullish").length;
  const bearish = items.filter((i) => i.sentiment === "bearish").length;
  const avg = items.reduce((a, i) => a + i.score, 0) / items.length;
  const bullishPct = Math.round((bullish / items.length) * 100);
  const bearishPct = Math.round((bearish / items.length) * 100);
  let label: "bullish" | "bearish" | "mixed" | "quiet" = "mixed";
  if (bullishPct >= 55 && bullishPct > bearishPct + 10) label = "bullish";
  else if (bearishPct >= 55 && bearishPct > bullishPct + 10) label = "bearish";
  return { label, score: avg, bullishPct, bearishPct, sampleSize: items.length };
}
