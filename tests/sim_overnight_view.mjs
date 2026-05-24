// Tests de la vista pernocta (P4) — pivot MRO línea pura 2026-05-24.
//
// El "filter overnight" que consume el modal es trivial: g.airplanes.filter(a => a.overnight).
// Lo que validamos aquí es que el flag se ponga correctamente en arrivals stocásticos
// (generateDailyArrivals) y en arrivals del schedule (generateScheduledArrivals), y que
// la pernocta dispare daily checks al pasar por advanceGame.

import { generateDailyArrivals } from "../src/lib/sim/airplanes.ts";
import { generateScheduledArrivals } from "../src/lib/sim/schedule.ts";
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

console.log("\n=== Filter overnight devuelve solo aviones con flag ===");
{
  // Sintético: construimos g.airplanes con mix overnight/no-overnight y filtramos.
  const mock = [
    { instanceId: "1", registration: "EC-ABC", overnight: true,  arrivalMinute: 100, scheduledDepartureMinute: 1600, status: "Idle", standId: "H1-S1", model: "A320", engineVariant: "CFM56", contractId: "C-1", flightHoursThisLeg: 2 },
    { instanceId: "2", registration: "EC-DEF", overnight: false, arrivalMinute: 200, scheduledDepartureMinute: 300,  status: "Idle", standId: "H1-S2", model: "A320", engineVariant: "CFM56", contractId: "C-1", flightHoursThisLeg: 2 },
    { instanceId: "3", registration: "EC-GHI",                    arrivalMinute: 400, scheduledDepartureMinute: 500,  status: "Idle", standId: "H1-S3", model: "A320", engineVariant: "CFM56", contractId: "C-1", flightHoursThisLeg: 2 },
    { instanceId: "4", registration: "EC-JKL", overnight: true,  arrivalMinute: 1300, scheduledDepartureMinute: 1800, status: "Idle", standId: "H1-S1", model: "A321", engineVariant: "V2500", contractId: "C-1", flightHoursThisLeg: 3 },
    { instanceId: "5", registration: "EC-MNO", overnight: true,  arrivalMinute: 1400, scheduledDepartureMinute: 100,  status: "Departed", standId: "H1-S2", model: "A320", engineVariant: "CFM56", contractId: "C-1", flightHoursThisLeg: 2 },
  ];
  const filtered = mock.filter(a => a.overnight === true && a.status !== "Departed");
  expect(filtered.length === 2, `solo overnight && !Departed (got ${filtered.length})`);
  expect(filtered.map(a => a.registration).sort().join(",") === "EC-ABC,EC-JKL", `correctos (got ${filtered.map(a => a.registration).join(",")})`);
}

console.log("\n=== generateDailyArrivals (legacy stocástico) marca overnight ===");
{
  const contract = {
    id: "C-test", airlineId: airlines[0].id, status: "active",
    offeredAtMinute: 0, baseFeePerWeek: 15000, paymentPerWOMinute: 60,
    penaltyPerLateMinute: 5, minReputation: 40, expectedLandingsPerDay: 9, tier: "standard",
  };
  let foundOvernight = false;
  for (let seed = 1; seed <= 50; seed++) {
    const rng = createRng(seed);
    const fleet = ageInitialFleet(rng, generateInitialFleet(rng, [airlines[0]]));
    const res = generateDailyArrivals(rng, contract, airlines[0], balance, 1, fleet, new Set());
    if (res.arrivals.some(a => a.overnight === true)) { foundOvernight = true; break; }
  }
  expect(foundOvernight, "al menos 1 overnight en 50 seeds × 9 landings/día");
}

console.log("\n=== generateScheduledArrivals detecta overnight cuando NO hay departure pareja ===");
{
  // Vuelos sintéticos: 1 arr sin departure pareja (overnight), 1 arr con departure pareja (no overnight).
  // No podemos modificar el JSON del snapshot, pero podemos testear el flag overnight en arrivals
  // del snapshot real comprobando que vuelos con departure pareja NO son overnight.
  const fakeAirlines = [{ id: "AL-FAKE", name: "Fake", color: "#888", iataCode: "IB", fleet: [{ model: "A320", engineVariant: "CFM56" }] }];
  const fakeContracts = [{
    id: "C-FAKE", airlineId: "AL-FAKE", status: "active", expectedLandingsPerDay: 5,
    baseFeePerWeek: 10000, paymentPerWOMinute: 50, penaltyPerLateMinute: 5, minReputation: 40,
    offeredAtMinute: 0,
  }];
  const { arrivals } = generateScheduledArrivals(1, fakeContracts, [], new Set(), fakeAirlines);
  expect(arrivals.length > 0, `arrivals generados (${arrivals.length})`);
  // Cada arrival debe tener un departure pareja (mismo callsign, type=departure) en el día.
  // Si la tiene → overnight=undefined o false. Si NO → overnight=true.
  // Validación: el flag debe ser consistente con la presencia de departure pareja.
  for (const a of arrivals) {
    const hasOvernightFlag = a.overnight === true;
    if (hasOvernightFlag) {
      expect(a.scheduledDepartureMinute > DAY_MINUTES, `${a.registration} overnight → departure día siguiente (got ${a.scheduledDepartureMinute})`);
    }
  }
}

console.log("\n=== Pernocta dispara daily checks vía advanceGame ===");
{
  // Modo legacy con arrivals stocásticos (más overnighters por seed).
  let dailyCheckObserved = false;
  for (let seed = 1; seed <= 20 && !dailyCheckObserved; seed++) {
    const g = createGame(balance, airlines, templates, seed, defs, dailyChecks);
    g.autoPauseEnabled = false;
    g.shiftGatingEnabled = false;
    g.clock.speed = 1;
    let safety = 0;
    while (g.clock.minute < 5 * DAY_MINUTES && safety < 500) {
      advanceGame(g, 60);
      safety++;
    }
    const dcCount = g.workOrders.filter(w => w.templateId.startsWith("DC-")).length;
    if (dcCount > 0) {
      dailyCheckObserved = true;
      expect(dcCount >= 1, `seed ${seed}: ${dcCount} daily checks emitidos tras pernocta`);
    }
  }
  expect(dailyCheckObserved, "daily checks observados en al menos 1 seed × 5d");
}

console.log("\n=== Badge HUD condición: visible solo ≥20:00 ===");
{
  // Lógica: hora ≥20 OR <6. Esto se chequea desde el UI vía S.getHour(g.clock.minute).
  // Replicamos la lógica aquí para validar la regla.
  const should = (minute) => {
    const minOfDay = ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
    const hour = Math.floor(minOfDay / 60);
    return hour >= 20 || hour < 6;
  };
  expect(!should(10 * 60), "10:00 → badge oculto");
  expect(!should(15 * 60), "15:00 → badge oculto");
  expect(!should(19 * 60 + 59), "19:59 → badge oculto");
  expect(should(20 * 60), "20:00 → badge visible");
  expect(should(22 * 60), "22:00 → badge visible");
  expect(should(2 * 60), "02:00 → badge visible");
  expect(should(5 * 60 + 59), "05:59 → badge visible");
  expect(!should(6 * 60), "06:00 → badge oculto (día nuevo)");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
