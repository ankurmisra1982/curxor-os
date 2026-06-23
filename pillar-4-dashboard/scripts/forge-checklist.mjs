#!/usr/bin/env node

/**

 * Forge F1–F9 checklist — status API, fleet, go-live, export, cafe events

 * Usage: node scripts/forge-checklist.mjs [baseUrl]

 */

import { createQaHttp } from "./qa-http.mjs";



const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

const { getJson, postJson } = createQaHttp(BASE);



let pass = 0;

let fail = 0;



function ok(name, detail) {

  console.log(`PASS · ${name}${detail ? ` · ${detail}` : ""}`);

  pass++;

}



function bad(name, detail) {

  console.log(`FAIL · ${name}${detail ? ` · ${detail}` : ""}`);

  fail++;

}



console.log(`==> Forge checklist · base=${BASE}\n`);



{

  const data = await getJson("/api/forge/status");

  if (data.ok === true && Array.isArray(data.fleet) && data.counts && typeof data.counts.total === "number") {

    ok("forge status bootstrap", `fleet=${data.fleet.length} forged=${data.forgedApps?.length ?? 0}`);

  } else {

    bad("forge status bootstrap", "missing fleet or counts");

  }

}



{

  const data = await getJson("/api/forge/status");

  if (data.goLive && typeof data.goLive.demoReady === "boolean" && Array.isArray(data.goLive.steps)) {

    ok("forge go-live fields", `demoReady=${data.goLive.demoReady}`);

  } else {

    bad("forge go-live fields", "missing goLive report");

  }

}



{

  const status = await getJson("/api/forge/status");

  const clawId = status.profiles?.claws?.[0]?.id;

  if (!clawId) {

    ok("forge set_active", "no profiles — skip");

  } else {

    const { ok: resOk, json } = await postJson("/api/forge/status", {

      action: "set_active",

      clawId,

    });

    if (resOk && json.profiles?.activeClawId === clawId) {

      ok("forge set_active", clawId);

    } else {

      bad("forge set_active", `active=${json.profiles?.activeClawId}`);

    }

  }

}



{

  const { status, json } = await postJson("/api/claw/import", {

    bundle: {

      version: 1,

      name: "Checklist Island Claw",

      soul: "# Island import QA claw\n\nRuns workspace-only on appliance.",

      tools: "# Tools\n\n- **plan_day** (plan): Plan priorities locally",

      integrationLevel: "island",

    },

    operatorConfirmedWarnings: true,

  });

  if (status === 200 && json.ok === true && json.profile?.id) {

    ok("forge import island checklist", json.profile.id);

  } else {

    bad("forge import island checklist", json.error ?? `status=${status}`);

  }

}



{

  const status = await getJson("/api/forge/status");

  const hasImport = status.fleet?.some((r) => r.mode === "imported" || r.name?.includes("Checklist Island"));

  if (hasImport) ok("forge fleet includes import row");

  else bad("forge fleet includes import row", "not found after import");

}



{

  const status = await getJson("/api/forge/status");

  const forged = status.forgedApps?.[0];

  if (!forged?.id) {

    ok("forge export round-trip", "no forged app — skip");

  } else {

    const { status: expStatus, json } = await postJson("/api/claw/export", { forgedAppId: forged.id });

    if (expStatus === 200 && json.ok === true && json.bundle?.soul && json.bundle?.tools) {

      ok("forge export bundle", forged.id);

    } else {

      bad("forge export bundle", json.error ?? `status=${expStatus}`);

    }

  }

}



{

  const { ok: resOk, json } = await postJson("/api/forge/status", { action: "run_demo_tour" });

  if (resOk && json.tour && typeof json.tour.ok === "boolean") {

    ok("forge demo tour action", json.tour.ok ? "ok" : json.tour.error ?? "failed");

  } else {

    bad("forge demo tour action", "missing tour result");

  }

}



{

  const { ok: resOk, json } = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L1" });

  if (resOk && json.tour?.persona === "L1" && json.tour.ok === true) {

    ok("forge demo tour L1 persona", `${json.tour.steps?.length ?? 0} steps`);

  } else {

    bad("forge demo tour L1 persona", json.tour?.error ?? "failed");

  }

}



{

  const { ok: resOk, json } = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L4" });

  if (resOk && json.tour?.persona === "L4" && json.tour.ok === true && json.tour.forgedHref) {

    ok("forge demo tour L4 work desk", json.tour.forgedHref);

  } else {

    bad("forge demo tour L4 work desk", json.tour?.error ?? "missing href");

  }

}



