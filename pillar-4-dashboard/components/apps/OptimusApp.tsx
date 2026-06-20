"use client";

import { useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const JOINTS = ["SHOULDER_L", "SHOULDER_R", "ELBOW_L", "ELBOW_R", "GRIP"] as const;

export function OptimusApp({ config, skillTick, lastSkillId }: AgentAppContext) {
  const { command, connected } = useMotorStream();
  useVisionStream();
  const unitId = typeof config.unitId === "string" ? config.unitId : "OPTIMUS-01";
  const safety = typeof config.safetyProfile === "string" ? config.safetyProfile : "standard";
  const [torque, setTorque] = useState<Record<string, number>>({
    SHOULDER_L: 0.42,
    SHOULDER_R: 0.38,
    ELBOW_L: 0.55,
    ELBOW_R: 0.51,
    GRIP: 0.62,
  });
  const [rlWeight, setRlWeight] = useState(0.73);
  const [lastAction, setLastAction] = useState("Idle — awaiting skill");

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (
      lastSkillId !== "home_position" &&
      lastSkillId !== "test_grip" &&
      lastSkillId !== "tune_joint"
    ) {
      return;
    }
    setLastAction(`${lastSkillId.replace(/_/g, " ")} · seq ${command?.seq ?? "—"} · safety ${safety}`);
  }, [skillTick, lastSkillId, command?.seq, safety]);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("tesla-optimus-engine").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{unitId}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">Signal Claw · {safety} profile · {lastAction}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <AppMetric label="Mesh τ" value={connected && command ? command.torqueZ.toFixed(2) : "—"} unit="Nm live" highlight />
        <AppMetric label="Policy" value="OPTIMUS-v3" unit="local RL" />
        <AppMetric label="Position" value={command ? `${command.x.toFixed(2)}, ${command.y.toFixed(2)}` : "—"} unit="xyz" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AppSection title="Joint Torque Tuning" subtitle="Adjust limits · Tune Joint skill applies to motor_out">
          <div className="space-y-4">
            {JOINTS.map((joint) => (
              <label key={joint} className="block font-mono text-xs">
                <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-muted">
                  <span>{joint}</span>
                  <span className="text-cursor-glow">{torque[joint]?.toFixed(2)} Nm</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={torque[joint]}
                  onChange={(e) => setTorque((t) => ({ ...t, [joint]: Number(e.target.value) }))}
                  className="w-full accent-[#bc13fe]"
                />
              </label>
            ))}
          </div>
        </AppSection>

        <AppSection title="RL Policy Weights" subtitle="Exploration ε · RL Step skill runs one local epoch">
          <label className="block font-mono text-xs">
            <span className="text-[10px] uppercase tracking-widest text-muted">Exploration ε</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={rlWeight}
              onChange={(e) => setRlWeight(Number(e.target.value))}
              className="mt-2 w-full accent-[#bc13fe]"
            />
            <span className="mt-1 block text-cursor-glow">{rlWeight.toFixed(2)}</span>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <Cell k="reward" v="+0.91" />
            <Cell k="epoch" v="4021" />
            <Cell k="enable RL" v={config.enableRl ? "ON" : "OFF"} />
            <Cell k="mesh" v={connected ? "LIVE" : "OFF"} />
          </div>
        </AppSection>
      </div>
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="border border-line bg-panel p-2">
      <div className="text-muted">{k}</div>
      <div className="text-stark">{v}</div>
    </div>
  );
}
