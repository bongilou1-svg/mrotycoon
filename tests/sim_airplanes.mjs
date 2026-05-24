import {
  generateRegistration,
  rollDailyLandings,
  generateDailyArrivals,
  assignStand,
  updateAirplaneStatuses,
  airplanesOnStand,
  INITIAL_STANDS,
} from "../src/lib/sim/airplanes.ts";
import { generateInitialFleet, resetAirplaneInstanceCounter } from "../src/lib/sim/fleet.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/airplanes ===");
const rng = createRng(42);

// Generate registrations
const reg1 = generateRegistration(rng);
const reg2 = generateRegistration(rng);
expect(/^EC-[A-Z]{3}$/.test(reg1), `matrícula EC-XYZ válida (got ${reg1})`);
expect(reg1 !== reg2, "dos matrículas distintas en seguidos");

// Daily landings rolls — dentro del rango ±variance
const contract = {
  id: "C-001", airlineId: airlines[0].id, status: "active",
  expectedLandingsPerDay: 5, baseFeePerWeek: 10000, paymentPerWOMinute: 30,
  penaltyPerLateMinute: 100, minReputation: 50, offeredAtMinute: 0,
};
const rolls = [];
for (let i = 0; i < 100; i++) rolls.push(rollDailyLandings(rng, contract, balance));
const min = Math.min(...rolls), max = Math.max(...rolls);
expect(min >= 4 && max <= 6, `landings con variance 0.2 → [4-6] (got ${min}-${max})`);

// Daily arrivals — pasamos flota persistente; cada landing escoge un avión de la flota
resetAirplaneInstanceCounter(0);
const fleet = generateInitialFleet(rng, airlines);
const { arrivals, updatedFleet } = generateDailyArrivals(rng, contract, airlines[0], balance, 1, fleet);
expect(arrivals.length >= 4 && arrivals.length <= 6, `~5 arrivals (got ${arrivals.length})`);
expect(arrivals.every(p => p.arrivalMinute >= 360 && p.arrivalMinute < 360 + 16 * 60), "todos llegan entre 06:00 y 22:00 día 1");
expect(arrivals.every((p, i) => i === 0 || p.arrivalMinute >= arrivals[i - 1].arrivalMinute), "ordenados por arrival");
expect(arrivals.every(p => p.scheduledDepartureMinute > p.arrivalMinute), "departure siempre tras arrival");
expect(arrivals.every(p => airlines[0].fleet.some(f => f.model === p.model && f.engineVariant === p.engineVariant)), "model+engine compatible con fleet aerolínea");
expect(arrivals.every(p => p.contractId === contract.id), "contractId asignado");
expect(arrivals.every(p => p.instanceId.startsWith("ALI-")), "instanceId formato ALI-XXXXXX");
expect(new Set(arrivals.map(p => p.instanceId)).size === arrivals.length, "instanceIds únicos entre landings");
expect(arrivals.every(p => p.flightHoursThisLeg >= 1 && p.flightHoursThisLeg <= 5), "flightHoursThisLeg 1-5h (Fase 4 audit: narrow-body legs cortos+medios+largos)");
expect(arrivals.every(p => fleet.some(f => f.registration === p.registration)), "todas las matrículas vienen de la flota");
// La flota devuelta tiene FH+cycles acumulados respecto a la entrada
const totalCyclesIn = fleet.reduce((s, f) => s + f.totalCycles, 0);
const totalCyclesOut = updatedFleet.reduce((s, f) => s + f.totalCycles, 0);
expect(totalCyclesOut === totalCyclesIn + arrivals.length, `cycles totales += ${arrivals.length} (in=${totalCyclesIn}, out=${totalCyclesOut})`);
// Fase 4 multi-cycle fix (2026-05-15): la misma matrícula PUEDE aterrizar varias veces al día
// (narrow-body real hace 3-8 cycles/día). El check ahora es solo temporal: no solape entre estancias.
const byReg = new Map();
for (const p of arrivals) {
  const wins = byReg.get(p.registration) ?? [];
  const overlap = wins.some(([s, e]) => p.arrivalMinute < e && p.scheduledDepartureMinute > s);
  expect(!overlap, `matrícula ${p.registration}: ventanas no solapan en el mismo día`);
  wins.push([p.arrivalMinute, p.scheduledDepartureMinute]);
  byReg.set(p.registration, wins);
}

// Stand assignment
const a1 = { ...arrivals[0] };
a1.standId = assignStand(a1, []);
expect(INITIAL_STANDS.includes(a1.standId), `1er avión gets stand (${a1.standId})`);

// Si el 1er ocupa S1, el 2do que solapa debe ir a otro stand
const a2 = { ...arrivals[1], arrivalMinute: a1.arrivalMinute + 5, scheduledDepartureMinute: a1.scheduledDepartureMinute + 30 };
a2.standId = assignStand(a2, [a1]);
expect(a2.standId !== a1.standId && INITIAL_STANDS.includes(a2.standId), `2do avión a stand distinto (${a2.standId})`);

// Overflow → ramp (stage 1 ahora tiene 5 line stands, así que el 6º sin stand)
// Pivot iteración 2026-05-24: ampliada capacidad inicial 3→5 line.
const a3 = { ...a2, registration: "EC-AAA", arrivalMinute: a1.arrivalMinute + 10, scheduledDepartureMinute: a1.scheduledDepartureMinute + 35 };
a3.standId = assignStand(a3, [a1, a2]);
const a4 = { ...a3, registration: "EC-BBB", arrivalMinute: a1.arrivalMinute + 12 };
a4.standId = assignStand(a4, [a1, a2, a3]);
const a5 = { ...a3, registration: "EC-CCC", arrivalMinute: a1.arrivalMinute + 14 };
a5.standId = assignStand(a5, [a1, a2, a3, a4]);
const a6 = { ...a3, registration: "EC-DDD", arrivalMinute: a1.arrivalMinute + 16 };
a6.standId = assignStand(a6, [a1, a2, a3, a4, a5]);
expect(a6.standId === "", "6º avión simultáneo NO gets stand (overflow → ramp)");

// updateAirplaneStatuses
const post = updateAirplaneStatuses([a1, a2, a3, a4], a1.scheduledDepartureMinute + 1);
expect(post[0].status === "Departed", "avión pasa a Departed tras departure scheduled");

const onStand = airplanesOnStand([a1, a2, a3, a4], a1.arrivalMinute + 15);
expect(onStand.length === 4, `4 en ventana arrival-departure (incluye a4 sin stand) (got ${onStand.length})`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
