// Tests del delay del departure + KPI TDR + AOG escalation — pivot línea pura Fase 1.
// Verifica que:
//  - processDepartures marca Departed cuando llega scheduledDeparture y NO hay WOs Active.
//  - Si hay WO Active, el avión sigue ocupando stand (delay acumula).
//  - delayMinutes computed correctamente al final.
//  - KPI TDR (totalDepartures, sumDelayMinutes, perAirline) se actualiza.
//  - AOG escalation: delay ≥ 180 min marca aogEscalated + cobra penalty + rep delta.

import { createGame, advanceGame } from "../src/lib/game.ts";
import { AOG_DELAY_THRESHOLD_MIN, AOG_ESCALATION_PENALTY_EUR, getTdrGlobal, getTdrForAirline, getTdrPct, getTdrPctForAirline, DISPATCH_COTA_15 } from "../src/lib/types/departureKPI.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind, loadDailyChecksWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));
const dailyChecks = loadDailyChecksWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

console.log("\n=== Constantes ===");
expect(AOG_DELAY_THRESHOLD_MIN === 180, `umbral AOG 180 min / 3h (got ${AOG_DELAY_THRESHOLD_MIN})`);
expect(AOG_ESCALATION_PENALTY_EUR === 10_000, `penalty AOG 10k € (got ${AOG_ESCALATION_PENALTY_EUR})`);

console.log("\n=== createGame inicializa KPI vacío ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  expect(g.departureKPI !== undefined, "g.departureKPI presente");
  expect(g.departureKPI.totalDepartures === 0, "0 departures iniciales");
  expect(g.departureKPI.sumDelayMinutes === 0, "0 delay inicial");
  expect(Object.keys(g.departureKPI.perAirline).length === 0, "perAirline vacío");
  expect(getTdrGlobal(g.departureKPI) === 0, "TDR global = 0 sin departures");
}

console.log("\n=== Departure on-time (sin WO bloqueante) ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1;
  // Forzar un airplane sin WO con scheduledDeparture alineado a un tick exacto:
  // el sim avanza en pasos discretos. Si scheduledDep coincide exactamente con el
  // próximo `next` del tick, processDepartures lo verá puntual (delay=0).
  const STEP = 5;
  g.airplanes.push({
    instanceId: "ALI-TEST-OT",
    registration: "EC-TEST",
    model: "A320",
    engineVariant: "CFM56",
    contractId: g.contracts[0].id,
    standId: "H1-S1",
    arrivalMinute: g.clock.minute,
    scheduledDepartureMinute: g.clock.minute + STEP,
    status: "Idle",
    flightHoursThisLeg: 2,
  });
  advanceGame(g, STEP);
  const ap = g.airplanes.find(a => a.instanceId === "ALI-TEST-OT");
  expect(ap.status === "Departed", `status Departed (got ${ap.status})`);
  expect(ap.actualDepartureMinute !== undefined, `actualDeparture set (got ${ap.actualDepartureMinute})`);
  expect(ap.delayMinutes === 0, `delay = 0 on-time (got ${ap.delayMinutes})`);
  expect(g.departureKPI.totalDepartures === 1, `KPI departures = 1`);
  expect(g.departureKPI.totalReliable === 1, `KPI fiable = 1 (dispatch sin fallo técnico)`);
  expect(g.departureKPI.totalTechFail15 === 0, `KPI fallos D-15 = 0`);
  expect(g.departureKPI.totalAog === 0, `KPI AOG = 0`);
  expect(getTdrPct(g.departureKPI) === 100, `TDR = 100% (1/1 fiable)`);
}

console.log("\n=== Departure con delay (WO bloqueante) ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1;
  // Airplane con scheduledDep inminente
  const baseMin = g.clock.minute;
  g.airplanes.push({
    instanceId: "ALI-TEST-LATE",
    registration: "EC-LATE",
    model: "A320",
    engineVariant: "CFM56",
    contractId: g.contracts[0].id,
    standId: "H1-S1",
    arrivalMinute: baseMin,
    scheduledDepartureMinute: baseMin + 20,
    status: "Idle",
    flightHoursThisLeg: 2,
  });
  // WO active sobre ese avión que dura 60 min (no se completará en 20 min)
  g.workOrders.push({
    instanceId: "WO-TEST-LATE",
    templateId: templates[0].id,
    airplaneInstanceId: "ALI-TEST-LATE",
    airplaneRegistration: "EC-LATE",
    emissionMinute: baseMin,
    slaMinute: baseMin + 60,
    phase: "MainTask",
    phaseElapsedMinutes: 0,
    assignedMechanicIds: [],
  });
  // Avanzar 30 min → scheduledDep pasa, pero WO sigue → no debería marcar Departed aún
  advanceGame(g, 30);
  const ap1 = g.airplanes.find(a => a.instanceId === "ALI-TEST-LATE");
  expect(ap1.status !== "Departed", `aún en stand con WO active (status: ${ap1.status})`);
  expect(ap1.actualDepartureMinute === undefined, "sin actualDeparture todavía");

  // Cerrar la WO manualmente y avanzar otro tick
  g.workOrders = g.workOrders.map(w => w.instanceId === "WO-TEST-LATE" ? { ...w, phase: "Completed" } : w);
  advanceGame(g, 5);
  const ap2 = g.airplanes.find(a => a.instanceId === "ALI-TEST-LATE");
  expect(ap2.status === "Departed", `tras WO Completed → Departed (got ${ap2.status})`);
  expect(ap2.delayMinutes !== undefined && ap2.delayMinutes > 0, `delay > 0 (got ${ap2.delayMinutes})`);
  // Delay ~30min imputable (WO bloqueó al avión) → fallo de dispatch D-15. La WO de este test
  // no tiene mecánico asignado, así que la causa raíz es evitable → cuenta contra el TDR.
  expect(g.departureKPI.totalTechFail15 === 1, `KPI fallo D-15 = 1 (retraso técnico imputable ≥15m)`);
  expect(g.departureKPI.totalReliable === 0, `KPI fiable = 0 (el único departure falló)`);
  expect(g.departureKPI.sumDelayMinutes > 0, `KPI sumDelay imputable > 0 (got ${g.departureKPI.sumDelayMinutes})`);
  expect(getTdrPct(g.departureKPI) === 0, `TDR = 0% (0/1 fiable)`);
  // Per airline bucket
  const bucket = g.departureKPI.perAirline[g.contracts[0].airlineId];
  expect(bucket !== undefined, "bucket aerolínea creado");
  expect(bucket.techFail15 === 1, "bucket fallo D-15 = 1");
}

