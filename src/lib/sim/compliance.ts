// Auditorías Part-145 — Bloque J.
//
// `runAudit(state, nowMinute, rng)` recalcula score basándose en la actividad desde el último
// audit. `tickCompliance` programa cuándo dispara y maneja el pre-aviso.

import type {
  ComplianceState,
  MaintenanceCheckInstance,
  WorkOrderInstance,
  WorkOrderTemplate,
} from "$lib/types";
import { DAY_MINUTES } from "./time.ts";
import { randInt, type Rng } from "./rng.ts";

/** Score inicial al new game. */
export const INITIAL_COMPLIANCE_SCORE = 80;
/** Días mínimos entre auditorías (rolled per audit). */
export const AUDIT_INTERVAL_MIN_DAYS = 60;
/** Días máximos entre auditorías. */
export const AUDIT_INTERVAL_MAX_DAYS = 90;
/** Días antes del audit para emitir aviso. */
export const PRE_AUDIT_WARNING_DAYS = 3;
/** Threshold score que dispara multa + suspensión. */
export const AUDIT_THRESHOLD_FINE = 30;
/** Threshold score que dispara game over. */
export const AUDIT_THRESHOLD_GAMEOVER = 10;
/** Multa por audit con score <30 (€). */
export const AUDIT_FINE_EUR = 50000;

/** Crea el estado inicial. La primera audit se programa entre [min, max] días. */
export function createCompliance(rng: Rng, nowMinute: number): ComplianceState {
  const days = randInt(rng, AUDIT_INTERVAL_MIN_DAYS, AUDIT_INTERVAL_MAX_DAYS);
  return {
    score: INITIAL_COMPLIANCE_SCORE,
    lastAuditMinute: null,
    nextAuditMinute: nowMinute + days * DAY_MINUTES,
    openFindings: [],
    totalAudits: 0,
    pendingSuspension: false,
    preAuditNotified: false,
  };
}

/** Resultado de una auditoría: nueva compliance + eventos para que game.ts notifique/penalice. */
export type ComplianceEvent =
  | { type: "audit_completed"; score: number; delta: number; findings: string[]; fine: number; gameOver: boolean }
  | { type: "audit_pre_warning"; daysUntil: number };

export interface ComplianceTickResult {
  compliance: ComplianceState;
  events: ComplianceEvent[];
}

/**
 * Ejecuta la lógica de la auditoría. Compone el delta de score basándose en lo que pasó desde
 * la última auditoría hasta `nowMinute`. Devuelve nuevo state + findings.
 *
 * Métricas que mira (pueden expandirse en Fase 4):
 *   1. WOs Failed por MEL expirada → penaliza fuerte
 *   2. WOs Failed por otras razones (deadline) → penaliza moderado
 *   3. Tasa de WOs completadas late respecto al total → penaliza si >50%
 *   4. Checks A/C/D con overrunDays > 0 → penaliza por exceso de overrun
 */
