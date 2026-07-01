import "server-only";

import { loadDigitalEnv } from "./digital-env";

export type FirecrawlCreditTier = "starter" | "growth" | "operator";

export const FIRECRAWL_CREDIT_CAPS: Record<FirecrawlCreditTier, number> = {
  starter: 25,
  growth: 100,
  operator: 300,
};

export interface FirecrawlConfig {
  configured: boolean;
  apiKeyPresent: boolean;
  baseUrl: string;
  creditTier: FirecrawlCreditTier;
  dailyCreditCap: number;
  directDevAllowed: boolean;
}

export async function getFirecrawlConfig(): Promise<FirecrawlConfig> {
  const env = await loadDigitalEnv();
  const apiKey = env.FIRECRAWL_API_KEY?.trim() ?? "";
  const baseUrl = (env.FIRECRAWL_BASE_URL?.trim() || "https://api.firecrawl.dev").replace(/\/$/, "");
  const tierRaw = (env.FIRECRAWL_CREDIT_TIER?.trim().toLowerCase() ?? "starter") as FirecrawlCreditTier;
  const creditTier: FirecrawlCreditTier =
    tierRaw === "growth" || tierRaw === "operator" ? tierRaw : "starter";

  return {
    configured: Boolean(apiKey),
    apiKeyPresent: Boolean(apiKey),
    baseUrl,
    creditTier,
    dailyCreditCap: FIRECRAWL_CREDIT_CAPS[creditTier],
    directDevAllowed: process.env.CURXOR_FIRECRAWL_DIRECT === "1",
  };
}

export async function isFirecrawlConfigured(): Promise<boolean> {
  return (await getFirecrawlConfig()).configured;
}
