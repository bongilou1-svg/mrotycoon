import {
  generateInitialMechanics,
  availableMechanics,
  eligibleCertifiers,
  eligibleHelpers,
  countByState,
} from "../src/lib/sim/mechanics.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/mechanics ===");
const rng = createRng(42);
const ms = generateInitialMechanics(rng, balance);

expect(ms.length === 7, `7 mecánicos iniciales (got ${ms.length})`);
expect(ms.filter(m => m.base === "B1").length === 3, "3 B1");
expect(ms.filter(m => m.base === "B2").length === 2, "2 B2");
expect(ms.filter(m => m.base === null).length === 2, "2 helpers");
expect(ms.every(m => m.state === "Idle"), "todos arrancan Idle");
expect(ms.every(m => m.assignedWoInstanceId === null), "ninguno asignado");
expect(ms.every(m => m.efficiency > 0.5 && m.efficiency < 1.3), "efficiency en rango");
expect(ms.every(m => m.weeklySalary > 0), "todos cobran salario > 0");
expect(new Set(ms.map(m => m.id)).size === 7, "ids únicos");

// Cobertura: ¿hay al menos 1 certifier B1 para A320+CFM56?
const b1A320CFM = ms.filter(m => m.base === "B1" && m.typeRatings.some(r =>
  r.model === "A320" && r.engineVariant === "CFM56" && r.category === "B1"));
expect(b1A320CFM.length >= 1, "al menos 1 B1 con A320+CFM56");

const b1A320V2500 = ms.filter(m => m.base === "B1" && m.typeRatings.some(r =>
  r.model === "A320" && r.engineVariant === "V2500" && r.category === "B1"));
expect(b1A320V2500.length >= 1, "al menos 1 B1 con A320+V2500");

// Eligible certifiers para template B1
const b1Templates = templates.filter(t => t.requiredCategory === "B1");
const certifiers = eligibleCertifiers(ms, b1Templates[0], "A320", "CFM56");
expect(certifiers.length >= 1, `≥ 1 certifier B1 para WO B1 A320 CFM56 (got ${certifiers.length})`);
expect(certifiers.every(c => c.base === "B1"), "todos los certifiers son B1");

// Eligible para WO B2
const b2Templates = templates.filter(t => t.requiredCategory === "B2");
const certifiersB2 = eligibleCertifiers(ms, b2Templates[0], "A320", "V2500");
expect(certifiersB2.length >= 1, "≥ 1 certifier B2 para A320 V2500");

// Helpers: todos los Idle pueden ser helpers
const helpers = eligibleHelpers(ms);
expect(helpers.length === 7, "7 elegibles como helper (todos Idle)");

// CountByState
const counts = countByState(ms);
expect(counts.Idle === 7, "countByState Idle=7");

// Disponibles tras simular uno asignado
const msAssigned = ms.map((m, i) => i === 0 ? { ...m, state: "Working" } : m);
expect(availableMechanics(msAssigned).length === 6, "tras asignar 1, available=6");

// Reproducibilidad
const rng2 = createRng(42);
const ms2 = generateInitialMechanics(rng2, balance);
expect(JSON.stringify(ms) === JSON.stringify(ms2), "mismo seed -> mismo pool");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
