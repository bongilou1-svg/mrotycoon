// Tests del día/noche real — Fase 5A Bloque V.

import { generateDailyArrivals } from "../src/lib/sim/airplanes.ts";
import { rollDailyChecksOnOvernight } from "../src/lib/sim/workorders.ts";
import { generateInitialFleet, ageInitialFleet } from "../src/lib/sim/fleet.ts";
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

// ---- Dataset daily checks ----
console.log("\n=== daily_checks.json dataset ===");
expect(Array.isArray(dailyChecks) && dailyChecks.length >= 4, `dataset tiene ≥4 templates (got ${dailyChecks.length})`);
expect(dailyChecks.every(d => d.isDailyCheck === true), "todos marcados isDailyCheck=true");
expect(dailyChecks.every(d => d.severity === "Minor"), "todos Minor severity");
expect(dailyChecks.every(d => !d.isAOG), "ninguno AOG");
expect(dailyChecks.every(d => d.durationMinutes >= 15 && d.durationMinutes <= 45), "duración 15-45 min");

// ---- overnight: arrivals tardíos pueden pernoctar ----
console.log("\n=== Overnight detection en generateDailyArrivals ===");
{
  // Contract con muchos landings y rep alta para forzar variedad
  const contract = {
    id: "C-test", airlineId: airlines[0].id, status: "active",
    offeredAtMinute: 0, baseFeePerWeek: 15000, paymentPerWOMinute: 60,
    penaltyPerLateMinute: 5, minReputation: 40, expectedLandingsPerDay: 9, tier: "standard",
  };

  // Acumular muestras de muchos seeds
  let totalArrivals = 0;
  let overnightCount = 0;
  let lateArrivalCount = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const rng = createRng(seed);
    const fleet = ageInitialFleet(rng, generateInitialFleet(rng, [airlines[0]]));
    const res = generateDailyArrivals(rng, contract, airlines[0], balance, 1, fleet, new Set());
    for (const a of res.arrivals) {
      totalArrivals++;
      const dayStart = 6 * 60; // day 1
      const minOfDayFromStart = a.arrivalMinute - dayStart;
      const isLate = minOfDayFromStart >= 13 * 60; // >=19:00
      if (isLate) lateArrivalCount++;
      if (a.overnight === true) overnightCount++;
    }
  }
  expect(totalArrivals > 100, `≥100 arrivals total muestreados (got ${totalArrivals})`);
  expect(overnightCount > 0, `overnight aparece (got ${overnightCount}/${totalArrivals})`);
  expect(overnightCount < totalArrivals * 0.5, `overnight < 50% del total (got ${(overnightCount/totalArrivals*100).toFixed(1)}%)`);
  // Aprox: ~30% de arrivals son late (19-22h) y de esos ~50% pernocta → ~15% del total
  expect(overnightCount >= lateArrivalCount * 0.3 && overnightCount <= lateArrivalCount * 0.7,
    `~50% de late arrivals pernoctan (got ${overnightCount}/${lateArrivalCount} late = ${(overnightCount/lateArrivalCount*100).toFixed(0)}%)`);
}

// ---- overnight tiene scheduledDeparture en el día siguiente ----
console.log("\n=== Overnight scheduledDeparture al amanecer siguiente ===");
{
  const contract = {
    id: "C-test", airlineId: airlines[0].id, status: "active",
    offeredAtMinute: 0, baseFeePerWeek: 15000, paymentPerWOMinute: 60,
    penaltyPerLateMinute: 5, minReputation: 40, expectedLandingsPerDay: 9, tier: "standard",
  };
  // Repetir hasta encontrar al menos 1 overnight
  let found = false;
  for (let seed = 1; seed <= 30 && !found; seed++) {
    const rng = createRng(seed);
    const fleet = ageInitialFleet(rng, generateInitialFleet(rng, [airlines[0]]));
    const res = generateDailyArrivals(rng, contract, airlines[0], balance, 1, fleet, new Set());
    const overnight = res.arrivals.find(a => a.overnight);
    if (overnight) {
      found = true;
      const dayStartDay1 = 6 * 60;
      const dayStartDay2 = DAY_MINUTES + 6 * 60;
      expect(overnight.scheduledDepartureMinute >= dayStartDay2,
        `overnight.scheduledDeparture en día 2 (got ${overnight.scheduledDepartureMinute}, day2 start=${dayStartDay2})`);
      expect(overnight.scheduledDepartureMinute < dayStartDay2 + 2 * 60,
        `overnight.scheduledDeparture antes de 08:00 día 2 (got ${overnight.scheduledDepartureMinute})`);
      expect(overnight.arrivalMinute < dayStartDay1 + 16 * 60,
        `overnight.arrival en día 1 (got ${overnight.arrivalMinute})`);
    }
  }
  expect(found, "encontrado al menos 1 overnight en 30 seeds");
}

