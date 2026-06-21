import "server-only";

import { listPostMetrics } from "./content-analytics-store";
import { getContentPost, selectHookVariant, selectThumbnailVariant } from "./content-queue-store";
import { completeExperiment, listExperiments, type ContentExperiment } from "./content-experiments-store";

export async function evaluateRunningExperiments(): Promise<
  Array<{ experimentId: string; winnerPostId: string; views: number }>
> {
  const [experiments, metrics] = await Promise.all([listExperiments(), listPostMetrics()]);
  const results: Array<{ experimentId: string; winnerPostId: string; views: number }> = [];

  for (const exp of experiments.filter((e) => e.status === "running")) {
    const winner = pickWinner(exp, metrics);
    if (!winner) continue;
    await completeExperiment(exp.id, winner.postId);
    await applyExperimentWinner(exp, winner.postId);
    results.push({ experimentId: exp.id, winnerPostId: winner.postId, views: winner.views });
  }

  return results;
}

function pickWinner(
  exp: ContentExperiment,
  metrics: Awaited<ReturnType<typeof listPostMetrics>>,
): { postId: string; views: number } | null {
  let best: { postId: string; views: number } | null = null;

  for (const postId of exp.postIds) {
    const m = metrics.find((x) => x.postId === postId);
    const views = m?.views ?? 0;
    if (views < exp.viewThreshold) continue;
    if (!best || views > best.views) best = { postId, views };
  }

  return best;
}

async function applyExperimentWinner(exp: ContentExperiment, winnerPostId: string): Promise<void> {
  const winner = await getContentPost(winnerPostId);
  if (!winner) return;

  const siblings = exp.postIds.filter((id) => id !== winnerPostId);
  for (const siblingId of siblings) {
    const sibling = await getContentPost(siblingId);
    if (!sibling) continue;

    if (exp.kind === "hook" && winner.selectedHookId) {
      await selectHookVariant(siblingId, winner.selectedHookId);
    }
    if (exp.kind === "thumbnail" && winner.selectedThumbnailId) {
      await selectThumbnailVariant(siblingId, winner.selectedThumbnailId);
    }
    if (exp.kind === "caption") {
      const { savePostDraft } = await import("./content-queue-store");
      await savePostDraft(siblingId, winner.draftText);
    }
  }
}
