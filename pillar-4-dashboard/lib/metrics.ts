import { readFile } from "node:fs/promises";

import { loadDashboardEnv } from "./env";

export interface ComputeMetrics {
  timestamp: string;
  tokensPerSecond: number | null;
  promptTokensPerSecond: number | null;
  modelLoaded: string | null;
  backend: "vllm" | "ollama" | "unknown";
  memory: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    gpuHeapGb: number;
    umaUsedPercent: number;
  };
}

export async function collectComputeMetrics(): Promise<ComputeMetrics> {
  const env = loadDashboardEnv();
  const mem = await readLinuxMemory();
  const preferred = env.inferenceBackend;

  const vllm = preferred === "vllm" ? await probeVllm(env.inferenceBaseUrl, env.inferenceMetricsUrl) : null;
  const ollama =
    preferred === "ollama" ? await probeOllama(env.ollamaUrl) : vllm?.backend === "unknown" ? await probeOllama(env.ollamaUrl) : null;
  const fallbackVllm = ollama?.backend === "unknown" ? await probeVllm(env.inferenceBaseUrl, env.inferenceMetricsUrl) : null;

  const active = vllm?.backend !== "unknown" && vllm ? vllm : ollama?.backend !== "unknown" && ollama ? ollama : fallbackVllm ?? ollama ?? vllm ?? {
    backend: "unknown" as const,
    modelLoaded: null,
    tokensPerSecond: null,
    promptTokensPerSecond: null,
  };

  const usedGb = (mem.totalKb - mem.availableKb) / 1024 / 1024;

  return {
    timestamp: new Date().toISOString(),
    tokensPerSecond: active.tokensPerSecond,
    promptTokensPerSecond: active.promptTokensPerSecond,
    modelLoaded: active.modelLoaded,
    backend: active.backend,
    memory: {
      totalGb: env.totalRamGb,
      usedGb: Number(usedGb.toFixed(2)),
      freeGb: Number((env.totalRamGb - usedGb).toFixed(2)),
      gpuHeapGb: env.gpuHeapGb,
      umaUsedPercent: Number(((usedGb / env.totalRamGb) * 100).toFixed(1)),
    },
  };
}

async function readLinuxMemory(): Promise<{ totalKb: number; availableKb: number }> {
  try {
    const raw = await readFile("/proc/meminfo", "utf8");
    const totalKb = parseMeminfo(raw, "MemTotal");
    const availableKb = parseMeminfo(raw, "MemAvailable") ?? parseMeminfo(raw, "MemFree");
    return { totalKb, availableKb };
  } catch {
    return { totalKb: 64 * 1024 * 1024, availableKb: 32 * 1024 * 1024 };
  }
}

function parseMeminfo(raw: string, key: string): number {
  const match = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
  return match ? Number.parseInt(match[1], 10) : 0;
}

async function probeVllm(
  baseUrl: string,
  metricsUrl: string,
): Promise<Pick<ComputeMetrics, "tokensPerSecond" | "promptTokensPerSecond" | "modelLoaded" | "backend">> {
  try {
    const modelsRes = await fetch(`${baseUrl}/models`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    let modelLoaded: string | null = null;
    if (modelsRes.ok) {
      const body = (await modelsRes.json()) as { data?: Array<{ id?: string }> };
      modelLoaded = body.data?.[0]?.id ?? null;
    }

    const metricsRes = await fetch(metricsUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (metricsRes.ok) {
      const text = await metricsRes.text();
      return {
        backend: "vllm",
        modelLoaded,
        tokensPerSecond: scrapePrometheusGauge(text, "vllm:avg_generation_throughput_toks_per_s"),
        promptTokensPerSecond: scrapePrometheusGauge(text, "vllm:avg_prompt_throughput_toks_per_s"),
      };
    }

    if (modelsRes.ok) {
      return { backend: "vllm", modelLoaded, tokensPerSecond: null, promptTokensPerSecond: null };
    }
  } catch {
    /* offline or vllm not running */
  }
  return { backend: "unknown", modelLoaded: null, tokensPerSecond: null, promptTokensPerSecond: null };
}

async function probeOllama(
  baseUrl: string,
): Promise<Pick<ComputeMetrics, "tokensPerSecond" | "promptTokensPerSecond" | "modelLoaded" | "backend">> {
  try {
    const res = await fetch(`${baseUrl}/api/ps`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return { backend: "unknown", modelLoaded: null, tokensPerSecond: null, promptTokensPerSecond: null };
    const body = (await res.json()) as { models?: Array<{ name?: string; size?: number }> };
    const modelLoaded = body.models?.[0]?.name ?? null;
    return { backend: "ollama", modelLoaded, tokensPerSecond: null, promptTokensPerSecond: null };
  } catch {
    return { backend: "unknown", modelLoaded: null, tokensPerSecond: null, promptTokensPerSecond: null };
  }
}

function scrapePrometheusGauge(text: string, name: string): number | null {
  const line = text.split("\n").find((l) => l.startsWith(name) && !l.startsWith("#"));
  if (!line) return null;
  const value = Number.parseFloat(line.split(/\s+/).pop() ?? "");
  return Number.isFinite(value) ? value : null;
}
