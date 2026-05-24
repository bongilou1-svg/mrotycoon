// Eventos aleatorios — Fase 5C.
//
// Eventos que afectan operación durante una ventana de tiempo. Generados probabilísticamente
// cada día por `tickRandomEvents`. MVP: 2 tipos.
//
//  - runway_closure: cierre temporal de pista (meteorología/incidente). Durante `endMinute -
//    startMinute` no se generan arrivals nuevos. Económicamente neutral pero estresa el calendario.
//  - service_bulletin: Airbus emite SB sobre un modelo+motor → 1-2 aviones de la flota reciben
//    una WO especial cobrable (similar a WO line). Realista (SBs se cobran al cliente).
//
// Strike (huelga) y otros van a parking — requieren modificar shift gating o WO state machine.

export type RandomEventType = "runway_closure" | "service_bulletin";

export interface RandomEventBase {
  id: string;
  type: RandomEventType;
  /** Minuto absoluto ingame en que arranca. */
  startMinute: number;
  /** Minuto absoluto en que termina. Para SB es startMinute (puntual). */
  endMinute: number;
  /** Si true, ya se procesó el cleanup (evita re-firing). */
  cleanedUp?: boolean;
}

export interface RunwayClosureEvent extends RandomEventBase {
  type: "runway_closure";
  /** Razón mostrada al jugador (humana). */
  reason: string;
}

export interface ServiceBulletinEvent extends RandomEventBase {
  type: "service_bulletin";
  /** Modelo afectado. */
  model: "A320" | "A321";
  /** Motor afectado (opcional, "any" = todos). */
  engineVariant: "CFM56" | "V2500" | "any";
  /** Matrículas a las que se emitió WO SB (ya creadas, para referencia). */
  affectedRegistrations: string[];
  /** Descripción humana corta. */
  description: string;
}

export type RandomEvent = RunwayClosureEvent | ServiceBulletinEvent;
