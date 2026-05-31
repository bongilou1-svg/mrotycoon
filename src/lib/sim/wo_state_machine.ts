// Máquina de estados de Work Orders en runtime. Avanza con tick.
//
// Fases y duración (sobre template.durationMinutes):
//   ToPlane → (no consume tiempo aquí, lo lleva assignment)
//   Inspection (15% × duration)
//   MainTask (100% × duration)   ← 40% lo saltan (direct dispatch)
//   Test (10% × duration)
//   [Rework (100% × duration)]  ← 10% prob tras Test
//   Completed
//
// La velocidad de progreso = teamEffectiveEfficiency × minutes_real_tick.
// SLA: si nowMinute > wo.slaMinute y phase ≠ Completed, se acumula latePenaltyMinutes.

import type { Mechanic, WorkOrderInstance, WorkOrderTemplate, Balance, WorkOrderPhase } from "$lib/types";
import { teamEffectiveEfficiency } from "./assignment.ts";
import { randBool, type Rng } from "./rng.ts";

/** Eventos que emite la máquina por tick — para que economía/reputación los consuma. */
export type WoEvent =
  | { type: "wo_started"; woInstanceId: string }
  | { type: "wo_completed"; woInstanceId: string; templateId: string; onTime: boolean; isAOG: boolean }
  | { type: "wo_failed"; woInstanceId: string; templateId: string; reason: "deadline" | "departed"; isAOG: boolean }
  | { type: "phase_change"; woInstanceId: string; from: WorkOrderPhase; to: WorkOrderPhase };

export interface TickWoResult {
  workOrders: WorkOrderInstance[];
  mechanics: Mechanic[];
  events: WoEvent[];
}

function phaseDuration(template: WorkOrderTemplate, phase: WorkOrderPhase, balance: Balance): number {
  switch (phase) {
    case "Inspection": return Math.round(template.durationMinutes * balance.phaseDurationRatios.inspection);
    case "MainTask":   return Math.round(template.durationMinutes * balance.phaseDurationRatios.mainTask);
    case "Test":       return Math.round(template.durationMinutes * balance.phaseDurationRatios.test);
    case "Rework":     return Math.round(template.durationMinutes * balance.phaseDurationRatios.rework);
    // v2: Release = cierre/firma RTD, corto y fijo (no escala con la duración del trabajo).
    case "Release":    return balance.releaseMinutes ?? 3;
    default:           return 0;
  }
}

function getTemplate(templates: readonly WorkOrderTemplate[], id: string): WorkOrderTemplate | undefined {
  return templates.find((t) => t.id === id);
}

/**
 * Avanza UN tick (minutesElapsed minutos ingame) sobre todas las WOs activas.
 * Promociona fases, libera mecánicos al completarse, emite eventos.
 */
