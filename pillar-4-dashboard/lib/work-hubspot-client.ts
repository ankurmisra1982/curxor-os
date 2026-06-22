import "server-only";

import { loadDigitalEnv } from "./digital-env";

export interface HubSpotContactPreview {
  id: string;
  email: string;
  name: string;
  company: string;
}

export async function hubspotPreviewContacts(limit = 10): Promise<{
  ok: boolean;
  demo: boolean;
  contacts: HubSpotContactPreview[];
  detail: string;
}> {
  const env = await loadDigitalEnv();
  const token = env.HUBSPOT_ACCESS_TOKEN?.trim();

  if (!token) {
    return {
      ok: true,
      demo: true,
      contacts: [
        { id: "demo-1", email: "hubspot-demo@example.com", name: "HubSpot Demo", company: "Demo Inc" },
      ],
      detail: "Demo contacts — set HUBSPOT_ACCESS_TOKEN for live preview",
    };
  }

  try {
    const res = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,company`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return { ok: false, demo: false, contacts: [], detail: `HubSpot HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      results?: Array<{ id: string; properties?: Record<string, string> }>;
    };
    const contacts = (data.results ?? []).map((r) => ({
      id: r.id,
      email: r.properties?.email ?? "",
      name: [r.properties?.firstname, r.properties?.lastname].filter(Boolean).join(" ") || "Contact",
      company: r.properties?.company ?? "",
    }));
    return { ok: true, demo: false, contacts, detail: `${contacts.length} contacts` };
  } catch (err) {
    return {
      ok: false,
      demo: false,
      contacts: [],
      detail: err instanceof Error ? err.message : "HubSpot error",
    };
  }
}
