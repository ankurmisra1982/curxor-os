import "server-only";

import { mcpInitialize, mcpListTools } from "./mcp/mcp-jsonrpc";
import { getFirecrawlConfig } from "./firecrawl-config";
import { loadDigitalEnv } from "./digital-env";
import { readUserSettings, updateUserSettings } from "./user-settings";

export const FIRECRAWL_MCP_SERVER_ID = "firecrawl";

export function buildFirecrawlMcpUrl(apiKey: string): string {
  const key = apiKey.trim();
  if (!key) return "https://mcp.firecrawl.dev/v2/mcp";
  return `https://mcp.firecrawl.dev/${encodeURIComponent(key)}/v2/mcp`;
}

export async function probeFirecrawlMcp(): Promise<{
  ok: boolean;
  configured: boolean;
  url: string | null;
  toolCount: number;
  serverInfo: string | null;
  detail: string;
}> {
  const config = await getFirecrawlConfig();
  if (!config.configured) {
    return {
      ok: false,
      configured: false,
      url: null,
      toolCount: 0,
      serverInfo: null,
      detail: "Set FIRECRAWL_API_KEY in digital.env to register outbound MCP",
    };
  }

  const env = await loadDigitalEnv();
  const url = buildFirecrawlMcpUrl(env.FIRECRAWL_API_KEY ?? "");
  const tools = await mcpListTools(url, 5_000);
  if (tools.length > 0) {
    return {
      ok: true,
      configured: true,
      url,
      toolCount: tools.length,
      serverInfo: tools.map((t) => t.name).slice(0, 5).join(", "),
      detail: `${tools.length} MCP tools live at Firecrawl`,
    };
  }

  const ping = await mcpInitialize(url, 5_000);
  return {
    ok: ping.ok,
    configured: true,
    url,
    toolCount: 0,
    serverInfo: ping.serverInfo ?? null,
    detail: ping.ok
      ? `MCP handshake OK (${ping.serverInfo ?? "firecrawl"})`
      : "Firecrawl MCP unreachable — check API key and egress",
  };
}

export async function registerFirecrawlMcpServer(): Promise<{
  ok: boolean;
  registered: boolean;
  url: string | null;
  mcpEnabled: boolean;
  detail: string;
}> {
  const config = await getFirecrawlConfig();
  if (!config.configured) {
    return {
      ok: false,
      registered: false,
      url: null,
      mcpEnabled: false,
      detail: "Set FIRECRAWL_API_KEY before registering Firecrawl MCP",
    };
  }

  const env = await loadDigitalEnv();
  const url = buildFirecrawlMcpUrl(env.FIRECRAWL_API_KEY ?? "");
  const settings = await readUserSettings();
  const servers = settings.mcp.servers.filter((s) => s.id !== FIRECRAWL_MCP_SERVER_ID);
  servers.push({ id: FIRECRAWL_MCP_SERVER_ID, url, enabled: true });

  const allowHosts = new Set(settings.egress.allowHosts ?? []);
  allowHosts.add("mcp.firecrawl.dev");
  allowHosts.add("api.firecrawl.dev");

  await updateUserSettings({
    mcp: { enabled: true, servers },
    egress: { allowHosts: [...allowHosts] },
  });

  const probe = await probeFirecrawlMcp();
  return {
    ok: true,
    registered: true,
    url,
    mcpEnabled: true,
    detail: probe.detail,
  };
}