export function runAudit(
  compliance: ComplianceState,
  workOrders: readonly WorkOrderInstance[],
  templates: readonly WorkOrderTemplate[],
  maintenanceChecks: readonly MaintenanceCheckInstance[],
  nowMinute: number,
  rng: Rng,
): ComplianceTickResult {
  const sinceMinute = compliance.lastAuditMinute ?? 0;

  // Filtrar eventos relevantes en la ventana [sinceMinute, nowMinute]
  // Para WOs usamos `emissionMinute` como proxy del periodo (no tenemos completedMinute por wo).
  // El audit es punitivo: cuenta lo que VIO desde el último.
  const recentWos = workOrders.filter((w) => w.emissionMinute >= sinceMinute && w.emissionMinute <= nowMinute);
  const recentChecks = maintenanceChecks.filter(
    (c) => (c.completedMinute ?? c.scheduledMinute) >= sinceMinute && (c.completedMinute ?? c.scheduledMinute) <= nowMinute,
  );

  // 1. MEL expiradas: WO con phase=Failed que vino de Deferred (heurística: tiene deferralExpiryMinute set)
  const melExpired = recentWos.filter((w) => w.phase === "Failed" && w.deferralExpiryMinute !== undefined).length;
  // 2. WOs Failed por otras razones (sin deferral) — actualmente raro, MVP las cuenta por separado
  const otherFails = recentWos.filter((w) => w.phase === "Failed" && w.deferralExpiryMinute === undefined).length;
  // 3. Tasa de late: usamos slaMinute como referencia — WO Completed con phaseElapsedMinutes
  //    completado tras el SLA cuenta como late. Como heurística simple: cuenta Failed (todos late) + un estimado de Completed
  //    Para no requerir tracking detallado, asumimos late ratio aprox = otherFails / total cerrado.
  const closedRecent = recentWos.filter((w) => w.phase === "Completed" || w.phase === "Failed").length;
  const lateRatio = closedRecent > 0 ? (melExpired + otherFails) / closedRecent : 0;
  // 4. Overruns de checks: días totales de overrun en el periodo
  const overrunDays = recentChecks.reduce((s, c) => s + c.overrunDaysPenalized, 0);

  // Heurística de delta — clamp final a [-15, +10] para que un audit no destruya/regale el score
  let delta = 0;
  const findings: string[] = [];

  // MEL expiradas: -3 por cada una (gran flag regulatoria)
  if (melExpired > 0) {
    delta -= melExpired * 3;
    findings.push(`${melExpired} MEL expirada${melExpired === 1 ? "" : "s"} sin reparar`);
  }
  // Other fails: -2 por cada una
  if (otherFails > 0) {
    delta -= otherFails * 2;
    findings.push(`${otherFails} WO${otherFails === 1 ? "" : "s"} fallida${otherFails === 1 ? "" : "s"} (no MEL)`);
  }
  // Late ratio
  if (lateRatio >= 0.5) {
    delta -= 5;
    findings.push(`Tasa de cierre tardío alta (${Math.round(lateRatio * 100)}%)`);
  } else if (lateRatio >= 0.3) {
    delta -= 2;
    findings.push(`Tasa de cierre tardío elevada (${Math.round(lateRatio * 100)}%)`);
  }
  // Overrun days en checks
  if (overrunDays >= 5) {
    delta -= 5;
    findings.push(`${overrunDays} días totales de overrun en base maintenance`);
  } else if (overrunDays >= 1) {
    delta -= 2;
    findings.push(`${overrunDays} día${overrunDays === 1 ? "" : "s"} de overrun en base maintenance`);
  }

  // Bonus por operación limpia
  if (delta === 0) {
    delta = +5;
    findings.push("Operación dentro de parámetros — sin findings");
  } else if (delta > -3) {
    // Findings menores → small bonus
    delta += 2;
  }

  // Clamp delta y aplicar
  delta = Math.max(-15, Math.min(10, delta));
  const newScore = Math.max(0, Math.min(100, compliance.score + delta));

  // Programar próxima auditoría
  const nextDays = randInt(rng, AUDIT_INTERVAL_MIN_DAYS, AUDIT_INTERVAL_MAX_DAYS);

  const fine = newScore < AUDIT_THRESHOLD_FINE ? AUDIT_FINE_EUR : 0;
  const gameOver = newScore < AUDIT_THRESHOLD_GAMEOVER;
  const pendingSuspension = newScore < AUDIT_THRESHOLD_FINE && !gameOver;

  const newCompliance: ComplianceState = {
    score: newScore,
    lastAuditMinute: nowMinute,
    nextAuditMinute: nowMinute + nextDays * DAY_MINUTES,
    openFindings: findings,
    totalAudits: compliance.totalAudits + 1,
    pendingSuspension,
    preAuditNotified: false,
  };

  return {
    compliance: newCompliance,
    events: [{ type: "audit_completed", score: newScore, delta, findings, fine, gameOver }],
  };
}

/**
 * Tick de cada paso de juego: dispara audit si nowMinute ≥ nextAuditMinute, emite pre-aviso
 * cuando faltan ≤3 días.
 */
export function tickCompliance(
  compliance: ComplianceState,
  workOrders: readonly WorkOrderInstance[],
  templates: readonly WorkOrderTemplate[],
  maintenanceChecks: readonly MaintenanceCheckInstance[],
  nowMinute: number,
  rng: Rng,
): ComplianceTickResult {
  // Pre-aviso 3 días antes (1 sola vez por audit window)
  if (!compliance.preAuditNotified) {
    const minutesUntil = compliance.nextAuditMinute - nowMinute;
    const threshold = PRE_AUDIT_WARNING_DAYS * DAY_MINUTES;
    if (minutesUntil > 0 && minutesUntil <= threshold) {
      const days = Math.max(1, Math.ceil(minutesUntil / DAY_MINUTES));
      return {
        compliance: { ...compliance, preAuditNotified: true },
        events: [{ type: "audit_pre_warning", daysUntil: days }],
      };
    }
  }
  // Audit due
  if (nowMinute >= compliance.nextAuditMinute) {
    return runAudit(compliance, workOrders, templates, maintenanceChecks, nowMinute, rng);
  }
  return { compliance, events: [] };
}

/** Color semántico del score: green/amber/red según rango. */
export function complianceTier(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 30) return "warn";
  return "bad";
}
