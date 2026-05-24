// H4-H7 end-to-end: catálogo de stands con tipos, tick del check, billing al completar,
// penalty por overrun. Test al estilo "playthrough corto" con flota forzada cerca del trigger.

import { STANDS, LINE_STAND_IDS, BASE_STAND_IDS, standType } from "../src/lib/sim/stands.ts";
import { INITIAL_STANDS } from "../src/lib/sim/airplanes.ts";
import {
  tickMaintenanceChecks,
  scheduleDueChecks,
  scheduleCheck,
  MANDAY_MINUTES,
  LATE_CHECK_PENALTY_PER_DAY,
  resetMaintenanceCheckCounter,
} from "../src/lib/sim/maintenance.ts";
import { generateInitialFleet, resetAirplaneInstanceCounter } from "../src/lib/sim/fleet.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

// === H4+H5: stand catalog ===
console.log("\n=== H4+H5: stand catalog ===");
expect(STANDS.length === 4, `4 stands total (got ${STANDS.length})`);
expect(LINE_STAND_IDS.length === 3, `3 line stands (got ${LINE_STAND_IDS.length})`);
expect(BASE_STAND_IDS.length === 1, `1 base stand (got ${BASE_STAND_IDS.length})`);
expect(standType("H1-S1") === "line", "H1-S1 = line");
expect(standType("H1-B1") === "base", "H1-B1 = base");
expect(standType("noexiste") === undefined, "stand desconocido = undefined");
expect(INITIAL_STANDS.length === 3 && !INITIAL_STANDS.includes("H1-B1"),
  "INITIAL_STANDS (line landings) NO incluye base stand");

// === H6: tick scheduled → in progress + completion ===
console.log("\n=== H6: lifecycle Scheduled → InProgress → Completed ===");
resetAirplaneInstanceCounter(0);
resetMaintenanceCheckCounter(0);
const g = createGame(balance, airlines, templates, 42, defs);

// Forzar un A-check Scheduled directamente sobre el primer avión de la flota
const reg = g.fleet[0].registration;
const model = g.fleet[0].model;
g.maintenanceChecks.push(scheduleCheck(reg, "A", model, defs, 0));
g.clock.speed = 1;
g.autoPauseEnabled = false;
g.shiftGatingEnabled = false; // Fase 4: test asume mecánicos siempre disponibles (legacy throughput)

// Manualmente liberar 1 mecánico para que el check pueda asignarse (todos arrancan Idle ya)
// Hacer un tick — el check Scheduled debería transicionar a InProgress
{
  const before = g.maintenanceChecks[0];
  expect(before.phase === "Scheduled", "antes del tick: Scheduled");
}

advanceGame(g, 5);

{
  const c = g.maintenanceChecks[0];
  expect(c.phase === "InProgress", `tras 1 tick: InProgress (got ${c.phase})`);
  expect(c.standId === "H1-B1", `ocupa BaseStand H1-B1 (got ${c.standId})`);
  expect(c.assignedMechanicIds.length >= 1, `team asignado (got ${c.assignedMechanicIds.length})`);
  expect(c.startedMinute !== undefined, "startedMinute marcado");
  // Los mecánicos asignados están Working + assignedCheckInstanceId
  const teamMechs = g.mechanics.filter(m => c.assignedMechanicIds.includes(m.id));
  expect(teamMechs.every(m => m.state === "Working"), "todos los del team en Working");
  expect(teamMechs.every(m => m.assignedCheckInstanceId === c.instanceId), "assignedCheckInstanceId set");
  expect(teamMechs.every(m => m.assignedWoInstanceId === null), "assignedWoInstanceId limpio");
}

