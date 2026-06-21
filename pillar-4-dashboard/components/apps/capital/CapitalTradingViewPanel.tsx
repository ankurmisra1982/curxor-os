"use client";

import { useCallback, useEffect, useState } from "react";

interface CapitalTradingViewPanelProps {
  webhookSecret: string | null;
  envSecretConfigured: boolean;
  onSecretChange: () => void;
}

function randomSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function CapitalTradingViewPanel({
  webhookSecret,
  envSecretConfigured,
  onSecretChange,
}: CapitalTradingViewPanelProps) {
  const [origin, setOrigin] = useState("");
  const [signal, setSignal] = useState("");
  const [secretDraft, setSecretDraft] = useState(webhookSecret ?? "");
  const activeSecret = webhookSecret?.trim() || (envSecretConfigured ? "(env CURXOR_CAPITAL_TV_SECRET)" : null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setSecretDraft(webhookSecret ?? "");
  }, [webhookSecret]);

  const webhookUrl = origin ? `${origin}/api/capital/tradingview` : "/api/capital/tradingview";

  const saveSecret = useCallback(async () => {
    const res = await fetch("/api/capital/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_tv_secret", secret: secretDraft.trim() || null }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setSignal(json.ok ? "Webhook secret saved" : json.error ?? "Save failed");
    if (json.ok) onSecretChange();
  }, [onSecretChange, secretDraft]);

  const rotateSecret = useCallback(async () => {
    const next = randomSecret();
    setSecretDraft(next);
    const res = await fetch("/api/capital/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_tv_secret", secret: next }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setSignal(json.ok ? "Secret rotated — update TradingView alert" : json.error ?? "Rotate failed");
    if (json.ok) onSecretChange();
  }, [onSecretChange]);

  const testPing = useCallback(async () => {
    const res = await fetch("/api/capital/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_tv_webhook", ticker: "SPY", qty: 1, actionTrade: "buy" }),
    });
    const json = (await res.json()) as { ok?: boolean; ack?: boolean; error?: string };
    setSignal(json.ok && json.ack ? "Test ping accepted (dry ack)" : json.error ?? "Ping failed");
  }, []);

  return (
    <div className="mt-3 space-y-2 border border-dashed border-line/60 p-3 font-mono text-[10px]">
      <p className="text-[10px] uppercase tracking-widest text-muted">TradingView webhook wizard</p>
      <div>
        <p className="text-muted">Webhook URL</p>
        <code className="block break-all text-stark">{webhookUrl}</code>
      </div>
      <div>
        <p className="text-muted">Header</p>
        <code className="text-stark">x-curxor-tv-secret: &lt;secret&gt;</code>
      </div>
      <div>
        <p className="mb-1 text-muted">Secret (desk override · env fallback)</p>
        <input
          className="w-full border border-line bg-transparent px-2 py-1 text-stark"
          value={secretDraft}
          onChange={(e) => setSecretDraft(e.target.value)}
          placeholder={envSecretConfigured ? "Using env unless set here" : "Set secret for alert ingress"}
        />
        <p className="mt-1 text-muted">
          Active: {activeSecret ? `${String(activeSecret).slice(0, 8)}…` : "not configured"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveSecret()}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark"
        >
          Save secret
        </button>
        <button
          type="button"
          onClick={() => void rotateSecret()}
          className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark"
        >
          Rotate
        </button>
        <button
          type="button"
          onClick={() => void testPing()}
          className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow"
        >
          Test ping
        </button>
      </div>
      {signal ? <p className="text-muted">{signal}</p> : null}
      <p className="text-[9px] text-muted">
        JSON body: {"{ \"ticker\": \"SPY\", \"action\": \"buy\", \"qty\": 1 }"} · routes through local risk guard
      </p>
    </div>
  );
}
