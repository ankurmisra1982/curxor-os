"use client";

import { useEffect, useState } from "react";

export interface ContentToast {
  id: string;
  message: string;
  kind: "info" | "success" | "error";
}

interface ContentNotificationsProps {
  toasts: ContentToast[];
  onDismiss: (id: string) => void;
}

export function ContentNotifications({ toasts, onDismiss }: ContentNotificationsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ContentToast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const border =
    toast.kind === "success"
      ? "border-cursor-glow text-cursor-glow"
      : toast.kind === "error"
        ? "border-red-500/60 text-red-300"
        : "border-line text-stark";

  return (
    <div
      className={`pointer-events-auto border bg-void/95 px-3 py-2 font-mono text-[10px] shadow-lg backdrop-blur ${border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-muted hover:text-stark"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useContentToasts() {
  const [toasts, setToasts] = useState<ContentToast[]>([]);

  const pushToast = (message: string, kind: ContentToast["kind"] = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [{ id, message, kind }, ...prev].slice(0, 5));
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, pushToast, dismissToast };
}
