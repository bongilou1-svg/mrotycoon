// Top rutas OVD ↔ X por operador real (1-24 mayo 2026).
import { readFileSync, readdirSync } from "node:fs";
import { resolveOperator, OPERATOR_NAMES } from "./operator-rules.mjs";

const RAW_DIR = "data/ovd_raw";
const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".json")).sort();

// Por operador → por destino → contador (arr + dep)
const routes = {}; // op → { destIata: { arr, dep } }

for (const f of files) {
  if (f.slice(0, 10) < "2026-05-01" || f.slice(0, 10) > "2026-05-24") continue;
  const data = JSON.parse(readFileSync(`${RAW_DIR}/${f}`, "utf8"));
  for (const arr of data.arrivals ?? []) {
    const op = resolveOperator(arr).op;
    const orig = arr.departure?.airport?.iata ?? "???";
    if (!routes[op]) routes[op] = {};
    if (!routes[op][orig]) routes[op][orig] = { arr: 0, dep: 0 };
    routes[op][orig].arr++;
  }
  for (const dep of data.departures ?? []) {
    const op = resolveOperator(dep).op;
    const dest = dep.arrival?.airport?.iata ?? "???";
    if (!routes[op]) routes[op] = {};
    if (!routes[op][dest]) routes[op][dest] = { arr: 0, dep: 0 };
    routes[op][dest].dep++;
  }
}

// Reportar por operador, sus rutas top
const opsSorted = Object.keys(routes).sort((a, b) => {
  const tA = Object.values(routes[a]).reduce((s, r) => s + r.arr + r.dep, 0);
  const tB = Object.values(routes[b]).reduce((s, r) => s + r.arr + r.dep, 0);
  return tB - tA;
});

for (const op of opsSorted) {
  const total = Object.values(routes[op]).reduce((s, r) => s + r.arr + r.dep, 0);
  if (total < 5) continue; // skip ruido
  const opName = OPERATOR_NAMES[op] ?? op;
  console.log(`\n=== ${op} ${opName} · ${total} movs ===`);
  const dests = Object.entries(routes[op]).sort((a, b) => (b[1].arr + b[1].dep) - (a[1].arr + a[1].dep));
  for (const [dest, c] of dests) {
    console.log(`   OVD ↔ ${dest.padEnd(3)} · ${c.arr} arr + ${c.dep} dep = ${c.arr + c.dep} movs`);
  }
}
