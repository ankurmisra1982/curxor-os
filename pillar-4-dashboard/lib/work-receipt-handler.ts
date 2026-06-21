import "server-only";

import { updateLeadStage, updateSendStatus } from "./work-store";
import { pauseSequencesOnReply } from "./work-send-executor";

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
    await updateSendStatus(sendId, {
      status: receipt.ok ? "sent" : "failed",
      sentAt: receipt.ok ? new Date().toISOString() : null,
      error: receipt.ok ? null : receipt.error ?? "Send failed",
    });
  }

  const replyFrom = typeof payload.reply_from === "string" ? payload.reply_from : "";
  if (replyFrom) {
    await pauseSequencesOnReply(replyFrom);
    const leadEmail = replyFrom.trim().toLowerCase();
    const { ensureWorkQueue } = await import("./work-store");
    const file = await ensureWorkQueue();
    const lead = file.leads.find((l) => l.email === leadEmail);
    if (lead) await updateLeadStage(lead.id, "replied");
  }
}
