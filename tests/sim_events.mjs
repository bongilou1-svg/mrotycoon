// Tests sistema de eventos aleatorios — Fase 5C.

import {
  rollDailyEvents, runwayClosedAt, activeEvents,
  RUNWAY_CLOSURE_DAILY_PROB, SERVICE_BULLETIN_DAILY_PROB, _resetEventCounter,
} from "../src/lib/sim/events.ts";
import { generateInitialFleet } from "../src/lib/sim/fleet.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { createRng } from "../src/lib/sim/rng.ts";
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

// ---- Constantes razonables ----
console.log("\n=== Constantes eventos ===");
expect(RUNWAY_CLOSURE_DAILY_PROB >= 0.01 && RUNWAY_CLOSURE_DAILY_PROB <= 0.15, `runway closure prob 1-15% (got ${RUNWAY_CLOSURE_DAILY_PROB})`);
expect(SERVICE_BULLETIN_DAILY_PROB >= 0.01 && SERVICE_BULLETIN_DAILY_PROB <= 0.10, `SB prob 1-10% (got ${SERVICE_BULLETIN_DAILY_PROB})`);

// ---- rollDailyEvents: distribución estadística ----
console.log("\n=== rollDailyEvents distribución ===");
{
  const rng = createRng(42);
  const fleet = generateInitialFleet(rng, airlines);
  let closures = 0;
  let sbs = 0;
  for (let day = 1; day <= 1000; day++) {
    _resetEventCounter(day * 10);
    const events = rollDailyEvents(rng, day, fleet);
    for (const e of events) {
      if (e.type === "runway_closure") closures++;
      if (e.type === "service_bulletin") sbs++;
    }
  }
  expect(closures > 0, `closures > 0 en 1000 días (got ${closures})`);
  expect(sbs > 0, `SBs > 0 en 1000 días (got ${sbs})`);
  // Closures ~ 60 esperados (6% × 1000), tolerancia ±50%
  expect(closures >= 30 && closures <= 110, `closures cerca de ${RUNWAY_CLOSURE_DAILY_PROB*1000} (got ${closures})`);
  expect(sbs >= 20 && sbs <= 80, `SBs cerca de ${SERVICE_BULLETIN_DAILY_PROB*1000} (got ${sbs})`);
}

// ---- Runway closure: shape ----
console.log("\n=== Runway closure event shape ===");
{
  let found = null;
  for (let trial = 1; trial <= 100 && !found; trial++) {
    const rng = createRng(trial);
    const fleet = generateInitialFleet(rng, airlines);
    for (let day = 1; day <= 50 && !found; day++) {
      _resetEventCounter(0);
      const evs = rollDailyEvents(rng, day, fleet);
      const closure = evs.find(e => e.type === "runway_closure");
      if (closure) found = { closure, day };
    }
  }
  expect(found !== null, "runway closure encontrado en muestras");
  if (found) {
    const c = found.closure;
    expect(c.startMinute < c.endMinute, "startMinute < endMinute");
    const durationH = (c.endMinute - c.startMinute) / 60;
    expect(durationH >= 4 && durationH <= 8, `duración 4-8h (got ${durationH}h)`);
    expect(typeof c.reason === "string" && c.reason.length > 0, `razón texto (got "${c.reason}")`);
    expect(c.id.startsWith("EV-"), `ID format EV-XXX (got ${c.id})`);
  }
}

// ---- Service Bulletin: shape ----
console.log("\n=== Service Bulletin event shape ===");
{
  let found = null;
  for (let trial = 1; trial <= 200 && !found; trial++) {
    const rng = createRng(trial * 13);
    const fleet = generateInitialFleet(rng, airlines);
    for (let day = 1; day <= 30 && !found; day++) {
      _resetEventCounter(0);
      const evs = rollDailyEvents(rng, day, fleet);
      const sb = evs.find(e => e.type === "service_bulletin");
      if (sb) found = sb;
    }
  }
  expect(found !== null, "SB encontrado");
  if (found) {
    expect(["A320","A321"].includes(found.model), `modelo válido (got ${found.model})`);
    expect(["CFM56","V2500","any"].includes(found.engineVariant), `engine válido (got ${found.engineVariant})`);
    expect(found.affectedRegistrations.length >= 1 && found.affectedRegistrations.length <= 2, `1-2 aviones (got ${found.affectedRegistrations.length})`);
    expect(found.startMinute === found.endMinute, "SB es puntual (start === end)");
    expect(found.description.includes("ATA"), `desc contiene ATA (got "${found.description}")`);
  }
}

