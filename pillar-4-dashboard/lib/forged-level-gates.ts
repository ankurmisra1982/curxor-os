import type { ForgeTemplateId } from "./forge-templates";
import { isForgeTemplateId } from "./forge-templates";
import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type ForgedDeskSection = "mission" | "desk-panel" | "mesh" | "skills";

const SECTION_MIN: Record<ForgedDeskSection, GrowthLevel> = {
  mission: "L1",
  "desk-panel": "L1",
  mesh: "L2",
  skills: "L3",
};

const TEMPLATE_SECTIONS: Record<ForgeTemplateId, ForgedDeskSection[]> = {
  "blank-desk": ["mission", "desk-panel", "mesh", "skills"],
  "work-desk": ["mission", "desk-panel", "mesh", "skills"],
  "creator-desk": ["mission", "desk-panel", "mesh", "skills"],
  "capital-desk": ["mission", "desk-panel", "mesh", "skills"],
  "kiosk-desk": ["mission", "desk-panel", "mesh", "skills"],
};

export function forgedSectionsForTemplate(templateId: string): ForgedDeskSection[] {
  if (isForgeTemplateId(templateId)) return TEMPLATE_SECTIONS[templateId];
  return TEMPLATE_SECTIONS["blank-desk"];
}

export function forgedSectionVisible(
  growth: GrowthLevel,
  section: ForgedDeskSection,
  templateId: string,
): boolean {
  if (!forgedSectionsForTemplate(templateId).includes(section)) return false;
  return meetsGrowthLevel(growth, SECTION_MIN[section]);
}
