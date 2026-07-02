"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppMetric } from "@/components/app-shared/AppLayout";
import { CafeAscensionPanel } from "@/components/apps/cafe/CafeAscensionPanel";
import { CafeGoLivePanel, type CafeGoLiveReportRow } from "@/components/apps/cafe/CafeGoLivePanel";
import { CafeLevelUpNudge } from "@/components/apps/cafe/CafeLevelUpNudge";
import { CafeOsApprovalSection } from "@/components/apps/cafe/CafeOsApprovalSection";
import { CafeHostConfigPanel } from "@/components/apps/cafe/CafeHostConfigPanel";
import { CafeLevelBadge } from "@/components/apps/cafe/CafeLevelBadge";
import { CafeLevelUpModal } from "@/components/apps/cafe/CafeLevelUpModal";
import { CafePixelCanvas } from "@/components/apps/cafe/CafePixelCanvas";
import { CafeUnifiedFeedPanel } from "@/components/apps/cafe/CafeUnifiedFeedPanel";
import {
  CafeWorkspaceTabs,
  cafeTabsForGrowth,
  defaultCafeTab,
  type CafeWorkspaceTab,
} from "@/components/apps/cafe/CafeWorkspaceTabs";
import { CafeWorkStreakStrip } from "@/components/apps/cafe/CafeWorkStreakStrip";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { resolveCafeGrowthLevel } from "@/lib/cafe-growth";
import { formatCafeProfileLine } from "@/lib/cafe-epithet";
import type { AscensionState, AscensionTierId } from "@/lib/claw-cafe-ascension";
import { ASCENSION_TIER_INDEX } from "@/lib/claw-cafe-ascension";
import type { CafeCharacter } from "@/lib/claw-cafe-spatial";
import { getOotbApp } from "@/lib/ootb-apps";
import { CAFE_DEFAULT_KIOSK_NAME } from "@/lib/ol1-layer";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const BOTS = [
  { id: "CLAW-01", lane: "A" },
  { id: "CLAW-02", lane: "B" },
  { id: "CLAW-03", lane: "C" },
  { id: "CLAW-04", lane: "D" },
];

function readActiveLanes(config: Record<string, unknown>): string[] {
  const raw = config.activeLanes;
  if (!Array.isArray(raw)) return ["A", "B", "C", "D"];
  return raw.filter((lane): lane is string => typeof lane === "string" && lane.length > 0);
}

