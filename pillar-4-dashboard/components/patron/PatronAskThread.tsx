"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { usePatronAsk } from "./PatronAskProvider";
import { PatronApprovalCards } from "./PatronApprovalCards";

const STARTERS = [
  "What can you help me with?",
  "Summarize my day",
  "What Claw should I use for…",
] as const;

export function PatronAskThread({ compactApprovals = false }: { compactApprovals?: boolean }) {
  const { messages, loading, send } = usePatronAsk();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    void send(text);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = input.trim();
      if (!text || loading) return;
      setInput("");
      void send(text);
    }
  }

  const showStarters = messages.length === 0 && !loading;

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
                ? "rounded border-l-2 border-[#bc13fe] bg-panel px-3 py-2"
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
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Ask Patron…"
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
        <p className="mt-1 font-mono text-[9px] text-muted">Enter send · Shift+Enter newline · Ctrl+J toggle</p>
      </form>
    </>
  );
}
