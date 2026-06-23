import "server-only";

import { buildOsApprovalInbox } from "./os-approval-inbox";
import type { CafeCharacter, CafeCharacterState } from "./claw-cafe-spatial";

function approvalBubble(kind: string): string {
  if (kind === "trade") return "Needs OK · trade";
  if (kind === "send") return "Needs OK · send";
  if (kind === "reply") return "Needs OK · reply";
  return "Needs OK · post";
}

/** Overlay pending OS approvals onto room characters (live mirror, not ledger events). */
export async function applyCafeApprovalOverlay(characters: CafeCharacter[]): Promise<CafeCharacter[]> {
  const inbox = await buildOsApprovalInbox(50);
  if (inbox.total === 0) return characters;

  const pendingByApp = new Map<string, { bubble: string; href: string }>();
  for (const item of inbox.items) {
    if (pendingByApp.has(item.appId)) continue;
    pendingByApp.set(item.appId, {
      bubble: approvalBubble(item.kind),
      href: item.href,
    });
  }

  return characters.map((c) => {
    const pending = pendingByApp.get(c.appId);
    if (!pending) return c;
    const state: CafeCharacterState = "act";
    return {
      ...c,
      state,
      bubble: pending.bubble,
      needsApproval: true,
      approvalHref: pending.href,
    };
  });
}
