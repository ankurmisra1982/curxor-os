import type { ConnectorLinkId } from "./connector-link-catalog";
import type { OotbAppId } from "./ootb-apps";

export interface WelcomeConnectionEntry {
  connectorId: ConnectorLinkId;
  forApps: OotbAppId[];
  jobLabel: string;
  plainTitle: string;
  plainBlurb: string;
}

/** Day-one connectors surfaced in Your Box — subset of CONNECTOR_LINK_CATALOG. */
export const WELCOME_CONNECTIONS: WelcomeConnectionEntry[] = [
  {
    connectorId: "alpaca_paper",
    forApps: ["my-capital"],
    jobLabel: "Money",
    plainTitle: "Paper trading (Alpaca)",
    plainBlurb: "Practice investing with fake money — keys stay on your box.",
  },
  {
    connectorId: "bluesky",
    forApps: ["my-content-creator"],
    jobLabel: "Content",
    plainTitle: "Bluesky",
    plainBlurb: "Publish posts only when you approve them.",
  },
  {
    connectorId: "google_workspace",
    forApps: ["my-work"],
    jobLabel: "Outreach",
    plainTitle: "Gmail & Calendar",
    plainBlurb: "Read mail and schedule without copying passwords into the cloud.",
  },
  {
    connectorId: "hubspot",
    forApps: ["my-work"],
    jobLabel: "Outreach",
    plainTitle: "HubSpot CRM",
    plainBlurb: "Sync contacts for follow-ups and sequences.",
  },
];

export function welcomeConnectionsForApps(selectedApps: OotbAppId[]): WelcomeConnectionEntry[] {
  const appSet = new Set(selectedApps);
  return WELCOME_CONNECTIONS.filter((entry) => entry.forApps.some((id) => appSet.has(id)));
}
