import "server-only";

import { readAppFreState } from "./app-fre-state";
import { buildBrokerStatus } from "./capital-broker-registry";
import { isAlpacaBridgeConfigured } from "./capital-store";
import { buildBridgeHealthReport, type BridgeHealthReport } from "./content-bridge-health";
import { CONNECTOR_LINK_CATALOG } from "./connector-link-catalog";
import { digitalEnvPath } from "./digital-env";
import type { BrokerIntegrationStatus } from "./capital-queue-types";
import {
  buildMessagingConnectorHealthReport,
  MESSAGING_PLATFORM_IDS,
} from "./messaging-connector-health";
import type {
  ConnectorDomainHealth,
  ConnectorDomainSummary,
  ShellConnectorsReport,
} from "./shell-connectors-types";
import { buildWorkConnectorHealthReport, type WorkConnectorVaultReport } from "./work-connector-health";
import { buildWebConnectorHealthReport } from "./web-connector-health";

export type {
  ConnectorDomainHealth,
  ConnectorDomainId,
  ConnectorDomainSummary,
  ShellConnectorsReport,
  ShellConnectorsSummary,
} from "./shell-connectors-types";

function resolvePublishDomain(report: BridgeHealthReport): ConnectorDomainSummary {
  const live = report.platforms.filter(
    (p) => p.bridgeTier === "live" && !MESSAGING_PLATFORM_IDS.includes(p.platform as (typeof MESSAGING_PLATFORM_IDS)[number]),
  );
  const ready = live.filter((p) => p.health === "ready");
  const configured = live.filter((p) => p.configured);
  const attention = live.filter((p) => p.health === "degraded" || p.health === "auth_expired");

  let health: ConnectorDomainHealth = "unconfigured";
  let statusLabel = "No publish accounts connected";

  if (live.length === 0) {
    health = "planned";
    statusLabel = "Publish bridges coming soon";
  } else if (attention.length > 0) {
    health = "attention";
    statusLabel =
      attention.length === 1
        ? "1 account needs attention"
        : `${attention.length} accounts need attention`;
  } else if (ready.length > 0) {
    health = "ready";
    statusLabel = `${ready.length} of ${live.length} ready to publish`;
  } else if (configured.length > 0) {
    health = "attention";
    statusLabel = `${configured.length} connected — verify publish path`;
  }

  return {
    id: "publish",
    label: "Publish",
    health,
    statusLabel,
    ready: ready.length,
    configured: configured.length,
    total: live.length,
    attention: attention.length,
    clawHref: "/my-content-creator",
    clawLabel: "Creator Claw",
  };
}

function buildTradeFixHints(brokers: BrokerIntegrationStatus[]): string[] {
  const hints: string[] = [];
  const tv = brokers.find((b) => b.id === "tradingview");
  const snap = brokers.find((b) => b.id === "snaptrade");
  const rh = brokers.find((b) => b.id === "robinhood_mcp");

  if (tv && !tv.configured) {
    hints.push(
      "TradingView: create alert → webhook URL on this appliance → set CURXOR_CAPITAL_TV_SECRET in digital.env",
    );
  }
  if (snap && !snap.configured) {
    hints.push("SnapTrade: set SNAPTRADE_CLIENT_ID + SNAPTRADE_CONSUMER_SECRET, then link from Integrations.");
  }
  if (rh && !rh.configured) {
    hints.push("Robinhood MCP: enable ROBINHOOD_MCP_ENABLED=1, complete OAuth, then mark connected in Capital.");
  }
  if (hints.length === 0) {
    hints.push("Alpaca paper is the primary sovereign trade bridge — verify keys from Integrations.");
  }
  return hints;
}

function resolveTradeDomain(
  brokers: BrokerIntegrationStatus[],
  bridgeConfigured: boolean,
): ConnectorDomainSummary {
  const actionable = brokers.filter((b) => b.tier === "live" || b.tier === "webhook" || b.tier === "mcp");
  const configured = actionable.filter((b) => b.configured);
  const ready = configured.filter((b) => b.tier === "live" || b.tier === "mcp");

  let health: ConnectorDomainHealth = "unconfigured";
  let statusLabel = "No trade bridges configured";

  if (bridgeConfigured || configured.length > 0) {
    health = "ready";
    const primary = configured.find((b) => b.id === "alpaca") ?? configured[0];
    statusLabel = primary
      ? `${primary.label} connected`
      : `${configured.length} trade bridge${configured.length === 1 ? "" : "s"} connected`;
  } else if (actionable.length > 0) {
    health = "planned";
    statusLabel = "Link Alpaca paper or TradingView webhook from Integrations";
  }

  return {
    id: "trade",
    label: "Trade",
    health,
    statusLabel,
    ready: ready.length,
    configured: configured.length,
    total: actionable.length,
    attention: 0,
    clawHref: "/my-capital",
    clawLabel: "Capital Claw",
  };
}

