"use client";

import { useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const BOTS = [
  { id: "CLAW-01", lane: "A" },
  { id: "CLAW-02", lane: "B" },
  { id: "CLAW-03", lane: "C" },
  { id: "CLAW-04", lane: "D" },
];

export function ClawCafeApp({ config, skillTick, lastSkillId }: AgentAppContext) {
  const { frame, connected } = useVisionStream();
  useMotorStream();
  const kiosk = typeof config.kioskName === "string" ? config.kioskName : "Engage Desk";
  const [activeLane, setActiveLane] = useState("A");
  const [guestQueue, setGuestQueue] = useState<string[]>([]);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [lastDrop, setLastDrop] = useState<string | null>(null);

  const preview =
    frame?.previewBase64 && frame.encoding === 1 ? `data:image/jpeg;base64,${frame.previewBase64}` : null;

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (lastSkillId === "reset_lane") {
      setGuestQueue([]);
      setLastDrop(null);
      return;
    }
    if (lastSkillId !== "drop_claw" && lastSkillId !== "start_game" && lastSkillId !== "photo_booth") return;
    setGamesPlayed((n) => n + 1);
    setGuestQueue((q) => [`Guest #${q.length + 1} · lane ${activeLane}`, ...q].slice(0, 6));
    setLastDrop(new Date().toLocaleTimeString());
  }, [skillTick, lastSkillId, activeLane]);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("claw-cafe").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{kiosk}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Engage Claw · lane {activeLane} · {gamesPlayed} engagements · vision {connected ? "LIVE" : "offline"}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <AppMetric label="Active Lane" value={activeLane} unit="tap bot tile" highlight />
        <AppMetric label="Guest Queue" value={String(guestQueue.length)} unit="waiting" />
        <AppMetric label="Last Drop" value={lastDrop ?? "—"} unit="motor_out" />
      </div>

      <div className="flex flex-wrap gap-2 font-mono text-[10px]">
        {BOTS.map((b) => (
          <button
            key={b.lane}
            type="button"
            onClick={() => setActiveLane(b.lane)}
            className={`border px-3 py-1.5 uppercase tracking-widest ${
              activeLane === b.lane ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
            }`}
          >
            Lane {b.lane}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {BOTS.map((bot, idx) => (
          <AppSection
            key={bot.id}
            title={bot.id}
            subtitle={`Lane ${bot.lane}${activeLane === bot.lane ? " · SELECTED" : ""}`}
          >
            <div className="relative aspect-video bg-void">
              {idx === 0 && preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={`${bot.id} feed`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted">
                  {idx === 0 ? "AWAITING FRAME" : "MOCK FEED · LOCAL"}
                </div>
              )}
            </div>
          </AppSection>
        ))}
      </div>

      {guestQueue.length > 0 ? (
        <AppSection title="Guest Queue" subtitle="Start Game adds guests · Drop Claw runs grab">
          <ul className="font-mono text-xs text-stark">
            {guestQueue.map((g) => (
              <li key={g} className="border-b border-line/40 py-1">
                {g}
              </li>
            ))}
          </ul>
        </AppSection>
      ) : null}
    </div>
  );
}
