import "server-only";

import { appendWorkSyncLog, ensureWorkQueue, upsertLead, writeWorkFilePartial } from "./work-store";
import type { WorkLead } from "./work-queue-types";
import { isWorkHubSpotLinked, resolveHubSpotAccessToken } from "./work-hubspot-oauth";

export interface HubSpotSyncResult {
  ok: boolean;
  demo: boolean;
  imported: number;
  pushed: number;
  detail: string;
  oauthLinked?: boolean;
}

async function hubspotFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await resolveHubSpotAccessToken();
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

/** Webhook pull stub — records inbound event for operator timeline (live webhook deferred). */
export async function pullHubSpotWebhookStub(): Promise<{ ok: boolean; detail: string }> {
  const linked = await isWorkHubSpotLinked();
  await appendWorkSyncLog({
    connector: "hubspot",
    action: "webhook_pull_stub",
    detail: linked ? "Webhook pull stub — no pending events" : "Demo webhook stub — OAuth not linked",
    ok: true,
  });
  return {
    ok: true,
    detail: linked ? "HubSpot webhook pull stub (no events)" : "Demo webhook pull stub",
  };
}

export async function syncHubSpotLeads(): Promise<HubSpotSyncResult> {
  const token = await resolveHubSpotAccessToken();
  const oauthLinked = await isWorkHubSpotLinked();

  if (!token) {
    const file = await ensureWorkQueue();
    const demoImported = Math.min(2, file.leads.length);
    const demoPushed = Math.min(1, file.leads.filter((l) => !["won", "lost"].includes(l.stage)).length);
    for (const lead of file.leads.slice(0, demoImported)) {
      await appendWorkSyncLog({
        connector: "hubspot",
        action: "sync_hubspot",
        detail: `demo import · ${lead.email}`,
        leadId: lead.id,
        ok: true,
      });
    }
    if (demoPushed > 0) {
      const pushLead = file.leads.find((l) => !["won", "lost"].includes(l.stage));
      if (pushLead) {
        await appendWorkSyncLog({
          connector: "hubspot",
          action: "sync_hubspot_push",
          detail: `demo push · ${pushLead.email}`,
          leadId: pushLead.id,
          ok: true,
        });
      }
    }
    await appendWorkSyncLog({
      connector: "hubspot",
      action: "sync_hubspot",
      detail: `demo · imported=${demoImported} pushed=${demoPushed}`,
      ok: true,
    });
    return {
      ok: true,
      demo: true,
      imported: demoImported,
      pushed: demoPushed,
      oauthLinked: false,
      detail: "Demo sync — link HubSpot OAuth or set HUBSPOT_ACCESS_TOKEN",
    };
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
      const lead = await upsertLead({
        name,
        email,
        company: row.properties?.company ?? "",
        title: row.properties?.jobtitle ?? "",
        source: "hubspot",
      });
      imported += 1;
      await appendWorkSyncLog({
        connector: "hubspot",
        action: "sync_hubspot_pull",
        detail: `imported ${email}`,
        leadId: lead.id,
        ok: true,
      });
    }
  } else {
    await appendWorkSyncLog({
      connector: "hubspot",
      action: "sync_hubspot_pull",
      detail: "HubSpot pull failed",
      ok: false,
      error: pullRes ? `HTTP ${pullRes.status}` : "No token",
    });
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
      await appendWorkSyncLog({
        connector: "hubspot",
        action: "sync_hubspot_push",
        detail: `pushed ${lead.email}`,
        leadId: lead.id,
        ok: true,
      });
    } else {
      await appendWorkSyncLog({
        connector: "hubspot",
        action: "sync_hubspot_push",
        detail: `push failed ${lead.email}`,
        leadId: lead.id,
        ok: false,
        error: pushRes ? `HTTP ${pushRes.status}` : "No response",
      });
    }
  }
  await writeWorkFilePartial(file);

  await appendWorkSyncLog({
    connector: "hubspot",
    action: "sync_hubspot",
    detail: `imported=${imported} pushed=${pushed}${oauthLinked ? " · oauth" : ""}`,
    ok: imported > 0 || pushed > 0,
  });

  return {
    ok: true,
    demo: false,
    imported,
    pushed,
    oauthLinked,
    detail: `${imported} imported · ${pushed} pushed`,
  };
}

export function crmSyncBadgeForLead(lead: WorkLead): "synced" | "stale" | "conflict" | "local_only" {
  if (!lead.crmSyncAt) return "local_only";
  const age = Date.now() - Date.parse(lead.crmSyncAt);
  if (age > 7 * 86400000) return "stale";
  if (lead.tags?.includes("crm-conflict")) return "conflict";
  return "synced";
}
