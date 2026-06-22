import "server-only";

import { getResolvedAgent } from "./agent-runtime/skills-loader";
import { publishDigitalIntent, publishMotorCommand, type DigitalPublishResult, type MotorPublishResult } from "./mesh-publish";
import type { OotbAppId } from "./ootb-apps";

export interface SkillMeshResult {
  executed: boolean;
  kind: "physical" | "digital" | "plan" | "none";
  motor?: MotorPublishResult;
  digital?: DigitalPublishResult;
  skipReason?: string;
}

function cfgStr(config: Record<string, unknown>, key: string, fallback: string): string {
  const v = config[key];
  return typeof v === "string" ? v : fallback;
}

function cfgNum(config: Record<string, unknown>, key: string, fallback: number): number {
  const v = config[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function laneCoords(lane: string): { x: number; y: number; z: number } {
  switch (lane.toUpperCase()) {
    case "B":
      return { x: 0.32, y: 0.0, z: 0.18 };
    case "C":
      return { x: 0.48, y: 0.0, z: 0.18 };
    default:
      return { x: 0.16, y: 0.0, z: 0.18 };
  }
}

export async function executeSkillMesh(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
): Promise<SkillMeshResult> {
  const agent = await getResolvedAgent(appId);
  const skill = agent.skills.find((s) => s.id === skillId);
  if (!skill) return { executed: false, kind: "none", skipReason: "unknown skill" };

  if (appId === "tesla-optimus-engine" && skillId === "sync_context") {
    return { executed: false, kind: "plan", skipReason: "context sync via workspace or /api/mesh/context" };
  }

  if (appId === "my-capital") {
    const capital = await executeMyCapitalSkill(skillId, config);
    if (capital) return capital;
  }

  if (appId === "my-work") {
    const work = await executeMyWorkSkill(skillId, config);
    if (work) return work;
  }

  if (skill.kind === "plan") {
    return { executed: false, kind: "plan", skipReason: "local-only skill" };
  }

  if (appId === "claw-forge" && skillId === "attach_vision") {
    return { executed: false, kind: "plan", skipReason: "vision attach is UI-only" };
  }

  const clawId = cfgNum(config, "clawId", 1);

  if (skill.kind === "digital") {
    if (appId === "my-content-creator" && skillId === "batch_publish") {
      return executeBatchPublish(config);
    }
    if (appId === "my-content-creator" && skillId === "publish_post") {
      const postId = cfgStr(config, "selectedPostId", "");
      const digital = await buildDigitalIntent(appId, skillId, config);
      if (!digital) {
        return { executed: false, kind: "digital", skipReason: await publishPostSkipReason(config) };
      }
      const { requestPostPublish } = await import("./content-approval-service");
      const out = await requestPostPublish(postId, config, "agent");
      if (out.mode === "pending") {
        return { executed: true, kind: "plan", skipReason: "awaiting operator approval" };
      }
      return { executed: out.result.ok, kind: "digital", digital: out.result };
    }
    if (appId === "my-content-creator" && skillId === "publish_reply") {
      const replyId = cfgStr(config, "selectedReplyId", "");
      const digital = await buildDigitalIntent(appId, skillId, config);
      if (!digital) {
        return { executed: false, kind: "digital", skipReason: "no reply mapping" };
      }
      const { requestReplyPublish } = await import("./content-approval-service");
      const out = await requestReplyPublish(replyId, "agent");
      if (out.mode === "pending") {
        return { executed: true, kind: "plan", skipReason: "awaiting operator approval" };
      }
      return { executed: out.result.ok, kind: "digital", digital: out.result };
    }
    const digital = await buildDigitalIntent(appId, skillId, config);
    if (!digital) {
      return { executed: false, kind: "digital", skipReason: "no digital mapping" };
    }
    const result = await publishDigitalIntent(digital);
    return { executed: result.ok, kind: "digital", digital: result };
  }

  const motor = await buildMotorIntent(appId, skillId, config, clawId);
  if (!motor) {
    return { executed: false, kind: "physical", skipReason: "no motor mapping" };
  }
  const result = await publishMotorCommand(motor);
  return { executed: result.ok, kind: "physical", motor: result };
}

async function executeMyWorkSkill(
  skillId: string,
  config: Record<string, unknown>,
): Promise<SkillMeshResult | null> {
  if (skillId === "process_due") {
    const { runDashboardProcessDue } = await import("./work-outbound-tick");
    const result = await runDashboardProcessDue();
    return {
      executed: true,
      kind: "plan",
      skipReason: result.skipped
        ? "Outbound worker active — dashboard process_due skipped"
        : `Due steps processed · ${result.processed} · finalized ${result.finalizedSends}`,
    };
  }
  if (skillId === "scan_inbox") {
    const { scanLocalMailQueue } = await import("./work-store");
    const { pauseSequencesOnReply } = await import("./work-send-executor");
    const entries = await scanLocalMailQueue();
    for (const entry of entries.filter((e) => e.matchedReply && e.from)) {
      await pauseSequencesOnReply(entry.from, entry.replyIntent);
    }
    return {
      executed: true,
      kind: "plan",
      skipReason: `Inbox indexed · ${entries.length} entries · reply detection ran`,
    };
  }
  if (skillId === "draft_sequence") {
    const leadId = cfgStr(config, "selectedLeadId", "");
    const { draftSequenceWithLlm } = await import("./work-inference");
    const draft = await draftSequenceWithLlm({ leadId: leadId || undefined });
    return {
      executed: true,
      kind: "plan",
      skipReason: `Sequence drafted · ${draft.sequenceId} · ${draft.steps} steps`,
    };
  }
  if (skillId === "summarize_day") {
    const { buildDayBrief } = await import("./work-inference");
    const brief = await buildDayBrief();
    return { executed: true, kind: "plan", skipReason: brief };
  }
  if (skillId === "morning_brief") {
    const { buildMorningBrief } = await import("./work-morning-brief");
    const brief = await buildMorningBrief();
    return { executed: true, kind: "plan", skipReason: brief };
  }
  if (skillId === "prep_meeting") {
    const { buildPrepMeetingBrief } = await import("./work-morning-brief");
    const email = cfgStr(config, "selectedLeadEmail", "");
    const brief = await buildPrepMeetingBrief(email || undefined);
    return { executed: true, kind: "plan", skipReason: brief };
  }
  if (skillId === "slack_digest") {
    const { sendSlackDigest } = await import("./work-slack-digest");
    const out = await sendSlackDigest();
    return { executed: out.ok, kind: "digital", skipReason: out.detail };
  }
  if (skillId === "draft_reply") {
    const mailId = cfgStr(config, "selectedMailId", "");
    const leadId = cfgStr(config, "selectedLeadId", "");
    const { draftReplyWithLlm } = await import("./work-inference");
    const draft = await draftReplyWithLlm({ mailId: mailId || undefined, leadId: leadId || undefined });
    return { executed: true, kind: "plan", skipReason: `${draft.subject}\n${draft.body.slice(0, 120)}` };
  }
  if (skillId === "enrich_lead") {
    const leadId = cfgStr(config, "selectedLeadId", "");
    if (!leadId) return { executed: false, kind: "plan", skipReason: "select a lead first" };
    const { enrichLead } = await import("./work-lead-enrichment");
    const out = await enrichLead(leadId);
    return { executed: out.ok, kind: "plan", skipReason: out.detail };
  }
  if (skillId === "book_meeting") {
    const leadId = cfgStr(config, "selectedLeadId", "");
    if (!leadId) return { executed: false, kind: "digital", skipReason: "select a lead first" };
    const { getLead } = await import("./work-store");
    const { bookMeeting } = await import("./work-calcom");
    const lead = await getLead(leadId);
    if (!lead) return { executed: false, kind: "digital", skipReason: "lead not found" };
    const out = await bookMeeting({ leadEmail: lead.email, leadName: lead.name });
    return { executed: out.ok, kind: "digital", skipReason: out.detail };
  }
  if (skillId === "run_demo_tour") {
    const { runWorkDemoTour } = await import("./work-demo-tour");
    const tour = await runWorkDemoTour();
    return {
      executed: tour.ok,
      kind: "digital",
      skipReason: tour.ok
        ? `Demo tour · ${tour.sendId ?? "send"} · ${tour.sequenceId ?? ""}`
        : tour.error ?? "Demo tour failed",
    };
  }
  if (skillId === "send_email" || skillId === "send_sequence_step") {
    const sequenceId = cfgStr(config, "selectedSequenceId", "");
    if (!sequenceId) {
      return { executed: false, kind: "digital", skipReason: "select a sequence in Outreach desk first" };
    }
    const { sendSequenceStep, executeOutboundSend } = await import("./work-send-executor");
    const out = await sendSequenceStep(sequenceId);
    if (!out.ok) {
      return { executed: false, kind: "digital", skipReason: out.error ?? "send failed" };
    }
    if (out.send?.status === "pending_approval") {
      return { executed: true, kind: "plan", skipReason: "awaiting operator approval" };
    }
    if (out.send?.status === "queued" && out.send.id) {
      const sent = await executeOutboundSend(out.send.id);
      return {
        executed: sent.ok,
        kind: "digital",
        digital: sent.ok ? { ok: true, id: out.send.id, tool: "work.email.send" } : undefined,
        skipReason: sent.error,
      };
    }
    return {
      executed: true,
      kind: "digital",
      digital: { ok: true, id: out.send?.id ?? "", tool: "work.email.send" },
    };
  }
  return null;
}

async function executeMyCapitalSkill(
  skillId: string,
  config: Record<string, unknown>,
): Promise<SkillMeshResult | null> {
  if (skillId === "execute_trade") {
    const ruleId = cfgStr(config, "selectedRuleId", "");
    const { executeCapitalTrade, submitTradeToBridge } = await import("./capital-trade-executor");
    const out = await executeCapitalTrade({ ruleId: ruleId || undefined });
    if (!out.ok) {
      return { executed: false, kind: "digital", skipReason: out.error ?? "trade failed" };
    }
    if (out.trade?.status === "pending_approval") {
      return { executed: true, kind: "plan", skipReason: "awaiting operator approval" };
    }
    if (out.trade?.status === "queued" && out.trade.id) {
      const sent = await submitTradeToBridge(out.trade.id);
      return {
        executed: sent.ok,
        kind: "digital",
        digital: sent.ok ? { ok: true, id: out.trade.id, tool: "capital.execute_trade" } : undefined,
        skipReason: sent.error,
      };
    }
    return { executed: true, kind: "digital", digital: { ok: true, id: out.trade?.id ?? "", tool: "capital.execute_trade" } };
  }
  if (skillId === "research_ticker") {
    const asset = cfgStr(config, "selectedAsset", "SPY");
    const { buildTickerIntel } = await import("./capital-ticker-intel");
    const intel = await buildTickerIntel(asset);
    return {
      executed: true,
      kind: "plan",
      skipReason: `${intel.symbol} · ${intel.smartTake ?? "Intel refreshed"} · sentiment ${intel.sentiment.label}`,
    };
  }
  if (skillId === "create_rule_from_thesis") {
    const asset = cfgStr(config, "selectedAsset", "SPY");
    const { getCachedTickerIntel, buildTickerIntel } = await import("./capital-ticker-intel");
    const { createRuleFromIntelThesis } = await import("./capital-intel-actions");
    const intel = (await getCachedTickerIntel(asset, { allowStale: true })) ?? (await buildTickerIntel(asset));
    const rule = await createRuleFromIntelThesis(intel);
    return { executed: true, kind: "plan", skipReason: `Rule ${rule.id} · ${rule.name}` };
  }
  if (skillId === "subscribe_pilot") {
    const pilotId = cfgStr(config, "selectedPilotId", "PILOT-NDAQ10");
    const allocation = Number(config.allocationUsd ?? 1000);
    const { subscribeToPilot } = await import("./capital-pilot-engine");
    const out = await subscribeToPilot({ pilotId, allocationUsd: Number.isFinite(allocation) ? allocation : 1000 });
    return { executed: out.ok, kind: "plan", skipReason: out.ok ? `Subscribed ${pilotId}` : out.error };
  }
  if (skillId === "sync_pilots") {
    const { syncPilotSubscriptions } = await import("./capital-pilot-engine");
    const out = await syncPilotSubscriptions();
    return { executed: true, kind: "digital", skipReason: `Pilot sync · ${out.trades ?? 0} trade(s)` };
  }
  if (skillId === "preview_trade") {
    const asset = cfgStr(config, "selectedAsset", "SPY");
    const { previewTrade } = await import("./capital-trade-executor");
    const out = await previewTrade({ ticker: asset, qty: 1, action: "buy" });
    const p = out.preview;
    return {
      executed: out.ok,
      kind: "plan",
      skipReason: p
        ? `${p.action} ${p.qty} ${p.ticker} · ~$${p.estimatedNotionalUsd ?? "?"} · auto=${p.autoApproveEligible}`
        : out.error,
    };
  }
  if (skillId === "pfm_refresh") {
    const { refreshPfmData } = await import("./capital-pfm-store");
    const snapshot = await refreshPfmData();
    return {
      executed: true,
      kind: "plan",
      skipReason: `PFM · net worth $${snapshot.netWorthUsd} · ${snapshot.dataSource}`,
    };
  }
  if (skillId === "run_demo_tour") {
    const { runCapitalDemoTour } = await import("./capital-demo-tour");
    const tour = await runCapitalDemoTour();
    return {
      executed: tour.ok,
      kind: "digital",
      skipReason: tour.ok
        ? `Demo tour · ${tour.tradeId ?? "fill"} · rule ${tour.ruleId ?? ""}`
        : tour.error ?? "Demo tour failed",
    };
  }
  if (skillId === "execute_now") {
    const ruleId = cfgStr(config, "selectedRuleId", "");
    const { executeCapitalTrade } = await import("./capital-trade-executor");
    const { ensureCapitalQueue } = await import("./capital-store");
    const file = await ensureCapitalQueue();
    const rid = ruleId || file.rules.find((r) => r.state === "ARMED")?.id;
    if (!rid) {
      return { executed: false, kind: "plan", skipReason: "No armed rule — arm a rule first" };
    }
    const out = await executeCapitalTrade({ ruleId: rid, source: "manual" });
    return {
      executed: out.ok,
      kind: "digital",
      skipReason: out.ok
        ? `Execute now · ${out.trade?.status ?? "ok"} · ${out.trade?.id ?? ""}`
        : out.error ?? "Execute failed",
    };
  }
  if (skillId === "portfolio_query") {
    const q = cfgStr(config, "lastUserMessage", "portfolio health");
    const { fetchCapitalStatus } = await import("./capital-store");
    const { answerPortfolioQuery } = await import("./capital-nl-query");
    const status = await fetchCapitalStatus({ sync: false });
    const result = answerPortfolioQuery(q, status);
    return { executed: true, kind: "plan", skipReason: result.answer };
  }
  if (skillId === "rebalance") {
    const asset = cfgStr(config, "selectedAsset", "SPY");
    const { createRule, setRuleState, fetchCapitalStatus } = await import("./capital-store");
    const status = await fetchCapitalStatus({ sync: false });
    const hint = status.portfolioHealth.rebalanceHints?.[0];
    const sym = hint?.symbol ?? asset;
    const target = hint?.targetWeightPct ?? 20;
    const rule = await createRule({
      name: `${sym} rebalance`,
      asset: sym,
      kind: "rebalance",
      targetWeight: target,
      driftThresholdPct: 10,
      action: "sell",
      conditionType: "manual_trigger",
    });
    await setRuleState(rule.id, "ARMED");
    return {
      executed: true,
      kind: "plan",
      skipReason: `Rebalance rule ${rule.id} armed · ${sym} target ${target}%`,
    };
  }
  if (skillId === "create_rule") {
    const asset = cfgStr(config, "selectedAsset", "SPY").trim().toUpperCase() || "SPY";
    const { createRule } = await import("./capital-store");
    const rule = await createRule({
      name: `${asset} chat rule`,
      asset,
      action: "buy",
      qty: 1,
      conditionType: "manual_trigger",
    });
    return {
      executed: true,
      kind: "plan",
      skipReason: `Rule ${rule.id} created (paused) · arm before execute`,
    };
  }
  if (skillId === "arm_rule") {
    const ruleId = cfgStr(config, "selectedRuleId", "").trim();
    const { createRule, setRuleState, fetchCapitalStatus } = await import("./capital-store");
    let id = ruleId;
    if (!id) {
      const status = await fetchCapitalStatus({ sync: false });
      id = status.rules.find((r) => r.state !== "ARMED")?.id ?? status.rules[0]?.id ?? "";
    }
    if (!id) {
      const asset = cfgStr(config, "selectedAsset", "SPY");
      const created = await createRule({
        name: `${asset} chat rule`,
        asset,
        action: "buy",
        qty: 1,
        conditionType: "manual_trigger",
      });
      id = created.id;
    }
    const armed = await setRuleState(id, "ARMED");
    return {
      executed: true,
      kind: "plan",
      skipReason: armed ? `Rule ${armed.id} armed` : `Could not arm ${id}`,
    };
  }
  if (skillId === "agent_execute_trade") {
    const asset = cfgStr(config, "selectedAsset", "SPY");
    const { agentExecuteTrade } = await import("./capital-agent-executor");
    const result = await agentExecuteTrade({
      ticker: asset,
      qty: 1,
      action: "buy",
      confirm: false,
      source: "claw",
    });
    if (!result.ok && result.phase === "blocked") {
      return { executed: false, kind: "digital", skipReason: result.error ?? "blocked" };
    }
    if (result.phase === "preview") {
      const p = result.preview;
      return {
        executed: true,
        kind: "plan",
        skipReason: p
          ? `Preview · ${p.action} ${p.qty} ${p.ticker} · confirm in Agent & MCP panel`
          : "Preview ready — confirm in desk",
      };
    }
    return {
      executed: result.ok,
      kind: "digital",
      skipReason: result.ok
        ? `Agent executed · ${result.trade?.id ?? ""} · ${result.trade?.status ?? ""}`
        : result.error ?? "Agent execute failed",
      digital: result.trade
        ? { ok: result.ok, id: result.trade.id, tool: "capital.execute_trade" }
        : undefined,
    };
  }
  return null;
}

async function buildMotorIntent(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
  clawId: number,
): Promise<Parameters<typeof publishMotorCommand>[0] | null> {
  const lane = cfgStr(config, "clawLane", "A");
  const coords = laneCoords(lane);

  switch (appId) {
    case "my-work":
      if (skillId === "sort_tray") {
        const taskId = cfgStr(config, "selectedTaskId", "");
        const flags = taskId ? 0x0001 | (taskId.charCodeAt(taskId.length - 1) & 0xff) : 0x0001;
        return { clawId, ...coords, flags };
      }
      if (skillId === "move_to_tray") {
        return { clawId, x: coords.x, y: coords.y, z: 0.08, flags: 0x0002 };
      }
      break;

    case "my-shop":
      if (skillId === "sort_sku") {
        const orderId = cfgStr(config, "selectedOrderId", "");
        const orderFlag = orderId ? orderId.charCodeAt(orderId.length - 1) & 0x0f : 0;
        return { clawId, x: 0.22, y: 0.05, z: 0.14, flags: 0x0010 | orderFlag };
      }
      if (skillId === "retry_pick") {
        const sku = cfgStr(config, "selectedSku", "");
        const skuFlag = sku ? sku.charCodeAt(0) & 0x0f : 0;
        return { clawId, x: 0.22, y: 0.05, z: 0.12, flags: 0x0020 | skuFlag, torqueZ: 1.2 };
      }
      break;

    case "tesla-optimus-engine":
      if (skillId === "home_position") {
        return { clawId, x: 0, y: 0, z: 0.5, flags: 0x0100 };
      }
      if (skillId === "test_grip") {
        return { clawId, x: 0.1, y: 0, z: 0.3, torqueZ: cfgNum(config, "gripTorque", 2.5), flags: 0x0200 };
      }
      if (skillId === "tune_joint") {
        return {
          clawId,
          x: cfgNum(config, "jointX", 0.1),
          y: cfgNum(config, "jointY", 0),
          z: cfgNum(config, "jointZ", 0.3),
          torqueX: cfgNum(config, "torqueX", 0.5),
          torqueY: cfgNum(config, "torqueY", 0.3),
          torqueZ: cfgNum(config, "torqueZ", 1.0),
          flags: 0x0400,
        };
      }
      break;

    case "robotaxi-fleet-manager":
      if (skillId === "assign_route") {
        const depot = cfgStr(config, "depotGrid", "A1");
        const col = depot.charCodeAt(0) - 65;
        return { clawId, x: 0.1 + col * 0.08, y: 0.1, z: 0.05, flags: 0x0080 };
      }
      if (skillId === "recall_vehicle") {
        return { clawId, x: 0.1, y: 0.1, z: 0.05, flags: 0x0081 };
      }
      break;

    case "claw-cafe":
      if (skillId === "drop_claw") {
        return { clawId, x: coords.x, y: coords.y, z: 0.04, flags: 0x1000 };
      }
      if (skillId === "photo_booth") {
        return { clawId, ...coords, flags: 0x2000 };
      }
      break;

    default:
      break;
  }

  return null;
}

function resolveMediaForPost(
  post: {
    imageUrl?: string | null;
    imagePath?: string | null;
    videoUrl?: string | null;
    videoPath?: string | null;
  },
  config: Record<string, unknown>,
) {
  return {
    imageUrl: cfgStr(config, "selectedPostImageUrl", "") || post.imageUrl || "",
    videoUrl: cfgStr(config, "selectedPostVideoUrl", "") || post.videoUrl || "",
    videoPath: cfgStr(config, "selectedPostVideoPath", "") || post.videoPath || "",
  };
}

async function executeBatchPublish(config: Record<string, unknown>): Promise<SkillMeshResult> {
  const { listPublishablePosts } = await import("./content-queue-store");
  const { requestPostPublish } = await import("./content-approval-service");
  const { mediaReadiness } = await import("./content-creation-service");
  const { resolvePublishTool } = await import("./content-channels-status");

  const posts = await listPublishablePosts();
  let ok = 0;
  let pending = 0;
  let skipped = 0;
  let lastDigital: DigitalPublishResult | undefined;

  for (const post of posts) {
    const { tier } = resolvePublishTool(post.platform);
    if (tier !== "live") {
      skipped++;
      continue;
    }
    const ready = mediaReadiness(post);
    if (!ready.ready) {
      skipped++;
      continue;
    }
    const cfg = { ...config, selectedPostId: post.id };
    const digital = await buildDigitalIntent("my-content-creator", "publish_post", cfg);
    if (!digital) {
      skipped++;
      continue;
    }
    const out = await requestPostPublish(post.id, cfg, "batch");
    if (out.mode === "pending") {
      pending++;
      continue;
    }
    lastDigital = out.result;
    if (out.result.ok) ok++;
  }

  if (ok === 0 && pending === 0) {
    return {
      executed: false,
      kind: "digital",
      skipReason: skipped > 0 ? "no ready posts — add drafts, thumbnails, or video renders" : "queue empty",
    };
  }
  if (ok === 0 && pending > 0) {
    return {
      executed: true,
      kind: "plan",
      skipReason: `${pending} post(s) awaiting operator approval`,
    };
  }
  return { executed: true, kind: "digital", digital: lastDigital };
}

async function publishPostSkipReason(config: Record<string, unknown>): Promise<string> {
  const postId = cfgStr(config, "selectedPostId", "");
  const { getContentPost } = await import("./content-queue-store");
  const { mediaReadiness } = await import("./content-creation-service");
  const post = postId ? await getContentPost(postId) : null;
  if (!post?.draftText.trim()) {
    return "selected post has no draft text — run Draft Post or save a draft first";
  }
  const media = resolveMediaForPost(post, config);
  const enriched = { ...post, ...media };
  const ready = mediaReadiness(enriched);
  if (!ready.ready) {
    return `missing: ${ready.missing.join(", ")} — use Creation Studio (Thumbnail / Render Video)`;
  }
  const { resolvePublishTool } = await import("./content-channels-status");
  const { tier } = resolvePublishTool(post.platform);
  if (tier !== "live") {
    return `${post.platform} bridge not live yet — draft saved locally; configure digital.env when bridge ships`;
  }
  return "no digital mapping";
}

async function buildDigitalIntent(
  appId: OotbAppId,
  skillId: string,
  config: Record<string, unknown>,
): Promise<{ tool: string; payload: Record<string, unknown> } | null> {
  switch (appId) {
    case "my-vital":
      if (skillId === "sync_wearables") {
        return {
          tool: "health.sync_wearables",
          payload: {
            sources: ["oura", "garmin", "apple_health"],
            profile_id: cfgStr(config, "selectedProfileId", ""),
          },
        };
      }
      break;

    case "my-content-creator":
      if (skillId === "publish_post") {
        const postId = cfgStr(config, "selectedPostId", "");
        const { resolvePostForPublish } = await import("./content-queue-store");
        const post = postId ? await resolvePostForPublish(postId) : null;
        if (!post) return null;
        const { resolvePublishTool } = await import("./content-channels-status");
        const { tool, tier } = resolvePublishTool(post.platform);
        if (tier !== "live") return null;
        const { charLimitForPlatform } = await import("./social-channels");
        const cap = charLimitForPlatform(post.platform) ?? 280;
        const media = resolveMediaForPost(post, config);
        const { imageUrl, videoUrl, videoPath } = media;
        if (post.platform === "instagram" && !imageUrl && !post.imagePath) return null;
        if (post.platform === "pinterest" && !imageUrl && !post.imagePath) return null;
        if (
          (post.platform === "tiktok" || post.platform === "youtube" || post.platform === "snapchat") &&
          !videoUrl &&
          !videoPath
        ) {
          return null;
        }
        const payload: Record<string, unknown> = {
          text: post.draftText.slice(0, cap),
          platform: post.platform,
          channel: post.platform,
          tone: cfgStr(config, "contentTone", "technical"),
          post_id: post.id,
          format: post.format,
        };
        if (imageUrl) payload.image_url = imageUrl;
        if (videoUrl) payload.video_url = videoUrl;
        if (videoPath) payload.video_path = videoPath;
        const boardId =
          post.pinterestBoardId ||
          cfgStr(config, "selectedBoardId", "") ||
          cfgStr(config, "pinterestBoardId", "");
        if (boardId) payload.board_id = boardId;
        const pinLink = cfgStr(config, "selectedPinLink", "") || cfgStr(config, "pinterestLink", "");
        if (pinLink) payload.link = pinLink;
        const subreddit = cfgStr(config, "selectedSubreddit", "") || cfgStr(config, "redditSubreddit", "");
        if (subreddit) payload.subreddit = subreddit;
        const discordChannel = cfgStr(config, "selectedChannelId", "") || cfgStr(config, "discordChannelId", "");
        if (discordChannel) payload.channel_id = discordChannel;
        return { tool, payload };
      }
      if (skillId === "publish_reply") {
        const replyId = cfgStr(config, "selectedReplyId", "");
        if (!replyId) return null;
        const { buildReplyIntent } = await import("./content-reply-publish");
        const { getContentReply } = await import("./content-replies-store");
        const reply = await getContentReply(replyId);
        if (!reply) return null;
        return buildReplyIntent(reply);
      }
      break;

    default:
      break;
  }

  return null;
}