// ---- runwayClosedAt ----
console.log("\n=== runwayClosedAt ===");
{
  const events = [
    { id: "EV-1", type: "runway_closure", startMinute: 1000, endMinute: 1300, reason: "test" },
    { id: "EV-2", type: "service_bulletin", startMinute: 500, endMinute: 500, model: "A320", engineVariant: "any", affectedRegistrations: [], description: "x" },
  ];
  expect(runwayClosedAt(events, 999) === false, "999: closed=false");
  expect(runwayClosedAt(events, 1000) === true, "1000: closed=true (inicio)");
  expect(runwayClosedAt(events, 1200) === true, "1200: closed=true (medio)");
  expect(runwayClosedAt(events, 1300) === false, "1300: closed=false (justo fin, exclusivo)");
  expect(runwayClosedAt(events, 1500) === false, "1500: closed=false (post)");
}

// ---- activeEvents ----
console.log("\n=== activeEvents ===");
{
  const events = [
    { id: "EV-1", type: "runway_closure", startMinute: 1000, endMinute: 1300, reason: "" },
    { id: "EV-2", type: "runway_closure", startMinute: 100, endMinute: 200, reason: "" }, // ya pasó
    { id: "EV-3", type: "service_bulletin", startMinute: 50, endMinute: 50, model: "A320", engineVariant: "any", affectedRegistrations: [], description: "x" },
  ];
  const a = activeEvents(events, 1100);
  // EV-1: 1300 >= 1100 → activo
  // EV-2: 200 < 1100 → no activo
  // EV-3: SB puntual, cleanedUp no set → activo
  expect(a.length === 2, `2 activos a t=1100 (got ${a.length})`);
  expect(a.some(e => e.id === "EV-1"), "EV-1 activo");
  expect(a.some(e => e.id === "EV-3"), "EV-3 activo");
}

// ---- Integración: createGame inicializa randomEvents vacío ----
console.log("\n=== createGame inicializa randomEvents ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  expect(Array.isArray(g.randomEvents), "randomEvents es array");
  expect(g.randomEvents.length === 0, "vacío inicial");
  expect(g.eventsRolledForDay === 0, "eventsRolledForDay = 0 inicial");
}

// ---- Integración: advanceGame rolea eventos al cruzar días ----
console.log("\n=== advanceGame rolea eventos al cruzar días ===");
{
  let observed = false;
  for (let seed = 1; seed <= 50 && !observed; seed++) {
    const g = createGame(balance, airlines, templates, seed, defs, dailyChecks);
    g.autoPauseEnabled = false;
    g.shiftGatingEnabled = false;
    g.clock.speed = 1;
    // Avanzar 30 días
    let safety = 0;
    while (g.clock.minute < 30 * DAY_MINUTES && safety < 300) {
      advanceGame(g, 60);
      safety++;
    }
    if (g.randomEvents.length > 0) {
      observed = true;
      expect(g.randomEvents.every(e => e.id.startsWith("EV-")), `seed ${seed}: ${g.randomEvents.length} eventos generados, ids OK`);
      // eventsRolledForDay debe ser ≥ day actual del game (puede ser día N o N+3 por daysAhead).
      const dayNow = Math.floor(g.clock.minute / DAY_MINUTES) + 1;
      expect(g.eventsRolledForDay >= dayNow - 1, `eventsRolledForDay (${g.eventsRolledForDay}) ≥ día actual-1 (${dayNow - 1})`);
    }
  }
  expect(observed, "eventos observados en algún seed × 30d");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
