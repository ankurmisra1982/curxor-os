"use client";

import type { PatronInference } from "./PatronAskProvider";

function inferenceBadgeLabel(inference: PatronInference | null): string {
  if (inference === "frontier") return "FRONTIER";
  if (inference === "fallback") return "FALLBACK";
  return "LOCAL";
}

function inferenceBadgeClass(inference: PatronInference | null): string {
  if (inference === "frontier") return "text-cursor-glow";
  if (inference === "fallback") return "text-amber-400/80";
  return "text-emerald-400/80";
}

export function PatronAskHeaderBadges({
  clawLabel,
  inferenceStatus,
}: {
  clawLabel: string | null;
  inferenceStatus: PatronInference | null;
}) {
  return (
    <>
      {clawLabel ? (
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
          CONTEXT · {clawLabel}
        </span>
      ) : null}
      <span
        className={`font-mono text-[9px] uppercase tracking-widest ${inferenceBadgeClass(inferenceStatus)}`}
      >
        {inferenceBadgeLabel(inferenceStatus)}
      </span>
    </>
  );
}
