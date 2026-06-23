"use client";

import { useCallback, useState } from "react";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import type { FamilyDevice, FamilyProfile } from "@/lib/family-types";

interface KinDevicesPanelProps {
  selected: FamilyProfile | undefined;
  onSaveDevices: (devices: FamilyDevice[]) => Promise<void>;
  saving: boolean;
}

const DEVICE_KINDS: FamilyDevice["kind"][] = ["phone", "watch", "tablet", "robot", "appliance", "other"];

export function KinDevicesPanel({ selected, onSaveDevices, saving }: KinDevicesPanelProps) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<FamilyDevice["kind"]>("phone");
  const [hardwareRef, setHardwareRef] = useState("");

  const bindDevice = useCallback(async () => {
    if (!selected || !label.trim()) return;
    const device: FamilyDevice = {
      id: crypto.randomUUID(),
      label: label.trim(),
      kind,
      hardwareRef: hardwareRef.trim() || null,
      lastSeenAt: new Date().toISOString(),
    };
    await onSaveDevices([...selected.devices, device]);
    setLabel("");
    setHardwareRef("");
  }, [selected, label, kind, hardwareRef, onSaveDevices]);

  if (!selected) {
    return (
      <p className="font-sans text-sm text-muted">Select a member on the Members tab to bind devices.</p>
    );
  }

  return (
    <div className="space-y-6">
      <ExperienceAppSection
        appId="my-family"
        sectionId="devices-list"
        minLevel="beginner"
        title={`Devices · ${selected.displayName}`}
        subtitle="Phones, watches, tablets, and Optimus units bound to this profile"
      >
        {selected.devices.length === 0 ? (
          <p className="font-sans text-sm text-muted">No devices bound yet — add one below.</p>
        ) : (
          <ul className="space-y-2">
            {selected.devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between border border-line px-3 py-2 font-sans text-sm">
                <span className="text-stark">{d.label}</span>
                <span className="font-mono text-[10px] uppercase text-muted">
                  {d.kind}
                  {d.hardwareRef ? ` · ${d.hardwareRef}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-family"
        sectionId="bind-device"
        minLevel="standard"
        title="Bind device"
        subtitle="Local registry only — hardware discovery ships with Optimus family mode"
      >
        <div className="flex flex-wrap gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Device label"
            className="min-w-[140px] flex-1 border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as FamilyDevice["kind"])}
            className="border border-line bg-void px-2 py-2 font-sans text-sm text-stark"
          >
            {DEVICE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            value={hardwareRef}
            onChange={(e) => setHardwareRef(e.target.value)}
            placeholder="Hardware ref (optional)"
            className="min-w-[160px] flex-1 border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
          />
          <button
            type="button"
            disabled={saving || !label.trim()}
            onClick={() => void bindDevice()}
            className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark disabled:opacity-50"
          >
            Bind
          </button>
        </div>
      </ExperienceAppSection>
    </div>
  );
}
