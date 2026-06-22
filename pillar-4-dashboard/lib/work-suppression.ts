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

const BOUNCE_MAIL_RE =
  /\b(undeliverable|delivery failed|mail delivery failed|returned mail|failure notice|delivery status notification|550 |553 |mailbox unavailable|user unknown)\b/i;

function extractBounceRecipient(subject: string, snippet: string, from: string): string | null {
  const text = `${subject} ${snippet}`;
  const angle = text.match(/<([^>\s]+@[^>\s]+)>/);
  if (angle?.[1]) return angle[1].toLowerCase();
  const bare = text.match(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i);
  if (bare?.[1] && !bare[1].includes("mailer-daemon")) return bare[1].toLowerCase();
  if (from.includes("@") && !from.includes("mailer-daemon")) return from.trim().toLowerCase();
  return null;
}

export async function scanMailIndexForBounces(
  entries: Array<{ from: string; subject: string; snippet: string }>,
): Promise<number> {
  let added = 0;
  for (const entry of entries) {
    const text = `${entry.subject} ${entry.snippet}`;
    if (!BOUNCE_MAIL_RE.test(text)) continue;
    const email = extractBounceRecipient(entry.subject, entry.snippet, entry.from);
    if (!email) continue;
    const prior = await isEmailSuppressed(email);
    if (prior) continue;
    await addSuppression(email, entry.subject.slice(0, 120), "bounce");
    added += 1;
  }
  return added;
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
