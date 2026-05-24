// Tests del round-trip Save→Load + continuidad determinista.

import { serializeGame, deserializeGame } from "../src/lib/sim/save.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { InMemoryBackend, setStorage } from "../src/lib/sim/storage.ts";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/save ===");

// 1. Serialize/deserialize devuelve un game equivalente
const g1 = createGame(balance, airlines, templates, 42);
g1.clock.speed = 1;
g1.autoPauseEnabled = false;
for (let i = 0; i < 50; i++) advanceGame(g1, 30);

const payload = serializeGame(g1);
expect(payload.version === 10, "version=10 (pivot línea pura · KPI departures)");
expect(typeof payload.savedAt === "string", "savedAt presente");
expect(payload.clock.minute === g1.clock.minute, `minuto guardado coincide (${payload.clock.minute})`);
expect(payload.contracts.length === g1.contracts.length, "contratos guardados");
expect(payload.mechanics.length === g1.mechanics.length, "mecánicos guardados");
expect(Array.isArray(payload.fleet) && payload.fleet.length > 0, `fleet guardada (${payload.fleet.length} matrículas)`);
expect(typeof payload.aliCounter === "number" && payload.aliCounter > 0, `aliCounter guardado (${payload.aliCounter})`);

const g2 = deserializeGame(payload, balance, airlines, templates);
expect(g2.clock.minute === g1.clock.minute, "minuto restaurado");
expect(g2.economy.balance === g1.economy.balance, `balance restaurado (${g2.economy.balance})`);
expect(g2.reputation.value === g1.reputation.value, "reputación restaurada");
expect(g2.workOrders.length === g1.workOrders.length, "workOrders restauradas");
expect(g2.airplanes.length === g1.airplanes.length, "aviones restaurados");
expect(g2.fleet.length === g1.fleet.length, "fleet restaurada");
expect(g2.fleet[0].totalCycles === g1.fleet[0].totalCycles, "FH/cycles fleet preservados");
expect(g2.rng.state === g1.rng.state, `rng state restaurado (${g2.rng.state})`);

// 2. Continuidad determinista: 10 ticks más en g1 y g2 dan mismo resultado
g1.clock.speed = 1; g2.clock.speed = 1;
g1.autoPauseEnabled = false; g2.autoPauseEnabled = false;
for (let i = 0; i < 10; i++) {
  advanceGame(g1, 20);
  advanceGame(g2, 20);
}
expect(g1.economy.balance === g2.economy.balance, `continuidad balance (g1=${g1.economy.balance}, g2=${g2.economy.balance})`);
expect(g1.reputation.value === g2.reputation.value, "continuidad reputación");
expect(g1.workOrders.length === g2.workOrders.length, `continuidad WOs (g1=${g1.workOrders.length}, g2=${g2.workOrders.length})`);
expect(g1.airplanes.length === g2.airplanes.length, "continuidad aviones");

// 3. Storage in-memory: save+load round-trip
console.log("\n=== sim/storage (InMemory) ===");
const backend = new InMemoryBackend();
setStorage(backend);

expect(!(await backend.hasSave()), "slot vacío inicialmente");
await backend.save(serializeGame(g1));
expect(await backend.hasSave(), "tras save, hasSave true");

const loaded = await backend.load();
expect(loaded !== null && loaded.clock.minute === g1.clock.minute, "load devuelve mismo minuto");

const g3 = deserializeGame(loaded, balance, airlines, templates);
expect(g3.economy.balance === g1.economy.balance, "g3 (load) === g1");

await backend.clear();
expect(!(await backend.hasSave()), "tras clear, vacío");

// 4. Version mismatch rejection
console.log("\n=== version guard ===");
const badPayload = { ...serializeGame(g1), version: 999 };
let threw = false;
try { deserializeGame(badPayload, balance, airlines, templates); } catch { threw = true; }
expect(threw, "version mismatch arroja error");

// 5. v7: Fase 5 fields round-trip
console.log("\n=== v7 Fase 5 fields round-trip ===");
const p5 = serializeGame(g1);
expect(typeof p5.mroStage === "number", `mroStage en payload (got ${p5.mroStage})`);
expect(typeof p5.shiftGatingEnabled === "boolean", `shiftGatingEnabled (got ${p5.shiftGatingEnabled})`);
expect(typeof p5.autoAssignEnabled === "boolean", `autoAssignEnabled (got ${p5.autoAssignEnabled})`);
expect(Array.isArray(p5.kpiHistory), `kpiHistory array`);
expect(Array.isArray(p5.randomEvents), `randomEvents array`);
expect(typeof p5.eventsRolledForDay === "number", `eventsRolledForDay`);
expect(p5.activeBuild === null || (p5.activeBuild && p5.activeBuild.targetStage), `activeBuild null|valid`);

