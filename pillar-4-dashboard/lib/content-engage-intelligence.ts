import "server-only";

import { listEngageSuggestions, type EngageSuggestion } from "./content-engage-bridge";
import {
  getEngageIntelligenceConfig,
  getEngageTriageMeta,
  listEngageTriageMeta,
  scoreEngageSuggestion,
  setEngageTriageStatus,
  type EngageIntelligenceConfig,
  type EngageTriageMeta,
  type EngageTriageStatus,
} from "./content-engage-intelligence-store";

export interface EngageSuggestionEnriched extends EngageSuggestion {
  priorityScore: number;
  triageStatus: EngageTriageStatus;
  triageReasons: string[];
  slaBreached: boolean;
}

export async function listEnrichedEngageSuggestions(
  unconvertedOnly = false,
): Promise<EngageSuggestionEnriched[]> {
  const [suggestions, config, triageRows] = await Promise.all([
    listEngageSuggestions(unconvertedOnly),
    getEngageIntelligenceConfig(),
    listEngageTriageMeta(),
  ]);
  const triageMap = new Map(triageRows.map((t) => [t.suggestionId, t]));

  const enriched = suggestions.map((s) => enrichOne(s, config, triageMap.get(s.id)));
  return enriched.sort((a, b) => b.priorityScore - a.priorityScore);
}

function enrichOne(
  s: EngageSuggestion,
  config: EngageIntelligenceConfig,
  triage?: EngageTriageMeta,
): EngageSuggestionEnriched {
  const scored = scoreEngageSuggestion({
    author: s.author,
    text: s.text,
    createdAt: s.createdAt,
    config,
  });
  const status = triage?.status ?? scored.suggestedStatus;
  const ageHours = (Date.now() - new Date(s.createdAt).getTime()) / 3_600_000;

  return {
    ...s,
    priorityScore: triage?.priorityScore ?? scored.score,
    triageStatus: status,
    triageReasons: triage?.reasons?.length ? triage.reasons : scored.reasons,
    slaBreached: ageHours > config.slaHours && status !== "archived",
  };
}

export async function autoTriageEngageSuggestions(): Promise<number> {
  const config = await getEngageIntelligenceConfig();
  const suggestions = await listEngageSuggestions(true);
  let updated = 0;

  for (const s of suggestions) {
    const existing = await getEngageTriageMeta(s.id);
    if (existing && existing.status === "archived") continue;

    const scored = scoreEngageSuggestion({
      author: s.author,
      text: s.text,
      createdAt: s.createdAt,
      config,
    });

    if (!existing || existing.status !== scored.suggestedStatus) {
      await setEngageTriageStatus(s.id, scored.suggestedStatus, scored.score, scored.reasons);
      updated += 1;
    }
  }

  return updated;
}

export {
  getEngageIntelligenceConfig,
  updateEngageIntelligenceConfig,
  setEngageTriageStatus,
  type EngageIntelligenceConfig,
  type EngageTriageStatus,
} from "./content-engage-intelligence-store";
