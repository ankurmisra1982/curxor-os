import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isValidAppId, type OotbAppId } from "./ootb-apps";

export interface AppFreState {
  initialized: boolean;
  config: Record<string, unknown>;
  initializedAt: string | null;
}

const DEFAULT: AppFreState = {
  initialized: false,
  config: {},
  initializedAt: null,
};

function appFreDir(): string {
  return process.env.CURXOR_APP_FRE_DIR ?? "/etc/curxor/app-fre";
}

export function getAppFreDir(): string {
  return appFreDir();
}

export function getAppFrePath(appId: OotbAppId): string {
  return path.join(appFreDir(), `${appId}.json`);
}

export async function readAppFreState(appId: string): Promise<AppFreState> {
  if (!isValidAppId(appId)) return { ...DEFAULT };
  try {
    const raw = await readFile(getAppFrePath(appId), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppFreState>;
    return {
      initialized: Boolean(parsed.initialized),
      config: parsed.config && typeof parsed.config === "object" ? parsed.config : {},
      initializedAt: typeof parsed.initializedAt === "string" ? parsed.initializedAt : null,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export async function writeAppFreState(appId: OotbAppId, state: AppFreState): Promise<void> {
  const filePath = getAppFrePath(appId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o644 });
}

export async function markAppFreComplete(
  appId: OotbAppId,
  config: Record<string, unknown>,
): Promise<AppFreState> {
  const next: AppFreState = {
    initialized: true,
    config,
    initializedAt: new Date().toISOString(),
  };
  await writeAppFreState(appId, next);
  return next;
}
