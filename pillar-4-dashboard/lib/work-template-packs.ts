import "server-only";

import { randomUUID } from "node:crypto";

import { getTemplatePack } from "./work-template-packs-data";
import { createTask, ensureWorkQueue, writeWorkFilePartial } from "./work-store";

export {
  WORK_TEMPLATE_PACKS,
  defaultTemplatePackForGrowth,
  getTemplatePack,
  listTemplatePacksForGrowth,
  MINI_SEQUENCE_PRESETS,
} from "./work-template-packs-data";
export type { WorkTemplateItem, WorkTemplatePack, WorkTemplate, MiniSequencePreset } from "./work-template-packs-data";

export interface ApplyTemplatePackResult {
  packId: string;
  tasksCreated: number;
}

/** Seed template reminder tasks from a pack (idempotent per pack). */
export async function applyTemplatePack(packId: string): Promise<ApplyTemplatePackResult> {
  const pack = getTemplatePack(packId);
  if (!pack) throw new Error(`Unknown template pack: ${packId}`);

  const file = await ensureWorkQueue();
  const existing = file.tasks.filter((t) => t.title.includes(`[${pack.label}]`));
  if (existing.length >= pack.templates.length) {
    return { packId, tasksCreated: 0 };
  }

  let created = 0;
  for (const tpl of pack.templates) {
    const dup = file.tasks.some((t) => t.title === `[${pack.label}] ${tpl.title}`);
    if (dup) continue;
    await createTask(`[${pack.label}] ${tpl.title}`, "P2", undefined);
    created += 1;
  }

  return { packId, tasksCreated: created };
}

export async function seedNonprofitPresetIfEmpty(): Promise<number> {
  const file = await ensureWorkQueue();
  if (file.leads.length > 0) return 0;

  const now = new Date().toISOString();
  const leads = [
    {
      id: `LEAD-${randomUUID().slice(0, 8)}`,
      name: "Volunteer Coordinator",
      email: "volunteer@community.org",
      company: "Community Org",
      title: "Programs",
      stage: "new" as const,
      tags: ["nonprofit", "volunteer"],
      notes: "Met at town hall — interested in volunteer shifts.",
      source: "fre-seed",
      createdAt: now,
      updatedAt: now,
      lastTouchAt: null,
    },
    {
      id: `LEAD-${randomUUID().slice(0, 8)}`,
      name: "Donor Prospect",
      email: "donor@example.org",
      company: "Local Foundation",
      title: "Director",
      stage: "contacted" as const,
      tags: ["nonprofit", "donor"],
      notes: "Event invite sent.",
      source: "fre-seed",
      createdAt: now,
      updatedAt: now,
      lastTouchAt: now,
    },
  ];

  file.leads.push(...leads);
  await writeWorkFilePartial(file);
  return leads.length;
}
