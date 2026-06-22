import "server-only";

import { buildMorningBrief } from "./work-morning-brief";
import { ensureWorkQueue } from "./work-store";

const CROSS_CLAW_COUNTS = {
  creatorOpenPosts: 2,
  capitalOpenAlerts: 1,
  workActiveLeads: 0,
};

export async function buildOsMorningBrief(): Promise<string> {
  const [workBrief, file] = await Promise.all([buildMorningBrief(), ensureWorkQueue()]);

  const activeLeads = file.leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
  const handoffs = file.leads.filter((l) => l.tags?.some((t) => t.startsWith("handoff:"))).length;

  const osLines = [
    "═══ CurXor OS Morning Brief ═══",
    "",
    `Work: ${activeLeads} active leads · ${file.sequences.filter((s) => s.status === "active").length} sequences`,
    `Creator: ${CROSS_CLAW_COUNTS.creatorOpenPosts} posts to review`,
    `Capital: ${CROSS_CLAW_COUNTS.capitalOpenAlerts} open alert(s)`,
    handoffs > 0 ? `Cross-Claw handoffs: ${handoffs} open` : null,
    "",
    "── Work desk ──",
    workBrief,
  ].filter((l): l is string => l !== null);

  return osLines.join("\n");
}
