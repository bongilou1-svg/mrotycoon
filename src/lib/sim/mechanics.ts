// Generación + queries de mecánicos. Pool inicial: 7 mecánicos:
//   - 3 B1 (mecánica): 2 con CFM56 + 1 con V2500 type rating, A320 family
//   - 2 B2 (avionics): 1 con CFM56 + 1 con V2500
//   - 2 Helpers sin licencia (apoyo, ≤0.5x efficiency del certifier)
//
// Nombres españoles deterministas. Salarios sacados de balance.json.

import type { Mechanic, Balance, WorkOrderTemplate } from "$lib/types";
import { randFloat, randPick, type Rng } from "./rng.ts";

/**
 * Pivot MRO línea pura (2026-05-24): cap inicial 5 técnicos (subido de 4 en balancing pass
 * post-Fase 2). Pool inicial cubre 2 morning / 2 afternoon / 1 night junior — la
 * cobertura nocturna mínima es crítica para atender daily checks de pernoctas antes del
 * amanecer y evitar AOG escalation por delays >6h. Se desbloquea con canUnlockHangars
 * (rep+balance+contratos múltiples).
 */
export const MECHANIC_CAP_INITIAL = 5;

const FIRST_NAMES = [
  "Pedro", "Lucía", "Javi", "Miguel", "Carla", "Andrés", "María",
  "Diego", "Sofía", "Rubén", "Marta", "Iván", "Elena", "Carlos",
  "Nuria", "David", "Sara", "Adrián", "Paula", "Sergio",
];
const LAST_NAMES = [
  "García", "Martínez", "López", "Sánchez", "Pérez", "González",
  "Romero", "Ruiz", "Fernández", "Díaz", "Jiménez", "Moreno",
  "Hernández", "Torres", "Vargas", "Castro", "Ortiz", "Reyes",
];

function generateName(rng: Rng): string {
  return `${randPick(rng, FIRST_NAMES)} ${randPick(rng, LAST_NAMES)}`;
}

function generateMechanicId(idx: number): string {
  return `M-${idx.toString().padStart(3, "0")}`;
}

/**
 * Pool inicial determinista (con seed). Dos modos:
 *  - legacy (default, Fase 4-5): 7 mecánicos · 3 morning / 2 afternoon / 2 night.
 *  - linePool (pivot MRO línea pura 2026-05-24): 4 mecánicos · 2 morning / 2 afternoon / 0 night.
 *
 * El modo línea pura cabe en la oficina mínima del MRO regional. Sin night → daily checks
 * empiezan a las 06:00 (penalty parcial aceptable hasta endgame unlock).
 */
export function generateInitialMechanics(rng: Rng, balance: Balance, opts: { linePool?: boolean } = {}): Mechanic[] {
  if (opts.linePool) return generateLinePoolMechanics(rng, balance);
  return generateLegacyPoolMechanics(rng, balance);
}

function generateLegacyPoolMechanics(rng: Rng, balance: Balance): Mechanic[] {
  const mechanics: Mechanic[] = [];
  let idx = 1;

  // Helper para añadir mecánico
  function addCertifier(
    base: "B1" | "B2",
    ratings: Array<{ model: "A320" | "A321"; engineVariant: "CFM56" | "V2500"; category: "B1" | "B2" }>,
    isSenior: boolean,
    shift: "morning" | "afternoon" | "night" = "morning",
  ): void {
    const salaryKey = isSenior
      ? base === "B1" ? "b1Senior" : "b2Senior"
      : base === "B1" ? "b1Junior" : "b2Junior";
    mechanics.push({
      id: generateMechanicId(idx++),
      name: generateName(rng),
      base,
      typeRatings: ratings,
      efficiency: Number(randFloat(rng, isSenior ? 0.95 : 0.85, isSenior ? 1.15 : 1.0).toFixed(2)),
      weeklySalary: balance.salaries[salaryKey],
      state: "Idle",
      assignedWoInstanceId: null,
      assignedCheckInstanceId: null,
      stateRemainingMinutes: 0,
      trainingMinutes: 0,
      shift,
      moral: 70,
    });
  }

  function addHelper(shift: "morning" | "afternoon" | "night" = "morning"): void {
    mechanics.push({
      id: generateMechanicId(idx++),
      name: generateName(rng),
      base: null,
      typeRatings: [],
      efficiency: Number(randFloat(rng, 0.6, 0.85).toFixed(2)),
      weeklySalary: balance.salaries.helper,
      state: "Idle",
      assignedWoInstanceId: null,
      assignedCheckInstanceId: null,
      stateRemainingMinutes: 0,
      trainingMinutes: 0,
      shift,
      moral: 70,
    });
  }

  // Fase 4 Q4+Q6 (2026-05-15): distribución mixta 3 morning / 2 afternoon / 2 night.
  // 1 night era insuficiente — death-spiral de WOs late nocturnas. 2 night cubre la franja
  // crítica 22:00-06:00 cuando entran ~33% de los landings sin equipo morning.
  // 3 B1 senior — uno por cada combo motor para garantizar cobertura
  addCertifier("B1", [
    { model: "A320", engineVariant: "CFM56", category: "B1" },
    { model: "A321", engineVariant: "CFM56", category: "B1" },
  ], true, "morning");
  addCertifier("B1", [
    { model: "A320", engineVariant: "V2500", category: "B1" },
    { model: "A321", engineVariant: "V2500", category: "B1" },
  ], true, "afternoon");
  addCertifier("B1", [
    { model: "A320", engineVariant: "CFM56", category: "B1" },
  ], false, "night");

  // 2 B2 senior
  addCertifier("B2", [
    { model: "A320", engineVariant: "CFM56", category: "B2" },
    { model: "A321", engineVariant: "CFM56", category: "B2" },
  ], true, "morning");
  addCertifier("B2", [
    { model: "A320", engineVariant: "V2500", category: "B2" },
    { model: "A321", engineVariant: "V2500", category: "B2" },
  ], false, "afternoon");

  // 2 helpers — uno reforzando morning (la franja más activa), otro a night para apoyo nocturno
  addHelper("morning");
  addHelper("night");

  return mechanics;
}

