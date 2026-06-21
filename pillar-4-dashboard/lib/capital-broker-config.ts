import "server-only";

import type { BrokerId } from "./capital-queue-types";
import { isEtradeBrokerLinked } from "./capital-etrade-oauth";
import { isWebullBrokerLinked } from "./capital-webull-oauth";
import { isAlpacaBridgeConfigured } from "./capital-store";
import { isRobinhoodMcpLinked } from "./capital-robinhood-mcp";
import { isSnapTradeBrokerLinked } from "./capital-snaptrade-oauth";
import { isSnapTradeConfigured } from "./capital-snaptrade-store";
import { loadDigitalEnv } from "./digital-env";

export async function isBrokerBridgeConfigured(brokerId: BrokerId): Promise<boolean> {
  switch (brokerId) {
    case "alpaca":
      return isAlpacaBridgeConfigured();
    case "webull":
      return (await isWebullBrokerLinked()) && Boolean(process.env.WEBULL_CLIENT_ID?.trim());
    case "etrade":
      return (await isEtradeBrokerLinked()) && Boolean(process.env.ETRADE_CONSUMER_KEY?.trim());
    case "tradingview":
      return Boolean(
        process.env.CURXOR_CAPITAL_TV_SECRET?.trim() ||
          (await loadDigitalEnv()).CURXOR_CAPITAL_TV_SECRET?.trim(),
      );
    case "robinhood_mcp":
      return isRobinhoodMcpLinked();
    case "snaptrade":
      return (await isSnapTradeBrokerLinked()) && (await isSnapTradeConfigured());
    default:
      return false;
  }
}

export function brokerConfigLabel(brokerId: BrokerId): string {
  switch (brokerId) {
    case "alpaca":
      return "Alpaca API keys in digital.env";
    case "webull":
      return "WEBULL_CLIENT_ID + linked OAuth account";
    case "etrade":
      return "ETRADE_CONSUMER_KEY + linked OAuth account";
    case "robinhood_mcp":
      return "ROBINHOOD_MCP_ENABLED + OAuth link via /api/capital/robinhood";
    case "snaptrade":
      return "SNAPTRADE_* keys + linked account via /api/capital/snaptrade";
    default:
      return "Not configured";
  }
}
