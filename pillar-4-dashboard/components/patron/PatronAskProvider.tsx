"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { appIdFromPathname } from "@/lib/fre-routing";
import { getOotbApp, type OotbAppId } from "@/lib/ootb-apps";
import { ASK_PATH, HOME_PATH } from "@/lib/ui-categories";
import type { PatronAskSettings } from "@/lib/user-settings-types";

import { PatronAskChatProvider, usePatronAskChat, type PatronInference } from "./PatronAskChatProvider";
import { PatronAskFab } from "./PatronAskFab";
import { PatronAskSheet } from "./PatronAskSheet";

export type { PatronInference };

interface PatronAskContextValue {
  open: boolean;
  isFullscreenRoute: boolean;
  messages: ReturnType<typeof usePatronAskChat>["messages"];
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
  const routeAppId = useMemo(() => appIdFromPathname(pathname), [pathname]);
  const isFullscreenRoute = pathname === ASK_PATH || pathname.startsWith(`${ASK_PATH}/`);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const autoLoad = open || isFullscreenRoute;

  return (
    <PatronAskChatProvider
      routeAppId={routeAppId}
      autoLoadHistory={autoLoad}
      onAssistantReply={() => {
        if (!open && !isFullscreenRoute) setUnread(true);
      }}
    >
      <PatronAskDesktopChrome
        open={open}
        setOpen={setOpen}
        unread={unread}
        setUnread={setUnread}
        isFullscreenRoute={isFullscreenRoute}
        routeAppId={routeAppId}
      >
        {children}
      </PatronAskDesktopChrome>
    </PatronAskChatProvider>
  );
}

function PatronAskDesktopChrome({
  children,
  open,
  setOpen,
  unread,
  setUnread,
  isFullscreenRoute,
  routeAppId,
}: {
  children?: ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
  unread: boolean;
  setUnread: (v: boolean) => void;
  isFullscreenRoute: boolean;
  routeAppId: OotbAppId | null;
}) {
  const router = useRouter();
  const chat = usePatronAskChat();
  const [savedUi, setSavedUi] = useState<PatronAskSettings["ui"]>("minimized");

  const clawLabel = useMemo(() => {
    if (!routeAppId) return null;
    return getOotbApp(routeAppId).short;
  }, [routeAppId]);

  const refreshContext = useCallback(async () => {
    const params = routeAppId ? `?routeAppId=${encodeURIComponent(routeAppId)}` : "";
    try {
      const res = await fetch(`/api/patron/context${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { patronAsk?: PatronAskSettings };
      const ui = data.patronAsk?.ui ?? "minimized";
      setSavedUi(ui);
      if (ui === "sheet" && !isFullscreenRoute) setOpen(true);
    } catch {
      // ignore
    }
  }, [routeAppId, isFullscreenRoute, router, setOpen]);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  useEffect(() => {
    if ((open || isFullscreenRoute) && !chat.historyLoaded) void chat.loadHistory();
  }, [open, isFullscreenRoute, chat.historyLoaded, chat.loadHistory]);

  useEffect(() => {
    if (isFullscreenRoute) {
      setOpen(false);
      setUnread(false);
      void patchPatronAsk({ ui: "fullscreen", lastReadAt: new Date().toISOString() });
    }
  }, [isFullscreenRoute, setOpen, setUnread]);

  const wasFullscreenRoute = useRef(false);
  useEffect(() => {
    if (wasFullscreenRoute.current && !isFullscreenRoute) {
      void patchPatronAsk({ ui: "minimized" });
      setSavedUi("minimized");
    }
    wasFullscreenRoute.current = isFullscreenRoute;
  }, [isFullscreenRoute]);

  const openSheet = useCallback(() => {
    setOpen(true);
    setUnread(false);
    void patchPatronAsk({ ui: "sheet", lastReadAt: new Date().toISOString() });
    if (!chat.historyLoaded) void chat.loadHistory();
    if (isFullscreenRoute) router.push(HOME_PATH);
  }, [chat, isFullscreenRoute, router, setOpen, setUnread]);

  const openFullscreen = useCallback(() => {
    setOpen(false);
    setUnread(false);
    void patchPatronAsk({ ui: "fullscreen", lastReadAt: new Date().toISOString() });
    if (!chat.historyLoaded) void chat.loadHistory();
    router.push(ASK_PATH);
  }, [chat, router, setOpen, setUnread]);

  const collapseToSheet = useCallback(() => {
    void patchPatronAsk({ ui: "sheet", lastReadAt: new Date().toISOString() });
    setOpen(true);
    router.push(HOME_PATH);
  }, [router, setOpen]);

  const minimize = useCallback(() => {
    setOpen(false);
    void patchPatronAsk({ ui: "minimized" });
    if (isFullscreenRoute) router.push(HOME_PATH);
  }, [isFullscreenRoute, router, setOpen]);

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

  const value: PatronAskContextValue = {
    open,
    isFullscreenRoute,
    messages: chat.messages,
    loading: chat.loading,
    inferenceStatus: chat.inferenceStatus,
    routeAppId,
    clawLabel,
    unread,
    toggle,
    openSheet,
    openFullscreen,
    collapseToSheet,
    minimize,
    send: chat.send,
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
