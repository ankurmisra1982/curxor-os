"use client";

import { useCallback, useState } from "react";

interface PrivacyAcknowledgmentPanelProps {
  acknowledged: boolean;
  deferred: boolean;
  onAcknowledged: () => void;
}

export function PrivacyAcknowledgmentPanel({
  acknowledged,
  deferred,
  onAcknowledged,
}: PrivacyAcknowledgmentPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acknowledge = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/privacy-ack", { method: "POST" });
      if (!res.ok) throw new Error("Could not save");
      onAcknowledged();
    } catch {
      setError("Could not save acknowledgment. Try again.");
    } finally {
      setBusy(false);
    }
  }, [onAcknowledged]);

  if (acknowledged) {
    return (
      <section className="border border-emerald-500/30 bg-emerald-950/10 p-4">
        <h3 className="font-sans text-sm font-medium text-stark">Privacy & outbound data</h3>
        <p className="mt-1 font-sans text-xs text-muted">
          You acknowledged that outbound connections (brokers, social, mail) only leave this box when you
          connect them and approve actions.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-amber-400/40 bg-amber-950/20 p-4">
      <h3 className="font-sans text-sm font-medium text-amber-100">Privacy required for outbound connections</h3>
      <p className="mt-2 font-sans text-xs leading-relaxed text-amber-100/90">
        {deferred
          ? "You chose “Remind me later” during Your Box setup. Outbound integrations stay paused until you acknowledge below."
          : "Before linking brokers, social accounts, or mail, confirm you understand what stays local on your box."}
      </p>
      <p className="mt-2 font-sans text-xs text-muted">
        Chats and reasoning stay on this appliance. Connected services (brokers, social, mail, and
        frontier LLM providers) only receive data when you explicitly connect them and approve actions.
      </p>
      {error ? <p className="mt-2 font-sans text-xs text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void acknowledge()}
        className="mt-4 border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-cursor-glow disabled:opacity-50"
      >
        {busy ? "Saving…" : "I understand — enable outbound connections"}
      </button>
    </section>
  );
}
