import type { BridgeHealthReport } from "./content-bridge-health";
import type { BrokerIntegrationStatus } from "./capital-queue-types";
import type { ConnectorLinkDefinition } from "./connector-link-catalog";
import type { WorkConnectorVaultReport } from "./work-connector-health";
import type { WorkLiveProofVaultSummary } from "./work-live-proof";

export type ConnectorDomainId = "publish" | "trade" | "comms" | "messaging" | "web";

export type ConnectorDomainHealth = "ready" | "attention" | "unconfigured" | "planned";

export interface ConnectorDomainSummary {
  id: ConnectorDomainId;
  label: string;
  health: ConnectorDomainHealth;
  statusLabel: string;
  ready: number;
  configured: number;
  total: number;
  attention: number;
  clawHref: string;
  clawLabel: string;
}

export interface ShellConnectorsSummary {
  attentionTotal: number;
  domainsNeedingAttention: number;
  configuredTotal: number;
}

export type MessagingConnectorHealth =
  | "ready"
  | "degraded"
  | "auth_expired"
  | "unconfigured"
  | "planned";

export interface MessagingConnectorEntry {
  id: string;
  label: string;
  bridgeTool: string | null;
  configured: boolean;
  health: MessagingConnectorHealth;
  healthLabel: string;
  missingEnvKeys: string[];
  fixHints: string[];
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

export interface MessagingConnectorVaultReport {
  updatedAt: string;
  summary: {
    total: number;
    configured: number;
    ready: number;
    attention: number;
  };
  connectors: MessagingConnectorEntry[];
}

export type WebConnectorHealth = "ready" | "unconfigured" | "planned";

export interface WebConnectorEntry {
  id: "firecrawl" | "x_mcp" | "elevenlabs";
  label: string;
  program: string;
  configured: boolean;
  health: WebConnectorHealth;
  healthLabel: string;
  envKeys: string[];
  fixHints: string[];
}

export interface WebConnectorVaultReport {
  updatedAt: string;
  summary: {
    total: number;
    configured: number;
    ready: number;
    planned: number;
  };
  connectors: WebConnectorEntry[];
}

export interface ShellConnectorsReport {
  ok: true;
  generatedAt: string;
  digitalEnvPath: string;
  summary: ShellConnectorsSummary;
  domains: ConnectorDomainSummary[];
  links: ConnectorLinkDefinition[];
  publish: BridgeHealthReport;
  trade: {
    bridgeConfigured: boolean;
    brokers: BrokerIntegrationStatus[];
    fixHints: string[];
  };
  comms: WorkConnectorVaultReport;
  messaging: MessagingConnectorVaultReport;
  web: WebConnectorVaultReport;
}

export type { WorkLiveProofVaultSummary };
