import "server-only";

import { getDemoCalendarEvents, getDemoMailPreview } from "./work-google-demo";
import type { WorkCalendarEventItem, WorkMailPreviewItem } from "./work-google-client";
import { getWorkMicrosoftAccessToken, isWorkMicrosoftLinked } from "./work-microsoft-oauth";

export interface WorkMicrosoftStatus {
  linked: boolean;
  demo: boolean;
  tenantHint: string | null;
  scopes: string;
  clientConfigured: boolean;
}

export function isWorkMicrosoftConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim());
}

export async function getWorkMicrosoftStatus(): Promise<WorkMicrosoftStatus> {
  const configured = isWorkMicrosoftConfigured();
  const linked = await isWorkMicrosoftLinked();
  return {
    linked: linked || process.env.CURXOR_WORK_M365_DEMO === "1",
    demo: !linked,
    tenantHint: configured ? "configured" : "demo",
    scopes: "Mail.Read, Calendars.Read",
    clientConfigured: configured,
  };
}

export async function fetchWorkMicrosoftMailPreview(limit = 5): Promise<{
  source: "microsoft" | "demo";
  messages: WorkMailPreviewItem[];
}> {
  const token = await getWorkMicrosoftAccessToken();
  if (!token) {
    return { source: "demo", messages: getDemoMailPreview().slice(0, limit) };
  }

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,from,bodyPreview,receivedDateTime`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return { source: "demo", messages: getDemoMailPreview().slice(0, limit) };

    const data = (await res.json()) as {
      value?: Array<{
        id: string;
        subject?: string;
        bodyPreview?: string;
        receivedDateTime?: string;
        from?: { emailAddress?: { address?: string } };
      }>;
    };

    const messages: WorkMailPreviewItem[] = (data.value ?? []).map((m) => ({
      id: m.id,
      from: m.from?.emailAddress?.address ?? "",
      subject: m.subject ?? "(no subject)",
      snippet: m.bodyPreview ?? "",
      receivedAt: m.receivedDateTime ?? new Date().toISOString(),
    }));

    return { source: "microsoft", messages: messages.length > 0 ? messages : getDemoMailPreview().slice(0, limit) };
  } catch {
    return { source: "demo", messages: getDemoMailPreview().slice(0, limit) };
  }
}

export async function fetchWorkMicrosoftCalendarPreview(limit = 5): Promise<{
  source: "microsoft" | "demo";
  events: WorkCalendarEventItem[];
}> {
  const token = await getWorkMicrosoftAccessToken();
  if (!token) {
    return { source: "demo", events: getDemoCalendarEvents().slice(0, limit) };
  }

  const start = new Date().toISOString();
  const end = new Date(Date.now() + 7 * 86400000).toISOString();

  try {
    const params = new URLSearchParams({
      startDateTime: start,
      endDateTime: end,
      $top: String(limit),
      $orderby: "start/dateTime",
    });
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
      cache: "no-store",
    });
    if (!res.ok) return { source: "demo", events: getDemoCalendarEvents().slice(0, limit) };

    const data = (await res.json()) as {
      value?: Array<{
        id: string;
        subject?: string;
        start?: { dateTime?: string };
        end?: { dateTime?: string };
        attendees?: Array<{ emailAddress?: { address?: string } }>;
      }>;
    };

    const events: WorkCalendarEventItem[] = (data.value ?? []).map((e) => ({
      id: e.id,
      title: e.subject ?? "Event",
      startAt: e.start?.dateTime ?? start,
      endAt: e.end?.dateTime ?? end,
      attendees: (e.attendees ?? []).map((a) => a.emailAddress?.address ?? "").filter(Boolean),
    }));

    return { source: "microsoft", events: events.length > 0 ? events : getDemoCalendarEvents().slice(0, limit) };
  } catch {
    return { source: "demo", events: getDemoCalendarEvents().slice(0, limit) };
  }
}
