"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import type { AgentChatTurn } from "@/lib/app-agent-types";
import { getPatronVoiceSupport } from "@/lib/patron-voice-browser";

export type PatronInference = "local" | "fallback" | "frontier";

export interface PatronAskChatContextValue {
  messages: AgentChatTurn[];
  loading: boolean;
  inferenceStatus: PatronInference | null;
  historyLoaded: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  loadHistory: () => Promise<void>;
  send: (text: string) => Promise<void>;
}

const PatronAskChatContext = createContext<PatronAskChatContextValue | null>(null);

export function usePatronAskChat(): PatronAskChatContextValue {
  const ctx = useContext(PatronAskChatContext);
  if (!ctx) throw new Error("usePatronAskChat must be used within PatronAskChatProvider");
  return ctx;
}

interface PatronAskChatProviderProps {
  children: ReactNode;
  routeAppId?: OotbAppId | null;
  /** When false, skip auto-load until explicitly opened (desktop sheet). */
  autoLoadHistory?: boolean;
  onAssistantReply?: () => void;
}

export function PatronAskChatProvider({
  children,
  routeAppId = null,
  autoLoadHistory = true,
  onAssistantReply,
}: PatronAskChatProviderProps) {
  const [messages, setMessages] = useState<AgentChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [inferenceStatus, setInferenceStatus] = useState<PatronInference | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [localInferenceAvailable, setLocalInferenceAvailable] = useState(true);
  const [voiceEnabled, setVoiceEnabledState] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    const support = getPatronVoiceSupport();
    setVoiceSupported(support.recognition || support.synthesis);
  }, []);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
    void fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patronAsk: { voiceEnabled: enabled } }),
    });
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/patron/history", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { turns?: AgentChatTurn[] };
      if (Array.isArray(data.turns) && data.turns.length > 0) {
        setMessages(data.turns);
      }
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const params = routeAppId ? `?routeAppId=${encodeURIComponent(routeAppId)}` : "";
        const res = await fetch(`/api/patron/context${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { inferenceAvailable?: boolean; patronAsk?: { voiceEnabled?: boolean } };
        setLocalInferenceAvailable(data.inferenceAvailable !== false);
        if (typeof data.patronAsk?.voiceEnabled === "boolean") {
          setVoiceEnabledState(data.patronAsk.voiceEnabled);
        }
      } catch {
        // ignore
      }
    })();
  }, [routeAppId]);

  useEffect(() => {
    if (autoLoadHistory && !historyLoaded) void loadHistory();
  }, [autoLoadHistory, historyLoaded, loadHistory]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || loading) return;

      setMessages((prev) => [...prev, { role: "user", text: message }]);
      setLoading(true);

      try {
        const res = await fetch("/api/patron/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            routeAppId: routeAppId && isValidAppId(routeAppId) ? routeAppId : null,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          inference?: PatronInference;
        };
        const reply = typeof data.reply === "string" ? data.reply : "Patron could not reply.";
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        if (data.inference) setInferenceStatus(data.inference);
        onAssistantReply?.();
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Patron unreachable — check dashboard health." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, onAssistantReply, routeAppId],
  );

  const badgeInference: PatronInference =
    inferenceStatus ?? (localInferenceAvailable ? "local" : "fallback");

  const value: PatronAskChatContextValue = {
    messages,
    loading,
    inferenceStatus: badgeInference,
    historyLoaded,
    voiceEnabled,
    voiceSupported,
    setVoiceEnabled,
    loadHistory,
    send,
  };

  return <PatronAskChatContext.Provider value={value}>{children}</PatronAskChatContext.Provider>;
}
