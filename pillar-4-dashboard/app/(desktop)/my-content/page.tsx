"use client";

import { DigitalReceiptPanel } from "@/components/digital/DigitalReceiptPanel";
import { useDigitalStream } from "@/hooks/useDigitalStream";
import { useVisionStream } from "@/hooks/useVisionStream";
import type { ReactNode } from "react";

const HEADLESS_CHANNELS = [
  { id: "HC-01", name: "Tech Briefs Daily", platform: "YouTube", status: "RENDERING", next: "06:00" },
  { id: "HC-02", name: "Market Pulse Shorts", platform: "TikTok", status: "QUEUED", next: "12:30" },
  { id: "HC-03", name: "CurXor Dev Log", platform: "X / Threads", status: "LIVE", next: "—" },
];

const POST_QUEUE = [
  { id: "POST-881", channel: "Tech Briefs Daily", type: "Long-form", stage: "SCRIPT", eta: "Local LLM" },
  { id: "POST-882", channel: "Market Pulse Shorts", type: "Reel", stage: "VOICE", eta: "TTS queue" },
  { id: "POST-883", channel: "CurXor Dev Log", type: "Thread", stage: "SCHEDULED", eta: "18:00" },
  { id: "POST-884", channel: "Tech Briefs Daily", type: "Thumbnail", stage: "VISION", eta: "moondream" },
];

const PLATFORMS = [
  { name: "YouTube", connected: true, posts: 12, vault: "LOCAL OAuth stub" },
  { name: "TikTok", connected: true, posts: 8, vault: "LOCAL OAuth stub" },
  { name: "X", connected: true, posts: 24, vault: "LOCAL OAuth stub" },
  { name: "Instagram", connected: false, posts: 0, vault: "Not configured" },
];

export default function MyContentPage() {
  const { frame, connected } = useVisionStream();
  const digital = useDigitalStream("content.publish_post");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Headless Channels" value="3" unit="active" highlight />
        <Metric label="Queue Depth" value="4" unit="posts" />
        <Metric label="Draft Scripts" value="2" unit="local LLM" />
        <Metric label="Vision Assist" value={connected ? "ON" : "OFF"} unit={`seq ${frame?.seq ?? "—"}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Section
          className="lg:col-span-3"
          title="Headless Channel Matrix"
          subtitle="Automated pipelines · render → review → publish · zero cloud egress by default"
        >
          <div className="space-y-2 font-mono text-xs">
            {HEADLESS_CHANNELS.map((ch) => (
              <div
                key={ch.id}
                className="grid grid-cols-5 gap-2 border border-line bg-panel px-3 py-2"
              >
                <span className="text-cursor-glow">{ch.id}</span>
                <span className="col-span-2 text-stark">{ch.name}</span>
                <span className="text-muted">{ch.platform}</span>
                <span className="text-right">
                  <StatusBadge status={ch.status} />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 font-mono text-[10px]">
            {["IDEATE", "SCRIPT", "RENDER", "PUBLISH"].map((stage, idx) => (
              <div key={stage} className="border border-line bg-void p-3">
                <div className="uppercase tracking-widest text-muted">{stage}</div>
                <div className="mt-2 h-1.5 overflow-hidden bg-panel">
                  <div className="h-full bg-cursor-glow" style={{ width: `${25 + idx * 20}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          className="lg:col-span-2"
          title="Platform Vault"
          subtitle="Credentials stored on appliance · outbound publish when you enable sync"
        >
          <div className="space-y-2 font-mono text-xs">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="border border-line bg-panel px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-stark">{p.name}</span>
                  <span className={p.connected ? "text-cursor-glow" : "text-muted"}>
                    {p.connected ? "LINKED" : "OFF"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  {p.posts} queued · {p.vault}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Content Queue" subtitle="Social posts & headless renders · local scheduler">
        <div className="overflow-x-auto border border-line">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-line bg-surface text-[10px] uppercase tracking-widest text-muted">
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Channel</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-right">Next</th>
              </tr>
            </thead>
            <tbody>
              {POST_QUEUE.map((row) => (
                <tr key={row.id} className="border-b border-line/50">
                  <td className="px-3 py-2 text-cursor-glow">{row.id}</td>
                  <td className="px-3 py-2 text-stark">{row.channel}</td>
                  <td className="px-3 py-2 text-stark">{row.type}</td>
                  <td className="px-3 py-2 text-muted">{row.stage}</td>
                  <td className="px-3 py-2 text-right text-stark">{row.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <DigitalReceiptPanel
        title="Publish Receipts"
        toolFilter="content.publish_post"
        receipts={digital.receipts}
        latest={digital.latest}
        connected={digital.connected}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const live = status === "LIVE" || status === "RENDERING";
  return (
    <span className={live ? "text-cursor-glow" : "text-muted"}>{status}</span>
  );
}

function Metric({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-line bg-panel px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-mono text-2xl ${highlight ? "text-cursor-glow" : "text-stark"}`}>{value}</div>
      <div className="font-mono text-[10px] text-muted">{unit}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-line bg-void ${className}`}>
      <header className="border-b border-line px-4 py-3">
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">{title}</h2>
        <p className="mt-1 font-mono text-[10px] text-muted">{subtitle}</p>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
