// Mecánicos — el recurso humano del MRO.

import type { AircraftModel, EngineVariant } from "./airplane";
import type { MechanicCategory } from "./workorder";

/** Type rating válido: combinación modelo + motor + categoría. */
export interface TypeRating {
  model: AircraftModel;
  engineVariant: EngineVariant;
  category: MechanicCategory;
}

/** Estado del mecánico en runtime. */
export type MechanicState =
  | "Idle" // en oficina, disponible
  | "ToPlane" // viajando al stand (timer ~2 min)
  | "Working" // ejecutando WO en stand
  | "Returning" // volviendo a oficina
  | "Training" // en training activo (no asignable hasta que termine)
  | "OffShift"; // fuera de turno (Fase 3, en MVP siempre disponible)

/** Turno del mecánico. `off` = jornada libre. Bloque L. */
export type ShiftSlot = "morning" | "afternoon" | "night" | "off";

export interface Mechanic {
  /** ID estable interno. */
  id: string;
  /** Nombre humano. */
  name: string;
  /** Base de licencia: B1 (mecánica) o B2 (avionics). Hay helpers sin base. */
  base: MechanicCategory | null;
  /** Type ratings que tiene. Vacío para helpers puros. */
  typeRatings: TypeRating[];
  /** Eficiencia base (0.8-1.2 típicamente). En MVP fija; Fase 3 incluye factor moral. */
  efficiency: number;
  /** Salario semanal (€). */
  weeklySalary: number;
  /** Estado vivo. */
  state: MechanicState;
  /** ID de la WO instance asignada actualmente (null si Idle o en base check). */
  assignedWoInstanceId: string | null;
  /** ID del A/C/D check asignado (null si Idle o en WO de línea). Slot paralelo a `assignedWoInstanceId`
   *  para no colisionar — un mecánico nunca está en los dos a la vez. Añadido en Fase 3 H6. */
  assignedCheckInstanceId: string | null;
  /** Minutos restantes del estado actual (para ToPlane / Returning / OffShift). */
  stateRemainingMinutes: number;
  /** Acumulador de training pasivo (minutos en estado Working desde la última promoción).
   *  Cuando un helper alcanza el umbral pasa a B1 junior con un rating. Bloque K K6. */
  trainingMinutes?: number;
  /** Turno asignado. Default "morning". Bloque L L1. */
  shift?: ShiftSlot;
  /** Moral 0-100. Default 70 al fichar. Bloque L L3. */
  moral?: number;
  /** Minuto absoluto en el que termina el training activo en curso (Bloque L L6). */
  activeTrainingUntilMinute?: number;
  /** Fase 5A W1: si true, este mecánico es Lead Foreman / TMA jefe. No asignable a WOs;
   *  cuando está hired + setting `autoAssignEnabled` activo, hace auto-asignación de WOs
   *  sin equipo en casos triviales (1 certifier eligible) y auto-handoff entre turnos. */
  isLeadForeman?: boolean;
  /** Fase 5A Y2: minuto absoluto ingame en el que fue contratado. Para severance escalado.
   *  Default 0 (mecánicos iniciales — "siempre han estado ahí"). */
  hiredAtMinute?: number;
  /** Fase 5C pulido: si está set, el mecánico está haciendo hora extra. Cuando vuelva a Idle
   *  (tras Returning), `shift` se restaura a `overtimeOriginalShift` y se cobra overtime
   *  (~1/14 del salario semanal = medio día × 1.5×). Default undefined. */
  overtimeOriginalShift?: ShiftSlot;
}
