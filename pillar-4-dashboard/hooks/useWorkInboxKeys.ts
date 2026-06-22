"use client";

import { useEffect } from "react";

import type { MailThread } from "@/lib/work-mail-threads";
import type { ReplyIntent, WorkLead } from "@/lib/work-queue-types";

interface UseWorkInboxKeysOptions {
  enabled?: boolean;
  threads: MailThread[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onDraftReply: (mailId: string) => void;
  onAssign: (mailId: string, leadId: string) => void;
  onSnooze: (mailId: string) => void;
  onArchive: (mailId: string) => void;
  onMarkDone: (mailId: string) => void;
  onTagIntent: (mailId: string, intent: ReplyIntent) => void;
  leads: WorkLead[];
  defaultLeadId?: string;
}

const INTENT_KEYS: Record<string, ReplyIntent> = {
  "1": "interested",
  "2": "objection",
  "3": "ooo",
  "4": "neutral",
  "5": "unknown",
};

export function useWorkInboxKeys({
  enabled = true,
  threads,
  selectedIndex,
  onSelectIndex,
  onDraftReply,
  onAssign,
  onSnooze,
  onArchive,
  onMarkDone,
  onTagIntent,
  leads,
  defaultLeadId,
}: UseWorkInboxKeysOptions): void {
  useEffect(() => {
    if (!enabled || threads.length === 0) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;

      const thread = threads[selectedIndex];
      const mailId = thread?.messages[thread.messages.length - 1]?.id;
      if (!mailId) return;

      if (e.key === "j") {
        e.preventDefault();
        onSelectIndex(Math.min(selectedIndex + 1, threads.length - 1));
        return;
      }
      if (e.key === "k") {
        e.preventDefault();
        onSelectIndex(Math.max(selectedIndex - 1, 0));
        return;
      }
      if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onDraftReply(mailId);
        return;
      }
      if (e.key === "a") {
        e.preventDefault();
        const leadId = defaultLeadId ?? leads[0]?.id;
        if (leadId) onAssign(mailId, leadId);
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        onSnooze(mailId);
        return;
      }
      if (e.key === "e") {
        e.preventDefault();
        onArchive(mailId);
        return;
      }
      if (e.key === "d") {
        e.preventDefault();
        onMarkDone(mailId);
        return;
      }
      const intent = INTENT_KEYS[e.key];
      if (intent) {
        e.preventDefault();
        onTagIntent(mailId, intent);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    defaultLeadId,
    enabled,
    leads,
    onArchive,
    onAssign,
    onDraftReply,
    onMarkDone,
    onSelectIndex,
    onSnooze,
    onTagIntent,
    selectedIndex,
    threads,
  ]);
}
