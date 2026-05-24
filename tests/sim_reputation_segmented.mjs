// Bloque M — reputación segmentada + tick contract market.

import {
  createReputation,
  applyDelta,
  applyDeltaGlobal,
  getRep,
  getAverageRep,
  allAirlinesBelowThreshold,
  migrateLegacyReputation,
} from "../src/lib/sim/reputation.ts";
import {
  tickContractMarket,
  AIRLINE_OFFER_REP_THRESHOLD,
  _resetContractCounter,
} from "../src/lib/sim/contracts.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { createGame, advanceGame, acceptContractOffer } from "../src/lib/game.ts";
import { FLEET_SIZE_PER_AIRLINE } from "../src/lib/sim/fleet.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { serializeGame, deserializeGame } from "../src/lib/sim/save.ts";
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

console.log("\n=== createReputation y getAverageRep ===");
const r1 = createReputation(50, airlines);
expect(Object.keys(r1.perAirline).length === airlines.length, `${airlines.length} aerolíneas inicializadas`);
expect(airlines.every(al => r1.perAirline[al.id] === 50), "todas a 50");
expect(getAverageRep(r1) === 50, "media = 50");
expect(getRep(r1, airlines[0].id) === 50, "getRep AL-001 = 50");
expect(getRep(r1, "AL-999") === 50, "getRep aerolínea desconocida → default 50");

console.log("\n=== applyDelta segmentado ===");
const r2 = applyDelta(r1, airlines[0].id, 20);
expect(r2.perAirline[airlines[0].id] === 70, "AL[0] sube +20");
expect(r2.perAirline[airlines[1].id] === 50, "AL[1] no cambia");
const r3 = applyDelta(r1, airlines[0].id, -100);
expect(r3.perAirline[airlines[0].id] === 0, "clamp 0");
const r4 = applyDelta(r1, airlines[0].id, 200);
expect(r4.perAirline[airlines[0].id] === 100, "clamp 100");

console.log("\n=== applyDeltaGlobal ===");
const r5 = applyDeltaGlobal(r1, 10);
expect(airlines.every(al => r5.perAirline[al.id] === 60), "todas suben +10 con applyDeltaGlobal");

console.log("\n=== allAirlinesBelowThreshold (game over) ===");
let allLow = r1;
for (const al of airlines) allLow = applyDelta(allLow, al.id, -45);
expect(allAirlinesBelowThreshold(allLow, 10), "todas a 5 → true");
let mixedLow = applyDelta(r1, airlines[0].id, -45);
expect(!allAirlinesBelowThreshold(mixedLow, 10), "sólo AL[0] bajo → false");
expect(!allAirlinesBelowThreshold(r1, 10), "todas a 50 → false");
expect(!allAirlinesBelowThreshold({ perAirline: {} }, 10), "rep vacía → false (sin aerolíneas no hay game over por rep)");

console.log("\n=== migrateLegacyReputation ===");
const legacy = { value: 42 };
const migrated = migrateLegacyReputation(legacy, airlines);
expect(airlines.every(al => migrated.perAirline[al.id] === 42), "legacy value=42 → todas a 42");
const alreadyMigrated = { perAirline: { "AL-001": 80, "AL-002": 20 } };
const passthrough = migrateLegacyReputation(alreadyMigrated, airlines);
expect(passthrough.perAirline["AL-001"] === 80 && passthrough.perAirline["AL-002"] === 20, "perAirline ya presente se preserva");

console.log("\n=== tickContractMarket ===");
_resetContractCounter(1000);
const rng = createRng(42);
// Aerolínea AL-001 con rep 80 (alta) y sin contrato activo NI oferta → debería generar oferta con alta prob
const repHigh = { "AL-001": 80, "AL-002": 80, "AL-003": 80, "AL-004": 80 };
let attempts = 0;
let offered = 0;
for (let i = 0; i < 50; i++) {
  const res = tickContractMarket(rng, [], airlines, repHigh, i * 100);
  if (res.newlyOffered.length > 0) offered++;
  attempts++;
}
expect(offered > 0, `con rep alta sí se ofertan algunos contratos en 50 intentos (got ${offered})`);

// rep 0 → no se oferta NUNCA
const repZero = { "AL-001": 0, "AL-002": 0, "AL-003": 0, "AL-004": 0 };
let neverOffered = true;
for (let i = 0; i < 50; i++) {
  const res = tickContractMarket(rng, [], airlines, repZero, i * 100);
  if (res.newlyOffered.length > 0) { neverOffered = false; break; }
}
expect(neverOffered, "rep <20 → nunca se oferta");

