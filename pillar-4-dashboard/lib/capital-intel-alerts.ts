import "server-only";

import { randomUUID } from "node:crypto";

import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { INTEL_ALERT_COOLDOWN_MS } from "./capital-data-providers";
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
    default:
      return null;
  }
}

export async function evaluateIntelAlerts(symbols?: string[]): Promise<{ fired: number; messages: string[] }> {
  const rules = await listIntelAlertRules();
  if (rules.length === 0) return { fired: 0, messages: [] };

  const cache = await readIntelCache();
  const syms =
    symbols ??
    [...new Set(rules.filter((r) => r.enabled).map((r) => r.symbol))].slice(0, 12);

  const messages: string[] = [];
  let fired = 0;

  for (const sym of syms) {
    let intel = cache.tickerBySymbol[sym] ?? (await getCachedTickerIntel(sym));
    if (!intel) {
      try {
        intel = await buildTickerIntel(sym);
      } catch {
        continue;
      }
    }

    for (const rule of rules) {
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
