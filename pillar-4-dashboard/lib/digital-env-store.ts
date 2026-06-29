import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { digitalEnvPath, invalidateDigitalEnvCache } from "./digital-env";

function escapeEnvValue(value: string): string {
  const trimmed = value.trim();
  if (/[\s#"'\\]/.test(trimmed)) {
    return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return trimmed;
}

/** Merge key/value pairs into digital.env (create or update lines). */
export async function writeDigitalEnvVars(updates: Record<string, string>): Promise<void> {
  const filePath = digitalEnvPath();
  const keys = Object.keys(updates).filter((k) => updates[k]?.trim());
  if (keys.length === 0) return;

  let lines: string[] = [];
  try {
    const raw = await readFile(filePath, "utf8");
    lines = raw.split("\n");
  } catch {
    lines = ["# CurXor connection settings — managed from Flight Command"];
  }

  const pending = new Map(keys.map((k) => [k, updates[k]!.trim()]));
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    if (pending.has(key)) {
      out.push(`${key}=${escapeEnvValue(pending.get(key)!)}`);
      pending.delete(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, val] of pending) {
    out.push(`${key}=${escapeEnvValue(val)}`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${out.join("\n").trimEnd()}\n`, { mode: 0o640 });
  invalidateDigitalEnvCache();
}
