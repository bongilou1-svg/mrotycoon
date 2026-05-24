// Catálogo de stands del MRO. Dinámico según `mroStage` desde Fase 5A Bloque X.
//
// Pivot línea pura · iteración 2026-05-24: stage 1 sube de 3 a 5 line stands (alineado
// con la realidad de OVD que tiene ~8-10 stands operativos en plataforma). La progresión
// stage 2-4 desbloquea más capacidad + bases interiores.
//
// Stage 1 (default): 5 line + 1 base (H1) — aeropuerto regional con 5 plazas de plataforma.
// Stage 2: +1 line extra (R1, "ramp expansion sin hangar").
// Stage 3: +1 line + 1 base (H2 hangar interior 1 posición).
// Stage 4: +2 base (H3 hangar mayor 3 posiciones, lo que da 4 base total).

import type { MroStage } from "$lib/types";

export type StandType = "line" | "base";

export interface Stand {
  /** ID estable usado en `AirplaneInstance.standId` y `MaintenanceCheckInstance.standId`. */
  id: string;
  /** Tipo: line vs base. Afecta qué entra ahí. */
  type: StandType;
}

/** Catálogo COMPLETO de stands posibles (stage 4 max). Para queries usar `currentStands(stage)`. */
export const ALL_STANDS: readonly Stand[] = [
  // Stage 1 base — 5 line stands operativos del aeropuerto regional
  { id: "H1-S1", type: "line" },
  { id: "H1-S2", type: "line" },
  { id: "H1-S3", type: "line" },
  { id: "H1-S4", type: "line" },
  { id: "H1-S5", type: "line" },
  { id: "H1-B1", type: "base" },
  // Stage 2 — ramp expansion (+1 line)
  { id: "R1",   type: "line" },
  // Stage 3 — hangar interior 1 posición (+1 line + 1 base)
  { id: "H2-S1", type: "line" },
  { id: "H2-B1", type: "base" },
  // Stage 4 — hangar mayor 3 posiciones (+2 base)
  { id: "H3-B1", type: "base" },
  { id: "H3-B2", type: "base" },
] as const;

/** Cuántos stands de cada tipo están disponibles en cada stage. */
const COUNTS_PER_STAGE: Record<MroStage, { line: number; base: number }> = {
  1: { line: 5, base: 1 },
  2: { line: 6, base: 1 },
  3: { line: 7, base: 2 },
  4: { line: 7, base: 4 },
};

/** Stands disponibles en el stage actual. */
export function currentStands(stage: MroStage): Stand[] {
  const { line, base } = COUNTS_PER_STAGE[stage];
  const lines = ALL_STANDS.filter((s) => s.type === "line").slice(0, line);
  const bases = ALL_STANDS.filter((s) => s.type === "base").slice(0, base);
  return [...lines, ...bases];
}

/** IDs de stands line del stage actual. */
export function currentLineStandIds(stage: MroStage): string[] {
  return currentStands(stage).filter((s) => s.type === "line").map((s) => s.id);
}

/** IDs de stands base del stage actual. */
export function currentBaseStandIds(stage: MroStage): string[] {
  return currentStands(stage).filter((s) => s.type === "base").map((s) => s.id);
}

/** Backward compat: catálogo stage 1 (lo que existía antes de Fase 5A). Tests legacy
 *  que importen `STANDS` siguen viendo el set Fase 3. */
export const STANDS: readonly Stand[] = currentStands(1);
export const LINE_STAND_IDS = currentLineStandIds(1);
export const BASE_STAND_IDS = currentBaseStandIds(1);

/** Devuelve el tipo de un stand por su id (busca en ALL_STANDS para que funcione con cualquier stage). */
export function standType(id: string): StandType | undefined {
  return ALL_STANDS.find((s) => s.id === id)?.type;
}
