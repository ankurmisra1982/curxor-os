export type WorkConnectorTier = "live" | "oauth" | "webhook" | "mcp" | "planned";

export type WorkConnectorId =
  | "smtp"
  | "imap"
  | "google_workspace"
  | "microsoft_365"
  | "slack"
  | "notion"
  | "twenty"
  | "hubspot"
  | "salesforce"
  | "linear"
  | "calcom"
  | "n8n";

export interface WorkConnectorDefinition {
  id: WorkConnectorId;
  label: string;
  tier: WorkConnectorTier;
  tool?: string;
  envKeys: string[];
  docsUrl: string;
  detail: string;
}

export const CONNECTOR_CATALOG: WorkConnectorDefinition[] = [
  {
    id: "smtp",
    label: "SMTP outbound",
    tier: "live",
    tool: "work.email.send",
    envKeys: ["SMTP_HOST", "SMTP_FROM"],
    docsUrl: "https://github.com/curxor-os/curxor-os/blob/main/docs/outreach-claw/GETTING-STARTED.md",
    detail: "Primary outbound path — sequences and one-off send via eno2 digital bridge",
  },
  {
    id: "imap",
    label: "IMAP inbound",
    tier: "planned",
    tool: "work.email.fetch",
    envKeys: ["IMAP_HOST", "IMAP_USER", "IMAP_PASS"],
    docsUrl: "https://github.com/curxor-os/curxor-os/blob/main/docs/outreach-claw/GETTING-STARTED.md",
    detail: "Live inbox ingest for scan_inbox — planned; demo uses local mail index",
  },
  {
    id: "google_workspace",
    label: "Google Workspace",
    tier: "oauth",
    tool: "work.gmail.list",
    envKeys: ["CURXOR_GOOGLE_OAUTH_CLIENT_ID", "CURXOR_GOOGLE_OAUTH_CLIENT_SECRET"],
    docsUrl: "https://developers.google.com/workspace",
    detail: "Gmail read + Calendar events for morning brief and meeting prep",
  },
  {
    id: "microsoft_365",
    label: "Microsoft 365",
    tier: "planned",
    envKeys: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    docsUrl: "https://learn.microsoft.com/graph/",
    detail: "Graph API mail + calendar — planned OAuth lane",
  },
  {
    id: "slack",
    label: "Slack",
    tier: "live",
    tool: "channel.slack.send",
    envKeys: ["SLACK_BOT_TOKEN"],
    docsUrl: "https://api.slack.com/",
    detail: "Notify on interested replies, channel digest, approval routing",
  },
  {
    id: "notion",
    label: "Notion",
    tier: "oauth",
    envKeys: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
    docsUrl: "https://developers.notion.com/",
    detail: "Push lead notes to CRM database mirror",
  },
  {
    id: "twenty",
    label: "Twenty CRM",
    tier: "live",
    tool: "work.crm.sync",
    envKeys: ["TWENTY_API_URL", "TWENTY_API_KEY"],
    docsUrl: "https://twenty.com/developers",
    detail: "GraphQL bidirectional lead sync — local or Twenty backend",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    tier: "planned",
    envKeys: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
    docsUrl: "https://developers.hubspot.com/",
    detail: "GTM Engine-style CRM sync — planned",
  },
  {
    id: "salesforce",
    label: "Salesforce",
    tier: "planned",
    envKeys: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
    docsUrl: "https://developer.salesforce.com/",
    detail: "Enterprise CRM lane — planned",
  },
  {
    id: "linear",
    label: "Linear",
    tier: "mcp",
    envKeys: ["LINEAR_API_KEY"],
    docsUrl: "https://linear.app/docs",
    detail: "Issue create from mail via MCP — user-configured server",
  },
  {
    id: "calcom",
    label: "Cal.com",
    tier: "webhook",
    envKeys: ["CALCOM_API_KEY"],
    docsUrl: "https://cal.com/docs",
    detail: "Book meetings from sequence CTA via inbound webhook",
  },
  {
    id: "n8n",
    label: "n8n",
    tier: "webhook",
    envKeys: ["N8N_WEBHOOK_URL"],
    docsUrl: "https://docs.n8n.io/",
    detail: "Long-tail automations — webhook escape hatch on work events",
  },
];

export function getWorkConnector(id: WorkConnectorId): WorkConnectorDefinition | undefined {
  return CONNECTOR_CATALOG.find((c) => c.id === id);
}
