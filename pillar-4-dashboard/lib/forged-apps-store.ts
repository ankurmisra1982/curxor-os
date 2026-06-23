import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ForgedAppRecord, ForgedAppsState } from "./forged-apps-types";
import { forgedAppHref, forgedAppIdFromSlug, slugFromForgedAppId, isForgedAppId } from "./workspace-app-id";

const DEFAULT: ForgedAppsState = { apps: [] };

export function getForgedAppsPath(): string {
  return process.env.CURXOR_FORGED_APPS_PATH ?? "/etc/curxor/forged-apps.json";
}

export async function readForgedApps(): Promise<ForgedAppsState> {
  try {
    const raw = await readFile(getForgedAppsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ForgedAppsState>;
    const apps = Array.isArray(parsed.apps)
      ? parsed.apps.filter((a): a is ForgedAppRecord => typeof a?.slug === "string")
      : [];
    return { apps };
  } catch {
    return { ...DEFAULT };
  }
}

export async function writeForgedApps(state: ForgedAppsState): Promise<void> {
  const filePath = getForgedAppsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o644 });
}

export async function getForgedAppBySlug(slug: string): Promise<ForgedAppRecord | null> {
  const state = await readForgedApps();
  return state.apps.find((a) => a.slug === slug) ?? null;
}

export async function getForgedAppById(id: string): Promise<ForgedAppRecord | null> {
  const state = await readForgedApps();
  return state.apps.find((a) => a.id === id) ?? null;
}

export function uniqueSlug(base: string, existing: string[]): string {
  let slug = base;
  let n = 2;
  while (existing.includes(slug)) {
    slug = `${base.slice(0, 28)}-${n}`;
    n++;
  }
  return slug;
}

export async function addForgedApp(
  input: Omit<ForgedAppRecord, "id" | "href" | "createdAt"> & { slug?: string },
): Promise<ForgedAppRecord> {
  const state = await readForgedApps();
  const existingSlugs = state.apps.map((a) => a.slug);
  const slug = uniqueSlug(input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-"), existingSlugs);
  const id = forgedAppIdFromSlug(slug);
  const record: ForgedAppRecord = {
    ...input,
    id,
    slug,
    href: forgedAppHref(slug),
    createdAt: new Date().toISOString(),
  };
  await writeForgedApps({ apps: [...state.apps, record] });
  return record;
}

export async function patchForgedApp(
  id: string,
  patch: Partial<ForgedAppRecord>,
): Promise<ForgedAppRecord | null> {
  const state = await readForgedApps();
  const idx = state.apps.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  state.apps[idx] = { ...state.apps[idx]!, ...patch };
  await writeForgedApps(state);
  return state.apps[idx]!;
}

export async function registerForgedAppSlug(slug: string): Promise<boolean> {
  const state = await readForgedApps();
  return state.apps.some((a) => a.slug === slug);
}

export function resolveForgedAppFromPath(pathname: string): ForgedAppRecord | null {
  void pathname;
  return null;
}

export async function resolveForgedAppFromPathname(pathname: string): Promise<ForgedAppRecord | null> {
  const match = pathname.match(/^\/my-claw\/([a-z0-9-]+)/);
  if (!match?.[1]) return null;
  return getForgedAppBySlug(match[1]);
}

export { isForgedAppId, slugFromForgedAppId };
