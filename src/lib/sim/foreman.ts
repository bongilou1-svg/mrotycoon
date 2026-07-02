// Lead Foreman / TMA jefe — Fase 5A Bloque W.
//
// Cuando el jugador contrata un Lead Foreman (mecánico `isLeadForeman=true`, salario
// LEAD_FOREMAN_WEEKLY_SALARY), el setting `autoAssignEnabled` desbloquea automatización.
//
// Funciones:
//  - `tickAutoAssign`: WOs sin equipo + 1 certifier eligible único → auto-asigna. En empate
//    (≥2 candidatos elegibles) deja la WO para que el jugador decida.
//  - `findHandoffReplacement`: cuando un certifier sale de turno, busca otro certifier
//    on-shift con rating válido para la WO. Si match → re-asignar; si no → liberar como
//    en MVP Fase 4 Q.

import type { Mechanic, WorkOrderInstance, WorkOrderTemplate, Airplane, Balance } from "$lib/types";
import { eligibleCertifiers } from "./mechanics.ts";
import { assignMechanicsToWo } from "./assignment.ts";
import { inShift } from "./shifts.ts";
import { unDeferWorkOrder } from "./mel.ts";

/** ¿Hay al menos un Lead Foreman idle disponible? */
export function hasActiveLead(mechanics: readonly Mechanic[]): boolean {
  return mechanics.some((m) => m.isLeadForeman && (m.state === "Idle" || m.state === "OffShift"));
}

/** Evento emitido por `tickAutoAssign`. */
export interface AutoAssignEvent {
  type: "auto_assigned";
  woInstanceId: string;
  airplaneRegistration: string;
  certifierId: string;
  certifierName: string;
}

/**
 * Recorre WOs sin asignar (phase=ToPlane, sin mecánicos) y auto-asigna cuando hay exactamente
 * 1 certifier eligible Idle on-shift. Caso de match único → asigna sin helpers (el jugador
 * puede añadir manualmente). Múltiples candidatos → no asigna (deja decisión al jugador).
 *
 * Devuelve { mechanics, workOrders, events } con todos los cambios aplicados.
 */
export function tickAutoAssign(
  mechanics: readonly Mechanic[],
  workOrders: readonly WorkOrderInstance[],
  templates: readonly WorkOrderTemplate[],
  airplanes: readonly Airplane[],
  balance: Balance,
  nowMinute: number,
): {
  mechanics: Mechanic[];
  workOrders: WorkOrderInstance[];
  events: AutoAssignEvent[];
} {
  const events: AutoAssignEvent[] = [];
  let curMechs = [...mechanics];
  let curWos = [...workOrders];

  for (const wo of workOrders) {
    if (wo.assignedMechanicIds.length > 0) continue;
    if (wo.phase !== "ToPlane") continue;
    const tpl = templates.find((t) => t.id === wo.templateId);
    const ap = airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
    if (!tpl || !ap) continue;
    // Solo Idle en su shift cuenta (gating ya filtra OffShift cuando shiftGatingEnabled).
    const candidates = eligibleCertifiers(curMechs, tpl, ap.model, ap.engineVariant)
      .filter((m) => inShift(m, nowMinute));
    if (candidates.length !== 1) continue; // solo match único trivial
    const cert = candidates[0];
    const res = assignMechanicsToWo(curMechs, curWos, wo.instanceId, cert.id, [], balance);
    if (res.error) continue;
    curMechs = res.mechanics;
    curWos = res.workOrders;
    events.push({
      type: "auto_assigned",
      woInstanceId: wo.instanceId,
      airplaneRegistration: wo.airplaneRegistration,
      certifierId: cert.id,
      certifierName: cert.name,
    });
  }

  return { mechanics: curMechs, workOrders: curWos, events };
}

/** Evento de rescate de una MEL diferida. */
export interface DeferredRescueEvent {
  type: "mel_rescued";
  woInstanceId: string;
  airplaneRegistration: string;
  certifierName: string;
}

/**
 * Deep pass 2026-07-01 — rescate de MEL diferidas.
 *
 * Al diferir, el avión SE VA: la WO queda en `Deferred` sobre un instance que ya despegó, y nada
 * la re-agendaba → siempre vencía = multa diferida de 10k. Modelo realista de línea: la MEL se
 * rectifica cuando ESA matrícula VUELVE a tu estación en una rotación posterior y tienes cuadrilla
 * libre. Esta pasada rescata SOLO cuando es victoria garantizada (nunca crea AOG nuevo):
 *   - el avión (misma matrícula) está EN TIERRA ahora, aún no ha salido;
 *   - hay margen para completar antes de su salida (viaje + duración);
 *   - hay un certifier elegible Idle en turno;
 * → undefer + re-apunta la WO al instance en tierra + asigna en el acto. Recompensa tener
 *   capacidad ociosa: diferir pasa a ser "gano tiempo ahora, lo arreglo cuando el avión vuelva".
 */
