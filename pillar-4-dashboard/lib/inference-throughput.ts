import "server-only";

export interface InferenceThroughputSample {
  tokensPerSecond: number;
  model: string;
  recordedAt: string;
  source: "ollama_chat" | "ollama_generate";
}

let lastSample: InferenceThroughputSample | null = null;

export function recordOllamaThroughput(input: {
  evalCount?: number;
  evalDurationNs?: number;
  model: string;
  source?: InferenceThroughputSample["source"];
}): void {
  const count = input.evalCount;
  const durationNs = input.evalDurationNs;
  if (typeof count !== "number" || typeof durationNs !== "number" || durationNs <= 0 || count <= 0) {
    return;
  }
  const tps = count / (durationNs / 1e9);
  if (!Number.isFinite(tps) || tps <= 0) return;

  lastSample = {
    tokensPerSecond: Math.round(tps * 10) / 10,
    model: input.model,
    recordedAt: new Date().toISOString(),
    source: input.source ?? "ollama_chat",
  };
}

export function getLastInferenceThroughput(): InferenceThroughputSample | null {
  return lastSample;
}
