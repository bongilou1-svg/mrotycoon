// Asignación de mecánicos a Work Orders. Inmutable: cada función devuelve nuevos arrays.
// Reglas:
//   - 1 certifier (con type rating válido) obligatorio
//   - 0-2 helpers opcionales (cualquier mecánico Idle)
//   - Al asignar: mecánicos pasan a ToPlane con timer = officeToStandMinutes
//   - Cuando timer llega a 0, pasan a Working y la WO entra en Inspection

import type { Mechanic, WorkOrderInstance, Balance } from "$lib/types";
import { moralMultiplier, DEFAULT_MORAL, inShift } from "./shifts.ts";

export interface AssignResult {
  mechanics: Mechanic[];
  workOrders: WorkOrderInstance[];
  error?: string;
}

/**
 * Asigna mecánicos a una WO. El primer ID en mechanicIds es el certifier.
 * Marca todos como ToPlane con timer = balance.officeToStandMinutes.
 */
export function assignMechanicsToWo(
  mechanics: readonly Mechanic[],
  workOrders: readonly WorkOrderInstance[],
  woInstanceId: string,
  certifierId: string,
  helperIds: readonly string[],
  balance: Balance,
  nowMinute = -1, // v2: si se pasa, sella dispatchMinute (arranque del viaje del mecánico)
  standTravelMinutes: Record<string, number> = {}, // INC3: viaje oficina→stand por distancia OSM
): AssignResult {
  const wo = workOrders.find((w) => w.instanceId === woInstanceId);
  if (!wo) return { mechanics: [...mechanics], workOrders: [...workOrders], error: "WO not found" };
  if (wo.assignedMechanicIds.length > 0)
    return { mechanics: [...mechanics], workOrders: [...workOrders], error: "WO already assigned" };

  const certifier = mechanics.find((m) => m.id === certifierId);
  if (!certifier) return { mechanics: [...mechanics], workOrders: [...workOrders], error: "Certifier not found" };
  if (certifier.state !== "Idle")
    return { mechanics: [...mechanics], workOrders: [...workOrders], error: "Certifier not Idle" };

  const helpers: Mechanic[] = [];
  for (const hid of helperIds) {
    const h = mechanics.find((m) => m.id === hid);
    if (!h) return { mechanics: [...mechanics], workOrders: [...workOrders], error: `Helper ${hid} not found` };
    if (h.state !== "Idle")
      return { mechanics: [...mechanics], workOrders: [...workOrders], error: `Helper ${hid} not Idle` };
    helpers.push(h);
  }
  if (helpers.length > 2)
    return { mechanics: [...mechanics], workOrders: [...workOrders], error: "Max 2 helpers" };

  // INC3: viaje variable oficina→stand. El mapa lo precomputa createGame por distancia OSM real;
  // si la WO no tiene stand o el mapa no lo cubre, cae al fijo balance.officeToStandMinutes (compat).
  const travelMin = standTravelMinutes[wo.standId ?? ""] ?? balance.officeToStandMinutes;

  const allAssignedIds = [certifierId, ...helperIds];
  const newMechanics = mechanics.map((m) => {
    if (!allAssignedIds.includes(m.id)) return m;
    return {
      ...m,
      state: "ToPlane" as const,
      assignedWoInstanceId: woInstanceId,
      assignedCheckInstanceId: null,
      stateRemainingMinutes: travelMin,
    };
  });

  const newWos = workOrders.map((w) =>
    w.instanceId === woInstanceId
      ? { ...w, assignedMechanicIds: [...allAssignedIds],
          // INC3: sella el viaje planificado (lo reusa el viaje de vuelta en Returning).
          plannedTravelMinutes: travelMin,
          // v2: sella el despacho (arranque del viaje del mecánico) si se pasó el reloj.
          ...(nowMinute >= 0 ? { dispatchMinute: nowMinute } : {}) }
      : w,
  );

  return { mechanics: newMechanics, workOrders: newWos };
}

/**
 * Desasigna todos los mecánicos de una WO (vuelven a Idle).
 */
export function unassignWo(
  mechanics: readonly Mechanic[],
  workOrders: readonly WorkOrderInstance[],
  woInstanceId: string,
): AssignResult {
  const wo = workOrders.find((w) => w.instanceId === woInstanceId);
  if (!wo) return { mechanics: [...mechanics], workOrders: [...workOrders], error: "WO not found" };

  const ids = new Set(wo.assignedMechanicIds);
  const newMechanics = mechanics.map((m) =>
    ids.has(m.id)
      ? { ...m, state: "Idle" as const, assignedWoInstanceId: null, assignedCheckInstanceId: null, stateRemainingMinutes: 0 }
      : m,
  );
  const newWos = workOrders.map((w) =>
    w.instanceId === woInstanceId ? { ...w, assignedMechanicIds: [], phase: "ToPlane" as const, phaseElapsedMinutes: 0 } : w,
  );
  return { mechanics: newMechanics, workOrders: newWos };
}

