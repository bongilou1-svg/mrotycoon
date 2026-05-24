// Tests del modelo HH base (Fase A pivot línea pura, 2026-05-24).

import {
  bookHoursForTemplate, hourlyRateEur, actualHoursForCompletedWo,
  createHoursKPI, getHoursEfficiencyGlobal, getHoursEfficiencyForAirline,
  recordWoCompletionInHoursKPI,
} from "../src/lib/types/hoursKPI.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
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

console.log("\n=== Helpers HH ===");
{
  const tpl = { id: "T1", durationMinutes: 45 };
  expect(bookHoursForTemplate(tpl) === 0.75, `45 min = 0.75h book (got ${bookHoursForTemplate(tpl)})`);
  const tpl2 = { id: "T2", durationMinutes: 120 };
  expect(bookHoursForTemplate(tpl2) === 2.0, `120 min = 2.0h book`);

  const contract = { paymentPerWOMinute: 60 };
  expect(hourlyRateEur(contract) === 3600, `60 €/min = 3600 €/h tarifa`);

  expect(actualHoursForCompletedWo(100, 280) === 3.0, `180min = 3h actual`);
  expect(actualHoursForCompletedWo(100, 100) === 0, `0min = 0h`);
  expect(actualHoursForCompletedWo(200, 100) === 0, `negativo clamp a 0`);
}

console.log("\n=== createHoursKPI / record / getEfficiency ===");
{
  const kpi = createHoursKPI();
  expect(kpi.totalBookHoursBilled === 0, "book=0 inicial");
  expect(kpi.totalActualHoursWorked === 0, "actual=0 inicial");
  expect(getHoursEfficiencyGlobal(kpi) === 1, "ratio neutro 1 sin datos");

  recordWoCompletionInHoursKPI(kpi, "AL-001", 2.0, 1.5);
  expect(kpi.totalBookHoursBilled === 2.0, "book = 2.0 tras 1 WO");
  expect(kpi.totalActualHoursWorked === 1.5, "actual = 1.5");
  expect(kpi.perAirline["AL-001"].bookHoursBilled === 2.0, "bucket AL-001 book");
  expect(kpi.perAirline["AL-001"].actualHoursWorked === 1.5, "bucket AL-001 actual");
  expect(Math.abs(getHoursEfficiencyGlobal(kpi) - 2/1.5) < 0.001, `ratio 2/1.5 ≈ 1.33 (got ${getHoursEfficiencyGlobal(kpi)})`);
  expect(Math.abs(getHoursEfficiencyForAirline(kpi, "AL-001") - 2/1.5) < 0.001, "ratio per-airline");

  recordWoCompletionInHoursKPI(kpi, "AL-002", 3.0, 4.5);
  expect(Math.abs(getHoursEfficiencyGlobal(kpi) - 5/6) < 0.001, `ratio global (2+3)/(1.5+4.5) = 5/6 = 0.833 (got ${getHoursEfficiencyGlobal(kpi)})`);
  expect(getHoursEfficiencyForAirline(kpi, "AL-002") === 3/4.5, "ratio AL-002 = 0.667");

  // Sin airlineId → solo globales, no buckets
  recordWoCompletionInHoursKPI(kpi, null, 1.0, 1.0);
  expect(kpi.totalBookHoursBilled === 6.0, "global suma sin airlineId");
  expect(Object.keys(kpi.perAirline).length === 2, "no se crea bucket null");

  // Aerolínea inexistente con datos vacíos → ratio neutro 1
  expect(getHoursEfficiencyForAirline(kpi, "AL-XXX") === 1, "ratio aerolínea sin data = 1");
}

console.log("\n=== Integración: createGame inicializa hoursKPI vacío ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  expect(g.hoursKPI !== undefined, "hoursKPI presente");
  expect(g.hoursKPI.totalBookHoursBilled === 0, "0 horas iniciales");
  expect(Object.keys(g.hoursKPI.perAirline).length === 0, "perAirline vacío");
}

console.log("\n=== Integración: WO completada actualiza hoursKPI ===");
{
  // Corremos un game pequeño y comprobamos que cuando se completa al menos 1 WO el KPI sube.
  let found = false;
  for (let seed = 1; seed <= 5 && !found; seed++) {
    const g = createGame(balance, airlines, templates, seed, defs, dailyChecks);
    g.autoPauseEnabled = false;
    g.shiftGatingEnabled = false;
    g.clock.speed = 1;
    for (let i = 0; i < 100; i++) advanceGame(g, 30);
    if (g.hoursKPI.totalBookHoursBilled > 0) {
      found = true;
      expect(g.hoursKPI.totalBookHoursBilled > 0, `seed ${seed}: book > 0 (got ${g.hoursKPI.totalBookHoursBilled.toFixed(2)})`);
      expect(g.hoursKPI.totalActualHoursWorked > 0, `seed ${seed}: actual > 0 (got ${g.hoursKPI.totalActualHoursWorked.toFixed(2)})`);
      expect(Object.keys(g.hoursKPI.perAirline).length >= 1, `seed ${seed}: ≥1 bucket aerolínea`);
    }
  }
  expect(found, "al menos 1 seed con WOs completadas en 50h sim");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
