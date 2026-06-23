import type { LongevityProtocolStep } from "./vital-health-types";
import type { ProtocolDiffRow, VitalExpertLensId, VitalProtocolDiffReport } from "./vital-lab-types";

interface LensTemplateStep {
  id: string;
  category: LongevityProtocolStep["category"];
  title: string;
  frequency: string;
  detail: string;
  keywords: string[];
}

const LENS_LABELS: Record<VitalExpertLensId, string> = {
  sinclair: "Dr. David Sinclair",
  johnson: "Bryan Johnson · Blueprint",
  attia: "Dr. Peter Attia · Medicine 3.0",
  huberman: "Dr. Andrew Huberman",
  patrick: "Dr. Rhonda Patrick",
  balanced: "Balanced longevity stack",
};

const LENS_TEMPLATES: Record<VitalExpertLensId, LensTemplateStep[]> = {
  sinclair: [
    {
      id: "s-sleep",
      category: "sleep",
      title: "Consistent sleep window",
      frequency: "Daily",
      detail: "Fixed bed/wake times; protect 7–8 hours.",
      keywords: ["sleep", "bed", "wake", "window"],
    },
    {
      id: "s-move",
      category: "movement",
      title: "Daily movement signal",
      frequency: "Daily",
      detail: "Walk or train — exercise as an epigenetic reset.",
      keywords: ["walk", "exercise", "movement", "cardio"],
    },
    {
      id: "s-fast",
      category: "nutrition",
      title: "Time-restricted eating",
      frequency: "Daily",
      detail: "Consistent feeding window; avoid late calories.",
      keywords: ["fast", "eating", "window", "nutrition"],
    },
    {
      id: "s-labs",
      category: "labs",
      title: "Track metabolic markers",
      frequency: "Quarterly",
      detail: "Glucose, lipids, inflammation — inform NAD+ discussions with clinician.",
      keywords: ["lab", "metabolic", "panel", "quarterly"],
    },
  ],
  johnson: [
    {
      id: "j-sleep",
      category: "sleep",
      title: "Blueprint sleep window",
      frequency: "Daily",
      detail: "22:30–06:30 target; evening Bryan does not sabotage morning Bryan.",
      keywords: ["sleep", "window", "bed"],
    },
    {
      id: "j-nutrition",
      category: "nutrition",
      title: "Plant-forward protein meals",
      frequency: "Daily",
      detail: "≥30g protein at key meals; minimal ultra-processed food.",
      keywords: ["protein", "nutrition", "meal", "plant"],
    },
    {
      id: "j-move",
      category: "movement",
      title: "Daily training block",
      frequency: "Daily",
      detail: "Structured exercise session — cardio and strength mix.",
      keywords: ["exercise", "training", "movement", "cardio", "strength"],
    },
    {
      id: "j-labs",
      category: "labs",
      title: "Quarterly biomarker panel",
      frequency: "Quarterly",
      detail: "Full metabolic + lipids; adjust protocol from data.",
      keywords: ["lab", "biomarker", "panel", "quarterly"],
    },
  ],
  attia: [
    {
      id: "a-zone2",
      category: "movement",
      title: "Zone 2 cardio",
      frequency: "4× / week",
      detail: "Conversational pace — 45–60 min sessions.",
      keywords: ["zone", "cardio", "walk", "cycle"],
    },
    {
      id: "a-strength",
      category: "movement",
      title: "Strength & grip",
      frequency: "3× / week",
      detail: "Centenarian decathlon — maintain muscle and grip.",
      keywords: ["strength", "grip", "weights", "resistance"],
    },
    {
      id: "a-sleep",
      category: "sleep",
      title: "Sleep for recovery",
      frequency: "Daily",
      detail: "7+ hours; HRV trend monitoring.",
      keywords: ["sleep", "hrv", "recovery"],
    },
    {
      id: "a-labs",
      category: "labs",
      title: "Metabolic panel",
      frequency: "Quarterly",
      detail: "A1c, lipids, BP — Medicine 3.0 baseline.",
      keywords: ["metabolic", "a1c", "ldl", "labs"],
    },
  ],
  huberman: [
    {
      id: "h-light",
      category: "sleep",
      title: "Morning light exposure",
      frequency: "Daily",
      detail: "Outdoor light within 60 min of waking.",
      keywords: ["light", "morning", "circadian"],
    },
    {
      id: "h-sleep",
      category: "sleep",
      title: "Sleep window & hygiene",
      frequency: "Daily",
      detail: "Cool, dark room; consistent schedule.",
      keywords: ["sleep", "window", "bed"],
    },
    {
      id: "h-stress",
      category: "mindfulness",
      title: "Stress downshift",
      frequency: "Daily",
      detail: "Breathwork or NSDR — cortisol management.",
      keywords: ["stress", "meditation", "breath", "mindfulness"],
    },
    {
      id: "h-move",
      category: "movement",
      title: "Daily movement",
      frequency: "Daily",
      detail: "Walk or train — supports sleep depth.",
      keywords: ["walk", "movement", "exercise"],
    },
  ],
  patrick: [
    {
      id: "p-nutrition",
      category: "nutrition",
      title: "Nutrient-dense meals",
      frequency: "Daily",
      detail: "Vegetables, legumes, quality fats; adequate protein.",
      keywords: ["nutrition", "protein", "vegetable", "nutrient"],
    },
    {
      id: "p-labs",
      category: "labs",
      title: "Vitamin D & omega-3 index",
      frequency: "Quarterly",
      detail: "Test and tune — don't guess micronutrients.",
      keywords: ["vitamin", "omega", "lab", "micronutrient"],
    },
    {
      id: "p-heat",
      category: "movement",
      title: "Heat stress (optional)",
      frequency: "3× / week",
      detail: "Sauna if cleared — cardiovascular stressor.",
      keywords: ["sauna", "heat", "movement"],
    },
    {
      id: "p-sleep",
      category: "sleep",
      title: "Sleep consistency",
      frequency: "Daily",
      detail: "Recovery enables immune and metabolic repair.",
      keywords: ["sleep", "recovery"],
    },
  ],
  balanced: [],
};