export function tickWorkOrders(
  workOrders: readonly WorkOrderInstance[],
  mechanics: readonly Mechanic[],
  templates: readonly WorkOrderTemplate[],
  balance: Balance,
  minutesElapsed: number,
  rng: Rng,
  nowMinute = -1,
  // v2: reloj para sellar timestamps de la cronología. SEPARADO de nowMinute (que gobierna
  // shift-gating + onTime y se pasa -1 cuando el gating está off). stampClock se pasa SIEMPRE
  // = reloj real, para que los hitos se sellen pase lo que pase con el gating. -1 = no sellar.
  stampClock = -1,
): TickWoResult {
  const events: WoEvent[] = [];
  let newMechanics = [...mechanics];
  const newWos: WorkOrderInstance[] = [];

  for (const wo of workOrders) {
    // Deferred es "pasivo": no progresa por trabajo, solo por reloj (lo maneja tickMel).
    if (wo.phase === "Completed" || wo.phase === "Failed" || wo.phase === "ToPlane" || wo.phase === "Deferred") {
      newWos.push(wo);
      continue;
    }

    const template = getTemplate(templates, wo.templateId);
    if (!template) {
      newWos.push(wo);
      continue;
    }

    const teamEff = teamEffectiveEfficiency(wo, newMechanics, nowMinute >= 0 ? nowMinute : undefined);
    if (teamEff === 0) {
      // sin mecánicos efectivos, no avanza
      newWos.push(wo);
      continue;
    }

    const progress = minutesElapsed * teamEff;
    let elapsed = wo.phaseElapsedMinutes + progress;
    let phase: WorkOrderPhase = wo.phase;
    let phaseChanged = false;

    // Loop por si el progreso cruza varias fases en un solo tick (con speed alto).
    // v2: sella el timestamp del hito que ACABA en cada transición (cronología para el
    // timeline del detalle). nowMinute es el reloj actual; con tick pequeño la granularidad
    // basta. Si nowMinute<0 (tests legacy sin reloj), no sella (campos quedan undefined).
    let safety = 0;
    const stamps: Partial<WorkOrderInstance> = {};
    while (phase !== "Completed" && phase !== "Failed" && elapsed >= phaseDuration(template, phase, balance)) {
      const dur = phaseDuration(template, phase, balance);
      const carryover = elapsed - dur;
      const nextPhase = transitionPhase(phase, rng, balance);
      const sc = stampClock >= 0 ? stampClock : (nowMinute >= 0 ? nowMinute : -1);
      if (sc >= 0) {
        if (phase === "Inspection") { stamps.tshootCompleteMinute = sc; stamps.scopeRevealed = true; }
        // fixCompleteMinute = fin de MainTask (spec). NO se re-sella en Rework: el rework ocurre
        // DESPUÉS de Test (Test→Rework→Release) y re-sellarlo dejaría fix>test, rompiendo el orden
        // cronológico del timeline. El rework queda implícito entre testComplete y release.
        else if (phase === "MainTask") stamps.fixCompleteMinute = sc;
        else if (phase === "Test") stamps.testCompleteMinute = sc;
        else if (phase === "Release") stamps.releaseMinute = sc;
      }
      events.push({ type: "phase_change", woInstanceId: wo.instanceId, from: phase, to: nextPhase });
      phase = nextPhase;
      elapsed = carryover;
      phaseChanged = true;
      if (++safety > 6) break; // protección
    }

    if (phase === "Completed") {
      // onTime si el clock actual aún no superó el SLA. Si nowMinute no se pasa, fallback a estimación.
      const wasOnTime = nowMinute >= 0 ? nowMinute <= wo.slaMinute : (wo.emissionMinute + accumulatedPhasesDuration(template, balance) <= wo.slaMinute);

      events.push({
        type: "wo_completed",
        woInstanceId: wo.instanceId,
        templateId: wo.templateId,
        onTime: wasOnTime,
        isAOG: template.isAOG,
      });

      // Liberar mecánicos → Returning (timer = 2 min)
      newMechanics = newMechanics.map((m) => {
        if (m.assignedWoInstanceId === wo.instanceId) {
          return { ...m, state: "Returning" as const, stateRemainingMinutes: balance.officeToStandMinutes };
        }
        return m;
      });
    }

    newWos.push({ ...wo, ...stamps, phase, phaseElapsedMinutes: elapsed });

    if (phaseChanged && phase === "Inspection") {
      // Primera entrada a Inspection desde ToPlane, emit started
      // (en realidad esta transición ya la hizo assignment.tickMechanicTravel; este branch puede no llegar)
    }
  }

  return { workOrders: newWos, mechanics: newMechanics, events };
}

/** Decide la siguiente fase tras completar la actual.
 *  v2 ciclo de vida: tras Test-pass (o Rework) NO se va directo a Completed, sino a Release
 *  (fase corta de cierre/firma = Ready To Dispatch). Release → Completed. */
function transitionPhase(current: WorkOrderPhase, rng: Rng, balance: Balance): WorkOrderPhase {
  switch (current) {
    case "Inspection":
      // 40% direct dispatch (salta a Test sin MainTask)
      return randBool(rng, balance.probabilities.directDispatch) ? "Test" : "MainTask";
    case "MainTask":
      return "Test";
    case "Test":
      // 10% rework; si pasa el test → Release (cierre RTD), no directo a Completed.
      return randBool(rng, balance.probabilities.reworkAfterTest) ? "Rework" : "Release";
    case "Rework":
      return "Release";
    case "Release":
      return "Completed";
    default:
      return current;
  }
}

/** Suma cuantitativa aproximada de duración total para checks SLA. */
function accumulatedPhasesDuration(
  template: WorkOrderTemplate,
  balance: Balance,
): number {
  // Simplificado: cuenta Inspection + (MainTask) + Test + (Rework). Asumimos camino "completo" pero
  // sin saber si hubo direct dispatch o rework. Esto se calcula en realidad sumando fases ejecutadas
  // que registra cada wo. MVP: aproximación con duración nominal.
  return Math.round(
    template.durationMinutes *
    (balance.phaseDurationRatios.inspection + balance.phaseDurationRatios.mainTask + balance.phaseDurationRatios.test),
  );
}

/**
 * Verifica si una WO ha excedido su SLA y debe marcarse como Failed (en MVP solo si el avión ya salió).
 * Más sutil: solo Failed si nowMinute > scheduledDepartureMinute del avión, no solo del SLA.
 * Por ahora marcamos Failed si pasa SLA y todavía no completed cuando el caller decide.
 */
export function checkSlaExpired(
  workOrders: readonly WorkOrderInstance[],
  nowMinute: number,
  marginMinutes = 0,
): WorkOrderInstance[] {
  return workOrders.filter(
    (w) => w.phase !== "Completed" && w.phase !== "Failed" && nowMinute > w.slaMinute + marginMinutes,
  );
}
