import "server-only";

import { readFile } from "node:fs/promises";

let digitalEnvCache: Record<string, string> | null = null;
let digitalEnvLoadPromise: Promise<Record<string, string>> | null = null;

export function digitalEnvPath(): string {
  return process.env.CURXOR_DIGITAL_ENV_PATH ?? "/etc/curxor/digital.env";
}

export async function loadDigitalEnv(): Promise<Record<string, string>> {
  if (digitalEnvCache) return digitalEnvCache;
  if (!digitalEnvLoadPromise) {
    digitalEnvLoadPromise = (async () => {
      try {
        const raw = await readFile(digitalEnvPath(), "utf8");
        const vars: Record<string, string> = {};
        for (const line of raw.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
          const [k, ...rest] = trimmed.split("=");
          vars[k!.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
        }
        digitalEnvCache = vars;
        return vars;
      } catch {
        digitalEnvCache = {};
        return {};
      }
    })();
  }
  return digitalEnvLoadPromise;
}

/** process.env wins over digital.env file (for QA overrides). */
export async function resolveDigitalEnvVar(key: string): Promise<string | undefined> {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;
  const fileEnv = await loadDigitalEnv();
  const fromFile = fileEnv[key]?.trim();
  return fromFile || undefined;
}

export async function isDigitalEnvFlag(key: string, defaultValue = false): Promise<boolean> {
  const v = await resolveDigitalEnvVar(key);
  if (!v) return defaultValue;
  const lower = v.toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes" || lower === "on";
}

export function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
