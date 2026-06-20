"use client";

import { useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import { DigitalReceiptPanel } from "@/components/digital/DigitalReceiptPanel";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import { useDigitalStream } from "@/hooks/useDigitalStream";
import { useVisionStream } from "@/hooks/useVisionStream";

interface Post {
  id: string;
  channel: string;
  type: string;
  stage: string;
  eta: string;
}

const INITIAL: Post[] = [
  { id: "POST-881", channel: "Tech Briefs Daily", type: "Long-form", stage: "SCRIPT", eta: "Local LLM" },
  { id: "POST-882", channel: "Market Pulse Shorts", type: "Reel", stage: "VOICE", eta: "TTS queue" },
  { id: "POST-883", channel: "CurXor Dev Log", type: "Thread", stage: "SCHEDULED", eta: "18:00" },
];

export function MyContentApp({ config, skillTick, lastSkillId }: AgentAppContext) {
  const { frame, connected } = useVisionStream();
  const digital = useDigitalStream("content.publish_post");
  const [posts, setPosts] = useState(INITIAL);
  const [selected, setSelected] = useState("POST-881");
  const tone = typeof config.contentTone === "string" ? config.contentTone : "technical";

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (lastSkillId !== "draft_post" && lastSkillId !== "publish_post" && lastSkillId !== "schedule_post") return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== selected) return p;
        const stages = ["IDEATE", "SCRIPT", "RENDER", "PUBLISH"];
        const idx = stages.indexOf(p.stage);
        const next = stages[Math.min(idx + 1, stages.length - 1)] ?? "PUBLISH";
        return { ...p, stage: next, eta: next === "PUBLISH" ? "Bridge" : "Local LLM" };
      }),
    );
  }, [skillTick, lastSkillId, selected]);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-content-creator").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">Creator Claw Studio</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">Tone {tone} · vision {connected ? "ON" : "OFF"} · LLM never hits internet</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <AppMetric label="Queue" value={String(posts.length)} unit="posts" highlight />
        <AppMetric label="Selected" value={selected} unit="tap row" />
        <AppMetric label="Vision Seq" value={frame?.seq ? String(frame.seq) : "—"} unit="thumbnails" />
        <AppMetric label="Bridge" value={digital.connected ? "LIVE" : "OFF"} unit="digital_in" />
      </div>

      <AppSection title="Content Queue" subtitle="Draft Post advances stage · Publish sends to digital_out bridge">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
              <th className="py-2 text-left">ID</th>
              <th className="py-2 text-left">Channel</th>
              <th className="py-2 text-left">Stage</th>
              <th className="py-2 text-right">Next</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelected(row.id)}
                className={`cursor-pointer border-b border-line/50 ${selected === row.id ? "bg-surface" : ""}`}
              >
                <td className="py-2 text-cursor-glow">{row.id}</td>
                <td className="py-2">{row.channel}</td>
                <td className="py-2 text-muted">{row.stage}</td>
                <td className="py-2 text-right">{row.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AppSection>

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
