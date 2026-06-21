"use client";

import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import type { ExperienceLevel } from "@/lib/experience-level";

const CYCLE: ExperienceLevel[] = ["beginner", "standard", "expert"];

/** Inline experience tier — click to cycle beginner → standard → expert. */
export function ExperienceLevelBadge() {
  const { level, levelLabel, setLevel } = useExperienceLevel();

  const cycle = () => {
    const idx = CYCLE.indexOf(level);
    const next = CYCLE[(idx + 1) % CYCLE.length] ?? "beginner";
    setLevel(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title="Click to cycle experience level (beginner → standard → expert)"
      className="text-muted hover:text-cursor-glow"
    >
      {" "}
      · {levelLabel} mode
    </button>
  );
}
