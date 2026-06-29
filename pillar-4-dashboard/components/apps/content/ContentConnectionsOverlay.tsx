"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  connectFieldsForPlatform,
  listCreatorConnectPlatforms,
  PUBLIC_MEDIA_FIELD,
  type PlatformConnectCard,
} from "@/lib/content-bridge-connect";
import type { SocialPlatformId } from "@/lib/social-channels";

interface ContentConnectionsOverlayProps {
  open: boolean;
  onClose: () => void;
  freChannels: string[];
  focusPlatform?: SocialPlatformId | null;
  onSaved?: () => void;
}

export function ContentConnectionsOverlay({
  open,
  onClose,
  freChannels,
  focusPlatform,
  onSaved,
}: ContentConnectionsOverlayProps) {
  const platforms = useMemo(() => listCreatorConnectPlatforms(freChannels), [freChannels]);
  const [active, setActive] = useState<SocialPlatformId | "media">(
    focusPlatform ?? (platforms[0]?.platform as SocialPlatformId) ?? "x",
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [publicBase, setPublicBase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    if (focusPlatform) setActive(focusPlatform);
    else if (platforms[0]) setActive(platforms[0].platform);
  }, [open, focusPlatform, platforms]);

  const activeCard: PlatformConnectCard | null =
    active === "media" ? null : (platforms.find((p) => p.platform === active) ?? null);
  const fields = active === "media" ? [PUBLIC_MEDIA_FIELD] : connectFieldsForPlatform(active);

  const save = useCallback(async () => {
    if (active === "media") {
      if (!publicBase.trim()) {
        setError("Enter a public image web address.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/content/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_bridge_credentials",
            platform: freChannels[0] ?? "instagram",
            credentials: { CURXOR_CONTENT_PUBLIC_BASE: publicBase.trim() },
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
        setSuccess("Public image address saved.");
        onSaved?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      } finally {
        setBusy(false);
      }
      return;
    }

    const credentials: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key]?.trim();
      if (v) credentials[f.key] = v;
    }
    if (Object.keys(credentials).length === 0) {
      setError("Enter at least one field to connect this account.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_bridge_credentials",
          platform: active,
          credentials,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setSuccess(`${activeCard?.name ?? "Account"} credentials saved on this box.`);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }, [active, activeCard?.name, fields, freChannels, onSaved, publicBase, values]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-cursor-glow/40 bg-panel shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cursor-glow">Connections</p>
            <h2 className="mt-1 font-sans text-lg font-semibold text-stark">Connect your social accounts</h2>
            <p className="mt-1 max-w-lg font-sans text-sm text-muted">
              Sign-in details stay on this box. Nothing is sent to the cloud except when you publish through a connected
              platform.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 border border-line px-2 py-1 font-mono text-[10px] uppercase text-muted hover:text-stark"
          >
            Close
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 sm:flex-row">
          <nav className="flex shrink-0 flex-row flex-wrap gap-1 sm:w-40 sm:flex-col">
            {platforms.map((p) => (
              <button
                key={p.platform}
                type="button"
                onClick={() => {
                  setActive(p.platform);
                  setError(null);
                  setSuccess(null);
                }}
                className={`border px-2 py-1.5 text-left font-mono text-[10px] uppercase ${
                  active === p.platform
                    ? "border-cursor-glow text-cursor-glow"
                    : "border-line text-muted hover:border-line/80 hover:text-stark"
                }`}
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setActive("media");
                setError(null);
                setSuccess(null);
              }}
              className={`border px-2 py-1.5 text-left font-mono text-[10px] uppercase ${
                active === "media"
                  ? "border-cursor-glow text-cursor-glow"
                  : "border-line text-muted hover:border-line/80 hover:text-stark"
              }`}
            >
              Public images
            </button>
          </nav>

          <div className="min-w-0 flex-1 space-y-3">
            {active === "media" ? (
              <>
                <p className="font-sans text-sm text-muted">
                  Instagram and Pinterest need images at a public web address your accounts can fetch. Use a domain that
                  points at this appliance or your CDN.
                </p>
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] uppercase text-muted">{PUBLIC_MEDIA_FIELD.label}</span>
                  <input
                    type="url"
                    value={publicBase}
                    onChange={(e) => setPublicBase(e.target.value)}
                    placeholder={PUBLIC_MEDIA_FIELD.placeholder}
                    className="w-full border border-line bg-void px-2 py-1.5 font-mono text-xs text-stark"
                  />
                </label>
              </>
            ) : activeCard ? (
              <>
                <p className="font-sans text-sm text-stark">Connect {activeCard.name}</p>
                <p className="font-mono text-[10px] text-muted">
                  Paste API keys or tokens from the platform&apos;s developer console. We store them only on this
                  appliance.
                </p>
                {activeCard.bridgeTier !== "live" ? (
                  <p className="border border-amber-400/40 px-2 py-1 text-[10px] text-amber-400">
                    This platform is preview-only — you can save keys, but live publish may not be available yet.
                  </p>
                ) : null}
                {fields.map((f) => (
                  <label key={f.key} className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase text-muted">{f.label}</span>
                    <input
                      type={f.type}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full border border-line bg-void px-2 py-1.5 font-mono text-xs text-stark"
                      autoComplete="off"
                    />
                  </label>
                ))}
              </>
            ) : (
              <p className="text-muted">Pick a channel in Creator setup first.</p>
            )}

            {error ? <p className="text-xs text-amber-400">{error}</p> : null}
            {success ? <p className="text-xs text-cursor-glow">{success}</p> : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="border border-cursor-glow px-4 py-1.5 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save connection"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
