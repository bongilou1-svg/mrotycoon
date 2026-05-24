// Tests del sistema MEL (Minimum Equipment List) — Bloque I.

import {
  deriveMelCategory,
  getMelCategory,
  deferWorkOrder,
  deferredWorkOrders,
  tickMel,
  MEL_DEFERRAL_DAYS,
  MEL_EXPIRY_PENALTY_EUR,
  MEL_EXPIRY_REP_DELTA,
} from "../src/lib/sim/mel.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { createGame, advanceGame, deferWoManually } from "../src/lib/game.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/mel — derivación de melCategory ===");

// 1. MEL_DEFERRAL_DAYS — los 4 con días esperados
expect(MEL_DEFERRAL_DAYS.A === 3, "A = 3 días");
expect(MEL_DEFERRAL_DAYS.B === 10, "B = 10 días");
expect(MEL_DEFERRAL_DAYS.C === 120, "C = 120 días");
expect(MEL_DEFERRAL_DAYS.D >= 300, `D ≥ 300 días (got ${MEL_DEFERRAL_DAYS.D})`);

// 2. deriveMelCategory respeta el campo explícito
expect(deriveMelCategory({ isAOG: false, deferrable: true, severity: "Minor", melCategory: "A" }) === "A",
  "respeta melCategory='A' explícita");
expect(deriveMelCategory({ isAOG: false, deferrable: true, severity: "Minor", melCategory: null }) === null,
  "respeta melCategory=null explícita");

// 3. isAOG SIEMPRE → null (incluso si template dice 'B')
expect(deriveMelCategory({ isAOG: true, deferrable: true, severity: "Critical", melCategory: "B" }) === null,
  "isAOG sobreescribe a null");

// 4. Reglas de derivación cuando melCategory NO viene
expect(deriveMelCategory({ isAOG: false, deferrable: false, severity: "Minor" }) === null,
  "deferrable=false → null");
expect(deriveMelCategory({ isAOG: false, deferrable: true, severity: "Critical" }) === null,
  "Critical → null (a pesar de deferrable=true)");
expect(deriveMelCategory({ isAOG: false, deferrable: true, severity: "Major" }) === "B",
  "Major + deferrable → 'B' (10d)");
expect(deriveMelCategory({ isAOG: false, deferrable: true, severity: "Minor" }) === "C",
  "Minor + deferrable → 'C' (120d, mayoría)");

// 5. Aplicar derivación al dataset real workorders.json — debe haber al menos UN diferible
const dataMelStats = { A: 0, B: 0, C: 0, D: 0, null: 0 };
for (const t of templates) {
  const c = getMelCategory(t);
  dataMelStats[c === null ? "null" : c]++;
}
console.log(`  · Distribución MEL del dataset: A=${dataMelStats.A} B=${dataMelStats.B} C=${dataMelStats.C} D=${dataMelStats.D} null=${dataMelStats.null} (total ${templates.length})`);
const deferrableCount = dataMelStats.A + dataMelStats.B + dataMelStats.C + dataMelStats.D;
// Bloque N calibración: deriveMelCategory ahora hashea por id para limitar al ~30%.
expect(deferrableCount >= 20 && deferrableCount <= 45, `~30% WOs deferibles tras calibración (got ${deferrableCount}/${templates.length})`);

// === deferWorkOrder ===
console.log("\n=== sim/mel — deferWorkOrder ===");

const sampleWo = {
  instanceId: "WI-00001",
  templateId: templates[0].id,
  airplaneRegistration: "EC-AAA",
  airplaneInstanceId: "ALI-000001",
  emissionMinute: 100,
  assignedMechanicIds: ["M-001"],
  phase: "Inspection",
  phaseElapsedMinutes: 5,
  slaMinute: 200,
};

// 6. WO con melCategory explícito → produce WO con phase=Deferred y expiry esperado
const tplDeferrable = { ...templates[0], id: "WO-FIXTURE-C", deferrable: true, isAOG: false, severity: "Minor", melCategory: "C" };
const deferred = deferWorkOrder(sampleWo, tplDeferrable, 1000);
expect(deferred !== null, "WO deferrable → deferred válido");
expect(deferred.phase === "Deferred", "phase=Deferred");
expect(deferred.deferralExpiryMinute === 1000 + 120 * DAY_MINUTES, `expiry = nowMin + 120d (C-cat explícito) (got ${deferred.deferralExpiryMinute})`);
expect(deferred.assignedMechanicIds.length === 0, "asignaciones liberadas");
expect(deferred.phaseElapsedMinutes === 0, "phaseElapsedMinutes reseteado");

// 7. WO no diferible (isAOG) → null
const tplAog = { ...templates[0], isAOG: true, deferrable: true, severity: "Minor" };
expect(deferWorkOrder(sampleWo, tplAog, 1000) === null, "WO AOG no se puede diferir");

// 8. WO ya Completed → null
expect(deferWorkOrder({ ...sampleWo, phase: "Completed" }, tplDeferrable, 1000) === null, "WO Completed no se puede diferir");
expect(deferWorkOrder({ ...sampleWo, phase: "Deferred" }, tplDeferrable, 1000) === null, "WO ya Deferred no se redifiere");

// === tickMel ===
console.log("\n=== sim/mel — tickMel detección vencimiento ===");

// 9. Sin Deferred → 0 eventos
const r1 = tickMel([{ ...sampleWo, phase: "Inspection" }], 9999999);
expect(r1.events.length === 0, "sin Deferred → 0 eventos");

// 10. Deferred no vencida → no evento
const wo2 = { ...sampleWo, phase: "Deferred", deferralExpiryMinute: 5000 };
const r2 = tickMel([wo2], 1000);
expect(r2.events.length === 0, "Deferred con expiry > now → no evento");
expect(r2.workOrders[0].phase === "Deferred", "permanece Deferred");

