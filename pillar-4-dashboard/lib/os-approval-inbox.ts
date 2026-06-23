import "server-only";

import { listApprovalQueue } from "./content-approval-service";
import { ensureCapitalQueue } from "./capital-store";
import { ensureWorkQueue } from "./work-store";

export type OsApprovalKind = "trade" | "send" | "post" | "reply";

export interface OsApprovalItem {
  id: string;
  appId: "my-capital" | "my-work" | "my-content-creator";
  kind: OsApprovalKind;
  label: string;
  detail: string;
  href: string;
  at: string;
}

export interface OsApprovalInbox {
  total: number;
  counts: { capital: number; work: number; creator: number };
  items: OsApprovalItem[];
}

export async function buildOsApprovalInbox(limit = 12): Promise<OsApprovalInbox> {
  const [capitalFile, workFile, creatorQueue] = await Promise.all([
    ensureCapitalQueue(),
    ensureWorkQueue(),
    listApprovalQueue(),
  ]);

  const items: OsApprovalItem[] = [];

  for (const t of capitalFile.trades.filter((x) => x.status === "pending_approval")) {
    items.push({
      id: t.id,
      appId: "my-capital",
      kind: "trade",
      label: `${t.action.toUpperCase()} ${t.qty} ${t.ticker}`,
      detail: t.approvalNote ?? "Trade awaiting approval",
      href: "/my-capital",
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
      href: "/my-work",
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
      href: "/my-content",
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
      href: "/my-content",
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
