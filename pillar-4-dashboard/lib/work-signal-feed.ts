import "server-only";

import { randomUUID } from "node:crypto";

import { ensureWorkQueue, writeWorkFilePartial } from "./work-store";
import type { WorkSignalIntent, WorkSignalRow } from "./work-queue-types";

export type WorkSignal = WorkSignalRow;

const DEMO_SIGNALS: Omit<WorkSignal, "id">[] = [
  {
    title: "EdgeCompute posted 3 SDR roles — outbound stack migration",
    source: "jobs-rss",
    intent: "hiring",
    score: 82,
    receivedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    title: "Northwind Labs raised seed — GTM hire likely",
    source: "funding-feed",
    intent: "funding",
    score: 76,
    receivedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    title: "CurXor mentioned in sovereign AI thread on HN",
    source: "social-mention",
    url: "https://news.ycombinator.com",
    intent: "community",
    score: 68,
    receivedAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

export async function ensureSignalFeedSeeded(): Promise<WorkSignal[]> {
  const file = await ensureWorkQueue();
  if (!file.signals) file.signals = [];

  const unconvertedCount = () => file.signals!.filter((s) => !s.convertedLeadId).length;

  if (file.signals.length === 0) {
    file.signals = DEMO_SIGNALS.map((s) => ({ ...s, id: `SIG-${randomUUID().slice(0, 8)}` }));
    await writeWorkFilePartial(file);
    return file.signals;
  }

  if (unconvertedCount() < 3) {
    for (const demo of DEMO_SIGNALS) {
      if (unconvertedCount() >= 3) break;
      if (!file.signals.some((s) => s.title === demo.title && !s.convertedLeadId)) {
        file.signals.unshift({ ...demo, id: `SIG-${randomUUID().slice(0, 8)}` });
      }
    }
    while (unconvertedCount() < 3) {
      const demo = DEMO_SIGNALS[unconvertedCount() % DEMO_SIGNALS.length]!;
      file.signals.unshift({ ...demo, id: `SIG-${randomUUID().slice(0, 8)}` });
    }
    file.signals = file.signals.slice(0, 100);
    await writeWorkFilePartial(file);
  }

  return file.signals ?? [];
}

export async function listWorkSignals(limit = 10): Promise<WorkSignal[]> {
  const signals = await ensureSignalFeedSeeded();
  return signals
    .filter((s) => !s.convertedLeadId)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function ingestWorkSignal(input: {
  title: string;
  source?: string;
  url?: string;
  intent?: WorkSignalIntent;
  score?: number;
}): Promise<WorkSignal> {
  const file = await ensureWorkQueue();
  if (!file.signals) file.signals = [];
  const signal: WorkSignal = {
    id: `SIG-${randomUUID().slice(0, 8)}`,
    title: input.title.trim().slice(0, 240),
    source: input.source?.trim() || "webhook",
    url: input.url,
    intent: input.intent ?? "other",
    score: typeof input.score === "number" ? input.score : 50,
    receivedAt: new Date().toISOString(),
  };
  file.signals.unshift(signal);
  file.signals = file.signals.slice(0, 100);
  await writeWorkFilePartial(file);
  return signal;
}

export async function markSignalConverted(signalId: string, leadId: string): Promise<WorkSignal | null> {
  const file = await ensureWorkQueue();
  const idx = file.signals?.findIndex((s) => s.id === signalId) ?? -1;
  if (idx < 0 || !file.signals) return null;
  file.signals[idx] = { ...file.signals[idx]!, convertedLeadId: leadId };
  await writeWorkFilePartial(file);
  return file.signals[idx]!;
}
