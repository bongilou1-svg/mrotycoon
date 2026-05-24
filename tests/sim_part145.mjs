// Tests del sistema Part-145 compliance — Bloque J.

import {
  createCompliance,
  runAudit,
  tickCompliance,
  complianceTier,
  INITIAL_COMPLIANCE_SCORE,
  AUDIT_INTERVAL_MIN_DAYS,
  AUDIT_INTERVAL_MAX_DAYS,
  PRE_AUDIT_WARNING_DAYS,
  AUDIT_THRESHOLD_FINE,
  AUDIT_THRESHOLD_GAMEOVER,
  AUDIT_FINE_EUR,
} from "../src/lib/sim/compliance.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
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

console.log("\n=== sim/compliance — estado inicial ===");
const rng = createRng(42);
const c0 = createCompliance(rng, 0);
expect(c0.score === INITIAL_COMPLIANCE_SCORE, `score inicial = ${INITIAL_COMPLIANCE_SCORE}`);
expect(c0.lastAuditMinute === null, "lastAuditMinute = null");
expect(c0.totalAudits === 0, "totalAudits = 0");
expect(c0.openFindings.length === 0, "openFindings vacío");
const days = c0.nextAuditMinute / DAY_MINUTES;
expect(days >= AUDIT_INTERVAL_MIN_DAYS && days <= AUDIT_INTERVAL_MAX_DAYS,
  `próximo audit en [60, 90] días (got ${days.toFixed(1)})`);

console.log("\n=== complianceTier (colores) ===");
expect(complianceTier(85) === "good", "85 → good");
expect(complianceTier(70) === "good", "70 borde → good");
expect(complianceTier(50) === "warn", "50 → warn");
expect(complianceTier(29) === "bad", "29 → bad");
expect(complianceTier(10) === "bad", "10 → bad");

console.log("\n=== runAudit — operación limpia ===");
const cleanRng = createRng(7);
const r1 = runAudit(c0, [], templates, [], 60 * DAY_MINUTES, cleanRng);
expect(r1.events.length === 1 && r1.events[0].type === "audit_completed", "1 evento audit_completed");
const ev1 = r1.events[0];
expect(ev1.delta > 0, `operación sin findings → delta positivo (got ${ev1.delta})`);
expect(r1.compliance.score === INITIAL_COMPLIANCE_SCORE + ev1.delta, "score actualizado");
expect(r1.compliance.totalAudits === 1, "totalAudits = 1");
expect(r1.compliance.lastAuditMinute === 60 * DAY_MINUTES, "lastAudit registrado");
expect(r1.compliance.preAuditNotified === false, "preAuditNotified reseteado tras audit");

console.log("\n=== runAudit — con MEL expiradas penaliza ===");
const failedMelWos = [
  { instanceId: "WI-1", templateId: templates[0].id, phase: "Failed", deferralExpiryMinute: 10000, emissionMinute: 100, airplaneRegistration: "EC-A", airplaneInstanceId: "ALI-1", assignedMechanicIds: [], phaseElapsedMinutes: 0, slaMinute: 200 },
  { instanceId: "WI-2", templateId: templates[0].id, phase: "Failed", deferralExpiryMinute: 12000, emissionMinute: 200, airplaneRegistration: "EC-B", airplaneInstanceId: "ALI-2", assignedMechanicIds: [], phaseElapsedMinutes: 0, slaMinute: 300 },
  { instanceId: "WI-3", templateId: templates[0].id, phase: "Failed", deferralExpiryMinute: 15000, emissionMinute: 300, airplaneRegistration: "EC-C", airplaneInstanceId: "ALI-3", assignedMechanicIds: [], phaseElapsedMinutes: 0, slaMinute: 400 },
];
const r2 = runAudit(c0, failedMelWos, templates, [], 60 * DAY_MINUTES, createRng(7));
expect(r2.events[0].delta < 0, `MEL expiradas → delta negativo (got ${r2.events[0].delta})`);
expect(r2.events[0].findings.some(f => /MEL expirada/.test(f)), "finding menciona MEL expirada");

console.log("\n=== runAudit — score bajo (<30) dispara multa + suspensión ===");
const baseLowCompliance = { ...c0, score: 35 };
// Forzamos 5 MEL expiradas → delta = -15 (clamp), score 35 - 15 = 20 (<30)
const manyFails = Array.from({ length: 5 }, (_, i) => ({
  instanceId: `WI-${i}`, templateId: templates[0].id, phase: "Failed",
  deferralExpiryMinute: 100, emissionMinute: 100, airplaneRegistration: `EC-${i}`,
  airplaneInstanceId: `ALI-${i}`, assignedMechanicIds: [], phaseElapsedMinutes: 0, slaMinute: 200,
}));
const r3 = runAudit(baseLowCompliance, manyFails, templates, [], 60 * DAY_MINUTES, createRng(7));
expect(r3.compliance.score < AUDIT_THRESHOLD_FINE, `score < ${AUDIT_THRESHOLD_FINE} tras audit malo (got ${r3.compliance.score})`);
expect(r3.events[0].fine === AUDIT_FINE_EUR, `multa = ${AUDIT_FINE_EUR}`);
expect(r3.compliance.pendingSuspension === true, "pendingSuspension flag set");

