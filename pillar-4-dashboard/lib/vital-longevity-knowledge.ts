/** Curated longevity research themes — educational preview, not medical advice. */

export interface LongevityExpert {
  id: string;
  name: string;
  focus: string;
  themes: string[];
  note: string;
}

export interface LongevityPillar {
  id: string;
  title: string;
  summary: string;
}

export interface LongevitySampleQuestion {
  id: string;
  question: string;
  previewAnswer: string;
  tags: string[];
  expertIds: string[];
}

export interface LongevityRoadmapItem {
  id: string;
  title: string;
  detail: string;
  status: "preview" | "coming_soon" | "planned";
}

export const VITAL_LONGEVITY_DISCLAIMER =
  "Educational only — not medical advice. Vital Claw runs on your appliance; confirm changes with a qualified clinician.";

export const LONGEVITY_EXPERTS: LongevityExpert[] = [
  {
    id: "sinclair",
    name: "Dr. David Sinclair",
    focus: "Epigenetic aging · NAD+ · lifestyle signals",
    themes: ["Information theory of aging", "NAD+ / sirtuin pathways", "Sleep & fasting", "Exercise as longevity signal"],
    note: "Harvard aging lab — popularized reversible epigenetic age and daily longevity habits in Lifespan.",
  },
  {
    id: "johnson",
    name: "Bryan Johnson",
    focus: "Don't Die · Blueprint · measured self",
    themes: ["Biomarker-driven protocol", "Sleep as non-negotiable", "Plant-forward nutrition", "Algorithm over mood"],
    note: "Blueprint / Don't Die — extreme measurement today; the accessible lesson is data + habits, not copying every pill.",
  },
  {
    id: "attia",
    name: "Dr. Peter Attia",
    focus: "Medicine 3.0 · healthspan · training",
    themes: ["Zone 2 cardio", "VO₂ max & grip strength", "Metabolic health", "Centenarian decathlon"],
    note: "Outlive — frames longevity as years of capability, not just years alive.",
  },
  {
    id: "huberman",
    name: "Dr. Andrew Huberman",
    focus: "Neuroscience protocols · sleep & light",
    themes: ["Morning light anchor", "Sleep architecture", "Stress tools", "Foundational supplements debate"],
    note: "Huberman Lab — actionable neuroscience for sleep, focus, and recovery stacks.",
  },
  {
    id: "patrick",
    name: "Dr. Rhonda Patrick",
    focus: "Micronutrients · heat · inflammation",
    themes: ["Vitamin D & omega-3", "Sauna / heat stress", "Nutrient density", "Gut–immune axis"],
    note: "FoundMyFitness — bridges micronutrient science with practical diet choices.",
  },
];

export const LONGEVITY_PILLARS: LongevityPillar[] = [
  {
    id: "sleep",
    title: "Sleep",
    summary: "Consistent window, dim evenings, cool room — the highest-leverage recovery lever in every major protocol.",
  },
  {
    id: "movement",
    title: "Movement",
    summary: "Zone 2 base + strength — Attia's centenarian decathlon and Johnson's daily training block converge here.",
  },
  {
    id: "nutrition",
    title: "Nutrition",
    summary: "Protein-forward, low ultra-processed, time-restricted eating — Sinclair and Blueprint both emphasize metabolic calm.",
  },
  {
    id: "biomarkers",
    title: "Biomarkers",
    summary: "Quarterly labs, HRV, sleep score — Johnson's Don't Die thesis: let organs speak through data, not cravings.",
  },
  {
    id: "mind",
    title: "Stress & mind",
    summary: "Downshift cortisol — meditation, social connection, and light exposure show up across Huberman and Attia playbooks.",
  },
];

