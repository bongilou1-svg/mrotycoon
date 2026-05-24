import {
  assignMechanicsToWo,
  unassignWo,
  tickMechanicTravel,
  teamEffectiveEfficiency,
} from "../src/lib/sim/assignment.ts";
import { generateInitialMechanics } from "../src/lib/sim/mechanics.ts";
import { instantiateWorkOrder, _resetInstanceCounter } from "../src/lib/sim/workorders.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/assignment ===");
_resetInstanceCounter();
const rng = createRng(42);
const mechanics = generateInitialMechanics(rng, balance);
const airplane = {
  registration: "EC-TEST", model: "A320", engineVariant: "CFM56",
  contractId: "C-001", standId: "H1-S1",
  arrivalMinute: 600, scheduledDepartureMinute: 660, status: "Idle",
};
const tpl = templates.find(t => t.requiredCategory === "B1");
const wo = instantiateWorkOrder(tpl, airplane, balance);
const wos = [wo];

// Asignación correcta
const b1 = mechanics.find(m => m.base === "B1" && m.typeRatings.some(r => r.model === "A320" && r.engineVariant === "CFM56" && r.category === "B1"));
const helper = mechanics.find(m => m.base === null);
const result = assignMechanicsToWo(mechanics, wos, wo.instanceId, b1.id, [helper.id], balance);
expect(!result.error, `asignación OK (${result.error ?? "ok"})`);
expect(result.mechanics.find(m => m.id === b1.id).state === "ToPlane", "certifier pasa a ToPlane");
expect(result.mechanics.find(m => m.id === b1.id).stateRemainingMinutes === balance.officeToStandMinutes, `timer = ${balance.officeToStandMinutes}`);
expect(result.workOrders[0].assignedMechanicIds.length === 2, "WO tiene 2 asignados");
expect(result.workOrders[0].assignedMechanicIds[0] === b1.id, "primer asignado es certifier");

// Error: asignar de nuevo
const second = assignMechanicsToWo(result.mechanics, result.workOrders, wo.instanceId, b1.id, [], balance);
expect(second.error === "WO already assigned", "no puede asignar dos veces");

// Tick travel: avanzar 2 min → mecánicos llegan al stand
const aftertick = tickMechanicTravel(result.mechanics, result.workOrders, balance.officeToStandMinutes);
expect(aftertick.mechanics.find(m => m.id === b1.id).state === "Working", "tras 2min ToPlane → Working");
expect(aftertick.workOrders[0].phase === "Inspection", "WO pasa a Inspection cuando todos llegan");

// Unassign
const unassigned = unassignWo(aftertick.mechanics, aftertick.workOrders, wo.instanceId);
expect(unassigned.mechanics.find(m => m.id === b1.id).state === "Idle", "tras unassign mecánicos Idle");
expect(unassigned.workOrders[0].assignedMechanicIds.length === 0, "WO sin asignados");
expect(unassigned.workOrders[0].phase === "ToPlane", "WO vuelve a ToPlane");

// Team efficiency (Bloque L: aplica moralMultiplier(moral=70) ≈ 0.99 sobre cada miembro)
const moralMult = 0.5 + (70 / 100) * 0.7; // = 0.99
const eff = teamEffectiveEfficiency(result.workOrders[0], result.mechanics);
const cert = result.mechanics.find(m => m.id === b1.id);
const hlp = result.mechanics.find(m => m.id === helper.id);
const certEff = cert.efficiency * moralMult;
const hlpEff = hlp.efficiency * moralMult;
const expected = certEff + Math.min(hlpEff * 0.5, certEff * 0.5);
expect(Math.abs(eff - expected) < 0.01, `team efficiency = ${eff.toFixed(2)} (esperado ${expected.toFixed(2)})`);

// Solo certifier (sin helper)
const onlyCert = assignMechanicsToWo(mechanics, wos, wo.instanceId, b1.id, [], balance);
const effOnly = teamEffectiveEfficiency(onlyCert.workOrders[0], onlyCert.mechanics);
expect(Math.abs(effOnly - cert.efficiency * moralMult) < 0.01, `solo certifier = su efficiency × moralMult (${effOnly.toFixed(2)})`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
