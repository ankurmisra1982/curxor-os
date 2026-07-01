import type { ConnectorDomainId } from "./shell-connectors-types";

export type ConnectorLinkId =
  | "google_workspace"
  | "microsoft_365"
  | "hubspot"
  | "alpaca_paper"
  | "bluesky"
  | "snaptrade"
  | "robinhood_mcp";

export type ConnectorLinkMode = "oauth" | "guided" | "credentials";

export interface ConnectorLinkDefinition {
  id: ConnectorLinkId;
  label: string;
  domain: ConnectorDomainId;
  mode: ConnectorLinkMode;
  docsUrl: string;
  signupUrl: string;
  setupHint: string;
  envKeys?: string[];
}

export const CONNECTOR_LINK_CATALOG: ConnectorLinkDefinition[] = [
  {
    id: "google_workspace",
    label: "Google Workspace",
    domain: "comms",
    mode: "oauth",
    docsUrl: "https://developers.google.com/workspace",
    signupUrl: "https://console.cloud.google.com/",
    setupHint: "OAuth for Gmail read + Calendar — opens in a new tab.",
  },
  {
    id: "microsoft_365",
    label: "Microsoft 365",
    domain: "comms",
    mode: "oauth",
    docsUrl: "https://learn.microsoft.com/graph/",
    signupUrl: "https://portal.azure.com/",
    setupHint: "Graph mail + calendar — set MICROSOFT_CLIENT_ID in digital.env first.",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    domain: "comms",
    mode: "oauth",
    docsUrl: "https://developers.hubspot.com/",
    signupUrl: "https://www.hubspot.com/",
    setupHint: "CRM sync for Outreach — OAuth or HUBSPOT_ACCESS_TOKEN.",
  },
  {
    id: "alpaca_paper",
    label: "Alpaca Paper",
    domain: "trade",
    mode: "guided",
    docsUrl: "https://alpaca.markets/docs/",
    signupUrl: "https://app.alpaca.markets/signup",
    setupHint: "Paper trading keys in digital.env — verify after paste on appliance.",
    envKeys: ["ALPACA_API_KEY_ID", "ALPACA_API_SECRET_KEY"],
  },
  {
    id: "bluesky",
    label: "Bluesky",
    domain: "publish",
    mode: "credentials",
    docsUrl: "https://docs.bsky.app/",
    signupUrl: "https://bsky.app/",
    setupHint: "AT Protocol app password — simplest publish bridge to wire from Settings.",
    envKeys: ["BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD"],
  },
  {
    id: "snaptrade",
    label: "SnapTrade",
    domain: "trade",
    mode: "oauth",
    docsUrl: "https://snaptrade.com/",
    signupUrl: "https://snaptrade.com/",
    setupHint: "Unified broker link — Fidelity, Public, TD via SnapTrade portal.",
  },
  {
    id: "robinhood_mcp",
    label: "Robinhood Agentic",
    domain: "trade",
    mode: "guided",
    docsUrl: "https://robinhood.com/us/en/support/articles/agentic-trading-overview/",
    signupUrl: "https://robinhood.com/",
    setupHint: "MCP endpoint on agent.robinhood.com — isolated agentic account.",
  },
];

export function getConnectorLinkDefinition(id: string): ConnectorLinkDefinition | null {
  return CONNECTOR_LINK_CATALOG.find((c) => c.id === id) ?? null;
}

export function listConnectorLinksForDomain(domain: ConnectorDomainId): ConnectorLinkDefinition[] {
  return CONNECTOR_LINK_CATALOG.filter((c) => c.domain === domain);
}
