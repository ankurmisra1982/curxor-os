import type { ContentPost } from "./content-queue-types";

export interface InstagramGridCell {
  postId: string;
  stage: ContentPost["stage"];
  scheduledAt: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  draftPreview: string;
  position: number;
}

export interface InstagramGridPlan {
  cells: InstagramGridCell[];
  scheduledCount: number;
  publishedCount: number;
  gapWarnings: string[];
}

export function buildInstagramGrid(posts: ContentPost[], limit = 9): InstagramGridPlan {
  const ig = posts.filter((p) => p.platform === "instagram" && !p.inIdeaBacklog);
  const sorted = [...ig].sort((a, b) => {
    const ta = a.scheduledAt ?? a.publishedAt ?? a.createdAt;
    const tb = b.scheduledAt ?? b.publishedAt ?? b.createdAt;
    return tb.localeCompare(ta);
  });

  const cells: InstagramGridCell[] = sorted.slice(0, limit).map((p, i) => ({
    postId: p.id,
    stage: p.stage,
    scheduledAt: p.scheduledAt,
    publishedAt: p.publishedAt,
    imageUrl: p.imageUrl ?? null,
    imagePath: p.imagePath ?? null,
    draftPreview: p.draftText.slice(0, 80),
    position: i,
  }));

  const gapWarnings: string[] = [];
  const noImage = cells.filter((c) => !c.imageUrl && !c.imagePath);
  if (noImage.length > 0) {
    gapWarnings.push(`${noImage.length} grid slot(s) missing image — IG feed needs visuals`);
  }
  const textHeavy = cells.filter((c) => c.draftPreview.length > 120);
  if (textHeavy.length >= 3) {
    gapWarnings.push("Several long-caption posts in a row — consider visual variety");
  }

  return {
    cells,
    scheduledCount: ig.filter((p) => p.stage === "SCHEDULED").length,
    publishedCount: ig.filter((p) => p.stage === "PUBLISHED").length,
    gapWarnings,
  };
}

export function splitDraftIntoThread(draftText: string, charLimit = 280): string[] {
  const paragraphs = draftText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [];

  const parts: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= charLimit) {
      parts.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?]+[.!?]+|\S+/g) ?? [para];
    let buf = "";
    for (const s of sentences) {
      const next = buf ? `${buf} ${s.trim()}` : s.trim();
      if (next.length <= charLimit) {
        buf = next;
      } else {
        if (buf) parts.push(buf);
        buf = s.trim().slice(0, charLimit);
      }
    }
    if (buf) parts.push(buf);
  }
  return parts.slice(0, 12);
}
