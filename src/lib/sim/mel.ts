// Sistema MEL (Minimum Equipment List) — Fase 3 Bloque I.
//
// Una WorkOrder con `melCategory != null` puede DIFERIRSE: el jugador decide no repararla ahora,
// el avión sale, y la WO queda en estado `Deferred` con un countdown hasta `deferralExpiryMinute`.
// Al vencer → penalty regulatoria (€ + reputación) + la WO pasa a `Failed`.
//
// MVP: la deferral es una decisión one-shot (no se puede "anular"). En Fase 4 podríamos añadir
// "reparar ya" antes de que venza (cancela la deferral, devuelve la WO al flujo normal).

import type { MelCategory, WorkOrderInstance, WorkOrderTemplate } from "$lib/types";
import { DAY_MINUTES } from "./time.ts";

/** Ventanas de deferral en días por categoría MEL. D=indefinido se modela como 365 días
 *  (≈ 1 año ingame) — más que cualquier partida realista, así no expira "casi nunca". */
export const MEL_DEFERRAL_DAYS: Record<"A" | "B" | "C" | "D", number> = {
  A: 3,
  B: 10,
  C: 120,
  D: 365,
};

/** Penalty regulatoria por deferral vencida (€). */
export const MEL_EXPIRY_PENALTY_EUR = 10000;
/** Penalty reputación por deferral vencida. */
export const MEL_EXPIRY_REP_DELTA = -5;

/**
 * Deriva `melCategory` cuando el template no la trae explícita (datasets pre-Fase3 H1).
 * Reglas:
 *  - isAOG → null (nunca diferible)
 *  - severity Critical → null
 *  - deferrable=false → null
 *  - Bloque N calibración: dataset legacy marca `deferrable=true` en ~92% pero el brief pide ~30%.
 *    Aplicamos hash determinista sobre `template.id` (WO-NNN) para limitar el reparto a ~30%.
 *  - Si el template no tiene `id` parseable (fixture de test): fallback al heurístico simple
 *    (Major→B, Minor→C) para no romper tests existentes.
 *
 *  Si el template trae `melCategory` explícita (string o null), se respeta tal cual.
 *  Las WOs `isAOG=true` se sobreescriben a null aunque el template diga lo contrario
 *  (consistencia: AOG = aircraft on ground, no puede salir con eso).
 */
export function deriveMelCategory(template: WorkOrderTemplate): MelCategory {
  if (template.isAOG) return null;
  if (template.melCategory !== undefined) return template.melCategory;
  if (template.severity === "Critical") return null;
  if (!template.deferrable) return null;
  // Hash determinista por id para acotar al ~30% el porcentaje de deferrables.
  const idMatch = /^WO-0*(\d+)$/.exec(template.id ?? "");
  if (idMatch) {
    const bucket = parseInt(idMatch[1], 10) % 100;
    // Distribución target: ~5% A · ~10% B · ~12% C · ~3% D = 30% deferrable
    if (bucket < 5) return "A";
    if (bucket < 15) return "B";
    if (bucket < 27) return "C";
    if (bucket < 30) return "D";
    return null;
  }
  // Fallback heurístico para fixtures de test sin id estándar.
  if (template.severity === "Major") return "B";
  return "C";
}

/** Tag derivada o explícita — usado por UI y la lógica de defer. */
export function getMelCategory(template: WorkOrderTemplate): MelCategory {
  return deriveMelCategory(template);
}

/** Marca una WO como diferida y devuelve la nueva instancia. Si no es diferible, devuelve null. */
export function deferWorkOrder(
  wo: WorkOrderInstance,
  template: WorkOrderTemplate,
  nowMinute: number,
): WorkOrderInstance | null {
  const cat = getMelCategory(template);
  if (cat === null) return null;
  if (wo.phase === "Completed" || wo.phase === "Failed" || wo.phase === "Deferred") return null;
  const days = MEL_DEFERRAL_DAYS[cat];
  return {
    ...wo,
    phase: "Deferred",
    phaseElapsedMinutes: 0,
    assignedMechanicIds: [], // libera mecánicos asignados
    deferralExpiryMinute: nowMinute + days * DAY_MINUTES,
  };
}

/** WOs actualmente diferidas, ordenadas por proximidad al vencimiento. */
export function deferredWorkOrders(wos: readonly WorkOrderInstance[]): WorkOrderInstance[] {
  return wos
    .filter((w) => w.phase === "Deferred")
    .sort((a, b) => (a.deferralExpiryMinute ?? 0) - (b.deferralExpiryMinute ?? 0));
}

/**
 * Reactiva una WO diferida — Fase 4 Bloque R "Reparar ya".
 * La WO pasa de `Deferred` a `ToPlane` (sin equipo asignado), pending re-asignación manual
 * del jugador. Limpia `deferralExpiryMinute`. No tiene coste extra: el coste de la decisión
 * "diferir" ya se pagó al diferir; revertir es operativamente neutral.
 *
 * Devuelve la nueva WO o null si no estaba en Deferred (idempotente).
 */
export function unDeferWorkOrder(wo: WorkOrderInstance): WorkOrderInstance | null {
  if (wo.phase !== "Deferred") return null;
  return {
    ...wo,
    phase: "ToPlane",
    phaseElapsedMinutes: 0,
    assignedMechanicIds: [],
    deferralExpiryMinute: undefined,
  };
}

export interface MelTickEvent {
  type: "mel_expired";
  woInstanceId: string;
  templateId: string;
  airplaneRegistration: string;
  penaltyEur: number;
  repDelta: number;
}

/**
 * Tick MEL: detecta deferrals vencidas → marca Failed + emite evento.
 * Devuelve la lista actualizada de WOs y los eventos generados.
 * Mutación inmutable: no toca el array de entrada.
 */
export function tickMel(
  workOrders: readonly WorkOrderInstance[],
  nowMinute: number,
): { workOrders: WorkOrderInstance[]; events: MelTickEvent[] } {
  const events: MelTickEvent[] = [];
  const newWos = workOrders.map((w) => {
    if (w.phase !== "Deferred") return w;
    if (w.deferralExpiryMinute === undefined) return w;
    if (nowMinute < w.deferralExpiryMinute) return w;
    events.push({
      type: "mel_expired",
      woInstanceId: w.instanceId,
      templateId: w.templateId,
      airplaneRegistration: w.airplaneRegistration,
      penaltyEur: MEL_EXPIRY_PENALTY_EUR,
      repDelta: MEL_EXPIRY_REP_DELTA,
    });
    return { ...w, phase: "Failed" as const };
  });
  return { workOrders: newWos, events };
}
