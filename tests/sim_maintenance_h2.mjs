// H2: tests del módulo sim/maintenance — lookup de CheckDefinition, ID generator,
// instanciación Scheduled. Los flows completos (generación automática, fases, billing)
// llegan en H3+.

import {
  findCheckDefinition,
  scheduleCheck,
  nextMaintenanceCheckId,
  resetMaintenanceCheckCounter,
  getMaintenanceCheckCounter,
} from "../src/lib/sim/maintenance.ts";
import { readFileSync } from "node:fs";

const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/maintenance (H2) ===");

// 1. Tabla cargada: 6 entries (A320/A321 × A/C/D)
expect(defs.length === 6, `6 definiciones (2 modelos × 3 tipos) (got ${defs.length})`);
expect(defs.every(d => ["A", "C", "D"].includes(d.type)), "todos los type ∈ {A,C,D}");
expect(defs.every(d => ["A320", "A321"].includes(d.model)), "todos los model ∈ {A320,A321}");

// 2. findCheckDefinition
const aA320 = findCheckDefinition(defs, "A", "A320");
expect(aA320 && aA320.triggerFH === 600 && aA320.triggerCycles === 200, `A check A320: 600 FH / 200 cycles (got ${aA320?.triggerFH}/${aA320?.triggerCycles})`);
const cA320 = findCheckDefinition(defs, "C", "A320");
expect(cA320 && cA320.triggerFH === 7500, `C check A320: 7500 FH (got ${cA320?.triggerFH})`);
const dA321 = findCheckDefinition(defs, "D", "A321");
expect(dA321 && dA321.triggerFH === 25000, `D check A321: 25000 FH (got ${dA321?.triggerFH})`);
const noop = findCheckDefinition(defs, "A", "A380");
expect(noop === undefined, "modelo desconocido → undefined");

// 3. Sanidad de la tabla: cada modelo cubre A < C < D (FH crecientes)
for (const model of ["A320", "A321"]) {
  const a = findCheckDefinition(defs, "A", model);
  const c = findCheckDefinition(defs, "C", model);
  const d = findCheckDefinition(defs, "D", model);
  expect(a.triggerFH < c.triggerFH && c.triggerFH < d.triggerFH, `${model}: A < C < D en FH`);
  expect(a.manDays < c.manDays && c.manDays < d.manDays, `${model}: A < C < D en manDays`);
  expect(a.baseFee < c.baseFee && c.baseFee < d.baseFee, `${model}: A < C < D en baseFee`);
  expect(a.parkingDays >= 1 && a.parkingDays <= 3, `${model}: A check parking 1-3 días (got ${a.parkingDays})`);
  expect(d.parkingDays >= 60, `${model}: D check ≥ 60 días parking`);
}

// 4. ID generator monotónico + reset
resetMaintenanceCheckCounter(0);
expect(nextMaintenanceCheckId() === "MC-000001", "primer ID MC-000001");
expect(nextMaintenanceCheckId() === "MC-000002", "segundo ID MC-000002");
expect(getMaintenanceCheckCounter() === 2, "counter expuesto = 2");
resetMaintenanceCheckCounter(50);
expect(nextMaintenanceCheckId() === "MC-000051", "reset a 50 → siguiente es MC-000051");

// 5. scheduleCheck devuelve un Scheduled válido con snapshots congelados
resetMaintenanceCheckCounter(0);
const inst = scheduleCheck("EC-ABC", "A", "A320", defs, 1000);
expect(inst.instanceId === "MC-000001", "instanceId");
expect(inst.registration === "EC-ABC", "registration");
expect(inst.type === "A", "type=A");
expect(inst.phase === "Scheduled", "phase=Scheduled al generar");
expect(inst.scheduledMinute === 1000, "scheduledMinute");
expect(inst.standId === "", "standId vacío hasta empezar");
expect(inst.assignedMechanicIds.length === 0, "sin mecánicos al schedular");
expect(inst.manMinutesAccumulated === 0, "man-minutes 0");
expect(inst.manDaysIdeal === aA320.manDays && inst.baseFee === aA320.baseFee && inst.parkingDays === aA320.parkingDays,
  "snapshots de manDays/baseFee/parkingDays congelados del CheckDefinition");

// 6. scheduleCheck lanza si no hay definición
let threw = false;
try { scheduleCheck("EC-AAA", "A", "A380", defs, 0); } catch { threw = true; }
expect(threw, "scheduleCheck con modelo desconocido lanza error");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
