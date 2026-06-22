import "server-only";

export type WorkDeskRole = "viewer" | "operator" | "admin";

export interface WorkPermissionCheck {
  role: WorkDeskRole;
  canSend: boolean;
  canApprove: boolean;
  canConfigure: boolean;
}

export function resolveWorkDeskRole(freRole?: string | null): WorkDeskRole {
  const raw = freRole?.trim().toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "viewer") return "viewer";
  return "operator";
}

export function checkWorkPermissions(role: WorkDeskRole): WorkPermissionCheck {
  return {
    role,
    canSend: role !== "viewer",
    canApprove: role === "admin" || role === "operator",
    canConfigure: role === "admin",
  };
}