export const LONGEVITY_SAMPLE_QUESTIONS: LongevitySampleQuestion[] = [
  {
    id: "nad-sinclair",
    question: "What does Sinclair say about NAD+ and aging?",
    tags: ["sinclair", "nad", "supplements"],
    expertIds: ["sinclair"],
    previewAnswer:
      "Sinclair's framing: aging is partly loss of epigenetic information. NAD+ supports sirtuin repair pathways — he discusses precursors (NMN/NR) in research context, but stresses sleep, exercise, and fasting as the foundation. Vital Lab maps this to your vitals and lab vault when you Ask.",
  },
  {
    id: "blueprint-habits",
    question: "What can I borrow from Bryan Johnson's Blueprint without the extreme stack?",
    tags: ["johnson", "blueprint", "habits"],
    expertIds: ["johnson"],
    previewAnswer:
      "The portable Blueprint ideas: fixed sleep window, plant-heavy meals with adequate protein, daily movement, and quarterly bloodwork. Johnson's full pill stack is personalized to his biomarkers — Don't Die's public lesson is measure → adjust → repeat on your metal, not copy 100 supplements.",
  },
  {
    id: "zone2-attia",
    question: "How much Zone 2 cardio does Attia recommend?",
    tags: ["attia", "zone2", "cardio"],
    expertIds: ["attia"],
    previewAnswer:
      "Attia often cites ~3–4 hours/week of Zone 2 (conversational pace) plus strength work. Your Vital desk tracks resting HR and steps — use Protocol diff vs Attia lens to spot missing Zone 2 blocks.",
  },
  {
    id: "sleep-huberman",
    question: "Huberman morning routine for better sleep — what matters?",
    tags: ["huberman", "sleep", "light"],
    expertIds: ["huberman"],
    previewAnswer:
      "Within an hour of waking: bright outdoor light, delay caffeine ~90 minutes, consistent sleep/wake. Vital Lab cross-checks this against your sleep score and HRV from Overview.",
  },
  {
    id: "longevity-priority",
    question: "If I only fix three things for longevity, what should they be?",
    tags: ["general", "priorities"],
    expertIds: ["sinclair", "attia", "johnson"],
    previewAnswer:
      "Across Sinclair, Attia, and Johnson the overlap is: (1) sleep consistency, (2) daily movement with cardio + strength, (3) nutrition that stabilizes metabolic markers. Vital Claw exists so those three stay on your sovereign box — synced to wearables, shared with Kin/Optimus only when you choose.",
  },
];

export const LONGEVITY_ROADMAP: LongevityRoadmapItem[] = [
  {
    id: "personalized-qa",
    title: "Personalized longevity Q&A",
    detail: "Ask anything — answers grounded in your vitals, labs, and FRE focus via local LLM + RAG.",
    status: "preview",
  },
  {
    id: "expert-lenses",
    title: "Expert lenses & protocol diff",
    detail: "Compare your protocol to Sinclair, Blueprint, Attia, Huberman, or Patrick templates.",
    status: "preview",
  },
  {
    id: "literature-rag",
    title: "On-box literature RAG",
    detail: "Curated longevity corpus indexed locally — expandable with operator PDF imports later.",
    status: "preview",
  },
  {
    id: "clinician-export",
    title: "Clinician export",
    detail: "Markdown summary of vitals, reports, and protocol — operator-controlled download.",
    status: "preview",
  },
  {
    id: "live-bridges",
    title: "Live wearable bridges",
    detail: "Scheduled Oura, Samsung Health, Apple Health, Garmin sync via eno2.",
    status: "coming_soon",
  },
  {
    id: "pdf-ocr",
    title: "Lab PDF OCR",
    detail: "Structured parsing of provider PDFs into report vault.",
    status: "planned",
  },
];

export function matchLongevityQuestion(message: string): LongevitySampleQuestion | null {
  const q = message.toLowerCase();
  for (const sample of LONGEVITY_SAMPLE_QUESTIONS) {
    if (sample.tags.some((tag) => q.includes(tag.replace(/-/g, " ")) || q.includes(tag))) {
      return sample;
    }
    const words = sample.question.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    if (words.filter((w) => q.includes(w)).length >= 2) return sample;
  }
  if (/sinclair|nad\+|nmn|nr\b|resveratrol|epigenetic|lifespan/.test(q)) {
    return LONGEVITY_SAMPLE_QUESTIONS.find((s) => s.id === "nad-sinclair") ?? null;
  }
  if (/bryan|johnson|blueprint|don'?t die|dont die|immortal/.test(q)) {
    return LONGEVITY_SAMPLE_QUESTIONS.find((s) => s.id === "blueprint-habits") ?? null;
  }
  if (/attia|zone 2|zone2|vo2|healthspan|outlive/.test(q)) {
    return LONGEVITY_SAMPLE_QUESTIONS.find((s) => s.id === "zone2-attia") ?? null;
  }
  if (/huberman|morning light|circadian|cortisol/.test(q)) {
    return LONGEVITY_SAMPLE_QUESTIONS.find((s) => s.id === "sleep-huberman") ?? null;
  }
  if (/longevity|live longer|anti.?aging|three things|priorit/.test(q)) {
    return LONGEVITY_SAMPLE_QUESTIONS.find((s) => s.id === "longevity-priority") ?? null;
  }
  return null;
}

export function longevityPreviewReply(message: string): string | null {
  const hit = matchLongevityQuestion(message);
  if (hit) return hit.previewAnswer;
  if (/sleep|hrv|resting hr|wearable/.test(message.toLowerCase())) {
    return "Sleep and HRV are core Vital signals — Lab Ask uses your live readings from Overview. Open Protocol diff vs Huberman or Johnson lens for sleep-window gaps.";
  }
  if (/supplement|stack|vitamin|metformin/.test(message.toLowerCase())) {
    return "Supplement questions should reference your lab vault — use Ask Longevity with your metabolic reports on file. Never start a stack without clinician review.";
  }
  return null;
}
