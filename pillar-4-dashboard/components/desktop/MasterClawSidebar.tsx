"use client";

import { ActiveClawBadge } from "@/components/claw/ActiveClawBadge";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";
import { FormEvent, useState } from "react";

interface ChatLine {
  role: "system" | "user" | "claw";
  text: string;
}

const BOOT_LINES: ChatLine[] = [
  { role: "system", text: "MASTER CLAW v1.0 — sovereign edge PoC online" },
  { role: "system", text: "Inference plane: 127.0.0.1:8000 · mesh: eno2" },
  { role: "claw", text: "Ready. I see the robotics mesh and your selected modules." },
];

export function MasterClawSidebar() {
  const [lines, setLines] = useState<ChatLine[]>(BOOT_LINES);
  const [input, setInput] = useState("");
  const { frame } = useVisionStream();
  const { command } = useMotorStream();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    setLines((prev) => [...prev, { role: "user", text }]);
    setInput("");

    const spatial = frame
      ? `vision seq ${frame.seq} @ ${frame.width}×${frame.height}`
      : "no vision frame yet";
    const motor = command
      ? `motor xyz (${command.x.toFixed(2)}, ${command.y.toFixed(2)}, ${command.z.toFixed(2)})`
      : "motor idle";

    setTimeout(() => {
      setLines((prev) => [
        ...prev,
        {
          role: "claw",
          text: `Acknowledged. ${spatial} · ${motor}. Routing intent locally — no cloud.`,
        },
      ]);
    }, 420);
  }

  return (
    <div className="flex h-full flex-col bg-void">
      <header className="border-b border-line px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">Master Claw</p>
        <h2 className="font-display text-lg uppercase tracking-[0.14em] text-stark">Command Terminal</h2>
        <p className="mt-1 font-mono text-[10px] text-muted">Primary AI · local inference PoC</p>
        <div className="mt-3">
          <ActiveClawBadge />
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-xs leading-relaxed">
        {lines.map((line, idx) => (
          <div key={idx} className="border-l-2 pl-3" style={{ borderColor: lineColor(line.role) }}>
            <span className="text-[10px] uppercase tracking-widest text-muted">{line.role}</span>
            <p className={`mt-0.5 ${line.role === "claw" ? "text-cursor-glow" : "text-stark"}`}>{line.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line p-4">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted">
          Intent prompt
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="> coordinate claw fleet..."
            className="flex-1 border border-line bg-panel px-3 py-2 font-mono text-xs text-stark outline-none focus:border-cursor-glow"
          />
          <button
            type="submit"
            className="border border-cursor-glow bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function lineColor(role: ChatLine["role"]): string {
  if (role === "claw") return "#bc13fe";
  if (role === "user") return "#ffffff";
  return "#444444";
}