function resolveCommsDomain(report: WorkConnectorVaultReport): ConnectorDomainSummary {
  const commsIds = new Set([
    "smtp",
    "imap",
    "google_workspace",
    "microsoft_365",
    "slack",
    "hubspot",
  ]);
  const comms = report.connectors.filter((c) => commsIds.has(c.id));
  const configured = comms.filter((c) => c.configured);
  const ready = comms.filter((c) => c.health === "live");
  const attention = comms.filter((c) => c.health === "degraded" || c.health === "auth_expired");

  let health: ConnectorDomainHealth = "unconfigured";
  let statusLabel = "No comms path configured";

  if (report.liveProof?.badge) {
    health = "ready";
    statusLabel = `Live proof — ${report.liveProof.detail}`;
  } else if (attention.length > 0) {
    health = "attention";
    statusLabel = `${attention.length} comms connector${attention.length === 1 ? "" : "s"} need attention`;
  } else if (report.commsPathReady && ready.length > 0) {
    health = "ready";
    const m365 = ready.find((c) => c.id === "microsoft_365");
    const google = ready.find((c) => c.id === "google_workspace");
    const primary = m365 ?? google ?? ready[0];
    statusLabel = primary ? `${primary.label} ready` : `${ready.length} comms paths ready`;
  } else if (configured.length > 0) {
    health = "attention";
    statusLabel = `${configured.length} configured — verify outbound mail`;
  } else if (!report.commsPathReady) {
    health = "unconfigured";
    statusLabel = "Connect Google, Microsoft, or SMTP for live sends";
  }

  return {
    id: "comms",
    label: "Comms",
    health,
    statusLabel,
    ready: ready.length,
    configured: configured.length,
    total: comms.length,
    attention: attention.length,
    clawHref: "/my-work",
    clawLabel: "Outreach Claw",
  };
}

function resolveMessagingDomain(
  messaging: Awaited<ReturnType<typeof buildMessagingConnectorHealthReport>>,
): ConnectorDomainSummary {
  const { summary, connectors } = messaging;
  const attention = connectors.filter(
    (c) => c.health === "degraded" || c.health === "auth_expired",
  );

  let health: ConnectorDomainHealth = "unconfigured";
  let statusLabel = "No messaging bridges configured";

  if (attention.length > 0) {
    health = "attention";
    statusLabel = `${attention.length} messaging channel${attention.length === 1 ? "" : "s"} need attention`;
  } else if (summary.ready > 0) {
    health = "ready";
    const primary = connectors.find((c) => c.health === "ready");
    statusLabel = primary ? `${primary.label} ready` : `${summary.ready} messaging paths ready`;
  } else if (summary.configured > 0) {
    health = "attention";
    statusLabel = `${summary.configured} configured — send a test message`;
  }

  return {
    id: "messaging",
    label: "Messaging",
    health,
    statusLabel,
    ready: summary.ready,
    configured: summary.configured,
    total: summary.total,
    attention: summary.attention,
    clawHref: "/my-content-creator",
    clawLabel: "Creator Engage",
  };
}

function resolveWebDomain(
  web: Awaited<ReturnType<typeof buildWebConnectorHealthReport>>,
): ConnectorDomainSummary {
  const firecrawl = web.connectors.find((c) => c.id === "firecrawl");
  const configured = web.summary.configured;
  const ready = web.summary.ready;

  let health: ConnectorDomainHealth = "planned";
  let statusLabel = "Firecrawl, X MCP, ElevenLabs — BYOK after FC1/XM1/EL1";

  if (firecrawl?.configured) {
    health = "ready";
    statusLabel = "Firecrawl BYOK ready — X MCP and ElevenLabs still planned";
  } else if (configured > 0) {
    health = "attention";
    statusLabel = `${configured} web bridge configured`;
  }

  return {
    id: "web",
    label: "Web context",
    health,
    statusLabel,
    ready,
    configured,
    total: web.summary.total,
    attention: 0,
    clawHref: "/settings?tab=integrations",
    clawLabel: "Integrations",
  };
}

export async function buildShellConnectorsReport(): Promise<ShellConnectorsReport> {
  const fre = await readAppFreState("my-content-creator");
  const channels = Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is string => typeof x === "string")
    : [];

  const [publish, brokers, bridgeConfigured, comms, messaging, web] = await Promise.all([
    buildBridgeHealthReport(channels),
    buildBrokerStatus(),
    isAlpacaBridgeConfigured(),
    buildWorkConnectorHealthReport(),
    buildMessagingConnectorHealthReport(),
    buildWebConnectorHealthReport(),
  ]);
  const tradeFixHints = buildTradeFixHints(brokers);

  const domains = [
    resolvePublishDomain(publish),
    resolveTradeDomain(brokers, bridgeConfigured),
    resolveCommsDomain(comms),
    resolveMessagingDomain(messaging),
    resolveWebDomain(web),
  ];

  const attentionTotal = domains.reduce((n, d) => n + d.attention, 0);
  const domainsNeedingAttention = domains.filter(
    (d) => d.health === "attention" || d.health === "unconfigured",
  ).length;
  const configuredTotal = domains.reduce((n, d) => n + d.configured, 0);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    digitalEnvPath: digitalEnvPath(),
    summary: {
      attentionTotal,
      domainsNeedingAttention,
      configuredTotal,
    },
    domains,
    links: CONNECTOR_LINK_CATALOG,
    publish,
    trade: { bridgeConfigured, brokers, fixHints: tradeFixHints },
    comms,
    messaging,
    web,
  };
}
