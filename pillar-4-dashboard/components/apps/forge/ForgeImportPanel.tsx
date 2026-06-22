"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { useForgeAssist } from "@/components/claw/ForgeAssistProvider";
import {
  emptyImportBundleTemplate,
  parseImportBundle,
  type ForgeImportIntegration,
} from "@/lib/forge-import";

interface ForgeImportPanelProps {
  onImported?: (result: { href?: string | null; profileId?: string }) => void;
}

export function ForgeImportPanel({ onImported }: ForgeImportPanelProps) {
  const forge = useForgeAssist();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [successHref, setSuccessHref] = useState<string | null>(null);

  const loadBundle = useCallback(
    (raw: unknown) => {
      setParseError(null);
      setSuccessHref(null);
      setWarningsConfirmed(false);
      if (!raw || typeof raw !== "object") {
        setParseError("Invalid JSON object");
        return;
      }
      const withIntegration = {
        ...(raw as Record<string, unknown>),
        integrationLevel: forge.importIntegration,
      };
      const parsed = parseImportBundle(withIntegration);
      if (!parsed.ok) {
        setParseError(parsed.error);
        setWarnings([]);
        return;
      }
      forge.setImportBundle(withIntegration);
      setWarnings(parsed.value.warnings);
      void fetch("/api/claw/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle: parsed.value.bundle,
          operatorConfirmedWarnings: false,
        }),
      })
        .then(async (res) => {
          const json = (await res.json()) as { warnings?: string[]; error?: string };
          if (json.warnings?.length) setWarnings(json.warnings);
          if (res.status === 409) return;
          if (!res.ok) setParseError(json.error ?? "Validation failed");
        })
        .catch(() => setParseError("Could not validate bundle"));
    },
    [forge],
  );

  const provisionImport = useCallback(async () => {
    setParseError(null);
    setSuccessHref(null);
    setProvisioning(true);

    let raw: unknown;
    try {
      raw = JSON.parse(forge.importJson || "{}");
    } catch {
      setParseError("Invalid JSON");
      setProvisioning(false);
      return;
    }

    const withIntegration = {
      ...(raw as Record<string, unknown>),
      integrationLevel: forge.importIntegration,
    };
    const parsed = parseImportBundle(withIntegration);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setProvisioning(false);
      return;
    }

    if (parsed.value.warnings.length > 0 && !warningsConfirmed) {
      setWarnings(parsed.value.warnings);
      setParseError("Confirm warnings below, then tap Import Claw again.");
      setProvisioning(false);
      return;
    }

    try {
      const res = await fetch("/api/claw/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle: parsed.value.bundle,
          operatorConfirmedWarnings: warningsConfirmed || parsed.value.warnings.length === 0,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        href?: string | null;
        profile?: { id: string };
        requiresConfirmation?: boolean;
        warnings?: string[];
        error?: string;
      };

      if (res.status === 409 && json.requiresConfirmation) {
        setWarnings(json.warnings ?? parsed.value.warnings);
        setParseError("Confirm warnings below, then tap Import Claw again.");
        setProvisioning(false);
        return;
      }

      if (!res.ok) {
        setParseError(json.error ?? "Import failed");
        setProvisioning(false);
        return;
      }

      setSuccessHref(json.href ?? null);
      forge.setImportJson("");
      forge.setImportWarningsConfirmed(false);
      setWarningsConfirmed(false);
      onImported?.({ href: json.href ?? null, profileId: json.profile?.id });
    } catch {
      setParseError("Import request failed");
    } finally {
      setProvisioning(false);
    }
  }, [forge, onImported, warningsConfirmed]);

  return (
    <ExperienceAppSection
      appId="claw-forge"
      sectionId="import"
      minLevel="expert"
      title="Bring Your Claw"
      subtitle="JSON bundle: SOUL.md + TOOLS.md + optional HEARTBEAT · provision without the overlay wizard"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {(["framework", "island"] as ForgeImportIntegration[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => {
              forge.setImportIntegration(level);
              forge.setProvisioningMode("imported");
            }}
            className={`border px-3 py-1.5 font-mono text-[10px] uppercase ${
              forge.importIntegration === level ? "border-cursor-glow text-cursor-glow" : "border-line text-muted"
            }`}
          >
            {level === "framework" ? "Adopt framework" : "Island only"}
          </button>
        ))}
      </div>

      <textarea
        value={forge.importJson}
        onChange={(e) => {
          forge.setImportJson(e.target.value);
          setParseError(null);
          setSuccessHref(null);
        }}
        rows={10}
        className="w-full border border-line bg-void px-3 py-2 font-mono text-[11px] text-stark outline-none focus:border-cursor-glow"
        placeholder={JSON.stringify(emptyImportBundleTemplate(), null, 2)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            try {
              loadBundle(JSON.parse(forge.importJson || "{}"));
            } catch {
              setParseError("Invalid JSON");
            }
          }}
          className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase text-muted hover:text-cursor-glow"
        >
          Validate bundle
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase text-muted hover:text-cursor-glow"
        >
          Upload JSON
        </button>
        <button
          type="button"
          onClick={() => {
            forge.setImportJson(JSON.stringify(emptyImportBundleTemplate(), null, 2));
            forge.setProvisioningMode("imported");
          }}
          className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase text-muted hover:text-cursor-glow"
        >
          Load template
        </button>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([JSON.stringify(emptyImportBundleTemplate(), null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "forge-import-template.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase text-muted hover:text-cursor-glow"
        >
          Download template
        </button>
        <button
          type="button"
          disabled={provisioning || !forge.importJson.trim()}
          onClick={() => void provisionImport()}
          className="border border-cursor-glow px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cursor-glow disabled:opacity-40"
        >
          {provisioning ? "Importing…" : "Import Claw →"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
              const text = r.result as string;
              forge.setImportJson(text);
              try {
                loadBundle(JSON.parse(text));
              } catch {
                setParseError("Invalid JSON file");
              }
            };
            r.readAsText(f);
          }}
        />
      </div>

      {warnings.length > 0 ? (
        <div className="mt-3 border border-line/80 bg-void px-3 py-2">
          <ul className="space-y-1 font-mono text-[10px] text-muted">
            {warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
          <label className="mt-2 flex cursor-pointer items-center gap-2 font-mono text-[10px] text-stark">
            <input
              type="checkbox"
              checked={warningsConfirmed}
              onChange={(e) => setWarningsConfirmed(e.target.checked)}
              className="accent-[#bc13fe]"
            />
            I reviewed warnings — proceed with import
          </label>
        </div>
      ) : null}

      {parseError ? <p className="mt-2 font-mono text-[11px] text-cursor-glow">{parseError}</p> : null}
      {successHref ? (
        <p className="mt-2 font-mono text-[11px] text-cursor-glow">
          Import complete.{" "}
          <Link href={successHref} className="underline">
            Open desk →
          </Link>
        </p>
      ) : null}
    </ExperienceAppSection>
  );
}
