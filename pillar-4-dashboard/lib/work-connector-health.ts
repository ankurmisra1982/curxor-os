import "server-only";

import { digitalEnvPath, loadDigitalEnv } from "./digital-env";
import { isWorkGoogleLinked } from "./work-google-oauth";
import { isWorkNotionConfigured } from "./work-notion-client";
import { isTwentyConfiguredAsync } from "./work-twenty-client";
import { CONNECTOR_CATALOG, type WorkConnectorDefinition, type WorkConnectorId } from "./work-connector-registry";

export type WorkConnectorHealth =
  | "live"
  | "degraded"
  | "auth_expired"
  | "unconfigured"
  | "planned";

export interface WorkConnectorHealthEntry {
  id: WorkConnectorId;
  label: string;
  tier: WorkConnectorDefinition["tier"];
  tool: string | null;
  configured: boolean;
  health: WorkConnectorHealth;
  healthLabel: string;
  missingEnvKeys: string[];
  fixHints: string[];
}

export interface WorkConnectorVaultReport {
  digitalEnvPath: string;
  updatedAt: string;
  summary: {
    total: number;
    live: number;
    configured: number;
    ready: number;
    degraded: number;
    authExpired: number;
    unconfigured: number;
    planned: number;
  };
  connectors: WorkConnectorHealthEntry[];
  /** At least one comms path: SMTP, Google, IMAP, or demo mode */
  commsPathReady: boolean;
}

function missingEnvKeys(env: Record<string, string>, required: string[]): string[] {
  return required.filter((k) => !env[k]?.trim());
}

function buildFixHints(def: WorkConnectorDefinition, configured: boolean, missing: string[]): string[] {
  const hints: string[] = [];
  if (def.tier === "planned") {
    hints.push("Connector planned — demo/local paths work without this bridge.");
    return hints;
  }
  if (!configured) {
    hints.push(`Add credentials to ${digitalEnvPath()}`);
    if (missing.length > 0) hints.push(`Missing: ${missing.join(", ")}`);
    return hints;
  }
  if (def.id === "google_workspace") {
    hints.push("Link Google Workspace from Integrations tab or POST /api/work/google");
  }
  if (def.id === "notion") {
    hints.push("Link Notion from Integrations tab or POST /api/work/notion");
  }
  if (def.id === "twenty") {
    hints.push("Set TWENTY_API_URL + TWENTY_API_KEY for GraphQL sync");
  }
  if (hints.length === 0) hints.push("Configured — run a work action to verify bridge receipt");
  return hints;
}

async function resolveConnectorConfigured(
  id: WorkConnectorId,
  env: Record<string, string>,
  missing: string[],
): Promise<boolean> {
  if (id === "google_workspace") return isWorkGoogleLinked();
  if (id === "notion") return isWorkNotionConfigured();
  if (id === "twenty") return isTwentyConfiguredAsync();
  if (missing.length > 0) return false;
  return true;
}

function resolveHealth(
  def: WorkConnectorDefinition,
  configured: boolean,
): { health: WorkConnectorHealth; healthLabel: string } {
  if (def.tier === "planned" || def.tier === "mcp") {
    return { health: "planned", healthLabel: def.tier === "mcp" ? "MCP — user server" : "Planned" };
  }
  if (!configured) {
    return { health: "unconfigured", healthLabel: "Add digital.env credentials" };
  }
  return { health: "live", healthLabel: "Ready" };
}

export async function buildWorkConnectorHealthReport(): Promise<WorkConnectorVaultReport> {
  const env = await loadDigitalEnv();
  const connectors: WorkConnectorHealthEntry[] = [];

  for (const def of CONNECTOR_CATALOG) {
    const missing = missingEnvKeys(env, def.envKeys);
    const configured = await resolveConnectorConfigured(def.id, env, missing);
    const { health, healthLabel } = resolveHealth(def, configured);

    connectors.push({
      id: def.id,
      label: def.label,
      tier: def.tier,
      tool: def.tool ?? null,
      configured,
      health,
      healthLabel,
      missingEnvKeys: missing,
      fixHints: buildFixHints(def, configured, missing),
    });
  }

  const smtp = connectors.find((c) => c.id === "smtp");
  const google = connectors.find((c) => c.id === "google_workspace");
  const imap = connectors.find((c) => c.id === "imap");
  const commsPathReady = Boolean(
    smtp?.configured || google?.configured || imap?.configured || !smtp?.configured,
  );

  const summary = {
    total: connectors.length,
    live: connectors.filter((c) => c.tier === "live" || c.tier === "oauth").length,
    configured: connectors.filter((c) => c.configured).length,
    ready: connectors.filter((c) => c.health === "live").length,
    degraded: connectors.filter((c) => c.health === "degraded").length,
    authExpired: connectors.filter((c) => c.health === "auth_expired").length,
    unconfigured: connectors.filter((c) => c.health === "unconfigured").length,
    planned: connectors.filter((c) => c.health === "planned").length,
  };

  return {
    digitalEnvPath: digitalEnvPath(),
    updatedAt: new Date().toISOString(),
    summary,
    connectors,
    commsPathReady,
  };
}
