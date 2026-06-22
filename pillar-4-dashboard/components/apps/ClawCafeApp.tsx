"use client";

import { useCallback, useEffect, useState } from "react";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import { WorkCafeXpPanel } from "@/components/apps/work/WorkCafeXpPanel";
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
  const [xpEvents, setXpEvents] = useState<Array<{ id: string; kind: string; at: string }>>([]);
  const [xpStreak, setXpStreak] = useState(0);
  const [xpOptOut, setXpOptOut] = useState(false);
  const [xpBonus, setXpBonus] = useState("");
  const [xpLoading, setXpLoading] = useState(false);

  const loadWorkXp = useCallback(async () => {
    setXpLoading(true);
    try {
      const res = await fetch("/api/work/xp", { cache: "no-store" });
      const json = (await res.json()) as {
        events?: Array<{ id: string; kind: string; at: string }>;
        streak?: number;
        optOut?: boolean;
        bonus?: { reason?: string; eligible?: boolean };
      };
      setXpEvents(json.events ?? []);
      setXpStreak(json.streak ?? 0);
      setXpOptOut(json.optOut === true);
      setXpBonus(json.bonus?.eligible ? json.bonus.reason ?? "" : "");
    } finally {
      setXpLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkXp();
  }, [loadWorkXp]);

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
          <ExperienceLevelBadge />
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

      <ExperienceAppSection
        appId="claw-cafe"
        sectionId="lanes"
        minLevel="beginner"
        title="Lane vision feeds"
        subtitle="Lane A uses live mesh vision when connected"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {BOTS.map((bot, idx) => (
            <div key={bot.id} className="border border-line bg-panel p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {bot.id} · Lane {bot.lane}
                {activeLane === bot.lane ? " · SELECTED" : ""}
              </p>
              <div className="relative mt-2 aspect-video bg-void">
                {idx === 0 && preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={`${bot.id} feed`} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted">
                    {idx === 0 ? "AWAITING FRAME" : "MOCK FEED · LOCAL"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ExperienceAppSection>

      {guestQueue.length > 0 ? (
        <ExperienceAppSection
          appId="claw-cafe"
          sectionId="guest-queue"
          minLevel="standard"
          title="Guest Queue"
          subtitle="Start Game adds guests · Drop Claw runs grab"
        >
          <ul className="font-mono text-xs text-stark">
            {guestQueue.map((g) => (
              <li key={g} className="border-b border-line/40 py-1">
                {g}
              </li>
            ))}
          </ul>
        </ExperienceAppSection>
      ) : null}

      <ExperienceAppSection
        appId="claw-cafe"
        sectionId="work-xp"
        minLevel="standard"
        title="Work desk XP"
        subtitle="Cross-Claw streak from Work Claw events"
      >
        <WorkCafeXpPanel
          events={xpEvents}
          streak={xpStreak}
          optOut={xpOptOut}
          bonusReason={xpBonus}
          loading={xpLoading}
          onRefresh={() => void loadWorkXp()}
        />
      </ExperienceAppSection>
    </div>
  );
}
