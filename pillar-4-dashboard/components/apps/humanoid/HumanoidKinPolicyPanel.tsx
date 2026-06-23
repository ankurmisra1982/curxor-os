"use client";

import Link from "next/link";

import type { KinRobotPolicyView, KinRobotTone } from "@/lib/humanoid-hub-types";
import { policyBehaviorSummary } from "@/lib/humanoid-kin-policy-display";

const TONE_OPTIONS: KinRobotTone[] = ["inherit", "warm", "professional", "playful", "formal", "calm", "direct"];

interface HumanoidKinPolicyPanelProps {
  policies: KinRobotPolicyView[];
  busy?: boolean;
  onUpdate: (memberId: string, patch: Record<string, unknown>) => void;
}

export function HumanoidKinPolicyPanel({ policies, busy, onUpdate }: HumanoidKinPolicyPanelProps) {
  if (policies.length === 0) {
    return (
      <div className="border border-line bg-panel p-4 font-mono text-[10px] text-muted">
        No Kin profiles yet.{" "}
        <Link href="/my-family" className="text-cursor-glow hover:underline">
          Add household members in Kin Claw →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        Per-member robot behavior — tone, boundaries, and ask-first zones. Syncs to CCP on Push knowledge.
      </p>
      {policies.map((policy) => (
        <div key={policy.memberId} className="border border-line bg-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] text-stark">{policy.displayName}</p>
              <p className="font-mono text-[9px] uppercase text-muted">
                {policy.role} · Kin style {policy.communicationStyle}
              </p>
            </div>
            <p className="max-w-md font-mono text-[9px] text-cursor-glow/90">{policyBehaviorSummary(policy)}</p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block font-mono text-[9px] text-muted">
              Robot tone
              <select
                value={policy.tone}
                disabled={busy}
                onChange={(e) => onUpdate(policy.memberId, { tone: e.target.value })}
                className="mt-1 w-full border border-line bg-void px-2 py-1 text-[10px] text-stark"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 font-mono text-[9px] text-muted">
              <input
                type="checkbox"
                checked={policy.greetByName}
                disabled={busy}
                onChange={(e) => onUpdate(policy.memberId, { greetByName: e.target.checked })}
              />
              Greet by name
            </label>

            <label className="flex items-center gap-2 font-mono text-[9px] text-muted">
              <input
                type="checkbox"
                checked={policy.allowKitchenTasks}
                disabled={busy}
                onChange={(e) => onUpdate(policy.memberId, { allowKitchenTasks: e.target.checked })}
              />
              Kitchen tasks OK
            </label>

            <label className="flex items-center gap-2 font-mono text-[9px] text-muted">
              <input
                type="checkbox"
                checked={policy.allowBedroomEntry}
                disabled={busy}
                onChange={(e) => onUpdate(policy.memberId, { allowBedroomEntry: e.target.checked })}
              />
              Bedroom entry OK
            </label>
          </div>

          <label className="mt-3 block font-mono text-[9px] text-muted">
            Ask before (zones / tasks)
            <input
              defaultValue={policy.requireAskBefore}
              disabled={busy}
              onBlur={(e) => {
                if (e.target.value !== policy.requireAskBefore) {
                  onUpdate(policy.memberId, { requireAskBefore: e.target.value });
                }
              }}
              placeholder="kitchen, garage, sharp objects…"
              className="mt-1 w-full border border-line bg-void px-2 py-1 text-[10px] text-stark"
            />
          </label>
        </div>
      ))}
    </div>
  );
}
