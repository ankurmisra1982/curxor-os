import "server-only";

import { getCrmStatus } from "./work-crm-sync";
import { isTwentyConfiguredAsync, listTwentyPeople } from "./work-twenty-client";
import { ensureWorkQueue } from "./work-store";
import type { WorkLead } from "./work-queue-types";

export type CrmConflictField = "name" | "company" | "title" | "stage";

export interface CrmConflict {
  id: string;
  email: string;
  field: CrmConflictField;
  localValue: string;
  remoteValue: string;
  leadId: string;
  resolvedAt: string | null;
}

const DEMO_REMOTE: Array<{ email: string; name: string; company: string; title: string }> = [
  { email: "alex@edgecompute.ai", name: "Alex Chen", company: "EdgeCompute", title: "CTO" },
  { email: "sam@northwind.io", name: "Sam Rivera", company: "Northwind Labs", title: "Founder" },
  { email: "jordan@demo.local", name: "Jordan Lee", company: "Demo Corp", title: "VP Sales" },
];

function conflictId(email: string, field: CrmConflictField): string {
  return `${email.toLowerCase()}::${field}`;
}

export async function listCrmConflicts(): Promise<CrmConflict[]> {
  const [file, crm] = await Promise.all([ensureWorkQueue(), getCrmStatus()]);
  const resolved = new Set((file.crmConflictResolutions ?? []).map((r) => r.id));
  const conflicts: CrmConflict[] = [];

  const remoteRows =
    crm.demo || !crm.configured
      ? DEMO_REMOTE
      : (await isTwentyConfiguredAsync())
        ? (await listTwentyPeople(25)).map((p) => ({
            email: p.email,
            name: p.name,
            company: "Twenty",
            title: "—",
          }))
        : file.leads.slice(0, 5).map((l) => ({
            email: l.email,
            name: `${l.name} (remote)`,
            company: l.company || "—",
            title: l.title || "—",
          }));

  for (const lead of file.leads) {
    const remote = remoteRows.find((r) => r.email.toLowerCase() === lead.email.toLowerCase());
    if (!remote) continue;
    const pairs: Array<[CrmConflictField, string, string]> = [
      ["name", lead.name, remote.name],
      ["company", lead.company, remote.company],
      ["title", lead.title, remote.title],
    ];
    for (const [field, localValue, remoteValue] of pairs) {
      if (!localValue?.trim() || !remoteValue?.trim()) continue;
      if (localValue.trim() === remoteValue.trim()) continue;
      const id = conflictId(lead.email, field);
      if (resolved.has(id)) continue;
      conflicts.push({
        id,
        email: lead.email,
        field,
        localValue,
        remoteValue,
        leadId: lead.id,
        resolvedAt: null,
      });
    }
  }
  return conflicts;
}

export async function resolveCrmConflict(
  conflictIdRaw: string,
  winner: "local" | "remote",
): Promise<{ ok: boolean; lead?: WorkLead }> {
  const file = await ensureWorkQueue();
  const conflicts = await listCrmConflicts();
  const row = conflicts.find((c) => c.id === conflictIdRaw);
  if (!row) return { ok: false };

  const leadIdx = file.leads.findIndex((l) => l.id === row.leadId);
  if (leadIdx < 0) return { ok: false };

  if (winner === "remote") {
    const updated = { ...file.leads[leadIdx]! };
    if (row.field === "name") updated.name = row.remoteValue;
    if (row.field === "company") updated.company = row.remoteValue;
    if (row.field === "title") updated.title = row.remoteValue;
    updated.updatedAt = new Date().toISOString();
    file.leads[leadIdx] = updated;
  }

  file.crmConflictResolutions = [
    ...(file.crmConflictResolutions ?? []),
    { id: conflictIdRaw, winner, at: new Date().toISOString() },
  ];
  const { writeWorkFilePartial } = await import("./work-store");
  await writeWorkFilePartial(file);
  return { ok: true, lead: file.leads[leadIdx] };
}