// Avanzar lo suficiente para completar — A check needs 2 manDays × 1440 = 2880 min de trabajo
// Con N mecánicos asignados, completa en 2880/N min. Y parking ≥ 1440 min. Lo que más tarde manda.
// Avanzo 3 días para asegurar (puede haber overrun si pocos mecánicos).
const balanceBefore = g.economy.balance;
const fhBefore = g.fleet[0].fhSinceLastA;
while (g.clock.minute < 5 * DAY_MINUTES && g.maintenanceChecks[0].phase !== "Completed") {
  advanceGame(g, 30);
}
{
  const c = g.maintenanceChecks[0];
  expect(c.phase === "Completed", `check completado en ≤ 5 días (got ${c.phase})`);
  expect(c.completedMinute !== undefined, "completedMinute marcado");
  expect(c.manMinutesAccumulated >= c.manDaysIdeal * MANDAY_MINUTES, `manMinutes ≥ ${c.manDaysIdeal * MANDAY_MINUTES} (got ${c.manMinutesAccumulated})`);
  // Mecánicos liberados a Idle
  const teamMechs = g.mechanics.filter(m => c.assignedMechanicIds.includes(m.id));
  expect(teamMechs.every(m => m.state === "Idle"), "team liberado a Idle");
  expect(teamMechs.every(m => m.assignedCheckInstanceId === null), "assignedCheckInstanceId limpio tras Completed");
  // Fleet counters reseteados
  const updatedFA = g.fleet.find(f => f.registration === reg);
  expect(updatedFA.fhSinceLastA === 0 && updatedFA.cyclesSinceLastA === 0,
    `fhSinceLastA y cyclesSinceLastA reseteados a 0 (fh=${updatedFA.fhSinceLastA}, cycles=${updatedFA.cyclesSinceLastA}; antes ${fhBefore})`);
  // === H7: billing ===
  console.log("\n=== H7: billing ===");
  const feeAdded = g.economy.balance - balanceBefore;
  const feeTxs = g.economy.ledger.filter(t => t.type === "maintenanceCheckFee");
  expect(feeTxs.length === 1 && feeTxs[0].amount === c.baseFee,
    `1 transacción maintenanceCheckFee = ${c.baseFee} € (got count=${feeTxs.length} amount=${feeTxs[0]?.amount})`);
  expect(feeAdded >= c.baseFee - 50000, `balance creció al menos por la fee (delta=${feeAdded})`);
}

// === H6 (cont): segundo check sobre la misma matrícula post-Completed ===
console.log("\n=== H6: re-detección tras Completed ===");
// Forzar contadores otra vez por encima del trigger A
g.fleet = g.fleet.map(f => f.registration === reg ? { ...f, fhSinceLastA: 700, cyclesSinceLastA: 250 } : f);
const beforeChecks = g.maintenanceChecks.length;
const due = scheduleDueChecks(g.fleet, defs, g.maintenanceChecks, g.clock.minute);
expect(due.newlyScheduled.length === 1, "Completed previo no bloquea nuevo schedule");
expect(due.checks.length === beforeChecks + 1, "checks combinados +1");

// === H7: overrun penalty ===
console.log("\n=== H7: overrun penalty (1 mecánico en C-check) ===");
// Caso: C check con manDays=60 pero solo 1 mecánico → overrun grande.
// Test focalizado: arrancamos un C check con team forzado de 1 mecánico y medimos penalty.
resetAirplaneInstanceCounter(0);
resetMaintenanceCheckCounter(0);
const g2 = createGame(balance, airlines, templates, 42, defs);
const reg2 = g2.fleet[0].registration;
const model2 = g2.fleet[0].model;
g2.maintenanceChecks.push(scheduleCheck(reg2, "C", model2, defs, 0));
// Poner el resto de mecánicos "Working" en un WO falso para que solo 1 quede Idle
for (let i = 1; i < g2.mechanics.length; i++) {
  g2.mechanics[i].state = "Working";
  g2.mechanics[i].assignedWoInstanceId = "fake";
}
g2.clock.speed = 1;
g2.autoPauseEnabled = false;
g2.shiftGatingEnabled = false; // Fase 4: legacy throughput
// Tick para arrancar el check
advanceGame(g2, 5);
const c2 = g2.maintenanceChecks[0];
expect(c2.phase === "InProgress" && c2.assignedMechanicIds.length === 1,
  `C-check arranca con 1 mecánico (team=${c2.assignedMechanicIds.length})`);
// Avanzar 18 días (parking 14 + 4 de overrun)
const targetMinute = 18 * DAY_MINUTES;
while (g2.clock.minute < targetMinute && g2.maintenanceChecks[0].phase === "InProgress") {
  advanceGame(g2, 60);
}
const c2After = g2.maintenanceChecks[0];
expect(c2After.overrunDaysPenalized > 0, `penalizaron días de overrun (got ${c2After.overrunDaysPenalized})`);
const penaltyTxs = g2.economy.ledger.filter(t => t.type === "maintenanceCheckPenalty");
expect(penaltyTxs.length === c2After.overrunDaysPenalized,
  `1 penalty tx por día overrun (got ${penaltyTxs.length} vs ${c2After.overrunDaysPenalized})`);
expect(penaltyTxs.every(t => t.amount === -LATE_CHECK_PENALTY_PER_DAY),
  `cada penalty = -${LATE_CHECK_PENALTY_PER_DAY} €`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
