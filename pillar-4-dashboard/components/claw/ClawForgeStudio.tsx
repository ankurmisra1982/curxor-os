"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NewClawWizard } from "@/components/claw/NewClawWizard";
import { useVisionStream } from "@/hooks/useVisionStream";
import type { ClawProfile, ClawProfilesState } from "@/lib/claw-recommend";
import type { ForgeChatTurn } from "@/lib/claw-assist";
import type { BudgetTier } from "@/lib/local-llm-catalog";

interface ChatMessage extends ForgeChatTurn {
  id: string;
  imagePreview?: string | null;
  liveVision?: boolean;
}

const BOOT: ChatMessage[] = [
  {
    id: "boot",
    role: "assistant",
    text: "Claw Forge online. Describe a new bot in plain language — attach a photo or pull live vision for spatial context. Say “forge claw” when you’re ready to deploy.",
  },
];

export function ClawForgeStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { frame, connected } = useVisionStream();
  const fileRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(BOOT);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingLiveVision, setPendingLiveVision] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [forgeIntent, setForgeIntent] = useState("");
  const [forgeBudget, setForgeBudget] = useState<BudgetTier>("balanced");
  const [forgeImagePreview, setForgeImagePreview] = useState<string | null>(null);
  const [forgeLiveVision, setForgeLiveVision] = useState(false);
  const [forgeImageHint, setForgeImageHint] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ClawProfilesState>({ claws: [], activeClawId: null });

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfiles = useCallback(async () => {
    const res = await fetch("/api/claw/profiles", { cache: "no-store" });
    if (!res.ok) return;
    setProfiles((await res.json()) as ClawProfilesState);
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const openForgePanel = useCallback(
    (
      intent: string,
      budget: BudgetTier,
      imagePreview: string | null,
      liveVision: boolean,
      imageHint: string | null,
    ) => {
      setForgeIntent(intent);
      setForgeBudget(budget);
      setForgeImagePreview(imagePreview);
      setForgeLiveVision(liveVision);
      setForgeImageHint(imageHint);
      setForgeOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openForgePanel("", "balanced", null, false, null);
      router.replace("/claw-forge");
    }
  }, [searchParams, router, openForgePanel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function attachLiveVision() {
    if (!frame?.previewBase64 || frame.encoding !== 1) return;
    const dataUrl = `data:image/jpeg;base64,${frame.previewBase64}`;
    setPendingImage(dataUrl);
    setPendingLiveVision(true);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(typeof reader.result === "string" ? reader.result : null);
      setPendingLiveVision(false);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function sendMessage(event?: React.FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text && !pendingImage) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: text || "(image attached)",
      hasImage: Boolean(pendingImage),
      imagePreview: pendingImage,
      liveVision: pendingLiveVision,
    };

    const history: ForgeChatTurn[] = messages
      .filter((m) => m.id !== "boot")
      .map(({ role, text: t, hasImage }) => ({ role, text: t, hasImage }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    const imageBase64 = pendingImage?.includes(",") ? pendingImage.split(",")[1] : pendingImage;
    const liveVision = pendingLiveVision;
    setPendingImage(null);
    setPendingLiveVision(false);

    try {
      const res = await fetch("/api/claw/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          imageBase64,
          liveVision,
          history,
        }),
      });
      if (!res.ok) throw new Error("assist failed");
      const data = (await res.json()) as {
        reply: string;
        suggestedIntent: string;
        budgetTier: BudgetTier;
        imageHint: string | null;
        readyToForge: boolean;
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.reply.replace(/\*\*/g, ""),
        },
      ]);

      if (data.readyToForge) {
        openForgePanel(
          data.suggestedIntent,
          data.budgetTier,
          userMsg.imagePreview ?? null,
          liveVision,
          data.imageHint,
        );
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text: "Local assist unavailable. Use + Forge Claw to provision manually.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col gap-4 lg:flex-row">
      <section className="flex min-h-0 flex-1 flex-col border border-line bg-void">
        <header className="border-b border-line px-4 py-3">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Multimodal Forge Chat</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">
            Natural language + photos + live vision · local inference only
          </p>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[92%] border px-3 py-2 font-mono text-[11px] leading-relaxed ${
                msg.role === "user"
                  ? "ml-auto border-cursor-glow/40 bg-surface text-stark"
                  : "border-line bg-panel text-muted"
              }`}
            >
              {msg.imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.imagePreview}
                  alt=""
                  className="mb-2 h-16 w-24 border border-line object-cover"
                />
              ) : null}
              {msg.text}
            </div>
          ))}
          {thinking ? (
            <div className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow animate-pulse-cursor">
              Forge thinking…
            </div>
          ) : null}
        </div>

        {pendingImage ? (
          <div className="flex items-center gap-2 border-t border-line px-4 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage} alt="" className="h-12 w-16 border border-line object-cover" />
            <span className="font-mono text-[10px] text-muted">
              {pendingLiveVision ? "Live vision attached" : "Photo attached"}
            </span>
            <button
              type="button"
              onClick={() => {
                setPendingImage(null);
                setPendingLiveVision(false);
              }}
              className="ml-auto font-mono text-[10px] text-muted hover:text-stark"
            >
              Remove
            </button>
          </div>
        ) : null}

        <form onSubmit={sendMessage} className="border-t border-line p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-stark"
            >
              📎 Photo
            </button>
            <button
              type="button"
              disabled={!connected || !frame?.previewBase64}
              onClick={attachLiveVision}
              className="border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-stark disabled:opacity-30"
            >
              ◉ Live vision
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="> Describe the claw bot you want to add…"
              className="min-w-0 flex-1 border border-line bg-panel px-3 py-2 font-mono text-xs text-stark outline-none focus:border-cursor-glow"
            />
            <button
              type="submit"
              className="border border-cursor-glow px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow"
            >
              Send
            </button>
          </div>
        </form>
      </section>

      <aside className="flex w-full shrink-0 flex-col border border-line bg-panel lg:w-[340px]">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Claw Fleet</h2>
            <p className="mt-1 font-mono text-[10px] text-muted">{profiles.claws.length} provisioned</p>
          </div>
          <button
            type="button"
            title="Forge new claw"
            onClick={() =>
              openForgePanel(
                forgeIntent || messages.filter((m) => m.role === "user").at(-1)?.text || "",
                forgeBudget,
                forgeImagePreview,
                forgeLiveVision,
                forgeImageHint,
              )
            }
            className="flex h-9 w-9 items-center justify-center border border-cursor-glow bg-surface text-lg text-cursor-glow shadow-cursor transition hover:bg-void"
          >
            +
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {profiles.claws.length === 0 ? (
            <p className="font-mono text-[10px] text-muted">
              No claws yet. Chat your intent or tap + to forge the first bot.
            </p>
          ) : (
            profiles.claws.map((claw) => (
              <ClawCard key={claw.id} claw={claw} active={profiles.activeClawId === claw.id} />
            ))
          )}
        </div>

        {forgeOpen ? (
          <div className="border-t border-line bg-void p-2">
            <NewClawWizard
              variant="embedded"
              initialIntent={forgeIntent}
              initialBudgetTier={forgeBudget}
              initialImagePreview={forgeImagePreview}
              initialLiveVision={forgeLiveVision}
              initialImageHint={forgeImageHint}
              onClose={() => setForgeOpen(false)}
              onCreated={() => {
                setForgeOpen(false);
                void loadProfiles();
                router.refresh();
              }}
            />
          </div>
        ) : (
          <div className="border-t border-line p-3">
            <button
              type="button"
              onClick={() =>
                openForgePanel(
                  forgeIntent || "",
                  forgeBudget,
                  forgeImagePreview,
                  forgeLiveVision,
                  forgeImageHint,
                )
              }
              className="flex w-full items-center justify-center gap-2 border border-cursor-glow bg-surface py-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow shadow-cursor"
            >
              <span className="text-base leading-none">+</span>
              Forge New Claw
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function ClawCard({ claw, active }: { claw: ClawProfile; active: boolean }) {
  return (
    <div
      className={`border px-3 py-2 ${
        active ? "border-cursor-glow bg-surface shadow-cursor" : "border-line bg-void"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-stark">{claw.name}</div>
        {active ? (
          <span className="font-mono text-[9px] uppercase text-cursor-glow">active</span>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-2 font-mono text-[10px] text-muted">{claw.intent}</p>
      <div className="mt-2 font-mono text-[9px] text-muted">
        {claw.models.vision} · {claw.budgetTier}
        {claw.multimodal?.hadReferenceImage || claw.multimodal?.liveVision ? " · multimodal" : ""}
      </div>
    </div>
  );
}
