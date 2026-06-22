import "server-only";

import { ensureWorkQueue, writeWorkFilePartial } from "./work-store";
import type { MailIndexEntry } from "./work-queue-types";

export async function setMailInternalNote(mailId: string, note: string): Promise<MailIndexEntry | null> {
  const file = await ensureWorkQueue();
  const idx = file.mailIndex.findIndex((m) => m.id === mailId);
  if (idx < 0) return null;
  const trimmed = note.trim();
  file.mailIndex[idx] = {
    ...file.mailIndex[idx]!,
    internalNote: trimmed || null,
  };
  await writeWorkFilePartial(file);
  return file.mailIndex[idx]!;
}

export async function getMailInternalNote(mailId: string): Promise<string | null> {
  const file = await ensureWorkQueue();
  const row = file.mailIndex.find((m) => m.id === mailId);
  return row?.internalNote ?? null;
}
