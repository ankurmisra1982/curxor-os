export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { privacyEgressDeniedResponse } from "@/lib/egress-policy";
import { probeFirecrawlMcp, registerFirecrawlMcpServer } from "@/lib/firecrawl-mcp";
import { requireLanAuth } from "@/lib/lan-auth";
import { firecrawlScrapeTest, firecrawlStatusPayload } from "@/lib/web-connector-health";

export async function GET(): Promise<Response> {
  const payload = await firecrawlStatusPayload();
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireLanAuth(request);
  if (auth) return auth;

  let body: { action?: string; url?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "scrape_test" || body.action === "scrape") {
    const url = typeof body.url === "string" && body.url.trim() ? body.url.trim() : "https://firecrawl.dev";
    const payload = await firecrawlScrapeTest(url);
    return Response.json(payload);
  }

  if (body.action === "status") {
    return Response.json(await firecrawlStatusPayload());
  }

  if (body.action === "mcp_probe" || body.action === "mcp_register") {
    const privacyDenied = await privacyEgressDeniedResponse();
    if (privacyDenied) return privacyDenied;

    if (body.action === "mcp_probe") {
      const probe = await probeFirecrawlMcp();
      return Response.json({ ok: probe.ok, probe });
    }

    const registered = await registerFirecrawlMcpServer();
    return Response.json({ ...registered });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
