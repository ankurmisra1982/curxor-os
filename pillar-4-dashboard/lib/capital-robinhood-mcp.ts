import "server-only";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { loadDigitalEnv } from "./digital-env";

const MCP_URL = "https://agent.robinhood.com/mcp/trading";

export interface RobinhoodMcpState {
  connected: boolean;
  connectedAt: string | null;
  accountLabel: string | null;
  note: string;
}

function oauthPath(): string {
  return (
    process.env.CURXOR_CAPITAL_ROBINHOOD_MCP_PATH?.trim() ||
    "/etc/curxor/capital-robinhood-mcp.json"
  );
}

export async function readRobinhoodMcpState(): Promise<RobinhoodMcpState> {
  const enabled = await isRobinhoodMcpEnabled();
  if (!enabled) {
    return {
      connected: false,
      connectedAt: null,
      accountLabel: null,
      note: "Set ROBINHOOD_MCP_ENABLED=1 and complete OAuth via Robinhood Agentic desktop flow",
    };
  }
  try {
    const raw = await readFile(oauthPath(), "utf8");
    const data = JSON.parse(raw) as { connectedAt?: string; accountLabel?: string };
    return {
      connected: true,
      connectedAt: data.connectedAt ?? null,
      accountLabel: data.accountLabel ?? "Agentic account",
      note: "MCP bridge ready — trades route via review_equity_order → place_equity_order",
    };
  } catch {
    const token = process.env.ROBINHOOD_MCP_ACCESS_TOKEN?.trim();
    if (token) {
      return {
        connected: true,
        connectedAt: null,
        accountLabel: "Token configured",
        note: "ROBINHOOD_MCP_ACCESS_TOKEN set — bridge will attempt MCP calls",
      };
    }
    return {
      connected: false,
      connectedAt: null,
      accountLabel: null,
      note: "Enabled but not linked — POST /api/capital/robinhood { action: 'mark_connected' } after OAuth",
    };
  }
}

export async function isRobinhoodMcpEnabled(): Promise<boolean> {
  const env = await loadDigitalEnv();
  const flag =
    process.env.ROBINHOOD_MCP_ENABLED?.trim() || env.ROBINHOOD_MCP_ENABLED?.trim();
  return flag === "1" || flag?.toLowerCase() === "true";
}

export async function isRobinhoodMcpLinked(): Promise<boolean> {
  if (!(await isRobinhoodMcpEnabled())) return false;
  const state = await readRobinhoodMcpState();
  return state.connected;
}

export async function markRobinhoodMcpConnected(input?: {
  accountLabel?: string;
}): Promise<RobinhoodMcpState> {
  const file = oauthPath();
  await mkdir(path.dirname(file), { recursive: true });
  const payload = {
    connectedAt: new Date().toISOString(),
    accountLabel: input?.accountLabel ?? "Robinhood Agentic",
  };
  await writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return readRobinhoodMcpState();
}

export async function unlinkRobinhoodMcp(): Promise<void> {
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(oauthPath());
  } catch {
    /* not linked */
  }
}

export async function callRobinhoodMcpTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  if (!(await isRobinhoodMcpLinked())) {
    return { ok: false, error: "Robinhood MCP not linked" };
  }

  const token =
    process.env.ROBINHOOD_MCP_ACCESS_TOKEN?.trim() ||
    (await loadDigitalEnv()).ROBINHOOD_MCP_ACCESS_TOKEN?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };

  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: { result?: unknown; error?: { message?: string } };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return { ok: false, error: `MCP non-JSON response (${res.status})` };
    }
    if (!res.ok || parsed.error) {
      return { ok: false, error: parsed.error?.message ?? `MCP HTTP ${res.status}` };
    }
    return { ok: true, result: parsed.result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "MCP call failed";
    return { ok: false, error: message };
  }
}

export async function executeRobinhoodEquityOrder(input: {
  ticker: string;
  qty: number;
  action: "buy" | "sell";
  skipReview?: boolean;
}): Promise<{ ok: boolean; orderId?: string; error?: string; review?: unknown }> {
  const side = input.action === "buy" ? "buy" : "sell";
  const symbol = input.ticker.replace("-", "").toUpperCase();

  if (!input.skipReview) {
    const review = await callRobinhoodMcpTool("review_equity_order", {
      symbol,
      side,
      quantity: input.qty,
      order_type: "market",
      time_in_force: "gfd",
    });
    if (!review.ok) return { ok: false, error: review.error, review: review.result };
  }

  const placed = await callRobinhoodMcpTool("place_equity_order", {
    symbol,
    side,
    quantity: input.qty,
    order_type: "market",
    time_in_force: "gfd",
  });
  if (!placed.ok) return { ok: false, error: placed.error };

  const result = placed.result as { order_id?: string; id?: string } | undefined;
  return {
    ok: true,
    orderId: result?.order_id ?? result?.id,
    review: placed.result,
  };
}
