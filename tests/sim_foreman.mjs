// Tests del Lead Foreman / TMA jefe — Fase 5A Bloque W.

import {
  hasActiveLead, findHandoffReplacement, tickAutoAssign,
} from "../src/lib/sim/foreman.ts";
import {
  generateCandidate, candidateToMechanic, LEAD_FOREMAN_WEEKLY_SALARY,
  LEAD_FOREMAN_CANDIDATE_PROBABILITY, resetCandidateCounter,
} from "../src/lib/sim/labor.ts";
import { createGame, advanceGame, hireCandidate, fireMechanic } from "../src/lib/game.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind, loadDailyChecksWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));
const dailyChecks = loadDailyChecksWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

// ---- Constantes ----
console.log("\n=== Constantes Lead Foreman ===");
expect(LEAD_FOREMAN_WEEKLY_SALARY === 2500, `salario 2500 (got ${LEAD_FOREMAN_WEEKLY_SALARY})`);
expect(LEAD_FOREMAN_CANDIDATE_PROBABILITY === 0.05, `prob 5% (got ${LEAD_FOREMAN_CANDIDATE_PROBABILITY})`);

// ---- generateCandidate puede producir lead foreman ----
console.log("\n=== generateCandidate ocasionalmente lead foreman ===");
{
  resetCandidateCounter(0);
  let leadCount = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const cand = generateCandidate(createRng(seed * 31), balance, 0);
    if (cand.isLeadForeman) {
      leadCount++;
      expect(cand.base === null, `seed ${seed}: lead foreman base=null`);
      expect(cand.expectedWeeklySalary >= 2000 && cand.expectedWeeklySalary <= 3000, `seed ${seed}: salario ~2.5k (got ${cand.expectedWeeklySalary})`);
      expect(cand.age >= 30, `seed ${seed}: edad ≥30 (got ${cand.age})`);
      if (leadCount >= 3) break;
    }
  }
  expect(leadCount >= 1, `≥1 lead foreman en 500 candidatos (got ${leadCount})`);
}

// ---- candidateToMechanic preserva flag ----
console.log("\n=== candidateToMechanic preserva isLeadForeman ===");
{
  const cand = {
    id: "CND-X", name: "Test", age: 40, base: null, typeRatings: [],
    efficiency: 1.0, expectedWeeklySalary: 2500, experienceYears: 15,
    personality: ["A", "B", "C"], generatedAtMinute: 0, expiresAtMinute: 10000,
    isLeadForeman: true,
  };
  const m = candidateToMechanic(cand, "M-100");
  expect(m.isLeadForeman === true, "lead foreman flag preservado");
  expect(m.base === null, "base null");
  expect(m.weeklySalary === 2500, "salario 2500");
}

// ---- hasActiveLead ----
console.log("\n=== hasActiveLead ===");
{
  const lead = { id: "M-1", isLeadForeman: true, state: "Idle" };
  const helper = { id: "M-2", state: "Idle" };
  expect(hasActiveLead([helper]) === false, "sin lead → false");
  expect(hasActiveLead([helper, lead]) === true, "con lead Idle → true");
  expect(hasActiveLead([{ ...lead, state: "OffShift" }]) === true, "lead OffShift también cuenta (puede activarse al entrar shift)");
}

