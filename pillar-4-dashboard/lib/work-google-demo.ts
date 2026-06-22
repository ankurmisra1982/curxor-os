import type { WorkCalendarEventItem, WorkMailPreviewItem } from "./work-google-client";

export function getDemoMailPreview(): WorkMailPreviewItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-mail-1",
      from: "alex@edgecompute.ai",
      subject: "Re: CurXor pricing",
      snippet: "Thanks — interested in appliance tiers. Can we schedule a call?",
      receivedAt: now,
    },
    {
      id: "demo-mail-2",
      from: "notifications@calendar.local",
      subject: "Team standup moved to 10am",
      snippet: "Calendar update for today",
      receivedAt: now,
    },
  ];
}

export function getDemoCalendarEvents(): WorkCalendarEventItem[] {
  const start = new Date();
  start.setHours(start.getHours() + 2, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60_000);
  return [
    {
      id: "demo-cal-1",
      title: "Prospect call — EdgeCompute",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      attendees: ["alex@edgecompute.ai"],
    },
    {
      id: "demo-cal-2",
      title: "Outreach desk review",
      startAt: new Date(start.getTime() + 3 * 3600000).toISOString(),
      endAt: new Date(start.getTime() + 3.5 * 3600000).toISOString(),
      attendees: [],
    },
  ];
}
