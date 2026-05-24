// Sistema de turnos + moral + training activo — Bloque L.
//
// Turnos (definidos sobre minuto-de-día):
//   - morning   [06:00, 14:00) = [360, 840)
//   - afternoon [14:00, 22:00) = [840, 1320)
//   - night     [22:00, 06:00) = [1320, 1440) ∪ [0, 360)
//   - off       nunca trabaja
//
// MVP: un mecánico fuera de su turno tiene efficiency efectiva = 0. No cambia state
// (sigue "Working" si se le asignó), pero no contribuye al progreso de WO.
//
// Moral: escala [0,100]. Multiplica eficiencia entre 0.5x y 1.2x.
//   moralMultiplier(m) = 0.5 + (m/100) × 0.7
//
// Training activo: jugador paga 5.000 € + 7 días → mecánico recibe +1 type rating o
// promoción de base (helper→B1, B1→B2). State = "Training" mientras dura.

import type { Mechanic, ShiftSlot, AircraftModel, EngineVariant, TypeRating, WorkOrderInstance } from "$lib/types";
import { DAY_MINUTES } from "./time.ts";
import { randPick, type Rng } from "./rng.ts";

const MORNING_START = 6 * 60;     // 06:00
const MORNING_END = 14 * 60;      // 14:00
const AFTERNOON_END = 22 * 60;    // 22:00

/** Multiplicador del salario semanal para mecánicos en turno noche. */
export const NIGHT_SHIFT_SALARY_MULT = 1.5;

/** Coste fijo del training activo.
 *  Fase 4 audit (2026-05-15): 5.000 → 8.000 €. Type rating EASA real cuesta 8-25k €. */
export const ACTIVE_TRAINING_COST_EUR = 8000;
/** Duración del training activo (ingame).
 *  Fase 4 audit (2026-05-15): 7 → 14 días. Type rating real 1-3 semanas. */
export const ACTIVE_TRAINING_DAYS = 14;

/** Moral por defecto al fichar. */
export const DEFAULT_MORAL = 70;

/** Devuelve el shift al que pertenece un minuto-de-día. */
export function shiftForMinuteOfDay(minOfDay: number): ShiftSlot {
  if (minOfDay >= MORNING_START && minOfDay < MORNING_END) return "morning";
  if (minOfDay >= MORNING_END && minOfDay < AFTERNOON_END) return "afternoon";
  return "night";
}

