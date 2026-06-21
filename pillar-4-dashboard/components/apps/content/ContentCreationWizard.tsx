"use client";

import { useState } from "react";

import type { ContentPlatform } from "@/lib/content-queue-types";
import { platformLabel } from "@/lib/social-channels";

interface ContentCreationWizardProps {
  open: boolean;
  onClose: () => void;
  channels: string[];
  tone: string;
  selectedPostId: string;
  onComplete: () => void;
}

const STEPS = ["Idea", "Draft", "Media", "Publish"] as const;

export function ContentCreationWizard({
  open,
  onClose,
  channels,
  tone,
  selectedPostId,
  onComplete,
}: ContentCreationWizardProps) {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<ContentPlatform>((channels[0] as ContentPlatform) ?? "x");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [postId, setPostId] = useState(selectedPostId);

  if (!open) return null;

  const api = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/content/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json() as Promise<Record<string, unknown>>;
  };

  const runStep = async () => {
    setBusy(true);
    try {
      if (step === 0) {
        if (!postId) {
          const data = await api("create", { platform, channel: `${platformLabel(platform)} · wizard`, draftText: "" });
          const p = data.post as { id?: string } | undefined;
          if (p?.id) setPostId(p.id);
        }
        setStep(1);
      } else if (step === 1) {
        const id = postId || selectedPostId;
        if (id && draft.trim()) {
          await api("update_draft", { postId: id, draftText: draft });
        }
        setStep(2);
      } else if (step === 2) {
        const id = postId || selectedPostId;
        if (id) {
          await api("generate_ai_image", { postId: id }).catch(() => undefined);
        }
        setStep(3);
      } else {
        const id = postId || selectedPostId;
        if (id) {
          await api("schedule", { postId: id });
        }
        onComplete();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg border border-line bg-void p-4 font-mono text-[10px]">
        <div className="mb-4 flex justify-between">
          <p className="uppercase tracking-widest text-cursor-glow">Creation wizard · {STEPS[step]}</p>
          <button type="button" onClick={onClose} className="text-muted hover:text-stark">
            Skip
          </button>
        </div>
        <div className="mb-4 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 ${i <= step ? "bg-cursor-glow" : "bg-line"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-2">
            <p className="text-muted">Pick primary channel for this story.</p>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ContentPlatform)}
              className="w-full border border-line bg-panel px-2 py-1 text-stark"
            >
              {channels.map((c) => (
                <option key={c} value={c}>
                  {platformLabel(c as ContentPlatform)}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <p className="text-muted">Draft copy ({tone} tone) — or leave blank for LLM.</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full border border-line bg-panel p-2 text-stark"
              placeholder="Your story…"
            />
          </div>
        )}

        {step === 2 && (
          <p className="text-muted">
            Generate AI thumbnail for {postId || selectedPostId || "post"}. Vision capture available in Creation Studio after wizard.
          </p>
        )}

        {step === 3 && (
          <p className="text-muted">Schedule post for default slot, then publish from queue when ready.</p>
        )}

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="border border-line px-3 py-1 uppercase text-muted disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runStep()}
            className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow"
          >
            {busy ? "…" : step === 3 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
