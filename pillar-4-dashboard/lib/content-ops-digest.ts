import "server-only";

import { listAuditEntries } from "./content-audit-store";
import { buildBridgeHealthReport } from "./content-bridge-health";
import { listApprovalQueue } from "./content-approval-service";
import { listEnrichedEngageSuggestions } from "./content-engage-intelligence";
import { listPostMetrics } from "./content-analytics-store";
import { fetchContentStatus } from "./content-queue-store";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import { readContentOpsState, markDigestSent } from "./content-ops-controls";

export async function buildWeeklyOpsDigest(): Promise<string> {
  const [status, queue, engage, metrics, health, audit, ops] = await Promise.all([
    fetchContentStatus(),
    listApprovalQueue(),
    listEnrichedEngageSuggestions(true),
    listPostMetrics(),
    buildBridgeHealthReport([]),
    listAuditEntries({ limit: 40 }),
    readContentOpsState(),
  ]);

  const published = status.posts.filter((p) => p.stage === "PUBLISHED").length;
  const scheduled = status.posts.filter((p) => p.stage === "SCHEDULED").length;
  const pending = queue.posts.length + queue.replies.length;
  const priorityEngage = engage.filter((e) => e.triageStatus === "priority").length;
  const bridgeIssues = health.summary.degraded + health.summary.authExpired + health.summary.unconfigured;
  const { listRecoveryCandidates } = await import("./content-bridge-recovery");
  const recoveryCount = (await listRecoveryCandidates()).length;

  const topMetric = [...metrics].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  const topLine = topMetric
    ? `Top post: ${topMetric.postId} · ${topMetric.views ?? 0} views`
    : "No metrics yet this period";

  const recentAudit = audit
    .slice(0, 5)
    .map((e) => `· ${e.action} ${e.targetType}:${e.targetId.slice(0, 8)}`)
    .join("\n");

  return [
    "📊 Creator Claw — weekly ops digest",
    "",
    ops.publishingPaused ? "⛔ PUBLISHING PAUSED" : "✅ Publishing active",
    "",
    `Posts: ${published} published · ${scheduled} scheduled · ${pending} awaiting approval`,
    `Failed publishes: ${recoveryCount} · Engage: ${engage.length} open · ${priorityEngage} priority`,
    `Bridges: ${bridgeIssues} issue(s) · ${health.summary.ready} ready`,
    topLine,
    "",
    "Recent audit:",
    recentAudit || "· (none)",
    "",
    "Open dashboard → My Content for details.",
  ].join("\n");
}

export async function runWeeklyOpsDigest(force = false): Promise<{ sent: boolean; text: string }> {
  const ops = await readContentOpsState();
  const intervalMs = Number.parseInt(process.env.CURXOR_OPS_DIGEST_INTERVAL_HOURS ?? "168", 10) * 3_600_000;
  if (!force && ops.lastDigestAt) {
    const elapsed = Date.now() - new Date(ops.lastDigestAt).getTime();
    if (elapsed < intervalMs) {
      return { sent: false, text: "Digest not due yet" };
    }
  }

  const text = await buildWeeklyOpsDigest();
  const chatIds = await listApprovalTelegramChatIds();
  if (chatIds.length === 0) {
    return { sent: false, text };
  }

  for (const chatId of chatIds) {
    await sendTelegramApprovalMessage(chatId, text);
  }
  await markDigestSent();
  return { sent: true, text };
}
