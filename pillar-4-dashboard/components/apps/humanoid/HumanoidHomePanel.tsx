"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { HumanoidHubStatus } from "@/lib/humanoid-hub-types";

interface HumanoidHomePanelProps {
  onStatus?: (message: string) => void;
  onSyncRequest?: () => void;
  onOpenFleet?: () => void;
}

export function HumanoidHomePanel({ onStatus, onSyncRequest, onOpenFleet }: HumanoidHomePanelProps) {
  const [data, setData] = useState<HumanoidHubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [robotName, setRobotName] = useState("");
  const [callName, setCallName] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/humanoid/hub", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as HumanoidHubStatus & { ok?: boolean };
    setData(json);
    if (json.primaryUnit) setRobotName(json.primaryUnit.displayName);
    if (json.hub?.relationship) setCallName(json.hub.relationship.callName);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/humanoid/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as HumanoidHubStatus & { ok?: boolean; error?: string; message?: string };
      if (json.ok !== false) {
        setData(json);
        onStatus?.(json.message ?? "Updated");
      } else {
        onStatus?.(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  const unit = data?.primaryUnit;
  const readiness = data?.readiness;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden border border-cursor-glow/30 bg-gradient-to-br from-panel via-void to-panel p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cursor-glow/10 blur-2xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Your home humanoid</p>
            <h2 className="mt-1 font-display text-lg uppercase tracking-[0.12em] text-stark">
              {unit?.displayName ?? "Name me in setup"}
            </h2>
            <p className="mt-2 max-w-lg font-mono text-[10px] leading-relaxed text-muted">
              {data?.hub.relationship.introScript ??
                "Signal Claw is your neural link — teach me your home before hardware arrives."}
            </p>
          </div>
          <RobotSilhouette status={unit?.status ?? "awaiting_pair"} />
        </div>

        {readiness ? (
          <div className="mt-5">
            <div className="mb-1 flex justify-between font-mono text-[10px]">
              <span className="text-muted">Neural link readiness</span>
              <span className="text-cursor-glow">
                {readiness.label} · {readiness.score}%
              </span>
            </div>
            <div className="h-2 overflow-hidden border border-line bg-void">
              <div
                className="h-full bg-gradient-to-r from-cursor-glow/60 to-cursor-glow transition-all duration-700"
                style={{ width: `${readiness.score}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[9px] text-muted">{readiness.detail}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-line bg-panel p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Setup journey · preview</p>
          <ul className="mt-3 space-y-2">
            {readiness?.steps.map((step) => (
              <li key={step.id} className="flex gap-2 font-mono text-[10px]">
                <span className={step.done ? "text-cursor-glow" : "text-muted"}>{step.done ? "✓" : "○"}</span>
                <div>
                  <p className={step.done ? "text-stark" : "text-muted"}>{step.label}</p>
                  {!step.done && step.id === "pair_hardware" ? (
                    <button
                      type="button"
                      onClick={onOpenFleet}
                      className="mt-0.5 text-[9px] uppercase text-cursor-glow hover:underline"
                    >
                      Open Fleet tab → pair wizard
                    </button>
                  ) : !step.done ? (
                    <p className="text-[9px] text-muted/80">{step.hint}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-line bg-panel p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Relationship</p>
          <label className="mt-3 block font-mono text-[10px] text-muted">
            Robot name
            <input
              value={robotName}
              onChange={(e) => setRobotName(e.target.value)}
              className="mt-1 w-full border border-line bg-void px-2 py-1.5 text-stark"
              placeholder="e.g. Atlas, Home Unit 1"
            />
          </label>
          <label className="mt-3 block font-mono text-[10px] text-muted">
            Calls you
            <input
              value={callName}
              onChange={(e) => setCallName(e.target.value)}
              className="mt-1 w-full border border-line bg-void px-2 py-1.5 text-stark"
              placeholder="Operator, Ankur, Dad…"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                await post({ action: "update_unit", displayName: robotName });
                await post({ action: "update_relationship", callName });
              })();
            }}
            className="mt-3 border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
          >
            Save relationship
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ComingCard
          title="Pair day wizard"
          body="Bluetooth + mesh handshake preview — load knowledge, verify safety, link motor_out."
          tag="Fleet tab"
          actionLabel="Open fleet →"
          onAction={onOpenFleet}
        />
        <ComingCard
          title="Multi-robot home"
          body="Add mobile bases, arms, and Forge custom units — one knowledge package for all."
          tag="Live now · preview"
        />
        <ComingCard
          title="Live motion"
          body="Real torque and vision loops when hardware validates on your appliance."
          tag="Horizon"
        />
      </div>

      <div className="flex flex-wrap gap-2 font-mono text-[10px]">
        {onOpenFleet ? (
          <button
            type="button"
            onClick={onOpenFleet}
            className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow"
          >
            Fleet & pair wizard →
          </button>
        ) : null}
        <Link href="/my-family" className="border border-line px-3 py-1 uppercase text-stark hover:border-cursor-glow">
          Open Kin Claw →
        </Link>
        <Link href="/my-vital" className="border border-line px-3 py-1 uppercase text-stark hover:border-cursor-glow">
          Open Vital Claw →
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            onSyncRequest?.();
            void post({ action: "sync_knowledge" });
          }}
          className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow disabled:opacity-40"
        >
          Push knowledge to mesh
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void post({ action: "notify_when_live", notify: true })}
          className="border border-line px-3 py-1 uppercase text-muted"
        >
          {data?.hub.notifyWhenLive ? "On waitlist ✓" : "Notify when live"}
        </button>
      </div>
    </div>
  );
}

function RobotSilhouette({ status }: { status: string }) {
  const pulse = status === "learning" || status === "active_preview";
  return (
    <div
      className={`flex h-28 w-20 flex-col items-center justify-end border border-line bg-void/80 pb-2 ${
        pulse ? "shadow-[0_0_24px_rgba(188,19,254,0.25)]" : ""
      }`}
    >
      <div className="mb-1 h-6 w-6 rounded-full border border-cursor-glow/50 bg-cursor-glow/10" />
      <div className="h-10 w-8 border border-line bg-panel" />
      <div className="mt-1 flex gap-1">
        <div className="h-6 w-2 bg-panel" />
        <div className="h-6 w-2 bg-panel" />
      </div>
      <p className="mt-2 font-mono text-[8px] uppercase text-muted">{status.replace(/_/g, " ")}</p>
    </div>
  );
}

function ComingCard({
  title,
  body,
  tag,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  tag: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="border border-line/80 bg-panel/50 p-3">
      <span className="font-mono text-[8px] uppercase tracking-widest text-amber-300/90">{tag}</span>
      <p className="mt-1 font-mono text-[10px] text-stark">{title}</p>
      <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">{body}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 font-mono text-[9px] uppercase text-cursor-glow hover:underline"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
