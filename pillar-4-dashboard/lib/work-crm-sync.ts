import "server-only";

import { readAppFreState } from "./app-fre-state";
import { createTwentyPerson, isTwentyConfiguredAsync, listTwentyPeople } from "./work-twenty-client";
import { appendWorkSyncLog, ensureWorkQueue, upsertLead } from "./work-store";
import type { WorkLead } from "./work-queue-types";

export type CrmConflictPolicy = "local_wins" | "remote_wins";
export type CrmBackend = "local" | "twenty";

export async function readCrmBackend(): Promise<CrmBackend> {
  const fre = await readAppFreState("my-work");
  const raw = fre.config.crmBackend;
  return raw === "twenty" ? "twenty" : "local";
}

export async function readCrmConflictPolicy(): Promise<CrmConflictPolicy> {
  const fre = await readAppFreState("my-work");
  const raw = fre.config.crmConflictPolicy;
  return raw === "remote_wins" ? "remote_wins" : "local_wins";
}

export async function getCrmStatus(): Promise<{
  backend: CrmBackend;
  configured: boolean;
  demo: boolean;
  localLeads: number;
  remotePeople: number;
  conflictPolicy: CrmConflictPolicy;
}> {
  const backend = await readCrmBackend();
  const configured = await isTwentyConfiguredAsync();
  const file = await ensureWorkQueue();
  const demo = !configured || backend === "local";

  let remotePeople = 0;
  if (configured && backend === "twenty") {
    const people = await listTwentyPeople();
    remotePeople = people.length;
  }

  return {
    backend,
    configured,
    demo,
    localLeads: file.leads.length,
    remotePeople: demo ? 3 : remotePeople,
    conflictPolicy: await readCrmConflictPolicy(),
  };
}

export async function syncLeadsToTwenty(): Promise<{ pushed: number; errors: string[] }> {
  const backend = await readCrmBackend();
  const configured = await isTwentyConfiguredAsync();
  const file = await ensureWorkQueue();
  const errors: string[] = [];
  let pushed = 0;

  if (backend !== "twenty" || !configured) {
    await appendWorkSyncLog({
      connector: "twenty",
      action: "sync_crm_push",
      detail: `Demo sync · ${file.leads.length} local leads (Twenty not configured)`,
    });
    return { pushed: 0, errors: [] };
  }

  const remote = await listTwentyPeople();
  const remoteEmails = new Set(remote.map((p) => p.email.toLowerCase()));

  for (const lead of file.leads) {
    if (!lead.email || remoteEmails.has(lead.email.toLowerCase())) continue;
    const created = await createTwentyPerson({ name: lead.name, email: lead.email });
    if (created) {
      pushed += 1;
      remoteEmails.add(lead.email.toLowerCase());
    } else {
      errors.push(`Failed to push ${lead.email}`);
      await appendWorkSyncLog({
        connector: "twenty",
        action: "sync_crm_push",
        detail: `Failed to push ${lead.email}`,
        leadId: lead.id,
        ok: false,
        error: "Twenty createPerson failed",
      });
    }
  }

  await appendWorkSyncLog({
    connector: "twenty",
    action: "sync_crm_push",
    detail: `Pushed ${pushed} lead(s) to Twenty${errors.length ? ` · ${errors.length} error(s)` : ""}`,
    ok: errors.length === 0,
    error: errors[0] ?? null,
  });

  return { pushed, errors };
}

export async function importFromTwenty(): Promise<{ imported: number; skipped: number }> {
  const backend = await readCrmBackend();
  const configured = await isTwentyConfiguredAsync();
  const policy = await readCrmConflictPolicy();
  const file = await ensureWorkQueue();

  if (backend !== "twenty" || !configured) {
    await appendWorkSyncLog({
      connector: "twenty",
      action: "sync_crm_pull",
      detail: "Demo import · Twenty not configured",
    });
    return { imported: 0, skipped: 0 };
  }

  const people = await listTwentyPeople();
  const existing = new Map(file.leads.map((l) => [l.email.toLowerCase(), l]));
  let imported = 0;
  let skipped = 0;

  for (const person of people) {
    if (!person.email) {
      skipped += 1;
      continue;
    }
    const key = person.email.toLowerCase();
    const local = existing.get(key);
    if (local && policy === "local_wins") {
      skipped += 1;
      continue;
    }
    if (local && policy === "remote_wins") {
      await upsertLead({ id: local.id, name: person.name, email: person.email, source: "twenty" });
      imported += 1;
      continue;
    }
    if (!local) {
      await upsertLead({ name: person.name, email: person.email, source: "twenty" });
      imported += 1;
    }
  }

  await appendWorkSyncLog({
    connector: "twenty",
    action: "sync_crm_pull",
    detail: `Imported ${imported} · skipped ${skipped}`,
  });

  return { imported, skipped };
}

export async function syncCrmBothWays(): Promise<{
  push: { pushed: number; errors: string[] };
  pull: { imported: number; skipped: number };
}> {
  const push = await syncLeadsToTwenty();
  const pull = await importFromTwenty();
  return { push, pull };
}
