import "server-only";

import { appendAgentAudit } from "./work-agent-audit";
import { upsertLead } from "./work-store";
import { emitWorkXpEvent } from "./work-xp-events";
import type { WorkLead } from "./work-queue-types";

export type HandoffSourceClaw = "my-content" | "my-capital" | "mesh";

export interface WorkHandoffPayload {
  source: HandoffSourceClaw;
  name: string;
  email: string;
  company?: string;
  title?: string;
  notes?: string;
  tags?: string[];
  contextLabel?: string;
}

export interface WorkHandoffResult {
  ok: boolean;
  lead?: WorkLead;
  created: boolean;
  error?: string;
}

export async function handoffToWork(payload: WorkHandoffPayload): Promise<WorkHandoffResult> {
  const email = payload.email?.trim().toLowerCase();
  const name = payload.name?.trim();
  if (!email || !name) {
    return { ok: false, created: false, error: "name and email required" };
  }

  const lead = await upsertLead({
    name,
    email,
    company: payload.company?.trim() ?? "",
    title: payload.title?.trim() ?? "",
    notes: [
      payload.notes?.trim() ?? "",
      payload.contextLabel ? `Handoff from ${payload.source}: ${payload.contextLabel}` : `Handoff from ${payload.source}`,
    ]
      .filter(Boolean)
      .join("\n"),
    tags: [...(payload.tags ?? []), `handoff:${payload.source}`],
    source: `handoff:${payload.source}`,
  });

  await appendAgentAudit({
    kind: "handoff",
    source: payload.source,
    leadId: lead.id,
    note: payload.contextLabel ?? `Cross-claw handoff from ${payload.source}`,
  });

  await emitWorkXpEvent("handoff_received", {
    source: payload.source,
    leadId: lead.id,
  });

  return { ok: true, lead, created: true };
}
