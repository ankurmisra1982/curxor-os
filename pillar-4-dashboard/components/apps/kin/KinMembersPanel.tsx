"use client";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import type { FamilyProfile } from "@/lib/family-types";
import { kinFeatureVisible } from "@/lib/kin-level-gates";
import type { GrowthLevel } from "@/lib/os-growth-level";

interface KinMembersPanelProps {
  growthLevel: GrowthLevel;
  members: FamilyProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  draftName: string;
  onDraftNameChange: (v: string) => void;
  onAddMember: () => void;
  saving: boolean;
}

export function KinMembersPanel({
  growthLevel,
  members,
  selectedId,
  onSelect,
  draftName,
  onDraftNameChange,
  onAddMember,
  saving,
}: KinMembersPanelProps) {
  const canAdd = kinFeatureVisible(growthLevel, "add-member");

  return (
    <div className="space-y-6">
      <ExperienceAppSection
        appId="my-family"
        sectionId="members"
        minLevel="beginner"
        title="Family members"
        subtitle="Each person is a profile Optimus, Vital, and other Claws can recognize — add partner, kids, or guests"
      >
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              className={`border px-3 py-2 font-sans text-sm transition ${
                selectedId === m.id
                  ? "border-cursor-glow text-cursor-glow"
                  : "border-line text-muted hover:text-stark"
              }`}
            >
              {m.displayName}
              <span className="ml-2 font-mono text-[10px] uppercase text-muted">{m.role}</span>
            </button>
          ))}
        </div>
      </ExperienceAppSection>

      {canAdd ? (
        <ExperienceAppSection
          appId="my-family"
          sectionId="add-member"
          minLevel="standard"
          title="Add member"
          subtitle="Profiles sync to Optimus, Vital, and other subscribed Claws via CCP"
        >
          <div className="flex flex-wrap gap-2">
            <input
              value={draftName}
              onChange={(e) => onDraftNameChange(e.target.value)}
              placeholder="Partner, child, guest…"
              className="min-w-[200px] flex-1 border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
            />
            <button
              type="button"
              disabled={saving || !draftName.trim()}
              onClick={onAddMember}
              className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </ExperienceAppSection>
      ) : null}
    </div>
  );
}
