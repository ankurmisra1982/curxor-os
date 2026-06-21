"use client";

import { useExperienceLevel } from "@/components/ui/UiModeProvider";

/** Inline experience tier label for app headers. */
export function ExperienceLevelBadge() {
  const { levelLabel } = useExperienceLevel();
  return <span className="text-muted"> · {levelLabel} mode</span>;
}
