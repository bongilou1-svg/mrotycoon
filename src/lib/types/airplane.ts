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
}
