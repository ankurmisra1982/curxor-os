"use client";

import { useCallback, useEffect, useState } from "react";

import type { HumanoidHubStatus } from "@/lib/humanoid-hub-types";

interface HumanoidRoutinesPanelProps {
  onStatus?: (message: string) => void;
}

export function HumanoidRoutinesPanel({ onStatus }: HumanoidRoutinesPanelProps) {
  const [data, setData] = useState<HumanoidHubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [composeText, setComposeText] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/humanoid/hub", { cache: "no-store" });
    if (!res.ok) return;
    setData((await res.json()) as HumanoidHubStatus);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle(routineId: string, enabled: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/humanoid/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_routine", routineId, enabled }),
      });
      const json = (await res.json()) as HumanoidHubStatus & { ok?: boolean };
      if (json.ok !== false) {
        setData(json);
        onStatus?.(enabled ? "Routine armed for pair day" : "Routine paused");
      }
    } finally {
      setBusy(false);
    }
  }

  async function compose() {
    const prompt = composeText.trim();
    if (!prompt) return;
    setBusy(true);
    try {
      const res = await fetch("/api/humanoid/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compose_routine", prompt }),
      });
      const json = (await res.json()) as HumanoidHubStatus & { ok?: boolean; error?: string; message?: string };
      if (json.ok !== false) {
        setData(json);
        setComposeText("");
        onStatus?.(json.message ?? "Routine composed and armed");
      } else {
        onStatus?.(json.error ?? "Compose failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        Instruction templates your humanoid will run after pairing — toggled locally today, executed on appliance
        tomorrow. Combine with Kin profiles for per-person tone.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {(data?.hub.routines ?? []).map((routine) => (
          <div
            key={routine.id}
            className={`border p-4 transition ${
              routine.enabled ? "border-cursor-glow/50 bg-cursor-glow/5" : "border-line bg-panel"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-stark">{routine.label}</p>
                <p className="mt-1 font-mono text-[9px] text-cursor-glow/80">Trigger · {routine.trigger}</p>
                {routine.source === "composed" ? (
                  <p className="mt-0.5 font-mono text-[8px] uppercase text-cursor-glow/70">Composed · NL</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggle(routine.id, !routine.enabled)}
                className={`shrink-0 border px-2 py-0.5 font-mono text-[9px] uppercase ${
                  routine.enabled
                    ? "border-cursor-glow text-cursor-glow"
                    : "border-line text-muted"
                }`}
              >
                {routine.enabled ? "Armed" : "Off"}
              </button>
            </div>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">{routine.description}</p>
            <p className="mt-2 font-mono text-[8px] uppercase text-amber-300/80">Preview · ships on pair</p>
          </div>
        ))}
      </div>

      <div className="border border-cursor-glow/20 bg-void/30 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Compose routine · plain language</p>
        <p className="mt-1 font-mono text-[9px] text-muted">
          Describe what the robot should do and when — e.g. &quot;When Grandma visits, use calm voice and offer tea in the
          living room.&quot;
        </p>
        <textarea
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
          rows={3}
          disabled={busy}
          placeholder="When the kids get home from school, greet them warmly and remind about homework before screen time."
          className="mt-3 w-full border border-line bg-void px-2 py-2 font-mono text-[10px] text-stark"
        />
        <button
          type="button"
          disabled={busy || !composeText.trim()}
          onClick={() => void compose()}
          className="mt-2 border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
        >
          {busy ? "Composing…" : "Compose & arm"}
        </button>
      </div>
    </div>
  );
}
