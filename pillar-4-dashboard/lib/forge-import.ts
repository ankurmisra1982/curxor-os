import type { ForgeProvisioningMode } from "./forge-provisioning";
import type { AppWorkspaceFile } from "./agent-runtime/workspace-types";
import { isGrowthLevel, type GrowthLevel } from "./os-growth-level";

export const FORGE_IMPORT_BUNDLE_VERSION = 1 as const;

export type ForgeImportIntegration = "island" | "framework";

export interface ForgeImportBundle {
  version: typeof FORGE_IMPORT_BUNDLE_VERSION;
  name?: string;
  soul: string;
  tools: string;
  heartbeat?: string;
  freConfig?: Record<string, unknown>;
  integrationLevel?: ForgeImportIntegration;
  templateId?: string;
  growthLevel?: GrowthLevel;
}

export interface ParsedImportBundle {
  bundle: ForgeImportBundle;
  warnings: string[];
}

const URL_PATTERN = /https?:\/\/[^\s)>"']+/gi;
const SECRET_PATTERN = /(?:api[_-]?key|secret|token|password|bearer)\s*[:=]\s*\S+/gi;

function trimFile(content: string, max = 48_000): string {
  const t = content.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n<!-- truncated -->`;
}

export function parseImportBundle(raw: unknown): { ok: true; value: ParsedImportBundle } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Import must be a JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  const soul = typeof obj.soul === "string" ? trimFile(obj.soul) : null;
  const tools = typeof obj.tools === "string" ? trimFile(obj.tools) : null;
  if (!soul || soul.length < 8) return { ok: false, error: "soul is required (min 8 chars)" };
  if (!tools || tools.length < 8) return { ok: false, error: "tools is required (min 8 chars)" };

  const integrationLevel: ForgeImportIntegration =
    obj.integrationLevel === "framework" ? "framework" : "island";

  const bundle: ForgeImportBundle = {
    version: FORGE_IMPORT_BUNDLE_VERSION,
    name: typeof obj.name === "string" ? obj.name.trim().slice(0, 64) : undefined,
    soul,
    tools,
    heartbeat: typeof obj.heartbeat === "string" ? trimFile(obj.heartbeat) : undefined,
    freConfig: obj.freConfig && typeof obj.freConfig === "object" ? (obj.freConfig as Record<string, unknown>) : undefined,
    integrationLevel,
    templateId: typeof obj.templateId === "string" ? obj.templateId : undefined,
    growthLevel: isGrowthLevel(obj.growthLevel) ? obj.growthLevel : undefined,
  };

  return { ok: true, value: { bundle, warnings: scanImportWarnings(bundle) } };
}

export function scanImportWarnings(bundle: ForgeImportBundle): string[] {
  const warnings: string[] = [];
  const blob = [bundle.soul, bundle.tools, bundle.heartbeat ?? ""].join("\n");
  const urls = blob.match(URL_PATTERN) ?? [];
  if (urls.length > 0) {
    warnings.push(`${urls.length} outbound URL(s) detected — review before enabling bridges.`);
  }
  if (SECRET_PATTERN.test(blob)) {
    warnings.push("Possible secrets in bundle — rotate keys if this file was shared.");
  }
  if (blob.length > 32_000) {
    warnings.push("Large bundle — verify HEARTBEAT cadence will not overload scheduler.");
  }
  return warnings;
}

export function emptyImportBundleTemplate(): ForgeImportBundle {
  return {
    version: FORGE_IMPORT_BUNDLE_VERSION,
    name: "Imported Claw",
    soul: "# Imported Claw\n\nDescribe your agent purpose here.",
    tools: "# Tools\n\n- **plan** (plan): Plan next action",
    heartbeat: "# HEARTBEAT\n\n## Daily at 08:00\n- message:Morning check-in",
    integrationLevel: "framework",
    growthLevel: "L1",
  };
}

export function workspaceFilesFromBundle(bundle: ForgeImportBundle): Record<AppWorkspaceFile, string> {
  return {
    "SOUL.md": bundle.soul,
    "TOOLS.md": bundle.tools,
    "HEARTBEAT.md": bundle.heartbeat ?? "# HEARTBEAT\n\n## Daily\n- message:Check in",
  };
}

export function integrationToProvisioningMode(level: ForgeImportIntegration): ForgeProvisioningMode {
  return level === "framework" ? "framework" : "imported";
}
