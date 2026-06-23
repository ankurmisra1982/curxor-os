"use client";

import { useCallback, useState } from "react";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import type { FamilyChannelHandle, FamilyProfile } from "@/lib/family-types";
import { kinFeatureVisible } from "@/lib/kin-level-gates";
import type { GrowthLevel } from "@/lib/os-growth-level";

interface KinProfilePanelProps {
  growthLevel: GrowthLevel;
  selected: FamilyProfile | undefined;
  onSaveHandles: (handles: FamilyChannelHandle[]) => Promise<void>;
  saving: boolean;
}

export function KinProfilePanel({ growthLevel, selected, onSaveHandles, saving }: KinProfilePanelProps) {
  const [handleChannel, setHandleChannel] = useState<FamilyChannelHandle["channel"]>("whatsapp");
  const [handleAddress, setHandleAddress] = useState("");

  const showHandles = kinFeatureVisible(growthLevel, "channel-handles");

  const addChannelHandle = useCallback(async () => {
    if (!selected || !handleAddress.trim()) return;
    const nextHandles: FamilyChannelHandle[] = [
      ...(selected.channelHandles ?? []),
      { channel: handleChannel, address: handleAddress.trim() },
    ];
    await onSaveHandles(nextHandles);
    setHandleAddress("");
  }, [selected, handleChannel, handleAddress, onSaveHandles]);

  if (!selected) {
    return (
      <p className="font-sans text-sm text-muted">Select a member on the Members tab to view their profile.</p>
    );
  }

  return (
    <ExperienceAppSection
      appId="my-family"
      sectionId="profile"
      minLevel="beginner"
      title={selected.displayName}
      subtitle={`Role: ${selected.role}`}
    >
      <dl className="space-y-2 font-sans text-sm">
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-muted">Role</dt>
          <dd className="text-stark">{selected.role}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-muted">Communication</dt>
          <dd className="text-stark">{selected.personality.communicationStyle}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-muted">Traits</dt>
          <dd className="text-stark">{selected.personality.traits.join(", ") || "—"}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-muted">Shared scopes</dt>
          <dd className="font-mono text-xs text-stark">{selected.sharedScopes.join(", ")}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-muted">Devices</dt>
          <dd className="text-stark">{selected.devices.length}</dd>
        </div>
        {showHandles ? (
          <div className="border-b border-line py-2">
            <dt className="text-muted">Channel handles</dt>
            <dd className="mt-2 space-y-1 font-mono text-xs text-stark">
              {(selected.channelHandles ?? []).length === 0 ? (
                <span className="text-muted">None — add below to route WhatsApp/iMessage to this member</span>
              ) : (
                selected.channelHandles.map((h) => (
                  <div key={`${h.channel}-${h.address}`}>
                    {h.channel}: {h.address}
                  </div>
                ))
              )}
            </dd>
          </div>
        ) : (
          <p className="font-sans text-xs text-muted">
            Channel handle routing unlocks at Helper level (L2) — upgrade growth in Settings or FRE.
          </p>
        )}
      </dl>

      {showHandles ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={handleChannel}
            onChange={(e) => setHandleChannel(e.target.value as FamilyChannelHandle["channel"])}
            className="border border-line bg-void px-2 py-2 font-sans text-sm text-stark"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
            <option value="imessage">iMessage</option>
            <option value="slack">Slack</option>
            <option value="email">Email</option>
          </select>
          <input
            value={handleAddress}
            onChange={(e) => setHandleAddress(e.target.value)}
            placeholder="Phone, @username, or chat id"
            className="min-w-[180px] flex-1 border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
          />
          <button
            type="button"
            disabled={saving || !handleAddress.trim()}
            onClick={() => void addChannelHandle()}
            className="border border-cursor-glow px-3 py-2 font-sans text-sm text-stark disabled:opacity-50"
          >
            Link handle
          </button>
        </div>
      ) : null}
    </ExperienceAppSection>
  );
}
