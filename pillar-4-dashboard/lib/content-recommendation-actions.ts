import "server-only";

import type { RepurposePreset } from "./content-creation-service";
import { repurposeContent } from "./content-creation-service";
import { scheduleContentPost, selectHookVariant } from "./content-queue-store";

export async function applyContentRecommendationAction(
  action: string,
  payload: Record<string, unknown>,
  tone: string,
): Promise<{ ok: boolean; detail: string; error?: string }> {
  const postId = typeof payload.postId === "string" ? payload.postId : "";
  if (!postId && action !== "fan_out_channels") {
    return { ok: false, detail: action, error: "Missing postId" };
  }

  try {
    if (action === "select_hook") {
      const hookId = typeof payload.hookId === "string" ? payload.hookId : "";
      if (!hookId) return { ok: false, detail: action, error: "Missing hookId" };
      const post = await selectHookVariant(postId, hookId);
      if (!post) return { ok: false, detail: action, error: "Hook not found on post" };
      return { ok: true, detail: `Applied hook ${hookId} on ${postId}` };
    }

    if (action === "repurpose_content") {
      const preset = (typeof payload.preset === "string" ? payload.preset : "single_to_all") as RepurposePreset;
      const result = await repurposeContent(postId, preset, tone);
      return {
        ok: true,
        detail: `Repurposed ${postId} → ${result.createdIds.length} new post(s)`,
      };
    }

    if (action === "schedule") {
      const { resolveScheduleTimeForPost } = await import("./content-schedule-insights");
      const when =
        typeof payload.offsetHours === "number"
          ? new Date(Date.now() + payload.offsetHours * 60 * 60 * 1000).toISOString()
          : await resolveScheduleTimeForPost(postId);
      const post = await scheduleContentPost(postId, when);
      if (!post) return { ok: false, detail: action, error: "Post not found" };
      return { ok: true, detail: `Scheduled ${postId} for ${when}` };
    }

    return { ok: false, detail: action, error: `Unsupported action: ${action}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: action, error: msg };
  }
}
