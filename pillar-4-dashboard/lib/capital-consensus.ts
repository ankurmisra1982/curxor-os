import type { TickerSentimentSummary } from "./capital-intel-types";
import type { CapitalPosition, PilotSignal } from "./capital-queue-types";

export type ConsensusLabel = "bullish" | "bearish" | "mixed" | "neutral";

export interface ConsensusMeter {
  score: number;
  label: ConsensusLabel;
  pilots: { score: number; signalCount: number; label: string };
  chatter: { score: number; label: string };
  position: { held: boolean; qty: number; label: string };
}

function clamp(n: number, lo = -1, hi = 1): number {
  return Math.max(lo, Math.min(hi, n));
}

function consensusLabel(score: number, hasSignals: boolean): ConsensusLabel {
  if (!hasSignals && Math.abs(score) < 0.08) return "neutral";
  if (score > 0.18) return "bullish";
  if (score < -0.18) return "bearish";
  return "mixed";
}

/** Blend pilot signals, chatter sentiment, and desk position into one meter (-1 bear … +1 bull). */
export function computeConsensusMeter(
  symbol: string,
  sentiment: TickerSentimentSummary,
  pilotSignals: PilotSignal[],
  positions: CapitalPosition[],
): ConsensusMeter {
  const sym = symbol.trim().toUpperCase();
  const sigs = pilotSignals.filter((s) => s.ticker.trim().toUpperCase() === sym);

  let pilotScore = 0;
  if (sigs.length) {
    const weighted = sigs.reduce((acc, s) => {
      const dir = s.action === "sell" ? -1 : 1;
      const w =
        s.pilotNotionalUsd != null && s.pilotNotionalUsd > 0
          ? Math.min(s.pilotNotionalUsd / 2_500, 2.5)
          : 1;
      return acc + dir * w;
    }, 0);
    pilotScore = clamp(weighted / sigs.length / 2);
  }

  const chatterScore = clamp(sentiment.score);

  const pos = positions.find((p) => p.symbol.trim().toUpperCase() === sym);
  const held = pos != null && pos.qty > 0;
  const positionScore = held ? 0.35 : held === false && pos ? -0.2 : 0;

  const wPilots = sigs.length ? 0.35 : 0;
  const wChatter = sentiment.sampleSize > 0 ? 0.4 : 0;
  const wPosition = 0.25;
  const wSum = wPilots + wChatter + wPosition;
  const score = clamp(
    (pilotScore * wPilots + chatterScore * wChatter + positionScore * wPosition) / wSum,
  );

  const hasSignals = sigs.length > 0 || sentiment.sampleSize > 0 || held;

  return {
    score,
    label: consensusLabel(score, hasSignals),
    pilots: {
      score: pilotScore,
      signalCount: sigs.length,
      label:
        sigs.length === 0
          ? "No pilot signals"
          : pilotScore > 0.12
            ? "Pilots leaning buy"
            : pilotScore < -0.12
              ? "Pilots leaning sell"
              : "Pilots mixed",
    },
    chatter: {
      score: chatterScore,
      label: `${sentiment.label} · ${sentiment.bullishPct}% bull`,
    },
    position: {
      held,
      qty: pos?.qty ?? 0,
      label: held ? `You hold ${pos!.qty}` : "No desk position",
    },
  };
}
