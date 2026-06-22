import "server-only";

import { loadDigitalEnv } from "./digital-env";
import { appendWorkSyncLog, ensureWorkQueue, upsertLead, writeWorkFilePartial } from "./work-store";
import type { WorkLead } from "./work-queue-types";

export interface HubSpotSyncResult {
  ok: boolean;
  demo: boolean;
  imported: number;
  pushed: number;
  detail: string;
}

function hubspotToken(): string | null {
  return process.env.HUBSPOT_ACCESS_TOKEN?.trim() ?? null;
}

async function hubspotFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = hubspotToken();
  if (!token) return null;
  return fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function syncHubSpotLeads(): Promise<HubSpotSyncResult> {
  const env = await loadDigitalEnv();
  const token = env.HUBSPOT_ACCESS_TOKEN?.trim() || hubspotToken();

  if (!token) {
    const file = await ensureWorkQueue();
    const demoImported = Math.min(2, file.leads.length);
    await appendWorkSyncLog({
      connector: "hubspot",
      action: "sync_hubspot",
      detail: `demo · imported=${demoImported} pushed=0`,
    });
    return { ok: true, demo: true, imported: demoImported, pushed: 0, detail: "Demo sync — set HUBSPOT_ACCESS_TOKEN" };
  }

  let imported = 0;
  let pushed = 0;

  const pullRes = await hubspotFetch(
    "/crm/v3/objects/contacts?limit=50&properties=email,firstname,lastname,company,jobtitle",
  );
  if (pullRes?.ok) {
    const data = (await pullRes.json()) as {
      results?: Array<{ properties?: Record<string, string> }>;
    };
    for (const row of data.results ?? []) {
      const email = row.properties?.email?.trim();
      if (!email) continue;
      const name = [row.properties?.firstname, row.properties?.lastname].filter(Boolean).join(" ") || email;
      await upsertLead({
        name,
        email,
        company: row.properties?.company ?? "",
        title: row.properties?.jobtitle ?? "",
        source: "hubspot",
      });
      imported += 1;
    }
  }

  const file = await ensureWorkQueue();
  for (const lead of file.leads.filter((l) => !["won", "lost"].includes(l.stage)).slice(0, 25)) {
    const body = {
      properties: {
        email: lead.email,
        firstname: lead.name.split(" ")[0] ?? lead.name,
        lastname: lead.name.split(" ").slice(1).join(" ") || "",
        company: lead.company,
        jobtitle: lead.title,
      },
    };
    const pushRes = await hubspotFetch("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (pushRes?.ok || pushRes?.status === 409) {
      pushed += 1;
      const idx = file.leads.findIndex((l) => l.id === lead.id);
      if (idx >= 0) {
        file.leads[idx] = { ...file.leads[idx]!, crmSyncAt: new Date().toISOString() };
      }
    }
  }
  await writeWorkFilePartial(file);

  await appendWorkSyncLog({
    connector: "hubspot",
    action: "sync_hubspot",
    detail: `imported=${imported} pushed=${pushed}`,
  });

  return { ok: true, demo: false, imported, pushed, detail: `${imported} imported · ${pushed} pushed` };
}

export function crmSyncBadgeForLead(lead: WorkLead): "synced" | "stale" | "conflict" | "local_only" {
  if (!lead.crmSyncAt) return "local_only";
  const age = Date.now() - Date.parse(lead.crmSyncAt);
  if (age > 7 * 86400000) return "stale";
  if (lead.tags?.includes("crm-conflict")) return "conflict";
  return "synced";
}
