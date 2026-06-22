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

    } else {

      bad("forged work desk lead sequence", create.json.error ?? draft.json.error ?? "failed");

    }

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

process.exit(fail > 0 ? 1 : 0);

