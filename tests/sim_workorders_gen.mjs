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

const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/workorders (gen) ===");
_resetInstanceCounter();
const rng = createRng(42);

// Compat: todos los templates aceptan A320/A321 + CFM56/V2500 (dataset)
const compatA320CFM = compatibleTemplates(templates, "A320", "CFM56");
expect(compatA320CFM.length === templates.length, `todos compatibles A320/CFM56 (got ${compatA320CFM.length})`);
const compatA321V2500 = compatibleTemplates(templates, "A321", "V2500");
expect(compatA321V2500.length === templates.length, "todos compatibles A321/V2500");

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
expect(instance.slaMinute === 600 + Math.round(templates[0].durationMinutes * balance.slaMultiplier), `SLA = arrival + duration × slaMultiplier (${balance.slaMultiplier})`);

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
