import "server-only";

import {
  approvePendingCapitalTrade,
  rejectPendingCapitalTrade,
} from "./capital-approval-telegram";
import { approvePost, approveReply, rejectPost, rejectReply } from "./content-approval-service";
import type { OsApprovalKind } from "./os-approval-inbox-types";
import { approveSend, rejectSend } from "./work-store";
import { executeOutboundSend } from "./work-send-executor";
import { appendAgentAudit } from "./work-agent-audit";
import {
  isWorkActionAllowed,
  readWorkDeskPermissions,
  workPermissionDeniedMessage,
} from "./work-permissions";

export type PatronApprovalAction = "approve" | "reject";

export interface PatronApprovalResolveRequest {
  appId: "my-capital" | "my-work" | "my-content-creator";
  kind: OsApprovalKind;
  id: string;
  action: PatronApprovalAction;
  note?: string;
}

export interface PatronApprovalResolveResult {
  ok: boolean;
  error?: string;
  label?: string;
}

export async function resolvePatronApproval(
  req: PatronApprovalResolveRequest,
): Promise<PatronApprovalResolveResult> {
  const id = req.id.trim();
  if (!id) return { ok: false, error: "id required" };

  if (req.appId === "my-capital" && req.kind === "trade") {
    if (req.action === "approve") {
      const result = await approvePendingCapitalTrade(id, "api");
      return result.ok
        ? { ok: true, label: `Trade ${id} approved` }
        : { ok: false, error: result.error ?? "Trade not pending approval" };
    }
    const rejected = await rejectPendingCapitalTrade(
      id,
      req.note?.trim() || "Rejected via Patron Ask",
      "api",
    );
    return rejected
      ? { ok: true, label: `Trade ${id} rejected` }
      : { ok: false, error: "Trade not pending approval" };
  }

  if (req.appId === "my-work" && req.kind === "send") {
    const perms = await readWorkDeskPermissions();
    if (!isWorkActionAllowed(perms, "approve")) {
      return { ok: false, error: workPermissionDeniedMessage("approve", perms.role) };
    }
    if (req.action === "approve") {
      const approved = await approveSend(id);
      if (!approved) return { ok: false, error: "Send not pending approval" };
      await executeOutboundSend(id);
      await appendAgentAudit({
        kind: "approval",
        source: "desk",
        sendId: id,
        note: "patron_approve_send",
      });
      return { ok: true, label: `Send ${id} approved` };
    }
    const rejected = await rejectSend(id, req.note?.trim() || "Rejected via Patron Ask");
    if (!rejected) return { ok: false, error: "Send not found" };
    await appendAgentAudit({
      kind: "approval",
      source: "desk",
      sendId: id,
      note: "patron_reject_send",
    });
    return { ok: true, label: `Send ${id} rejected` };
  }

  if (req.appId === "my-content-creator" && req.kind === "post") {
    if (req.action === "approve") {
      try {
        const result = await approvePost(id, "patron");
        return result.ok
          ? { ok: true, label: `Post ${id} approved` }
          : { ok: false, error: result.error ?? "Publish failed" };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    const post = await rejectPost(id, req.note?.trim(), "patron");
    return post
      ? { ok: true, label: `Post ${id} rejected` }
      : { ok: false, error: "Not pending approval" };
  }

  if (req.appId === "my-content-creator" && req.kind === "reply") {
    if (req.action === "approve") {
      try {
        const result = await approveReply(id, "patron");
        return result.ok
          ? { ok: true, label: `Reply ${id} approved` }
          : { ok: false, error: result.error ?? "Publish failed" };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    const reply = await rejectReply(id, req.note?.trim(), "patron");
    return reply
      ? { ok: true, label: `Reply ${id} rejected` }
      : { ok: false, error: "Not pending approval" };
  }

  return { ok: false, error: "Unsupported approval kind" };
}