console.log("\n=== runAudit — score muy bajo (<10) dispara game over ===");
const baseVeryLow = { ...c0, score: 20 };
const r4 = runAudit(baseVeryLow, manyFails, templates, [], 60 * DAY_MINUTES, createRng(7));
expect(r4.compliance.score < AUDIT_THRESHOLD_GAMEOVER, `score < ${AUDIT_THRESHOLD_GAMEOVER} (got ${r4.compliance.score})`);
expect(r4.events[0].gameOver === true, "evento marca gameOver");
expect(r4.compliance.pendingSuspension === false, "no suspensión si game over (ya da igual)");

console.log("\n=== tickCompliance — pre-aviso 3 días antes ===");
const cWithAudit = createCompliance(createRng(1), 0);
const minutesUntilAudit = cWithAudit.nextAuditMinute;
// Estamos a 4 días del audit → todavía no pre-aviso
const t1 = tickCompliance(cWithAudit, [], templates, [], minutesUntilAudit - 4 * DAY_MINUTES, createRng(2));
expect(t1.events.length === 0, "a 4 días del audit → sin eventos");

// A 3 días → pre-aviso
const t2 = tickCompliance(cWithAudit, [], templates, [], minutesUntilAudit - 3 * DAY_MINUTES, createRng(2));
expect(t2.events.length === 1, "a 3 días → 1 evento");
expect(t2.events[0].type === "audit_pre_warning", "tipo audit_pre_warning");
expect(t2.compliance.preAuditNotified === true, "preAuditNotified flag set");

// Tras pre-aviso, no se vuelve a emitir
const t3 = tickCompliance(t2.compliance, [], templates, [], minutesUntilAudit - 2 * DAY_MINUTES, createRng(2));
expect(t3.events.length === 0, "tras pre-aviso ya emitido, no spam");

console.log("\n=== tickCompliance — audit cuando toca ===");
const t4 = tickCompliance(t3.compliance, [], templates, [], minutesUntilAudit + 1, createRng(2));
expect(t4.events.length === 1 && t4.events[0].type === "audit_completed", "audit ejecutado al pasar nextAuditMinute");
expect(t4.compliance.totalAudits === 1, "totalAudits incrementado");
expect(t4.compliance.nextAuditMinute > minutesUntilAudit, "próximo audit reprogramado en el futuro");

console.log("\n=== integración: createGame inicializa compliance ===");
const g = createGame(balance, airlines, templates, 42, defs);
expect(g.compliance.score === INITIAL_COMPLIANCE_SCORE, "createGame: score inicial 80");
expect(g.compliance.nextAuditMinute > 0, "createGame: nextAuditMinute > 0");

console.log("\n=== integración: tras advanceGame el compliance evoluciona ===");
g.clock.speed = 1;
g.autoPauseEnabled = false;
g.shiftGatingEnabled = false; // Fase 4: test avanza ~60 días, sin gating para no bancarrota antes del audit
// Reset fleet a FH=0 para evitar que el aging tire la economía antes del primer audit.
g.fleet = g.fleet.map(f => ({ ...f, fhSinceLastA: 0, cyclesSinceLastA: 0, fhSinceLastC: 0, cyclesSinceLastC: 0, fhSinceLastD: 0, cyclesSinceLastD: 0 }));
// Avanzamos justo hasta pasado el primer audit
let _iter = 0; // eslint-disable-line prefer-const
// Cap 5000 iter de seguridad: en algunos tunings la audit cae a 90 días y este loop puede
// no llegar exactamente. Lo importante es que al menos 1 audit haya pasado al cortar.
while (g.clock.minute < g.compliance.nextAuditMinute + DAY_MINUTES && !g.gameOver.isOver && _iter < 5000) {
  advanceGame(g, 60);
  _iter++;
}
expect(g.compliance.totalAudits >= 1, `≥ 1 audit completado tras ${(g.clock.minute / DAY_MINUTES).toFixed(0)} días (got ${g.compliance.totalAudits})`);
expect(g.compliance.lastAuditMinute !== null, "lastAuditMinute set");
expect(g.compliance.score >= 0 && g.compliance.score <= 100, `score en rango [0,100] tras audits (got ${g.compliance.score})`);
// La notif se trunca a las últimas 12 — verificamos state, no buffer de UI.

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
