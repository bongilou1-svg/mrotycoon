// Tests del "Reparar ya" sobre WO Deferred — Fase 4 Bloque R.

import { deferWorkOrder, unDeferWorkOrder } from "../src/lib/sim/mel.ts";
import { createGame, advanceGame, deferWoManually, unDeferWoManually } from "../src/lib/game.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

// ---- Unit: unDeferWorkOrder happy path ----
console.log("\n=== unDeferWorkOrder happy path ===");
{
  const wo = {
    instanceId: "W1", templateId: "T1", airplaneRegistration: "EC-ABC", airplaneInstanceId: "AI-1",
    emissionMinute: 0, slaMinute: 1000, phase: "Deferred",
    phaseElapsedMinutes: 0, assignedMechanicIds: [], deferralExpiryMinute: 5000,
  };
  const out = unDeferWorkOrder(wo);
  expect(out !== null, "devuelve nueva WO no-null");
  expect(out.phase === "ToPlane", `phase ToPlane (got ${out.phase})`);
  expect(out.deferralExpiryMinute === undefined, "deferralExpiryMinute limpiado");
  expect(out.assignedMechanicIds.length === 0, "sin mecánicos asignados");
}

// ---- Unit: unDeferWorkOrder sad paths ----
console.log("\n=== unDeferWorkOrder sad paths ===");
{
  const woPending = { instanceId: "W2", phase: "ToPlane", assignedMechanicIds: [] };
  expect(unDeferWorkOrder(woPending) === null, "ToPlane → null (idempotente)");
  const woWorking = { instanceId: "W3", phase: "MainTask", assignedMechanicIds: ["M-001"] };
  expect(unDeferWorkOrder(woWorking) === null, "MainTask → null");
  const woCompleted = { instanceId: "W4", phase: "Completed", assignedMechanicIds: [] };
  expect(unDeferWorkOrder(woCompleted) === null, "Completed → null");
  const woFailed = { instanceId: "W5", phase: "Failed", assignedMechanicIds: [] };
  expect(unDeferWorkOrder(woFailed) === null, "Failed → null");
}

// ---- Unit: defer + undefer son inversas (excepto deferralExpiryMinute) ----
console.log("\n=== defer + undefer son inversas en phase ===");
{
  const wo = {
    instanceId: "W10", templateId: "WO-001", airplaneRegistration: "EC-XYZ", airplaneInstanceId: "AI-2",
    emissionMinute: 0, slaMinute: 1000, phase: "MainTask",
    phaseElapsedMinutes: 20, assignedMechanicIds: ["M-001", "M-002"], deferralExpiryMinute: undefined,
  };
  const tpl = templates.find(t => t.deferrable && t.severity === "Minor") || { id: "WO-001", isAOG: false, deferrable: true, severity: "Minor" };
  const deferred = deferWorkOrder(wo, tpl, 100);
  expect(deferred !== null, "defer ok");
  expect(deferred.phase === "Deferred", "tras defer: phase Deferred");
  expect(deferred.deferralExpiryMinute !== undefined, "tras defer: deferralExpiryMinute set");
  expect(deferred.assignedMechanicIds.length === 0, "tras defer: sin mecánicos");

  const undeferred = unDeferWorkOrder(deferred);
  expect(undeferred.phase === "ToPlane", "tras undefer: phase ToPlane");
  expect(undeferred.deferralExpiryMinute === undefined, "tras undefer: deferralExpiryMinute limpiado");
  expect(undeferred.assignedMechanicIds.length === 0, "tras undefer: sin mecánicos (pending re-asignación)");
}

// ---- Integración: unDeferWoManually con game state ----
console.log("\n=== Integración: unDeferWoManually con game state ===");
{
  const g = createGame(balance, airlines, templates, 42, defs);
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1; // createClock arranca pausado
  // Avanzar hasta encontrar una WO diferible (con MEL), hasta 1000 ticks.
  let safety = 0;
  let candidate = null;
  while (!candidate && safety < 1000) {
    advanceGame(g, 60);
    safety++;
    candidate = g.workOrders.find(w => {
      if (w.phase !== "ToPlane" && w.phase !== "Inspection" && w.phase !== "MainTask") return false;
      const tpl = g.templates.find(t => t.id === w.templateId);
      if (!tpl) return false;
      // deriveMelCategory hashea por id, ~30% son deferrables
      return !tpl.isAOG && tpl.severity !== "Critical" && tpl.deferrable;
    });
  }
  expect(g.workOrders.length > 0, `WO emitida tras ${safety} ticks`);
  expect(candidate !== null && candidate !== undefined, `WO diferible encontrada tras ${safety} ticks`);
  if (candidate) {
    const deferRes = deferWoManually(g, candidate.instanceId);
    if (deferRes.ok) {
      const wDeferred = g.workOrders.find(w => w.instanceId === candidate.instanceId);
      expect(wDeferred.phase === "Deferred", "WO en Deferred tras deferWoManually");

      const balBefore = g.economy.balance;
      const repBefore = JSON.stringify(g.reputation.perAirline);
      const r = unDeferWoManually(g, candidate.instanceId);
      expect(r.ok === true, `unDeferWoManually ok (got ${r.error ?? "ok"})`);
      const wRestored = g.workOrders.find(w => w.instanceId === candidate.instanceId);
      expect(wRestored.phase === "ToPlane", `WO de Deferred → ToPlane (got ${wRestored.phase})`);
      expect(wRestored.deferralExpiryMinute === undefined, "deferralExpiryMinute limpiado tras undefer");
      expect(g.economy.balance === balBefore, "balance no cambia (sin coste)");
      expect(JSON.stringify(g.reputation.perAirline) === repBefore, "reputación no cambia");

      // Notificación emitida
      const lastNotif = g.notifications[g.notifications.length - 1];
      expect(lastNotif && lastNotif.text.includes("🔧"), `notif 🔧 emitida (got ${lastNotif?.text ?? "—"})`);
    } else {
      console.log(`  ⚠️ no se pudo diferir la WO candidata (${deferRes.error}) — test integración limited`);
      // Fallback: aseguramos que el undefer de una WO no-Deferred falla
      const rBad = unDeferWoManually(g, candidate.instanceId);
      expect(rBad.ok === false, "undefer de WO no-Deferred falla");
    }
  } else {
    // No hubo WO diferible en este run — confirmar comportamiento sad path
    expect(true, "(sin WO diferible — skip integración happy path)");
  }
}

// ---- Sad paths del game action ----
console.log("\n=== Sad paths unDeferWoManually ===");
{
  const g = createGame(balance, airlines, templates, 7, defs);
  const r1 = unDeferWoManually(g, "no-existe");
  expect(r1.ok === false, "WO no encontrada → ok=false");
  expect(r1.error?.includes("no encontrada"), "error explícito");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
