import "server-only";

import { getFirecrawlConfig } from "./firecrawl-config";
import { scrapeUrlViaFirecrawl } from "./firecrawl-scrape";
import { digitalEnvPath } from "./digital-env";
import type { WebConnectorEntry, WebConnectorVaultReport } from "./shell-connectors-types";

export type { WebConnectorEntry, WebConnectorHealth, WebConnectorVaultReport } from "./shell-connectors-types";

export async function buildWebConnectorHealthReport(): Promise<WebConnectorVaultReport> {
  const envPath = digitalEnvPath();
  const fc = await getFirecrawlConfig();

  const connectors: WebConnectorEntry[] = [
    {
      id: "firecrawl",
      label: "Firecrawl",
      program: "FC1",
      configured: fc.configured,
      health: fc.configured ? "ready" : "unconfigured",
      healthLabel: fc.configured ? "BYOK ready" : "Add FIRECRAWL_API_KEY",
      envKeys: ["FIRECRAWL_API_KEY"],
      fixHints: fc.configured
        ? [
            `Credit tier ${fc.creditTier} — ${fc.dailyCreditCap} credits/day budget in Settings.`,
            "Scrapes route through eno2 web.scrape — receipts on telemetry/digital_in.",
          ]
        : [
            "Web scrape/search bridge — BYOK credits on your Firecrawl account.",
            `Set FIRECRAWL_API_KEY in ${envPath}`,
          ],
    },
    {
      id: "x_mcp",
      label: "X MCP (read-only)",
      program: "XM1",
      configured: false,
      health: "planned",
      healthLabel: "Ships with XM1",
      envKeys: ["X_BEARER_TOKEN"],
      fixHints: [
        "Official X MCP for search and archive — separate from publish OAuth.",
        "Requires operator X developer tier — not included at $3,999.",
      ],
    },
    {
      id: "elevenlabs",
      label: "ElevenLabs voice",
      program: "EL1",
      configured: false,
      health: "planned",
      healthLabel: "Ships with EL1",
      envKeys: ["ELEVENLABS_API_KEY"],
      fixHints: [
        "Premium voice BYOK — Piper remains the default sovereign path on appliance.",
        `After EL1: set ELEVENLABS_API_KEY in ${envPath}`,
      ],
    },
  ];

  return {
    updatedAt: new Date().toISOString(),
    summary: {
      total: connectors.length,
      configured: connectors.filter((c) => c.configured).length,
      ready: connectors.filter((c) => c.health === "ready").length,
      planned: connectors.filter((c) => c.health === "planned").length,
    },
    connectors,
  };
}

export async function firecrawlStatusPayload() {
  const [report, config] = await Promise.all([buildWebConnectorHealthReport(), getFirecrawlConfig()]);
  return {
    ok: true as const,
    configured: config.configured,
    config,
    connector: report.connectors.find((c) => c.id === "firecrawl") ?? null,
    web: report,
  };
}

export async function firecrawlScrapeTest(url: string) {
  const result = await scrapeUrlViaFirecrawl(url);
  return { ok: result.ok, result };
}
