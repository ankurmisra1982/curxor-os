import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_OTA_ENV = "/etc/curxor/ota.env";

export interface OtaEnvConfig {
  versionUrl: string | null;
  logPath: string;
  root: string;
  configured: boolean;
}

function parseEnvFile(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function getOtaEnvPath(): string {
  return process.env.CURXOR_OTA_ENV_PATH?.trim() || DEFAULT_OTA_ENV;
}

export async function readOtaEnvConfig(): Promise<OtaEnvConfig> {
  const explicitUrl = process.env.CURXOR_OTA_VERSION_URL?.trim();
  const explicitLog = process.env.CURXOR_OTA_LOG?.trim();
  const explicitRoot = process.env.CURXOR_OTA_ROOT?.trim();

  if (explicitUrl) {
    return {
      versionUrl: explicitUrl,
      logPath: explicitLog ?? "/var/log/curxor/ota-update.log",
      root: explicitRoot ?? "/opt/curxor",
      configured: true,
    };
  }

  const envPath = getOtaEnvPath();
  try {
    const raw = await readFile(envPath, "utf8");
    const parsed = parseEnvFile(raw);
    return {
      versionUrl: parsed.CURXOR_OTA_VERSION_URL?.trim() || null,
      logPath: parsed.CURXOR_OTA_LOG?.trim() || "/var/log/curxor/ota-update.log",
      root: parsed.CURXOR_OTA_ROOT?.trim() || "/opt/curxor",
      configured: Boolean(parsed.CURXOR_OTA_VERSION_URL?.trim()),
    };
  } catch {
    return {
      versionUrl: null,
      logPath: explicitLog ?? "/var/log/curxor/ota-update.log",
      root: explicitRoot ?? path.resolve(process.cwd(), ".."),
      configured: false,
    };
  }
}

export function getOtaUpdaterScript(): string {
  return process.env.CURXOR_OTA_UPDATER_SCRIPT?.trim() || "/opt/curxor/scripts/ota-updater.sh";
}
