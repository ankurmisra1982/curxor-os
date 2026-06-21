"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { ProviderLinkMode } from "@/lib/provider-link-types";

interface ProviderLinkWorkspaceProps {
  sessionId: string;
  linkMode: ProviderLinkMode;
  authorizeUrl: string | null;
  provider: {
    id: string;
    name: string;
    connectUrl: string;
    docsUrl: string;
    purchaseUrl: string;
  };
  status: "pending" | "completed" | "expired";
}

export function ProviderLinkWorkspace({
  sessionId,
  linkMode,
  authorizeUrl,
  provider,
  status,
}: ProviderLinkWorkspaceProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callbackPaste, setCallbackPaste] = useState("");

  const completeGuided = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/llm/link-session/${sessionId}/complete`, {
        method: "POST",
        cache: "no-store",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Link failed");
      router.push("/settings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
      setSaving(false);
    }
  }, [router, sessionId]);

  const completeOAuth = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/llm/oauth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, callbackUrl: callbackPaste }),
        cache: "no-store",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "OAuth link failed");
      router.push("/settings?oauth=success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth link failed");
      setSaving(false);
    }
  }, [router, sessionId, callbackPaste]);

  const isOAuth = linkMode === "oauth";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border border-line bg-panel p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cursor-glow">
          {isOAuth ? "OAuth sign-in" : "Subscription link"}
        </p>
        <h1 className="mt-2 font-sans text-2xl font-semibold text-stark">
          Link {provider.name} to this appliance
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">
          {isOAuth
            ? "Sign in with your provider account. CurXor stores tokens on this appliance only — no cloud middleman."
            : "Authenticate with the provider in their portal, then confirm the link on your appliance."}
        </p>
      </header>

      {error ? (
        <p className="border border-red-900/60 bg-red-950/30 px-4 py-3 font-sans text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {status === "expired" ? (
        <p className="border border-amber-900/60 bg-amber-950/30 px-4 py-3 font-sans text-sm text-amber-200">
          This link session expired. Start again from Settings → Intelligence.
        </p>
      ) : null}

      <section className="border border-line bg-panel p-6">
        {isOAuth ? (
          <ol className="space-y-4 font-sans text-sm text-muted">
            <li>1. Open the {provider.name} sign-in page.</li>
            <li>2. Complete login — your browser may redirect to localhost (that is expected).</li>
            <li>3. Copy the full URL from the address bar and paste it below.</li>
          </ol>
        ) : (
          <ol className="space-y-4 font-sans text-sm text-muted">
            <li>1. Open the {provider.name} account portal in a new tab.</li>
            <li>2. Sign in or purchase the plan you want to use.</li>
            <li>3. Return here and confirm the link on this appliance.</li>
          </ol>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {isOAuth && authorizeUrl ? (
            <a
              href={authorizeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow"
            >
              Sign in with {provider.name}
            </a>
          ) : (
            <a
              href={provider.connectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-cursor-glow px-4 py-2 font-sans text-sm text-stark hover:text-cursor-glow"
            >
              Open {provider.name}
            </a>
          )}
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-4 py-2 font-sans text-sm text-muted hover:text-stark"
          >
            Docs
          </a>
          <a
            href={provider.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-sm text-muted hover:text-cursor-glow"
          >
            Pricing / sign up
          </a>
        </div>
      </section>

      <section className="border border-line bg-panel p-6">
        <p className="font-sans text-sm text-muted">
          Status:{" "}
          <span className="text-stark">
            {status === "completed"
              ? "already linked"
              : status === "expired"
                ? "expired"
                : "waiting for confirmation"}
          </span>
        </p>

        {isOAuth && status === "pending" ? (
          <div className="mt-4">
            <label className="font-sans text-xs text-muted">
              Callback URL (paste after sign-in)
            </label>
            <input
              value={callbackPaste}
              onChange={(e) => setCallbackPaste(e.target.value)}
              placeholder="http://localhost:1455/auth/callback?code=…&state=…"
              className="mt-1 w-full border border-line bg-void px-3 py-2 font-mono text-xs text-stark"
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {isOAuth ? (
            <button
              type="button"
              disabled={saving || status !== "pending" || !callbackPaste.trim()}
              onClick={() => void completeOAuth()}
              className="border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-stark shadow-cursor disabled:opacity-50"
            >
              {saving ? "Linking…" : "Complete OAuth link"}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || status !== "pending"}
              onClick={() => void completeGuided()}
              className="border border-cursor-glow bg-surface px-4 py-2 font-sans text-sm text-stark shadow-cursor disabled:opacity-50"
            >
              {status === "completed" ? "Already linked" : saving ? "Linking…" : "I finished logging in"}
            </button>
          )}
          <Link href="/settings" className="font-sans text-sm text-muted hover:text-stark">
            Back to Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
