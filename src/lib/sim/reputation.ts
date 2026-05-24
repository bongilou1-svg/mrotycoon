// Reputación 0-100 SEGMENTADA POR AEROLÍNEA — Bloque M.
//
// Antes (Fase 2): un único `value` global. Ahora: `perAirline[airlineId] = score 0-100`.
// Esto permite decisiones tipo "cuidar a la aerolínea premium aunque la mala me odie".

import type { Airline, Balance } from "$lib/types";

export interface ReputationState {
  /** Score 0-100 por aerolínea. La clave es `Airline.id`. */
  perAirline: Record<string, number>;
}

/** Crea estado inicial con TODAS las aerolíneas a `initial` (típicamente 50). */
export function createReputation(initial: number, airlines: readonly Airline[]): ReputationState {
  const clamped = Math.max(0, Math.min(100, initial));
  const perAirline: Record<string, number> = {};
  for (const al of airlines) perAirline[al.id] = clamped;
  return { perAirline };
}

/** Crea estado inicial para tests/legacy donde no hay airlines disponibles. */
export function createReputationEmpty(): ReputationState {
  return { perAirline: {} };
}

/** Aplica delta a UNA aerolínea. Si no existe la clave, la inicializa al valor base default 50. */
export function applyDelta(
  state: ReputationState,
  airlineId: string,
  delta: number,
  defaultInit = 50,
): ReputationState {
  const cur = state.perAirline[airlineId] ?? defaultInit;
  const next = Math.max(0, Math.min(100, cur + delta));
  return { perAirline: { ...state.perAirline, [airlineId]: next } };
}

/** Aplica el MISMO delta a TODAS las aerolíneas (eventos globales — multa Part-145, etc). */
export function applyDeltaGlobal(state: ReputationState, delta: number): ReputationState {
  const perAirline: Record<string, number> = {};
  for (const [id, v] of Object.entries(state.perAirline)) {
    perAirline[id] = Math.max(0, Math.min(100, v + delta));
  }
  return { perAirline };
}

/** Devuelve rep de una aerolínea concreta (con default si no existe). */
export function getRep(state: ReputationState, airlineId: string, defaultInit = 50): number {
  return state.perAirline[airlineId] ?? defaultInit;
}

/** Media de reputación entre todas las aerolíneas — para HUD agregado. */
export function getAverageRep(state: ReputationState): number {
  const values = Object.values(state.perAirline);
  if (values.length === 0) return 50;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Reputación derivada del evento de WO. */
export function reputationDeltaForWo(
  balance: Balance,
  outcome: "completedOnTime" | "completedLate" | "failed" | "aogFailed",
): number {
  switch (outcome) {
    case "completedOnTime": return balance.reputation.woCompletedOnTime;
    case "completedLate":   return balance.reputation.woCompletedLate;
    case "failed":          return balance.reputation.woFailed;
    case "aogFailed":       return balance.reputation.aogFailed;
  }
}

/** Game over por reputación: TODAS las aerolíneas con rep ≤ threshold. */
export function allAirlinesBelowThreshold(state: ReputationState, threshold: number): boolean {
  const values = Object.values(state.perAirline);
  if (values.length === 0) return false;
  return values.every((v) => v <= threshold);
}

/** Migración: si el save antiguo trae `{ value: N }` (v5 y anteriores), lo convertimos a perAirline
 *  inicializando todas las aerolíneas conocidas a ese valor. */
export function migrateLegacyReputation(
  legacy: { value?: number; perAirline?: Record<string, number> } | undefined,
  airlines: readonly Airline[],
): ReputationState {
  if (legacy && legacy.perAirline) return { perAirline: legacy.perAirline };
  const v = legacy?.value ?? 50;
  return createReputation(v, airlines);
}
