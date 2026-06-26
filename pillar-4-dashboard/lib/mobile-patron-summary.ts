import "server-only";

import { listCafeEvents } from "./claw-cafe-events";
import { ensureCapitalQueue } from "./capital-store";
import { buildOsApprovalInbox } from "./os-approval-inbox";
import { listApprovalQueue } from "./content-approval-service";
import { buildWorkExecutiveBrief } from "./work-executive-brief";
import { getOotbApp, isValidAppId, type OotbAppId } from "./ootb-apps";
import { isLocalInferenceAvailable } from "./local-inference";
import { readFreState } from "./fre-state";

export interface MobilePatronSummary {
  ok: true;
  initialized: boolean;
  health: "green" | "amber" | "red";
  healthDetail: string;
  pendingApprovals: number;
  inferenceAvailable: boolean;
  briefLines: string[];
  clawActivity: Array<{ appId: string; short: string; label: string; count: number }>;
}

function weekAgoMs(): number {
  return Date.now() - 7 * 86_400_000;
}

export async function buildMobilePatronSummary(): Promise<MobilePatronSummary> {
  const [fre, approvals, localAvailable, events, workBrief] = await Promise.all([
    readFreState(),
    buildOsApprovalInbox(8),
    isLocalInferenceAvailable(),
    listCafeEvents(60),
    buildWorkExecutiveBrief().catch(() => null),
  ]);

  const recent = events.filter((e) => Date.parse(e.at) >= weekAgoMs());
  const byApp = new Map<string, number>();
  for (const e of recent) {
    byApp.set(e.appId, (byApp.get(e.appId) ?? 0) + 1);
  }

  const clawActivity = [...byApp.entries()]
    .filter(([appId]) => isValidAppId(appId))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([appId, count]) => {
      const app = getOotbApp(appId as OotbAppId);
      return { appId, short: app.short, label: app.name, count };
    });

  let health: MobilePatronSummary["health"] = "green";
  let healthDetail = "Appliance online · Flight Command ready";
  if (!localAvailable) {
    health = "amber";
    healthDetail = "Local inference offline — patron uses fallback replies";
  }
  if (approvals.total >= 5) {
    health = "amber";
    healthDetail = `${approvals.total} items waiting confirm`;
  }

  const briefLines: string[] = [];
  if (workBrief?.headline) briefLines.push(workBrief.headline);
  if (approvals.total > 0) {
    briefLines.push(`${approvals.total} approval${approvals.total === 1 ? "" : "s"} need your OK`);
  }
  if (clawActivity.length > 0) {
    briefLines.push(
      `This week: ${clawActivity.map((c) => `${c.short} (${c.count})`).join(" · ")}`,
    );
  }
  if (briefLines.length === 0) {
    briefLines.push("Your box is quiet — open Ask for a patron brief.");
  }

  return {
    ok: true,
    initialized: fre.initialized,
    health,
    healthDetail,
    pendingApprovals: approvals.total,
    inferenceAvailable: localAvailable,
    briefLines,
    clawActivity,
  };
}

export async function buildMobilePatronSummarySafe(): Promise<MobilePatronSummary> {
  try {
    const capital = await ensureCapitalQueue();
    void capital;
    const creator = await listApprovalQueue();
    void creator;
  } catch {
    // optional enrichments
  }
  return buildMobilePatronSummary();
}
