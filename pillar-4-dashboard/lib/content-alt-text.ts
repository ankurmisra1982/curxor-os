import "server-only";

import { generateText, isLocalInferenceAvailable } from "./local-inference";
import { savePostPublishMeta } from "./content-queue-store";
import type { ContentPost } from "./content-queue-types";

export async function generateAltTextForPost(post: ContentPost): Promise<string | null> {
  if (!post.draftText.trim()) return null;
  if (!(await isLocalInferenceAvailable())) {
    return post.draftText.slice(0, 125).replace(/#\w+/g, "").trim();
  }

  const prompt = `Write image alt text (max 125 chars) for a ${post.platform} post. Describe the visual implied by this caption — do not repeat hashtags.

Caption:
${post.draftText.slice(0, 500)}

Alt text only:`;

  const alt = ((await generateText("Write concise accessible alt text.", prompt)) ?? post.draftText.slice(0, 125)).trim().slice(0, 125);
  await savePostPublishMeta(post.id, { altText: alt });
  return alt;
}