function buildBalancedTemplate(): LensTemplateStep[] {
  const seen = new Set<string>();
  const merged: LensTemplateStep[] = [];
  for (const lens of ["sinclair", "johnson", "attia", "huberman", "patrick"] as VitalExpertLensId[]) {
    for (const step of LENS_TEMPLATES[lens]) {
      const key = `${step.category}:${step.title.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(step);
    }
  }
  return merged.slice(0, 8);
}

LENS_TEMPLATES.balanced = buildBalancedTemplate();

function stepMatchesTemplate(user: LongevityProtocolStep, template: LensTemplateStep): boolean {
  if (user.category === template.category) return true;
  const userText = `${user.title} ${user.detail}`.toLowerCase();
  return template.keywords.some((kw) => userText.includes(kw));
}

function toRow(step: LensTemplateStep | LongevityProtocolStep, status: ProtocolDiffRow["status"]): ProtocolDiffRow {
  return {
    id: step.id,
    title: step.title,
    category: step.category,
    frequency: step.frequency,
    status,
    detail: step.detail,
  };
}

export function expertLensLabel(lens: VitalExpertLensId): string {
  return LENS_LABELS[lens];
}

export function availableExpertLenses(): VitalExpertLensId[] {
  return ["balanced", "sinclair", "johnson", "attia", "huberman", "patrick"];
}

export function buildProtocolDiffReport(
  protocol: LongevityProtocolStep[],
  expertLens: VitalExpertLensId,
): VitalProtocolDiffReport {
  const template = LENS_TEMPLATES[expertLens] ?? LENS_TEMPLATES.balanced;
  const aligned: ProtocolDiffRow[] = [];
  const missing: ProtocolDiffRow[] = [];
  const matchedUser = new Set<string>();

  for (const tpl of template) {
    const hit = protocol.find((p) => stepMatchesTemplate(p, tpl));
    if (hit) {
      matchedUser.add(hit.id);
      aligned.push(toRow(hit, "aligned"));
    } else {
      missing.push(toRow(tpl, "missing"));
    }
  }

  const extra = protocol
    .filter((p) => !matchedUser.has(p.id))
    .map((p) => toRow(p, "extra"));

  const alignmentScore =
    template.length > 0 ? Math.round((aligned.length / template.length) * 100) : protocol.length > 0 ? 100 : 0;

  const summary =
    alignmentScore >= 75
      ? `Strong alignment (${alignmentScore}%) with ${LENS_LABELS[expertLens]} — tune extras or add missing pillars.`
      : alignmentScore >= 40
        ? `Partial alignment (${alignmentScore}%) — prioritize missing ${missing.slice(0, 2).map((m) => m.category).join(" & ")} steps.`
        : `Low alignment (${alignmentScore}%) — consider Update Protocol skill or adopt missing ${LENS_LABELS[expertLens]} steps.`;

  return {
    expertLens,
    expertLabel: LENS_LABELS[expertLens],
    alignmentScore,
    aligned,
    missing,
    extra,
    summary,
  };
}
