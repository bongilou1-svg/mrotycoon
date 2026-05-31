// INC3 integración: el viaje variable oficina→stand fluye de extremo a extremo por createGame.
// Verifica que pasando airportPaths (OSM real de OVD), createGame precomputa standTravelMinutes,
// y que al asignar un mecánico la WO sella plannedTravelMinutes = el valor variable de SU stand
// (no el fijo balance.officeToStandMinutes). Sin airportPaths → fallback al fijo (compat).

import { createGame } from "../src/lib/game.ts";
import { assignMechanicsToWo } from "../src/lib/sim/assignment.ts";
import { computeStandTravelMinutes } from "../src/lib/sim/travel.ts";
import { serializeGame, deserializeGame } from "../src/lib/sim/save.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const ovdPaths = JSON.parse(readFileSync(new URL("../src/assets/airports/ovd.paths.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

console.log("\n=== createGame precomputa standTravelMinutes desde airportPaths ===");
const g = createGame(balance, airlines, templates, 42, [], [], { airportPaths: ovdPaths });
expect(g.standTravelMinutes && typeof g.standTravelMinutes === "object", "g.standTravelMinutes existe");
const stm = g.standTravelMinutes ?? {};
expect(Object.keys(stm).length === Object.keys(ovdPaths.standMap).length,
  `un valor por stand (${Object.keys(stm).length}/${Object.keys(ovdPaths.standMap).length})`);
// El valor debe coincidir con el cálculo puro directo.
const direct = computeStandTravelMinutes(ovdPaths, balance);
expect(JSON.stringify(stm) === JSON.stringify(direct), "coincide con computeStandTravelMinutes directo");
// Variabilidad real: el hangar lejano cuesta MÁS que un stand de línea.
expect(stm["H3-B1"] > stm["H1-S4"], `H3-B1 (${stm["H3-B1"]}) más lejos que H1-S4 (${stm["H1-S4"]})`);

console.log("\n=== sin airportPaths → {} (fallback al fijo) ===");
const gNo = createGame(balance, airlines, templates, 42);
expect(gNo.standTravelMinutes && Object.keys(gNo.standTravelMinutes).length === 0, "g.standTravelMinutes = {} sin mapa");

console.log("\n=== assignMechanicsToWo sella plannedTravelMinutes variable ===");
// WO en un stand concreto + mecánico Idle compatible. Construimos un escenario mínimo.
const tpl = templates.find(t => t.kind === "callout") || templates[0];
const wo = {
  instanceId: "WI-INT-1", templateId: tpl.id, airplaneRegistration: "EC-INT", airplaneInstanceId: "ALI-INT",
  emissionMinute: 100, assignedMechanicIds: [], phase: "ToPlane", phaseElapsedMinutes: 0, slaMinute: 999999,
  standId: "H3-B1", // stand lejano
};
const mech = { id: "M-INT", name: "T", base: "B1", state: "Idle", assignedWoInstanceId: null,
  assignedCheckInstanceId: null, stateRemainingMinutes: 0, efficiency: 1, moral: 70,
  typeRatings: [{ model: tpl.aircraftModelsCompatibles[0] ?? "A320", engineVariant: tpl.engineVariantsCompatibles[0] ?? "CFM56", category: "B1" }], shift: "morning" };

const res = assignMechanicsToWo([mech], [wo], "WI-INT-1", "M-INT", [], balance, 100, stm);
const assignedWo = res.workOrders.find(w => w.instanceId === "WI-INT-1");
const assignedMech = res.mechanics.find(m => m.id === "M-INT");
expect(!res.error, `asignación sin error (${res.error ?? "ok"})`);
expect(assignedWo.plannedTravelMinutes === stm["H3-B1"], `WO sella plannedTravel = ${stm["H3-B1"]} (variable, no fijo ${balance.officeToStandMinutes})`);
expect(assignedMech.stateRemainingMinutes === stm["H3-B1"], `mecánico ToPlane timer = ${stm["H3-B1"]}`);

console.log("\n=== sin mapa → fallback officeToStandMinutes ===");
const res2 = assignMechanicsToWo([mech], [wo], "WI-INT-1", "M-INT", [], balance, 100, {});
const wo2 = res2.workOrders.find(w => w.instanceId === "WI-INT-1");
expect(wo2.plannedTravelMinutes === balance.officeToStandMinutes, `fallback plannedTravel = ${balance.officeToStandMinutes}`);

console.log("\n=== save/load preserva standTravelMinutes ===");
const payload = serializeGame(g);
expect(payload.standTravelMinutes && payload.standTravelMinutes["H3-B1"] === stm["H3-B1"], "serializeGame incluye standTravelMinutes");
const g2 = deserializeGame(payload, balance, airlines, templates);
expect(JSON.stringify(g2.standTravelMinutes) === JSON.stringify(stm), "deserializeGame restaura standTravelMinutes");
// Save legacy sin el campo → {} (no rompe)
const legacy = { ...payload }; delete legacy.standTravelMinutes;
const g3 = deserializeGame(legacy, balance, airlines, templates);
expect(g3.standTravelMinutes && Object.keys(g3.standTravelMinutes).length === 0, "save sin campo → {} (compat)");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
