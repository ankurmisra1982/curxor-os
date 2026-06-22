import "server-only";

import { evaluateDeskHealthAlerts } from "./capital-desk-alerts";
import { fetchCapitalStatus } from "./capital-store";
import { listApprovalQueue } from "./content-approval-service";
import { fetchContentStatus } from "./content-queue-store";
import { buildMorningBrief } from "./work-morning-brief";
import { ensureWorkQueue } from "./work-store";

export interface OsBriefCounts {
  workActiveLeads: number;
  workActiveSequences: number;
  creatorOpenPosts: number;
  capitalOpenAlerts: number;
  crossClawHandoffs: number;
}

export async function readOsBriefCounts(): Promise<OsBriefCounts> {
  const [file, approvalQueue, contentStatus, capitalStatus, deskAlerts] = await Promise.all([
    ensureWorkQueue(),
    listApprovalQueue(),
    fetchContentStatus(),
    fetchCapitalStatus({ sync: false }),
    evaluateDeskHealthAlerts(),
  ]);

  const activeLeads = file.leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
  const draftPosts = contentStatus.posts.filter((p) => p.stage !== "PUBLISHED" && p.stage !== "ARCHIVED").length;
  const creatorOpenPosts = Math.max(
    approvalQueue.posts.length + approvalQueue.replies.length,
    draftPosts,
    contentStatus.posts.length > 0 ? contentStatus.posts.length : 0,
  );
  const capitalOpenAlerts =
    deskAlerts.alerts.length +
    capitalStatus.stats.armedRules +
    capitalStatus.trades.filter((t) => t.status === "pending_approval").length;

  return {
    workActiveLeads: activeLeads,
    workActiveSequences: file.sequences.filter((s) => s.status === "active").length,
    creatorOpenPosts,
    capitalOpenAlerts,
    crossClawHandoffs: file.leads.filter((l) => l.tags?.some((t) => t.startsWith("handoff:"))).length,
  };
}

export async function buildOsMorningBrief(): Promise<string> {
  const [workBrief, counts] = await Promise.all([buildMorningBrief(), readOsBriefCounts()]);

  const osLines = [
    "═══ CurXor OS Morning Brief ═══",
    "",
    `Work: ${counts.workActiveLeads} active leads · ${counts.workActiveSequences} sequences`,
    `Creator: ${counts.creatorOpenPosts} posts/replies to review`,
    `Capital: ${counts.capitalOpenAlerts} open alert(s)`,
    counts.crossClawHandoffs > 0 ? `Cross-Claw handoffs: ${counts.crossClawHandoffs} open` : null,
    "",
    "── Work desk ──",
    workBrief,
  ].filter((l): l is string => l !== null);

  return osLines.join("\n");
}
