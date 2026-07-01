"use client";

import type { ContentPost } from "@/lib/content-queue-types";

type PipelineStep = "intent" | "draft" | "egress";

function resolveStep(post: ContentPost, bridgeConfigured: boolean): PipelineStep {
  if (post.stage === "PUBLISHED" || post.stage === "SUBMITTED") return "egress";
  if (post.stage === "IDEATE" || post.stage === "SCRIPT") return "intent";
  if (post.stage === "RENDER" || post.stage === "SCHEDULED" || post.stage === "PENDING_APPROVAL") {
    return bridgeConfigured && post.stage === "PENDING_APPROVAL" ? "egress" : "draft";
  }
  return "draft";
}

const STEPS: { id: PipelineStep; label: string; hint: string }[] = [
  { id: "intent", label: "Intent", hint: "Brief · hook · platform" },
  { id: "draft", label: "Draft", hint: "Script · render · schedule" },
  { id: "egress", label: "Egress", hint: "Approve · publish on eno2" },
];

interface ContentPipelineStepperProps {
  post: ContentPost | null;
  bridgeConfigured: boolean;
}

export function ContentPipelineStepper({ post, bridgeConfigured }: ContentPipelineStepperProps) {
  const active = post ? resolveStep(post, bridgeConfigured) : "intent";
  const activeIdx = STEPS.findIndex((s) => s.id === active);

  return (
    <div className="border border-line bg-panel p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Content pipeline</p>
      <p className="mt-1 font-sans text-xs text-muted">Intent → draft → egress — sovereign publish path</p>
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        {STEPS.map((step, idx) => {
          const done = idx < activeIdx;
          const current = idx === activeIdx;
          return (
            <li
              key={step.id}
              className={`flex flex-1 flex-col border px-3 py-2 sm:border-r-0 sm:last:border-r ${
                current
                  ? "border-cursor-glow bg-void"
                  : done
                    ? "border-emerald-500/30 bg-void/80"
                    : "border-line bg-void/40"
              }`}
            >
              <span
                className={`font-mono text-[9px] uppercase tracking-wider ${
                  current ? "text-cursor-glow" : done ? "text-emerald-400" : "text-muted"
                }`}
              >
                {idx + 1} · {step.label}
              </span>
              <span className="mt-1 font-sans text-[11px] text-muted">{step.hint}</span>
              {post && current ? (
                <span className="mt-2 font-mono text-[9px] text-stark">{post.stage}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
