"use client";



import { FormEvent, useCallback, useEffect, useState } from "react";



import { useForgeAssistOptional } from "@/components/claw/ForgeAssistProvider";

import { useUiMode } from "@/components/ui/UiModeProvider";

import { getAppAgent } from "@/lib/app-agent-catalog";

import { skillActivityLine } from "@/lib/app-agent-types";

import type { ForgeAssistResult } from "@/lib/claw-assist";

import type { OotbAppId } from "@/lib/ootb-apps";



interface ChatLine {

  role: "user" | "assistant" | "system";

  text: string;

}



export interface ClawAgentConsoleProps {

  appId: OotbAppId;

  config: Record<string, unknown>;

  onSkill?: (skillId: string) => void;

}



export function ClawAgentConsole({ appId, config, onSkill }: ClawAgentConsoleProps) {

  const agent = getAppAgent(appId);

  const { isExpert } = useUiMode();

  const forge = useForgeAssistOptional();

  const isForge = appId === "claw-forge" && forge !== null;

  const [messages, setMessages] = useState<ChatLine[]>([

    { role: "assistant", text: agent.bootMessage },

  ]);

  const [activity, setActivity] = useState<string[]>([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);

  const [status, setStatus] = useState<"idle" | "acting" | "always-on">("always-on");



  const pushActivity = useCallback((line: string) => {

    setActivity((prev) => [line, ...prev].slice(0, 12));

  }, []);



  const runForgeAssist = useCallback(

    async (message: string, skillId?: string) => {

      if (!forge) return;

      setLoading(true);

      if (skillId) setStatus("acting");



      try {

        const history = messages

          .filter((m) => m.role === "user" || m.role === "assistant")

          .map((m) => ({

            role: m.role as "user" | "assistant",

            text: m.text,

            hasImage: m.text.includes("[photo attached]"),

          }));



        const effectiveMessage =

          skillId === "recommend_stack"

            ? forge.intent || message || "Recommend local LLM stack for my claw intent"

            : skillId === "forge_claw"

              ? forge.intent || message || "Forge a new claw from my intent"

              : message;



        const res = await fetch("/api/claw/assist", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            message: effectiveMessage,

            imageBase64: forge.getImageBase64(),

            liveVision: forge.liveVision,

            history,

          }),

        });

        if (!res.ok) throw new Error("forge assist failed");

        const data = (await res.json()) as ForgeAssistResult;



        if (message && !skillId) {

          const userLine = forge.getImageBase64() ? `${message} [photo attached]` : message;

          setMessages((prev) => [...prev, { role: "user", text: userLine }]);

        }

        setMessages((prev) => [...prev, { role: "assistant", text: data.reply.replace(/\*\*/g, "") }]);



        if (data.suggestedIntent && data.suggestedIntent.length > forge.intent.length) {

          forge.setIntent(data.suggestedIntent);

        }



        if (skillId) {

          pushActivity(skillActivityLine(appId, skillId));

          onSkill?.(skillId);

        } else if (data.rationale) {

          pushActivity(data.rationale.slice(0, 120));

        }



        if (data.readyToForge || skillId === "forge_claw" || skillId === "recommend_stack") {

          forge.openWizard({

            intent: data.suggestedIntent || forge.intent,

            budgetTier: data.budgetTier,

            imageHint: data.imageHint,

          });

        }

      } catch {

        setMessages((prev) => [...prev, { role: "system", text: "Forge assist offline — use + Forge Claw manually." }]);

      } finally {

        setLoading(false);

        setStatus("always-on");

      }

    },

    [appId, forge, messages, onSkill, pushActivity],

  );



  const runAppAssist = useCallback(

    async (message: string, skillId?: string) => {

      setLoading(true);

      if (skillId) setStatus("acting");

      try {

        const res = await fetch("/api/channels/webchat", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ appId, message, config, skillId }),

        });

        if (!res.ok) throw new Error("assist failed");

        const data = (await res.json()) as {

          reply: string;

          activity?: string;

          mesh?: { kind: string; ok: boolean; seq?: number; id?: string; tool?: string };

        };



        if (message && !skillId) {

          setMessages((prev) => [...prev, { role: "user", text: message }]);

        }

        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);

        if (skillId) {

          pushActivity(skillActivityLine(appId, skillId));

          if (data.mesh?.ok && data.mesh.kind === "physical" && data.mesh.seq !== undefined) {

            pushActivity(`motor_out seq ${data.mesh.seq}`);

          }

          if (data.mesh?.ok && data.mesh.kind === "digital" && data.mesh.id) {

            pushActivity(`digital_out ${data.mesh.tool ?? "intent"} · ${data.mesh.id.slice(0, 8)}`);

          }

          onSkill?.(skillId);

        } else if (data.activity) {

          pushActivity(data.activity);

        }

      } catch {

        setMessages((prev) => [...prev, { role: "system", text: "Agent assist offline — skills still work locally." }]);

      } finally {

        setLoading(false);

        setStatus("always-on");

      }

    },

    [appId, config, messages, onSkill, pushActivity],

  );



  const runAssist = isForge ? runForgeAssist : runAppAssist;



  useEffect(() => {

    pushActivity(

      `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${agent.agentName} ready`,

    );

    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot line once

  }, []);



  function onSubmit(e: FormEvent) {

    e.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    setInput("");

    void runAssist(text);

  }



  function onSkillClick(skillId: string) {

    if (isForge && skillId === "attach_vision") {

      forge?.setLiveVision(true);

      pushActivity("Live vision attached for next assist turn");

      onSkill?.(skillId);

      return;

    }

    if (isForge && skillId === "list_fleet") {

      pushActivity("Fleet registry refreshed — see workspace panel");

      onSkill?.(skillId);

      return;

    }

    void runAssist("", skillId);

  }



  return (

    <aside className="flex h-full min-h-[420px] flex-col border border-line bg-void lg:min-h-0">

      <header className="border-b border-line px-4 py-3">

        <div className="flex items-start justify-between gap-2">

          <div>

            <p className="font-sans text-sm font-medium text-stark">{agent.agentName}</p>

            <p className="font-sans text-xs text-muted">{agent.tagline}</p>

          </div>

          {isExpert ? (
          <span

            className={`font-mono text-[9px] uppercase tracking-widest ${

              status === "acting" ? "animate-pulse-cursor text-cursor-glow" : "text-cursor-glow"

            }`}

          >

            {status === "acting" ? "acting" : "always-on"}

          </span>
          ) : null}

        </div>

        {isForge ? (

          <p className="mt-2 font-mono text-[9px] text-muted">

            Multimodal · {forge.liveVision ? "live vision" : forge.imagePreview ? "photo attached" : "text only"}

          </p>

        ) : null}

        <button

          type="button"

          onClick={() => setHelpOpen((v) => !v)}

          className="mt-2 font-sans text-xs text-cursor-glow hover:underline"

        >

          {helpOpen ? "Hide tips" : "How do I use this?"}

        </button>

        {helpOpen ? (

          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-sans text-xs text-muted">

            {agent.howToUse.map((h) => (

              <li key={h}>· {h}</li>

            ))}

          </ul>

        ) : null}

      </header>



      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 font-mono text-[11px] leading-relaxed">

        {messages.map((msg, idx) => (

          <div

            key={idx}

            className="border-l-2 pl-2"

            style={{

              borderColor: msg.role === "assistant" ? "#bc13fe" : msg.role === "user" ? "#888" : "#444",

            }}

          >

            <span className="text-[9px] font-sans text-muted">{roleLabel(msg.role)}</span>

            <p className={msg.role === "assistant" ? "text-cursor-glow" : "text-stark"}>{msg.text}</p>

          </div>

        ))}

        {loading ? (

          <p className="animate-pulse text-[10px] uppercase tracking-widest text-muted">Agent thinking…</p>

        ) : null}

      </div>



      <div className="border-t border-line px-3 py-2">

        <div className="mb-2 font-sans text-xs font-medium text-stark">Quick actions</div>

        <div className="flex flex-wrap gap-1">

          {agent.skills.map((skill) => (

            <button

              key={skill.id}

              type="button"

              title={skill.description}

              onClick={() => onSkillClick(skill.id)}

              disabled={loading}

              className="border border-line px-2 py-1.5 font-sans text-xs text-stark hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"

            >

              {skill.label}

            </button>

          ))}

        </div>

      </div>



      {isExpert ? (
      <div className="max-h-24 overflow-y-auto border-t border-line px-3 py-2">

        <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Activity</div>

        {activity.map((line, idx) => (

          <div key={idx} className="font-mono text-[9px] text-muted">

            {line}

          </div>

        ))}

      </div>
      ) : null}



      <form onSubmit={onSubmit} className="border-t border-line p-3">

        <div className="flex gap-2">

          <input

            value={input}

            onChange={(e) => setInput(e.target.value)}

            placeholder={isForge ? "Describe the Claw you want…" : `Ask ${agent.agentName}…`}

            className="min-w-0 flex-1 border border-line bg-panel px-2 py-2 font-sans text-sm text-stark outline-none focus:border-cursor-glow"

          />

          <button

            type="submit"

            disabled={loading}

            className="border border-cursor-glow px-3 py-2 font-sans text-sm text-cursor-glow disabled:opacity-40"

          >

            Send

          </button>

        </div>

      </form>

    </aside>

  );

}

function roleLabel(role: ChatLine["role"]): string {
  if (role === "user") return "You";
  if (role === "assistant") return "Agent";
  return "System";
}
