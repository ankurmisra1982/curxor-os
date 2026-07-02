import "server-only";

import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { constants } from "node:fs";

import { readOtaEnvConfig, getOtaUpdaterScript } from "./ota-config";
import {
  checkOtaAvailable,
  readInstalledVersion,
  readOtaManifest,
  isNewerVersion,
} from "./ota-available-check";

export interface OtaVersionInfo {
  version: string;
  channel: string;
  installedAt: string | null;
}

export interface OtaUpdateStatus {
  ok: true;
  installed: OtaVersionInfo;
  remote: {
    version: string | null;
    channel: string | null;
    released: string | null;
    releaseNotesUrl: string | null;
    severity: string | null;
  };
  updateAvailable: boolean;
  otaConfigured: boolean;
  versionUrl: string | null;
  updaterReady: boolean;
  lastCheckedAt: string | null;
}

export interface OtaRunResult {
  ok: boolean;
  mode: "dry-run" | "apply" | "manifest-only";
  updateAvailable: boolean;
  installed: string;
  remote: string | null;
  message: string;
  error?: string;
}

async function fileExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function readInstalledMeta(): Promise<OtaVersionInfo> {
  const version = await readInstalledVersion();
  const manifest = await readOtaManifestFromLocal();
  return {
    version,
    channel: manifest?.channel ?? "stable",
    installedAt: manifest?.installed_at ?? null,
  };
}

interface LocalVersionFile {
  version?: string;
  channel?: string;
  installed_at?: string | null;
}

async function readOtaManifestFromLocal(): Promise<LocalVersionFile | null> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const candidates = [
    process.env.CURXOR_INSTALLED_VERSION_PATH?.trim(),
    path.join(path.resolve(process.cwd(), ".."), "version.json"),
    path.join(process.cwd(), "version.json"),
  ].filter(Boolean) as string[];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as LocalVersionFile;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function buildOtaUpdateStatus(): Promise<OtaUpdateStatus> {
  const [installedMeta, check, otaEnv, updaterReady] = await Promise.all([
    readInstalledMeta(),
    checkOtaAvailable(),
    readOtaEnvConfig(),
    fileExecutable(getOtaUpdaterScript()),
  ]);

  const manifest = await readOtaManifest();
  const extended = manifest as {
    released?: string;
    release_notes_url?: string;
    severity?: string;
  } | null;

  let lastCheckedAt: string | null = null;
  try {
    const { readFile } = await import("node:fs/promises");
    const { curxorDataPath } = await import("./curxor-data-dir");
    const raw = await readFile(curxorDataPath("ota-check-state.json"), "utf8");
    const state = JSON.parse(raw) as { checkedAt?: string };
    lastCheckedAt = state.checkedAt ?? null;
  } catch {
    /* no prior check */
  }

  return {
    ok: true,
    installed: installedMeta,
    remote: {
      version: check.latest,
      channel: manifest?.channel ?? null,
      released: extended?.released ?? null,
      releaseNotesUrl: extended?.release_notes_url ?? null,
      severity: extended?.severity ?? null,
    },
    updateAvailable: check.available,
    otaConfigured: otaEnv.configured,
    versionUrl: otaEnv.versionUrl,
    updaterReady,
    lastCheckedAt,
  };
}

function spawnOtaUpdater(args: string[]): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  const script = getOtaUpdaterScript();
  return new Promise((resolve, reject) => {
    const child = spawn("sudo", [script, ...args], {
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let settled = false;
    const finish = (result: { code: number | null; signal: NodeJS.Signals | null }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
    child.on("close", (code, signal) => finish({ code, signal }));
    child.stdout?.resume();
    child.stderr?.resume();
  });
}

async function manifestOnlyCheck(installed: string): Promise<OtaRunResult> {
  const check = await checkOtaAvailable();
  return {
    ok: true,
    mode: "manifest-only",
    updateAvailable: check.available,
    installed: check.installed,
    remote: check.latest,
    message: check.available
      ? `Update available: ${check.installed} → ${check.latest} (manifest check — configure /etc/curxor/ota.env to fetch remote mirror)`
      : `CurXor OS ${installed} is up to date (manifest check)`,
  };
}

export async function runOtaCheck(): Promise<OtaRunResult> {
  const installed = await readInstalledVersion();
  const updaterReady = await fileExecutable(getOtaUpdaterScript());

  if (updaterReady) {
    try {
      const { code } = await spawnOtaUpdater(["--dry-run"]);
      if (code !== 0) {
        return manifestOnlyCheck(installed);
      }
      const check = await checkOtaAvailable();
      return {
        ok: true,
        mode: "dry-run",
        updateAvailable: check.available,
        installed: check.installed,
        remote: check.latest,
        message: check.available
          ? `Update available: ${check.installed} → ${check.latest}`
          : `CurXor OS ${installed} is up to date`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("ENOENT") && !message.toLowerCase().includes("sudo")) {
        return {
          ok: false,
          mode: "dry-run",
          updateAvailable: false,
          installed,
          remote: null,
          message: "OTA check failed",
          error: message,
        };
      }
    }
  }

  return manifestOnlyCheck(installed);
}

export async function runOtaInstall(): Promise<OtaRunResult> {
  const installed = await readInstalledVersion();
  const manifest = await readOtaManifest();
  const remote = manifest?.version ?? null;

  if (!remote || !isNewerVersion(remote, installed)) {
    return {
      ok: false,
      mode: "apply",
      updateAvailable: false,
      installed,
      remote,
      message: "No update available to install",
      error: "nothing_to_apply",
    };
  }

  const updaterReady = await fileExecutable(getOtaUpdaterScript());
  if (!updaterReady) {
    return {
      ok: false,
      mode: "apply",
      updateAvailable: true,
      installed,
      remote,
      message: "OTA updater not available on this host",
      error: "updater_missing",
    };
  }

  const child = spawn("sudo", [getOtaUpdaterScript()], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return {
    ok: true,
    mode: "apply",
    updateAvailable: true,
    installed,
    remote,
    message: `Installing ${remote} — watch the live log below. Services will restart when complete.`,
  };
}
