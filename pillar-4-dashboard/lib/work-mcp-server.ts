import "server-only";

import { appendAgentAudit } from "./work-agent-audit";
import { buildWorkGoLiveReport } from "./work-go-live";
import { draftSequenceWithLlm } from "./work-inference";
import { buildMorningBrief } from "./work-morning-brief";
import { getCrmStatus, syncCrmBothWays } from "./work-crm-sync";
import { ensureWorkQueue, fetchWorkStatus } from "./work-store";

export interface McpToolDef {
  name: string;
  description: string;
  safety: "read" | "write" | "execute";
  inputSchema: Record<string, unknown>;
}

export const WORK_MCP_TOOLS: McpToolDef[] = [
  {
    name: "get_desk_status",
    description: "Outreach desk status — leads, sequences, sends, kill switch",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_leads",
    description: "List CRM leads with optional stage filter",
    safety: "read",
    inputSchema: {
      type: "object",
      properties: { stage: { type: "string" }, limit: { type: "number" } },
    },
  },
  {
    name: "draft_sequence_preview",
    description: "Preview LLM-drafted sequence for a lead (does not activate)",
    safety: "read",
    inputSchema: {
      type: "object",
      properties: { leadId: { type: "string" }, prompt: { type: "string" } },
    },
  },
  {
    name: "morning_brief",
    description: "Mail + calendar + tasks morning summary",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "crm_status",
    description: "CRM backend status — local or Twenty",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sync_crm",
    description: "Bidirectional CRM sync — requires confirm for writes",
    safety: "execute",
    inputSchema: {
      type: "object",
      properties: { confirm: { type: "boolean" } },
      required: ["confirm"],
    },
  },
];

export async function invokeWorkMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; content: unknown; error?: string }> {
  await appendAgentAudit({
    kind: "mcp",
    source: "mcp",
    tool: name,
    note: `MCP tools/call · ${name}`,
  });

  try {
    switch (name) {
      case "get_desk_status": {
        const status = await fetchWorkStatus();
        const goLive = await buildWorkGoLiveReport();
        return {
          ok: true,
          content: {
            source: status.source,
            outboundKillSwitch: status.outboundKillSwitch,
            stats: status.stats,
            goLive: { demoReady: goLive.demoReady, liveReady: goLive.liveReady },
          },
        };
      }
      case "list_leads": {
        const file = await ensureWorkQueue();
        const stage = typeof args.stage === "string" ? args.stage : null;
        const limit = typeof args.limit === "number" ? args.limit : 50;
        let leads = file.leads;
        if (stage) leads = leads.filter((l) => l.stage === stage);
        return { ok: true, content: leads.slice(0, limit) };
      }
      case "draft_sequence_preview": {
        const leadId = typeof args.leadId === "string" ? args.leadId : undefined;
        const prompt = typeof args.prompt === "string" ? args.prompt : undefined;
        const draft = await draftSequenceWithLlm({ leadId, prompt, name: "MCP preview" });
        const file = await ensureWorkQueue();
        const seq = file.sequences.find((s) => s.id === draft.sequenceId);
        return { ok: true, content: { sequenceId: draft.sequenceId, steps: seq?.steps ?? [] } };
      }
      case "morning_brief": {
        const brief = await buildMorningBrief();
        return { ok: true, content: { brief } };
      }
      case "crm_status": {
        return { ok: true, content: await getCrmStatus() };
      }
      case "sync_crm": {
        if (args.confirm !== true) {
          return { ok: false, content: null, error: "Set confirm:true after reviewing sync impact" };
        }
        const sync = await syncCrmBothWays();
        await appendAgentAudit({ kind: "sync", source: "mcp", note: "sync_crm via MCP" });
        return { ok: true, content: sync };
      }
      default:
        return { ok: false, content: null, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    return { ok: false, content: null, error: message };
  }
}

export function workMcpToolList(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
  return WORK_MCP_TOOLS.map((t) => ({
    name: t.name,
    description: `[${t.safety}] ${t.description}`,
    inputSchema: t.inputSchema,
  }));
}
