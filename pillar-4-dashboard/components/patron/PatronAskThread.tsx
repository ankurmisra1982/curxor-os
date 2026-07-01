"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { usePatronVoice } from "@/hooks/usePatronVoice";

import { usePatronAskChat } from "./PatronAskChatProvider";
import { PatronApprovalCards } from "./PatronApprovalCards";

const STARTERS = [
  "What can you help me with?",
  "Summarize my day",
  "What Claw should I use for…",
] as const;

export function PatronAskThread({ compactApprovals = false }: { compactApprovals?: boolean }) {
  const { messages, loading, send, voiceEnabled, voiceSupported, setVoiceEnabled } = usePatronAskChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef(-1);
  const baseInputRef = useRef("");

  const onFinalText = useCallback(
    (text: string) => {
      const merged = `${baseInputRef.current} ${text}`.trim();
      if (merged) {
        setInput("");
        baseInputRef.current = "";
        void send(merged);
        return;
      }
      setInput(text);
    },
    [send],
  );

  const onInterimText = useCallback((text: string) => {
    const merged = `${baseInputRef.current} ${text}`.trim();
    setInput(merged);
  }, []);

  const { listening, voiceError, toggleListening, speakReply, support } = usePatronVoice({
    voiceEnabled,
    disabled: loading,
    onInterimText,
    onFinalText,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!voiceEnabled) return;
    const lastIdx = messages.length - 1;
    if (lastIdx < 0 || lastIdx === lastSpokenRef.current || loading) return;
    const msg = messages[lastIdx];
    if (msg?.role === "assistant") {
      lastSpokenRef.current = lastIdx;
      speakReply(msg.text);
    }
  }, [messages, loading, voiceEnabled, speakReply]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    baseInputRef.current = "";
    void send(text);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = input.trim();
      if (!text || loading) return;
      setInput("");
      baseInputRef.current = "";
      void send(text);
    }
  }

  function onMicClick() {
    baseInputRef.current = input.trim();
    toggleListening();
  }

  const showStarters = messages.length === 0 && !loading;
  const canUseMic = voiceEnabled && support.recognition;

  return (
    <>
      <PatronApprovalCards compact={compactApprovals} />
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {showStarters ? (
          <div className="space-y-2 py-4">
            <p className="font-sans text-xs text-muted">Your patron on the appliance.</p>
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void send(starter)}
                className="block w-full border border-line bg-surface px-3 py-2 text-left font-sans text-xs text-stark transition hover:border-cursor-glow"
              >
                {starter}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              msg.role === "assistant"
                ? "rounded border-l-2 border-cursor-glow bg-panel px-3 py-2"
                : "rounded border border-line bg-surface px-3 py-2"
            }
          >
            <span className="font-mono text-[10px] text-muted">
              {msg.role === "user" ? "You" : "Patron"}
            </span>
            <p className="mt-0.5 whitespace-pre-wrap font-sans text-sm text-stark">{msg.text}</p>
          </div>
        ))}

        {loading ? (
          <div className="font-mono text-[10px] text-muted">
            <span className="inline-flex gap-1">
              <span className="animate-pulse">·</span>
              <span className="animate-pulse [animation-delay:150ms]">·</span>
              <span className="animate-pulse [animation-delay:300ms]">·</span>
            </span>
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-line p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {voiceSupported ? (
            <label className="flex cursor-pointer items-center gap-2 font-sans text-xs text-muted">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="accent-curxor"
              />
              Voice mode
            </label>
          ) : (
            <span className="font-sans text-[10px] text-muted">Voice needs Chrome or Edge</span>
          )}
          {listening ? (
            <span className="font-mono text-[9px] uppercase tracking-wider text-cursor-glow">Listening…</span>
          ) : null}
        </div>

        {voiceError ? <p className="mb-2 font-sans text-[11px] text-amber-400">{voiceError}</p> : null}

        <div className="flex gap-2">
          {canUseMic ? (
            <button
              type="button"
              onClick={onMicClick}
              disabled={loading}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Start voice input"}
              className={`min-h-[44px] min-w-[44px] shrink-0 border px-2 font-sans text-xs transition disabled:opacity-40 ${
                listening
                  ? "border-amber-400 bg-amber-500/10 text-amber-400"
                  : "border-line text-stark hover:border-cursor-glow hover:text-cursor-glow"
              }`}
            >
              Mic
            </button>
          ) : null}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={voiceEnabled ? "Ask Patron or tap Mic…" : "Ask Patron…"}
            disabled={loading}
            className="min-h-[44px] min-w-0 flex-1 resize-none border border-line bg-panel px-2 py-2 font-sans text-sm text-stark outline-none focus:border-cursor-glow disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="self-end border border-cursor-glow px-3 py-2 font-sans text-sm text-cursor-glow disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-1 font-mono text-[9px] text-muted">
          Enter send · Shift+Enter newline · Ctrl+J toggle Patron
          {voiceEnabled ? " · Mic auto-sends when you finish speaking" : ""}
        </p>
      </form>
    </>
  );
}
