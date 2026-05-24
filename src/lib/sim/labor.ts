// Mercado laboral — Bloque K.
//
// Pool de Candidates refrescado cada 7 días. Contratar/despedir mecánicos. Training pasivo:
// helpers que acumulan trabajo en estado Working pasan a B1 junior con un type rating cuando
// alcanzan el umbral de 90 días-equivalentes.

import type { Candidate, Mechanic, AircraftModel, EngineVariant, MechanicCategory, TypeRating, Balance } from "$lib/types";
import { randInt, randFloat, randPick, type Rng } from "./rng.ts";
import { DAY_MINUTES } from "./time.ts";

/** Tamaño mínimo y máximo del pool de candidatos visible. */
export const POOL_MIN = 5;
export const POOL_MAX = 10;
/** Frecuencia de refresh del mercado: 7 días ingame. */
export const MARKET_REFRESH_DAYS = 7;
/** Multiplicador del signing bonus respecto al salario semanal (4 semanas = 1 mes). */
export const SIGNING_BONUS_WEEKS = 4;
/** Multiplicador del severance respecto al salario semanal.
 *  Fase 4 audit (2026-05-15): 8 → 16 semanas (~4 meses). Estatuto trabajadores España
 *  para despido improcedente ~33 días/año trabajado, mínimo realista para empleados con
 *  permanencia. 16 sem es un MVP simple; escalado por años queda para Fase 4.5. */
export const SEVERANCE_WEEKS = 16;
/** Minutos de Working acumulados que necesita un helper para promocionar a B1 junior. */
export const HELPER_PROMOTION_MINUTES = 90 * DAY_MINUTES;
/** Fase 5A W1: salario semanal del Lead Foreman / TMA jefe (no asignable a WOs). */
export const LEAD_FOREMAN_WEEKLY_SALARY = 2500;
/** Probabilidad de que un candidato del mercado salga Lead Foreman (raro). */
export const LEAD_FOREMAN_CANDIDATE_PROBABILITY = 0.05;

const FIRST_NAMES = [
  "Pedro", "Lucía", "Javi", "Miguel", "Carla", "Andrés", "María", "Diego", "Sofía",
  "Rubén", "Marta", "Iván", "Elena", "Carlos", "Nuria", "David", "Sara", "Adrián",
  "Paula", "Sergio", "Beatriz", "Raúl", "Cristina", "Pablo", "Eva", "Hugo", "Inés",
  "Mateo", "Alicia", "Bruno", "Olga", "Antonio", "Rocío", "Tomás",
];
const LAST_NAMES = [
  "García", "Martínez", "López", "Sánchez", "Pérez", "González", "Romero", "Ruiz",
  "Fernández", "Díaz", "Jiménez", "Moreno", "Hernández", "Torres", "Vargas", "Castro",
  "Ortiz", "Reyes", "Navarro", "Molina", "Aguilar", "Serrano",
];
const PERSONALITY_TRAITS = [
  "Meticuloso", "Rápido", "Comunicativo", "Solitario", "Curioso", "Pragmático",
  "Perfeccionista", "Improvisador", "Tranquilo", "Energético", "Líder natural", "Discreto",
];

let candidateCounter = 0;
export function resetCandidateCounter(value = 0): void { candidateCounter = value; }
export function getCandidateCounter(): number { return candidateCounter; }

function nextCandidateId(): string {
  candidateCounter += 1;
  return `CND-${candidateCounter.toString().padStart(6, "0")}`;
}

/** Distribución base esperada en el mercado: más helpers que B1, menos B2 (raros). */
function rollBase(rng: Rng): MechanicCategory | null {
  const r = rng.next();
  if (r < 0.55) return null;      // 55% helper
  if (r < 0.85) return "B1";      // 30% B1
  return "B2";                    // 15% B2
}

function rollAge(rng: Rng): number {
  return randInt(rng, 22, 58);
}

