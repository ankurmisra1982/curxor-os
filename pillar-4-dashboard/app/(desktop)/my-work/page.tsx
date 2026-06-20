"use client";

import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";
import type { ReactNode } from "react";

const MOCK_SYNC = [
  { time: "09:02", source: "LOCAL CAL", event: "Standup block · 30m", status: "SYNCED" },
  { time: "09:14", source: "MAIL QUEUE", event: "3 messages indexed offline", status: "SYNCED" },
  { time: "09:31", source: "TASK MATRIX", event: "Claw demo prep flagged P1", status: "PENDING" },
  { time: "09:45", source: "LOCAL CAL", event: "Inventory review · My Shop", status: "SYNCED" },
];

export default function MyWorkPage() {
  const { frame, connected } = useVisionStream();
  useMotorStream();

  return (
    <div className="space-y-4">
      <Section title="Productivity Matrix" subtitle="Mock calendar & email sync logs · local appliance only">
        <div className="overflow-x-auto border border-line">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-line bg-surface text-[10px] uppercase tracking-widest text-muted">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SYNC.map((row) => (
                <tr key={row.time + row.source} className="border-b border-line/50">
                  <td className="px-3 py-2 text-muted">{row.time}</td>
                  <td className="px-3 py-2 text-stark">{row.source}</td>
                  <td className="px-3 py-2 text-stark">{row.event}</td>
                  <td className="px-3 py-2 text-right text-cursor-glow">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Focus Feed" subtitle={`Vision mesh ${connected ? "linked" : "offline"} · seq ${frame?.seq ?? "—"}`}>
        <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
          {["INBOX", "CALENDAR", "TASKS"].map((col) => (
            <div key={col} className="border border-line bg-void p-3">
              <div className="mb-2 uppercase tracking-widest text-muted">{col}</div>
              <div className="text-cursor-glow">LOCAL · 0 CLOUD CALLS</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-line bg-void">
      <header className="border-b border-line px-4 py-3">
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">{title}</h2>
        <p className="mt-1 font-mono text-[10px] text-muted">{subtitle}</p>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
