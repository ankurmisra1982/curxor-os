import "server-only";

import { detectWorkStalls } from "./work-stall-detection";
import { ensureWorkQueue } from "./work-store";

export interface ExecutiveBriefSection {
  heading: string;
  bullets: string[];
}

export interface WorkExecutiveBrief {
  generatedAt: string;
  headline: string;
  sections: ExecutiveBriefSection[];
  stats: {
    leadsInPipeline: number;
    activeSequences: number;
    pendingSends: number;
    openTasks: number;
    repliesThisWeek: number;
    stalls: number;
  };
}

function repliesThisWeek(sentAtList: Array<string | null | undefined>): number {
  const weekAgo = Date.now() - 7 * 86_400_000;
  return sentAtList.filter((t) => t && Date.parse(t) >= weekAgo).length;
}

export async function buildWorkExecutiveBrief(): Promise<WorkExecutiveBrief> {
  const [file, stalls] = await Promise.all([ensureWorkQueue(), detectWorkStalls()]);
  const active = file.sequences.filter((s) => s.status === "active");
  const pipeline = file.leads.filter((l) => !["won", "lost"].includes(l.stage));
  const pending = file.sends.filter((s) => s.status === "pending_approval" || s.status === "queued");
  const openTasks = file.tasks.filter((t) => !t.done);
  const replyCount = repliesThisWeek(file.sends.map((s) => s.repliedAt));

  const needsYou = stalls.filter((s) => s.severity === "high").slice(0, 5);
  const watch = stalls.filter((s) => s.severity !== "high").slice(0, 4);

  const sections: ExecutiveBriefSection[] = [];

  if (needsYou.length > 0) {
    sections.push({
      heading: "Needs you",
      bullets: needsYou.map((s) => s.title),
    });
  }

  sections.push({
    heading: "Pipeline pulse",
    bullets: [
      `${pipeline.length} active opportunities · ${replyCount} replies this week`,
      `${active.length} sequences running · ${pending.length} outbound in queue`,
      `${openTasks.length} open tasks (${openTasks.filter((t) => t.priority === "P1").length} P1)`,
    ],
  });

  if (watch.length > 0) {
    sections.push({
      heading: "Watch list",
      bullets: watch.map((s) => s.detail),
    });
  }

  const headline =
    needsYou.length > 0
      ? `${needsYou.length} item(s) need executive attention`
      : pipeline.length > 0
        ? `Desk healthy · ${pipeline.length} in pipeline`
        : "Add opportunities to activate executive view";

  return {
    generatedAt: new Date().toISOString(),
    headline,
    sections,
    stats: {
      leadsInPipeline: pipeline.length,
      activeSequences: active.length,
      pendingSends: pending.length,
      openTasks: openTasks.length,
      repliesThisWeek: replyCount,
      stalls: stalls.length,
    },
  };
}
