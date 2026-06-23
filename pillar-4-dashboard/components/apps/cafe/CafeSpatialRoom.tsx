"use client";

import type { CafeCharacter } from "@/lib/claw-cafe-spatial";
import { CAFE_STATION_GRID } from "@/lib/claw-cafe-spatial";

interface CafeSpatialRoomProps {
  characters: CafeCharacter[];
  lastPulseAt?: string | null;
}

const STATE_CLASS: Record<CafeCharacter["state"], string> = {
  idle: "opacity-80",
  walk: "animate-pulse",
  act: "ring-1 ring-cursor-glow",
  celebrate: "ring-2 ring-cursor-glow scale-105",
};

export function CafeSpatialRoom({ characters, lastPulseAt }: CafeSpatialRoomProps) {
  const stations = Object.entries(CAFE_STATION_GRID) as Array<
    [keyof typeof CAFE_STATION_GRID, (typeof CAFE_STATION_GRID)[keyof typeof CAFE_STATION_GRID]]
  >;

  const charsByStation = new Map(characters.map((c) => [c.station, c]));

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <p className="text-muted uppercase tracking-widest">
        Spatial room · {characters.length} patron{characters.length === 1 ? "" : "s"}
        {lastPulseAt ? ` · pulse ${new Date(lastPulseAt).toLocaleTimeString()}` : ""}
      </p>
      <div
        className="grid gap-1 border border-line bg-void p-2"
        style={{
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gridTemplateRows: "repeat(4, minmax(3.5rem, auto))",
        }}
      >
        {stations.map(([id, station]) => {
          const char = charsByStation.get(id);
          return (
            <div
              key={id}
              className="relative border border-line/50 bg-panel p-1"
              style={{ gridRow: station.row + 1, gridColumn: station.col + 1 }}
            >
              <p className="truncate text-[8px] uppercase tracking-widest text-muted">{station.label}</p>
              {char ? (
                <div className={`mt-1 rounded px-1 py-0.5 transition ${STATE_CLASS[char.state]}`}>
                  <p className="truncate text-stark">{char.label}</p>
                  {char.bubble ? (
                    <p className="truncate text-[8px] text-cursor-glow">&ldquo;{char.bubble}&rdquo;</p>
                  ) : (
                    <p className="text-[8px] uppercase text-muted">{char.state}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[8px] text-muted/50">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
