import "server-only";

import { handleBounceForLead, updateSendStatus } from "./work-store";
import { pauseSequencesOnReply } from "./work-send-executor";

const BOUNCE_RE = /\b(bounce|550|551|552|553|mailbox unavailable|user unknown|does not exist|rejected)\b/i;

export async function handleWorkEmailReceipt(receipt: {
  ok: boolean;
  tool?: string;
  error?: string | null;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (receipt.tool !== "work.email.send") return;
  const payload = receipt.payload ?? receipt.data ?? {};
  const sendId = typeof payload.send_id === "string" ? payload.send_id : "";
  if (sendId) {
    const error = receipt.ok ? null : receipt.error ?? "Send failed";
    await updateSendStatus(sendId, {
      status: receipt.ok ? "sent" : "failed",
      sentAt: receipt.ok ? new Date().toISOString() : null,
      error,
    });

    if (!receipt.ok && error && BOUNCE_RE.test(error)) {
      const { ensureWorkQueue } = await import("./work-store");
      const file = await ensureWorkQueue();
      const send = file.sends.find((s) => s.id === sendId);
      if (send?.leadId) {
        await handleBounceForLead(send.leadId, error);
        const { emitWorkXpEvent } = await import("./work-xp-events");
        await emitWorkXpEvent("approval_pending", { kind: "bounce", sendId, leadId: send.leadId });
      }
    }
  }

  const replyFrom = typeof payload.reply_from === "string" ? payload.reply_from : "";
  if (replyFrom) {
    await pauseSequencesOnReply(replyFrom);
    const leadEmail = replyFrom.trim().toLowerCase();
    const { ensureWorkQueue, updateLeadStage } = await import("./work-store");
    const file = await ensureWorkQueue();
    const lead = file.leads.find((l) => l.email === leadEmail);
    if (lead) await updateLeadStage(lead.id, "replied");
  }
}
