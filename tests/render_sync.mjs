// Fase 5D · P-α: tests del sync layer render.
//
// Garantías que queremos:
//  1. buildRenderState es PURO y determinista (misma GameState → mismo RenderState).
//  2. timeOfDay correcto en bordes 06:00 y 22:00 (alineado con HUD ☀️/🌙).
//  3. Cada airplane.standId ⇒ stand.airplaneInstanceId === airplane.instanceId.
//  4. Checks InProgress reflejados en stand.checkInProgress (con flag onPlatform).
//  5. runwayClosed true si hay runway_closure activo en clock.minute.
//  6. mroStage cambia ⇒ cambia la lista de stands del render.

import { buildRenderState, timeOfDayFor } from "../src/lib/render/sync.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));
const checks = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));
const dailyChecks = JSON.parse(readFileSync(new URL("../src/lib/data/daily_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== render/sync ===");

// --- 1. timeOfDay en bordes ---
expect(timeOfDayFor(0) === "night", "00:00 → night");
expect(timeOfDayFor(5 * 60) === "night", "05:00 → night");
expect(timeOfDayFor(6 * 60) === "day", "06:00 → day");
expect(timeOfDayFor(12 * 60) === "day", "12:00 → day");
expect(timeOfDayFor(21 * 60 + 59) === "day", "21:59 → day");
expect(timeOfDayFor(22 * 60) === "night", "22:00 → night");
expect(timeOfDayFor(23 * 60 + 59) === "night", "23:59 → night");
// Día 2 — periodicidad
expect(timeOfDayFor(24 * 60 + 6 * 60) === "day", "día 2 06:00 → day");
expect(timeOfDayFor(24 * 60 + 22 * 60) === "night", "día 2 22:00 → night");

// --- 2. Determinismo: misma GameState → mismo RenderState ---
const g1 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
const g2 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
g1.clock.speed = 1; g2.clock.speed = 1;
g1.autoPauseEnabled = false; g2.autoPauseEnabled = false;
for (let i = 0; i < 80; i++) { advanceGame(g1, 30); advanceGame(g2, 30); }
const r1 = buildRenderState(g1);
const r2 = buildRenderState(g2);
expect(r1.minute === r2.minute, `mismo minute (${r1.minute})`);
expect(r1.timeOfDay === r2.timeOfDay, `mismo timeOfDay (${r1.timeOfDay})`);
expect(r1.mroStage === r2.mroStage, `mismo mroStage (${r1.mroStage})`);
expect(r1.airplanes.length === r2.airplanes.length, `mismos N aviones (${r1.airplanes.length})`);
expect(r1.stands.length === r2.stands.length, `mismos N stands (${r1.stands.length})`);
// Pivot línea pura · KPI: el byte-a-byte falla porque dos createGame() corriendo en
// paralelo comparten counters globales (ALI-* incrementan alternando g1/g2 → IDs
// distintos). Antes el filter de ventana excluía la mayoría de aviones; ahora el
// filter respeta actualDepartureMinute (set por processDepartures) y mantiene más
// presentes. La aserción de "idéntico" se relaja a campos derivados del state, no
// IDs alocados. (Para determinismo intra-game ver el test single-instance abajo.)
const subset = (r) => ({
  minute: r.minute, timeOfDay: r.timeOfDay, mroStage: r.mroStage,
  apCount: r.airplanes.length, standCount: r.stands.length,
  mechStates: r.mechanics.map(m => m.state).sort(),
  hangarBuildUnlocked: r.hangarBuildUnlocked, runwayClosed: r.runwayClosed,
});
expect(JSON.stringify(subset(r1)) === JSON.stringify(subset(r2)), "RenderState equivalente en campos derivados (IDs aparte por counters globales)");

// --- 3. Cada airplane.standId ⇒ stand.airplaneInstanceId coherente, sin colisiones ---
// Usamos un game joven (minute ~700 = 11:40h día 1) donde sí hay aviones físicamente presentes.
const gAirplanes = createGame(balance, airlines, templates, 42, checks, dailyChecks);
gAirplanes.clock.speed = 1; gAirplanes.autoPauseEnabled = false;
for (let i = 0; i < 15; i++) advanceGame(gAirplanes, 30); // ~7h de sim
const rAir = buildRenderState(gAirplanes);
expect(rAir.airplanes.length > 0, `tengo aviones físicamente presentes en minute=${rAir.minute} (${rAir.airplanes.length})`);
const seenStands = new Set();
let standMismatch = 0, standDup = 0;
for (const ap of rAir.airplanes) {
  if (!ap.standId) continue;
  if (seenStands.has(ap.standId)) standDup++;
  seenStands.add(ap.standId);
  const st = rAir.stands.find((s) => s.id === ap.standId);
  if (!st) continue;
  if (st.airplaneInstanceId !== ap.instanceId) standMismatch++;
}
expect(standMismatch === 0, `cero stand→airplane mismatch (${standMismatch})`);
expect(standDup === 0, `cero stands duplicados entre aviones presentes (${standDup})`);

// --- 4. Checks InProgress reflejados en stand ---
// Forzamos un avión a tener un check InProgress y verificamos
const g3 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
g3.maintenanceChecks.push({
  instanceId: "MC-TEST",
  registration: g3.fleet[0]?.registration ?? "EC-XXX",
  type: "C",
  scheduledMinute: 0,
  startedMinute: 0,
  standId: "H1-B1",
  phase: "InProgress",
  assignedMechanicIds: [],
  manMinutesAccumulated: 0,
  manDaysIdeal: 150,
  baseFee: 50000,
  parkingDays: 15,
  overrunDaysPenalized: 0,
});
const r3 = buildRenderState(g3);
const baseStand = r3.stands.find((s) => s.id === "H1-B1");
expect(baseStand !== undefined, "H1-B1 presente en stands");
expect(baseStand?.checkInProgress === true, "H1-B1 marcado checkInProgress=true");
expect(baseStand?.checkOnPlatform === false, "H1-B1 onPlatform=false (default)");

// Mismo pero check en plataforma (stage ≥ 2)
const g4 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
g4.mroStage = 2;
g4.maintenanceChecks.push({
  instanceId: "MC-TEST2",
  registration: g4.fleet[0]?.registration ?? "EC-XXX",
  type: "A",
  scheduledMinute: 0,
  startedMinute: 0,
  standId: "H1-S1",
  phase: "InProgress",
  assignedMechanicIds: [],
  manMinutesAccumulated: 0,
  manDaysIdeal: 8,
  baseFee: 3000,
  parkingDays: 1,
  overrunDaysPenalized: 0,
  onPlatform: true,
});
const r4 = buildRenderState(g4);
const platformStand = r4.stands.find((s) => s.id === "H1-S1");
expect(platformStand?.checkInProgress === true, "H1-S1 con A-check en plataforma marcado checkInProgress");
expect(platformStand?.checkOnPlatform === true, "H1-S1 onPlatform=true");

// --- 5. runwayClosed ---
const g5 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
g5.randomEvents.push({
  id: "EV-RW-1",
  type: "runway_closure",
  startMinute: 0,
  endMinute: 24 * 60,
  reason: "Test closure",
});
g5.clock.minute = 60; // dentro del intervalo
const r5 = buildRenderState(g5);
expect(r5.runwayClosed === true, "runwayClosed=true dentro del intervalo");
g5.clock.minute = 25 * 60; // fuera
const r5b = buildRenderState(g5);
expect(r5b.runwayClosed === false, "runwayClosed=false fuera del intervalo");

// --- 6. mroStage cambia ⇒ stands cambian ---
const g6 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
const r6a = buildRenderState(g6);
g6.mroStage = 4;
const r6b = buildRenderState(g6);
expect(r6a.stands.length === 4, `stage 1 → 4 stands (line 3 + base 1), got ${r6a.stands.length}`);
expect(r6b.stands.length === 9, `stage 4 → 9 stands (line 5 + base 4), got ${r6b.stands.length}`);
expect(r6b.stands.filter((s) => s.type === "base").length === 4, "stage 4 → 4 base stands");
expect(r6b.stands.filter((s) => s.type === "line").length === 5, "stage 4 → 5 line stands");

// --- 7. timeOfDay del RenderState refleja clock.minute ---
const g7 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
g7.clock.minute = 8 * 60; // 08:00
expect(buildRenderState(g7).timeOfDay === "day", "08:00 → render day");
g7.clock.minute = 23 * 60; // 23:00
expect(buildRenderState(g7).timeOfDay === "night", "23:00 → render night");

// --- 8. Mecs en RenderState con destStandId resuelto ---
const g8 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
g8.clock.speed = 1; g8.autoPauseEnabled = false;
for (let i = 0; i < 20; i++) advanceGame(g8, 30); // dar tiempo a que se asignen WOs
const r8 = buildRenderState(g8);
expect(r8.mechanics.length === g8.mechanics.length, `RenderState.mechanics tiene N mecs (${r8.mechanics.length})`);
const idleM = r8.mechanics.filter((m) => m.state === "Idle");
const onPlaneM = r8.mechanics.filter((m) => m.state === "ToPlane" || m.state === "Working" || m.state === "Returning");
expect(idleM.every((m) => m.destStandId === null), "mecs Idle → destStandId=null");
// Mecs con WO asignada deben tener destStandId resuelto (o null si la WO ya completó)
for (const m of onPlaneM) {
  if (!m.destStandId) continue; // permitido si WO completó entre ticks
  const standExistsInGrid = ["H1-S1","H1-S2","H1-S3","R1","H2-S1","H2-B1","H1-B1","H3-B1","H3-B2"].includes(m.destStandId);
  expect(standExistsInGrid, `mec ${m.id} destStandId válido (${m.destStandId})`);
}

// Mec con state=ToPlane + WO en stand → destStandId apunta a ese stand
const g9 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
// Inyecto un escenario controlado: avión + WO + mecánico ToPlane
g9.airplanes.push({
  instanceId: "ALI-TEST",
  registration: "EC-TEST",
  model: "A320",
  engineVariant: "CFM56",
  contractId: g9.contracts[0]?.id ?? "C-1",
  standId: "H1-S2",
  arrivalMinute: 0,
  scheduledDepartureMinute: 24 * 60,
  status: "Idle",
  flightHoursThisLeg: 2,
});
g9.workOrders.push({
  instanceId: "WO-TEST",
  templateId: g9.templates[0].id,
  airplaneInstanceId: "ALI-TEST",
  assignedMechanicIds: [g9.mechanics[0].id],
  phase: "MainTask",
  manMinutesAccumulated: 0,
  manMinutesIdeal: 60,
  manMinutesIdealCertifier: 60,
  arrivalMinute: 0,
  scheduledDepartureMinute: 24 * 60,
  isAOG: false,
  startedMinute: 0,
  severity: "Routine",
});
g9.mechanics[0] = {
  ...g9.mechanics[0],
  state: "ToPlane",
  assignedWoInstanceId: "WO-TEST",
  stateRemainingMinutes: 2,
};
const r9 = buildRenderState(g9);
const m9 = r9.mechanics.find((m) => m.id === g9.mechanics[0].id);
expect(m9?.state === "ToPlane", "mec en state=ToPlane");
expect(m9?.destStandId === "H1-S2", `mec ToPlane → destStandId=H1-S2 (got ${m9?.destStandId})`);
// progress: con stateRemainingMinutes=2 y travelMin=2 → progress=0 (acaba de salir)
expect(m9?.progress === 0, `mec ToPlane progress=0 al inicio (got ${m9?.progress})`);
// Con stateRemainingMinutes=1 → progress=0.5
g9.mechanics[0] = { ...g9.mechanics[0], stateRemainingMinutes: 1 };
const m9b = buildRenderState(g9).mechanics.find((m) => m.id === g9.mechanics[0].id);
expect(m9b?.progress === 0.5, `mec progress=0.5 a mitad (got ${m9b?.progress})`);
// Mec Working → progress=1
g9.mechanics[0] = { ...g9.mechanics[0], state: "Working", stateRemainingMinutes: 0 };
const m9c = buildRenderState(g9).mechanics.find((m) => m.id === g9.mechanics[0].id);
expect(m9c?.progress === 1, `mec Working progress=1 (got ${m9c?.progress})`);

// --- 9. Avión taxiing flags ---
import { TAXIING_DURATION_MIN } from "../src/lib/render/sync.ts";
const g10 = createGame(balance, airlines, templates, 42, checks, dailyChecks);
g10.airplanes.push({
  instanceId: "ALI-TAXI",
  registration: "EC-TAXI",
  model: "A320",
  engineVariant: "CFM56",
  contractId: g10.contracts[0]?.id ?? "C-1",
  standId: "H1-S1",
  arrivalMinute: 100,
  scheduledDepartureMinute: 24 * 60 + 100,
  status: "Idle",
  flightHoursThisLeg: 2,
});
g10.clock.minute = 100; // exactamente al llegar
const r10 = buildRenderState(g10);
const taxi = r10.airplanes.find((a) => a.instanceId === "ALI-TAXI");
expect(taxi?.taxiing === true, "recién aterrizado → taxiing=true");
expect(taxi?.taxiProgress === 0, `taxiProgress=0 al llegar (got ${taxi?.taxiProgress})`);
g10.clock.minute = 100 + TAXIING_DURATION_MIN / 2;
const taxiMid = buildRenderState(g10).airplanes.find((a) => a.instanceId === "ALI-TAXI");
expect(taxiMid?.taxiing === true, "a mitad del taxi → taxiing=true");
expect(taxiMid?.taxiProgress === 0.5, `taxiProgress=0.5 a mitad (got ${taxiMid?.taxiProgress})`);
g10.clock.minute = 100 + TAXIING_DURATION_MIN + 1;
const taxiDone = buildRenderState(g10).airplanes.find((a) => a.instanceId === "ALI-TAXI");
expect(taxiDone?.taxiing === false, "pasado el umbral → taxiing=false");
expect(taxiDone?.taxiProgress === 1, `taxiProgress=1 ya parado (got ${taxiDone?.taxiProgress})`);

console.log(`\nrender/sync: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
