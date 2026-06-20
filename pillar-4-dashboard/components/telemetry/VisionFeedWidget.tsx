"use client";

import { useEffect, useState } from "react";

import { Panel } from "../shell/Panel";

interface VisionFrame {
  timestampNs: string;
  seq: number;
  width: number;
  height: number;
  encoding: number;
  flags: number;
  payloadBytes: number;
  previewBase64?: string;
}

const ENCODING_LABEL: Record<number, string> = {
  1: "JPEG",
  2: "RGB8",
  3: "DEPTH16",
};

export function VisionFeedWidget() {
  const [frame, setFrame] = useState<VisionFrame | null>(null);
  const [connected, setConnected] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frames = 0;
    const fpsTimer = setInterval(() => {
      setFps(frames);
      frames = 0;
    }, 1000);

    const source = new EventSource("/api/stream/vision");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      frames += 1;
      setFrame(JSON.parse(event.data) as VisionFrame);
    };

    return () => {
      clearInterval(fpsTimer);
      source.close();
    };
  }, []);

  const previewSrc =
    frame?.previewBase64 && frame.encoding === 1
      ? `data:image/jpeg;base64,${frame.previewBase64}`
      : null;

  return (
    <Panel
      title="VISION IN"
      subtitle="telemetry/vision_in · XPUB :9101"
      active={connected}
      className="col-span-12 lg:col-span-7"
    >
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="relative aspect-video overflow-hidden border border-line bg-void lg:col-span-3">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Claw vision frame" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-xs text-muted">
              AWAITING FRAME
            </div>
          )}
          <div className="absolute left-2 top-2 font-mono text-[10px] uppercase tracking-widest text-cursor-glow">
            {connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>

        <div className="font-mono text-xs lg:col-span-2">
          <MatrixRow label="FPS" value={String(fps)} accent />
          <MatrixRow label="SEQ" value={frame ? String(frame.seq) : "—"} />
          <MatrixRow label="RES" value={frame ? `${frame.width}×${frame.height}` : "—"} />
          <MatrixRow label="ENC" value={frame ? (ENCODING_LABEL[frame.encoding] ?? String(frame.encoding)) : "—"} />
          <MatrixRow label="PAYLOAD" value={frame ? `${frame.payloadBytes} B` : "—"} />
          <MatrixRow label="TS_NS" value={frame?.timestampNs ?? "—"} />
          <MatrixRow label="FLAGS" value={frame ? `0x${frame.flags.toString(16).padStart(4, "0")}` : "—"} />
        </div>
      </div>
    </Panel>
  );
}

function MatrixRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="grid grid-cols-[88px_1fr] border-b border-line/60 py-1.5">
      <span className="text-muted">{label}</span>
      <span className={accent ? "text-cursor-glow" : "text-stark"}>{value}</span>
    </div>
  );
}
