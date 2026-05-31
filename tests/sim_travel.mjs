// INC3 · viaje variable oficina→stand por distancia OSM real. Valida la función pura travel.ts
// con los datos reales de OVD (ovd.paths.json). También imprime los minutos calculados (calibración).

import { computeStandTravelMinutes, centroid, bboxMeters, flatCoords } from "../src/lib/sim/travel.ts";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const ovd = JSON.parse(readFileSync(new URL("../src/assets/airports/ovd.paths.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

console.log("\n=== helpers geométricos ===");
expect(flatCoords([[0, 0], [2, 4]]).length === 2, "flatCoords aplana ring simple");
expect(flatCoords({ coords: [[0, 0], [1, 1]] }).length === 2, "flatCoords entra en .coords");
const c = centroid([[0, 0], [2, 0], [2, 2], [0, 2]]);
expect(c && Math.abs(c[0] - 1) < 1e-9 && Math.abs(c[1] - 1) < 1e-9, `centroid cuadrado = (1,1) (${JSON.stringify(c)})`);
expect(centroid([]) === null, "centroid vacío = null");
const bm = bboxMeters(ovd.bbox);
expect(bm.widthM > 2000 && bm.widthM < 4000, `bbox width ~2.9km (${bm.widthM.toFixed(0)}m)`);
expect(bm.heightM > 1000 && bm.heightM < 2500, `bbox height ~1.6km (${bm.heightM.toFixed(0)}m)`);

console.log("\n=== computeStandTravelMinutes(OVD) ===");
const tunables = {
  apronSpeedMetersPerMinute: balance.apronSpeedMetersPerMinute ?? 100,
  minTravelMinutes: balance.minTravelMinutes ?? 2,
  maxTravelMinutes: balance.maxTravelMinutes ?? 12,
};
const map = computeStandTravelMinutes(ovd, tunables);
const stands = Object.keys(ovd.standMap);
console.log("  minutos por stand:", JSON.stringify(map));
expect(Object.keys(map).length === stands.length, `un valor por cada stand del standMap (${Object.keys(map).length}/${stands.length})`);

const lo = tunables.minTravelMinutes, hi = tunables.maxTravelMinutes;
let allInRange = true, allInt = true;
for (const s of stands) {
  const v = map[s];
  if (typeof v !== "number" || v < lo || v > hi) allInRange = false;
  if (!Number.isInteger(v)) allInt = false;
}
expect(allInRange, `todos los minutos en [${lo}, ${hi}]`);
expect(allInt, "todos los minutos son enteros");

console.log("\n=== monótono en velocidad (más rápido ⇒ ≤ minutos) ===");
const fast = computeStandTravelMinutes(ovd, { ...tunables, apronSpeedMetersPerMinute: 300, minTravelMinutes: 1 });
const slow = computeStandTravelMinutes(ovd, { ...tunables, apronSpeedMetersPerMinute: 50, minTravelMinutes: 1, maxTravelMinutes: 60 });
let monotone = true;
for (const s of stands) { if (fast[s] > slow[s]) monotone = false; }
expect(monotone, "a +velocidad, minutos ≤ que a -velocidad");
expect(slow[stands[0]] >= fast[stands[0]], `ejemplo ${stands[0]}: slow ${slow[stands[0]]} ≥ fast ${fast[stands[0]]}`);

console.log("\n=== fallback robusto ===");
expect(Object.keys(computeStandTravelMinutes(null, tunables)).length === 0, "null → {}");
expect(Object.keys(computeStandTravelMinutes({}, tunables)).length === 0, "objeto vacío → {}");
expect(Object.keys(computeStandTravelMinutes({ standMap: { "X": "01" }, bbox: ovd.bbox, paths: {} }, tunables)).length === 0, "sin parkingPositions → {}");

console.log("\n=== determinismo ===");
const a = computeStandTravelMinutes(ovd, tunables);
const b = computeStandTravelMinutes(ovd, tunables);
expect(JSON.stringify(a) === JSON.stringify(b), "misma entrada → misma salida");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
