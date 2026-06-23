import "server-only";

import { randomUUID } from "node:crypto";

import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { INTEL_ALERT_COOLDOWN_MS } from "./capital-data-providers";
import { ensureCapitalQueue } from "./capital-store";
import { buildTickerIntel, getCachedTickerIntel } from "./capital-ticker-intel";
import {
  listIntelAlertRules,
  readIntelCache,
  recordIntelAlertFire,
} from "./capital-intel-store";
import type { IntelAlertFire, IntelAlertRule, TickerIntel } from "./capital-intel-types";
import { publishDigitalIntent } from "./mesh-publish";

async function notifyIntelAlert(message: string): Promise<void> {
  const text = `📡 Capital intel alert\n${message}`;
  for (const chatId of await listApprovalTelegramChatIds()) {
    await sendTelegramApprovalMessage(chatId, text);
  }
  for (const channel of await listApprovalSlackChannelIds()) {
    await publishDigitalIntent({
      tool: "channel.slack.send",
      payload: { channel, text: text.slice(0, 4000) },
    });
  }
}

function ruleMatches(intel: TickerIntel, rule: IntelAlertRule): string | null {
  if (!rule.enabled) return null;
  if (rule.symbol !== intel.symbol) return null;

  if (rule.lastFiredAt) {
    const since = Date.now() - Date.parse(rule.lastFiredAt);
    if (since < INTEL_ALERT_COOLDOWN_MS) return null;
  }

  switch (rule.kind) {
    case "sentiment_bearish":
      if (intel.sentiment.label === "bearish" || intel.sentiment.bearishPct >= 55) {
        return `${intel.symbol} chatter turned bearish (${intel.sentiment.bearishPct}% bear · ${intel.sentiment.sampleSize} signals)`;
      }
      return null;
    case "sentiment_bullish":
      if (intel.sentiment.label === "bullish" || intel.sentiment.bullishPct >= 55) {
        return `${intel.symbol} chatter turned bullish (${intel.sentiment.bullishPct}% bull · ${intel.sentiment.sampleSize} signals)`;
      }
      return null;
    case "headline_keyword": {
      const kw = rule.keyword?.trim().toLowerCase();
      if (!kw) return null;
      const hit = [...intel.news, ...intel.chatter].find((i) =>
        `${i.title} ${i.excerpt}`.toLowerCase().includes(kw),
      );
      if (hit) return `${intel.symbol} headline match "${kw}": ${hit.title.slice(0, 120)}`;
      return null;
    }
    case "price_drop_pct": {
      const th = rule.thresholdPct ?? 5;
      const ch = intel.fundamentals.changePct1d;
      if (ch != null && ch <= -Math.abs(th)) {
        return `${intel.symbol} down ${ch.toFixed(1)}% today (threshold −${th}%)`;
      }
      return null;
    }
    case "mover_spike":
    case "pilot_signal":
      return null;
    default:
      return null;
  }
}

async function evaluateMoverAndPilotAlerts(): Promise<{ fired: number; messages: string[] }> {
  const rules = await listIntelAlertRules();
  const moverRules = rules.filter((r) => r.enabled && r.kind === "mover_spike");
  const pilotRules = rules.filter((r) => r.enabled && r.kind === "pilot_signal");
  if (moverRules.length === 0 && pilotRules.length === 0) return { fired: 0, messages: [] };

  const file = await ensureCapitalQueue();
  const messages: string[] = [];
  let fired = 0;

  for (const rule of moverRules) {
    if (rule.lastFiredAt && Date.now() - Date.parse(rule.lastFiredAt) < INTEL_ALERT_COOLDOWN_MS) continue;
    const mover = file.movers.find((m) => m.symbol === rule.symbol);
    const th = rule.thresholdPct ?? 3;
    if (mover?.changePct1d != null && Math.abs(mover.changePct1d) >= th) {
      const msg = `${mover.symbol} mover ${mover.changePct1d >= 0 ? "+" : ""}${mover.changePct1d.toFixed(1)}% (threshold ${th}%)`;
      const fire: IntelAlertFire = {
        id: randomUUID().slice(0, 12),
        ruleId: rule.id,
        symbol: rule.symbol,
        message: msg,
        firedAt: new Date().toISOString(),
      };
      await recordIntelAlertFire(fire, rule.id);
      await notifyIntelAlert(msg);
      messages.push(msg);
      fired += 1;
    }
  }

  for (const rule of pilotRules) {
    if (rule.lastFiredAt && Date.now() - Date.parse(rule.lastFiredAt) < INTEL_ALERT_COOLDOWN_MS) continue;
    const minUsd = rule.minNotionalUsd ?? 500;
    const sym = rule.symbol === "*" ? null : rule.symbol;
    const hit = file.pilotSignals.find(
      (s) =>
        (sym == null || s.ticker === sym) &&
        (s.pilotNotionalUsd == null || s.pilotNotionalUsd >= minUsd),
    );
    if (!hit) continue;
    const msg = `Pilot signal · ${hit.action.toUpperCase()} ${hit.ticker}${hit.pilotNotionalUsd != null ? ` ~$${hit.pilotNotionalUsd}` : ""}`;
    const fire: IntelAlertFire = {
      id: randomUUID().slice(0, 12),
      ruleId: rule.id,
      symbol: hit.ticker,
      message: msg,
      firedAt: new Date().toISOString(),
    };
    await recordIntelAlertFire(fire, rule.id);
    await notifyIntelAlert(msg);
    messages.push(msg);
    fired += 1;
  }

  return { fired, messages };
}

export async function evaluateIntelAlerts(symbols?: string[]): Promise<{ fired: number; messages: string[] }> {
  const rules = await listIntelAlertRules();
  const tickerRules = rules.filter(
    (r) => r.enabled && r.kind !== "mover_spike" && r.kind !== "pilot_signal",
  );
  const moverPilot = await evaluateMoverAndPilotAlerts();
  if (tickerRules.length === 0) return moverPilot;

  const cache = await readIntelCache();
  const syms =
    symbols ??
    [...new Set(tickerRules.filter((r) => r.enabled).map((r) => r.symbol))].slice(0, 12);

  const messages: string[] = [...moverPilot.messages];
  let fired = moverPilot.fired;

  for (const sym of syms) {
    let intel = cache.tickerBySymbol[sym] ?? (await getCachedTickerIntel(sym));
    if (!intel) {
      try {
        intel = await buildTickerIntel(sym);
      } catch {
        continue;
      }
    }

    for (const rule of tickerRules) {
      const msg = ruleMatches(intel, rule);
      if (!msg) continue;
      const fire: IntelAlertFire = {
        id: randomUUID().slice(0, 12),
        ruleId: rule.id,
        symbol: sym,
        message: msg,
        firedAt: new Date().toISOString(),
      };
      await recordIntelAlertFire(fire, rule.id);
      await notifyIntelAlert(msg);
      messages.push(msg);
      fired += 1;
    }
  }

  return { fired, messages };
}
