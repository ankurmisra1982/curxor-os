import "server-only";

import { randomUUID } from "node:crypto";

import type { SocialPlatformId } from "./social-channels";
import { createReactiveDraftFromSignal, ingestSignalFeedItem, listSignalFeedItems } from "./content-signal-feed";
import { MINI_SEQUENCE_PRESETS } from "./work-template-packs";
import type { WorkSignalIntent } from "./work-queue-types";
import { enrichLead } from "./work-lead-enrichment";
import { ensureSignalFeedSeeded, ingestWorkSignal, listWorkSignals, markSignalConverted } from "./work-signal-feed";
import { createSequence, upsertLead } from "./work-store";

export type SignalDomain = "outreach" | "content";

export interface UnifiedSignalItem {
  id: string;
  domain: SignalDomain;
  sourceId: string;
  title: string;
  summary: string;
  source: string;
  score: number;
  urgency: "low" | "medium" | "high";
  intent?: string;
  receivedAt: string;
}

const CONTENT_DEMO = [
  {
    title: "Local LLM inference thread trending on X",
    summary: "Operators discussing sovereign agents on bare metal — reactive post opportunity.",
    source: "social-mention",
    urgency: "high" as const,
    suggestedPlatforms: ["x"] as SocialPlatformId[],
  },
  {
    title: "CurXor mentioned in edge-AI newsletter",
    summary: "Newsletter feature on appliance-first Claws — cross-post to LinkedIn.",
    source: "newsletter-rss",
    urgency: "medium" as const,
    suggestedPlatforms: ["linkedin"] as SocialPlatformId[],
  },
];

function urgencyScore(urgency: "low" | "medium" | "high"): number {
  if (urgency === "high") return 88;
  if (urgency === "medium") return 62;
  return 38;
}

async function ensureContentSignalDemo(): Promise<void> {
  const items = await listSignalFeedItems();
  if (items.length > 0) return;
  for (const demo of CONTENT_DEMO) {
    await ingestSignalFeedItem(demo);
  }
}

export async function ensureUnifiedSignalDemo(): Promise<void> {
  await ensureSignalFeedSeeded();
  await ensureContentSignalDemo();
}

export async function listUnifiedSignals(limit = 12): Promise<UnifiedSignalItem[]> {
  await ensureUnifiedSignalDemo();

  const [workSignals, contentItems] = await Promise.all([listWorkSignals(20), listSignalFeedItems()]);

  const outreach: UnifiedSignalItem[] = workSignals.map((s) => ({
    id: `outreach:${s.id}`,
    domain: "outreach",
    sourceId: s.id,
    title: s.title,
    summary: s.url ? s.url : `${s.intent} · ${s.source}`,
    source: s.source,
    score: s.score,
    urgency: s.score >= 80 ? "high" : s.score >= 60 ? "medium" : "low",
    intent: s.intent,
    receivedAt: s.receivedAt,
  }));

  const content: UnifiedSignalItem[] = contentItems.map((item) => ({
    id: `content:${item.id}`,
    domain: "content",
    sourceId: item.id,
    title: item.title,
    summary: item.summary,
    source: item.source,
    score: urgencyScore(item.urgency),
    urgency: item.urgency,
    receivedAt: item.createdAt,
  }));

  return [...outreach, ...content]
    .sort((a, b) => b.score - a.score || b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, limit);
}

export async function ingestUnifiedSignal(input: {
  domain: SignalDomain;
  title: string;
  summary?: string;
  source?: string;
  intent?: WorkSignalIntent;
  score?: number;
  urgency?: "low" | "medium" | "high";
  suggestedPlatforms?: SocialPlatformId[];
}): Promise<UnifiedSignalItem> {
  if (input.domain === "outreach") {
    const signal = await ingestWorkSignal({
      title: input.title,
      source: input.source,
      intent: input.intent,
      score: input.score,
    });
    return {
      id: `outreach:${signal.id}`,
      domain: "outreach",
      sourceId: signal.id,
      title: signal.title,
      summary: `${signal.intent} · ${signal.source}`,
      source: signal.source,
      score: signal.score,
      urgency: signal.score >= 80 ? "high" : signal.score >= 60 ? "medium" : "low",
      intent: signal.intent,
      receivedAt: signal.receivedAt,
    };
  }

  const item = await ingestSignalFeedItem({
    title: input.title,
    summary: input.summary ?? "",
    source: input.source ?? "signal-claw",
    urgency: input.urgency ?? "medium",
    suggestedPlatforms: input.suggestedPlatforms ?? ["x"],
  });

  return {
    id: `content:${item.id}`,
    domain: "content",
    sourceId: item.id,
    title: item.title,
    summary: item.summary,
    source: item.source,
    score: urgencyScore(item.urgency),
    urgency: item.urgency,
    receivedAt: item.createdAt,
  };
}

export async function dispatchOutreachSignal(signalId: string): Promise<{
  leadId: string;
  sequenceId: string;
  signalId: string;
}> {
  const signals = await listWorkSignals(20);
  const signal = signals.find((s) => s.id === signalId);
  if (!signal) throw new Error("Signal not found");

  const slug = signal.title.slice(0, 24).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const lead = await upsertLead({
    name: signal.title.slice(0, 48),
    email: `signal-${slug}-${Date.now()}@example.com`,
    company: signal.source,
    source: `signal:${signal.intent}`,
    tags: ["signal", signal.intent],
  });

  const seq = await createSequence({
    name: `Signal · ${lead.name}`,
    leadId: lead.id,
    steps:
      MINI_SEQUENCE_PRESETS[0]?.steps.map((s) => ({
        subject: s.subject,
        body: s.body,
        delayDays: s.delayDays,
      })) ?? [{ subject: "Following up", body: "Hi — saw your update.", delayDays: 0 }],
  });

  await markSignalConverted(signal.id, lead.id);
  void enrichLead(lead.id);

  return { leadId: lead.id, sequenceId: seq.id, signalId: signal.id };
}

export async function dispatchContentSignal(
  signalId: string,
  platform: SocialPlatformId = "x",
): Promise<{ postId: string; draftText: string }> {
  const draft = await createReactiveDraftFromSignal(signalId, platform);
  if (!draft) throw new Error("Signal not found or already consumed");
  return draft;
}

export function parseUnifiedSignalRef(ref: string): { domain: SignalDomain; sourceId: string } | null {
  const [domain, ...rest] = ref.split(":");
  const sourceId = rest.join(":");
  if ((domain === "outreach" || domain === "content") && sourceId) {
    return { domain, sourceId };
  }
  return null;
}
