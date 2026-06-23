"use client";

import { useCallback, useEffect, useState } from "react";

import { ComingSoonBadge } from "@/components/app-shared/ComingSoonBadge";
import { KinShowcasePanel } from "@/components/apps/kin/KinShowcasePanel";
import { KinDevicesPanel } from "@/components/apps/kin/KinDevicesPanel";
import { KinLevelBadge } from "@/components/apps/kin/KinLevelBadge";
import { KinMembersPanel } from "@/components/apps/kin/KinMembersPanel";
import { KinMeshPanel } from "@/components/apps/kin/KinMeshPanel";
import { KinProfilePanel } from "@/components/apps/kin/KinProfilePanel";
import { KinSettingsPanel } from "@/components/apps/kin/KinSettingsPanel";
import {
  KinWorkspaceTabs,
  defaultKinTab,
  type KinWorkspaceTab,
} from "@/components/apps/kin/KinWorkspaceTabs";
import { kinTabsForGrowth } from "@/lib/kin-level-gates";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import type { FamilyChannelHandle, FamilyDevice, FamilyProfile } from "@/lib/family-types";
import { resolveKinGrowthLevel } from "@/lib/kin-growth";
import { kinLevelCopy } from "@/lib/kin-level-copy";
import { getOotbApp } from "@/lib/ootb-apps";
import type { GrowthLevel } from "@/lib/os-growth-level";
import { isGrowthLevel } from "@/lib/os-growth-level";

interface FamilyResponse {
  primaryProfileId: string | null;
  members: FamilyProfile[];
}

export function MyFamilyApp({ config, updateWorkspaceContext }: AgentAppContext) {
  const { level } = useExperienceLevel();
  const [settingsGrowth, setSettingsGrowth] = useState<GrowthLevel | null>(null);
  const growthLevel = resolveKinGrowthLevel(config, level, settingsGrowth);
  const levelCopy = kinLevelCopy(growthLevel);

  const [workspaceTab, setWorkspaceTab] = useState<KinWorkspaceTab>(() => defaultKinTab(growthLevel));
  const [data, setData] = useState<FamilyResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const g = data?.settings?.appearance?.kinGrowthLevel;
        if (isGrowthLevel(g)) setSettingsGrowth(g);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const visible = kinTabsForGrowth(growthLevel);
    if (!visible.includes(workspaceTab)) {
      setWorkspaceTab(defaultKinTab(growthLevel));
    }
  }, [growthLevel, workspaceTab]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/family", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as FamilyResponse;
      setData(json);
      setSelectedId((prev) => prev ?? json.members[0]?.id ?? null);
    } catch {
      /* retry */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const members = data?.members ?? [];
  const selected = members.find((m) => m.id === selectedId);

  useEffect(() => {
    if (!selected) return;
    updateWorkspaceContext({
      selectedProfileId: selected.id,
      selectedProfileName: selected.displayName,
      selectedProfileRole: selected.role,
      growthLevel,
    });
  }, [selected, growthLevel, updateWorkspaceContext]);

  const resyncMesh = useCallback(async () => {
    await fetch("/api/mesh/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resyncFamily: true }),
    });
  }, []);

  const upsertMember = useCallback(
    async (patch: Partial<FamilyProfile> & { displayName: string }) => {
      await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await load();
      await resyncMesh();
    },
    [load, resyncMesh],
  );

  const addMember = useCallback(async () => {
    if (!draftName.trim()) return;
    setSaving(true);
    try {
      await upsertMember({ displayName: draftName.trim(), role: "guest" });
      setDraftName("");
    } finally {
      setSaving(false);
    }
  }, [draftName, upsertMember]);

  const saveHandles = useCallback(
    async (handles: FamilyChannelHandle[]) => {
      if (!selected) return;
      setSaving(true);
      try {
        await upsertMember({
          id: selected.id,
          displayName: selected.displayName,
          channelHandles: handles,
        });
      } finally {
        setSaving(false);
      }
    },
    [selected, upsertMember],
  );

  const saveDevices = useCallback(
    async (devices: FamilyDevice[]) => {
      if (!selected) return;
      setSaving(true);
      try {
        await upsertMember({
          id: selected.id,
          displayName: selected.displayName,
          devices,
        });
      } finally {
        setSaving(false);
      }
    },
    [selected, upsertMember],
  );

  const saveNotifyPreference = useCallback(async (notifyWhenLive: boolean) => {
    const nextConfig = { ...localConfig, notifyWhenLive };
    const res = await fetch("/api/app-fre/my-family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: nextConfig }),
    });
    if (res.ok) setLocalConfig(nextConfig);
  }, [localConfig]);

  return (
    <div className="space-y-6 p-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">
            {getOotbApp("my-family").name}
          </p>
          <ComingSoonBadge />
          <KinLevelBadge growthLevel={growthLevel} />
        </div>
        <h2 className="mt-1 font-sans text-xl font-semibold text-stark">{levelCopy.headline}</h2>
        <p className="mt-2 font-sans text-sm text-muted">{levelCopy.subtitle}</p>
      </header>

      <KinShowcasePanel members={members} />

      <KinWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} growthLevel={growthLevel} />

      {workspaceTab === "members" ? (
        <KinMembersPanel
          growthLevel={growthLevel}
          members={members}
          selectedId={selectedId}
          onSelect={setSelectedId}
          draftName={draftName}
          onDraftNameChange={setDraftName}
          onAddMember={() => void addMember()}
          saving={saving}
        />
      ) : null}

      {workspaceTab === "profile" ? (
        <KinProfilePanel
          growthLevel={growthLevel}
          selected={selected}
          onSaveHandles={saveHandles}
          saving={saving}
        />
      ) : null}

      {workspaceTab === "devices" ? (
        <KinDevicesPanel selected={selected} onSaveDevices={saveDevices} saving={saving} />
      ) : null}

      {workspaceTab === "mesh" ? (
        <KinMeshPanel memberCount={members.length} onResync={resyncMesh} />
      ) : null}

      {workspaceTab === "settings" ? (
        <KinSettingsPanel config={localConfig} onSaveNotify={saveNotifyPreference} />
      ) : null}
    </div>
  );
}
