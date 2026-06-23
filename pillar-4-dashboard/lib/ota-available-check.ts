import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { curxorDataPath } from "./curxor-data-dir";
import { emitOsEvent } from "./os-event-bus";
import { hasRecentOsEvent } from "./os-event-log-store";

interface VersionManifest {
  version?: string;
  channel?: string;
  released?: string;
}

function repoRootFromDashboard(): string {
  return path.resolve(process.cwd(), "..");
}

function parseVersionParts(v: string): number[] {
  return v
    .replace(/^v/i, "")
    .split(".")
    .map((p) => parseInt(p.replace(/[^0-9].*$/, ""), 10) || 0);
}

export function isNewerVersion(candidate: string, installed: string): boolean {
  const a = parseVersionParts(candidate);
  const b = parseVersionParts(installed);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readInstalledVersion(): Promise<string> {
  const explicit = process.env.CURXOR_INSTALLED_VERSION_PATH?.trim();
  const candidates = [
    explicit,
    path.join(repoRootFromDashboard(), "version.json"),
    path.join(process.cwd(), "version.json"),
  ].filter(Boolean) as string[];

  for (const filePath of candidates) {
    const manifest = await readJsonFile<VersionManifest>(filePath);
    if (manifest?.version) return manifest.version;
  }
  return "0.0.0";
}

export async function readOtaManifest(): Promise<VersionManifest | null> {
  const explicit = process.env.CURXOR_OTA_MANIFEST_PATH?.trim();
  const candidates = [
    explicit,
    path.join(repoRootFromDashboard(), "config/ota/mock-release/version.json"),
    path.join(process.cwd(), "config/ota/mock-release/version.json"),
  ].filter(Boolean) as string[];

  for (const filePath of candidates) {
    const manifest = await readJsonFile<VersionManifest>(filePath);
    if (manifest?.version) return manifest;
  }
  return null;
}

export async function checkOtaAvailable(): Promise<{
  available: boolean;
  installed: string;
  latest: string | null;
  emitted: boolean;
}> {
  const [installed, manifest] = await Promise.all([readInstalledVersion(), readOtaManifest()]);
  const latest = manifest?.version ?? null;
  const available = Boolean(latest && isNewerVersion(latest, installed));

  let emitted = false;
  if (available && latest) {
    const dedupeKey = `ota:${latest}`;
    if (!(await hasRecentOsEvent("ota.available", dedupeKey, 7 * 24 * 60 * 60 * 1000))) {
      await emitOsEvent("ota.available", {
        dedupeKey,
        installed,
        latest,
        channel: manifest?.channel ?? "stable",
        released: manifest?.released ?? null,
      });
      emitted = true;
    }
  }

  const statePath = curxorDataPath("ota-check-state.json");
  await writeFile(
    statePath,
    `${JSON.stringify({ installed, latest, available, checkedAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o640 },
  ).catch(() => undefined);

  return { available, installed, latest, emitted };
}
