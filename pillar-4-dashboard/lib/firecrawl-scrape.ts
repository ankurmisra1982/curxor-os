import "server-only";

import { getFirecrawlConfig } from "./firecrawl-config";
import { loadDigitalEnv } from "./digital-env";
import { publishDigitalIntent } from "./mesh-publish";
import { waitForDigitalReceipt } from "./shop-commerce-utils";

export interface FirecrawlScrapeResult {
  ok: boolean;
  demo: boolean;
  url: string;
  title: string;
  markdown: string;
  markdownLength: number;
  source: "firecrawl" | "demo";
  via: "eno2" | "direct" | "demo";
  receiptId: string | null;
  error?: string;
}

const DEMO_MARKDOWN = `# Example Company

Demo scrape — set FIRECRAWL_API_KEY in digital.env for live website context.

- Product: sovereign appliance software
- Hook: Clay-style enrichment without Clay subscription
`;

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "live.com",
]);

export function companyDomainFromEmail(email: string): string | null {
  const domain = email.split("@")[1]?.trim().toLowerCase() ?? "";
  if (!domain || domain.includes("example.") || FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

function demoScrape(url: string): FirecrawlScrapeResult {
  return {
    ok: true,
    demo: true,
    url,
    title: "Demo company site",
    markdown: DEMO_MARKDOWN,
    markdownLength: DEMO_MARKDOWN.length,
    source: "demo",
    via: "demo",
    receiptId: null,
  };
}

async function scrapeViaDirectApi(url: string, baseUrl: string, apiKey: string): Promise<FirecrawlScrapeResult> {
  const res = await fetch(`${baseUrl}/v1/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    cache: "no-store",
  });
  const data = (await res.json()) as {
    success?: boolean;
    data?: { markdown?: string; metadata?: { title?: string; ogTitle?: string } };
    error?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      demo: false,
      url,
      title: "",
      markdown: "",
      markdownLength: 0,
      source: "firecrawl",
      via: "direct",
      receiptId: null,
      error: data.error ?? `Firecrawl HTTP ${res.status}`,
    };
  }
  const markdown = data.data?.markdown ?? "";
  const title = data.data?.metadata?.title ?? data.data?.metadata?.ogTitle ?? "";
  return {
    ok: true,
    demo: false,
    url,
    title,
    markdown: markdown.slice(0, 12000),
    markdownLength: markdown.length,
    source: "firecrawl",
    via: "direct",
    receiptId: null,
  };
}

function receiptToScrape(url: string, receipt: Awaited<ReturnType<typeof waitForDigitalReceipt>>): FirecrawlScrapeResult {
  if (!receipt) {
    return {
      ok: false,
      demo: false,
      url,
      title: "",
      markdown: "",
      markdownLength: 0,
      source: "firecrawl",
      via: "eno2",
      receiptId: null,
      error: "Timed out waiting for eno2 receipt",
    };
  }
  if (!receipt.ok) {
    return {
      ok: false,
      demo: false,
      url,
      title: "",
      markdown: "",
      markdownLength: 0,
      source: "firecrawl",
      via: "eno2",
      receiptId: receipt.id,
      error: receipt.error ?? "Scrape failed",
    };
  }
  const markdown = String(receipt.receipt.markdown ?? "");
  return {
    ok: true,
    demo: false,
    url: String(receipt.receipt.url ?? url),
    title: String(receipt.receipt.title ?? ""),
    markdown,
    markdownLength: Number(receipt.receipt.markdown_length ?? markdown.length),
    source: "firecrawl",
    via: "eno2",
    receiptId: receipt.id,
  };
}

export async function scrapeUrlViaFirecrawl(inputUrl: string): Promise<FirecrawlScrapeResult> {
  const url = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
  const config = await getFirecrawlConfig();
  if (!config.configured) return demoScrape(url);

  const published = await publishDigitalIntent({
    tool: "web.scrape",
    payload: { url },
  });
  if (published.ok && published.id) {
    const receipt = await waitForDigitalReceipt(published.id, 12_000);
    if (receipt?.ok) return receiptToScrape(url, receipt);
    if (config.directDevAllowed) {
      const env = await loadDigitalEnv();
      const apiKey = env.FIRECRAWL_API_KEY!.trim();
      return scrapeViaDirectApi(url, config.baseUrl, apiKey);
    }
    return receiptToScrape(url, receipt);
  }

  if (config.directDevAllowed) {
    const env = await loadDigitalEnv();
    const apiKey = env.FIRECRAWL_API_KEY!.trim();
    return scrapeViaDirectApi(url, config.baseUrl, apiKey);
  }

  return {
    ok: false,
    demo: false,
    url,
    title: "",
    markdown: "",
    markdownLength: 0,
    source: "firecrawl",
    via: "eno2",
    receiptId: published.id ?? null,
    error: published.error ?? "Could not publish scrape intent to eno2",
  };
}

export function summarizeMarkdownForLead(markdown: string, domain: string): Partial<{
  company: string;
  notes: string;
  tags: string[];
}> {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);
  const titleLine = lines.find((l) => l.startsWith("#"))?.replace(/^#+\s*/, "") ?? domain;
  const hook = lines.find((l) => !l.startsWith("#") && l.length > 20)?.slice(0, 180) ?? "";
  return {
    company: titleLine,
    notes: `--- Firecrawl ---\n${hook || lines.slice(0, 3).join("\n")}`.trim(),
    tags: ["firecrawl", "enriched"],
  };
}

export async function enrichDomainViaFirecrawl(domain: string): Promise<FirecrawlScrapeResult> {
  const url = `https://${domain}`;
  return scrapeUrlViaFirecrawl(url);
}
