import "server-only";

import { ensureWorkQueue, writeWorkFilePartial } from "./work-store";

export interface SuppressionEntry {
  email: string;
  reason: string;
  at: string;
  source: "bounce" | "failed" | "manual";
}

export async function listSuppressedEmails(): Promise<SuppressionEntry[]> {
  const file = await ensureWorkQueue();
  return file.suppressionList ?? [];
}

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const list = await listSuppressedEmails();
  return list.some((e) => e.email.toLowerCase() === normalized);
}

export async function addSuppression(
  email: string,
  reason: string,
  source: SuppressionEntry["source"] = "manual",
): Promise<SuppressionEntry> {
  const file = await ensureWorkQueue();
  const normalized = email.trim().toLowerCase();
  if (!file.suppressionList) file.suppressionList = [];
  const existing = file.suppressionList.find((e) => e.email.toLowerCase() === normalized);
  if (existing) return existing;
  const entry: SuppressionEntry = {
    email: normalized,
    reason: reason.slice(0, 200),
    at: new Date().toISOString(),
    source,
  };
  file.suppressionList.unshift(entry);
  file.suppressionList = file.suppressionList.slice(0, 500);
  await writeWorkFilePartial(file);
  return entry;
}

export async function removeSuppression(email: string): Promise<boolean> {
  const file = await ensureWorkQueue();
  const normalized = email.trim().toLowerCase();
  const before = file.suppressionList?.length ?? 0;
  file.suppressionList = (file.suppressionList ?? []).filter((e) => e.email.toLowerCase() !== normalized);
  if (file.suppressionList.length === before) return false;
  await writeWorkFilePartial(file);
  return true;
}

export async function scanFailedSendsForSuppression(): Promise<number> {
  const file = await ensureWorkQueue();
  let added = 0;
  for (const send of file.sends) {
    if (send.status !== "failed") continue;
    const err = (send.error ?? "").toLowerCase();
    const bounceLike = err.includes("bounce") || err.includes("550") || err.includes("undeliverable");
    if (!bounceLike) continue;
    const entry = await addSuppression(send.to, send.error ?? "failed send", "failed");
    if (entry) added += 1;
  }
  return added;
}
