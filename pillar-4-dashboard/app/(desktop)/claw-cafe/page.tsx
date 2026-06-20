"use client";

import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const BOTS = [
  { id: "CLAW-01", lane: "A" },
  { id: "CLAW-02", lane: "B" },
  { id: "CLAW-03", lane: "C" },
  { id: "CLAW-04", lane: "D" },
];

export default function ClawCafePage() {
  const { frame, connected } = useVisionStream();
  useMotorStream();

  const preview =
    frame?.previewBase64 && frame.encoding === 1
      ? `data:image/jpeg;base64,${frame.previewBase64}`
      : null;

  return (
    <div className="space-y-4">
      <header className="border border-line bg-void px-4 py-3">
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">Multi-Bot Camera Grid</h2>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Live vision_in feed · {connected ? "MESH LIVE" : "OFFLINE"} · seq {frame?.seq ?? "—"}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {BOTS.map((bot, idx) => (
          <div key={bot.id} className="border border-line bg-panel">
            <div className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-widest">
              <span className="text-stark">{bot.id}</span>
              <span className="text-cursor-glow">LANE {bot.lane}</span>
            </div>
            <div className="relative aspect-video bg-void">
              {idx === 0 && preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={`${bot.id} feed`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted">
                  {idx === 0 ? "AWAITING FRAME" : "MOCK FEED · LOCAL"}
                </div>
              )}
              <div className="absolute left-2 top-2 font-mono text-[10px] text-cursor-glow">
                {idx === 0 && frame ? `${frame.width}×${frame.height}` : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
