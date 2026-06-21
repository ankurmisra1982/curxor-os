import "server-only";

import { readFile } from "node:fs/promises";

export function digitalEnvPath(): string {
  return process.env.CURXOR_DIGITAL_ENV_PATH ?? "/etc/curxor/digital.env";
}

export async function loadDigitalEnv(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(digitalEnvPath(), "utf8");
    const vars: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [k, ...rest] = trimmed.split("=");
      vars[k!.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
    return vars;
  } catch {
    return {};
  }
}

export function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
