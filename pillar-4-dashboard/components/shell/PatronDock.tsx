"use client";



import { useCallback, useState, type FormEvent, type KeyboardEvent } from "react";



import { usePatronVoice } from "@/hooks/usePatronVoice";

import { usePatronAsk } from "@/components/patron/PatronAskProvider";

import { usePatronAskChat } from "@/components/patron/PatronAskChatProvider";



export function PatronDock() {

  const { openSheet, send, loading } = usePatronAsk();

  const { voiceEnabled, voiceSupported, setVoiceEnabled } = usePatronAskChat();

  const [draft, setDraft] = useState("");



  const onFinalText = useCallback(

    (text: string) => {

      const merged = `${draft} ${text}`.trim();

      if (!merged || loading) return;

      openSheet();

      setDraft("");

      void send(merged);

    },

    [draft, loading, openSheet, send],

  );



  const { listening, toggleListening, support } = usePatronVoice({

    voiceEnabled,

    disabled: loading,

    onFinalText,

    onInterimText: (text) => setDraft((prev) => `${prev} ${text}`.trim()),

  });



  async function submit() {

    const text = draft.trim();

    if (!text || loading) return;

    openSheet();

    setDraft("");

    await send(text);

  }



  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {

    if (e.key === "Enter") {

      e.preventDefault();

      void submit();

    }

  }



  function onFocus() {

    openSheet();

  }



  return (

    <div className="curxor-shell-x shrink-0 border-t border-line bg-panel py-3">

      <form

        onSubmit={(e: FormEvent) => {

          e.preventDefault();

          void submit();

        }}

        className="flex w-full items-center gap-2"

      >

        {voiceSupported ? (

          <button

            type="button"

            onClick={() => setVoiceEnabled(!voiceEnabled)}

            className={`min-h-11 shrink-0 border px-2 font-mono text-[9px] uppercase tracking-wider transition ${

              voiceEnabled

                ? "border-cursor-glow text-cursor-glow"

                : "border-line text-muted hover:text-stark"

            }`}

            aria-pressed={voiceEnabled}

            title="Toggle voice mode"

          >

            Voice

          </button>

        ) : null}

        {voiceEnabled && support.recognition ? (

          <button

            type="button"

            onClick={() => {

              openSheet();

              toggleListening();

            }}

            disabled={loading}

            aria-pressed={listening}

            className={`min-h-11 min-w-11 shrink-0 border font-sans text-xs transition disabled:opacity-40 ${

              listening

                ? "border-amber-400 text-amber-400"

                : "border-line text-stark hover:border-cursor-glow"

            }`}

            aria-label={listening ? "Stop listening" : "Speak to Patron"}

          >

            Mic

          </button>

        ) : null}

        <label htmlFor="patron-dock-input" className="sr-only">

          Conduct your team

        </label>

        <input

          id="patron-dock-input"

          type="text"

          value={draft}

          onChange={(e) => setDraft(e.target.value)}

          onKeyDown={onKeyDown}

          onFocus={onFocus}

          placeholder="Conduct your team. E.g., pause Outreach sequencing until tomorrow."

          className="min-h-11 flex-1 rounded-sm border border-line bg-void px-3 font-sans text-sm text-stark placeholder:text-muted focus:border-cursor-glow focus:outline-none focus:ring-1 focus:ring-cursor-glow"

          autoComplete="off"

        />

        <button

          type="submit"

          disabled={!draft.trim() || loading}

          className="min-h-11 shrink-0 border border-line px-4 font-sans text-xs text-stark transition hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"

        >

          Send

        </button>

      </form>

    </div>

  );

}

