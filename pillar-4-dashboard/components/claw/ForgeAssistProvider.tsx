"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { BudgetTier } from "@/lib/local-llm-catalog";
import type { ForgeProvisioningMode } from "@/lib/forge-provisioning";
import type { ForgeImportIntegration } from "@/lib/forge-import";
import type { ForgeTemplateId } from "@/lib/forge-templates";
import { inferTemplateFromIntent } from "@/lib/forge-templates";

export interface ForgeWizardPrefill {
  intent?: string;
  budgetTier?: BudgetTier;
  imageHint?: string | null;
  provisioningMode?: ForgeProvisioningMode;
  templateId?: ForgeTemplateId;
}

export interface ForgeAssistContextValue {
  intent: string;
  setIntent: (value: string) => void;
  imagePreview: string | null;
  setImagePreview: (value: string | null) => void;
  liveVision: boolean;
  setLiveVision: (value: boolean) => void;
  provisioningMode: ForgeProvisioningMode;
  setProvisioningMode: (mode: ForgeProvisioningMode) => void;
  templateId: ForgeTemplateId;
  setTemplateId: (id: ForgeTemplateId) => void;
  importJson: string;
  setImportJson: (value: string) => void;
  importIntegration: ForgeImportIntegration;
  setImportIntegration: (level: ForgeImportIntegration) => void;
  importBundle: Record<string, unknown> | null;
  setImportBundle: (bundle: Record<string, unknown> | null) => void;
  importWarningsConfirmed: boolean;
  setImportWarningsConfirmed: (value: boolean) => void;
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
  const [provisioningMode, setProvisioningMode] = useState<ForgeProvisioningMode>("island");
  const [templateId, setTemplateId] = useState<ForgeTemplateId>("blank-desk");
  const [importJson, setImportJson] = useState("");
  const [importIntegration, setImportIntegration] = useState<ForgeImportIntegration>("framework");
  const [importBundle, setImportBundle] = useState<Record<string, unknown> | null>(null);
  const [importWarningsConfirmed, setImportWarningsConfirmed] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState<ForgeWizardPrefill>({});

  const getImageBase64 = useCallback((): string | null => {
    if (!imagePreview) return null;
    const comma = imagePreview.indexOf(",");
    return comma >= 0 ? imagePreview.slice(comma + 1) : imagePreview;
  }, [imagePreview]);

  const openWizard = useCallback((prefill?: ForgeWizardPrefill) => {
    if (prefill?.intent) {
      setIntent(prefill.intent);
      setTemplateId(prefill.templateId ?? inferTemplateFromIntent(prefill.intent));
    }
    if (prefill?.provisioningMode) setProvisioningMode(prefill.provisioningMode);
    if (prefill?.templateId) setTemplateId(prefill.templateId);
    setWizardPrefill(prefill ?? {});
    setWizardOpen(true);
  }, []);

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardPrefill({});
    setImportWarningsConfirmed(false);
  }, []);

  const value = useMemo(
    () => ({
      intent,
      setIntent,
      imagePreview,
      setImagePreview,
      liveVision,
      setLiveVision,
      provisioningMode,
      setProvisioningMode,
      templateId,
      setTemplateId,
      importJson,
      setImportJson,
      importIntegration,
      setImportIntegration,
      importBundle,
      setImportBundle,
      importWarningsConfirmed,
      setImportWarningsConfirmed,
      getImageBase64,
      wizardOpen,
      wizardPrefill,
      openWizard,
      closeWizard,
    }),
    [
      intent,
      imagePreview,
      liveVision,
      provisioningMode,
      templateId,
      importJson,
      importIntegration,
      importBundle,
      importWarningsConfirmed,
      getImageBase64,
      wizardOpen,
      wizardPrefill,
      openWizard,
      closeWizard,
    ],
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
