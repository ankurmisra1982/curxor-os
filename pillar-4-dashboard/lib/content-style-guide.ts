import type { BrandKitConfig } from "./content-queue-types";

export interface StyleGuideConfig {
  styleGuide: string;
  voiceTone: string;
  emojiPolicy: "none" | "minimal" | "allowed";
  pov: "first" | "third" | "brand";
}

export interface StyleGuideScore {
  score: number;
  band: "low" | "medium" | "high";
  issues: string[];
  tips: string[];
}

export function parseStyleGuide(raw: unknown): StyleGuideConfig {
  if (typeof raw === "string") {
    try {
      return parseStyleGuide(JSON.parse(raw) as unknown);
    } catch {
      return { styleGuide: raw, voiceTone: "", emojiPolicy: "allowed", pov: "brand" };
    }
  }
  if (!raw || typeof raw !== "object") {
    return { styleGuide: "", voiceTone: "", emojiPolicy: "allowed", pov: "brand" };
  }
  const o = raw as BrandKitConfig & Record<string, unknown>;
  return {
    styleGuide: typeof o.styleGuide === "string" ? o.styleGuide : "",
    voiceTone: typeof o.voiceTone === "string" ? o.voiceTone : "",
    emojiPolicy:
      o.emojiPolicy === "none" || o.emojiPolicy === "minimal" || o.emojiPolicy === "allowed"
        ? o.emojiPolicy
        : "allowed",
    pov: o.pov === "first" || o.pov === "third" || o.pov === "brand" ? o.pov : "brand",
  };
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export function scoreDraftAgainstStyleGuide(text: string, guide: StyleGuideConfig): StyleGuideScore {
  const issues: string[] = [];
  const tips: string[] = [];
  let score = 82;

  const trimmed = text.trim();
  if (trimmed.length < 40) {
    score -= 12;
    issues.push("Draft is very short — add context or a clear hook");
  }
  if (trimmed.length > 900) {
    score -= 8;
    issues.push("Long draft — confirm platform split or thread mode");
  }

  const emojis = trimmed.match(EMOJI_RE) ?? [];
  if (guide.emojiPolicy === "none" && emojis.length > 0) {
    score -= 15;
    issues.push(`Remove emojis (${emojis.length}) per brand policy`);
  } else if (guide.emojiPolicy === "minimal" && emojis.length > 2) {
    score -= 8;
    issues.push("Too many emojis for minimal policy");
  }

  if (guide.pov === "first" && !/\b(I|we|my|our)\b/i.test(trimmed)) {
    score -= 6;
    tips.push("Use first-person voice (I/we) per style guide");
  }
  if (guide.pov === "third" && /\b(I|we|my)\b/i.test(trimmed)) {
    score -= 6;
    issues.push("First-person phrasing conflicts with third-person POV");
  }
  if (guide.pov === "brand" && !/\b(we|our|team)\b/i.test(trimmed) && trimmed.length > 80) {
    score -= 4;
    tips.push("Consider brand voice (we/our) for consistency");
  }

  if (guide.voiceTone) {
    const tone = guide.voiceTone.toLowerCase();
    if (tone.includes("technical") && !/\b(api|local|edge|llm|bridge|deploy|stack)\b/i.test(trimmed)) {
      tips.push("Technical tone — anchor with a concrete detail");
    }
    if (tone.includes("casual") && trimmed.split(/[.!?]/).some((s) => s.trim().split(/\s+/).length > 28)) {
      score -= 4;
      tips.push("Shorten sentences for casual tone");
    }
  }

  if (guide.styleGuide) {
    const keywords = guide.styleGuide
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 4)
      .slice(0, 6);
    const hits = keywords.filter((k) => trimmed.toLowerCase().includes(k)).length;
    if (keywords.length >= 3 && hits === 0) {
      score -= 10;
      tips.push("Align draft with themes from your style guide");
    }
  }

  if (!/[.!?]$/.test(trimmed) && trimmed.length > 20) {
    score -= 3;
    tips.push("End with clear punctuation");
  }

  score = Math.max(0, Math.min(100, score));
  const band: StyleGuideScore["band"] = score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  return { score, band, issues, tips };
}

export function styleGuidePromptBlock(guide: StyleGuideConfig): string {
  const parts: string[] = [];
  if (guide.voiceTone) parts.push(`Tone: ${guide.voiceTone}`);
  if (guide.pov) parts.push(`POV: ${guide.pov}`);
  if (guide.emojiPolicy !== "allowed") parts.push(`Emoji policy: ${guide.emojiPolicy}`);
  if (guide.styleGuide) parts.push(`Style guide: ${guide.styleGuide}`);
  return parts.join(". ");
}
