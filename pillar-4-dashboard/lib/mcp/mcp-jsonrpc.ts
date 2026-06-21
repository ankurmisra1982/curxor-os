import "server-only";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

function normalizeMcpUrl(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  if (trimmed.endsWith("/mcp") || trimmed.endsWith("/sse")) return trimmed;
  return `${trimmed}/mcp`;
}

export async function mcpJsonRpcCall(
  baseUrl: string,
  method: string,
  params?: Record<string, unknown>,
  timeoutMs = 3_000,
): Promise<JsonRpcResponse> {
  const url = normalizeMcpUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) throw new Error("Empty SSE response");
      return JSON.parse(dataLine.slice(5).trim()) as JsonRpcResponse;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    return (await res.json()) as JsonRpcResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function mcpInitialize(
  baseUrl: string,
  timeoutMs = 3_000,
): Promise<{ ok: boolean; serverInfo?: string; error?: string }> {
  try {
    const init = await mcpJsonRpcCall(
      baseUrl,
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "curxor-os", version: "0.2.0" },
      },
      timeoutMs,
    );
    if (init.error) return { ok: false, error: init.error.message };

    await mcpJsonRpcCall(baseUrl, "notifications/initialized", {}).catch(() => undefined);

    const info = init.result as { serverInfo?: { name?: string; version?: string } } | undefined;
    const label = info?.serverInfo
      ? `${info.serverInfo.name ?? "mcp"}@${info.serverInfo.version ?? "?"}`
      : "connected";
    return { ok: true, serverInfo: label };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function mcpListTools(baseUrl: string, timeoutMs = 3_000): Promise<McpToolInfo[]> {
  const init = await mcpInitialize(baseUrl, timeoutMs);
  if (!init.ok) return [];

  const res = await mcpJsonRpcCall(baseUrl, "tools/list", {}, timeoutMs);
  if (res.error || !res.result) return [];

  const tools = (res.result as { tools?: McpToolInfo[] }).tools;
  return Array.isArray(tools) ? tools : [];
}

export async function mcpCallTool(
  baseUrl: string,
  name: string,
  args: Record<string, unknown>,
  timeoutMs = 3_000,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const init = await mcpInitialize(baseUrl, timeoutMs);
  if (!init.ok) return { ok: false, error: init.error ?? "initialize failed" };

  const res = await mcpJsonRpcCall(baseUrl, "tools/call", { name, arguments: args }, timeoutMs);
  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true, result: res.result };
}
