import {
  compatibleTemplates,
  pickWeightedTemplate,
  rollWoOnLanding,
  instantiateWorkOrder,
  activeWorkOrders,
  unassignedWorkOrders,
  countByPhase,
  _resetInstanceCounter,
} from "../src/lib/sim/workorders.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const templates = loadWorkOrdersWithKind(import.meta.url);
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/workorders (gen) ===");
_resetInstanceCounter();
const rng = createRng(42);

// Compat por modelo/motor. Refactor 2026-05-31 (esquema serio): las tareas que nombran su
// motor son CFM56-only / V2500-only, así que NO todas valen para cualquier combo (objetivo:
// un V2500 no recibe callouts CFM56-only). Validamos mayoría + sin huérfanas + diferenciación.
const compatA320CFM = compatibleTemplates(templates, "A320", "CFM56");
const compatA321V2500 = compatibleTemplates(templates, "A321", "V2500");
expect(compatA320CFM.length > templates.length * 0.6, `mayoría compatible A320/CFM56 (got ${compatA320CFM.length}/${templates.length})`);
expect(compatA321V2500.length > templates.length * 0.6, `mayoría compatible A321/V2500 (got ${compatA321V2500.length}/${templates.length})`);
const orphan = templates.filter((t) => {
  for (const m of ["A320", "A321"]) for (const e of ["CFM56", "V2500"]) if (compatibleTemplates([t], m, e).length === 1) return false;
  return true;
});
expect(orphan.length === 0, `ninguna tarea imposible (huérfanas: ${orphan.map((t) => t.id).join(",") || "0"})`);
const cfmOnly = templates.filter((t) => t.engineVariantsCompatibles.length === 1 && t.engineVariantsCompatibles[0] === "CFM56").length;
const v25Only = templates.filter((t) => t.engineVariantsCompatibles.length === 1 && t.engineVariantsCompatibles[0] === "V2500").length;
expect(cfmOnly > 0 && v25Only > 0, `diferenciación de motor real (CFM56-only ${cfmOnly}, V2500-only ${v25Only})`);

// Pick template
const tpl = pickWeightedTemplate(rng, compatA320CFM);
expect(tpl !== undefined && tpl.id.startsWith("WO-"), `pickea template (${tpl.id})`);

// Roll WO on landing — con prob 70%, en 1000 intentos esperamos ~700
let woCount = 0;
const airplane = {
  instanceId: "ALI-000001",
  registration: "EC-TEST", model: "A320", engineVariant: "CFM56",
  contractId: "C-001", standId: "H1-S1",
  arrivalMinute: 600, scheduledDepartureMinute: 660, status: "Idle",
  flightHoursThisLeg: 3.5,
};
const rng2 = createRng(100);
for (let i = 0; i < 1000; i++) {
  if (rollWoOnLanding(rng2, airplane, templates, balance) !== null) woCount++;
}
expect(woCount >= 450 && woCount <= 550, `~500/1000 con prob 50% Fase 4 audit (got ${woCount})`);

// instantiate sample
const instance = instantiateWorkOrder(templates[0], airplane, balance);
expect(instance.instanceId.startsWith("WI-"), `instanceId formato WI-XXXXX (${instance.instanceId})`);
expect(instance.airplaneRegistration === "EC-TEST", "registration linked");
expect(instance.airplaneInstanceId === "ALI-000001", "airplaneInstanceId linked al landing");
expect(instance.phase === "ToPlane", "starts en ToPlane");
expect(instance.assignedMechanicIds.length === 0, "sin mecánicos asignados al inicio");
// Pivot iteración 2026-05-25: SLA semánticamente correcto = scheduledDepartureMinute del avión.
// Una WO solo es "late" si causa delay real al departure. El cálculo viejo (arrival + dur*mult)
// generaba slaMinute abstracto que marcaba late WOs que terminaban antes del vuelo siguiente.
expect(instance.slaMinute === airplane.scheduledDepartureMinute, `SLA = scheduledDeparture del avión (${airplane.scheduledDepartureMinute})`);

// Helpers
const ws = [
  instance,
  { ...instance, instanceId: "WI-00002", phase: "Inspection", assignedMechanicIds: ["M-001"] },
  { ...instance, instanceId: "WI-00003", phase: "Completed" },
];
expect(activeWorkOrders(ws).length === 2, "active = 2 (excluye Completed)");
expect(unassignedWorkOrders(ws).length === 1, "unassigned = 1 (la primera)");
const counts = countByPhase(ws);
expect(counts.ToPlane === 1 && counts.Inspection === 1 && counts.Completed === 1, "countByPhase correcto");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
