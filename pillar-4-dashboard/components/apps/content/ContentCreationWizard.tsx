"use client";

import { useEffect, useRef, useState } from "react";

import type { ContentPlatform } from "@/lib/content-queue-types";
import { platformLabel } from "@/lib/social-channels";

export interface WizardPreflightReport {
  ready: boolean;
  blockers: number;
  warnings: number;
  checks: Array<{ severity: string; message: string; fixHint?: string; id?: string }>;
}

export interface WizardCompleteResult {
  postId: string;
  scrollToPreflight: boolean;
  scheduledAt?: string;
}

interface ContentCreationWizardProps {
  open: boolean;
  onClose: () => void;
  channels: string[];
  tone: string;
  selectedPostId: string;
  useBestTime?: boolean;
  onComplete: (result: WizardCompleteResult) => void;
  onOpenConnections?: () => void;
}

const STEPS = ["Channel", "Draft", "Media", "Publish checklist", "Schedule"] as const;

export function ContentCreationWizard({
  open,
  onClose,
  channels,
  tone,
  selectedPostId,
  useBestTime = true,
  onComplete,
  onOpenConnections,
}: ContentCreationWizardProps) {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<ContentPlatform>((channels[0] as ContentPlatform) ?? "x");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [postId, setPostId] = useState(selectedPostId);
  const [mediaSkipped, setMediaSkipped] = useState(false);
  const [mediaAttached, setMediaAttached] = useState(false);
  const [preflight, setPreflight] = useState<WizardPreflightReport | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setStep(0);
      setPlatform((channels[0] as ContentPlatform) ?? "x");
      setDraft("");
      setBusy(false);
      setPostId(selectedPostId);
      setMediaSkipped(false);
      setMediaAttached(false);
      setPreflight(null);
      setScheduledAt(null);
      setError(null);
    }
    wasOpen.current = open;
  }, [open, selectedPostId, channels]);

  if (!open) return null;

  const activePostId = postId || selectedPostId;

  const api = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/content/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : "Request failed");
    }
    return json;
  };

  const runPreflight = async (id: string) => {
    const data = await api("preflight_check", { postId: id });
    const report = data.report as WizardPreflightReport | undefined;
    if (report) setPreflight(report);
    return report ?? null;
  };

  const uploadMedia = async (file: File, kind: "image" | "video") => {
    const form = new FormData();
    form.set("postId", activePostId);
    form.set("kind", kind);
    form.set("file", file);
    const res = await fetch("/api/content/upload", { method: "POST", body: form });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Upload failed");
    }
    setMediaAttached(true);
    setMediaSkipped(false);
  };

  const runStep = async () => {
    setBusy(true);
    setError(null);
    try {
      if (step === 0) {
        if (!activePostId) {
          const data = await api("create", {
            platform,
            channel: `${platformLabel(platform)} · wizard`,
            draftText: "",
          });
          const p = data.post as { id?: string } | undefined;
          if (p?.id) setPostId(p.id);
        }
        setStep(1);
        return;
      }

      const id = postId || selectedPostId;
      if (!id) {
        setError("No post selected — go back to Channel step");
        return;
      }

      if (step === 1) {
        if (draft.trim()) {
          await api("update_draft", { postId: id, draftText: draft });
        }
        setStep(2);
        return;
      }

      if (step === 2) {
        setStep(3);
        await runPreflight(id);
        return;
      }

      if (step === 3) {
        const report = preflight ?? (await runPreflight(id));
        if (report && report.blockers > 0) {
          setError(`Fix ${report.blockers} blocker(s) before scheduling — see Pre-flight below`);
          return;
        }
        setStep(4);
        return;
      }

      const data = await api("schedule", { postId: id, useBestTime });
      const when = typeof data.scheduledAt === "string" ? data.scheduledAt : null;
      setScheduledAt(when);
      onComplete({
        postId: id,
        scrollToPreflight: true,
        scheduledAt: when ?? undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Step failed");
    } finally {
      setBusy(false);
    }
  };

  const skipMedia = () => {
    setMediaSkipped(true);
    setStep(3);
    if (activePostId) void runPreflight(activePostId);
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
            <div key={s} className={`h-1 flex-1 ${i <= step ? "bg-cursor-glow" : "bg-line"}`} title={s} />
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
            <p className="text-muted">Draft copy ({tone} tone) — or leave blank and use Draft Post skill after.</p>
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
          <div className="space-y-3">
            <p className="text-muted">
              Attach image or video from disk for IG/TikTok/YouTube — or skip and add media in Creation Studio later.
            </p>
            <input
              ref={imageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f || !activePostId) return;
                const kind = f.type.startsWith("video/") ? "video" : "image";
                setBusy(true);
                void uploadMedia(f, kind)
                  .catch((err) => setError(err instanceof Error ? err.message : "Upload failed"))
                  .finally(() => setBusy(false));
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!activePostId || busy}
                onClick={() => imageRef.current?.click()}
                className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow disabled:opacity-50"
              >
                {mediaAttached ? "Replace media" : "Attach from disk"}
              </button>
              <button
                type="button"
                disabled={!activePostId || busy}
                onClick={() => {
                  if (!activePostId) return;
                  setBusy(true);
                  void api("generate_ai_image", { postId: activePostId })
                    .then(() => setMediaAttached(true))
                    .catch(() => setError("AI image unavailable — attach from disk or skip"))
                    .finally(() => setBusy(false));
                }}
                className="border border-line px-3 py-1 uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
              >
                Generate AI thumb
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={skipMedia}
                className="border border-line px-3 py-1 uppercase text-muted hover:text-stark"
              >
                Skip media
              </button>
            </div>
            {mediaAttached ? <p className="text-cursor-glow">Media attached ✓</p> : null}
            {mediaSkipped ? <p className="text-muted">Skipped — add media before publish on image/video platforms</p> : null}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <p className="text-muted">
              Publish checklist — brand rules, character limits, account connection, and media.
            </p>
            {!preflight ? (
              <p className="text-muted">Running checks…</p>
            ) : (
              <>
                <p className={preflight.blockers > 0 ? "text-amber-400" : "text-cursor-glow"}>
                  {preflight.blockers > 0
                    ? `${preflight.blockers} must fix before scheduling · ${preflight.warnings} warning(s)`
                    : preflight.warnings > 0
                      ? `Ready with ${preflight.warnings} warning(s)`
                      : "All checks passed"}
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto">
                  {preflight.checks.slice(0, 8).map((c, i) => (
                    <li key={i} className={c.severity === "error" ? "text-amber-400" : "text-muted"}>
                      <p>{c.message}</p>
                      {c.fixHint ? <p className="mt-0.5 text-[9px] text-muted">{c.fixHint}</p> : null}
                      {c.severity === "error" && c.id === "bridge" && onOpenConnections ? (
                        <button
                          type="button"
                          onClick={onOpenConnections}
                          className="mt-1 border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
                        >
                          Connect account
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {preflight.blockers > 0 && onOpenConnections ? (
                  <button
                    type="button"
                    onClick={onOpenConnections}
                    className="border border-cursor-glow px-3 py-1 uppercase text-cursor-glow"
                  >
                    Open connections
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <p className="text-muted">
              Schedule {activePostId} {useBestTime ? "at learned best time" : "for default slot"}.
            </p>
            {scheduledAt ? (
              <p className="text-cursor-glow">Scheduled · {new Date(scheduledAt).toLocaleString()}</p>
            ) : null}
          </div>
        )}

        {error ? <p className="mt-2 text-amber-400">{error}</p> : null}

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
            {busy ? "…" : step === 4 ? "Schedule & finish" : step === 2 ? "Continue" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
