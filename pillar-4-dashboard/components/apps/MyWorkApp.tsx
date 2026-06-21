"use client";

import { useEffect, useState } from "react";

import { AppMetric, AppSection } from "@/components/app-shared/AppLayout";
import { ExperienceAppSection } from "@/components/experience/ExperienceAppSection";
import { ExperienceLevelBadge } from "@/components/experience/ExperienceLevelBadge";
import { UnifiedInboxPanel } from "@/components/comms/UnifiedInboxPanel";
import type { AgentAppContext } from "@/components/claw/ClawAgentApp";
import { getOotbApp } from "@/lib/ootb-apps";
import { useMotorStream } from "@/hooks/useMotorStream";
import { useVisionStream } from "@/hooks/useVisionStream";

const INITIAL_TASKS = [
  { id: "T-1", title: "Outreach demo prep", priority: "P1", done: false },
  { id: "T-2", title: "Review Arbitrage Claw margin alerts", priority: "P2", done: false },
  { id: "T-3", title: "Standup notes", priority: "P3", done: true },
];

const SYNC_LOG = [
  { time: "09:02", source: "LOCAL CAL", event: "Standup block · 30m", status: "SYNCED" },
  { time: "09:14", source: "MAIL QUEUE", event: "3 messages indexed offline", status: "SYNCED" },
  { time: "09:31", source: "TASK MATRIX", event: "Outreach demo prep flagged P1", status: "PENDING" },
];

export function MyWorkApp({ config, skillTick, lastSkillId, updateWorkspaceContext }: AgentAppContext) {
  const { frame, connected } = useVisionStream();
  const { command, connected: motorUp } = useMotorStream();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState("T-1");
  const [sortQueue, setSortQueue] = useState<string[]>([]);
  const workspace = typeof config.workspaceName === "string" ? config.workspaceName : "Outreach Desk";
  const lane = typeof config.clawLane === "string" ? config.clawLane : "A";

  useEffect(() => {
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;
    updateWorkspaceContext({
      selectedTaskId: task.id,
      selectedTaskTitle: task.title,
      selectedTaskPriority: task.priority,
    });
  }, [selectedTaskId, tasks, updateWorkspaceContext]);

  useEffect(() => {
    if (skillTick === 0 || !lastSkillId) return;
    if (lastSkillId !== "sort_tray" && lastSkillId !== "move_to_tray") return;
    setSortQueue((q) => [`Tray sort · lane ${lane} · ${new Date().toLocaleTimeString()}`, ...q].slice(0, 5));
  }, [skillTick, lastSkillId, lane]);

  return (
    <div className="space-y-4 p-4">
      <header className="border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">
          OOTB · {getOotbApp("my-work").name}
        </p>
        <h1 className="font-display text-sm uppercase tracking-[0.16em] text-stark">{workspace}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Outreach Claw · leads & sequences · mesh {motorUp ? "linked" : "idle"}
          <ExperienceLevelBadge />
        </p>
      </header>

      <ExperienceAppSection
        appId="my-work"
        sectionId="comms"
        minLevel="standard"
        title="Comms desk — all channels"
        subtitle="Unified inbox across messaging bridges"
        showCoach={false}
      >
        <UnifiedInboxPanel embedded />
      </ExperienceAppSection>

      <div className="grid gap-4 md:grid-cols-3">
        <AppMetric label="Open Tasks" value={String(tasks.filter((t) => !t.done).length)} unit="local queue" highlight />
        <AppMetric label="Outreach Lane" value={lane === "none" ? "—" : lane} unit="sequence slot" />
        <AppMetric label="Vision Seq" value={frame?.seq ? String(frame.seq) : "—"} unit="mesh" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExperienceAppSection
          appId="my-work"
          sectionId="tasks"
          minLevel="beginner"
          title="Task Matrix"
          subtitle="Tap to complete · Outreach Claw prioritizes P1 first"
        >
          <div className="space-y-2 font-mono text-xs">
            {tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTaskId(t.id);
                  setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
                }}
                className={`grid w-full grid-cols-[auto_1fr_auto] gap-2 border px-3 py-2 text-left ${
                  selectedTaskId === t.id ? "border-cursor-glow bg-surface" : "border-line bg-panel"
                } ${t.done ? "text-muted line-through" : "text-stark"}`}
              >
                <span className={t.priority === "P1" ? "text-cursor-glow" : "text-muted"}>{t.priority}</span>
                <span>{t.title}</span>
                <span className="text-[10px] text-muted">{t.done ? "DONE" : "OPEN"}</span>
              </button>
            ))}
          </div>
        </ExperienceAppSection>

        <ExperienceAppSection
          appId="my-work"
          sectionId="outbound"
          minLevel="standard"
          title="Outbound Queue"
          subtitle={`Lane ${lane} · sequence staging`}
        >
          {sortQueue.length === 0 ? (
            <p className="font-mono text-[11px] text-muted">
              No sequences queued. Ask Outreach Claw to &quot;draft a cold sequence&quot; or tap Sort Tray in the agent panel.
            </p>
          ) : (
            <ul className="space-y-1 font-mono text-[11px] text-stark">
              {sortQueue.map((line) => (
                <li key={line} className="border-l-2 border-cursor-glow pl-2">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </ExperienceAppSection>
      </div>

      <ExperienceAppSection
        appId="my-work"
        sectionId="sync-log"
        minLevel="expert"
        title="Local Sync Log"
        subtitle="Calendar & mail · zero cloud calls"
      >
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
              <th className="py-2 text-left">Time</th>
              <th className="py-2 text-left">Source</th>
              <th className="py-2 text-left">Event</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {SYNC_LOG.map((row) => (
              <tr key={row.time + row.source} className="border-b border-line/40">
                <td className="py-2 text-muted">{row.time}</td>
                <td className="py-2">{row.source}</td>
                <td className="py-2">{row.event}</td>
                <td className="py-2 text-right text-cursor-glow">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ExperienceAppSection>
    </div>
  );
}
