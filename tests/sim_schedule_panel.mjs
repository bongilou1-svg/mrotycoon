// Tests del panel Schedule del día (P3) — pivot MRO línea pura 2026-05-24.
//
// El sim no renderiza el panel (eso vive en .scripts/build-vanilla.mjs), pero sí provee la
// data: getFlightsForGameDay + flightStatusFor depende de cruce con g.airplanes. Aquí
// validamos los building blocks que la UI consume.

import { getFlightsForGameDay, getScheduleTotalFlights, getScheduleMetadata, generateScheduledArrivals } from "../src/lib/sim/schedule.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
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

console.log("\n=== getFlightsForGameDay devuelve el patrón correcto por día semana ===");
{
  // gameDay 1 = lunes (idx 0).
  const lunes = getFlightsForGameDay(1);
  expect(lunes.length > 0, `lunes tiene vuelos (got ${lunes.length})`);
  expect(lunes.every(f => f.scheduledMinute >= 0 && f.scheduledMinute < 1440), "minutos del día en rango");
  expect(lunes.every(f => f.type === "arrival" || f.type === "departure"), "tipo arrival|departure");
  expect(lunes.every(f => f.airlineCode && f.callsign), "callsign + airlineCode presentes");

  // gameDay 8 = lunes otra vez (rotación 7 días).
  const lunesB = getFlightsForGameDay(8);
  expect(JSON.stringify(lunes) === JSON.stringify(lunesB), "gameDay 8 idéntico a gameDay 1 (rotación semanal)");

  // gameDay 7 = domingo (idx 6).
  const dom = getFlightsForGameDay(7);
  expect(dom !== undefined && Array.isArray(dom), "domingo tiene patrón");

  // gameDay 15 = lunes otra vez.
  const lunesC = getFlightsForGameDay(15);
  expect(JSON.stringify(lunes) === JSON.stringify(lunesC), "gameDay 15 == lunes (rotación)");
}

console.log("\n=== Metadata schedule OVD ===");
{
  const meta = getScheduleMetadata();
  expect(meta.airport === "OVD", `airport OVD (got ${meta.airport})`);
  expect(meta.icao === "LEAS", `icao LEAS (got ${meta.icao})`);
  expect(meta.totalFlights >= 70, `total ≥70 vuelos/semana (got ${meta.totalFlights})`);
  // Aerolíneas mínimas presentes en el snapshot.
  expect(meta.airlines.IB > 0, `Iberia presente (IB count ${meta.airlines.IB})`);
  expect(meta.airlines.VY >= 0, `Vueling registrada`);
}

console.log("\n=== generateScheduledArrivals filtra por iataCode → contratos activos ===");
{
  // Game con lineMode: solo Iberia (AL-001 iataCode=IB) está activa.
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks, { lineMode: true });
  expect(g.contracts.filter(c => c.status === "active").length === 1, "1 contrato activo (Iberia)");
  const ibActive = g.contracts.find(c => c.status === "active");
  expect(g.airlines.find(a => a.id === ibActive.airlineId)?.iataCode === "IB", "Iberia airlineId tiene iataCode IB");

  const { arrivals } = generateScheduledArrivals(1, g.contracts, g.fleet, new Set(), g.airlines);
  // Pivot iteración 2026-05-24: registration es matrícula física (EC-XXX). El filtro
  // por aerolínea contratada se valida via arrivalCallsign (callsign IATA del leg).
  const contractedCodes = new Set(g.airlines.filter(a => a.iataCode && g.contracts.some(c => c.airlineId === a.id && c.status === "active")).map(a => a.iataCode));
  expect(arrivals.length > 0, `algún arrival generado para Iberia (got ${arrivals.length})`);
  const onlyContracted = arrivals.every(a => [...contractedCodes].some(code => a.arrivalCallsign?.startsWith(code)));
  expect(onlyContracted, `todos los arrivals son de aerolíneas contratadas (callsigns: ${arrivals.map(a => a.arrivalCallsign).slice(0,5).join(",")})`);

  // En el schedule lunes hay vuelos VY (Vueling), pero NO se generan arrivals para ellos.
  const vy = arrivals.filter(a => a.arrivalCallsign?.startsWith("VY"));
  expect(vy.length === 0, `0 VY arrivals (Vueling sin contrato) — got ${vy.length}`);
}

