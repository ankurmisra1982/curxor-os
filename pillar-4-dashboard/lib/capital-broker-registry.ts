import type { BrokerId, BrokerIntegrationStatus, BrokerTier } from "./capital-queue-types";
import { loadAlpacaCreds } from "./capital-alpaca-client";
import { isEtradeBrokerLinked } from "./capital-etrade-oauth";
import { isWebullBrokerLinked } from "./capital-webull-oauth";
import { isRobinhoodMcpLinked, isRobinhoodMcpEnabled } from "./capital-robinhood-mcp";
import { isSnapTradeBrokerLinked } from "./capital-snaptrade-oauth";
import { isSnapTradeConfigured } from "./capital-snaptrade-store";

export interface BrokerDefinition {
  id: BrokerId;
  label: string;
  tier: BrokerTier;
  tool?: string;
  docsUrl: string;
  detail: string;
}

export const BROKER_CATALOG: BrokerDefinition[] = [
  {
    id: "alpaca",
    label: "Alpaca Paper",
    tier: "live",
    tool: "capital.execute_trade",
    docsUrl: "https://alpaca.markets/",
    detail: "Primary sovereign bridge — paper + bracket orders via digital.env",
  },
  {
    id: "tradingview",
    label: "TradingView",
    tier: "webhook",
    docsUrl: "https://www.tradingview.com/support/solutions/43000529348-about-webhooks/",
    detail: "Alert webhooks → Capital Claw rule triggers (sovereign ingress)",
  },
  {
    id: "robinhood_mcp",
    label: "Robinhood Agentic",
    tier: "mcp",
    tool: "capital.execute_trade_robinhood",
    docsUrl: "https://robinhood.com/us/en/support/articles/agentic-trading-overview/",
    detail: "MCP endpoint https://agent.robinhood.com/mcp/trading — isolated agentic account",
  },
  {
    id: "webull",
    label: "Webull OpenAPI",
    tier: "live",
    tool: "capital.execute_trade",
    docsUrl: "https://developer.webull.com/apis/docs/trade-api/overview.md",
    detail: "OAuth-linked account · POST /api/capital/webull to link",
  },
  {
    id: "etrade",
    label: "E*TRADE",
    tier: "live",
    tool: "capital.execute_trade",
    docsUrl: "https://developer.etrade.com/getting-started",
    detail: "OAuth 1.0a linked account · POST /api/capital/etrade to link",
  },
  {
    id: "snaptrade",
    label: "SnapTrade",
    tier: "live",
    tool: "capital.execute_trade",
    docsUrl: "https://snaptrade.com/",
    detail: "Unified broker linking — Fidelity/Public/TD via SnapTrade OAuth + bridge worker",
  },
  {
    id: "public",
    label: "Public.com",
    tier: "planned",
    docsUrl: "https://public.com/",
    detail: "No public retail API — route via TradingView alerts or manual approval",
  },
  {
    id: "fidelity",
    label: "Fidelity",
    tier: "unavailable",
    docsUrl: "https://www.fidelity.com/",
    detail: "No official retail API — use TradingView webhook or export/import workflows",
  },
];

export async function buildBrokerStatus(): Promise<BrokerIntegrationStatus[]> {
  const alpaca = Boolean(await loadAlpacaCreds());
  const webull = await isWebullBrokerLinked();
  const etrade = await isEtradeBrokerLinked();
  const tvSecret = process.env.CURXOR_CAPITAL_TV_SECRET?.trim();

  return Promise.all(
    BROKER_CATALOG.map(async (b) => {
    let configured = false;
    let detail = b.detail;
    if (b.id === "alpaca") {
      configured = alpaca;
      detail = alpaca ? "ALPACA_API_KEY_ID configured" : "Set Alpaca keys in digital.env";
    }
    if (b.id === "webull") {
      configured = webull && Boolean(process.env.WEBULL_CLIENT_ID?.trim());
      detail = configured ? "OAuth linked · bridge ready" : "Set WEBULL_* in digital.env then link account";
    }
    if (b.id === "etrade") {
      configured = etrade && Boolean(process.env.ETRADE_CONSUMER_KEY?.trim());
      detail = configured ? "OAuth linked · sandbox/production via ETRADE_SANDBOX" : "Set ETRADE_* keys then link account";
    }
    if (b.id === "tradingview") {
      configured = Boolean(tvSecret);
      detail = tvSecret ? "Webhook secret configured" : "Set CURXOR_CAPITAL_TV_SECRET for alert ingress";
    }
    if (b.id === "robinhood_mcp") {
      configured = await isRobinhoodMcpLinked();
      detail = configured
        ? "Robinhood Agentic MCP linked · review → place order path"
        : (await isRobinhoodMcpEnabled())
          ? "Enabled — complete OAuth then mark connected"
          : "Set ROBINHOOD_MCP_ENABLED=1 in digital.env";
    }
    if (b.id === "snaptrade") {
      configured = (await isSnapTradeBrokerLinked()) && (await isSnapTradeConfigured());
      detail = configured
        ? "SnapTrade linked · bridge dispatch when worker configured"
        : (await isSnapTradeConfigured())
          ? "Keys set — link broker via SnapTrade portal"
          : "Set SNAPTRADE_CLIENT_ID + SNAPTRADE_CONSUMER_SECRET in digital.env";
    }
    return { id: b.id, label: b.label, tier: b.tier, configured, detail };
  }),
  );
}

export function resolveBrokerTool(brokerId: BrokerId): string {
  if (brokerId === "robinhood_mcp") return "capital.execute_trade_robinhood";
  return "capital.execute_trade";
}