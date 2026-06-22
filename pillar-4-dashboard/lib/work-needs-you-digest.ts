import "server-only";

import { appendWorkSyncLog } from "./work-store";
import { buildNeedsYouSummary } from "./work-needs-you";
import { detectWorkStalls } from "./work-stall-detection";

export async function sendNeedsYouDigest(): Promise<{ ok: boolean; demoLogged: boolean; text: string }> {
  const [needsYou, stalls] = await Promise.all([buildNeedsYouSummary(), detectWorkStalls()]);

  const lines = [
    "Work Claw — needs you digest",
    "",
    `Total: ${needsYou.total} (${needsYou.pendingApprovals} approvals · ${needsYou.interestedMail} interested mail · ${needsYou.p1Tasks} P1)`,
    "",
    "Stalls:",
    ...stalls.slice(0, 5).map((s) => `  · ${s.title} — ${s.detail}`),
    "",
    "Open dashboard → Work Claw → Needs you",
  ];

  const text = lines.join("\n");

  await appendWorkSyncLog({
    connector: "digest",
    action: "needs_you_digest",
    detail: text.slice(0, 400),
  });

  return { ok: true, demoLogged: true, text };
}
