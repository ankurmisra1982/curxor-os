import "server-only";

import { createHash } from "node:crypto";

import { getPilotById, mergePilotCatalog } from "./capital-pilot-catalog";
import { proportionalQty, rebalanceDeltas, subscriptionVirtualQty } from "./capital-pilot-copy";
import { fetchQuotesForSymbols } from "./capital-quotes";
import type { BrokerId, CapitalPilot, PilotSignal, PilotSubscription } from "./capital-queue-types";
import { executeCapitalTrade } from "./capital-trade-executor";
import {
  ensureCapitalQueue,
  writeCapitalFilePartial,
} from "./capital-store";

export function listPilots(): CapitalPilot[] {
  return mergePilotCatalog([]);
}

export async function listPilotsFromStore(): Promise<CapitalPilot[]> {
  const file = await ensureCapitalQueue();
  return mergePilotCatalog(file.pilots);
}

export async function subscribeToPilot(input: {
  pilotId: string;
  allocationUsd: number;
  brokerId?: BrokerId;
}): Promise<{ ok: boolean; subscription?: PilotSubscription; error?: string }> {
  const pilot = getPilotById(input.pilotId);
  if (!pilot) return { ok: false, error: "Pilot not found" };
  if (input.allocationUsd < pilot.minAllocationUsd) {
    return { ok: false, error: `Minimum allocation $${pilot.minAllocationUsd}` };
  }

  const file = await ensureCapitalQueue();
  const existing = file.subscriptions.find((s) => s.pilotId === input.pilotId && s.state === "active");
  if (existing) {
    if (existing.allocationUsd !== input.allocationUsd) {
      await updatePilotAllocation(existing.id, input.allocationUsd);
    }
    const refreshed = await ensureCapitalQueue();
    const subscription = refreshed.subscriptions.find((s) => s.id === existing.id);
    return { ok: true, subscription };
  }

  const now = new Date().toISOString();
  const sub: PilotSubscription = {
    id: `SUB-${String(file.subscriptions.length + 1).padStart(2, "0")}`,
    pilotId: input.pilotId,
    allocationUsd: input.allocationUsd,
    brokerId: input.brokerId ?? "alpaca",
    state: "active",
    copyEnabled: true,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  file.subscriptions.push(sub);
  file.pilots = mergePilotCatalog(file.pilots);
  await writeCapitalFilePartial(file);

  await initialPilotSync(sub.id);
  const refreshed = await ensureCapitalQueue();
  const subscription = refreshed.subscriptions.find((s) => s.id === sub.id);
  return { ok: true, subscription };
}

export async function updatePilotAllocation(
  subscriptionId: string,
  allocationUsd: number,
): Promise<PilotSubscription | null> {
  const file = await ensureCapitalQueue();
  const idx = file.subscriptions.findIndex((s) => s.id === subscriptionId);
  if (idx < 0) return null;
  const pilot = getPilotById(file.subscriptions[idx]!.pilotId);
  if (pilot && allocationUsd < pilot.minAllocationUsd) return null;
  file.subscriptions[idx] = {
    ...file.subscriptions[idx]!,
    allocationUsd,
    updatedAt: new Date().toISOString(),
  };
  await writeCapitalFilePartial(file);
  return file.subscriptions[idx]!;
}

export async function setSubscriptionState(
  subscriptionId: string,
  state: PilotSubscription["state"],
): Promise<PilotSubscription | null> {
  const file = await ensureCapitalQueue();
  const idx = file.subscriptions.findIndex((s) => s.id === subscriptionId);
  if (idx < 0) return null;
  file.subscriptions[idx] = { ...file.subscriptions[idx]!, state, updatedAt: new Date().toISOString() };
  await writeCapitalFilePartial(file);
  return file.subscriptions[idx]!;
}

export async function unsubscribePilot(subscriptionId: string): Promise<boolean> {
  const file = await ensureCapitalQueue();
  const before = file.subscriptions.length;
  file.subscriptions = file.subscriptions.filter((s) => s.id !== subscriptionId);
  if (file.subscriptions.length === before) return false;
  await writeCapitalFilePartial(file);
  return true;
}

function signalId(pilotId: string, ticker: string, bucket: string): string {
  return createHash("sha256").update(`${pilotId}:${ticker}:${bucket}`).digest("hex").slice(0, 16);
}

export async function emitPilotSignal(input: {
  pilotId: string;
  ticker: string;
  action: "buy" | "sell";
  pilotQty: number;
  pilotNotionalUsd?: number | null;
}): Promise<{ ok: boolean; signal?: PilotSignal; copied: number; error?: string }> {
  const pilot = getPilotById(input.pilotId);
  if (!pilot) return { ok: false, copied: 0, error: "Pilot not found" };

  const file = await ensureCapitalQueue();
  const bucket = new Date().toISOString().slice(0, 13);
  const id = signalId(input.pilotId, input.ticker, bucket);
  if (file.pilotSignals.some((s) => s.id === id)) {
    return { ok: false, copied: 0, error: "Duplicate signal in bucket" };
  }

  const signal: PilotSignal = {
    id,
    pilotId: input.pilotId,
    ticker: input.ticker.toUpperCase(),
    action: input.action,
    pilotQty: input.pilotQty,
    pilotNotionalUsd: input.pilotNotionalUsd ?? null,
    emittedAt: new Date().toISOString(),
    copiedCount: 0,
  };
  file.pilotSignals.unshift(signal);
  file.pilotSignals = file.pilotSignals.slice(0, 100);
  await writeCapitalFilePartial(file);

  const copied = await copySignalToSubscriptions(signal);
  const updated = await ensureCapitalQueue();
  const saved = updated.pilotSignals.find((s) => s.id === signal.id);
  return { ok: true, signal: saved, copied };
}

async function copySignalToSubscriptions(signal: PilotSignal): Promise<number> {
  const file = await ensureCapitalQueue();
  const pilot = getPilotById(signal.pilotId);
  if (!pilot) return 0;

  let copied = 0;

  for (const sub of file.subscriptions) {
    if (sub.pilotId !== signal.pilotId || sub.state !== "active" || !sub.copyEnabled) continue;
    const qty = proportionalQty(signal.pilotQty, pilot.referenceAumUsd, sub.allocationUsd);
    if (qty <= 0) continue;

    const idem = createHash("sha256")
      .update(`${signal.id}:${sub.id}:${signal.ticker}`)
      .digest("hex")
      .slice(0, 24);

    const result = await executeCapitalTrade({
      ticker: signal.ticker,
      qty,
      action: signal.action,
      source: "pilot_copy",
      brokerId: sub.brokerId,
      pilotId: signal.pilotId,
      subscriptionId: sub.id,
      idempotencyKey: idem,
      skipAutonomousGate: true,
    });

    if (result.ok) copied += 1;
  }

  const f2 = await ensureCapitalQueue();
  const sidx = f2.pilotSignals.findIndex((s) => s.id === signal.id);
  if (sidx >= 0) {
    f2.pilotSignals[sidx] = { ...f2.pilotSignals[sidx]!, copiedCount: copied };
    await writeCapitalFilePartial(f2);
  }
  return copied;
}

export async function initialPilotSync(subscriptionId: string): Promise<{ trades: number }> {
  const file = await ensureCapitalQueue();
  const sub = file.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub) return { trades: 0 };
  const pilot = getPilotById(sub.pilotId);
  if (!pilot) return { trades: 0 };

  const symbols = pilot.holdings.map((h) => h.symbol).filter((s) => s !== "CASH");
  const quotes = await fetchQuotesForSymbols(symbols);
  const priceMap = new Map(quotes.map((q) => [q.symbol, q.close]));
  const current = subscriptionVirtualQty(file.trades, sub.id);
  const deltas = rebalanceDeltas(pilot, sub, priceMap, current);

  let trades = 0;

  for (const d of deltas) {
    const result = await executeCapitalTrade({
      ticker: d.ticker,
      qty: d.qty,
      action: d.action,
      source: "pilot_copy",
      brokerId: sub.brokerId,
      pilotId: sub.pilotId,
      subscriptionId: sub.id,
      skipAutonomousGate: true,
    });
    if (result.ok) trades += 1;
  }

  const f3 = await ensureCapitalQueue();
  const idx = f3.subscriptions.findIndex((s) => s.id === subscriptionId);
  if (idx >= 0) {
    f3.subscriptions[idx] = { ...f3.subscriptions[idx]!, lastSyncedAt: new Date().toISOString() };
    await writeCapitalFilePartial(f3);
  }
  return { trades };
}

export async function syncPilotSubscriptions(): Promise<{ synced: number; trades: number }> {
  const file = await ensureCapitalQueue();
  if (file.tradingPaused) return { synced: 0, trades: 0 };

  let synced = 0;
  let trades = 0;
  for (const sub of file.subscriptions) {
    if (sub.state !== "active" || !sub.copyEnabled) continue;
    const out = await initialPilotSync(sub.id);
    if (out.trades > 0) synced += 1;
    trades += out.trades;
  }
  return { synced, trades };
}
