import "server-only";

import { listApprovalQueue } from "./content-approval-service";
import { ensureCapitalQueue } from "./capital-store";
import { ensureWorkQueue } from "./work-store";
import { osApprovalHref } from "./os-approval-href";
import type { OsApprovalInbox, OsApprovalItem } from "./os-approval-inbox-types";

export type { OsApprovalInbox, OsApprovalItem, OsApprovalKind } from "./os-approval-inbox-types";

export async function buildOsApprovalInbox(limit = 12): Promise<OsApprovalInbox> {
  const [capitalFile, workFile, creatorQueue] = await Promise.all([
    ensureCapitalQueue(),
    ensureWorkQueue(),
    listApprovalQueue().catch(() => ({ posts: [], replies: [] })),
  ]);

  const items: OsApprovalItem[] = [];

  for (const t of capitalFile.trades.filter((x) => x.status === "pending_approval")) {
    items.push({
      id: t.id,
      appId: "my-capital",
      kind: "trade",
      label: `${t.action.toUpperCase()} ${t.qty} ${t.ticker}`,
      detail: t.approvalNote ?? "Trade awaiting approval",
      href: osApprovalHref("my-capital", "trade", t.id),
      at: t.createdAt,
    });
  }

  for (const s of workFile.sends.filter((x) => x.status === "pending_approval")) {
    items.push({
      id: s.id,
      appId: "my-work",
      kind: "send",
      label: s.subject.slice(0, 72) || s.to,
      detail: `${s.to} · outbound send`,
      href: osApprovalHref("my-work", "send", s.id),
      at: s.createdAt,
    });
  }

  for (const p of creatorQueue.posts) {
    items.push({
      id: p.id,
      appId: "my-content-creator",
      kind: "post",
      label: `${p.platform} · ${p.channel}`,
      detail: p.draftText.slice(0, 120),
      href: osApprovalHref("my-content-creator", "post", p.id),
      at: p.updatedAt ?? p.createdAt,
    });
  }

  for (const r of creatorQueue.replies) {
    items.push({
      id: r.id,
      appId: "my-content-creator",
      kind: "reply",
      label: `Reply · ${r.platform}`,
      detail: r.replyText.slice(0, 120),
      href: osApprovalHref("my-content-creator", "reply", r.id),
      at: r.updatedAt ?? r.createdAt,
    });
  }

  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const capital = items.filter((i) => i.appId === "my-capital").length;
  const work = items.filter((i) => i.appId === "my-work").length;
  const creator = items.filter((i) => i.appId === "my-content-creator").length;

  return {
    total: items.length,
    counts: { capital, work, creator },
    items: items.slice(0, limit),
  };
}
