"use client";

import { useCallback, useEffect, useState } from "react";

import { HumanoidPairWizard } from "@/components/apps/humanoid/HumanoidPairWizard";
import type { HumanoidHubStatus, HumanoidUnit, RobotKind } from "@/lib/humanoid-hub-types";
import { FLEET_UNIT_LIMIT, ROBOT_KIND_META, kindLabel, statusLabel } from "@/lib/humanoid-fleet-meta";

interface HumanoidFleetPanelProps {
  onStatus?: (message: string) => void;
}

export function HumanoidFleetPanel({ onStatus }: HumanoidFleetPanelProps) {
  const [data, setData] = useState<HumanoidHubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [addKind, setAddKind] = useState<RobotKind>("mobile");
  const [addName, setAddName] = useState("");
  const [pairUnitId, setPairUnitId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/humanoid/hub", { cache: "no-store" });
    if (!res.ok) return;
    setData((await res.json()) as HumanoidHubStatus);
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
        onStatus?.(json.message ?? "Fleet updated");
        return json;
      }
      onStatus?.(json.error ?? "Failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const units = data?.hub.units ?? [];
  const summary = data?.fleetSummary;
  const atLimit = units.length >= FLEET_UNIT_LIMIT;

  return (
    <div className="space-y-4">
      <div className="border border-cursor-glow/20 bg-gradient-to-r from-panel to-void px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cursor-glow">Home robot fleet · preview</p>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Humanoids first — mobile bases, arms, and Forge custom units share one knowledge package. Up to{" "}
          {FLEET_UNIT_LIMIT} robots on your appliance.
        </p>
        {summary ? (
          <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px]">
            <span className="text-stark">{summary.total} units</span>
            <span className="text-cursor-glow">{summary.paired} paired · preview</span>
            {(["humanoid", "mobile", "arm", "custom"] as RobotKind[]).map((k) =>
              summary.byKind[k] > 0 ? (
                <span key={k} className="text-muted">
                  {summary.byKind[k]} {kindLabel(k).toLowerCase()}
                </span>
              ) : null,
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {units.map((unit) => (
          <FleetUnitCard
            key={unit.id}
            unit={unit}
            isPrimary={data?.hub.primaryUnitId === unit.id}
            busy={busy}
            onSetPrimary={() => void post({ action: "set_primary", unitId: unit.id })}
            onPair={() => setPairUnitId(unit.id)}
            onRemove={() => void post({ action: "remove_unit", unitId: unit.id })}
          />
        ))}

        {!atLimit ? (
          <div className="flex min-h-[180px] flex-col justify-between border border-dashed border-line bg-void/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Add robot slot</p>
            <div className="space-y-2">
              <select
                value={addKind}
                onChange={(e) => {
                  const k = e.target.value as RobotKind;
                  setAddKind(k);
                  setAddName(ROBOT_KIND_META[k].defaultName);
                }}
                className="w-full border border-line bg-panel px-2 py-1.5 font-mono text-[10px] text-stark"
              >
                {(Object.keys(ROBOT_KIND_META) as RobotKind[]).map((k) => (
                  <option key={k} value={k}>
                    {ROBOT_KIND_META[k].label}
                  </option>
                ))}
              </select>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={ROBOT_KIND_META[addKind].defaultName}
                className="w-full border border-line bg-panel px-2 py-1.5 font-mono text-[10px] text-stark"
              />
              <p className="font-mono text-[9px] text-muted">{ROBOT_KIND_META[addKind].description}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void post({
                  action: "add_unit",
                  kind: addKind,
                  displayName: addName.trim() || ROBOT_KIND_META[addKind].defaultName,
                }).then(() => setAddName(""))
              }
              className="mt-2 border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
            >
              + Add to fleet
            </button>
          </div>
        ) : null}
      </div>

      {pairUnitId && data ? (() => {
        const pairUnit = data.hub.units.find((u) => u.id === pairUnitId);
        if (!pairUnit) return null;
        return (
          <HumanoidPairWizard
            unit={pairUnit}
            session={data.hub.pairWizard}
            knowledgeSynced={Boolean(data.hub.lastKnowledgeSyncAt)}
            busy={busy}
            onClose={() => {
              setPairUnitId(null);
              void post({ action: "cancel_pair" });
              void refresh();
            }}
            onPost={post}
            onComplete={() => {
              setPairUnitId(null);
              void refresh();
            }}
          />
        );
      })() : null}
    </div>
  );
}

function FleetUnitCard({
  unit,
  isPrimary,
  busy,
  onSetPrimary,
  onPair,
  onRemove,
}: {
  unit: HumanoidUnit;
  isPrimary: boolean;
  busy: boolean;
  onSetPrimary: () => void;
  onPair: () => void;
  onRemove: () => void;
}) {
  const meta = ROBOT_KIND_META[unit.kind];
  const paired = Boolean(unit.pairedAt);

  return (
    <div
      className={`flex flex-col border p-4 ${
        isPrimary ? "border-cursor-glow/50 bg-cursor-glow/5" : "border-line bg-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-widest text-muted">{meta.short}</span>
          <p className="font-mono text-[11px] text-stark">{unit.displayName}</p>
          <p className="font-mono text-[9px] text-muted">{meta.label}</p>
        </div>
        {isPrimary ? (
          <span className="border border-cursor-glow/40 px-1.5 py-0.5 font-mono text-[8px] uppercase text-cursor-glow">
            Primary
          </span>
        ) : null}
      </div>

      <p className={`mt-2 font-mono text-[9px] ${paired ? "text-cursor-glow" : "text-amber-300/90"}`}>
        {statusLabel(unit.status)}
      </p>
      {unit.meshNodeId ? (
        <p className="mt-1 truncate font-mono text-[8px] text-muted">{unit.meshNodeId}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-1 pt-4">
        {!paired ? (
          <button
            type="button"
            disabled={busy}
            onClick={onPair}
            className="border border-cursor-glow px-2 py-0.5 font-mono text-[9px] uppercase text-cursor-glow"
          >
            Pair day wizard
          </button>
        ) : (
          <span className="font-mono text-[9px] text-muted">Paired {new Date(unit.pairedAt!).toLocaleDateString()}</span>
        )}
        {!isPrimary ? (
          <button
            type="button"
            disabled={busy}
            onClick={onSetPrimary}
            className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase text-muted"
          >
            Set primary
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onRemove}
          className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase text-muted hover:text-stark"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
