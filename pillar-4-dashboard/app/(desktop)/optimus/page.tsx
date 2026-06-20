"use client";

import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";
import { useState } from "react";

const JOINTS = ["SHOULDER_L", "SHOULDER_R", "ELBOW_L", "ELBOW_R", "GRIP"] as const;

export default function OptimusPage() {
  const { command, connected } = useMotorStream();
  useVisionStream();
  const [torque, setTorque] = useState<Record<string, number>>({
    SHOULDER_L: 0.42,
    SHOULDER_R: 0.38,
    ELBOW_L: 0.55,
    ELBOW_R: 0.51,
    GRIP: 0.62,
  });
  const [rlWeight, setRlWeight] = useState(0.73);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="border border-line bg-void">
        <header className="border-b border-line px-4 py-3">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Joint Torque Tuning</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">
            Kinematic panel · live mesh τ {connected && command ? command.torqueZ.toFixed(2) : "—"} Nm
          </p>
        </header>
        <div className="space-y-4 p-4">
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
      </section>

      <section className="border border-line bg-void">
        <header className="border-b border-line px-4 py-3">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">RL Policy Weights</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">Mock reinforcement learning blend · local only</p>
        </header>
        <div className="p-4 font-mono text-xs">
          <label className="block">
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
          <div className="mt-6 grid grid-cols-2 gap-2 text-[10px]">
            <Cell k="policy" v="OPTIMUS-v3" />
            <Cell k="mesh xyz" v={command ? `${command.x.toFixed(2)}, ${command.y.toFixed(2)}, ${command.z.toFixed(2)}` : "—"} />
            <Cell k="reward" v="+0.91" />
            <Cell k="epoch" v="4021" />
          </div>
        </div>
      </section>
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
