import "server-only";

import { readAppFreState } from "./app-fre-state";

export type WorkDeskRole = "viewer" | "operator" | "admin";

export interface WorkPermissionCheck {
  role: WorkDeskRole;
  operatorId: string;
  canSend: boolean;
  canApprove: boolean;
  canAssign: boolean;
  canConfigure: boolean;
}

export function resolveWorkDeskRole(freRole?: string | null): WorkDeskRole {
  const raw = freRole?.trim().toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "viewer") return "viewer";
  return "operator";
}

export function checkWorkPermissions(role: WorkDeskRole, operatorId = "operator"): WorkPermissionCheck {
  return {
    role,
    operatorId,
    canSend: role !== "viewer",
    canApprove: role === "admin" || role === "operator",
    canAssign: role !== "viewer",
    canConfigure: role === "admin",
  };
}

export async function readWorkDeskPermissions(): Promise<WorkPermissionCheck> {
  const fre = await readAppFreState("my-work");
  const role = resolveWorkDeskRole(typeof fre.config.deskRole === "string" ? fre.config.deskRole : null);
  const operatorId =
    typeof fre.config.deskOperatorId === "string" && fre.config.deskOperatorId.trim()
      ? fre.config.deskOperatorId.trim()
      : "operator";
  return checkWorkPermissions(role, operatorId);
}

export type WorkPermissionAction = "send" | "approve" | "assign" | "configure";

export function isWorkActionAllowed(perms: WorkPermissionCheck, action: WorkPermissionAction): boolean {
  if (action === "send") return perms.canSend;
  if (action === "approve") return perms.canApprove;
  if (action === "assign") return perms.canAssign;
  return perms.canConfigure;
}

export function workPermissionDeniedMessage(action: WorkPermissionAction, role: WorkDeskRole): string {
  return `Permission denied: ${action} requires elevated desk role (current: ${role})`;
}
