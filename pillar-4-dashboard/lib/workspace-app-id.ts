import { isValidAppId, type OotbAppId } from "./ootb-apps";

export type WorkspaceAppId = OotbAppId | `forged-${string}`;

const FORGED_PREFIX = "forged-";

export function isForgedAppId(id: string): id is `forged-${string}` {
  return id.startsWith(FORGED_PREFIX) && id.length > FORGED_PREFIX.length + 1;
}

export function isWorkspaceAppId(id: string): id is WorkspaceAppId {
  return isValidAppId(id) || isForgedAppId(id);
}

export function forgedAppIdFromSlug(slug: string): `forged-${string}` {
  return `forged-${slug}` as `forged-${string}`;
}

export function slugFromForgedAppId(id: string): string | null {
  if (!isForgedAppId(id)) return null;
  return id.slice(FORGED_PREFIX.length);
}

export function forgedAppHref(slug: string): string {
  return `/my-claw/${slug}`;
}

export function slugFromIntent(nameOrIntent: string): string {
  const base = nameOrIntent
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const slug = base || "claw";
  return slug;
}
