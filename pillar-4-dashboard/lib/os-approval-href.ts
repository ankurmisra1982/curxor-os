import type { OsApprovalKind } from "./os-approval-inbox-types";

type OsApprovalAppId = "my-capital" | "my-work" | "my-content-creator";

/** Deep-link from Cafe / Home approval strip into the exact desk row. */
export function osApprovalHref(
  appId: OsApprovalAppId,
  kind: OsApprovalKind,
  id: string,
): string {
  const q = encodeURIComponent(id);
  switch (kind) {
    case "trade":
      return `/my-capital?approval=trade&tradeId=${q}`;
    case "send":
      return `/my-work?approval=send&sendId=${q}`;
    case "post":
      return `/my-content?approval=post&postId=${q}`;
    case "reply":
      return `/my-content?approval=reply&replyId=${q}`;
    default:
      return appId === "my-capital" ? "/my-capital" : appId === "my-work" ? "/my-work" : "/my-content";
  }
}

export const OS_APPROVAL_SECTION_IDS = {
  trade: "capital-pending-approvals",
  send: "work-send-approval",
  post: "content-publish-approval",
  reply: "content-publish-approval",
} as const;

export type OsApprovalFocus =
  | { kind: "trade"; tradeId: string }
  | { kind: "send"; sendId: string }
  | { kind: "post"; postId: string }
  | { kind: "reply"; replyId: string };

export function parseOsApprovalFocus(search: URLSearchParams): OsApprovalFocus | null {
  const approval = search.get("approval");
  if (approval === "trade") {
    const tradeId = search.get("tradeId")?.trim();
    return tradeId ? { kind: "trade", tradeId } : null;
  }
  if (approval === "send") {
    const sendId = search.get("sendId")?.trim();
    return sendId ? { kind: "send", sendId } : null;
  }
  if (approval === "post") {
    const postId = search.get("postId")?.trim();
    return postId ? { kind: "post", postId } : null;
  }
  if (approval === "reply") {
    const replyId = search.get("replyId")?.trim();
    return replyId ? { kind: "reply", replyId } : null;
  }
  return null;
}

export function scrollToOsApprovalFocus(focus: OsApprovalFocus | null): void {
  if (!focus || typeof document === "undefined") return;
  const sectionId = OS_APPROVAL_SECTION_IDS[focus.kind];
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