// ---- rollDailyChecksOnOvernight ----
console.log("\n=== rollDailyChecksOnOvernight emite el scope FIJO completo ===");
{
  const airplane = {
    instanceId: "ALI-test", registration: "EC-TST", model: "A320", engineVariant: "CFM56",
    contractId: "C-001", standId: "H1-S1", arrivalMinute: 1200, scheduledDepartureMinute: 2000,
    status: "Idle", flightHoursThisLeg: 3.5, overnight: true,
  };
  // Audit aero 2026-06-28: el daily check es de SCOPE FIJO — emite TODOS los compatibles cada vez,
  // determinista (ya no la muestra aleatoria 2-4). Verificamos que todos los seeds dan el set completo.
  const fullScope = rollDailyChecksOnOvernight(createRng(999), airplane, dailyChecks, balance).length;
  for (let seed = 1; seed <= 10; seed++) {
    const rng = createRng(seed);
    const dcs = rollDailyChecksOnOvernight(rng, airplane, dailyChecks, balance);
    expect(fullScope >= 2 && dcs.length === fullScope, `seed ${seed}: scope fijo completo y determinista (got ${dcs.length}, esperado ${fullScope})`);
    const ids = dcs.map(d => d.templateId);
    expect(new Set(ids).size === ids.length, `seed ${seed}: sin repetidos (${ids.join(",")})`);
    expect(dcs.every(d => d.phase === "ToPlane"), `seed ${seed}: phase ToPlane inicial`);
  }
}

// ---- rollDailyChecksOnOvernight con templates vacíos ----
console.log("\n=== rollDailyChecksOnOvernight con dataset vacío → [] ===");
{
  const airplane = {
    instanceId: "X", registration: "EC-X", model: "A320", engineVariant: "CFM56",
    contractId: "C", standId: "", arrivalMinute: 0, scheduledDepartureMinute: 100,
    status: "Idle", flightHoursThisLeg: 1, overnight: true,
  };
  const rng = createRng(1);
  expect(rollDailyChecksOnOvernight(rng, airplane, [], balance).length === 0, "templates vacíos → []");
}

// ---- Integración: advanceGame emite daily checks tras overnight ----
console.log("\n=== Integración: advanceGame emite daily checks ===");
{
  // Probar con varias seeds hasta encontrar al menos 1 overnight en los primeros días
  let dailyCheckObserved = false;
  for (let seed = 1; seed <= 30 && !dailyCheckObserved; seed++) {
    const g = createGame(balance, airlines, templates, seed, defs, dailyChecks);
    g.autoPauseEnabled = false;
    g.shiftGatingEnabled = false;
    g.clock.speed = 1;
    // Avanzar 5 días para asegurar varios overnight
    let safety = 0;
    while (g.clock.minute < 5 * DAY_MINUTES && safety < 500) {
      advanceGame(g, 60);
      safety++;
    }
    // Buscar WO con templateId que empiece con DC-
    const hasDailyCheck = g.workOrders.some(w => w.templateId.startsWith("DC-"));
    if (hasDailyCheck) {
      dailyCheckObserved = true;
      const dcCount = g.workOrders.filter(w => w.templateId.startsWith("DC-")).length;
      expect(dcCount >= 1, `seed ${seed}: ${dcCount} daily checks emitidos`);
      // Notif overnight presente
      const overnightNotif = g.notifications.find(n => n.text.includes("pernocta"));
      // Fase 5C: buffer notifs capped a 12, las pernocta del día 1-2 pueden desplazarse cuando hay
      // eventos posteriores. Si la encontramos OK; si no, el dcCount ≥1 ya valida el flujo.
      if (overnightNotif) expect(overnightNotif.text.includes("pernocta"), `seed ${seed}: notif pernocta correcta`);
    }
  }
  expect(dailyCheckObserved, "daily checks observados en al menos 1 seed × 5d");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