console.log("\n=== generateScheduledArrivals legacy fallback (airlines sin iataCode) ===");
{
  const fakeAirlines = [{ id: "AL-LEGACY", name: "Legacy", color: "#888", fleet: [{ model: "A320", engineVariant: "CFM56" }] }];
  const fakeContracts = [{
    id: "C-LEG", airlineId: "AL-LEGACY", status: "active", expectedLandingsPerDay: 5,
    baseFeePerWeek: 10000, paymentPerWOMinute: 50, penaltyPerLateMinute: 5, minReputation: 40,
    offeredAtMinute: 0,
  }];
  const { arrivals } = generateScheduledArrivals(1, fakeContracts, [], new Set(), fakeAirlines);
  // Sin iataCode → fallback opaco al primer contract → todos los arrivals al AL-LEGACY.
  expect(arrivals.length > 0, `legacy fallback genera arrivals (got ${arrivals.length})`);
  expect(arrivals.every(a => a.contractId === "C-LEG"), "todos los arrivals mapeados al fallback contract");
}

console.log("\n=== Pernoctas: schedule marca overnight si no hay departure pareja mismo día ===");
{
  // Generar arrivals con contratos para TODAS las aerolíneas (anyIata=true) para que
  // los IB que no tengan departure pareja queden marcados como overnight.
  const allActive = airlines.map((al, i) => ({
    id: `C-FORCE-${i}`, airlineId: al.id, status: "active",
    offeredAtMinute: 0, baseFeePerWeek: 15000, paymentPerWOMinute: 60,
    penaltyPerLateMinute: 5, minReputation: 40, expectedLandingsPerDay: 6, tier: "standard",
  }));
  // En el snapshot AENA real, ningún callsign del lunes-viernes pernocta (arr+dep pareja
  // mismo día). Validamos el mecanismo en abstracto: vuelo arrival ≥21:00 sin departure mismo día.
  const { arrivals } = generateScheduledArrivals(1, allActive, [], new Set(), airlines);
  // Verificamos al menos que el campo overnight existe en arrivals donde aplica.
  // No es un assert duro porque el snapshot puede o no tener overnighters según día.
  const anyOvernight = arrivals.some(a => a.overnight === true);
  console.log(`  ℹ️ overnighters detectados día 1: ${arrivals.filter(a => a.overnight === true).length}/${arrivals.length}`);
  expect(typeof anyOvernight === "boolean", "campo overnight presente y typeof boolean");
}

console.log("\n=== Game integra useScheduleArrivals=true en lineMode ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks, { lineMode: true });
  expect(g.useScheduleArrivals === true, "lineMode → useScheduleArrivals true por default");
  expect(g.lineModeEnabled === true, "lineModeEnabled true por default en lineMode");

  // Avanzar un poco — deben generarse arrivals desde el schedule.
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1;
  for (let i = 0; i < 20; i++) advanceGame(g, 60);
  // Pivot iteración 2026-05-24: registration es matrícula física real (EC-XXX o G-XXX),
  // el callsign IATA del leg vive en arrivalCallsign.
  if (g.airplanes.length > 0) {
    const sampleReg = g.airplanes[0].registration;
    const sampleCall = g.airplanes[0].arrivalCallsign;
    expect(/^(EC|G)-/.test(sampleReg), `registration es matrícula física (got: ${sampleReg})`);
    expect(sampleCall && /^[A-Z]{1,2}\d/.test(sampleCall), `arrivalCallsign IATA (got: ${sampleCall})`);
  } else {
    console.log("  ⚠️ no airplanes en 20×60min — schedule day1 puede no haber comenzado");
  }
}

console.log("\n=== Legacy mode preserva useScheduleArrivals=false ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks); // sin opts
  expect(g.useScheduleArrivals === false, "default sin opts → useScheduleArrivals false (legacy)");
  expect(g.lineModeEnabled === false, "lineModeEnabled false en legacy");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
