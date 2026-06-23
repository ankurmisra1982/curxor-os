import "server-only";

import path from "node:path";

/**
 * Runtime JSON store root.
 * - Dev: `CURXOR_DEV_QA_DIR` or `scripts/dev-qa` under cwd
 * - Appliance: `/etc/curxor` (writable per systemd ReadWritePaths)
 *
 * Never default production writes to the install tree (`/opt/curxor/.../scripts/dev-qa`).
 */
export function curxorDataDir(): string {
  const explicit =
    process.env.CURXOR_DEV_QA_DIR?.trim() || process.env.CURXOR_DATA_DIR?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return "/etc/curxor";
  return path.join(process.cwd(), "scripts", "dev-qa");
}

export function curxorDataPath(filename: string): string {
  return path.join(curxorDataDir(), filename);
}