/**
 * Pool línea pura (pivot 2026-05-24, tuning balancing post-Fase 2): plantilla mínima
 * de 5 técnicos para "técnico local del aeropuerto regional".
 *   - 1 B1 senior morning CFM56+V2500 (cubre toda la flota Iberia/VY narrowbody)
 *   - 1 B1 junior afternoon CFM56 (refuerzo tarde, vuelos U2/V7)
 *   - 1 B2 senior morning CFM56+V2500 (avionics)
 *   - 1 helper afternoon
 *   - 1 B1 junior night CFM56 (NUEVO — cubre daily checks de pernoctas antes 06:00)
 * El night junior es el upgrade crítico: sin él los pernoctas acumulan delay >6h y
 * disparan AOG escalation que mata la economía. Con night la viabilidad sube.
 */
function generateLinePoolMechanics(rng: Rng, balance: Balance): Mechanic[] {
  const mechanics: Mechanic[] = [];
  let idx = 1;

  function addCertifier(
    base: "B1" | "B2",
    ratings: Array<{ model: "A320" | "A321"; engineVariant: "CFM56" | "V2500"; category: "B1" | "B2" }>,
    isSenior: boolean,
    shift: "morning" | "afternoon" | "night" = "morning",
  ): void {
    const salaryKey = isSenior
      ? base === "B1" ? "b1Senior" : "b2Senior"
      : base === "B1" ? "b1Junior" : "b2Junior";
    mechanics.push({
      id: generateMechanicId(idx++),
      name: generateName(rng),
      base,
      typeRatings: ratings,
      efficiency: Number(randFloat(rng, isSenior ? 0.95 : 0.85, isSenior ? 1.15 : 1.0).toFixed(2)),
      weeklySalary: balance.salaries[salaryKey],
      state: "Idle",
      assignedWoInstanceId: null,
      assignedCheckInstanceId: null,
      stateRemainingMinutes: 0,
      trainingMinutes: 0,
      shift,
      moral: 70,
    });
  }

  function addHelper(shift: "morning" | "afternoon" | "night" = "morning"): void {
    mechanics.push({
      id: generateMechanicId(idx++),
      name: generateName(rng),
      base: null,
      typeRatings: [],
      efficiency: Number(randFloat(rng, 0.6, 0.85).toFixed(2)),
      weeklySalary: balance.salaries.helper,
      state: "Idle",
      assignedWoInstanceId: null,
      assignedCheckInstanceId: null,
      stateRemainingMinutes: 0,
      trainingMinutes: 0,
      shift,
      moral: 70,
    });
  }

  addCertifier("B1", [
    { model: "A320", engineVariant: "CFM56", category: "B1" },
    { model: "A321", engineVariant: "CFM56", category: "B1" },
    { model: "A320", engineVariant: "V2500", category: "B1" },
    { model: "A321", engineVariant: "V2500", category: "B1" },
  ], true, "morning");
  addCertifier("B1", [
    { model: "A320", engineVariant: "CFM56", category: "B1" },
    { model: "A321", engineVariant: "CFM56", category: "B1" },
  ], false, "afternoon");
  addCertifier("B2", [
    { model: "A320", engineVariant: "CFM56", category: "B2" },
    { model: "A321", engineVariant: "CFM56", category: "B2" },
    { model: "A320", engineVariant: "V2500", category: "B2" },
    { model: "A321", engineVariant: "V2500", category: "B2" },
  ], true, "morning");
  addHelper("afternoon");
  // Night junior B1 — clave para daily checks de pernoctas
  addCertifier("B1", [
    { model: "A320", engineVariant: "CFM56", category: "B1" },
    { model: "A321", engineVariant: "CFM56", category: "B1" },
  ], false, "night");

  return mechanics;
}

// ---- Queries ----

/** Mecánicos disponibles ahora (state = Idle). */
export function availableMechanics(mechanics: readonly Mechanic[]): Mechanic[] {
  return mechanics.filter((m) => m.state === "Idle");
}

/**
 * Mecánicos elegibles como CERTIFIER para una WO concreta — necesitan:
 *  - estado Idle
 *  - base que coincida con requiredCategory
 *  - type rating válido para (model, engineVariant, category) del avión + WO
 */
export function eligibleCertifiers(
  mechanics: readonly Mechanic[],
  template: WorkOrderTemplate,
  airplaneModel: "A320" | "A321",
  airplaneEngine: "CFM56" | "V2500",
): Mechanic[] {
  return mechanics.filter((m) => {
    if (m.state !== "Idle") return false;
    if (m.base !== template.requiredCategory) return false;
    return m.typeRatings.some(
      (r) => r.model === airplaneModel && r.engineVariant === airplaneEngine && r.category === template.requiredCategory,
    );
  });
}

/** Mecánicos elegibles como HELPER — solo Idle (cualquier base o helper puro). Fase 5A
 *  W2: excluye Lead Foreman (no asignables a WOs). */
export function eligibleHelpers(mechanics: readonly Mechanic[]): Mechanic[] {
  return mechanics.filter((m) => m.state === "Idle" && !m.isLeadForeman);
}

/** Cuenta por estado para HUD. */
export function countByState(mechanics: readonly Mechanic[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of mechanics) {
    out[m.state] = (out[m.state] ?? 0) + 1;
  }
  return out;
}
