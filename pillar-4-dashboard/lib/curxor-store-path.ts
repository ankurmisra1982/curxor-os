import "server-only";

import path from "node:path";

/**
 * Resolve a JSON store path from an env override with production-safe fallbacks.
 * Rejects laptop/dev paths (backslashes, drive letters, relative paths) on appliance.
 */
export function resolveStorePath(envKey: string, defaultPath: string): string {
  const raw = process.env[envKey]?.trim();
  if (!raw) return defaultPath;

  if (process.env.NODE_ENV === "production") {
    const looksLikeDevPath =
      raw.includes("\\") || /^[A-Za-z]:/.test(raw) || !path.isAbsolute(raw);
    if (looksLikeDevPath) return defaultPath;
  }

  return raw;
}