{

  const { ok: resOk, json } = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L4-creator" });

  if (resOk && json.tour?.persona === "L4-creator" && json.tour.ok === true && json.tour.forgedHref) {

    ok("forge demo tour L4 creator desk", json.tour.forgedHref);

  } else {

    bad("forge demo tour L4 creator desk", json.tour?.error ?? "missing href");

  }

}



{

  const prov = await postJson("/api/claw/provision-app", {

    intent: "Forge checklist work desk",

    templateId: "work-desk",

    name: "Checklist Work Desk",

    budgetTier: "balanced",

  });

  const appId = prov.json.forgedApp?.id;

  if (!prov.ok || !appId) {

    bad("forged work desk bootstrap", "provision failed");

  } else {

    const create = await postJson(`/api/forged/${appId}/status`, {

      action: "create_lead",

      name: "Checklist Lead",

      email: `checklist-${Date.now()}@forged.local`,

    });

    const draft = await postJson(`/api/forged/${appId}/status`, {

      action: "draft_sequence",

      leadId: create.json.lead?.id,

    });

    if (create.ok && draft.ok && draft.json.sequence?.id) {

      ok("forged work desk lead sequence", draft.json.sequence.id);

      const send = await postJson(`/api/forged/${appId}/status`, {

        action: "send_sequence_step",

        sequenceId: draft.json.sequence.id,

      });

      if (send.ok && send.json.send?.status === "simulated") {

        ok("forged work desk send step", send.json.send.id);

      } else {

        bad("forged work desk send step", send.json.error ?? "simulated send failed");

      }

    } else {

      bad("forged work desk lead sequence", create.json.error ?? draft.json.error ?? "failed");

    }

  }

}



{

  const prov = await postJson("/api/claw/provision-app", {

    intent: "Forge checklist creator desk",

    templateId: "creator-desk",

    name: "Checklist Creator Desk",

    budgetTier: "balanced",

  });

  const appId = prov.json.forgedApp?.id;

  if (!prov.ok || !appId) {

    bad("forged creator desk bootstrap", "provision failed");

  } else {

    const draft = await postJson(`/api/forged/${appId}/status`, {

      action: "draft_post",

      draftText: "Checklist forged creator draft — local queue on appliance.",

      channel: "Checklist Channel",

      platform: "x",

    });

    const schedule = await postJson(`/api/forged/${appId}/status`, {

      action: "schedule_post",

      postId: draft.json.post?.id,

    });

    if (draft.ok && schedule.ok && schedule.json.post?.stage === "SCHEDULED") {

      ok("forged creator desk draft schedule", schedule.json.post.id);

    } else {

      bad("forged creator desk draft schedule", draft.json.error ?? schedule.json.error ?? "failed");

    }

  }

}



{

  const island = await postJson("/api/claw/create", {

    intent: "Checklist island promote candidate",

    name: "Checklist Island Claw",

    budgetTier: "balanced",

    provisioningMode: "island",

  });

  const profileId = island.json.profile?.id;

  if (!island.ok || !profileId) {

    bad("forge island promote", "island create failed");

  } else {

    const promote = await postJson("/api/forge/status", {

      action: "promote_to_framework",

      profileId,

      templateId: "blank-desk",

    });

    if (promote.ok && promote.json.promote?.forgedApp?.href) {

      ok("forge island promote framework", promote.json.promote.forgedApp.href);

    } else {

      bad("forge island promote framework", promote.json.error ?? promote.json.promote?.error ?? "failed");

    }

  }

}



{

  const island = await postJson("/api/claw/create", {

    intent: "Checklist island archive candidate",

    name: "Checklist Archive Claw",

    budgetTier: "balanced",

    provisioningMode: "island",

  });

  const profileId = island.json.profile?.id;

  if (!island.ok || !profileId) {

    bad("forge archive claw", "island create failed");

  } else {

    const archive = await postJson("/api/forge/status", {

      action: "archive_claw",

      profileId,

    });

    const status = await getJson("/api/forge/status");

    const stillVisible = status.fleet?.some((r) => r.profileId === profileId);

    if (archive.ok && !stillVisible) {

      ok("forge archive claw", profileId);

    } else {

      bad("forge archive claw", archive.json.error ?? "still in fleet");

    }

  }

}



{

  const exp = await postJson("/api/claw/export", { exportAll: true });

  if (exp.ok && Array.isArray(exp.json.bundles) && exp.json.bundles.length >= 1) {

    ok("forge export fleet bundles", `count=${exp.json.bundles.length}`);

  } else {

    bad("forge export fleet bundles", exp.json.error ?? "empty bundles");

  }

}



