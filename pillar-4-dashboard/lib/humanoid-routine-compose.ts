import "server-only";

import { randomUUID } from "node:crypto";

import type { HumanoidRoutine } from "./humanoid-hub-types";
import { generateText, isLocalInferenceAvailable, parseJsonLoose } from "./local-inference";

function fallbackCompose(prompt: string): Omit<HumanoidRoutine, "id"> {
  const lower = prompt.toLowerCase();
  let trigger = "Operator phrase or household event";
  if (/morning|wake|6am|7am/.test(lower)) trigger = "First motion after morning window";
  if (/guest|visit|door|arriv/.test(lower)) trigger = "Guest profile active or door signal";
  if (/quiet|night|10pm|sleep/.test(lower)) trigger = "Quiet hours schedule";
  if (/grandparent|elder/.test(lower)) trigger = "Elder Kin profile detected";

  const label = prompt.trim().slice(0, 48) || "Custom routine";
  return {
    label,
    description: prompt.trim().slice(0, 320),
    trigger,
    enabled: true,
    previewOnly: true,
    source: "composed",
  };
}

export async function composeRoutineFromNaturalLanguage(
  prompt: string,
): Promise<HumanoidRoutine> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Describe the routine in plain language");

  let draft = fallbackCompose(trimmed);

  if (await isLocalInferenceAvailable()) {
    const raw = await generateText(
      "You convert home robot instructions into structured routine JSON for a sovereign appliance.",
      `Convert this home humanoid instruction into JSON with keys: label (short title), description (1-2 sentences), trigger (when it runs). Instruction:\n${trimmed}`,
    );
    if (raw) {
      const parsed = parseJsonLoose(raw) as Partial<{ label: string; description: string; trigger: string }> | null;
      if (parsed?.label && parsed.description) {
        draft = {
          label: String(parsed.label).slice(0, 48),
          description: String(parsed.description).slice(0, 320),
          trigger: String(parsed.trigger ?? draft.trigger).slice(0, 120),
          enabled: true,
          previewOnly: true,
          source: "composed",
        };
      }
    }
  }

  return {
    id: `routine-${randomUUID().slice(0, 8)}`,
    ...draft,
  };
}
