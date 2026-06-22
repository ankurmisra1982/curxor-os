import "server-only";

import { ensureWorkQueue } from "./work-store";
import type { OutboundSend, WorkSequence } from "./work-queue-types";
import { slaChipForIso } from "./work-sla";
import type { SlaChipLevel } from "./work-sla";

export type StallKind = "sequence_stuck" | "pending_approval" | "no_reply" | "bounce_risk";

export interface StallItem {
  id: string;
  kind: StallKind;
  title: string;
  detail: string;
  leadId: string | null;
  sequenceId: string | null;
  sendId: string | null;
  severity: "high" | "medium" | "low";
  stalledSince: string;
  slaLevel: SlaChipLevel;
  slaHours: number;
}

const STALL_DAYS = 5;

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return (Date.now() - Date.parse(iso)) / 86_400_000;
}

function sequenceStuck(seq: WorkSequence): boolean {
  if (seq.status !== "active") return false;
  const anchor = seq.steps[seq.currentStepIndex]?.scheduledAt ?? seq.activatedAt ?? seq.updatedAt;
  return daysSince(anchor) >= STALL_DAYS;
}

function stallRow(
  partial: Omit<StallItem, "slaLevel" | "slaHours">,
): StallItem {
  const slaHours = (Date.now() - Date.parse(partial.stalledSince)) / 3_600_000;
  return {
    ...partial,
    slaHours: Math.round(slaHours * 10) / 10,
    slaLevel: slaChipForIso(partial.stalledSince),
  };
}

export async function detectWorkStalls(): Promise<StallItem[]> {
  const file = await ensureWorkQueue();
  const items: StallItem[] = [];

  for (const seq of file.sequences) {
    if (!sequenceStuck(seq)) continue;
    const lead = file.leads.find((l) => l.id === seq.leadId);
    items.push(
      stallRow({
        id: `stall-seq-${seq.id}`,
        kind: "sequence_stuck",
        title: `Sequence stalled · ${lead?.name ?? seq.leadId}`,
        detail: `${seq.name} — no step progress in ${STALL_DAYS}+ days`,
        leadId: seq.leadId,
        sequenceId: seq.id,
        sendId: null,
        severity: "medium",
        stalledSince: seq.updatedAt,
      }),
    );
  }

  for (const send of file.sends.filter((s) => s.status === "pending_approval")) {
    items.push(
      stallRow({
        id: `stall-approval-${send.id}`,
        kind: "pending_approval",
        title: `Send awaiting approval · ${send.to}`,
        detail: send.subject.slice(0, 80),
        leadId: send.leadId,
        sequenceId: send.sequenceId,
        sendId: send.id,
        severity: "high",
        stalledSince: send.createdAt,
      }),
    );
  }

  for (const lead of file.leads.filter((l) => l.stage === "contacted")) {
    if (daysSince(lead.lastTouchAt) < STALL_DAYS) continue;
    items.push(
      stallRow({
        id: `stall-noreply-${lead.id}`,
        kind: "no_reply",
        title: `No reply · ${lead.name}`,
        detail: `${lead.email} — contacted ${Math.floor(daysSince(lead.lastTouchAt))}d ago`,
        leadId: lead.id,
        sequenceId: null,
        sendId: null,
        severity: "low",
        stalledSince: lead.lastTouchAt ?? lead.updatedAt,
      }),
    );
  }

  const bounceSends = file.sends.filter(
    (s: OutboundSend) => s.status === "failed" && /\bbounce|550|mailbox/i.test(s.error ?? ""),
  );
  for (const send of bounceSends.slice(0, 5)) {
    items.push(
      stallRow({
        id: `stall-bounce-${send.id}`,
        kind: "bounce_risk",
        title: `Bounce risk · ${send.to}`,
        detail: send.error?.slice(0, 100) ?? "Delivery failure",
        leadId: send.leadId,
        sequenceId: send.sequenceId,
        sendId: send.id,
        severity: "high",
        stalledSince: send.createdAt,
      }),
    );
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
