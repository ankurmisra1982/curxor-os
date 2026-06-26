"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { appIdFromPathname } from "@/lib/fre-routing";
import { getOotbApp, isValidAppId, type OotbAppId } from "@/lib/ootb-apps";
import { ASK_PATH, HOME_PATH } from "@/lib/ui-categories";
import type { AgentChatTurn } from "@/lib/app-agent-types";
import type { PatronAskSettings } from "@/lib/user-settings-types";

import { PatronAskFab } from "./PatronAskFab";
import { PatronAskSheet } from "./PatronAskSheet";

export type PatronInference = "local" | "fallback" | "frontier";

interface PatronAskContextValue {
  open: boolean;
  isFullscreenRoute: boolean;
  messages: AgentChatTurn[];
  loading: boolean;
  inferenceStatus: PatronInference | null;
  routeAppId: OotbAppId | null;
  clawLabel: string | null;
  unread: boolean;
  toggle: () => void;
  openSheet: () => void;
  openFullscreen: () => void;
  collapseToSheet: () => void;
  minimize: () => void;
  send: (text: string) => Promise<void>;
}

const PatronAskContext = createContext<PatronAskContextValue | null>(null);

export function usePatronAsk(): PatronAskContextValue {
  const ctx = useContext(PatronAskContext);
  if (!ctx) throw new Error("usePatronAsk must be used within PatronAskProvider");
  return ctx;
}

async function patchPatronAsk(patch: Partial<PatronAskSettings>) {
  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patronAsk: patch }),
  });
}

export function PatronAskProvider({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isFullscreenRoute = pathname === ASK_PATH || pathname.startsWith(`${ASK_PATH}/`);
  const routeAppId = useMemo(() => appIdFromPathname(pathname), [pathname]);
  const clawLabel = useMemo(() => {
    if (!routeAppId) return null;
    return getOotbApp(routeAppId).short;
  }, [routeAppId]);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AgentChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [inferenceStatus, setInferenceStatus] = useState<PatronInference | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [unread, setUnread] = useState(false);
  const [localInferenceAvailable, setLocalInferenceAvailable] = useState(true);
  const [savedUi, setSavedUi] = useState<PatronAskSettings["ui"]>("minimized");

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

  const refreshContext = useCallback(async () => {
    const params = routeAppId ? `?routeAppId=${encodeURIComponent(routeAppId)}` : "";
    try {
      const res = await fetch(`/api/patron/context${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        inferenceAvailable?: boolean;
        patronAsk?: PatronAskSettings;
      };
      setLocalInferenceAvailable(data.inferenceAvailable !== false);
      const ui = data.patronAsk?.ui ?? "minimized";
      setSavedUi(ui);
      if (ui === "sheet" && !isFullscreenRoute) {
        setOpen(true);
      }
      if (ui === "fullscreen" && !isFullscreenRoute) {
        router.push(ASK_PATH);
      }
    } catch {
      // ignore
    }
  }, [routeAppId, isFullscreenRoute, router]);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  useEffect(() => {
    const shouldLoad = (open || isFullscreenRoute) && !historyLoaded;
    if (shouldLoad) void loadHistory();
  }, [open, isFullscreenRoute, historyLoaded, loadHistory]);

  useEffect(() => {
    if (isFullscreenRoute) {
      setOpen(false);
      setUnread(false);
      void patchPatronAsk({ ui: "fullscreen", lastReadAt: new Date().toISOString() });
    }
  }, [isFullscreenRoute]);

  const openSheet = useCallback(() => {
    setOpen(true);
    setUnread(false);
    void patchPatronAsk({ ui: "sheet", lastReadAt: new Date().toISOString() });
    if (!historyLoaded) void loadHistory();
    if (isFullscreenRoute) router.push(HOME_PATH);
  }, [historyLoaded, isFullscreenRoute, loadHistory, router]);

  const openFullscreen = useCallback(() => {
    setOpen(false);
    setUnread(false);
    void patchPatronAsk({ ui: "fullscreen", lastReadAt: new Date().toISOString() });
    if (!historyLoaded) void loadHistory();
    router.push(ASK_PATH);
  }, [historyLoaded, loadHistory, router]);

  const collapseToSheet = useCallback(() => {
    void patchPatronAsk({ ui: "sheet", lastReadAt: new Date().toISOString() });
    setOpen(true);
    router.push(HOME_PATH);
  }, [router]);

  const minimize = useCallback(() => {
    setOpen(false);
    void patchPatronAsk({ ui: "minimized" });
    if (isFullscreenRoute) {
      router.push(HOME_PATH);
    }
  }, [isFullscreenRoute, router]);

  const toggle = useCallback(() => {
    if (isFullscreenRoute) {
      minimize();
      return;
    }
    if (open) minimize();
    else openSheet();
  }, [isFullscreenRoute, open, minimize, openSheet]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggle();
      }
    }
    function onOpenAsk() {
      if (savedUi === "fullscreen") openFullscreen();
      else openSheet();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("curxor:open-ask", onOpenAsk);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("curxor:open-ask", onOpenAsk);
    };
  }, [toggle, openSheet, openFullscreen, savedUi]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || loading) return;

      const userTurn: AgentChatTurn = { role: "user", text: message };
      setMessages((prev) => [...prev, userTurn]);
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
        const assistantTurn: AgentChatTurn = { role: "assistant", text: reply };
        setMessages((prev) => [...prev, assistantTurn]);
        if (data.inference) setInferenceStatus(data.inference);
        if (!open && !isFullscreenRoute) setUnread(true);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Patron unreachable — check dashboard health." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, open, isFullscreenRoute, routeAppId],
  );

  const badgeInference: PatronInference =
    inferenceStatus ?? (localInferenceAvailable ? "local" : "fallback");

  const value: PatronAskContextValue = {
    open,
    isFullscreenRoute,
    messages,
    loading,
    inferenceStatus: badgeInference,
    routeAppId,
    clawLabel,
    unread,
    toggle,
    openSheet,
    openFullscreen,
    collapseToSheet,
    minimize,
    send,
  };

  return (
    <PatronAskContext.Provider value={value}>
      {children}
      {!isFullscreenRoute ? (
        <>
          <PatronAskFab />
          <PatronAskSheet />
        </>
      ) : null}
    </PatronAskContext.Provider>
  );
}
