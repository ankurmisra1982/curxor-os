"use client";

import Link from "next/link";

import { ActiveClawBadge } from "@/components/claw/ActiveClawBadge";
import { UnifiedInboxPanel } from "@/components/comms/UnifiedInboxPanel";
import { OsApprovalStrip } from "@/components/os/OsApprovalStrip";
import { WelcomeSettingsBanner } from "@/components/desktop/WelcomeSettingsBanner";
import { StartNewClawButton } from "@/components/claw/StartNewClawButton";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";
import { enabledAppRoutes } from "@/lib/fre-routing";
import { getOotbApp, type OotbAppId } from "@/lib/ootb-apps";
import { categoryForApp } from "@/lib/ui-categories";

interface HomeOverviewProps {
  selectedApps: OotbAppId[];
}

const CATEGORY_LABEL: Record<string, string> = {
  wealth: "Wealth & growth",
  work: "Work & commerce",
  physical: "Signals & swarm",
  forge: "Create",
};

export function HomeOverview({ selectedApps }: HomeOverviewProps) {
  const { level } = useExperienceLevel();
  const showExpertTelemetry = level === "expert";
  const routes = enabledAppRoutes(selectedApps).filter((r) => r.id !== "claw-forge");
  const { frame, connected: visionUp } = useVisionStream();
  const { command, connected: motorUp } = useMotorStream();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WelcomeSettingsBanner />
      <section className="border border-line bg-panel p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">CurXor OS</p>
        <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-stark">
          Your digital employees, on your metal
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted">
          Each Claw is a specialist that works offline on this appliance. Open one below, chat in plain
          language, and tap an action when you&apos;re ready — no coding required.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StartNewClawButton />
        </div>
        <div className="mt-4">
          <ActiveClawBadge />
        </div>
      </section>

      <OsApprovalStrip />

      <UnifiedInboxPanel compact title="Recent conversations" />

      <section>
        <h2 className="font-sans text-sm font-medium text-stark">Your Claws</h2>
        <p className="mt-1 font-sans text-xs text-muted">Tap to open a workspace with chat and one-tap actions.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => {
            const app = getOotbApp(route.id);
            const cat = CATEGORY_LABEL[categoryForApp(route.id)] ?? "Claw";
            return (
              <Link
                key={route.href}
                href={route.href}
                className="group border border-line bg-void p-4 transition hover:border-cursor-glow hover:bg-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-sans text-base font-medium text-stark group-hover:text-cursor-glow">
                    {app.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted">{cat}</span>
                </div>
                <p className="mt-2 font-sans text-xs leading-relaxed text-muted">{app.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickCard
          title="1 · Pick a Claw"
          body="Choose the job you want done — investing, content, outreach, or more."
        />
        <QuickCard
          title="2 · Chat or tap"
          body="Ask in plain language on the right, or tap a skill button when you know the action."
        />
        <QuickCard
          title="3 · Stay local"
          body="Reasoning stays on this box. Trades and posts only leave when you connect a broker or social account."
        />
      </section>

      {showExpertTelemetry ? (
        <section className="border border-line bg-void p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Expert telemetry</h2>
          <div className="mt-3 grid gap-3 font-mono text-xs sm:grid-cols-2">
            <div className="border border-line bg-panel px-3 py-2">
              <span className="text-muted">Vision</span>
              <p className="mt-1 text-stark">
                {visionUp && frame ? `seq ${frame.seq} · ${frame.width}×${frame.height}` : "idle"}
              </p>
            </div>
            <div className="border border-line bg-panel px-3 py-2">
              <span className="text-muted">Motor</span>
              <p className="mt-1 text-stark">
                {motorUp && command
                  ? `claw ${command.clawId} · seq ${command.seq}`
                  : "idle"}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function QuickCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-line bg-panel px-4 py-4">
      <h3 className="font-sans text-sm font-medium text-stark">{title}</h3>
      <p className="mt-2 font-sans text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}
