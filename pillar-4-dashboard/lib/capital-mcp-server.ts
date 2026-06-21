import "server-only";

import { agentExecuteTrade } from "./capital-agent-executor";
import { appendAgentAudit } from "./capital-agent-audit";
import { fetchPfmSnapshot } from "./capital-pfm-store";
import { getPlaidStatus } from "./capital-plaid-pfm";
import { getQuiverFeedStatus } from "./capital-pilot-feeds";
import { computePortfolioHealth } from "./capital-portfolio-health";
import { ensureCapitalQueue, fetchCapitalStatus } from "./capital-store";
import { buildTickerIntel, getCachedTickerIntel } from "./capital-ticker-intel";
import { previewTrade } from "./capital-trade-executor";
import { autoApprovalSummary } from "./capital-auto-approval";

export interface McpToolDef {
  name: string;
  description: string;
  safety: "read" | "write" | "execute";
  inputSchema: Record<string, unknown>;
}

export const CAPITAL_MCP_TOOLS: McpToolDef[] = [
  {
    name: "get_desk_status",
    description: "Portfolio value, buying power, armed rules, autonomous mode, auto-approval summary",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_ticker_intel",
    description: "Fundamentals, news, sentiment, smart take for a symbol",
    safety: "read",
    inputSchema: {
      type: "object",
      properties: { ticker: { type: "string" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_portfolio_health",
    description: "Concentration score, sector notes, rebalance hints",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_pfm_snapshot",
    description: "Net worth, cash flow, spending categories, wealth goals",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_auto_approval_policy",
    description: "Auto-approval stack policy and kill switch state",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "review_equity_order",
    description: "Simulate a trade — notional, risk note, auto-approve eligibility (Robinhood parity)",
    safety: "read",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["buy", "sell"] },
        quantity: { type: "number" },
      },
      required: ["symbol", "side", "quantity"],
    },
  },
  {
    name: "place_equity_order",
    description: "Execute paper trade after review — respects kill switch and auto-approval policy",
    safety: "execute",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["buy", "sell"] },
        quantity: { type: "number" },
        confirm: { type: "boolean", description: "Set true after review_equity_order" },
      },
      required: ["symbol", "side", "quantity"],
    },
  },
  {
    name: "list_agent_audit",
    description: "Recent agent/MCP trade previews and executions",
    safety: "read",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "get_quiver_status",
    description: "Congressional feed provider status",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_plaid_status",
    description: "PFM bank link status",
    safety: "read",
    inputSchema: { type: "object", properties: {} },
  },
];

export async function invokeCapitalMcpTool(
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
        const status = await fetchCapitalStatus();
        return {
          ok: true,
          content: {
            portfolioValue: status.portfolioValue,
            buyingPower: status.buyingPower,
            dailyPnlPct: status.dailyPnlPct,
            armedRules: status.stats.armedRules,
            tradingPaused: status.tradingPaused,
            autonomousMode: status.permissions.autonomousMode,
            autoApproval: autoApprovalSummary(status.autoApproval),
            agentKillSwitch: status.autoApproval.agentKillSwitch,
            tradingMode: status.tradingMode,
          },
        };
      }
      case "get_ticker_intel": {
        const ticker = String(args.ticker ?? args.symbol ?? "").trim().toUpperCase();
        if (!ticker) return { ok: false, content: null, error: "ticker required" };
        const intel =
          (await getCachedTickerIntel(ticker, { allowStale: true })) ?? (await buildTickerIntel(ticker));
        return { ok: true, content: intel };
      }
      case "get_portfolio_health": {
        const status = await fetchCapitalStatus();
        return { ok: true, content: computePortfolioHealth(status.positions, status.portfolioValue) };
      }
      case "get_pfm_snapshot": {
        return { ok: true, content: await fetchPfmSnapshot() };
      }
      case "get_auto_approval_policy": {
        const file = await ensureCapitalQueue();
        return {
          ok: true,
          content: { policy: file.autoApproval, summary: autoApprovalSummary(file.autoApproval) },
        };
      }
      case "review_equity_order": {
        const ticker = String(args.symbol ?? args.ticker ?? "").trim().toUpperCase();
        const side = (args.side === "sell" ? "sell" : "buy") as "buy" | "sell";
        const qty = typeof args.quantity === "number" ? args.quantity : Number(args.qty ?? 1);
        const out = await previewTrade({ ticker, qty: Number.isFinite(qty) ? qty : 1, action: side });
        return { ok: out.ok, content: out.preview ?? null, error: out.error };
      }
      case "place_equity_order": {
        const ticker = String(args.symbol ?? args.ticker ?? "").trim().toUpperCase();
        const side = (args.side === "sell" ? "sell" : "buy") as "buy" | "sell";
        const qty = typeof args.quantity === "number" ? args.quantity : Number(args.qty ?? 1);
        const confirm = args.confirm === true;
        const out = await agentExecuteTrade({
          ticker,
          qty: Number.isFinite(qty) ? qty : 1,
          action: side,
          confirm,
          source: "mcp",
        });
        return {
          ok: out.ok,
          content: { phase: out.phase, preview: out.preview, trade: out.trade, auditId: out.auditId },
          error: out.error,
        };
      }
      case "list_agent_audit": {
        const { listAgentAudit } = await import("./capital-agent-audit");
        const limit = typeof args.limit === "number" ? args.limit : 20;
        return { ok: true, content: await listAgentAudit(limit) };
      }
      case "get_quiver_status": {
        return { ok: true, content: await getQuiverFeedStatus() };
      }
      case "get_plaid_status": {
        return { ok: true, content: await getPlaidStatus() };
      }
      default:
        return { ok: false, content: null, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    return { ok: false, content: null, error: message };
  }
}

export function capitalMcpToolList(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
  return CAPITAL_MCP_TOOLS.map((t) => ({
    name: t.name,
    description: `[${t.safety}] ${t.description}`,
    inputSchema: t.inputSchema,
  }));
}
