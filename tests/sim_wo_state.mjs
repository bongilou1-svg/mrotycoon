import { tickWorkOrders } from "../src/lib/sim/wo_state_machine.ts";
import { instantiateWorkOrder, _resetInstanceCounter } from "../src/lib/sim/workorders.ts";
import { assignMechanicsToWo, tickMechanicTravel } from "../src/lib/sim/assignment.ts";
import { generateInitialMechanics } from "../src/lib/sim/mechanics.ts";
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

console.log("\n=== sim/wo_state_machine ===");
_resetInstanceCounter();
const rng = createRng(42);
const mechanics = generateInitialMechanics(rng, balance);
const airplane = {
  registration: "EC-Z", model: "A320", engineVariant: "CFM56",
  contractId: "C-001", standId: "H1-S1",
  arrivalMinute: 0, scheduledDepartureMinute: 90, status: "Idle",
};
const tpl = templates.find(t => t.requiredCategory === "B1" && t.durationMinutes === 30 && !t.isAOG);
const wo = instantiateWorkOrder(tpl, airplane, balance);
let wos = [wo];
let ms = [...mechanics];

const b1 = ms.find(m => m.base === "B1" && m.typeRatings.some(r => r.model === "A320" && r.engineVariant === "CFM56" && r.category === "B1"));

// Asignar
const r0 = assignMechanicsToWo(ms, wos, wo.instanceId, b1.id, [], balance);
ms = r0.mechanics; wos = r0.workOrders;

// ToPlane 2 min
const r1 = tickMechanicTravel(ms, wos, 2);
ms = r1.mechanics; wos = r1.workOrders;
expect(wos[0].phase === "Inspection", `tras travel WO en Inspection (got ${wos[0].phase})`);
expect(ms.find(m => m.id === b1.id).state === "Working", "mecánico Working");

// Tick WO state machine — simular minutos hasta completed
const machineRng = createRng(7);
let totalElapsed = 0;
let lastEvents = [];
for (let i = 0; i < 100 && wos[0].phase !== "Completed" && wos[0].phase !== "Failed"; i++) {
  const r = tickWorkOrders(wos, ms, templates, balance, 2, machineRng);
  wos = r.workOrders; ms = r.mechanics;
  if (r.events.length > 0) lastEvents = r.events;
  totalElapsed += 2;
}
expect(wos[0].phase === "Completed", `tras varios ticks WO Completed (got ${wos[0].phase})`);
expect(phasesSeen.has("Release"), `v2: la WO pasó por la fase Release antes de Completed (fases vistas: ${[...phasesSeen].join(",")})`);
expect(ms.find(m => m.id === b1.id).state === "Returning", "mecánico vuelve (Returning)");
expect(lastEvents.some(e => e.type === "wo_completed"), "evento wo_completed emitido");

// Verificar tiempo aproximado: WO de 30 min con cert efficiency ~1.0 debería completarse en ~40-50 min ingame
expect(totalElapsed >= 20 && totalElapsed <= 100, `tiempo razonable (got ${totalElapsed}m)`);

// Probar direct dispatch: simulamos muchas runs y contamos cuántas saltaron MainTask
let directCount = 0;
let totalRuns = 200;
for (let i = 0; i < totalRuns; i++) {
  _resetInstanceCounter();
  const localRng = createRng(1000 + i);
  let localMs = generateInitialMechanics(localRng, balance);
  let localWos = [instantiateWorkOrder(tpl, airplane, balance)];
  const cert = localMs.find(m => m.base === "B1" && m.typeRatings.some(r => r.model === "A320" && r.engineVariant === "CFM56" && r.category === "B1"));
  const ar = assignMechanicsToWo(localMs, localWos, localWos[0].instanceId, cert.id, [], balance);
  localMs = ar.mechanics; localWos = ar.workOrders;
  const tr = tickMechanicTravel(localMs, localWos, 2);
  localMs = tr.mechanics; localWos = tr.workOrders;
  const phasesVisited = new Set();
  const dispatchRng = createRng(2000 + i);
  for (let t = 0; t < 200 && localWos[0].phase !== "Completed" && localWos[0].phase !== "Failed"; t++) {
    const r = tickWorkOrders(localWos, localMs, templates, balance, 2, dispatchRng);
    localWos = r.workOrders; localMs = r.mechanics;
    phasesVisited.add(localWos[0].phase);
    for (const e of r.events) {
      if (e.type === "phase_change") phasesVisited.add(e.to);
    }
  }
  if (!phasesVisited.has("MainTask")) directCount++;
}
const directPct = directCount / totalRuns;
expect(directPct >= 0.3 && directPct <= 0.5, `40% direct dispatch (got ${(directPct * 100).toFixed(0)}%)`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
