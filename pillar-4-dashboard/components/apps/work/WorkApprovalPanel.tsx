"use client";

import { useState } from "react";

import type { OutboundSend } from "@/lib/work-queue-types";

interface WorkApprovalPanelProps {
  sends: OutboundSend[];
  onApprove: (sendId: string) => Promise<void>;
  onReject: (sendId: string) => Promise<void>;
  onRefresh: () => void;
}

export function WorkApprovalPanel({ sends, onApprove, onReject, onRefresh }: WorkApprovalPanelProps) {
  const pending = sends.filter((s) => s.status === "pending_approval");
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No pending approvals — enable CURXOR_WORK_REQUIRE_APPROVAL=1 or use approval gate.
      </p>
    );
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      {pending.map((send) => (
        <div key={send.id} className="border border-cursor-glow/40 px-3 py-2">
          <p className="text-stark">{send.to}</p>
          <p className="text-muted">{send.subject}</p>
          <p className="mt-1 line-clamp-3 text-muted">{send.body}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busyId === send.id}
              onClick={() => void run(send.id, () => onApprove(send.id))}
              className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busyId === send.id}
              onClick={() => void run(send.id, () => onReject(send.id))}
              className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
