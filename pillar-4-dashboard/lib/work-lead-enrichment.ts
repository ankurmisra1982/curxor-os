import "server-only";

import { loadDigitalEnv } from "./digital-env";
import type { WorkLead } from "./work-queue-types";
import { getLead, upsertLead } from "./work-store";

export interface LeadEnrichmentResult {
  ok: boolean;
  demo: boolean;
  leadId: string;
  fields: Partial<Pick<WorkLead, "company" | "title" | "tags" | "notes">>;
  source: string;
  detail: string;
}

async function enrichViaHunter(email: string, apiKey: string): Promise<Partial<WorkLead> | null> {
  try {
    const url = `https://api.hunter.io/v2/email-finder?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { first_name?: string; last_name?: string; position?: string; company?: string };
    };
    const d = data.data;
    if (!d) return null;
    return {
      company: d.company ?? "",
      title: d.position ?? "",
      notes: `Hunter enrichment · ${d.first_name ?? ""} ${d.last_name ?? ""}`.trim(),
    };
  } catch {
    return null;
  }
}

async function enrichViaApollo(email: string, apiKey: string): Promise<Partial<WorkLead> | null> {
  try {
    const res = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify({ api_key: apiKey, email }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      person?: { title?: string; organization?: { name?: string }; linkedin_url?: string };
    };
    const p = data.person;
    if (!p) return null;
    return {
      company: p.organization?.name ?? "",
      title: p.title ?? "",
      tags: p.linkedin_url ? ["linkedin"] : [],
      notes: p.linkedin_url ? `Apollo · ${p.linkedin_url}` : "Apollo enrichment",
    };
  } catch {
    return null;
  }
}

function demoEnrichment(lead: WorkLead): Partial<WorkLead> {
  const domain = lead.email.split("@")[1] ?? "example.com";
  return {
    company: lead.company || domain.split(".")[0]?.replace(/-/g, " ") || "Prospect Co",
    title: lead.title || "Decision maker",
    tags: [...new Set([...(lead.tags ?? []), "demo-enriched"])],
    notes: `${lead.notes ? `${lead.notes}\n` : ""}Demo enrichment — set HUNTER_API_KEY or APOLLO_API_KEY for live data`,
  };
}

export async function enrichLead(leadId: string): Promise<LeadEnrichmentResult> {
  const lead = await getLead(leadId);
  if (!lead) {
    return { ok: false, demo: true, leadId, fields: {}, source: "none", detail: "Lead not found" };
  }

  const env = await loadDigitalEnv();
  const hunterKey = env.HUNTER_API_KEY?.trim();
  const apolloKey = env.APOLLO_API_KEY?.trim();

  let fields: Partial<WorkLead> | null = null;
  let source = "demo";

  if (hunterKey) {
    fields = await enrichViaHunter(lead.email, hunterKey);
    if (fields) source = "hunter";
  }
  if (!fields && apolloKey) {
    fields = await enrichViaApollo(lead.email, apolloKey);
    if (fields) source = "apollo";
  }
  if (!fields) {
    fields = demoEnrichment(lead);
    source = "demo";
  }

  await upsertLead({
    id: leadId,
    name: lead.name,
    email: lead.email,
    company: fields.company ?? lead.company,
    title: fields.title ?? lead.title,
    tags: fields.tags ?? lead.tags,
    notes: fields.notes ?? lead.notes,
  });

  return {
    ok: true,
    demo: source === "demo",
    leadId,
    fields,
    source,
    detail: `Enriched via ${source}`,
  };
}