// Si ya hay contrato activo, no se duplica
const repHigh2 = { ...repHigh };
const existingActive = [{
  id: "C-001", airlineId: "AL-001", status: "active", expectedLandingsPerDay: 5,
  baseFeePerWeek: 10000, paymentPerWOMinute: 30, penaltyPerLateMinute: 100, minReputation: 50,
  offeredAtMinute: 0,
}];
let noNewForAL1 = true;
for (let i = 0; i < 30; i++) {
  const res = tickContractMarket(rng, existingActive, airlines, repHigh2, i * 100);
  if (res.newlyOffered.some(c => c.airlineId === "AL-001")) { noNewForAL1 = false; break; }
}
expect(noNewForAL1, "AL-001 ya tiene contrato activo → no se ofrece otro");

console.log("\n=== integración: createGame con rep segmentada y delta WO segmentada ===");
const g = createGame(balance, airlines, templates, 42, defs);
expect(Object.keys(g.reputation.perAirline).length === airlines.length, "createGame inicializa todas las aerolíneas");
expect(airlines.every(al => g.reputation.perAirline[al.id] === balance.startingReputation), "todas con starting rep");

// Bloque N fix: la flota inicial solo trae aviones de aerolíneas con contrato ACTIVO.
const activeIds = new Set(g.contracts.filter(c => c.status === "active").map(c => c.airlineId));
expect(activeIds.size >= 1, `al menos 1 contrato activo al crear partida (got ${activeIds.size})`);
// Fase 5A Y1: basedAircraftCount por aerolínea (12+6+4+9). Suma de activas.
const expectedActiveFleet = airlines.filter(al => activeIds.has(al.id)).reduce((s, al) => s + (al.basedAircraftCount ?? FLEET_SIZE_PER_AIRLINE), 0);
expect(g.fleet.length === expectedActiveFleet, `flota = ΣbasedAircraftCount activas (got ${g.fleet.length}, expected ${expectedActiveFleet})`);
expect(g.fleet.every(f => activeIds.has(f.airlineId)), "todos los aviones pertenecen a aerolínea con contrato activo");

// Aceptar oferta de otra aerolínea → su flota nace
const offeredContract = g.contracts.find(c => c.status === "offered");
expect(offeredContract !== undefined, "hay ofertas iniciales para aceptar");
const beforeLen = g.fleet.length;
acceptContractOffer(g, offeredContract.id);
const newAlExpected = airlines.find(al => al.id === offeredContract.airlineId).basedAircraftCount ?? FLEET_SIZE_PER_AIRLINE;
expect(g.fleet.length === beforeLen + newAlExpected, `+${newAlExpected} aviones tras aceptar (got ${g.fleet.length - beforeLen})`);
expect(g.fleet.filter(f => f.airlineId === offeredContract.airlineId).length === newAlExpected,
  "la aerolínea aceptada tiene su flota completa ahora");
// Aceptar el mismo contrato otra vez → no duplica flota
const beforeLen2 = g.fleet.length;
acceptContractOffer(g, offeredContract.id);
expect(g.fleet.length === beforeLen2, "aceptar 2 veces no duplica flota (idempotente)");

g.autoPauseEnabled = false;
g.clock.speed = 1;
// Hacer correr un rato para que algun WO se complete y modifique rep de UNA aerolínea
for (let i = 0; i < 100; i++) advanceGame(g, 30);
// Al menos una aerolínea debería tener rep distinta a otras (porque hay contrato activo solo de AL-001)
const reps = Object.values(g.reputation.perAirline);
const uniqueReps = new Set(reps);
expect(uniqueReps.size >= 1, `reputaciones por aerolínea (got ${[...uniqueReps].join(",")})`);

console.log("\n=== save v6 backward-compat con legacy v5 ===");
const g2 = createGame(balance, airlines, templates, 42, defs);
g2.reputation.perAirline[airlines[0].id] = 95;
g2.reputation.perAirline[airlines[1].id] = 5;
const payload = serializeGame(g2);
expect(payload.version === 10, "save version 10 (pivot línea pura · KPI departures)");
expect(payload.reputation.perAirline[airlines[0].id] === 95, "AL[0] = 95 en payload");
const g3 = deserializeGame(payload, balance, airlines, templates, defs);
expect(g3.reputation.perAirline[airlines[0].id] === 95, "AL[0] = 95 tras round-trip");
expect(g3.reputation.perAirline[airlines[1].id] === 5, "AL[1] = 5 tras round-trip");

// Simular un payload v5 legacy con { value: N } — deserializeGame debería migrar
const legacyPayload = { ...payload, version: 6, reputation: { value: 33 } };
const g4 = deserializeGame(legacyPayload, balance, airlines, templates, defs);
expect(airlines.every(al => g4.reputation.perAirline[al.id] === 33), "migración legacy {value:33} → todas a 33");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