/**
 * Avanza timers de ToPlane y Returning. Mecánicos con timer = 0 pasan al siguiente estado:
 *   - ToPlane → Working (si su WO tiene mecánicos)
 *   - Returning → Idle
 *
 * También transiciona WOs de ToPlane a Inspection cuando TODOS sus mecánicos llegan al stand.
 */
export function tickMechanicTravel(
  mechanics: readonly Mechanic[],
  workOrders: readonly WorkOrderInstance[],
  minutesElapsed: number,
  nowMinute = -1, // v2: si se pasa, sella arrivalAtStandMinute al promover ToPlane→Inspection
): { mechanics: Mechanic[]; workOrders: WorkOrderInstance[] } {
  const newMechanics: Mechanic[] = mechanics.map((m) => {
    if (m.state !== "ToPlane" && m.state !== "Returning") return m;
    const remaining = Math.max(0, m.stateRemainingMinutes - minutesElapsed);
    if (remaining > 0) return { ...m, stateRemainingMinutes: remaining };
    // Llegó: cambia estado
    if (m.state === "ToPlane") {
      return { ...m, state: "Working" as const, stateRemainingMinutes: 0 };
    }
    // Returning → Idle, suelta asignación
    return { ...m, state: "Idle" as const, assignedWoInstanceId: null, assignedCheckInstanceId: null, stateRemainingMinutes: 0 };
  });

  // Promover WOs ToPlane → Inspection cuando todos sus mecánicos están Working
  const newWos = workOrders.map((w) => {
    if (w.phase !== "ToPlane") return w;
    if (w.assignedMechanicIds.length === 0) return w; // aún sin asignar
    const allArrived = w.assignedMechanicIds.every((id) => {
      const m = newMechanics.find((mm) => mm.id === id);
      return m?.state === "Working";
    });
    if (allArrived) {
      // v2: el mecánico llegó al stand → sella arrivalAtStand + travelMinutes (dispatch→llegada).
      const stamp = nowMinute >= 0
        ? { arrivalAtStandMinute: nowMinute,
            travelMinutes: w.dispatchMinute !== undefined ? Math.max(0, nowMinute - w.dispatchMinute) : undefined }
        : {};
      return { ...w, phase: "Inspection" as const, phaseElapsedMinutes: 0, ...stamp };
    }
    return w;
  });

  return { mechanics: newMechanics, workOrders: newWos };
}

/** Eficiencia efectiva de UN mecánico ahora (incluye moral + shift gating si nowMinute pasado). */
function effectiveSingle(m: Mechanic, nowMinute?: number): number {
  if (nowMinute !== undefined && !inShift(m, nowMinute)) return 0;
  const moral = m.moral ?? DEFAULT_MORAL;
  return m.efficiency * moralMultiplier(moral);
}

/**
 * Eficiencia efectiva del equipo asignado a una WO:
 *   certifier_eff × 1.0 + sum(helpers_eff × 0.5 × cap_a_certifier)
 *
 * Fase 4 Q1 (2026-05-15): activado shift gating productivo. Cuando se pasa `nowMinute`,
 * mecánicos fuera de su turno contribuyen 0 (incluido el certifier — si está off-shift
 * la WO no progresa, no hay supervisión legal). Sin `nowMinute` (tests legacy / contexts
 * que no necesitan gating) el filtro no se aplica para no romper.
 */
export function teamEffectiveEfficiency(
  workOrder: WorkOrderInstance,
  mechanics: readonly Mechanic[],
  nowMinute?: number,
): number {
  if (workOrder.assignedMechanicIds.length === 0) return 0;
  const team = workOrder.assignedMechanicIds
    .map((id) => mechanics.find((m) => m.id === id))
    .filter((m): m is Mechanic => m !== undefined);
  const certifier = team[0];
  if (!certifier) return 0;
  const certifierEff = effectiveSingle(certifier, nowMinute);
  if (certifierEff === 0) return 0; // sin certifier on-shift, WO no progresa
  const helperCap = certifierEff * 0.5;
  let total = certifierEff;
  for (const h of team.slice(1)) {
    total += Math.min(effectiveSingle(h, nowMinute) * 0.5, helperCap);
  }
  return total;
}