// ---- findHandoffReplacement ----
console.log("\n=== findHandoffReplacement ===");
{
  const wo = {
    instanceId: "W1", templateId: "WO-001", airplaneRegistration: "EC-ABC", airplaneInstanceId: "AI-1",
    emissionMinute: 100, slaMinute: 300, phase: "MainTask", phaseElapsedMinutes: 10, assignedMechanicIds: [],
  };
  const tpl = templates.find(t => t.requiredCategory === "B1");
  const ap = {
    instanceId: "AI-1", registration: "EC-ABC", model: "A320", engineVariant: "CFM56",
    contractId: "C", standId: "H1-S1", arrivalMinute: 100, scheduledDepartureMinute: 500,
    status: "Idle", flightHoursThisLeg: 3,
  };
  const cert1 = {
    id: "M-1", name: "Out", base: "B1", state: "OffShift",
    typeRatings: [{ model: "A320", engineVariant: "CFM56", category: "B1" }],
    efficiency: 1.0, weeklySalary: 1100, assignedWoInstanceId: null, assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "morning",
  };
  const cert2 = {
    id: "M-2", name: "In", base: "B1", state: "Idle",
    typeRatings: [{ model: "A320", engineVariant: "CFM56", category: "B1" }],
    efficiency: 0.95, weeklySalary: 1100, assignedWoInstanceId: null, assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "afternoon",
  };
  // En franja afternoon (16:00 = 960 min)
  const woWithTplId = { ...wo, templateId: tpl.id };
  const r = findHandoffReplacement("W1", [woWithTplId], [cert1, cert2], templates, [ap], 16 * 60, "M-1");
  expect(r !== null && r.id === "M-2", `cert2 (afternoon, Idle) encontrado (got ${r?.id ?? "null"})`);

  // En franja morning (10:00): cert2 estaría OffShift (afternoon), no se encuentra
  const r2 = findHandoffReplacement("W1", [woWithTplId], [cert1, cert2], templates, [ap], 10 * 60, "M-1");
  expect(r2 === null, `morning: ningún cert on-shift (got ${r2?.id ?? "null"})`);

  // Excluir el propio mecánico
  const cert2Morning = { ...cert2, shift: "morning" };
  const r3 = findHandoffReplacement("W1", [woWithTplId], [cert1, cert2Morning], templates, [ap], 10 * 60, "M-2");
  expect(r3 === null, "excluir excludeMechId");
}

// ---- Integración: hire lead foreman activa autoAssignEnabled ----
console.log("\n=== Hire lead foreman activa autoAssignEnabled ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.autoPauseEnabled = false;
  expect(g.autoAssignEnabled === false, "default autoAssignEnabled=false");
  // Pivot MRO línea pura: cap oficina 4. Despedir uno para abrir slot al lead.
  fireMechanic(g, g.mechanics[g.mechanics.length - 1].id);
  // Inyectar un candidato lead manualmente
  g.candidates = [{
    id: "CND-LEAD", name: "TMA Test", age: 45, base: null, typeRatings: [],
    efficiency: 1.0, expectedWeeklySalary: 2500, experienceYears: 20,
    personality: ["Líder natural", "Comunicativo", "Pragmático"],
    generatedAtMinute: 0, expiresAtMinute: 1000000, isLeadForeman: true,
  }];
  const r = hireCandidate(g, "CND-LEAD");
  expect(r.ok === true, `hire ok (got ${r.error ?? "ok"})`);
  expect(g.autoAssignEnabled === true, "tras hire lead: autoAssignEnabled=true");
  expect(g.mechanics.some(m => m.isLeadForeman), "lead en mecánicos");
}

// ---- Fire último lead foreman desactiva ----
console.log("\n=== Fire último lead foreman desactiva ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.autoPauseEnabled = false;
  // Pivot MRO línea pura: cap oficina 4. Despedir uno para abrir slot al lead.
  fireMechanic(g, g.mechanics[g.mechanics.length - 1].id);
  g.candidates = [{
    id: "CND-LEAD-2", name: "TMA 2", age: 50, base: null, typeRatings: [],
    efficiency: 1.0, expectedWeeklySalary: 2500, experienceYears: 25,
    personality: ["A", "B", "C"],
    generatedAtMinute: 0, expiresAtMinute: 1000000, isLeadForeman: true,
  }];
  hireCandidate(g, "CND-LEAD-2");
  expect(g.autoAssignEnabled === true, "hire lead activa");
  // Buscar id del lead
  const lead = g.mechanics.find(m => m.isLeadForeman);
  const r = fireMechanic(g, lead.id);
  expect(r.ok === true, `fire ok (got ${r.error ?? "ok"})`);
  expect(g.autoAssignEnabled === false, "tras fire último lead: autoAssignEnabled=false");
}

// ---- Helper filter: eligibleHelpers excluye lead ----
console.log("\n=== eligibleHelpers excluye lead foreman ===");
{
  const { eligibleHelpers } = await import("../src/lib/sim/mechanics.ts");
  const lead = { id: "M-L", isLeadForeman: true, state: "Idle", base: null };
  const helper = { id: "M-H", state: "Idle", base: null };
  const result = eligibleHelpers([lead, helper]);
  expect(result.length === 1 && result[0].id === "M-H", `solo helper, no lead (got ${result.map(m=>m.id).join(",")})`);
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
