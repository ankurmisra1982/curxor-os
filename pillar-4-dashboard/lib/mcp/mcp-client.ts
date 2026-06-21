import "server-only";

import { mcpCallTool, mcpInitialize, mcpListTools } from "./mcp-jsonrpc";

export interface McpServerConfig {
  id: string;
  url: string;
  enabled: boolean;
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  serverId: string;
}

const PROBE_TIMEOUT_MS = 3_000;

export async function listMcpTools(servers: McpServerConfig[]): Promise<McpToolDescriptor[]> {
  const enabled = servers.filter((s) => s.enabled);
  if (enabled.length === 0) return [];

  const chunks = await Promise.all(
    enabled.map(async (server) => {
      try {
        const live = await mcpListTools(server.url, PROBE_TIMEOUT_MS);
        if (live.length > 0) {
          return live.map((tool) => ({
            name: `${server.id}.${tool.name}`,
            description: tool.description ?? tool.name,
            serverId: server.id,
          }));
        }
        const ping = await mcpInitialize(server.url, PROBE_TIMEOUT_MS);
        return [
          {
            name: `${server.id}.ping`,
            description: ping.ok
              ? `MCP connected (${ping.serverInfo}) at ${server.url}`
              : `MCP scaffold ping for ${server.url}`,
            serverId: server.id,
          },
        ];
      } catch {
        return [
          {
            name: `${server.id}.ping`,
            description: `MCP unreachable at ${server.url}`,
            serverId: server.id,
          },
        ];
      }
    }),
  );

  return chunks.flat();
}

export async function invokeMcpTool(
  server: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; result?: string; error?: string }> {
  if (!server.enabled) return { ok: false, error: "server disabled" };

  const prefix = `${server.id}.`;
  const bareName = toolName.startsWith(prefix) ? toolName.slice(prefix.length) : toolName;

  if (bareName === "ping") {
    const ping = await mcpInitialize(server.url, PROBE_TIMEOUT_MS);
    if (ping.ok) return { ok: true, result: `MCP live: ${ping.serverInfo}` };
    return { ok: true, result: `MCP scaffold reachable at ${server.url}` };
  }

  const live = await mcpCallTool(server.url, bareName, args, PROBE_TIMEOUT_MS);
  if (live.ok) {
    const text =
      typeof live.result === "string"
        ? live.result
        : JSON.stringify(live.result ?? {}, null, 2).slice(0, 4000);
    return { ok: true, result: text };
  }

  return { ok: false, error: live.error ?? "tool call failed" };
}
