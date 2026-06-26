import "server-only";

import { listCafeEvents } from "./claw-cafe-events";
import { ensureCapitalQueue } from "./capital-store";
import { buildOsApprovalInbox } from "./os-approval-inbox";
import { listApprovalQueue } from "./content-approval-service";
import { buildWorkExecutiveBrief } from "./work-executive-brief";
import { getOotbApp, isValidAppId, type OotbAppId } from "./ootb-apps";
import { readUserSettings } from "./user-settings";
import type {
  PatronWeeklyBundle,
  PatronWeeklyClawSlice,
  PatronWeeklyCrossAction,
} from "./patron-weekly-bundle-types";

const CLAW_HREF: Record<OotbAppId, string> = {
  "my-capital": "/my-capital",
  "my-work": "/my-work",
  "my-content-creator": "/my-content",
  "my-vital": "/my-vital",
  "my-family": "/my-family",
  "my-shop": "/my-shop",
  "tesla-optimus-engine": "/optimus",
  "robotaxi-fleet-manager": "/robotaxi",
  "claw-cafe": "/claw-cafe",
  "claw-forge": "/claw-forge",
};

function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function weekAgoMs(): number {
  return Date.now() - 7 * 86_400_000;
}

export async function buildPatronWeeklyBundle(): Promise<PatronWeeklyBundle> {
  const weekOf = startOfWeekIso();
  const settings = await readUserSettings();
  const confirmedWeek = settings.patronWeeklyBundle?.weekOf ?? null;
  const lastConfirmedAt = settings.patronWeeklyBundle?.lastConfirmedAt ?? null;

  const [events, approvals, workBrief, capitalFile, creatorQueue] = await Promise.all([
    listCafeEvents(100),
    buildOsApprovalInbox(12),
    buildWorkExecutiveBrief().catch(() => null),
    ensureCapitalQueue(),
    listApprovalQueue(),
  ]);

  const recentEvents = events.filter((e) => Date.parse(e.at) >= weekAgoMs());
  const scores = new Map<OotbAppId, number>();

  for (const e of recentEvents) {
    if (!isValidAppId(e.appId)) continue;
    scores.set(e.appId, (scores.get(e.appId) ?? 0) + 1);
  }

  for (const item of approvals.items) {
    scores.set(item.appId, (scores.get(item.appId) ?? 0) + 8);
  }

  const pendingCapital = capitalFile.trades.filter((t) => t.status === "pending_approval").length;
  if (pendingCapital > 0) scores.set("my-capital", (scores.get("my-capital") ?? 0) + pendingCapital * 6);

  const creatorPending = creatorQueue.posts.length + creatorQueue.replies.length;
  if (creatorPending > 0) {
    scores.set("my-content-creator", (scores.get("my-content-creator") ?? 0) + creatorPending * 5);
  }

  if (workBrief && workBrief.stats.stalls > 0) {
    scores.set("my-work", (scores.get("my-work") ?? 0) + workBrief.stats.stalls * 4);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const claws: PatronWeeklyClawSlice[] = ranked.map(([appId, score]) => {
    const app = getOotbApp(appId);
    const bullets: string[] = [];
    if (appId === "my-work" && workBrief) {
      bullets.push(workBrief.headline);
      for (const section of workBrief.sections.slice(0, 2)) {
        bullets.push(...section.bullets.slice(0, 2));
      }
    } else if (appId === "my-capital") {
      const weekTrades = capitalFile.trades.filter((t) => Date.parse(t.createdAt) >= weekAgoMs()).length;
      bullets.push(`${weekTrades} trade events this week · ${pendingCapital} pending approval`);
    } else if (appId === "my-content-creator") {
      bullets.push(`${creatorPending} publish/reply items in approval queue`);
    } else {
      const count = recentEvents.filter((e) => e.appId === appId).length;
      bullets.push(`${count} Cafe events this week — keep momentum in ${app.short}`);
    }
    return {
      appId,
      short: app.short,
      name: app.name,
      headline: `${app.name} — priority this week`,
      bullets: bullets.slice(0, 4),
      href: CLAW_HREF[appId],
      score,
    };
  });

  if (claws.length === 0) {
    claws.push({
      appId: "my-capital",
      short: "CAP",
      name: "Capital Claw",
      headline: "Start the week in Capital",
      bullets: ["Review rules and portfolio health", "Arm one disciplined rule before live capital"],
      href: "/my-capital",
      score: 1,
    });
    claws.push({
      appId: "my-work",
      short: "OUT",
      name: "Outreach Claw",
      headline: "Pipeline pulse in Outreach",
      bullets: ["Import or enrich 5 leads", "Activate one sequence with approval gate on"],
      href: "/my-work",
      score: 1,
    });
  }

  const crossActions: PatronWeeklyCrossAction[] = approvals.items.slice(0, 4).map((item) => ({
    id: `approval:${item.id}`,
    title: item.label,
    detail: item.detail,
    href: item.href,
    clawShort: getOotbApp(item.appId).short,
  }));

  const clawNames = claws.map((c) => c.short).join(" + ");
  const planSummary = `Focus ${clawNames} this week. Patron suggests desk depth before breadth — confirm gated actions inline, then open each Claw for skills.`;

  const headline =
    approvals.total > 0
      ? `${approvals.total} confirm(s) · weekly plan: ${clawNames}`
      : `Weekly plan: ${clawNames}`;

  return {
    weekOf,
    generatedAt: new Date().toISOString(),
    headline,
    planSummary,
    claws,
    crossActions,
    confirmed: confirmedWeek === weekOf && Boolean(lastConfirmedAt),
    lastConfirmedAt,
  };
}
