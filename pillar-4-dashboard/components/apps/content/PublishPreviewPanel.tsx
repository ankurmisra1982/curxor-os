"use client";

import type { PublishPreview } from "@/lib/content-publish-preview";

interface PublishPreviewPanelProps {
  preview: PublishPreview | null;
  loading?: boolean;
}

export function PublishPreviewPanel({ preview, loading }: PublishPreviewPanelProps) {
  if (loading) {
    return <p className="font-mono text-[10px] text-muted">Building preview…</p>;
  }
  if (!preview) {
    return <p className="font-mono text-[10px] text-muted">Select a post to preview publish payload.</p>;
  }

  const v = preview.validation;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="border border-line bg-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {preview.platformName} · {preview.format}
        </p>
        <div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-stark">
          {preview.text || "(empty draft)"}
        </div>
        <p className={`mt-2 font-mono text-[10px] ${preview.withinLimit ? "text-muted" : "text-cursor-glow"}`}>
          {preview.charCount}
          {preview.charLimit !== null ? ` / ${preview.charLimit} chars` : " chars"}
        </p>
        {preview.tool && (
          <p className="mt-1 font-mono text-[9px] text-cursor-glow">Bridge: {preview.tool}</p>
        )}
      </div>

      <div className="border border-line bg-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Media & validation</p>
        <ul className="mt-2 space-y-1 font-mono text-[10px]">
          <li className={preview.hasImage ? "text-cursor-glow" : "text-muted"}>
            Image: {preview.hasImage ? "ready" : "missing"}
          </li>
          <li className={preview.hasVideo ? "text-cursor-glow" : "text-muted"}>
            Video: {preview.hasVideo ? "ready" : preview.format.includes("short") || preview.format === "reel" ? "required" : "optional"}
          </li>
        </ul>
        {v && v.errors.length > 0 && (
          <ul className="mt-2 space-y-1 font-mono text-[10px] text-cursor-glow">
            {v.errors.map((e) => (
              <li key={e}>✗ {e}</li>
            ))}
          </ul>
        )}
        {v && v.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 font-mono text-[10px] text-muted">
            {v.warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
        {v?.ok && (
          <p className="mt-2 font-mono text-[10px] text-cursor-glow">✓ Media validation passed</p>
        )}
        {preview.hints.length > 0 && (
          <div className="mt-3 border-t border-line/50 pt-2 font-mono text-[9px] text-muted">
            {preview.hints.map((h) => (
              <p key={h}>{h}</p>
            ))}
          </div>
        )}
        {preview.layoutPreview?.length > 0 && (
          <div className="mt-3 border-t border-line/50 pt-2 font-mono text-[9px] text-cursor-glow">
            {preview.layoutPreview.map((h) => (
              <p key={h}>{h}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
