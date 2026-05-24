// Smoke tests del Bloque B — sin framework, solo asserts manuales.
// Ejecutar: `node tests/smoke.mjs` desde la raíz del proyecto.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataDir = join(root, "src/lib/data");
const i18nDir = join(root, "src/lib/i18n");

let passed = 0;
let failed = 0;

function ok(msg) {
  passed++;
  console.log(`  ✓ ${msg}`);
}
function fail(msg, detail) {
  failed++;
  console.log(`  ✗ ${msg}`);
  if (detail) console.log(`    ${detail}`);
}
function expect(cond, msg, detail) {
  if (cond) ok(msg);
  else fail(msg, detail);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

console.log("\n=== workorders.json ===");
const wos = readJson(join(dataDir, "workorders.json"));
expect(Array.isArray(wos), "es un array");
expect(wos.length === 100, `tiene 100 entradas (got ${wos.length})`);

const counts = { sev: { Minor: 0, Major: 0, Critical: 0 }, cat: { B1: 0, B2: 0 }, aog: 0 };
const ataSet = new Set();
let durOk = true;
let modelOk = true;
let idOk = true;
const seenIds = new Set();

for (const wo of wos) {
  if (!wo.id || typeof wo.id !== "string") idOk = false;
  if (seenIds.has(wo.id)) idOk = false;
  seenIds.add(wo.id);
  if (typeof wo.durationMinutes !== "number" || wo.durationMinutes < 20 || wo.durationMinutes > 60) durOk = false;
  if (!Array.isArray(wo.aircraftModelsCompatibles) || wo.aircraftModelsCompatibles.length === 0) modelOk = false;
  counts.sev[wo.severity]++;
  counts.cat[wo.requiredCategory]++;
  if (wo.isAOG) counts.aog++;
  ataSet.add(wo.ata);
}

expect(idOk, "todas las WOs tienen id único string");
expect(durOk, "todas las duraciones están entre 20-60 min");
expect(modelOk, "todas las WOs tienen al menos un modelo compatible");
expect(counts.sev.Minor >= 60, `Minor ≥ 60 (got ${counts.sev.Minor})`);
expect(counts.sev.Critical >= 1 && counts.sev.Critical <= 6, `Critical entre 1-6 (got ${counts.sev.Critical})`);
expect(counts.cat.B1 >= 50, `B1 ≥ 50 (got ${counts.cat.B1})`);
expect(counts.cat.B2 >= 20, `B2 ≥ 20 (got ${counts.cat.B2})`);
expect(counts.aog >= 1 && counts.aog <= 3, `AOG entre 1-3 (got ${counts.aog})`);
expect(ataSet.size >= 18, `≥ 18 capítulos ATA cubiertos (got ${ataSet.size})`);

console.log("\n=== airlines.json ===");
const airlines = readJson(join(dataDir, "airlines.json"));
expect(Array.isArray(airlines), "es un array");
expect(airlines.length === 4, `4 aerolíneas (got ${airlines.length})`);
// Pivot MRO línea pura (2026-05-24): aerolíneas renombradas a operadores OVD reales
// con iataCode. La primera es Iberia Express (contrato inicial único del jugador).
const expectedNames = ["Iberia Express", "Vueling", "Volotea", "easyJet"];
for (const name of expectedNames) {
  expect(
    airlines.some((a) => a.name === name),
    `existe ${name}`,
  );
}
const expectedCodes = ["IB", "VY", "V7", "U2"];
for (const code of expectedCodes) {
  expect(
    airlines.some((a) => a.iataCode === code),
    `iataCode ${code} presente`,
  );
}
expect(airlines[0].name === "Iberia Express", "primera aerolínea = Iberia Express (contrato inicial)");
let fleetOk = true;
for (const al of airlines) {
  if (!Array.isArray(al.fleet) || al.fleet.length === 0) fleetOk = false;
  if (!al.color || !al.color.startsWith("#")) fleetOk = false;
}
expect(fleetOk, "todas las aerolíneas tienen flota y color hex");

console.log("\n=== balance.json ===");
const balance = readJson(join(dataDir, "balance.json"));
expect(typeof balance.startingBalance === "number" && balance.startingBalance > 0, "startingBalance > 0");
expect(balance.probabilities.workOrderAtStand === 0.5, "WO at stand = 0.5 (Fase 4 audit Dani)");
expect(balance.probabilities.directDispatch === 0.4, "direct dispatch = 0.4");
expect(balance.probabilities.reworkAfterTest === 0.1, "rework = 0.1");
expect(balance.slaMultiplier === 2.50, "SLA multiplier = 2.50 (Fase 4 Q6 tuning post-shift-gating)");
expect(balance.aogPenaltyMultiplier === 5, "AOG penalty x5");
expect(typeof balance.salaries.b1Senior === "number" && balance.salaries.b1Senior > balance.salaries.b1Junior, "salario b1Senior > b1Junior");

console.log("\n=== i18n locales ===");
const es = readJson(join(i18nDir, "es.json"));
const en = readJson(join(i18nDir, "en.json"));

function flatKeys(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out.push(...flatKeys(v, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

const esKeys = flatKeys(es).sort();
const enKeys = flatKeys(en).sort();
expect(esKeys.length >= 70, `ES tiene ≥ 70 keys (got ${esKeys.length})`);
expect(enKeys.length === esKeys.length, "ES y EN tienen mismo número de keys");
const missing = esKeys.filter((k) => !enKeys.includes(k));
expect(missing.length === 0, "EN cubre todas las keys de ES", missing.length > 0 ? `faltan: ${missing.slice(0, 5).join(", ")}` : null);

console.log("\n=== Resumen ===");
console.log(`  Total: ${passed} OK, ${failed} FAIL`);
if (failed > 0) {
  process.exit(1);
}
