import "server-only";

import { loadDigitalEnv } from "./digital-env";

export type WorkWebhookEvent =
  | "lead.stage_changed"
  | "sequence.first_send"
  | "mail.interested"
  | "mail.assigned";

export async function emitWorkWebhook(
  event: WorkWebhookEvent,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; demo: boolean; detail: string }> {
  const env = await loadDigitalEnv();
  const url = env.N8N_WEBHOOK_URL?.trim();

  const body = {
    event,
    timestamp: new Date().toISOString(),
    source: "work-claw",
    ...payload,
  };

  if (!url) {
    return { ok: true, demo: true, detail: "No N8N_WEBHOOK_URL — event skipped (demo)" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      const detail = `Webhook HTTP ${res.status}: ${text.slice(0, 120)}`;
      const { appendWorkSyncLog } = await import("./work-store");
      await appendWorkSyncLog({ connector: "n8n", action: event, detail });
      return { ok: false, demo: false, detail };
    }
    return { ok: true, demo: false, detail: `Emitted ${event}` };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Webhook failed";
    const { appendWorkSyncLog } = await import("./work-store");
    await appendWorkSyncLog({ connector: "n8n", action: event, detail });
    return { ok: false, demo: false, detail };
  }
}