{

  const prov = await postJson("/api/claw/provision-app", {

    intent: "Checklist forged mesh publish",

    templateId: "work-desk",

    name: "Checklist Mesh Desk",

    budgetTier: "balanced",

  });

  const appId = prov.json.forgedApp?.id;

  if (!prov.ok || !appId) {

    bad("forged publish context", "provision failed");

  } else {

    await postJson(`/api/app-fre/${appId}`, {

      config: { persona: "side_hustle", meshPublish: true, growthLevel: "L2" },

    });

    const pub = await postJson(`/api/forged/${appId}/status`, { action: "publish_context" });

    if (pub.ok && typeof pub.json.publishedKey === "string") {

      ok("forged publish context", pub.json.publishedKey);

      const ctx = await getJson("/api/mesh/context?appId=my-work");

      const workCtx = ctx.context?.work ?? {};

      const forgedKey = Object.keys(workCtx).find((k) => k.startsWith("forged."));

      if (forgedKey) {

        ok("forged CCP read my-work", forgedKey);

      } else {

        bad("forged CCP read my-work", "no forged key in work scope");

      }

    } else {

      bad("forged publish context", pub.json.error ?? "missing key");

    }

  }

}



{

  const prov = await postJson("/api/claw/provision-app", {

    intent: "Checklist cafe mint consumer",

    templateId: "creator-desk",

    name: "Checklist Cafe Mint",

    budgetTier: "balanced",

  });

  const appId = prov.json.forgedApp?.id;

  if (!prov.ok || !appId) {

    bad("forge cafe mint consumer", "provision failed");

  } else {

    await postJson("/api/cafe/status", { action: "sync" });

    const forgeStatus = await getJson("/api/forge/status");

    const cafeEvents = Array.isArray(forgeStatus.cafeEvents) ? forgeStatus.cafeEvents : [];

    const mintEvent = cafeEvents.find(

      (e) =>

        (e.kind === "forge.framework_provisioned" || e.kind === "forge.claw_minted") &&

        e.appId === appId,

    );

    if (mintEvent) {

      ok("forge cafe mint consumer", mintEvent.appId);

    } else {

      bad("forge cafe mint consumer", "mint event not attributed to forged app");

    }

  }

}



{

  const prov = await postJson("/api/claw/provision-app", {

    intent: "Forge checklist capital desk",

    templateId: "capital-desk",

    name: "Checklist Capital Desk",

    budgetTier: "balanced",

  });

  const appId = prov.json.forgedApp?.id;

  if (!prov.ok || !appId) {

    bad("forged capital desk bootstrap", "provision failed");

  } else {

    const research = await postJson(`/api/forged/${appId}/status`, {

      action: "research_ticker",

      ticker: "SPY",

    });

    const rule = await postJson(`/api/forged/${appId}/status`, {

      action: "create_rule",

      name: "Checklist rule",

      asset: "SPY",

    });

    const arm = await postJson(`/api/forged/${appId}/status`, {

      action: "arm_rule",

      ruleId: rule.json.rule?.id,

    });

    if (research.ok && rule.ok && arm.ok && arm.json.rule?.state === "ARMED") {

      ok("forged capital desk research arm", arm.json.rule.id);

    } else {

      bad("forged capital desk research arm", research.json.error ?? arm.json.error ?? "failed");

    }

  }

}



{

  const island = await postJson("/api/claw/create", {

    intent: "Checklist island mint honest mode",

    name: "Checklist Island Mint",

    provisioningMode: "island",

    budgetTier: "balanced",

  });

  const profileId = island.json.profile?.id;

  if (!island.ok || !profileId) {

    bad("forge island mint no nav", "create failed");

  } else {

    const status = await getJson("/api/forge/status");

    const row = status.fleet?.find((r) => r.profileId === profileId);

    if (row?.mode === "island" && !row?.href) {

      ok("forge island mint no nav", profileId);

    } else {

      bad("forge island mint no nav", "fleet row has href or wrong mode");

    }

  }

}



{

  const { ok: resOk, json } = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L4-capital" });

  if (resOk && json.tour?.persona === "L4-capital" && json.tour.ok === true && json.tour.forgedHref) {

    ok("forge demo tour L4 capital desk", json.tour.forgedHref);

  } else {

    bad("forge demo tour L4 capital desk", json.tour?.error ?? "missing href");

  }

}



{

  const status = await getJson("/api/forge/status");

  if (Array.isArray(status.cafeEvents)) {

    ok("forge cafe events ledger", `count=${status.cafeEvents.length}`);

  } else {

    bad("forge cafe events ledger", "missing cafeEvents");

  }

}



console.log(`\n==> ${pass}/${pass + fail} passed`);

if (fail > 0) process.exitCode = 1;