// Modificar valores y re-roundtrip
g1.mroStage = 3;
g1.activeBuild = { targetStage: 4, completionMinute: 50000, startedAtMinute: 30000 };
g1.kpiHistory = [{ week: 1, balance: 200000, repAvg: 60, woCompleted: 10, woLate: 2, woFailed: 0, complianceScore: 80, mechanicsCount: 7 }];
g1.randomEvents = [{ id: "EV-X", type: "runway_closure", startMinute: 1000, endMinute: 1300, reason: "test" }];
g1.eventsRolledForDay = 5;
g1.shiftGatingEnabled = false;
g1.autoAssignEnabled = true;
// Marcar mec con overtimeOriginalShift
g1.mechanics[0].overtimeOriginalShift = "morning";
g1.mechanics[0].hiredAtMinute = 1000;

const p5b = serializeGame(g1);
const g5 = deserializeGame(p5b, balance, airlines, templates);
expect(g5.mroStage === 3, `mroStage preservado (got ${g5.mroStage})`);
expect(g5.activeBuild && g5.activeBuild.targetStage === 4, `activeBuild preservado`);
expect(g5.kpiHistory.length === 1 && g5.kpiHistory[0].balance === 200000, `kpiHistory preservado`);
expect(g5.randomEvents.length === 1 && g5.randomEvents[0].id === "EV-X", `randomEvents preservado`);
expect(g5.eventsRolledForDay === 5, `eventsRolledForDay preservado`);
expect(g5.shiftGatingEnabled === false, `shiftGatingEnabled preservado`);
expect(g5.autoAssignEnabled === true, `autoAssignEnabled preservado`);
expect(g5.mechanics[0].overtimeOriginalShift === "morning", `overtimeOriginalShift en mec preservado`);
expect(g5.mechanics[0].hiredAtMinute === 1000, `hiredAtMinute preservado`);

// 6. v6 backward compat: payload sin campos F5 → defaults
console.log("\n=== v6 backward compat migration ===");
const p6 = { ...serializeGame(g1), version: 6 };
delete p6.mroStage;
delete p6.activeBuild;
delete p6.kpiHistory;
delete p6.randomEvents;
delete p6.eventsRolledForDay;
delete p6.shiftGatingEnabled;
delete p6.autoAssignEnabled;
const g6 = deserializeGame(p6, balance, airlines, templates);
expect(g6.mroStage === 1, `v6 → mroStage default 1 (got ${g6.mroStage})`);
expect(g6.activeBuild === null, `v6 → activeBuild null`);
expect(Array.isArray(g6.kpiHistory) && g6.kpiHistory.length === 0, `v6 → kpiHistory []`);
expect(Array.isArray(g6.randomEvents) && g6.randomEvents.length === 0, `v6 → randomEvents []`);
expect(g6.eventsRolledForDay === 0, `v6 → eventsRolledForDay 0`);
expect(g6.shiftGatingEnabled === true, `v6 → shiftGatingEnabled default true`);
expect(g6.autoAssignEnabled === false, `v6 → autoAssignEnabled default false`);

// F5D · v7 backward compat: save legacy v7 sin useScheduleArrivals → default false en v8
console.log("\n=== sim/save · v7 backward compat (F5D) ===");
const v7Payload = { ...payload, version: 7 };
delete v7Payload.useScheduleArrivals;
const gV7 = deserializeGame(v7Payload, balance, airlines, templates);
expect(gV7.useScheduleArrivals === false, `v7 sin flag → default false en v8 (got ${gV7.useScheduleArrivals})`);

// v8 round-trip con flag true
const gWithSchedule = createGame(balance, airlines, templates, 42);
gWithSchedule.useScheduleArrivals = true;
const v8Payload = serializeGame(gWithSchedule);
expect(v8Payload.version === 10, "v10 al serializar (incluye departureKPI)");
expect(v8Payload.useScheduleArrivals === true, "v8 preserva flag true");
const gV8 = deserializeGame(v8Payload, balance, airlines, templates);
expect(gV8.useScheduleArrivals === true, "v8 round-trip preserva flag");

// Save v7 → v8 con flag preservado si existe en payload
const v7WithFlag = { ...payload, version: 7, useScheduleArrivals: true };
const gV7WithFlag = deserializeGame(v7WithFlag, balance, airlines, templates);
expect(gV7WithFlag.useScheduleArrivals === true, "v7 con flag → respetar (forward-compat reading)");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
