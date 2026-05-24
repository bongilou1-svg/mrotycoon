// F5D · Tests del schedule snapshot OVD (scope creep).
//
// Cubre:
// - Cycling 7 días determinístico
// - generateScheduledArrivals: arrivals con horarios reales del JSON
// - Pool plausible asigna stats FH/FC realistas a callsigns nuevos
// - Persistencia callsign → matrícula entre días (mismo callsign mismo pool entry)
// - Mapeo opaco al primer contract activo
// - busyRegistrations excluye matrículas en check

import { getFlightsForGameDay, generateScheduledArrivals, getScheduleMetadata } from "../src/lib/sim/schedule.ts";

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/schedule · F5D scope creep ===");

// 1. Metadata del snapshot
const meta = getScheduleMetadata();
expect(meta.airport === "OVD", `airport=OVD (got ${meta.airport})`);
expect(meta.icao === "LEAS", `icao=LEAS (got ${meta.icao})`);
expect(meta.totalFlights >= 80, `totalFlights ≥ 80 (got ${meta.totalFlights})`);
expect(meta.airlines.IB > 0, `IB presente (${meta.airlines.IB})`);
expect(meta.airlines.VY > 0, `VY presente (${meta.airlines.VY})`);
expect(meta.airlines.V7 > 0, `V7 presente (${meta.airlines.V7})`);

// 2. Cycling determinístico: día 1 = lunes, día 8 = lunes
const day1 = getFlightsForGameDay(1);
const day8 = getFlightsForGameDay(8);
expect(day1.length === day8.length, `day 1 y 8 misma plantilla (${day1.length}=${day8.length})`);
expect(day1[0].callsign === day8[0].callsign, `day 1 y 8 mismos vuelos (${day1[0].callsign})`);

// 3. Cycling: día 6 = sábado, día 7 = domingo (volumen diferente)
const day6 = getFlightsForGameDay(6);
const day7 = getFlightsForGameDay(7);
expect(day6.length !== day1.length || day7.length !== day1.length, "sábado/domingo distinto a lunes");

// 4. Estructura de vuelos
const sample = day1[0];
expect(typeof sample.callsign === "string", "callsign string");
expect(sample.type === "arrival" || sample.type === "departure", `type valid (${sample.type})`);
expect(typeof sample.scheduledMinute === "number" && sample.scheduledMinute >= 0 && sample.scheduledMinute < 1440,
  `scheduledMinute en [0,1440) (got ${sample.scheduledMinute})`);
expect(sample.model === "A320" || sample.model === "A321", `model valid (${sample.model})`);
expect(sample.engineVariant === "CFM56" || sample.engineVariant === "V2500", `engine valid (${sample.engineVariant})`);

// 5. generateScheduledArrivals: smoke
const contracts = [
  { id: "C-1", status: "active", airlineId: "AL-1", expectedLandingsPerDay: 3, minReputation: 50 },
];
const { arrivals: arr1, updatedFleet: f1 } = generateScheduledArrivals(1, contracts, []);
// Snapshot v2: solo handled (A320/A321 CFM56/V2500) generan Airplane. Embraer/CRJ/ATR/B737
// están en el snapshot con notHandled:true — visibles en panel Schedule, pero no son trabajo MRO.
const arrivalCount = day1.filter((f) => f.type === "arrival" && !f.notHandled).length;
expect(arr1.length === arrivalCount, `arrivals handled matchea conteo del día (${arr1.length}=${arrivalCount})`);
expect(f1.length > 0, `fleet auto-poblado (${f1.length} entries)`);

// 6. Sin contracts activos → no arrivals
const { arrivals: arrEmpty } = generateScheduledArrivals(1, [], []);
expect(arrEmpty.length === 0, "sin contracts activos → 0 arrivals");

// 7. Pool: callsign IB tiene matrícula EC-Ixx/Lxx/Mxx/Nxx
const ibFleetEntry = f1.find((f) => f.registration.startsWith("IB"));
expect(ibFleetEntry !== undefined, `fleet contiene callsigns IB (sample: ${ibFleetEntry?.registration})`);
expect(ibFleetEntry.totalFH > 0, `IB callsign arranca con FH realista (${ibFleetEntry.totalFH})`);

// 8. Determinismo callsign → stats: mismo callsign en otra ejecución, mismas stats
const { updatedFleet: f1b } = generateScheduledArrivals(1, contracts, []);
const ibFleet1b = f1b.find((f) => f.registration === ibFleetEntry.registration);
expect(ibFleet1b.totalFH === ibFleetEntry.totalFH, "mismo callsign mismo totalFH (determinístico)");

// 9. Persistencia entre días: el callsign IB3217 del día 1 y día 8 son la misma fleet entry
const { arrivals: arr8, updatedFleet: f8 } = generateScheduledArrivals(8, contracts, f1);
const ib3217Initial = f1.find((f) => f.registration === "IB3217");
const ib3217After = f8.find((f) => f.registration === "IB3217");
if (ib3217Initial) {
  expect(ib3217After !== undefined, "IB3217 sobrevive entre días");
  expect(ib3217After.totalFH >= ib3217Initial.totalFH, `IB3217 FH acumula (${ib3217Initial.totalFH} → ${ib3217After.totalFH})`);
}

// 10. busyRegistrations excluye
const busy = new Set(["IB3217"]);
const { arrivals: arrBusy } = generateScheduledArrivals(1, contracts, [], busy);
const ib3217Skipped = arrBusy.find((a) => a.registration === "IB3217") === undefined;
expect(ib3217Skipped, "IB3217 en busyRegistrations → skip");

// 11. Arrival time absoluto correcto: día 2, scheduled 415 (06:55) → arrivalMinute 1440+415 = 1855
const { arrivals: arrDay2 } = generateScheduledArrivals(2, contracts, []);
if (arrDay2.length > 0) {
  const first = arrDay2[0];
  const day2Start = 1440;
  expect(first.arrivalMinute >= day2Start, `arrivalMinute día 2 ≥ ${day2Start} (got ${first.arrivalMinute})`);
  expect(first.arrivalMinute < day2Start + 1440, "arrivalMinute día 2 < día 3");
}

// 12. ScheduledDepartureMinute = arrival + 55 (turnaround)
if (arr1.length > 0) {
  const first = arr1[0];
  expect(first.scheduledDepartureMinute === first.arrivalMinute + 55, `turnaround 55min (got ${first.scheduledDepartureMinute - first.arrivalMinute})`);
}

// 13. Mapeo opaco: todos los arrivals al primer contract activo
const contracts2 = [
  { id: "C-1", status: "cancelled", airlineId: "AL-1", expectedLandingsPerDay: 3 },
  { id: "C-2", status: "active", airlineId: "AL-2", expectedLandingsPerDay: 5 },
];
const { arrivals: arrC2 } = generateScheduledArrivals(1, contracts2, []);
expect(arrC2.every((a) => a.contractId === "C-2"), "todos los arrivals → primer contract activo");

console.log(`\nsim/schedule: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
