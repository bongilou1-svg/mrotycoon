// Progresión orgánica del MRO — Fase 5A Bloque X.
//
// 4 etapas con coste creciente y capacidad espacial creciente. Empiezas en 1 (default).
// Cada upgrade desbloquea más stands (line y/o base) + escala el `weeklyFixedCost`.

export type MroStage = 1 | 2 | 3 | 4;

export interface StageConfig {
  /** Coste de upgrade a esta etapa (€). */
  costEur: number;
  /** Días de construcción tras pagar el coste. 0 = instantáneo. */
  buildDays: number;
  /** Stands totales al alcanzar esta etapa (line, base). */
  lineStands: number;
  baseStands: number;
  /** Número equivalente de hangares ADICIONALES sobre el 1 inicial (para escalar
   *  `weeklyFixedCost` vía `WEEKLY_FIXED_COST_PER_EXTRA_HANGAR`). */
  extraHangars: number;
  /** Descripción humana corta (mostrada en UI). */
  label: string;
}

export const STAGE_CONFIG: Record<MroStage, StageConfig> = {
  1: {
    costEur: 0,
    buildDays: 0,
    lineStands: 3,
    baseStands: 1,
    extraHangars: 0,
    label: "Line + pernocta (default)",
  },
  2: {
    costEur: 100000,
    buildDays: 0,
    lineStands: 4,
    baseStands: 1,
    extraHangars: 0,
    label: "Stand extra en plataforma",
  },
  3: {
    costEur: 500000,
    buildDays: 14,
    lineStands: 5,
    baseStands: 2,
    extraHangars: 1,
    label: "Hangar interior (1 posición)",
  },
  4: {
    costEur: 1500000,
    buildDays: 30,
    lineStands: 5,
    baseStands: 4,
    extraHangars: 3,
    label: "Hangar mayor (3 posiciones)",
  },
};

/** Estado de construcción en curso. */
export interface ActiveBuild {
  /** Etapa objetivo (>= current+1). */
  targetStage: MroStage;
  /** Minuto absoluto en el que termina la construcción. */
  completionMinute: number;
  /** Minuto absoluto cuando empezó (para UI). */
  startedAtMinute: number;
}
