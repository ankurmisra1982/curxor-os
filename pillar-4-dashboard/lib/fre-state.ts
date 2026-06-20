import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isValidAppId, type OotbAppId } from "./ootb-apps";

export type { OotbAppId } from "./ootb-apps";
export { OOTB_APPS, isValidAppId } from "./ootb-apps";

export interface FreState {
  initialized: boolean;
  selectedApps: string[];
  provisionedAt: string | null;
}

const DEFAULT_STATE: FreState = {
  initialized: false,
  selectedApps: [],
  provisionedAt: null,
};

export function getFreStatePath(): string {
  return process.env.CURXOR_FRE_STATE_PATH ?? "/etc/curxor/fre-state.json";
}

export async function readFreState(): Promise<FreState> {
  const filePath = getFreStatePath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FreState>;
    return {
      initialized: Boolean(parsed.initialized),
      selectedApps: Array.isArray(parsed.selectedApps) ? parsed.selectedApps : [],
      provisionedAt: typeof parsed.provisionedAt === "string" ? parsed.provisionedAt : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function writeFreState(state: FreState): Promise<void> {
  const filePath = getFreStatePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o644 });
}

export async function isFreInitialized(): Promise<boolean> {
  const state = await readFreState();
  return state.initialized === true;
}

export async function markFreProvisioned(selectedApps: OotbAppId[]): Promise<FreState> {
  const next: FreState = {
    initialized: true,
    selectedApps,
    provisionedAt: new Date().toISOString(),
  };
  await writeFreState(next);
  return next;
}

export function validateAppIds(ids: string[]): OotbAppId[] {
  return ids.filter(isValidAppId);
}
