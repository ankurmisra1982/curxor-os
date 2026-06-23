"use client";

import { ComingSoonBadge } from "@/components/app-shared/ComingSoonBadge";
import { isPreviewApp, previewWorkspaceBanner, type ClawPreviewAppId } from "@/lib/claw-preview-apps";

interface PreviewModuleBannerProps {
  appId: string;
  compact?: boolean;
}

export function PreviewModuleBanner({ appId, compact }: PreviewModuleBannerProps) {
  if (!isPreviewApp(appId)) return null;

  if (compact) {
    return <ComingSoonBadge className="ml-2" />;
  }

  const copy = previewWorkspaceBanner(appId as ClawPreviewAppId);
  return (
    <div className="border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300">
        {copy.title} · Coming Soon
      </p>
      <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">{copy.body}</p>
    </div>
  );
}
