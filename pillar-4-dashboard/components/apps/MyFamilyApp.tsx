"use client";

import { useCallback, useEffect, useState } from "react";

import { AppSection } from "@/components/app-shared/AppLayout";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import type { FamilyProfile } from "@/lib/family-types";

interface FamilyResponse {
  primaryProfileId: string | null;
  members: FamilyProfile[];
}

export function MyFamilyApp({ updateWorkspaceContext }: AgentAppContext) {
  const [data, setData] = useState<FamilyResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/family", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as FamilyResponse;
      setData(json);
      if (!selectedId && json.members[0]) setSelectedId(json.members[0].id);
    } catch {
      /* retry */
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const member = data?.members.find((m) => m.id === selectedId);
    if (!member) return;
    updateWorkspaceContext({
      selectedProfileId: member.id,
      selectedProfileName: member.displayName,
      selectedProfileRole: member.role,
    });
  }, [selectedId, data, updateWorkspaceContext]);

  const addMember = useCallback(async () => {
    if (!draftName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: draftName.trim(), role: "guest" }),
      });
      setDraftName("");
      await load();
    } finally {
      setSaving(false);
    }
  }, [draftName, load]);

  const resyncMesh = useCallback(async () => {
    await fetch("/api/mesh/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resyncFamily: true }),
    });
  }, []);

  const members = data?.members ?? [];
  const selected = members.find((m) => m.id === selectedId);

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">
          {getOotbApp("my-family").name}
        </p>
        <h2 className="mt-1 font-sans text-xl font-semibold text-stark">Household context hub</h2>
        <p className="mt-2 font-sans text-sm text-muted">
          Each member gets their own profile, devices, and personality — synced to every Claw that needs it
          (Optimus, Vital, Outreach, and more).
        </p>
      </header>

      <AppSection title="Family members" subtitle="Select a profile to view devices and shared scopes">
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={`border px-3 py-2 font-sans text-sm transition ${
                selectedId === m.id
                  ? "border-cursor-glow text-cursor-glow"
                  : "border-line text-muted hover:text-stark"
              }`}
            >
              {m.displayName}
            </button>
          ))}
        </div>
      </AppSection>

      {selected ? (
        <AppSection title={selected.displayName} subtitle={`Role: ${selected.role}`}>
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
          </dl>
        </AppSection>
      ) : null}

      <AppSection title="Add member" subtitle="Profiles sync to Optimus, Vital, and other subscribed Claws">
        <div className="flex flex-wrap gap-2">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Display name"
            className="min-w-[200px] flex-1 border border-line bg-void px-3 py-2 font-sans text-sm text-stark"
          />
          <button
            type="button"
            disabled={saving || !draftName.trim()}
            onClick={() => void addMember()}
            className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => void resyncMesh()}
            className="border border-line px-4 py-2 font-sans text-sm text-muted hover:text-stark"
          >
            Resync mesh
          </button>
        </div>
      </AppSection>
    </div>
  );
}
