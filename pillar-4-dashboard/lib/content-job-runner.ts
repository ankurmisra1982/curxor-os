import "server-only";

import {
  generateAiThumbnailForPost,
  renderVideoForPost,
  renderAdvancedVideoForPost,
} from "./content-creation-service";
import {
  getContentJob,
  nextQueuedJob,
  requeueJobWithBackoff,
  updateContentJob,
  type ContentJob,
} from "./content-jobs-store";

export async function processNextContentJob(): Promise<ContentJob | null> {
  const job = await nextQueuedJob();
  if (!job) return null;

  await updateContentJob(job.id, { status: "running" });

  try {
    if (job.type === "render_video") {
      const voiceover = job.payload.voiceover !== false;
      const script = typeof job.payload.script === "string" ? job.payload.script : undefined;
      const result = await renderVideoForPost(job.postId, script, { voiceover });
      return (
        (await updateContentJob(job.id, {
          status: "done",
          result: {
            videoPath: result.videoPath,
            videoUrl: result.videoUrl,
            ttsEngine: result.ttsEngine,
          },
        })) ?? null
      );
    }

    if (job.type === "generate_ai_image") {
      const prompt = typeof job.payload.prompt === "string" ? job.payload.prompt : undefined;
      const result = await generateAiThumbnailForPost(job.postId, prompt);
      return (
        (await updateContentJob(job.id, {
          status: "done",
          result: {
            imagePath: result.imagePath,
            imageUrl: result.imageUrl,
            prompt: result.prompt,
          },
        })) ?? null
      );
    }

    if (job.type === "render_advanced") {
      const result = await renderAdvancedVideoForPost(job.postId, job.payload);
      return (
        (await updateContentJob(job.id, {
          status: "done",
          result: {
            videoPath: result.videoPath,
            videoUrl: result.videoUrl,
            ttsEngine: result.ttsEngine,
          },
        })) ?? null
      );
    }

    await updateContentJob(job.id, { status: "failed", error: "Unknown job type" });
    return getContentJob(job.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (await requeueJobWithBackoff(job.id, msg)) ?? getContentJob(job.id);
  }
}

export async function drainContentJobQueue(max = 3): Promise<ContentJob[]> {
  const done: ContentJob[] = [];
  for (let i = 0; i < max; i++) {
    const job = await processNextContentJob();
    if (!job) break;
    done.push(job);
    if (job.status === "failed") break;
  }
  return done;
}
