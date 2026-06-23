import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getAppFreDir } from "./app-fre-state";
import { isForgedAppId } from "./workspace-app-id";

export interface ForgedAppFreState {
  initialized: boolean;
  config: Record<string, unknown>;
  initializedAt: string | null;
}

const DEFAULT: ForgedAppFreState = {
  initialized: false,
  config: {},
  initializedAt: null,
};

export function forgedFrePath(appId: string): string {
  return path.join(getAppFreDir(), `${appId}.json`);
}

export async function readForgedAppFre(appId: string): Promise<ForgedAppFreState> {
  if (!isForgedAppId(appId)) return { ...DEFAULT };
  try {
    const raw = await readFile(forgedFrePath(appId), "utf8");
    const parsed = JSON.parse(raw) as Partial<ForgedAppFreState>;
    return {
      initialized: Boolean(parsed.initialized),
      config: parsed.config && typeof parsed.config === "object" ? parsed.config : {},
      initializedAt: typeof parsed.initializedAt === "string" ? parsed.initializedAt : null,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export async function writeForgedAppFre(appId: string, state: ForgedAppFreState): Promise<void> {
  const filePath = forgedFrePath(appId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o644 });
}

export async function markForgedAppFreComplete(
  appId: string,
  config: Record<string, unknown>,
): Promise<ForgedAppFreState> {
  const next: ForgedAppFreState = {
    initialized: true,
    config,
    initializedAt: new Date().toISOString(),
  };
  await writeForgedAppFre(appId, next);
  return next;
}