export function ClawCafeApp({ config, skillTick, lastSkillId }: AgentAppContext) {
  const { frame, connected } = useVisionStream();
  useMotorStream();
  const { level } = useExperienceLevel();
  const growthLevel = resolveCafeGrowthLevel(config, level);
  const [workspaceTab, setWorkspaceTab] = useState<CafeWorkspaceTab>(() => defaultCafeTab(growthLevel));

  const kiosk = typeof config.kioskName === "string" ? config.kioskName : CAFE_DEFAULT_KIOSK_NAME;
  const prizeMode = typeof config.prizeMode === "string" ? config.prizeMode : "demo";
  const activeLanes = useMemo(() => readActiveLanes(config), [config]);

  const [activeLane, setActiveLane] = useState("A");
  const [guestQueue, setGuestQueue] = useState<string[]>([]);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [lastDrop, setLastDrop] = useState<string | null>(null);
  const [xpEvents, setXpEvents] = useState<Array<{ id: string; kind: string; at: string }>>([]);
  const [xpStreak, setXpStreak] = useState(0);
  const [xpOptOut, setXpOptOut] = useState(false);
  const [xpBonus, setXpBonus] = useState("");
  const [xpLoading, setXpLoading] = useState(false);

  const [ascensionLoading, setAscensionLoading] = useState(false);
  const [ascensionOptOut, setAscensionOptOut] = useState(false);
  const [ascension, setAscension] = useState<AscensionState | null>(null);
  const [cafeEpithet, setCafeEpithet] = useState("");
  const [levelUpAscension, setLevelUpAscension] = useState<AscensionState | null>(null);
  const tierRef = useRef<AscensionTierId | null>(null);
  const [cafeEvents, setCafeEvents] = useState<
    Array<{ id: string; kind: string; appId: string; at: string; bubble?: string; xp?: { ascension: number } }>
  >([]);
  const [characters, setCharacters] = useState<CafeCharacter[]>([]);
  const [lastRoomPulseAt, setLastRoomPulseAt] = useState<string | null>(null);
  const [goLive, setGoLive] = useState<CafeGoLiveReportRow | null>(null);
  const [builderBridgeLinked, setBuilderBridgeLinked] = useState(false);
  const [demoTourRunning, setDemoTourRunning] = useState(false);
  const [yardActUntilMs, setYardActUntilMs] = useState(0);

  const applyCafeBootstrap = useCallback(
    (json: {
      ascension?: AscensionState;
      epithet?: string;
      events?: typeof cafeEvents;
      characters?: CafeCharacter[];
      lastRoomPulseAt?: string | null;
      optOut?: boolean;
      goLive?: CafeGoLiveReportRow;
      builderBridgeLinked?: boolean;
    }) => {
      if (json.ascension) setAscension(json.ascension);
      setCafeEpithet(json.epithet ?? "");
      setCafeEvents(json.events ?? []);
      setCharacters(json.characters ?? []);
      setLastRoomPulseAt(json.lastRoomPulseAt ?? null);
      setAscensionOptOut(json.optOut === true);
      if (json.goLive) setGoLive(json.goLive);
      if (json.builderBridgeLinked !== undefined) setBuilderBridgeLinked(json.builderBridgeLinked);
    },
    [],
  );

  const loadCafeAscension = useCallback(async (sync = false) => {
    setAscensionLoading(true);
    try {
      const res = await fetch("/api/cafe/status", {
        cache: "no-store",
        method: sync ? "POST" : "GET",
        ...(sync ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) } : {}),
      });
      const json = (await res.json()) as Parameters<typeof applyCafeBootstrap>[0];
      applyCafeBootstrap(json);
    } finally {
      setAscensionLoading(false);
    }
  }, [applyCafeBootstrap]);

  const refreshGoLive = useCallback(async () => {
    const res = await fetch("/api/cafe/status", {
      cache: "no-store",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "go_live" }),
    });
    const json = (await res.json()) as { goLive?: CafeGoLiveReportRow };
    if (json.goLive) setGoLive(json.goLive);
  }, []);

  const runDemoTour = useCallback(async () => {
    setDemoTourRunning(true);
    try {
      const res = await fetch("/api/cafe/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_demo_tour" }),
      });
      const json = (await res.json()) as Parameters<typeof applyCafeBootstrap>[0] & { ok?: boolean };
      applyCafeBootstrap(json);
    } finally {
      setDemoTourRunning(false);
    }
  }, [applyCafeBootstrap]);

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
    void loadCafeAscension();
  }, [loadWorkXp, loadCafeAscension]);

  useEffect(() => {
    if (workspaceTab !== "ascension") return;
    void loadWorkXp();
  }, [workspaceTab, loadWorkXp]);

  useEffect(() => {
    if (workspaceTab !== "ascension" || ascensionOptOut) return;
    const source = new EventSource("/api/stream/cafe");
    source.onmessage = (msg) => {
      try {
        const json = JSON.parse(msg.data) as Parameters<typeof applyCafeBootstrap>[0];
        applyCafeBootstrap(json);
      } catch {
        /* ignore malformed SSE */
      }
    };
    return () => source.close();
  }, [workspaceTab, ascensionOptOut, applyCafeBootstrap]);

  useEffect(() => {
    if (!ascension || ascensionOptOut) return;
    const prev = tierRef.current;
    tierRef.current = ascension.tier;
    if (prev && ASCENSION_TIER_INDEX[ascension.tier] > ASCENSION_TIER_INDEX[prev]) {
      setLevelUpAscension(ascension);
    }
  }, [ascension, ascensionOptOut]);

  const ascensionProfileLine = useMemo(
    () => (ascension ? formatCafeProfileLine(ascension.title, cafeEpithet) : null),
    [ascension, cafeEpithet],
  );

  useEffect(() => {
    setWorkspaceTab((prev) => {
      const visible = cafeTabsForGrowth(growthLevel);
      return visible.includes(prev) ? prev : defaultCafeTab(growthLevel);
    });
  }, [growthLevel]);

  const preview =
    frame?.previewBase64 && frame.encoding === 1 ? `data:image/jpeg;base64,${frame.previewBase64}` : null;

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (lastSkillId === "run_cafe_demo_tour") {
      void loadCafeAscension(true);
      return;
    }
    if (lastSkillId === "reset_lane") {
      setGuestQueue([]);
      setLastDrop(null);
      return;
    }
    if (lastSkillId === "drop_claw") {
      setYardActUntilMs(Date.now() + 1800);
    }
    if (lastSkillId !== "drop_claw" && lastSkillId !== "start_game" && lastSkillId !== "photo_booth") return;
    setGamesPlayed((n) => n + 1);
    setGuestQueue((q) => [`Guest #${q.length + 1} · lane ${activeLane}`, ...q].slice(0, 6));
    setLastDrop(new Date().toLocaleTimeString());
  }, [skillTick, lastSkillId, activeLane, loadCafeAscension]);

  const laneBots = BOTS.filter((b) => activeLanes.includes(b.lane));

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          Patron Hall · {getOotbApp("claw-cafe").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{kiosk}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">
          <span>
            Claw Cafe · lane {activeLane} · {gamesPlayed} sessions · vision {connected ? "LIVE" : "offline"}
          </span>
          <CafeLevelBadge growthLevel={growthLevel} />
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <AppMetric label="Active Lane" value={activeLane} unit="tap bot tile" highlight />
        <AppMetric label="Guest Queue" value={String(guestQueue.length)} unit="waiting" />
        <AppMetric label="Last Drop" value={lastDrop ?? "—"} unit="motor_out" />
      </div>

      <CafeWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} growthLevel={growthLevel} />

      {workspaceTab === "play" ? (
        <>
          <div className="flex flex-wrap gap-2 font-mono text-[10px]">
            {laneBots.map((b) => (
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
              {laneBots.map((bot, idx) => (
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
              minLevel="beginner"
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
        </>
      ) : null}

      {workspaceTab === "ascension" ? (
        <>
          <ExperienceAppSection
            appId="claw-cafe"
            sectionId="spatial-room"
            minLevel="beginner"
            title="Pixel room"
            subtitle="Walk the room · Claws animate on live SSE events"
          >
            <CafePixelCanvas
              characters={characters}
              lastPulseAt={lastRoomPulseAt}
              ascensionSnippet={ascensionProfileLine ? `${ascensionProfileLine} · ${ascension?.ascensionXp ?? 0} XP` : null}
              ascensionTier={ascension?.tier ?? "sprout"}
              growthLevel={growthLevel}
              visionConnected={connected}
              builderBridgeLinked={builderBridgeLinked}
              yardActUntilMs={yardActUntilMs}
            />
          </ExperienceAppSection>

          <CafeOsApprovalSection />

          <ExperienceAppSection
            appId="claw-cafe"
            sectionId="go-live"
            minLevel="beginner"
            title="Go Live"
            subtitle="Demo-ready checklist · run tour to celebrate across Claws"
          >
            <CafeGoLivePanel
              report={goLive}
              onRefresh={() => void refreshGoLive()}
              onRunDemoTour={() => void runDemoTour()}
              demoTourRunning={demoTourRunning}
            />
          </ExperienceAppSection>

          <ExperienceAppSection
            appId="claw-cafe"
            sectionId="ascension-profile"
            minLevel="beginner"
            title="Ascension"
            subtitle="G1–G6 tiers · Knowledge & Wealth affinities"
          >
            {ascension ? (
              <div className="space-y-3">
                <CafeLevelUpNudge
                  ascension={ascension}
                  optOut={ascensionOptOut}
                  loading={ascensionLoading}
                  onSync={() => void loadCafeAscension(true)}
                />
                <CafeAscensionPanel
                  ascension={ascension}
                  epithet={cafeEpithet}
                  optOut={ascensionOptOut}
                  loading={ascensionLoading}
                  onRefresh={() => void loadCafeAscension()}
                  onSync={() => void loadCafeAscension(true)}
                />
              </div>
            ) : (
              <p className="font-mono text-[10px] text-muted">Loading ascension…</p>
            )}
          </ExperienceAppSection>

          <ExperienceAppSection
            appId="claw-cafe"
            sectionId="work-xp"
            minLevel="beginner"
            title="Cross-Claw feed"
            subtitle="Work, Creator, Capital, Swarm, and Forge events in one ledger"
          >
            <CafeWorkStreakStrip
              streak={xpStreak}
              eventCount={xpEvents.length}
              optOut={xpOptOut}
              bonusReason={xpBonus}
              loading={xpLoading}
              onRefresh={() => void loadWorkXp()}
            />
            <div className="mt-3">
              <CafeUnifiedFeedPanel events={cafeEvents} loading={ascensionLoading} />
            </div>
          </ExperienceAppSection>
        </>
      ) : null}

      {workspaceTab === "host" ? (
        <ExperienceAppSection
          appId="claw-cafe"
          sectionId="host-config"
          minLevel="standard"
          title="Host config"
          subtitle="Patron Hall kiosk name, prize mode, and lane layout"
        >
          <CafeHostConfigPanel kioskName={kiosk} prizeMode={prizeMode} activeLanes={activeLanes} />
        </ExperienceAppSection>
      ) : null}

      <CafeLevelUpModal
        ascension={levelUpAscension}
        epithet={cafeEpithet}
        onClose={() => setLevelUpAscension(null)}
      />
    </div>
  );
}