export function tickDeferredRescue(
  mechanics: readonly Mechanic[],
  workOrders: readonly WorkOrderInstance[],
  templates: readonly WorkOrderTemplate[],
  airplanes: readonly Airplane[],
  balance: Balance,
  nowMinute: number,
  standTravelMinutes: Record<string, number> = {},
): { mechanics: Mechanic[]; workOrders: WorkOrderInstance[]; events: DeferredRescueEvent[] } {
  const events: DeferredRescueEvent[] = [];
  let curMechs = [...mechanics];
  let curWos = [...workOrders];

  // Aviones EN TIERRA ahora, por matrícula (una rotación de vuelta que aún no ha salido).
  const groundedByReg = new Map<string, Airplane>();
  for (const a of airplanes) {
    if (a.status === "Departed") continue;
    if (a.arrivalMinute > nowMinute) continue;
    if (a.scheduledDepartureMinute <= nowMinute) continue;
    if (!groundedByReg.has(a.registration)) groundedByReg.set(a.registration, a);
  }
  if (groundedByReg.size === 0) return { mechanics: curMechs, workOrders: curWos, events };

  for (const wo of workOrders) {
    if (wo.phase !== "Deferred") continue;
    const ground = groundedByReg.get(wo.airplaneRegistration);
    if (!ground) continue; // el avión no está de vuelta
    const tpl = templates.find((t) => t.id === wo.templateId);
    if (!tpl) continue;
    // Margen: ¿da tiempo a completar antes de que esta rotación salga? (viaje + book duration)
    const travel = standTravelMinutes[ground.standId ?? ""] ?? balance.officeToStandMinutes ?? 2;
    const need = travel + tpl.durationMinutes;
    if (ground.scheduledDepartureMinute - nowMinute < need) continue; // no da tiempo → sigue diferida
    // ¿Hay certifier libre en turno con rating? (si no, no rescatamos: no hay capacidad)
    const cert = eligibleCertifiers(curMechs, tpl, ground.model, ground.engineVariant)
      .filter((m) => inShift(m, nowMinute))[0];
    if (!cert) continue;
    // TRANSACCIONAL: undefer + re-apunte SOBRE UNA COPIA, y solo se commitea si la asignación
    // cuaja. Antes se undeferaba curWos primero y, si el assign fallaba, quedaba ToPlane sin
    // asignar → el bot la re-difería → vencía (churn: 41 eventos para 30 rescates). Ahora si el
    // assign falla, la WO queda Deferred intacta (rescatable en un tick posterior).
    const trialWos = curWos.map((w) => {
      if (w.instanceId !== wo.instanceId) return w;
      const un = unDeferWorkOrder(w);
      return un ? { ...un, airplaneInstanceId: ground.instanceId } : w;
    });
    const res = assignMechanicsToWo(curMechs, trialWos, wo.instanceId, cert.id, [], balance, nowMinute, standTravelMinutes);
    if (res.error) continue; // no cuajó → la WO sigue Deferred (curWos sin tocar)
    curMechs = res.mechanics;
    curWos = res.workOrders;
    events.push({ type: "mel_rescued", woInstanceId: wo.instanceId, airplaneRegistration: wo.airplaneRegistration, certifierName: cert.name });
  }

  return { mechanics: curMechs, workOrders: curWos, events };
}

/**
 * Busca un certifier de reemplazo on-shift para una WO cuyo certifier ha salido de turno.
 *
 * Llamado desde `tickShiftTransitions` cuando un certifier va a salir: si auto-handoff
 * activo + lead foreman idle + encontrarmos sustituto → re-asignar inmediatamente; si no →
 * pausar como MVP.
 *
 * Devuelve el ID del reemplazo o null si no hay candidato.
 */
export function findHandoffReplacement(
  woInstanceId: string,
  workOrders: readonly WorkOrderInstance[],
  mechanics: readonly Mechanic[],
  templates: readonly WorkOrderTemplate[],
  airplanes: readonly Airplane[],
  nowMinute: number,
  excludeMechId: string,
): Mechanic | null {
  const wo = workOrders.find((w) => w.instanceId === woInstanceId);
  if (!wo) return null;
  const tpl = templates.find((t) => t.id === wo.templateId);
  const ap = airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
  if (!tpl || !ap) return null;
  const candidates = eligibleCertifiers(mechanics, tpl, ap.model, ap.engineVariant)
    .filter((m) => m.id !== excludeMechId && inShift(m, nowMinute));
  if (candidates.length === 0) return null;
  // Pickear el primero (orden estable por ID). El jugador puede reasignar si no le gusta.
  return candidates[0];
}
