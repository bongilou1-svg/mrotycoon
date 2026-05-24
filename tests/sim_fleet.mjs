// Tests del módulo sim/fleet — flota persistente, FH+cycles tracking, picker.
//
// Fase 3 H1: la flota es el sujeto de A/C/D checks. Cada landing escoge un FleetAircraft
// de la aerolínea, le suma cycles+FH, y la flota persiste a lo largo de la partida.

import {
  generateInitialFleet,
  FLEET_SIZE_PER_AIRLINE,
  pickFleetAircraftForLanding,
  applyLandingToFleet,
  rollFlightHoursForLeg,
  findFleetAircraft,
  fleetByAirline,
  nextAirplaneInstanceId,
  resetAirplaneInstanceCounter,
  getAirplaneInstanceCounter,
} from "../src/lib/sim/fleet.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/fleet ===");

// 1. Generación inicial de flota
const rng = createRng(42);
const fleet = generateInitialFleet(rng, airlines);
// Fase 5A Y1: airlines.json define basedAircraftCount por aerolínea (12+6+4+9=31).
const expectedTotal = airlines.reduce((s, al) => s + (al.basedAircraftCount ?? FLEET_SIZE_PER_AIRLINE), 0);
expect(fleet.length === expectedTotal, `total = ΣbasedAircraftCount = ${expectedTotal} (got ${fleet.length})`);
expect(fleet.every(f => /^EC-[A-Z]{3}$/.test(f.registration)), "todas las matrículas formato EC-XYZ");
expect(new Set(fleet.map(f => f.registration)).size === fleet.length, "todas las matrículas únicas");
expect(fleet.every(f => f.totalFH === 0 && f.totalCycles === 0), "FH y cycles arrancan a 0");
expect(fleet.every(f => f.fhSinceLastA === 0 && f.cyclesSinceLastA === 0), "fhSinceLastA y cyclesSinceLastA a 0");
expect(fleet.every(f => f.warnedA === false && f.warnedC === false && f.warnedD === false), "flags warned arrancan en false (H9)");
expect(fleet.every(f => airlines.find(al => al.id === f.airlineId)), "todos los airlineId existen");
expect(fleet.every(f => {
  const al = airlines.find(a => a.id === f.airlineId);
  return al.fleet.some(s => s.model === f.model && s.engineVariant === f.engineVariant);
}), "model+engineVariant compatible con catálogo de aerolínea");

// 2. Por aerolínea hay exactamente basedAircraftCount aviones (Fase 5A Y1)
for (const al of airlines) {
  const sub = fleetByAirline(fleet, al.id);
  const expected = al.basedAircraftCount ?? FLEET_SIZE_PER_AIRLINE;
  expect(sub.length === expected, `${al.id} tiene ${expected} aviones (got ${sub.length})`);
}

// 3. rollFlightHoursForLeg en rango 3-5h
const fhRng = createRng(7);
let minFH = Infinity, maxFH = -Infinity;
for (let i = 0; i < 200; i++) {
  const fh = rollFlightHoursForLeg(fhRng);
  if (fh < minFH) minFH = fh;
  if (fh > maxFH) maxFH = fh;
}
expect(minFH >= 1.0 && maxFH <= 5.0, `FH per leg en [1.0, 5.0] Fase 4 audit (got [${minFH.toFixed(2)}, ${maxFH.toFixed(2)}])`);

// 4. applyLandingToFleet acumula sobre la matrícula correcta
const sample = fleet[0];
const after1 = applyLandingToFleet(fleet, sample.registration, 4.0);
const updated = findFleetAircraft(after1, sample.registration);
expect(updated.totalFH === 4.0 && updated.totalCycles === 1, `tras 1 landing: FH=4 cycles=1 (got FH=${updated.totalFH} cycles=${updated.totalCycles})`);
expect(updated.fhSinceLastA === 4.0 && updated.cyclesSinceLastA === 1, "fhSinceLastA y cyclesSinceLastA también +1");
expect(updated.fhSinceLastC === 4.0 && updated.fhSinceLastD === 4.0, "fhSinceLastC y fhSinceLastD también acumulan");
// Las otras matrículas no se tocan
const otherIntact = after1.filter(f => f.registration !== sample.registration).every(f => f.totalFH === 0 && f.totalCycles === 0);
expect(otherIntact, "el resto de la flota no se altera");

// Apila 2 landings más sobre la misma matrícula
const after3 = applyLandingToFleet(applyLandingToFleet(after1, sample.registration, 3.5), sample.registration, 4.5);
const u3 = findFleetAircraft(after3, sample.registration);
expect(u3.totalCycles === 3 && Math.abs(u3.totalFH - 12.0) < 1e-9, `3 landings: cycles=3 FH=12 (got cycles=${u3.totalCycles} FH=${u3.totalFH})`);

// 5. pickFleetAircraftForLanding respeta airlineId
const al0 = airlines[0];
const pickRng = createRng(123);
for (let i = 0; i < 20; i++) {
  const picked = pickFleetAircraftForLanding(pickRng, al0.id, fleet, new Set());
  if (picked.airlineId !== al0.id) { fail++; console.log(`  ✗ pick airlineId mismatch`); break; }
}
pass++; console.log(`  ✓ pickFleetAircraftForLanding solo devuelve aviones de la aerolínea`);

// 6. pickFleetAircraftForLanding excluye busy
const busy = new Set(fleetByAirline(fleet, al0.id).slice(0, FLEET_SIZE_PER_AIRLINE - 1).map(f => f.registration));
const onlyOneLeft = pickFleetAircraftForLanding(pickRng, al0.id, fleet, busy);
expect(onlyOneLeft !== null && !busy.has(onlyOneLeft.registration), "respeta busy: pickea el único libre");

const allBusy = new Set(fleetByAirline(fleet, al0.id).map(f => f.registration));
const noneAvailable = pickFleetAircraftForLanding(pickRng, al0.id, fleet, allBusy);
expect(noneAvailable === null, "si toda la flota busy → devuelve null");

// 7. nextAirplaneInstanceId es monotónico y único
resetAirplaneInstanceCounter(0);
const id1 = nextAirplaneInstanceId();
const id2 = nextAirplaneInstanceId();
const id3 = nextAirplaneInstanceId();
expect(id1 === "ALI-000001" && id2 === "ALI-000002" && id3 === "ALI-000003", `formato ALI-NNNNNN (got ${id1}, ${id2}, ${id3})`);
expect(getAirplaneInstanceCounter() === 3, "counter expuesto para save");
resetAirplaneInstanceCounter(99);
const id100 = nextAirplaneInstanceId();
expect(id100 === "ALI-000100", `reset funciona (got ${id100})`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
