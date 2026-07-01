"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { ActiveClawBadge } from "@/components/claw/ActiveClawBadge";
import { UnifiedInboxPanel } from "@/components/comms/UnifiedInboxPanel";
import { OsApprovalStrip } from "@/components/os/OsApprovalStrip";
import { WelcomeSettingsBanner } from "@/components/desktop/WelcomeSettingsBanner";
import { StartNewClawButton } from "@/components/claw/StartNewClawButton";
import { HomeMorningCanvas } from "@/components/desktop/HomeMorningCanvas";
import { ActivityFeed } from "@/components/shell/ActivityFeed";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";
import { enabledOperateAppRoutes } from "@/lib/fre-routing";
import { getOotbApp, type OotbAppId } from "@/lib/ootb-apps";
import { categoryForApp } from "@/lib/ui-categories";

interface HomeOverviewProps {
  selectedApps: OotbAppId[];
}

const SHELL_V2 = process.env.NEXT_PUBLIC_CURXOR_SHELL_V2 === "1";

const CATEGORY_LABEL: Record<string, string> = {
  wealth: "Wealth & growth",
  work: "Work & commerce",
  physical: "Signals & swarm",
  forge: "Create",
};

const ESSENTIAL_JOB_LABELS: Partial<Record<OotbAppId, { title: string; blurb: string }>> = {
  "my-capital": {
    title: "Money",
    blurb: "Track investments and ideas — stays on your box until you connect a broker.",
  },
  "my-content-creator": {
    title: "Content",
    blurb: "Draft posts and scripts — publish only when you say so.",
  },
  "my-work": {
    title: "Outreach",
    blurb: "Follow up with people and opportunities in plain language.",
  },
};

function useMarkHomeVisitedOnLeave() {
  const pathname = usePathname();
  const onHome = useRef(pathname === "/home");

  useEffect(() => {
    const wasHome = onHome.current;
    const nowHome = pathname === "/home";
    if (wasHome && !nowHome) {
      void fetch("/api/activity/visit", { method: "POST" });
    }
    onHome.current = nowHome;
  }, [pathname]);
}

export function HomeOverview({ selectedApps }: HomeOverviewProps) {
  const { level, isEssential, isLayoutExpert } = useExperienceLevel();
  const showExpertTelemetry = level === "expert";
  const feedFirst = SHELL_V2 && !isLayoutExpert;
  const showCenterFeed = SHELL_V2 && !isLayoutExpert;
  const routes = enabledOperateAppRoutes(selectedApps);
  const { frame, connected: visionUp } = useVisionStream();
  const { command, connected: motorUp } = useMotorStream();

  useMarkHomeVisitedOnLeave();

  const hero = (
    <section className={feedFirst ? "curxor-panel" : "curxor-panel md:p-6"}>
      <p className="curxor-eyebrow">CurXor OS</p>
      <h1
        className={`mt-2 font-sans font-semibold tracking-tight text-stark ${feedFirst ? "text-xl" : "text-2xl"}`}
      >
        {isEssential ? "Your team works on your metal" : "Your digital employees, on your metal"}
      </h1>
      {!feedFirst ? (
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted">
          Each Claw is a specialist that works offline on this appliance. Open one below, chat in plain
          language, and tap an action when you&apos;re ready — no coding required.
        </p>
      ) : isEssential ? (
        <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted">
          Tap a job below or ask Patron at the bottom — everything runs locally until you connect an account.
        </p>
      ) : null}
      {!isEssential ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StartNewClawButton />
        </div>
      ) : null}
      <div className="mt-3">
        <ActiveClawBadge />
      </div>
    </section>
  );

  const feed = showCenterFeed ? <ActivityFeed /> : null;
  const approvals = SHELL_V2 ? null : <OsApprovalStrip />;

  const essentialJobs = routes
    .map((route) => {
      const label = ESSENTIAL_JOB_LABELS[route.id];
      if (!label) return null;
      return { route, ...label };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const jobsSection = (stackJobs = false) => (
    <section>
      <h2 className="font-sans text-sm font-medium text-stark">
        {isEssential ? "What do you want to work on?" : "Your team"}
      </h2>
      <p className="mt-1 font-sans text-xs text-muted">
        {isEssential
          ? "Pick a job — chat and one-tap actions open inside each workspace."
          : "Operate Claws — tap to open a workspace with chat and one-tap actions."}
      </p>
      <div
        className={`mt-4 grid gap-3 ${
          stackJobs ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {isEssential
          ? essentialJobs.map(({ route, title, blurb }) => (
              <Link
                key={route.href}
                href={route.href}
                className={`group curxor-card ${feedFirst ? "" : "p-5"}`}
              >
                <span className={`font-sans font-medium text-stark group-hover:text-cursor-glow ${feedFirst ? "text-base" : "text-lg"}`}>
                  {title}
                </span>
                <p className={`mt-2 font-sans leading-relaxed text-muted ${feedFirst ? "text-xs" : "text-sm"}`}>
                  {blurb}
                </p>
              </Link>
            ))
          : routes.map((route) => {
              const app = getOotbApp(route.id);
              const cat = CATEGORY_LABEL[categoryForApp(route.id)] ?? "Claw";
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className="group curxor-card"
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
  );

  return (
    <div className={`${feedFirst ? "w-full space-y-5" : "mx-auto max-w-5xl space-y-8"}`}>
      <WelcomeSettingsBanner />
      {feedFirst ? (
        <HomeMorningCanvas hero={hero} jobs={jobsSection(true)} wideLayout />
      ) : (
        <>
          {hero}
          {feed}
          {approvals}
          {jobsSection()}
        </>
      )}

      {!isEssential ? (
        <UnifiedInboxPanel compact title="Recent conversations" />
      ) : null}

      {!isEssential ? (
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
      ) : null}

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
