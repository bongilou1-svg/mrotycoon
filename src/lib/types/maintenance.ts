// Tipos del sistema de A/C/D checks (base maintenance).
//
// Distinción frente a WorkOrder:
//  - WO  = trabajo concreto sobre un avión recién aterrizado (line maintenance), turnaround corto.
//  - Check = mantenimiento PLANIFICADO disparado por FH/cycles acumulados, ocupa días/semanas
//            de hangar, bloquea avión para que no vuele hasta completarlo.

import type { AircraftModel } from "./airplane";

/** Letras estándar de la industria: A (ligero, horas), C (pesado, días), D (overhaul, semanas-meses). */
export type CheckType = "A" | "C" | "D";

/**
 * Definición estática de un tipo de check para un modelo concreto.
 * Vive en `data/maintenance_checks.json` y se carga al arrancar.
 */
export interface CheckDefinition {
  /** A | C | D. */
  type: CheckType;
  /** Modelo de avión al que aplica. */
  model: AircraftModel;
  /** FH desde el último check de este tipo que disparan la programación. */
  triggerFH: number;
  /** Cycles desde el último check de este tipo que disparan la programación. Se usa el primero
   *  de los dos umbrales que se cumpla (FH o cycles). */
  triggerCycles: number;
  /** Man-days ideales para completar el check. OJO: aquí 1 man-day = un DÍA-CALENDARIO de 24h de
   *  1 mecánico trabajando en continuo (el runtime usa MANDAY_MINUTES = DAY_MINUTES = 1440 min),
   *  NO el turno de 8h del convenio MRO. Para man-horas reales multiplica por 24, no por 8
   *  (p.ej. A = 8 man-days × 24h = 192 MH). Audit aero 2026-06-28: el doc decía "8h-equivalent"
   *  pero el código usa 24h → discrepancia ×3 corregida en el doc. */
  manDays: number;
  /** Días reales que el avión queda fuera de servicio (parking + trabajo). */
  parkingDays: number;
  /** Coste base que el MRO factura por completarlo (€). El jugador recibe el dinero al cerrar. */
  baseFee: number;
}

/** Estado runtime de un check disparado sobre un FleetAircraft concreto. */
export type CheckPhase =
  | "Scheduled" // generado, esperando que entre el avión al stand base
  | "InProgress" // mecánicos asignados, contando manDays-hours
  | "Completed"
  | "Cancelled"; // por si el jugador cierra contrato y libera el avión sin completar

/** Instancia activa o histórica de un check disparado sobre un avión persistente. */
export interface MaintenanceCheckInstance {
  /** ID único "MC-NNNNNN". */
  instanceId: string;
  /** Matrícula sobre la que se hace. Es el sujeto persistente. */
  registration: string;
  /** A | C | D. */
  type: CheckType;
  /** Minuto ingame en el que se generó (cuando se cruzó el umbral). */
  scheduledMinute: number;
  /** Minuto ingame en el que arrancó (avión pisó stand base + mecánicos asignados). */
  startedMinute?: number;
  /** Minuto ingame en el que cerró. */
  completedMinute?: number;
  /** Stand donde ocupa (BaseStand). Vacío hasta startedMinute. */
  standId: string;
  /** Estado vivo. */
  phase: CheckPhase;
  /** Mecánicos asignados. Más grande que en WO line (3-6 vs 1-3). */
  assignedMechanicIds: string[];
  /** Man-minutes acumulados (work efectivo, no wall-clock). Cuando alcanza
   *  `manDaysIdeal × workdayMinutes` el check completa. */
  manMinutesAccumulated: number;
  /** Snapshot de manDays del CheckDefinition en el momento de generación (los datos pueden cambiar
   *  entre versiones del juego; congelamos el contrato al disparar). */
  manDaysIdeal: number;
  /** Snapshot del baseFee al generar. Se cobra al completar. */
  baseFee: number;
  /** Snapshot del parkingDays. */
  parkingDays: number;
  /** Días de overrun (más allá de parkingDays) que YA se penalizaron. Evita doble-charge.
   *  Cada nuevo día completo de overrun → +1 y se emite penalty. */
  overrunDaysPenalized: number;
  /** Fase 5B V5: true si el check arrancó en franja nocturna (22:00-06:00). Informativo
   *  para auditoría de operación nocturna del MRO. No cambia lógica sim. */
  nightStarted?: boolean;
  /** Fase 5C X5: true si el A-check arrancó en LINE_STAND (a la intemperie, sin hangar).
   *  Solo permitido desde mroStage ≥ 2. Penalty calidad: efficiency 0.7× (tarda 43% más).
   *  Sólo aplica a tipo "A" — C y D requieren BaseStand obligatorio. */
  onPlatform?: boolean;
}
