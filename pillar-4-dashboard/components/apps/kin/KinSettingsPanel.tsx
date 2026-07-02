"use client";

import { useCallback, useState } from "react";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { KIN_GROWTH_INTENT_LABELS } from "@/lib/kin-growth";
import type { KinGrowthIntent } from "@/lib/os-growth-level";

interface KinSettingsPanelProps {
  config: Record<string, unknown>;
  onSaveNotify: (notifyWhenLive: boolean) => Promise<void>;
}

export function KinSettingsPanel({ config, onSaveNotify }: KinSettingsPanelProps) {
  const householdName = typeof config.householdName === "string" ? config.householdName : "My Household";
  const defaultComm =
    typeof config.defaultCommStyle === "string" ? config.defaultCommStyle : "warm";
  const allowChild = config.allowChildProfiles !== false;
  const growthIntent =
    typeof config.growthIntent === "string" ? (config.growthIntent as KinGrowthIntent) : null;
  const intentLabel = growthIntent ? KIN_GROWTH_INTENT_LABELS[growthIntent] : "From experience mapping";
  const [notifyWhenLive, setNotifyWhenLive] = useState(config.notifyWhenLive === true);
  const [saving, setSaving] = useState(false);

  const saveNotify = useCallback(async () => {
    setSaving(true);
    try {
      await onSaveNotify(notifyWhenLive);
    } finally {
      setSaving(false);
    }
  }, [notifyWhenLive, onSaveNotify]);

  return (
    <div className="space-y-6">
      <ExperienceAppSection
        appId="my-family"
        sectionId="household-settings"
        minLevel="standard"
        title="Household defaults"
        subtitle="Set during FRE — full edit in a future release"
      >
        <dl className="space-y-2 font-sans text-sm">
          <div className="flex justify-between border-b border-line py-2">
            <dt className="text-muted">Household name</dt>
            <dd className="text-stark">{householdName}</dd>
          </div>
          <div className="flex justify-between border-b border-line py-2">
            <dt className="text-muted">Default communication</dt>
            <dd className="text-stark">{defaultComm}</dd>
          </div>
          <div className="flex justify-between border-b border-line py-2">
            <dt className="text-muted">Child profiles</dt>
            <dd className="text-stark">{allowChild ? "Enabled" : "Disabled"}</dd>
          </div>
          <div className="flex justify-between border-b border-line py-2">
            <dt className="text-muted">Growth intent</dt>
            <dd className="text-stark">{intentLabel}</dd>
          </div>
        </dl>
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-family"
        sectionId="notify-waitlist"
        minLevel="beginner"
        title="Notify when live"
        subtitle="Local flag only — no cloud waitlist until Claw Cafe ships"
      >
        <label className="flex cursor-pointer items-center gap-3 font-sans text-sm text-stark">
          <input
            type="checkbox"
            checked={notifyWhenLive}
            onChange={(e) => setNotifyWhenLive(e.target.checked)}
            className="border border-line"
          />
          Remind me when Kin exits preview mode
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveNotify()}
          className="mt-4 border border-line px-4 py-2 font-sans text-sm text-muted hover:text-stark disabled:opacity-50"
        >
          Save preference
        </button>
      </ExperienceAppSection>
    </div>
  );
}
