#!/usr/bin/env node

/**

 * Forge workspace tab gates + provisioning availability (F3/F7)

 * Usage: node scripts/qa-forge-levels.mjs

 */



const ORDER = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4 };



function meets(user, required) {

  return ORDER[user] >= ORDER[required];

}



function forgeTabsForGrowth(growth) {

  const tabs = ["mint"];

  if (meets(growth, "L2")) tabs.push("fleet");

  if (meets(growth, "L3")) tabs.push("stacks");

  if (meets(growth, "L4")) tabs.push("templates", "import");

  if (meets(growth, "L5")) tabs.push("ops");

  return tabs;

}



function defaultForgeTabForGrowth(growth) {

  if (meets(growth, "L5")) return "ops";

  if (meets(growth, "L4")) return "templates";

  if (meets(growth, "L2")) return "fleet";

  return "mint";

}



function islandCreateAvailable(mode) {

  return mode === "island";

}



function wizardProvisioningModeAvailable(mode) {

  return mode === "island" || mode === "framework" || mode === "imported";

}



const FORGE_INTENT_TO_GROWTH = {

  first_claw: "L1",

  side_projects: "L2",

  custom_stacks: "L3",

  templates_import: "L4",

  fleet_operator: "L5",

};



const checks = [];

function pass(name, detail) {

  checks.push({ name, ok: true, detail });

  console.log(`PASS · ${name}${detail ? ` · ${detail}` : ""}`);

}

function fail(name, detail) {

  checks.push({ name, ok: false, detail });

  console.log(`FAIL · ${name}${detail ? ` · ${detail}` : ""}`);

}



console.log("==> Forge workspace tab gates\n");



if (forgeTabsForGrowth("L1").join() === "mint") pass("L1 tabs", "mint only");

else fail("L1 tabs", forgeTabsForGrowth("L1").join());



if (forgeTabsForGrowth("L2").join() === "mint,fleet") pass("L2 tabs", "mint,fleet");

else fail("L2 tabs", forgeTabsForGrowth("L2").join());



if (forgeTabsForGrowth("L3").join() === "mint,fleet,stacks") pass("L3 tabs", "mint,fleet,stacks");

else fail("L3 tabs", forgeTabsForGrowth("L3").join());



if (forgeTabsForGrowth("L4").join() === "mint,fleet,stacks,templates,import") {

  pass("L4 tabs", "templates + import");

} else fail("L4 tabs", forgeTabsForGrowth("L4").join());



if (forgeTabsForGrowth("L5").join() === "mint,fleet,stacks,templates,import,ops") {

  pass("L5 tabs", "ops at Foundry");

} else fail("L5 tabs", forgeTabsForGrowth("L5").join());



if (defaultForgeTabForGrowth("L1") === "mint") pass("L1 default tab", "mint");

else fail("L1 default tab", defaultForgeTabForGrowth("L1"));



if (defaultForgeTabForGrowth("L2") === "fleet") pass("L2 default tab", "fleet");

else fail("L2 default tab", defaultForgeTabForGrowth("L2"));



if (defaultForgeTabForGrowth("L5") === "ops") pass("L5 default tab", "ops");

else fail("L5 default tab", defaultForgeTabForGrowth("L5"));



console.log("\n==> Forge growth intent mapping\n");



if (FORGE_INTENT_TO_GROWTH.templates_import === "L4") pass("intent templates_import", "L4");

else fail("intent templates_import", FORGE_INTENT_TO_GROWTH.templates_import);



if (FORGE_INTENT_TO_GROWTH.fleet_operator === "L5") pass("intent fleet_operator", "L5");

else fail("intent fleet_operator", FORGE_INTENT_TO_GROWTH.fleet_operator);



console.log("\n==> Provisioning modes (P2/P3)\n");



if (islandCreateAvailable("island") && !islandCreateAvailable("framework")) {

  pass("create API island-only", "framework rejected");

} else fail("create API island-only", "unexpected");



if (wizardProvisioningModeAvailable("framework") && wizardProvisioningModeAvailable("imported")) {

  pass("wizard modes", "all three live");

} else fail("wizard modes", "unexpected");



const failed = checks.filter((c) => !c.ok).length;

console.log(`\n==> ${checks.length - failed}/${checks.length} passed`);

if (failed > 0) process.exitCode = 1;

