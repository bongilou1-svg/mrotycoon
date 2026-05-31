// Fase C #3 (brief maestro): el retraso de salida ya NO refleja la cuantización del tick.
// El sim solo observa salidas en límites de tick (cada stepMinutes). Un avión cuya hora de
// salida programada cae ENTRE dos ticks se detecta en el primer tick posterior y, ANTES de
// este fix, recibía un retraso fantasma de hasta ~1 tick aunque nada lo retuviera. Ese era el
// síntoma "todas las salidas 2m tarde" (con step=2, toda salida en minuto impar → +1..2).
//
// Fix: delay real solo si el avión YA era elegible en el tick anterior (estuvo retenido).
// Inyección directa de aviones (como sim_departure_delay) para forzar minutos off-grid de
// forma determinista, sin depender del schedule.

import { createGame, advanceGame } from "../src/lib/game.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

function makeAirplane(reg, arr, dep) {
  return {
    instanceId: `ALI-${reg}`, registration: reg, model: "A320", engineVariant: "CFM56",
    contractId: "C-1", arrivalMinute: arr, scheduledDepartureMinute: dep,
    status: "OnGround", standId: "H1-S1", flightHoursThisLeg: 2, overnight: false,
  };
}
function freshGame() {
  const g = createGame(balance, airlines, templates, 42);
  g.autoPauseEnabled = false;
  g.contracts = [{ id: "C-1", airlineId: airlines[0].id, airlineName: airlines[0].name }];
  g.clock.speed = 1;
  return g;
}
function findDep(g, reg) {
  return [...g.airplanes, ...(g.archive?.airplanes ?? [])].find(a => a.registration === reg);
}

console.log("\n=== síntoma fantasma: salida OFF-GRID sin nada que la retenga → delay 0 (no +tick) ===");
// dep=101 con step=2: ticks 100 (101 no alcanzado), 102 (101 pasado). rawDelay=1. Avión LIBRE.
const gA = freshGame();
gA.airplanes = [makeAirplane("EC-OFF", 0, 101)];
for (let i = 0; i < 60; i++) advanceGame(gA, 2); // hasta minuto 120 > dep
const off = findDep(gA, "EC-OFF");
expect(off && off.status === "Departed", `avión off-grid salió (${off?.status})`);
expect(off.delayMinutes === 0, `delay 0 (era +1..2 fantasma antes del fix) (got ${off?.delayMinutes})`);

console.log("\n=== otro minuto off-grid (dep=77, libre) → delay 0 ===");
const gB = freshGame();
gB.airplanes = [makeAirplane("EC-O2", 0, 77)];
for (let i = 0; i < 60; i++) advanceGame(gB, 2);
const o2 = findDep(gB, "EC-O2");
expect(o2 && o2.status === "Departed" && o2.delayMinutes === 0, `dep=77 libre → delay 0 (got ${o2?.delayMinutes})`);

console.log("\n=== control: salida ON-GRID a tiempo → delay 0 (sin regresión) ===");
const gC = freshGame();
gC.airplanes = [makeAirplane("EC-ON", 0, 100)]; // 100 % 2 == 0
for (let i = 0; i < 60; i++) advanceGame(gC, 2);
const on = findDep(gC, "EC-ON");
expect(on && on.delayMinutes === 0, `on-grid puntual delay 0 (got ${on?.delayMinutes})`);

console.log("\n=== retraso REAL preservado: avión retenido por WO y liberado tarde ===");
// dep=50; WO bloqueante sin mecánicos (no progresa, no auto-falla: slaMinute alto). El avión
// queda past-due muchos ticks. Al limpiar la WO, sale ~minuto 102 → delay real ~52 (>= step).
const gD = freshGame();
gD.airplanes = [makeAirplane("EC-HELD", 0, 50)];
gD.workOrders = [{
  instanceId: "WO-block", templateId: templates[0].id, airplaneInstanceId: "ALI-EC-HELD",
  airplaneRegistration: "EC-HELD", phase: "MainTask", phaseElapsedMinutes: 0,
  emissionMinute: 0, slaMinute: 99999, assignedMechanicIds: [], scopeRevealed: true,
}];
for (let i = 0; i < 50; i++) advanceGame(gD, 2); // minuto 100, avión bloqueado y past-due desde 50
const heldMid = findDep(gD, "EC-HELD");
expect(heldMid && heldMid.status !== "Departed", `sigue retenido a mitad (${heldMid?.status})`);
gD.workOrders = []; // liberar
advanceGame(gD, 2); // ahora sí sale
const held = findDep(gD, "EC-HELD");
expect(held && held.status === "Departed", `salió tras liberar (${held?.status})`);
expect(held.delayMinutes >= 50, `retraso REAL preservado >= 50 (got ${held?.delayMinutes})`);
expect(held.delayMinutes >= 2, `retraso real >= step (no aplastado a 0)`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