function rollTypeRatings(rng: Rng, base: MechanicCategory | null, experienceYears: number): TypeRating[] {
  if (base === null) return [];
  const out: TypeRating[] = [];
  const models: AircraftModel[] = ["A320", "A321"];
  const engines: EngineVariant[] = ["CFM56", "V2500"];
  // Senior con más experiencia → más ratings. Junior con 1-2 ratings sólo.
  const ratingCount = experienceYears >= 8 ? randInt(rng, 2, 4) : randInt(rng, 1, 2);
  const seen = new Set<string>();
  for (let i = 0; i < ratingCount; i++) {
    const model = randPick(rng, models);
    const engine = randPick(rng, engines);
    const key = `${model}-${engine}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ model, engineVariant: engine, category: base });
  }
  return out;
}

/** Genera UN candidato aleatorio. */
export function generateCandidate(rng: Rng, balance: Balance, nowMinute: number): Candidate {
  const age = rollAge(rng);
  const experienceYears = Math.max(0, Math.min(age - 22, randInt(rng, 0, age - 22)));

  // Fase 5A W2: prob LEAD_FOREMAN_CANDIDATE_PROBABILITY de que el candidato sea Lead Foreman.
  // Requiere edad ≥30 (senior, experiencia gestión).
  const isLead = age >= 30 && rng.next() < LEAD_FOREMAN_CANDIDATE_PROBABILITY;
  if (isLead) {
    const expectedWeeklySalary = Math.round(LEAD_FOREMAN_WEEKLY_SALARY * randFloat(rng, 0.9, 1.15));
    const personality: string[] = [];
    const seen = new Set<string>();
    while (personality.length < 3) {
      const p = randPick(rng, PERSONALITY_TRAITS);
      if (!seen.has(p)) { seen.add(p); personality.push(p); }
    }
    return {
      id: nextCandidateId(),
      name: `${randPick(rng, FIRST_NAMES)} ${randPick(rng, LAST_NAMES)}`,
      age,
      base: null, // lead foreman no tiene base operativa (no asignable)
      typeRatings: [],
      efficiency: 1.0, // no aplica (no asignable)
      expectedWeeklySalary,
      experienceYears,
      personality,
      generatedAtMinute: nowMinute,
      expiresAtMinute: nowMinute + MARKET_REFRESH_DAYS * DAY_MINUTES,
      isLeadForeman: true,
    };
  }

  const base = rollBase(rng);
  const senior = experienceYears >= 8;
  const efficiency = Number(randFloat(rng, senior ? 0.95 : (base === null ? 0.6 : 0.8), senior ? 1.2 : 1.0).toFixed(2));

  // Salario esperado: deriva del salario base de balance + variación ±15%
  const salaryKey = base === null ? "helper"
    : base === "B1" ? (senior ? "b1Senior" : "b1Junior")
    : (senior ? "b2Senior" : "b2Junior");
  const baseSalary = balance.salaries[salaryKey];
  const expectedWeeklySalary = Math.round(baseSalary * randFloat(rng, 0.9, 1.15));

  // Personality: 3 traits únicos
  const personality: string[] = [];
  const seen = new Set<string>();
  while (personality.length < 3) {
    const p = randPick(rng, PERSONALITY_TRAITS);
    if (!seen.has(p)) { seen.add(p); personality.push(p); }
  }

  return {
    id: nextCandidateId(),
    name: `${randPick(rng, FIRST_NAMES)} ${randPick(rng, LAST_NAMES)}`,
    age,
    base,
    typeRatings: rollTypeRatings(rng, base, experienceYears),
    efficiency,
    expectedWeeklySalary,
    experienceYears,
    personality,
    generatedAtMinute: nowMinute,
    expiresAtMinute: nowMinute + MARKET_REFRESH_DAYS * DAY_MINUTES,
  };
}

/** Refresca el pool: descarta los expirados y rellena hasta POOL_MIN/POOL_MAX. */
export function refreshMarket(
  rng: Rng,
  current: readonly Candidate[],
  balance: Balance,
  nowMinute: number,
): Candidate[] {
  const alive = current.filter((c) => c.expiresAtMinute > nowMinute);
  const target = randInt(rng, POOL_MIN, POOL_MAX);
  const out = [...alive];
  while (out.length < target) {
    out.push(generateCandidate(rng, balance, nowMinute));
  }
  return out;
}

/** ¿Toca refrescar el mercado? Compara contra el último refresh tracked. */
export function shouldRefreshMarket(lastRefreshMinute: number, nowMinute: number): boolean {
  return nowMinute - lastRefreshMinute >= MARKET_REFRESH_DAYS * DAY_MINUTES;
}

/** Convierte un Candidate en Mechanic listo para meter al pool. */
export function candidateToMechanic(c: Candidate, mechanicId: string, hiredAtMinute = 0): Mechanic {
  return {
    id: mechanicId,
    name: c.name,
    base: c.base,
    typeRatings: c.typeRatings,
    efficiency: c.efficiency,
    weeklySalary: c.expectedWeeklySalary,
    state: "Idle",
    assignedWoInstanceId: null,
    assignedCheckInstanceId: null,
    stateRemainingMinutes: 0,
    trainingMinutes: 0,
    shift: "morning",
    moral: 70,
    isLeadForeman: c.isLeadForeman, // Fase 5A W2
    hiredAtMinute, // Fase 5A Y2: para severance escalado por años
  };
}

/** Coste fijo de contratar un candidato (signing bonus). */
export function signingBonusFor(c: Candidate): number {
  return c.expectedWeeklySalary * SIGNING_BONUS_WEEKS;
}

/** Coste fijo de despedir un mecánico (severance). */
/**
 * Severance escalado (Fase 5A Y2): base SEVERANCE_WEEKS (16) +0.5 sem/año trabajado.
 * Ej. mecánico con 3 años trabajados = 16 + 1.5 = 17.5 sem.
 *
 * Si no se pasa `nowMinute`, devuelve el legacy fijo (compat con tests pre-Y2).
 * Si `hiredAtMinute` no está set, asume 0 (mecánico inicial).
 */
export function severanceFor(m: Mechanic, nowMinute?: number): number {
  if (nowMinute === undefined) return m.weeklySalary * SEVERANCE_WEEKS;
  const hired = m.hiredAtMinute ?? 0;
  const minutesWorked = Math.max(0, nowMinute - hired);
  const yearsWorked = minutesWorked / (52 * 7 * DAY_MINUTES);
  const weeks = SEVERANCE_WEEKS + yearsWorked * 0.5;
  return Math.round(m.weeklySalary * weeks);
}

// ---- Training pasivo (K6) ----

export interface PromotionEvent {
  type: "helper_promoted";
  mechanicId: string;
  mechanicName: string;
  newRating: TypeRating;
}

/**
 * Acumula training en todos los mecánicos cuyo state="Working" durante `stepMinutes`.
 * Si un helper (base=null) alcanza `HELPER_PROMOTION_MINUTES` → promociona a B1 junior con
 * un rating aleatorio. Salario se ajusta al de B1 junior del balance.
 */
export function tickTraining(
  mechanics: readonly Mechanic[],
  balance: Balance,
  rng: Rng,
  stepMinutes: number,
): { mechanics: Mechanic[]; events: PromotionEvent[] } {
  const events: PromotionEvent[] = [];
  const newMechanics = mechanics.map((m) => {
    if (m.state !== "Working") return m;
    const accum = (m.trainingMinutes ?? 0) + stepMinutes;
    // Sólo helpers (base=null) se promocionan vía training pasivo
    if (m.base === null && accum >= HELPER_PROMOTION_MINUTES) {
      const models: AircraftModel[] = ["A320", "A321"];
      const engines: EngineVariant[] = ["CFM56", "V2500"];
      const newRating: TypeRating = {
        model: randPick(rng, models),
        engineVariant: randPick(rng, engines),
        category: "B1",
      };
      events.push({ type: "helper_promoted", mechanicId: m.id, mechanicName: m.name, newRating });
      return {
        ...m,
        base: "B1" as const,
        typeRatings: [newRating],
        weeklySalary: balance.salaries.b1Junior,
        trainingMinutes: 0,
      };
    }
    return { ...m, trainingMinutes: accum };
  });
  return { mechanics: newMechanics, events };
}