/** ¿El mecánico está en su shift ahora mismo? */
export function inShift(mechanic: Mechanic, nowMinute: number): boolean {
  const shift = mechanic.shift ?? "morning";
  if (shift === "off") return false;
  const minOfDay = ((nowMinute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return shiftForMinuteOfDay(minOfDay) === shift;
}

/** Multiplicador de moral sobre eficiencia. moral=0 → 0.5x, moral=100 → 1.2x. */
export function moralMultiplier(moral: number): number {
  const m = Math.max(0, Math.min(100, moral));
  return 0.5 + (m / 100) * 0.7;
}

/** Eficiencia efectiva total de un mecánico ahora (incluye shift + moral). 0 si OffShift. */
export function effectiveEfficiencyNow(mechanic: Mechanic, nowMinute: number): number {
  if (!inShift(mechanic, nowMinute)) return 0;
  if (mechanic.state === "Training") return 0;
  const moral = mechanic.moral ?? DEFAULT_MORAL;
  return mechanic.efficiency * moralMultiplier(moral);
}

/** Salario semanal efectivo: night shift × 1.5. */
export function effectiveWeeklySalary(mechanic: Mechanic): number {
  const base = mechanic.weeklySalary;
  if (mechanic.shift === "night") return Math.round(base * NIGHT_SHIFT_SALARY_MULT);
  return base;
}

// ---- Shift transitions (Fase 4 Q2/Q3) ----

/** Evento emitido por `tickShiftTransitions`. */
export type ShiftTransitionEvent =
  | { type: "mech_left_shift"; mechanicId: string; mechanicName: string; woInstanceId?: string }
  | { type: "mech_entered_shift"; mechanicId: string; mechanicName: string }
  | { type: "wo_paused_no_certifier"; woInstanceId: string; airplaneRegistration: string };

/**
 * Transiciona el estado de mecánicos según su shift y libera WOs cuando el certifier
 * sale de turno. Se llama en cada tick desde `advanceGame`.
 *
 * Reglas:
 *  - Idle ↔ OffShift: simétrico según `inShift`.
 *  - Working/ToPlane fuera de shift → libera la WO de línea: mecánico pasa a OffShift,
 *    se quita de `assignedMechanicIds`. Si era el certifier (o queda WO sin mecánicos),
 *    la WO vuelve a phase ToPlane con assignedMechanicIds=[] pending re-asignación.
 *  - Mecánicos en A/C/D check (`assignedCheckInstanceId !== null`): NO se aplica gating.
 *    Los checks representan trabajo agregado por man-days durante días, no jornadas 24/7.
 *  - Returning y Training: sin gating.
 */
export function tickShiftTransitions(
  mechanics: readonly Mechanic[],
  workOrders: readonly WorkOrderInstance[],
  nowMinute: number,
): {
  mechanics: Mechanic[];
  workOrders: WorkOrderInstance[];
  events: ShiftTransitionEvent[];
} {
  const events: ShiftTransitionEvent[] = [];
  const newMechs: Mechanic[] = mechanics.slice();
  let newWos: WorkOrderInstance[] = workOrders.slice();

  for (let i = 0; i < newMechs.length; i++) {
    const m = newMechs[i];
    if (m.state === "Training" || m.state === "Returning") continue;
    // En check: el shift gating no aplica (trabajo abstracto multi-día).
    if (m.assignedCheckInstanceId !== null) continue;
    const isIn = inShift(m, nowMinute);

    if (m.state === "Idle" && !isIn) {
      newMechs[i] = { ...m, state: "OffShift", stateRemainingMinutes: 0 };
      continue;
    }
    if (m.state === "OffShift" && isIn) {
      newMechs[i] = { ...m, state: "Idle", stateRemainingMinutes: 0 };
      events.push({ type: "mech_entered_shift", mechanicId: m.id, mechanicName: m.name });
      continue;
    }
    if ((m.state === "Working" || m.state === "ToPlane") && !isIn) {
      const woId = m.assignedWoInstanceId;
      newMechs[i] = {
        ...m,
        state: "OffShift",
        assignedWoInstanceId: null,
        stateRemainingMinutes: 0,
      };
      events.push({
        type: "mech_left_shift",
        mechanicId: m.id,
        mechanicName: m.name,
        woInstanceId: woId ?? undefined,
      });
      if (woId) {
        newWos = newWos.map((w) => {
          if (w.instanceId !== woId) return w;
          const wasCertifier = w.assignedMechanicIds[0] === m.id;
          const remaining = w.assignedMechanicIds.filter((id) => id !== m.id);
          if (wasCertifier || remaining.length === 0) {
            events.push({
              type: "wo_paused_no_certifier",
              woInstanceId: w.instanceId,
              airplaneRegistration: w.airplaneRegistration,
            });
            return {
              ...w,
              assignedMechanicIds: [],
              phase: "ToPlane" as const,
              phaseElapsedMinutes: 0,
            };
          }
          return { ...w, assignedMechanicIds: remaining };
        });
      }
    }
  }

  return { mechanics: newMechs, workOrders: newWos, events };
}

// ---- Moral tick ----

/** Cuántos puntos de moral cambian al día según estado del mecánico. */
const MORAL_TICK_PER_DAY = {
  workingSameShift: -1, // estrés de trabajar continuamente
  idle: +1,             // descanso reanima
  offShift: +0,         // no afecta
  trainingActive: +2,   // sentirse valorado
};

/** Avanza moral en proporción a `stepMinutes`. Se llama desde `advanceGame`. */
export function tickMoral(mechanics: readonly Mechanic[], stepMinutes: number): Mechanic[] {
  const factor = stepMinutes / DAY_MINUTES;
  return mechanics.map((m) => {
    const cur = m.moral ?? DEFAULT_MORAL;
    let delta = 0;
    if (m.state === "Working" || m.state === "ToPlane") delta = MORAL_TICK_PER_DAY.workingSameShift * factor;
    else if (m.state === "Idle") delta = MORAL_TICK_PER_DAY.idle * factor;
    else if (m.state === "Training") delta = MORAL_TICK_PER_DAY.trainingActive * factor;
    if (delta === 0) return m;
    const next = Math.max(0, Math.min(100, cur + delta));
    if (Math.abs(next - cur) < 0.01) return m;
    return { ...m, moral: next };
  });
}

/** Delta de moral por evento (WO completada/fallida etc). Se invoca puntualmente. */
export const MORAL_EVENT_DELTAS = {
  woCompletedOnTime: +3,
  woCompletedLate: -2,
  woCompletedCritical: +5,
  woFailed: -8,
  woFailedAOG: -15,
};

/** Aplica un delta de moral a UN mecánico. Inmutable. */
export function applyMoralDelta(mechanic: Mechanic, delta: number): Mechanic {
  const cur = mechanic.moral ?? DEFAULT_MORAL;
  const next = Math.max(0, Math.min(100, cur + delta));
  if (next === cur) return mechanic;
  return { ...mechanic, moral: next };
}

// ---- Training activo ----

/** Resultado de iniciar training activo. */
export type StartTrainingResult =
  | { ok: true; mechanic: Mechanic; cost: number; endMinute: number }
  | { ok: false; error: string };

/** Inicia un training activo sobre un mecánico. Requiere Idle. */
export function startActiveTraining(mechanic: Mechanic, nowMinute: number): StartTrainingResult {
  if (mechanic.state !== "Idle") return { ok: false, error: "Mecánico no Idle" };
  if (mechanic.activeTrainingUntilMinute !== undefined && mechanic.activeTrainingUntilMinute > nowMinute) {
    return { ok: false, error: "Ya en training" };
  }
  const endMinute = nowMinute + ACTIVE_TRAINING_DAYS * DAY_MINUTES;
  return {
    ok: true,
    cost: ACTIVE_TRAINING_COST_EUR,
    endMinute,
    mechanic: {
      ...mechanic,
      state: "Training",
      activeTrainingUntilMinute: endMinute,
    },
  };
}

/** Avanza training activo: si terminó, otorga la mejora correspondiente. */
export interface TrainingTickEvent {
  type: "training_completed";
  mechanicId: string;
  mechanicName: string;
  outcome: "new_rating" | "promoted_b1" | "promoted_b2";
  detail: TypeRating | { from: "helper" | "B1"; to: "B1" | "B2" };
}

export function tickActiveTraining(
  mechanics: readonly Mechanic[],
  nowMinute: number,
  rng: Rng,
  b1JuniorSalary: number,
  b2JuniorSalary: number,
): { mechanics: Mechanic[]; events: TrainingTickEvent[] } {
  const events: TrainingTickEvent[] = [];
  const newMechanics = mechanics.map((m) => {
    if (m.state !== "Training") return m;
    if (m.activeTrainingUntilMinute === undefined || nowMinute < m.activeTrainingUntilMinute) return m;

    // Training terminado → otorgar mejora
    const models: AircraftModel[] = ["A320", "A321"];
    const engines: EngineVariant[] = ["CFM56", "V2500"];

    if (m.base === null) {
      // helper → B1 junior con 1 rating
      const newRating: TypeRating = {
        model: randPick(rng, models),
        engineVariant: randPick(rng, engines),
        category: "B1",
      };
      events.push({
        type: "training_completed", mechanicId: m.id, mechanicName: m.name,
        outcome: "promoted_b1", detail: { from: "helper", to: "B1" },
      });
      return {
        ...m,
        state: "Idle" as const,
        base: "B1" as const,
        typeRatings: [newRating],
        weeklySalary: b1JuniorSalary,
        activeTrainingUntilMinute: undefined,
      };
    }
    if (m.base === "B1") {
      // B1 → B2 (raro pero permitido)
      const newRating: TypeRating = {
        model: randPick(rng, models),
        engineVariant: randPick(rng, engines),
        category: "B2",
      };
      events.push({
        type: "training_completed", mechanicId: m.id, mechanicName: m.name,
        outcome: "promoted_b2", detail: { from: "B1", to: "B2" },
      });
      return {
        ...m,
        state: "Idle" as const,
        base: "B2" as const,
        typeRatings: [...m.typeRatings, newRating],
        weeklySalary: b2JuniorSalary,
        activeTrainingUntilMinute: undefined,
      };
    }
    // B2 → solo añade rating nuevo
    const baseCategory = m.base; // "B2"
    const newRating: TypeRating = {
      model: randPick(rng, models),
      engineVariant: randPick(rng, engines),
      category: baseCategory,
    };
    const alreadyHas = m.typeRatings.some((r) =>
      r.model === newRating.model && r.engineVariant === newRating.engineVariant && r.category === newRating.category,
    );
    const newRatings = alreadyHas ? m.typeRatings : [...m.typeRatings, newRating];
    events.push({
      type: "training_completed", mechanicId: m.id, mechanicName: m.name,
      outcome: "new_rating", detail: newRating,
    });
    return {
      ...m,
      state: "Idle" as const,
      typeRatings: newRatings,
      activeTrainingUntilMinute: undefined,
    };
  });
  return { mechanics: newMechanics, events };
}