console.log("\n=== AOG escalation (delay >= 180 min) ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1;
  const balBefore = g.economy.balance;
  const repBefore = g.reputation.perAirline[g.contracts[0].airlineId] ?? 50;
  const baseMin = g.clock.minute;
  g.airplanes.push({
    instanceId: "ALI-AOG",
    registration: "EC-AOG",
    model: "A320",
    engineVariant: "CFM56",
    contractId: g.contracts[0].id,
    standId: "H1-S1",
    arrivalMinute: baseMin,
    scheduledDepartureMinute: baseMin + 10,
    status: "Idle",
    flightHoursThisLeg: 2,
  });
  // WO que se quedará MainTask hasta que la cerramos manualmente
  g.workOrders.push({
    instanceId: "WO-AOG",
    templateId: templates[0].id,
    airplaneInstanceId: "ALI-AOG",
    airplaneRegistration: "EC-AOG",
    emissionMinute: baseMin,
    slaMinute: baseMin + 500,
    phase: "MainTask",
    phaseElapsedMinutes: 0,
    assignedMechanicIds: [],
  });
  // Avanzar suficiente — supera scheduledDep+360min (AOG threshold) → al cerrar WO, será AOG
  advanceGame(g, 400);
  // Cerrar WO y avanzar otro tick
  g.workOrders = g.workOrders.map(w => w.instanceId === "WO-AOG" ? { ...w, phase: "Completed" } : w);
  advanceGame(g, 5);
  const ap = g.airplanes.find(a => a.instanceId === "ALI-AOG");
  expect(ap.status === "Departed", `Departed tras WO close`);
  expect(ap.delayMinutes >= AOG_DELAY_THRESHOLD_MIN, `delay ≥ ${AOG_DELAY_THRESHOLD_MIN} (got ${ap.delayMinutes})`);
  expect(ap.aogEscalated === true, `aogEscalated true`);
  // Pivot 2026-05-25: data real ampliada genera más actividad legacy → puede haber
  // otros AOGs además del forzado. Comprobamos AL MENOS 1 (no exact).
  expect(g.departureKPI.totalAog >= 1, `KPI AOG ≥ 1 (got ${g.departureKPI.totalAog})`);
  // Penalty cobrado — el balance bajó AL MENOS por el AOG evitable ×1.5 = 15000 €.
  const expectedPenalty = Math.round(AOG_ESCALATION_PENALTY_EUR * 1.5);
  expect(g.economy.balance <= balBefore - expectedPenalty, `balance bajó ≥${expectedPenalty} € (got ${balBefore - g.economy.balance})`);
  // Rep delta negativa
  expect(g.reputation.perAirline[g.contracts[0].airlineId] < repBefore, `rep aerolínea bajó`);
}

console.log("\n=== TDR% helpers (Technical Dispatch Reliability) ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  // 4 departures: 3 fiables (sin fallo ≥15m imputable) + 1 fallo D-15. 1 de los fiables
  // igualmente escaló a AOG por causa NO imputable (no rompe TDR pero sí es AOG).
  g.departureKPI.totalDepartures = 4;
  g.departureKPI.totalReliable = 3;
  g.departureKPI.totalTechFail15 = 1;
  g.departureKPI.totalTechFail60 = 0;
  g.departureKPI.totalAog = 1;
  g.departureKPI.sumDelayMinutes = 30; // solo el imputable
  g.departureKPI.perAirline["AL-001"] = { departures: 3, reliable: 2, techFail15: 1, techFail60: 0, aog: 0, aogEvitable: 0, sumDelayMinutes: 30, onTime: 0, late: 0 };
  g.departureKPI.perAirline["AL-002"] = { departures: 1, reliable: 1, techFail15: 0, techFail60: 0, aog: 1, aogEvitable: 0, sumDelayMinutes: 0, onTime: 0, late: 0 };
  expect(getTdrPct(g.departureKPI) === 75, `TDR% global = 3/4 = 75% (got ${getTdrPct(g.departureKPI)})`);
  expect(Math.round(getTdrPctForAirline(g.departureKPI, "AL-001") * 10) / 10 === 66.7, `TDR% AL-001 = 2/3 = 66.7% (got ${getTdrPctForAirline(g.departureKPI, "AL-001")})`);
  expect(getTdrPctForAirline(g.departureKPI, "AL-002") === 100, `TDR% AL-002 = 1/1 = 100%`);
  expect(getTdrPctForAirline(g.departureKPI, "AL-NONE") === 100, `TDR% aerolínea inexistente = 100 (sin datos = fiable)`);
  // delay medio imputable (secundario) sigue disponible
  expect(Math.round(getTdrGlobal(g.departureKPI) * 10) / 10 === 7.5, `delay medio imputable = 30/4 = 7.5 (got ${getTdrGlobal(g.departureKPI)})`);
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
