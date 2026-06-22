import "server-only";

import { getDemoCalendarEvents } from "./work-google-demo";
import type { WorkCalendarEventItem, WorkMailPreviewItem } from "./work-google-client";

export interface WorkMicrosoftStatus {
  linked: boolean;
  demo: boolean;
  tenantHint: string | null;
  scopes: string;
}

export function isWorkMicrosoftConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim());
}

export async function getWorkMicrosoftStatus(): Promise<WorkMicrosoftStatus> {
  const configured = isWorkMicrosoftConfigured();
  return {
    linked: configured || process.env.CURXOR_WORK_M365_DEMO === "1",
    demo: !configured,
    tenantHint: configured ? "configured" : "demo",
    scopes: "Mail.Read, Calendars.Read",
  };
}

export async function fetchWorkMicrosoftMailPreview(limit = 5): Promise<{
  source: "microsoft" | "demo";
  messages: WorkMailPreviewItem[];
}> {
  const status = await getWorkMicrosoftStatus();
  if (status.demo) {
    const { getDemoMailPreview } = await import("./work-google-demo");
    return { source: "demo", messages: getDemoMailPreview().slice(0, limit) };
  }
  return { source: "microsoft", messages: [] };
}

export async function fetchWorkMicrosoftCalendarPreview(limit = 5): Promise<{
  source: "microsoft" | "demo";
  events: WorkCalendarEventItem[];
}> {
  const status = await getWorkMicrosoftStatus();
  if (status.demo) {
    return { source: "demo", events: getDemoCalendarEvents().slice(0, limit) };
  }
  return { source: "microsoft", events: [] };
}
