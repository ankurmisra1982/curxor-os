"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildNavItems, SETTINGS_PATH, ASK_PATH } from "@/lib/ui-categories";
import type { ForgedAppRecord } from "@/lib/forged-apps-types";
import type { OotbAppId } from "@/lib/ootb-apps";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  selectedApps: OotbAppId[];
  forgedApps?: ForgedAppRecord[];
  onOpenHealth: () => void;
  onToggleMode: () => void;
  isExpert: boolean;
}

export function CommandPalette({
  open,
  onClose,
  selectedApps,
  forgedApps = [],
  onOpenHealth,
  onToggleMode,
  isExpert,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const actions = useMemo(() => {
    const nav = buildNavItems(selectedApps, forgedApps).map((item) => ({
      id: item.href,
      label: item.name,
      hint: item.noviceLabel,
      run: () => router.push(item.href),
    }));

    return [
      {
        id: "patron-ask",
        label: "Patron Ask",
        hint: "Fullscreen ops board + chat · Ctrl+J",
        run: () => router.push(ASK_PATH),
      },
      ...nav,
      {
        id: "settings",
        label: "Settings",
        hint: "Claws, intelligence, appearance",
        run: () => router.push(SETTINGS_PATH),
      },
      {
        id: "health",
        label: "System health",
        hint: "Metrics, OTA log, compute",
        run: onOpenHealth,
      },
      {
        id: "mode",
        label: isExpert ? "Switch to Simple mode" : "Switch to Expert mode",
        hint: "Show or hide telemetry details",
        run: onToggleMode,
      },
    ];
  }, [selectedApps, forgedApps, router, onOpenHealth, onToggleMode, isExpert]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q),
    );
  }, [actions, query]);

  const runAction = useCallback(
    (run: () => void) => {
      run();
      onClose();
      setQuery("");
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh]"
      role="dialog"
      aria-label="Command palette"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-line bg-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-4 py-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Go to… or type an action"
            className="w-full bg-transparent font-sans text-sm text-stark outline-none placeholder:text-muted"
          />
          <p className="mt-2 font-mono text-[10px] text-muted">Ctrl+K · Esc to close</p>
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                onClick={() => runAction(action.run)}
                className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-surface"
              >
                <span className="font-sans text-sm text-stark">{action.label}</span>
                <span className="font-sans text-xs text-muted">{action.hint}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-4 py-6 font-sans text-sm text-muted">No matches</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
