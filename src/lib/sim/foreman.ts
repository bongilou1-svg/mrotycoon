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
