// Aviones del juego. Universo cerrado: A320/A321 con motores CFM56/V2500.

/** Modelos de avión soportados en MVP (cluster A320 family). */
export type AircraftModel = "A320" | "A321";

/** Variantes de motor. Cada modelo soporta ambos. */
export type EngineVariant = "CFM56" | "V2500";

/** Estado del avión en runtime (visual + lógico). */
export type AirplaneStatus =
  | "Idle" // recién aterrizado, sin WO activa, ocupa stand
  | "InMaintenance" // tiene al menos 1 WO activa
  | "Departed"; // ya se fue, ya no ocupa stand

/** Instancia de avión en partida — un LANDING EVENT concreto, no la matrícula persistente.
 *  A partir de Fase 3 (H1), la flota persistente vive en `GameState.fleet` (`FleetAircraft[]`).
 *  Cada landing event referencia su FleetAircraft a través de `registration`.
 *  Como una misma matrícula puede aterrizar varias veces, los lookups WO→Airplane y
 *  notificaciones usan `instanceId`, no `registration`. */
export interface AirplaneInstance {
  /** ID único de este landing event (`"ALI-XXXXXX"`). Sirve para que la WO referencie
   *  unívocamente cuál de los aterrizajes de la matrícula es el suyo. */
  instanceId: string;
  /** Matrícula tipo "EC-XYZ" o "G-ABCD". Persistente: la misma matrícula puede aparecer
   *  en múltiples AirplaneInstance a lo largo de la partida. */
  registration: string;
  /** Modelo. */
  model: AircraftModel;
  /** Variante de motor. */
  engineVariant: EngineVariant;
  /** ID del contrato que trajo el avión. */
  contractId: string;
  /** Stand asignado en hangar/ramp (ej. "H1-S2"). */
  standId: string;
  /** Hora ingame de llegada (minuto absoluto). */
  arrivalMinute: number;
  /** Hora ingame de salida estimada (minuto absoluto). El SLA de WO debe entrar en este margen. */
  scheduledDepartureMinute: number;
  /** Estado vivo. */
  status: AirplaneStatus;
  /** Horas de vuelo del leg que acaba con este landing (1-5h randomizado tras Fase 4 audit).
   *  Se aplica al FleetAircraft.totalFH al generar el arrival. */
  flightHoursThisLeg: number;
  /** Si true, el avión pernocta en el stand toda la noche (Fase 5A Bloque V).
   *  Su `scheduledDepartureMinute` está en la mañana del día siguiente. Habilita la generación
   *  automática de daily checks + posible A-check nocturno si cumple trigger. Default false. */
  overnight?: boolean;
  /** Pivot línea pura · iteración 2026-05-24: callsign comercial del vuelo de llegada
   *  (e.g. "IB3219"). Distinto del `registration` que es la matrícula física del avión
   *  (e.g. "EC-MXY"). Una matrícula puede aparecer bajo distintos callsigns en cada
   *  rotación. La UI muestra la matrícula como protagonista y el callsign como
   *  info contextual del leg actual. */
  arrivalCallsign?: string;
  /** Pivot línea pura · iteración 2026-05-24: callsign comercial del próximo
   *  departure programado (si se puede emparejar con el schedule). Útil para mostrar
   *  "Próx. salida: IB3218 06:30" en panels. */
  nextDepartureCallsign?: string;
  /** Pivot línea pura (2026-05-24): minuto en que el avión REALMENTE sale del stand
   *  (puede ser >= scheduledDepartureMinute si tenía WO activa al llegar la hora prevista).
   *  Set cuando processDepartures detecta que todas las WOs cerraron y marca Departed. */
  actualDepartureMinute?: number;
  /** Pivot línea pura: minutos de retraso real = actualDep - scheduledDep. ≥0. Computed
   *  al departure. Sirve como base para el KPI TDR y para el threshold AOG (>180min). */
  delayMinutes?: number;
  /** Pivot línea pura: true si el delay >= AOG_DELAY_THRESHOLD_MIN (3h). Cobra penalty
   *  AOG_ESCALATION_PENALTY_EUR adicional + rep delta aogFailed. */
  aogEscalated?: boolean;
  /** Pivot iteración 2026-05-24: minuto exacto en el que se hizo la escalation a AOG.
   *  Set por processDepartures EN VIVO cuando el delay supera threshold mientras el avión
   *  está bloqueado. Sirve de flag idempotente para no doblar el cobro de penalty en el
   *  departure final. */
  aogEscalatedAtMinute?: number;
}
