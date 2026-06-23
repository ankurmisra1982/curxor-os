import "server-only";

import type { VitalExpertLensId, VitalLiteratureHit } from "./vital-lab-types";

interface LiteratureChunk {
  id: string;
  title: string;
  source: string;
  expertIds: VitalExpertLensId[];
  tags: string[];
  excerpt: string;
}

const CORPUS: LiteratureChunk[] = [
  {
    id: "lit-sinclair-nad",
    title: "NAD+ decline and sirtuin repair (Sinclair framing)",
    source: "CurXor longevity corpus · Lifespan themes",
    expertIds: ["sinclair", "balanced"],
    tags: ["nad", "nmn", "nr", "sirtuin", "epigenetic", "aging", "sinclair"],
    excerpt:
      "Sinclair describes aging as partly epigenetic information loss. NAD+ supports sirtuin-mediated repair; precursors (NMN/NR) are discussed in research context, but lifestyle signals — sleep, exercise, fasting — remain the foundation before supplementation.",
  },
  {
    id: "lit-sinclair-lifestyle",
    title: "Lifestyle signals over exotic therapies",
    source: "CurXor longevity corpus",
    expertIds: ["sinclair", "balanced"],
    tags: ["sleep", "fasting", "exercise", "sinclair", "habits"],
    excerpt:
      "Consistent sleep, time-restricted eating, and regular movement are presented as primary levers that reset aging clocks before adding novel molecules.",
  },
  {
    id: "lit-johnson-measure",
    title: "Don't Die · measure organs via data",
    source: "CurXor longevity corpus · Blueprint themes",
    expertIds: ["johnson", "balanced"],
    tags: ["blueprint", "johnson", "biomarker", "don't die", "dont die", "labs", "data"],
    excerpt:
      "Johnson's Don't Die thesis: shift decision authority from mood to measured biomarkers. Quarterly panels, sleep scores, and HRV trends drive protocol changes — the operator lesson is algorithmic self-care on sovereign hardware.",
  },
  {
    id: "lit-johnson-sleep",
    title: "Blueprint sleep as non-negotiable",
    source: "CurXor longevity corpus",
    expertIds: ["johnson", "huberman", "balanced"],
    tags: ["sleep", "blueprint", "johnson", "recovery", "hrv"],
    excerpt:
      "Fixed sleep window (roughly 22:30–06:30 in public Blueprint materials), cool dark room, and evening wind-down precede nutrition and supplement stacks. Poor sleep degrades every downstream biomarker.",
  },
  {
    id: "lit-johnson-nutrition",
    title: "Plant-forward, protein-adequate meals",
    source: "CurXor longevity corpus",
    expertIds: ["johnson", "patrick", "balanced"],
    tags: ["nutrition", "protein", "blueprint", "metabolic", "calories"],
    excerpt:
      "Blueprint emphasizes nutrient-dense plants, adequate protein at meals, minimal ultra-processed food, and consistent meal timing — not caloric chaos driven by evening cravings.",
  },
  {
    id: "lit-attia-zone2",
    title: "Zone 2 and centenarian decathlon",
    source: "CurXor longevity corpus · Outlive themes",
    expertIds: ["attia", "balanced"],
    tags: ["attia", "zone2", "zone 2", "cardio", "vo2", "healthspan", "movement"],
    excerpt:
      "Attia frames healthspan as maintaining capability: ~3–4 hours/week Zone 2 (conversational pace), grip strength, and VO₂ max work. Resting HR and step trends are proxies until formal zone testing.",
  },
  {
    id: "lit-attia-metabolic",
    title: "Medicine 3.0 metabolic lens",
    source: "CurXor longevity corpus",
    expertIds: ["attia", "balanced"],
    tags: ["metabolic", "glucose", "a1c", "ldl", "labs", "attia"],
    excerpt:
      "Metabolic health (glucose, A1c, lipids, blood pressure) is treated as a primary longevity axis — labs in your vault should inform nutrition and movement priorities, not generic wellness advice.",
  },
  {
    id: "lit-huberman-light",
    title: "Morning light and circadian anchor",
    source: "CurXor longevity corpus · Huberman Lab themes",
    expertIds: ["huberman", "balanced"],
    tags: ["huberman", "light", "circadian", "morning", "sleep", "cortisol"],
    excerpt:
      "Within an hour of waking: bright outdoor light. Delay caffeine ~90 minutes. Consistent sleep/wake times anchor cortisol and melatonin — high sleep scores on wearables validate adherence.",
  },
  {
    id: "lit-huberman-sleep",
    title: "Sleep architecture hygiene",
    source: "CurXor longevity corpus",
    expertIds: ["huberman", "johnson", "balanced"],
    tags: ["sleep", "huberman", "temperature", "caffeine", "alcohol"],
    excerpt:
      "Evening dim light, cool bedroom, limit late heavy meals and alcohol. HRV and sleep score are feedback loops — adjust evening behavior before adding supplements.",
  },
  {
    id: "lit-patrick-micronutrients",
    title: "Micronutrients and omega-3",
    source: "CurXor longevity corpus · FoundMyFitness themes",
    expertIds: ["patrick", "balanced"],
    tags: ["patrick", "vitamin d", "omega", "micronutrient", "inflammation"],
    excerpt:
      "Patrick emphasizes testing vitamin D, omega-3 index, and nutrient density from whole foods. Sauna/heat stress appears as an optional stressor when cardiovascular clearance exists.",
  },
  {
    id: "lit-patrick-gut",
    title: "Gut–immune axis",
    source: "CurXor longevity corpus",
    expertIds: ["patrick", "balanced"],
    tags: ["gut", "immune", "fiber", "microbiome", "patrick"],
    excerpt:
      "Prebiotic fiber and diverse plants support gut-mediated immunity — relevant when metabolic labs and inflammation markers are tracked in your report vault.",
  },
  {
    id: "lit-general-priority",
    title: "Convergent longevity priorities",
    source: "CurXor longevity corpus",
    expertIds: ["sinclair", "johnson", "attia", "huberman", "patrick", "balanced"],
    tags: ["longevity", "priority", "habits", "healthspan", "three things"],
    excerpt:
      "Across major public frameworks the overlap is: sleep consistency, daily movement (cardio + strength), and nutrition that stabilizes metabolic markers — personalized only when mapped to your vitals and labs.",
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function searchLongevityLiterature(
  query: string,
  limit = 4,
  expertLens?: VitalExpertLensId,
): VitalLiteratureHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored = CORPUS.map((chunk) => {
    const hay = `${chunk.title} ${chunk.excerpt} ${chunk.tags.join(" ")}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += token.length > 5 ? 3 : 2;
    }
    for (const tag of chunk.tags) {
      if (tokens.some((t) => tag.includes(t) || t.includes(tag))) score += 4;
    }
    if (expertLens && expertLens !== "balanced" && chunk.expertIds.includes(expertLens)) {
      score += 2;
    }
    return { ...chunk, score };
  })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ id, title, source, expertIds, excerpt, score }) => ({
    id,
    title,
    source,
    expertIds,
    excerpt,
    score,
  }));
}

export function literatureCorpusSize(): number {
  return CORPUS.length;
}

export function allLiteratureForLens(expertLens: VitalExpertLensId, limit = 6): VitalLiteratureHit[] {
  const chunks =
    expertLens === "balanced"
      ? CORPUS
      : CORPUS.filter((c) => c.expertIds.includes(expertLens) || c.expertIds.includes("balanced"));
  return chunks.slice(0, limit).map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source,
    expertIds: c.expertIds,
    excerpt: c.excerpt,
    score: 1,
  }));
}
