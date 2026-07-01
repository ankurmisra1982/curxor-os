"use client";

import { useEffect, useState } from "react";

import { PRIVACY_EGRESS_MESSAGE } from "@/lib/privacy-messages";

export function EgressAirgapBanner() {
  const [paused, setPaused] = useState(false);
  const [privacyBlocked, setPrivacyBlocked] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/shell/sovereignty", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        egress: { paused: boolean; privacyBlocked?: boolean; reason?: string };
      };
      setPaused(data.egress.paused);
      setPrivacyBlocked(data.egress.privacyBlocked === true);
      setReason(data.egress.reason ?? null);
    })();
  }, []);

  if (!paused) return null;

  return (
    <div
      className={`shrink-0 border-b px-4 py-2 font-sans text-xs ${
        privacyBlocked
          ? "border-amber-400/40 bg-amber-950/30 text-amber-100"
          : "border-amber-500/30 bg-amber-950/20 text-amber-200"
      }`}
      role="status"
    >
      {privacyBlocked ? (
        <>
          <strong className="font-medium">Outbound paused — privacy</strong>
          <span className="ml-2 opacity-90">
            {reason ?? PRIVACY_EGRESS_MESSAGE} Open Settings → Appearance to acknowledge.
          </span>
        </>
      ) : (
        <>
          <strong className="font-medium">Physical egress (eno2) paused.</strong>
          <span className="ml-2 opacity-90">
            Outbound actions wait — cognition stays on this box.
            {reason ? ` (${reason})` : ""}
          </span>
        </>
      )}
    </div>
  );
}
