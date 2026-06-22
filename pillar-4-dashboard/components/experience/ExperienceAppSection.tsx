"use client";

import type { ReactNode } from "react";

import { AppSection } from "@/components/app-shared/AppLayout";
import { ExperienceCoach } from "@/components/experience/ExperienceCoach";
import { ExperienceGate } from "@/components/experience/ExperienceGate";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import type { ExperienceLevel } from "@/lib/experience-level";
import type { OotbAppId } from "@/lib/ootb-apps";

export function ExperienceAppSection({
  appId,
  sectionId,
  minLevel = "beginner",
  title,
  subtitle,
  children,
  className = "",
  action,
  showCoach = true,
  hideWhen = false,
  skipExperienceGate = false,
}: {
  appId: OotbAppId;
  sectionId: string;
  minLevel?: ExperienceLevel;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  showCoach?: boolean;
  hideWhen?: boolean;
  /** When true, parent already gated (e.g. growth level) — skip 3-tier experience shell. */
  skipExperienceGate?: boolean;
}) {
  const { meetsLevel } = useExperienceLevel();

  if (hideWhen) return null;

  if (!skipExperienceGate && !meetsLevel(minLevel)) {
    return (
      <AppSection title={title} subtitle={subtitle} className={className} action={action}>
        <ExperienceGate minLevel={minLevel}>{null}</ExperienceGate>
      </AppSection>
    );
  }

  return (
    <AppSection title={title} subtitle={subtitle} className={className} action={action}>
      {showCoach ? <ExperienceCoach appId={appId} sectionId={sectionId} /> : null}
      {children}
    </AppSection>
  );
}
