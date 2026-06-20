"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { BudgetTier } from "@/lib/local-llm-catalog";

export interface ForgeWizardPrefill {
  intent?: string;
  budgetTier?: BudgetTier;
  imageHint?: string | null;
}

export interface ForgeAssistContextValue {
  intent: string;
  setIntent: (value: string) => void;
  imagePreview: string | null;
  setImagePreview: (value: string | null) => void;
  liveVision: boolean;
  setLiveVision: (value: boolean) => void;
  getImageBase64: () => string | null;
  wizardOpen: boolean;
  wizardPrefill: ForgeWizardPrefill;
  openWizard: (prefill?: ForgeWizardPrefill) => void;
  closeWizard: () => void;
}

const ForgeAssistContext = createContext<ForgeAssistContextValue | null>(null);

export function ForgeAssistProvider({ children }: { children: ReactNode }) {
  const [intent, setIntent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [liveVision, setLiveVision] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState<ForgeWizardPrefill>({});

  const getImageBase64 = useCallback((): string | null => {
    if (!imagePreview) return null;
    const comma = imagePreview.indexOf(",");
    return comma >= 0 ? imagePreview.slice(comma + 1) : imagePreview;
  }, [imagePreview]);

  const openWizard = useCallback((prefill?: ForgeWizardPrefill) => {
    if (prefill?.intent) setIntent(prefill.intent);
    setWizardPrefill(prefill ?? {});
    setWizardOpen(true);
  }, []);

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardPrefill({});
  }, []);

  const value = useMemo(
    () => ({
      intent,
      setIntent,
      imagePreview,
      setImagePreview,
      liveVision,
      setLiveVision,
      getImageBase64,
      wizardOpen,
      wizardPrefill,
      openWizard,
      closeWizard,
    }),
    [intent, imagePreview, liveVision, getImageBase64, wizardOpen, wizardPrefill, openWizard, closeWizard],
  );

  return <ForgeAssistContext.Provider value={value}>{children}</ForgeAssistContext.Provider>;
}

export function useForgeAssist(): ForgeAssistContextValue {
  const ctx = useContext(ForgeAssistContext);
  if (!ctx) {
    throw new Error("useForgeAssist must be used within ForgeAssistProvider");
  }
  return ctx;
}

export function useForgeAssistOptional(): ForgeAssistContextValue | null {
  return useContext(ForgeAssistContext);
}
