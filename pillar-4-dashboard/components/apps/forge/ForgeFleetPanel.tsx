"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ForgeProvisioningBadge } from "@/components/apps/forge/ForgeProvisioningBadge";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import type { ForgeFleetEntry, ForgeFleetCounts } from "@/lib/forge-fleet";
import { provisioningModeDescription } from "@/lib/forge-provisioning";

interface ForgeFleetPanelProps {
  fleet: ForgeFleetEntry[];
  counts: ForgeFleetCounts;
  activeClawId: string | null;
  onRefresh: () => void;
  onMintAgain?: () => void;
}

function formatCreated(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function ForgeFleetPanel({
  fleet,
  counts,
  activeClawId,
  onRefresh,
  onMintAgain,
}: ForgeFleetPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const postFleetAction = useCallback(
    async (body: Record<string, unknown>, rowId: string) => {
      setError(null);
      setBusyId(rowId);
      try {
        const res = await fetch("/api/forge/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Fleet action failed");
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fleet action failed");
      } finally {
        setBusyId(null);
      }
    },
    [onRefresh],
  );

  const setActive = useCallback(
    (clawId: string) => postFleetAction({ action: "set_active", clawId }, clawId),
    [postFleetAction],
  );

  const archiveRow = useCallback(
    (row: ForgeFleetEntry) =>
      postFleetAction(
        {
          action: "archive_claw",
          profileId: row.profileId ?? undefined,
          forgedAppId: row.forgedAppId ?? undefined,
        },
        row.rowId,
      ),
    [postFleetAction],
  );

  const promoteRow = useCallback(
    (row: ForgeFleetEntry) =>
      postFleetAction(
        {
          action: "promote_to_framework",
          profileId: row.profileId ?? undefined,
          templateId: row.templateId ?? undefined,
        },
        row.rowId,
      ),
    [postFleetAction],
  );

  const exportRow = useCallback(async (row: ForgeFleetEntry) => {
    setError(null);
    setBusyId(row.rowId);
    try {
      const body = row.forgedAppId
        ? { forgedAppId: row.forgedAppId }
        : row.profileId
          ? { profileId: row.profileId }
          : null;
      if (!body) throw new Error("Nothing to export for this row");
      const res = await fetch("/api/claw/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Export failed");
      }
      const data = (await res.json()) as { bundle?: unknown };
      if (!data.bundle) throw new Error("Empty export bundle");
      const blob = new Blob([JSON.stringify(data.bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.name.replace(/\s+/g, "-").toLowerCase()}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <ExperienceAppSection
      appId="claw-forge"
      sectionId="fleet"
      minLevel="standard"
      title="Unified Fleet Registry"
      subtitle={`${counts.profiles} engine profiles · ${counts.forgedApps} forged desks · Island ${counts.island} · Framework ${counts.framework} · Archived ${counts.archived}`}
    >
      {error ? <p className="mb-3 font-mono text-[11px] text-cursor-glow">{error}</p> : null}

      {fleet.length === 0 ? (
        <div className="space-y-3">
          <p className="font-mono text-[11px] text-muted">
            No claws yet. Mint from the Mint tab — Island for engine-only profiles, Framework for full desks with nav,
            Import for external SOUL/TOOLS bundles.
          </p>
          {onMintAgain ? (
            <button
              type="button"
              onClick={onMintAgain}
              className="border border-cursor-glow px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Go to Mint →
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {fleet.map((row) => (
            <li
              key={row.rowId}
              className={`border px-3 py-2 ${
                row.isActive || row.profileId === activeClawId
                  ? "border-cursor-glow bg-surface"
                  : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-stark">{row.name}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <ForgeProvisioningBadge mode={row.mode} />
                  {row.isActive ? (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-cursor-glow">Active</span>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 text-[10px] text-muted">{provisioningModeDescription(row.mode)}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
                {row.modelSummary ? <span>{row.modelSummary}</span> : null}
                {row.templateId ? <span>template · {row.templateId}</span> : null}
                <span>created · {formatCreated(row.createdAt)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {row.href && row.mode !== "island" ? (
                  <Link
                    href={row.href}
                    className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow hover:underline"
                  >
                    Open desk →
                  </Link>
                ) : null}
                {row.profileId && !row.isActive ? (
                  <button
                    type="button"
                    disabled={busyId === row.rowId}
                    onClick={() => void setActive(row.profileId!)}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-cursor-glow disabled:opacity-40"
                  >
                    {busyId === row.rowId ? "Working…" : "Set active"}
                  </button>
                ) : null}
                {row.canPromote ? (
                  <button
                    type="button"
                    disabled={busyId === row.rowId}
                    onClick={() => void promoteRow(row)}
                    className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
                  >
                    Promote → framework
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === row.rowId}
                  onClick={() => void exportRow(row)}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-cursor-glow disabled:opacity-40"
                >
                  Export
                </button>
                <button
                  type="button"
                  disabled={busyId === row.rowId}
                  onClick={() => void archiveRow(row)}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-cursor-glow disabled:opacity-40"
                >
                  Archive
                </button>
                {!row.hasEngineProfile ? (
                  <span className="font-mono text-[10px] text-muted">Desk only — no engine profile</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ExperienceAppSection>
  );
}
