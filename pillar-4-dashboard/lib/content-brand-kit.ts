import type { BrandKitConfig } from "./content-queue-types";

export interface BrandKit {
  hashtags: string[];
  captionPrefix: string;
  watermarkPath: string | null;
  ttsVoice: string | null;
  bannedWords: string[];
}

export function brandKitFromConfig(config: Record<string, unknown>): BrandKit {
  const raw = config.brandKit;
  let kit: BrandKitConfig = {};
  if (typeof raw === "object" && raw !== null) {
    kit = raw as BrandKitConfig;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      kit = JSON.parse(raw) as BrandKitConfig;
    } catch {
      kit = {};
    }
  }
  const hashtags = Array.isArray(kit.hashtags)
    ? kit.hashtags.filter((h): h is string => typeof h === "string")
    : typeof config.brandHashtags === "string"
      ? config.brandHashtags.split(/\s+/).filter(Boolean)
      : [];
  return {
    hashtags,
    captionPrefix: typeof kit.captionPrefix === "string" ? kit.captionPrefix : "",
    watermarkPath: typeof kit.watermarkPath === "string" ? kit.watermarkPath : null,
    ttsVoice: typeof kit.ttsVoice === "string" ? kit.ttsVoice : null,
    bannedWords: Array.isArray(kit.bannedWords)
      ? kit.bannedWords.filter((w): w is string => typeof w === "string")
      : [],
  };
}

export function applyBrandToCaption(text: string, kit: BrandKit): string {
  let out = text.trim();
  for (const word of kit.bannedWords) {
    if (!word) continue;
    out = out.replace(new RegExp(word, "gi"), "—");
  }
  if (kit.captionPrefix && !out.startsWith(kit.captionPrefix)) {
    out = `${kit.captionPrefix}${out}`;
  }
  const missingTags = kit.hashtags.filter((t) => !out.includes(t));
  if (missingTags.length > 0) {
    out = `${out}\n\n${missingTags.join(" ")}`;
  }
  return out.trim();
}
