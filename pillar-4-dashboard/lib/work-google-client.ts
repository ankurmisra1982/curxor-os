import "server-only";

import { getWorkGoogleAccessToken } from "./work-google-oauth";
import { getDemoCalendarEvents, getDemoMailPreview } from "./work-google-demo";

export interface WorkMailPreviewItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

export interface WorkCalendarEventItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  attendees: string[];
}

export async function fetchWorkMailPreview(maxResults = 5): Promise<{
  source: "live" | "demo";
  messages: WorkMailPreviewItem[];
}> {
  const token = await getWorkGoogleAccessToken();
  if (!token) {
    return { source: "demo", messages: getDemoMailPreview() };
  }

  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return { source: "demo", messages: getDemoMailPreview() };

    const data = (await res.json()) as { messages?: Array<{ id: string }> };
    const ids = (data.messages ?? []).slice(0, maxResults);
    const messages: WorkMailPreviewItem[] = [];

    for (const m of ids) {
      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!detail.ok) continue;
      const msg = (await detail.json()) as {
        id: string;
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = msg.payload?.headers ?? [];
      const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "(no subject)";
      const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
      messages.push({
        id: msg.id,
        from,
        subject,
        snippet: msg.snippet ?? "",
        receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : new Date().toISOString(),
      });
    }

    return { source: "live", messages: messages.length > 0 ? messages : getDemoMailPreview() };
  } catch {
    return { source: "demo", messages: getDemoMailPreview() };
  }
}

export async function fetchWorkCalendarPreview(maxResults = 5): Promise<{
  source: "live" | "demo";
  events: WorkCalendarEventItem[];
}> {
  const token = await getWorkGoogleAccessToken();
  if (!token) {
    return { source: "demo", events: getDemoCalendarEvents() };
  }

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 7 * 86400000).toISOString();

  try {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults: String(maxResults),
      singleEvents: "true",
      orderBy: "startTime",
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return { source: "demo", events: getDemoCalendarEvents() };

    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: Array<{ email?: string }>;
      }>;
    };

    const events: WorkCalendarEventItem[] = (data.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? "(untitled)",
      startAt: e.start?.dateTime ?? e.start?.date ?? timeMin,
      endAt: e.end?.dateTime ?? e.end?.date ?? timeMin,
      attendees: (e.attendees ?? []).map((a) => a.email ?? "").filter(Boolean),
    }));

    return { source: "live", events: events.length > 0 ? events : getDemoCalendarEvents() };
  } catch {
    return { source: "demo", events: getDemoCalendarEvents() };
  }
}
