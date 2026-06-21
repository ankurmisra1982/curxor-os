"use client";

import { useRef, useState } from "react";

interface ContentMediaAttachPanelProps {
  postId: string;
  hasImage: boolean;
  hasVideo: boolean;
  imagePath?: string | null;
  videoPath?: string | null;
  onAttached: () => void;
  onError: (message: string) => void;
}

export function ContentMediaAttachPanel({
  postId,
  hasImage,
  hasVideo,
  imagePath,
  videoPath,
  onAttached,
  onError,
}: ContentMediaAttachPanelProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"image" | "video" | null>(null);

  const upload = async (file: File, kind: "image" | "video") => {
    setBusy(kind);
    try {
      const form = new FormData();
      form.set("postId", postId);
      form.set("kind", kind);
      form.set("file", file);
      const res = await fetch("/api/content/upload", { method: "POST", body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        onError(data.error ?? "Upload failed");
        return;
      }
      onAttached();
    } catch {
      onError("Upload failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border border-line bg-panel p-3 md:col-span-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Attach media from disk</p>
      <p className="mt-1 font-mono text-[10px] text-muted">
        JPG/PNG/WebP or MP4/MOV — saved locally under content-assets · public URL when CURXOR_CONTENT_PUBLIC_BASE is set
      </p>
      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px]">
        <input
          ref={imageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f, "image");
            e.target.value = "";
          }}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f, "video");
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => imageRef.current?.click()}
          className="border border-line px-3 py-1 uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
        >
          {busy === "image" ? "Uploading…" : hasImage ? "Replace image" : "Attach image"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => videoRef.current?.click()}
          className="border border-line px-3 py-1 uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
        >
          {busy === "video" ? "Uploading…" : hasVideo ? "Replace video" : "Attach video"}
        </button>
      </div>
      {(imagePath || videoPath) && (
        <p className="mt-2 truncate font-mono text-[9px] text-muted">
          {imagePath ? `Image: ${imagePath}` : null}
          {imagePath && videoPath ? " · " : null}
          {videoPath ? `Video: ${videoPath}` : null}
        </p>
      )}
    </div>
  );
}