// 11. Deferred vencida → evento + Failed
const r3 = tickMel([wo2], 5001);
expect(r3.events.length === 1, "Deferred con expiry < now → 1 evento");
expect(r3.events[0].type === "mel_expired", "evento tipo mel_expired");
expect(r3.events[0].penaltyEur === MEL_EXPIRY_PENALTY_EUR, `penalty = ${MEL_EXPIRY_PENALTY_EUR}`);
expect(r3.events[0].repDelta === MEL_EXPIRY_REP_DELTA, `repDelta = ${MEL_EXPIRY_REP_DELTA}`);
expect(r3.workOrders[0].phase === "Failed", "WO pasa a Failed");

// 12. deferredWorkOrders ordena por proximidad
const sortTest = deferredWorkOrders([
  { ...sampleWo, instanceId: "WI-A", phase: "Deferred", deferralExpiryMinute: 5000 },
  { ...sampleWo, instanceId: "WI-B", phase: "Deferred", deferralExpiryMinute: 1000 },
  { ...sampleWo, instanceId: "WI-C", phase: "Completed" }, // se excluye
  { ...sampleWo, instanceId: "WI-D", phase: "Deferred", deferralExpiryMinute: 3000 },
]);
expect(sortTest.length === 3, "filtra solo Deferred (3 de 4)");
expect(sortTest[0].instanceId === "WI-B" && sortTest[2].instanceId === "WI-A", "ordenadas por expiry ascendente");

// === Integración: deferWoManually + tickMel via advanceGame ===
console.log("\n=== integración: jugador difiere WO, vence, penalty aplicada ===");
const g = createGame(balance, airlines, templates, 42, defs);
g.clock.speed = 1;
g.autoPauseEnabled = false;
// Avanza hasta que aparezca una WO diferible
let attempts = 0;
// Bloque N: con calibración 30% deferrable, encontrar una WO deferrable en pocos ticks
// puede tardar más. Extiendo límite a 1000 ticks (50000 min ingame = 35 días).
while (attempts < 1000 && !g.workOrders.some(w => {
  const tpl = templates.find(t => t.id === w.templateId);
  return tpl && getMelCategory(tpl) !== null && w.phase !== "Failed" && w.phase !== "Completed" && w.phase !== "Deferred";
})) {
  advanceGame(g, 30);
  attempts++;
}
const deferableWo = g.workOrders.find(w => {
  const tpl = templates.find(t => t.id === w.templateId);
  return tpl && getMelCategory(tpl) !== null && w.phase !== "Failed" && w.phase !== "Completed" && w.phase !== "Deferred";
});
expect(deferableWo !== undefined, `WO diferible encontrada en ≤ 200 ticks (encontrada tras ${attempts})`);

if (deferableWo) {
  const balBefore = g.economy.balance;
  const repBefore = Object.values(g.reputation.perAirline).reduce((s,v)=>s+v,0) / Object.keys(g.reputation.perAirline).length;
  // Pivot línea pura · iteración 2026-05-24: deferWoManually requiere B1 elegible Idle
  // con type rating válido para firmar el MEL. Aseguramos uno en el state del test.
  const apForDefer = g.airplanes.find(a => a.instanceId === deferableWo.airplaneInstanceId);
  if (apForDefer) {
    const elig = g.mechanics.find(m =>
      m.base === "B1" &&
      m.typeRatings.some(r => r.model === apForDefer.model && r.engineVariant === apForDefer.engineVariant && r.category === "B1")
    );
    if (elig) {
      elig.state = "Idle";
      elig.assignedWoInstanceId = null;
      elig.stateRemainingMinutes = 0;
    }
  }
  const res = deferWoManually(g, deferableWo.instanceId);
  expect(res.ok === true, "deferWoManually devuelve ok");
  const tpl = templates.find(t => t.id === deferableWo.templateId);
  const cat = getMelCategory(tpl);
  const expectedExpiry = g.clock.minute + MEL_DEFERRAL_DAYS[cat] * DAY_MINUTES;
  const woAfter = g.workOrders.find(w => w.instanceId === deferableWo.instanceId);
  expect(woAfter.phase === "Deferred", "WO en estado Deferred");
  expect(Math.abs(woAfter.deferralExpiryMinute - expectedExpiry) < 60, `expiry = +${MEL_DEFERRAL_DAYS[cat]} días`);

  // Avanzar más allá del expiry — para cat C son 120 días, mejor forzamos el reloj
  // En lugar de simular 120 días reales, hackeo deferralExpiryMinute a 1h en el futuro
  woAfter.deferralExpiryMinute = g.clock.minute + 60;
  for (let i = 0; i < 50; i++) advanceGame(g, 10);
  const woFinal = g.workOrders.find(w => w.instanceId === deferableWo.instanceId);
  expect(woFinal.phase === "Failed", "tras vencimiento: phase=Failed");
  expect(g.economy.balance < balBefore, `penalty aplicada al balance (antes=${balBefore}, ahora=${g.economy.balance})`);
  const repAfter = Object.values(g.reputation.perAirline).reduce((s,v)=>s+v,0) / Object.keys(g.reputation.perAirline).length;
  expect(repAfter < repBefore, `penalty rep aplicada (antes=${repBefore.toFixed(1)}, ahora=${repAfter.toFixed(1)})`);
  const penaltyTx = g.economy.ledger.find(t => t.type === "penalty" && t.description.startsWith("MEL expirada"));
  expect(penaltyTx !== undefined && penaltyTx.amount === -MEL_EXPIRY_PENALTY_EUR,
    `transacción MEL penalty = -${MEL_EXPIRY_PENALTY_EUR} €`);
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
