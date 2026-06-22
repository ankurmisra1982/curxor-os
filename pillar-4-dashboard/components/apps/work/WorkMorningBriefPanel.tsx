"use client";

import { useEffect, useState } from "react";

interface WorkMorningBriefPanelProps {
  onLoad?: (brief: string) => void;
}

export function WorkMorningBriefPanel({ onLoad }: WorkMorningBriefPanelProps) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/work/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "morning_brief" }),
        });
        const json = (await res.json()) as { brief?: string };
        if (!cancelled && json.brief) {
          setBrief(json.brief);
          onLoad?.(json.brief);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onLoad]);

  if (loading) {
    return <p className="font-mono text-[10px] text-muted">Loading morning brief…</p>;
  }

  if (!brief) {
    return <p className="font-mono text-[10px] text-muted">Morning brief unavailable.</p>;
  }

  return <pre className="whitespace-pre-wrap font-mono text-[11px] text-stark">{brief}</pre>;
}
