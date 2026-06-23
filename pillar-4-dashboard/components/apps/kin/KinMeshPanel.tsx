"use client";

import { useCallback, useState } from "react";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { CCP_REGISTRY } from "@/lib/claw-mesh-protocol";
import { getOotbApp, isValidAppId } from "@/lib/ootb-apps";

interface KinMeshPanelProps {
  memberCount: number;
  onResync: () => Promise<void>;
}

function clawDisplayName(appId: string): string {
  return isValidAppId(appId) ? getOotbApp(appId).name : appId;
}

export function KinMeshPanel({ memberCount, onResync }: KinMeshPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const kinPub = CCP_REGISTRY.publications.find((p) => p.appId === "my-family");
  const subscribers = CCP_REGISTRY.subscriptions.filter((s) => s.scopes.includes("family"));
  const spotlightIds = new Set(["tesla-optimus-engine", "my-vital"]);
  const sortedSubs = [...subscribers].sort((a, b) => {
    const aSpot = spotlightIds.has(a.appId) ? 0 : 1;
    const bSpot = spotlightIds.has(b.appId) ? 0 : 1;
    return aSpot - bSpot;
  });

  const resync = useCallback(async () => {
    setSyncing(true);
    try {
      await onResync();
      setLastSync(new Date().toLocaleTimeString());
    } finally {
      setSyncing(false);
    }
  }, [onResync]);

  return (
    <div className="space-y-6">
      <ExperienceAppSection
        appId="my-family"
        sectionId="mesh-publish"
        minLevel="standard"
        title="Kin publishes"
        subtitle="Household context keys written to the Claw Context Protocol"
      >
        {kinPub ? (
          <dl className="space-y-2 font-sans text-sm">
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-muted">Scopes</dt>
              <dd className="font-mono text-xs text-stark">{kinPub.scopes.join(", ")}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-muted">Keys</dt>
              <dd className="font-mono text-xs text-stark">{kinPub.keys.join(" · ")}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-muted">Members synced</dt>
              <dd className="text-stark">{memberCount}</dd>
            </div>
          </dl>
        ) : null}
        <button
          type="button"
          disabled={syncing}
          onClick={() => void resync()}
          className="mt-4 border border-cursor-glow px-4 py-2 font-sans text-sm text-stark disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Resync mesh"}
        </button>
        {lastSync ? (
          <p className="mt-2 font-mono text-[10px] text-muted">Last resync {lastSync}</p>
        ) : null}
      </ExperienceAppSection>

      <ExperienceAppSection
        appId="my-family"
        sectionId="mesh-subscribers"
        minLevel="standard"
        title="Subscribed Claws"
        subtitle="Signal (Optimus) and Vital are the headline consumers — guest tone and per-member health"
      >
        <ul className="space-y-2">
          {sortedSubs.map((sub) => (
            <li
              key={sub.appId}
              className={`border px-3 py-3 ${
                spotlightIds.has(sub.appId) ? "border-cursor-glow/40 bg-cursor-glow/5" : "border-line"
              }`}
            >
              <p className="font-sans text-sm font-medium text-stark">{clawDisplayName(sub.appId)}</p>
              <p className="mt-1 font-sans text-xs text-muted">{sub.description}</p>
              <p className="mt-2 font-mono text-[10px] text-muted">
                Scopes: {sub.scopes.filter((s) => s === "family" || s === "personal").join(", ") || sub.scopes.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </ExperienceAppSection>
    </div>
  );
}
