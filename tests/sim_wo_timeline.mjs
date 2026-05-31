// Ciclo de vida WO v2 — cronología (timestamps por hito) + fase Release + reveal de scope.
// Conduce el ciclo con la API del sim (sin game.ts) pasando stampClock para sellar hitos.
// Verifica: sellado al instanciar, scope oculto→revelado, orden cronológico, Release antes
// de Completed. Construye el mecánico inline (sin fixtures externos).

import { instantiateWorkOrder } from "../src/lib/sim/workorders.ts";
import { tickWorkOrders } from "../src/lib/sim/wo_state_machine.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const tpl = templates.find(t => t.requiredCategory === "B1" && (t.engineVariantsCompatibles || []).includes("CFM56")) || templates[0];

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

console.log("\n=== balance v2: tunables presentes ===");
expect(typeof balance.releaseMinutes === "number", `releaseMinutes definido (${balance.releaseMinutes})`);
expect(typeof balance.taxiInMinutes === "number", `taxiInMinutes definido (${balance.taxiInMinutes})`);

console.log("\n=== instanciar: landing/onBlock/etd sellados, scope oculto ===");
const ap = { registration: "EC-T", model: "A320", engineVariant: "CFM56", contractId: "C-001",
  standId: "H1-S1", arrivalMinute: 0, scheduledDepartureMinute: 999999, status: "Idle", instanceId: "ALI-T", flightHoursThisLeg: 2 };
const wo0 = instantiateWorkOrder(tpl, ap, balance);
expect(wo0.landingMinute === 0, `landingMinute = arrival (${wo0.landingMinute})`);
expect(wo0.onBlockMinute === 0 + (balance.taxiInMinutes ?? 0), `onBlock = landing + taxiIn (${wo0.onBlockMinute})`);
expect(wo0.emissionMinute === wo0.onBlockMinute, `emission = onBlock (v2)`);
expect(wo0.etdMinute === 999999, `etd = scheduledDeparture (${wo0.etdMinute})`);
expect(wo0.scopeRevealed === false, `scope OCULTO al nacer`);
expect(wo0.tshootCompleteMinute === undefined, `sin tshoot todavía`);
expect(wo0.releaseMinute === undefined, `sin release todavía`);

console.log("\n=== state machine sella hitos con stampClock (aunque shift-gating off) ===");
// Mecánico Working asignado, WO ya en Inspection (post-viaje). Avanzamos con stampClock.
const mech = { id: "M-1", name: "T", base: "B1", state: "Working", assignedWoInstanceId: "WI-1",
  assignedCheckInstanceId: null, stateRemainingMinutes: 0, efficiency: 1, moral: 70,
  typeRatings: [{ model: "A320", engineVariant: "CFM56", category: "B1" }], shift: "morning" };
let wos = [{ ...wo0, instanceId: "WI-1", assignedMechanicIds: ["M-1"], phase: "Inspection", phaseElapsedMinutes: 0,
  dispatchMinute: 401, arrivalAtStandMinute: 403, travelMinutes: 2, slaMinute: 999999 }];
let mechs = [mech];
const rng = createRng(7);
let now = 410;
for (let i = 0; i < 300 && wos[0].phase !== "Completed" && wos[0].phase !== "Failed"; i++) {
  now += 2;
  // nowMinute = -1 (shift-gating OFF, como tests legacy) PERO stampClock = now → debe sellar igual.
  const r = tickWorkOrders(wos, mechs, [tpl], balance, 2, rng, -1, now);
  wos = r.workOrders; mechs = r.mechanics;
}
const w = wos[0];
expect(w.phase === "Completed", `WO Completed (${w.phase})`);
expect(typeof w.tshootCompleteMinute === "number", `tshootComplete sellado pese a gating off (${w.tshootCompleteMinute})`);
expect(w.scopeRevealed === true, `scope REVELADO tras Inspection`);
expect(typeof w.fixCompleteMinute === "number", `fixComplete sellado (${w.fixCompleteMinute})`);
expect(typeof w.testCompleteMinute === "number", `testComplete sellado (${w.testCompleteMinute})`);
expect(typeof w.releaseMinute === "number", `releaseMinute sellado (${w.releaseMinute})`);

console.log("\n=== orden cronológico no decreciente ===");
const chain = [
  ["landing", w.landingMinute], ["onBlock", w.onBlockMinute], ["dispatch", w.dispatchMinute],
  ["arrival", w.arrivalAtStandMinute], ["tshoot", w.tshootCompleteMinute],
  ["fix", w.fixCompleteMinute], ["test", w.testCompleteMinute], ["release", w.releaseMinute],
].filter(([, v]) => typeof v === "number");
let ordered = true, prev = -Infinity, desc = [];
for (const [k, v] of chain) { if (v < prev) ordered = false; desc.push(`${k}:${v}`); prev = v; }
expect(ordered, `cadena en orden: ${desc.join(" ≤ ")}`);
expect(w.releaseMinute >= w.testCompleteMinute, `release tras test`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
