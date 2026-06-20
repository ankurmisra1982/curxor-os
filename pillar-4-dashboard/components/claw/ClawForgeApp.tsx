"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { NewClawWizard } from "@/components/claw/NewClawWizard";
import { useVisionStream } from "@/hooks/useVisionStream";
import type { BudgetTier } from "@/lib/local-llm-catalog";

interface ForgeMessage {
  role: "user" | "assistant" | "system";
  text: string;
  hasImage?: boolean;
}

interface AssistPayload {
  reply: string;
  suggestedIntent: string;
  budgetTier: BudgetTier;
  imageHint: string | null;
  readyToForge: boolean;
  rationale: string;
}

const BOOT: ForgeMessage[] = [
  {
    role: "assistant",
    text: "Claw Forge online. Describe a bot in plain language — attach a photo or live vision for spatial grounding. Tap ✚ when you're ready to provision.",
  },
];

export function ClawForgeApp() {
  const [messages, setMessages] = useState<ForgeMessage[]>(BOOT);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyToForge, setReadyToForge] = useState(false);
  const [suggestedIntent, setSuggestedIntent] = useState("");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("balanced");
  const [imageHint, setImageHint] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [liveVision, setLiveVision] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [forgedCount, setForgedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { frame, connected } = useVisionStream();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "What claw should we add? Describe the mission, attach a photo, or enable live vision.",
        },
      ]);
    }
  }, [searchParams]);

  const chatHistory = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      text: m.text,
      hasImage: m.hasImage,
    }));

  const sendMessage = useCallback(
    async (text: string, opts?: { imageB64?: string | null; vision?: boolean }) => {
      const trimmed = text.trim();
      const useVision = opts?.vision ?? liveVision;
      const useImage = opts?.imageB64 ?? imageBase64;

      if (!trimmed && !useImage && !useVision) return;

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: trimmed || (useVision ? "[live vision frame]" : "[reference photo]"),
          hasImage: Boolean(useImage || useVision),
        },
      ]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/claw/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            imageBase64: useVision ? frame?.previewBase64 ?? null : useImage,
            liveVision: useVision,
            history: chatHistory,
          }),
        });

        if (!res.ok) throw new Error("assist failed");
        const data = (await res.json()) as AssistPayload;

        setSuggestedIntent(data.suggestedIntent);
        setBudgetTier(data.budgetTier);
        setImageHint(data.imageHint);
        setReadyToForge(data.readyToForge);
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply.replace(/\*\*/g, "") }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "system", text: "Assist channel unavailable — edit intent in the wizard directly." },
        ]);
        setReadyToForge(trimmed.length >= 8);
        setSuggestedIntent(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [chatHistory, frame?.previewBase64, imageBase64, liveVision],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function onFileChange(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      const b64 = dataUrl.split(",")[1] ?? null;
      setImageBase64(b64);
      setLiveVision(false);
    };
    reader.readAsDataURL(file);
  }

  function openWizard() {
    const intent = suggestedIntent.trim() || input.trim();
    if (intent.length < 8) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: "Describe your claw in a few sentences before forging.",
        },
      ]);
      return;
    }
    setSuggestedIntent(intent);
    setWizardOpen(true);
  }

  function onClawCreated(clawId: string) {
    setWizardOpen(false);
    setForgedCount((n) => n + 1);
    setReadyToForge(false);
    setImagePreview(null);
    setImageBase64(null);
    setLiveVision(false);
    setSuggestedIntent("");
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        text: `Claw ${clawId} provisioned on your appliance. Tap ✚ to forge another.`,
      },
      {
        role: "assistant",
        text: "Ready for the next bot — what should it do?",
      },
    ]);
  }

  const previewSrc = liveVision ? frame?.previewBase64 : imagePreview;

  return (
    <div className="relative flex h-full min-h-[520px] flex-col border border-line bg-void">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">OOTB · Claw Forge</p>
          <h2 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Multimodal Claw Studio</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">
            Natural language + vision · local LLM stack · {forgedCount} forged this session
          </p>
        </div>
        <button
          type="button"
          onClick={openWizard}
          title="Forge new claw from current intent"
          className={`group flex items-center gap-2 border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition ${
            readyToForge || suggestedIntent.length >= 8
              ? "border-cursor-glow bg-surface text-cursor-glow shadow-cursor animate-pulse-cursor"
              : "border-line text-muted hover:border-cursor/40 hover:text-stark"
          }`}
        >
          <span className="flex h-6 w-6 items-center justify-center border border-current text-base leading-none">
            ✚
          </span>
          Forge Claw
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-xs leading-relaxed">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="border-l-2 pl-3"
                style={{
                  borderColor:
                    msg.role === "assistant"
                      ? "#bc13fe"
                      : msg.role === "system"
                        ? "#444"
                        : "#888",
                }}
              >
                <span className="text-[10px] uppercase tracking-widest text-muted">{msg.role}</span>
                <p
                  className={`mt-0.5 whitespace-pre-wrap ${
                    msg.role === "assistant" ? "text-cursor-glow" : "text-stark"
                  }`}
                >
                  {msg.text}
                </p>
              </div>
            ))}
            {loading ? (
              <p className="animate-pulse font-mono text-[10px] uppercase tracking-widest text-muted">
                Master claw thinking…
              </p>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="border-t border-line bg-panel p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-cursor-glow"
              >
                📷 Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setLiveVision((v) => !v);
                  if (!liveVision) {
                    setImagePreview(null);
                    setImageBase64(null);
                  }
                }}
                className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                  liveVision
                    ? "border-cursor-glow text-cursor-glow"
                    : "border-line text-muted hover:text-stark"
                }`}
              >
                {connected ? "◎ Live vision" : "○ Vision offline"}
              </button>
              {(imagePreview || liveVision) && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageBase64(null);
                    setLiveVision(false);
                  }}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-stark"
                >
                  Clear media
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="> Describe the claw you want to add…"
                className="flex-1 border border-line bg-void px-3 py-2 font-mono text-xs text-stark outline-none focus:border-cursor-glow"
              />
              <button
                type="submit"
                disabled={loading}
                className="border border-cursor-glow px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
              >
                Send
              </button>
              <button
                type="button"
                onClick={openWizard}
                title="Launch forge wizard"
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-cursor-glow/60 bg-surface text-lg text-cursor-glow hover:border-cursor-glow"
              >
                ✚
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0])}
            />
          </form>
        </div>

        {(previewSrc || imageHint) && (
          <aside className="border-t border-line bg-panel p-4 lg:w-64 lg:border-l lg:border-t-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Multimodal input</p>
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={liveVision ? `data:image/jpeg;base64,${previewSrc}` : previewSrc}
                alt="Reference"
                className="mt-3 aspect-video w-full border border-line object-cover"
              />
            ) : (
              <div className="mt-3 flex aspect-video items-center justify-center border border-line font-mono text-[10px] text-muted">
                AWAITING FRAME
              </div>
            )}
            {imageHint ? (
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">{imageHint}</p>
            ) : null}
          </aside>
        )}
      </div>

      {wizardOpen ? (
        <NewClawWizard
          variant="overlay"
          initialIntent={suggestedIntent}
          initialBudgetTier={budgetTier}
          initialImagePreview={liveVision ? (frame?.previewBase64 ? `data:image/jpeg;base64,${frame.previewBase64}` : null) : imagePreview}
          initialLiveVision={liveVision}
          initialImageHint={imageHint}
          onClose={() => setWizardOpen(false)}
          onCreated={onClawCreated}
        />
      ) : null}
    </div>
  );
}
