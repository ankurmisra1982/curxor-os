import "server-only";

import { loadDigitalEnv } from "./digital-env";
import { appendWorkSyncLog } from "./work-store";

export interface BookMeetingResult {
  ok: boolean;
  demo: boolean;
  detail: string;
  bookingId?: string;
}

export async function bookMeeting(input: {
  leadEmail: string;
  leadName: string;
  slotHint?: string;
}): Promise<BookMeetingResult> {
  const env = await loadDigitalEnv();
  const webhookUrl = env.CALCOM_WEBHOOK_URL?.trim();

  const payload = {
    event: "book_meeting",
    email: input.leadEmail,
    name: input.leadName,
    slot_hint: input.slotHint ?? "next_available",
    source: "work-claw",
  };

  if (!webhookUrl) {
    await appendWorkSyncLog({
      connector: "calcom",
      action: "book_meeting",
      detail: `Demo log · ${input.leadName} <${input.leadEmail}>`,
    });
    return {
      ok: true,
      demo: true,
      detail: "Demo booking logged — set CALCOM_WEBHOOK_URL for live Cal.com",
      bookingId: `DEMO-${Date.now()}`,
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await res.text();
    await appendWorkSyncLog({
      connector: "calcom",
      action: "book_meeting",
      detail: res.ok ? `Booked · ${input.leadEmail}` : `HTTP ${res.status}: ${text.slice(0, 120)}`,
    });
    return {
      ok: res.ok,
      demo: false,
      detail: res.ok ? "Meeting booking sent to Cal.com webhook" : `Webhook failed: ${res.status}`,
      bookingId: res.ok ? `CAL-${Date.now()}` : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    await appendWorkSyncLog({ connector: "calcom", action: "book_meeting", detail: message });
    return { ok: false, demo: false, detail: message };
  }
}
