import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { readAppFreState, writeAppFreState } from "./app-fre-state";
import {
  DEFAULT_CONTENT_TEMPLATES,
  parseContentTemplates,
  type ContentTemplate,
} from "./content-templates";

function templatesPath(): string {
  return process.env.CURXOR_CONTENT_TEMPLATES_PATH ?? "/etc/curxor/content-templates.json";
}

async function readCustomFile(): Promise<ContentTemplate[]> {
  try {
    const raw = await readFile(templatesPath(), "utf8");
    const parsed = JSON.parse(raw) as { templates?: unknown };
    return parseContentTemplates(parsed.templates);
  } catch {
    return [];
  }
}

async function writeCustomFile(templates: ContentTemplate[]): Promise<void> {
  const filePath = templatesPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify({ version: 1, templates, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o640 },
  );
}

export async function listAllContentTemplates(): Promise<ContentTemplate[]> {
  const fre = await readAppFreState("my-content-creator");
  const fromFre = parseContentTemplates(fre.config.contentTemplates);
  const custom = await readCustomFile();
  const byId = new Map<string, ContentTemplate>();
  for (const t of DEFAULT_CONTENT_TEMPLATES) byId.set(t.id, t);
  for (const t of fromFre) byId.set(t.id, t);
  for (const t of custom) byId.set(t.id, t);
  return [...byId.values()];
}

export async function saveContentTemplate(
  input: Omit<ContentTemplate, "id"> & { id?: string },
): Promise<ContentTemplate> {
  const templates = await readCustomFile();
  const template: ContentTemplate = {
    id: input.id?.trim() || `tpl-${randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    tone: input.tone,
    platforms: input.platforms,
    format: input.format,
    draftSeed: input.draftSeed,
    brandHashtags: input.brandHashtags,
  };
  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) templates[idx] = template;
  else templates.unshift(template);
  await writeCustomFile(templates.slice(0, 64));
  return template;
}

export async function deleteContentTemplate(id: string): Promise<boolean> {
  const templates = await readCustomFile();
  const next = templates.filter((t) => t.id !== id);
  if (next.length === templates.length) return false;
  await writeCustomFile(next);
  return true;
}

export async function updateBrandKitConfig(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const fre = await readAppFreState("my-content-creator");
  const current =
    typeof fre.config.brandKit === "object" && fre.config.brandKit !== null
      ? (fre.config.brandKit as Record<string, unknown>)
      : {};
  const brandKit = { ...current, ...patch };
  await writeAppFreState("my-content-creator", {
    ...fre,
    config: { ...fre.config, brandKit },
  });
  return brandKit;
}
