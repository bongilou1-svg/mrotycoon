// Test: cuando una WO AOG se emite durante un tick → game.clock.speed pasa a 0 (pausa auto).

import { createGame, advanceGame } from "../src/lib/game.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

console.log("\n=== auto-pausa en AOG ===");

// Cuántos AOG hay en el dataset
const aogTemplates = templates.filter(t => t.isAOG);
expect(aogTemplates.length > 0, `dataset tiene ${aogTemplates.length} templates AOG`);

// Hay ~2 templates AOG en el dataset (WO-101/102, ~2% prob). Para que el test sea determinista
// e instantáneo, sustituimos TODOS los templates por uno AOG → garantizamos que la primera
// WO emitida será AOG y dispara la auto-pausa.
const aogOnlyTemplates = templates.map(t => ({ ...t, isAOG: true, severity: "Critical", deferrable: false }));
const g = createGame(balance, airlines, aogOnlyTemplates, 42, defs);
g.clock.speed = 5;
let foundPause = false;
for (let i = 0; i < 500 && !foundPause; i++) {
  advanceGame(g, 30); // 30 min/tick × 500 = 250h ingame, sobra para que aterricen aviones
  if (g.workOrders.length > 0 && g.clock.speed === 0) foundPause = true;
}
console.log(`  · WOs emitidas: ${g.workOrders.length}, speed final: ${g.clock.speed}, ticks usados: hasta ${foundPause ? "found" : 500}`);
expect(foundPause, `auto-pausa dispara cuando emite AOG (encontrado: ${foundPause})`);
expect(g.clock.speed === 0, "speed = 0 tras AOG");
const pauseNotif = g.notifications.find(n => /Pausa autom/.test(n.text));
expect(pauseNotif !== undefined, "notif de auto-pausa emitida");
expect(pauseNotif?.type === "danger", "notif tipo danger");

// === Critical (no AOG) también dispara auto-pausa ===
console.log("\n=== auto-pausa en Critical (no AOG) ===");
const criticalOnly = templates.map(t => ({ ...t, isAOG: false, severity: "Critical", deferrable: false }));
const g3 = createGame(balance, airlines, criticalOnly, 7, defs);
g3.clock.speed = 5;
let foundCrit = false;
for (let i = 0; i < 500 && !foundCrit; i++) {
  advanceGame(g3, 30);
  if (g3.workOrders.length > 0 && g3.clock.speed === 0) foundCrit = true;
}
expect(foundCrit, "auto-pausa dispara también en WOs Critical (sin AOG)");
expect(g3.clock.speed === 0, "speed = 0 tras Critical");

// === autoPauseEnabled OFF → NO pausa aunque sea AOG ===
console.log("\n=== autoPauseEnabled OFF respeta el toggle ===");
const g4 = createGame(balance, airlines, aogOnlyTemplates, 42, defs);
g4.autoPauseEnabled = false;
g4.clock.speed = 5;
for (let i = 0; i < 200 && g4.workOrders.length === 0; i++) advanceGame(g4, 30);
expect(g4.workOrders.length > 0, "WO emitida con flag off");
expect(g4.clock.speed === 5, `speed permanece a 5 con toggle off (got ${g4.clock.speed})`);

// Sanity: si NO hay AOG en el tick, el speed NO debe cambiar
const g2 = createGame(balance, airlines, templates, 42, defs);
g2.clock.speed = 2;
advanceGame(g2, 5);
const anyAogAfter1 = g2.workOrders.some(w => templates.find(t => t.id === w.templateId)?.isAOG);
if (!anyAogAfter1) expect(g2.clock.speed === 2, "sin AOG: speed permanece");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
