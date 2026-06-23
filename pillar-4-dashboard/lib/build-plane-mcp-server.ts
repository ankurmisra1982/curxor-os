import "server-only";

import { buildBuildStatus } from "./build-plane-status";
import { readBridgeCcpSummary, assertBuildPlaneMcpAccess, BuildPlaneAccessError } from "./build-plane-bridge-policy";
import { buildCafeAscensionBootstrap } from "./claw-cafe-events";
import { readClawProfiles } from "./claw-profiles";
import { fetchCapitalStatus } from "./capital-store";
import { readForgedApps } from "./forged-apps-store";
import { fetchWorkStatus } from "./work-store";
import { readUserSettings } from "./user-settings";
import type { BuildPlaneSettings } from "./user-settings-types";

export interface BuildMcpToolDef {
  name: string;
  description: string;
  safety: "read" | "write";
  inputSchema: Record<string, unknown>;
}

export const BUILD_PLANE_MCP_TOOLS: BuildMcpToolDef[] = [
  {
    name: "get_build_status",
    description: "Sanitized Build Plane link state (enabled, linkStatus, workerStatus, bridgeLinked)",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_ccp_summary",
    description: "Read-only Claw Context Protocol mesh summary for bridge consumers",
    safety: "read",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max records (default 32, max 64)" } },
    },
  },
  {
    name: "get_cafe_snapshot",
    description: "Claw Cafe ascension tier, recent events, and room character states",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_forge_fleet",
    description: "Forged apps registry and linked claw profiles (Forge mints)",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_desk_status",
    description: "Bootstrap status for Work, Capital, or Creator desk",
    safety: "read",
    inputSchema: {
      type: "object",
      properties: {
        desk: { type: "string", enum: ["work", "capital", "creator"] },
      },
      required: ["desk"],
    },
  },
];

export function buildPlaneMcpToolList(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  return BUILD_PLANE_MCP_TOOLS.map((t) => ({
    name: t.name,
    description: `[${t.safety}] ${t.description}`,
    inputSchema: t.inputSchema,
  }));
}

async function requireBuildPlane(): Promise<BuildPlaneSettings> {
  const settings = await readUserSettings();
  assertBuildPlaneMcpAccess(settings.buildPlane);
  return settings.buildPlane;
}

export async function invokeBuildPlaneMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; content: unknown } | { ok: false; error: string }> {
  try {
    await requireBuildPlane();
  } catch (err) {
    const message = err instanceof BuildPlaneAccessError ? err.message : "Build Plane access denied";
    return { ok: false, error: message };
  }

  const tool = BUILD_PLANE_MCP_TOOLS.find((t) => t.name === name);
  if (!tool) return { ok: false, error: `Unknown tool: ${name}` };
  if (tool.safety === "write") {
    const settings = await readUserSettings();
    const { assertBridgeWriteAllowed } = await import("./build-plane-bridge-policy");
    try {
      assertBridgeWriteAllowed(settings.buildPlane);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Write denied" };
    }
  }

  try {
    switch (name) {
      case "get_build_status":
        return { ok: true, content: await buildBuildStatus() };

      case "get_ccp_summary": {
        const limit = Math.min(64, Math.max(1, Number(args.limit) || 32));
        return { ok: true, content: { records: await readBridgeCcpSummary(limit) } };
      }

      case "get_cafe_snapshot": {
        const snap = await buildCafeAscensionBootstrap({ autoSync: false });
        return {
          ok: true,
          content: {
            optOut: snap.optOut,
            bridgeLinked: snap.bridgeLinked,
            ascension: snap.ascension,
            epithet: snap.epithet,
            eventCount: snap.events.length,
            events: snap.events.slice(0, 12),
            characters: snap.characters.map((c) => ({
              appId: c.appId,
              label: c.label,
              station: c.station,
              state: c.state,
              needsApproval: c.needsApproval ?? false,
            })),
          },
        };
      }

      case "get_forge_fleet": {
        const [forged, profiles] = await Promise.all([readForgedApps(), readClawProfiles()]);
        return {
          ok: true,
          content: {
            forgedApps: forged.apps.map((a) => ({
              id: a.id,
              slug: a.slug,
              name: a.name,
              templateId: a.templateId,
              provisioningMode: a.provisioningMode,
            })),
            clawProfiles: profiles.claws.map((p) => ({
              id: p.id,
              name: p.name,
              forgedAppId: p.forgedAppId ?? null,
              provisioningMode: p.provisioningMode,
            })),
          },
        };
      }

      case "get_desk_status": {
        const desk = String(args.desk ?? "").toLowerCase();
        if (desk === "work") {
          const status = await fetchWorkStatus();
          return {
            ok: true,
            content: {
              desk: "work",
              leads: status.leads.length,
              sends: status.sends.length,
              pendingApprovals: status.sends.filter((s) => s.status === "pending_approval").length,
              growthLevel: status.growthProfile?.growthLevel ?? null,
              source: status.source,
            },
          };
        }
        if (desk === "capital") {
          const status = await fetchCapitalStatus({ sync: false });
          return {
            ok: true,
            content: {
              desk: "capital",
              rules: status.rules.length,
              armedRules: status.rules.filter((r) => r.state === "ARMED").length,
              pendingTrades: status.trades.filter((t) => t.status === "pending_approval").length,
              portfolioValueUsd: status.portfolioValue,
              autonomousMode: status.permissions.autonomousMode,
            },
          };
        }
        if (desk === "creator") {
          const { ensureContentQueue } = await import("./content-queue-store");
          const file = await ensureContentQueue();
          return {
            ok: true,
            content: {
              desk: "creator",
              posts: file.posts.length,
              scheduled: file.posts.filter((p) => p.stage === "SCHEDULED").length,
              pendingPublish: file.posts.filter((p) => Boolean(p.approvalRequestedAt)).length,
            },
          };
        }
        return { ok: false, error: "desk must be work, capital, or creator" };
      }

      default:
        return { ok: false, error: `Tool not implemented: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
