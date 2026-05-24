// Generador de aviones (landings) y asignación a stands.
// Stands del hangar 1: "H1-S1", "H1-S2", "H1-S3" (3 stands en MVP).
// Cuando todos ocupados, el avión espera virtualmente en "ramp" sin stand asignado.
//
// Fase 3 H1: cada landing event escoge un FleetAircraft persistente de la aerolínea,
// le suma FH+cycles, y reutiliza su matrícula+modelo+motor. La función devuelve el
// `updatedFleet` para que el caller (game.ts) lo persista en GameState.

import type { Airplane, Contract, Airline, Balance, FleetAircraft } from "$lib/types";
import { randInt, randFloat, type Rng } from "./rng.ts";
import { DAY_MINUTES } from "./time.ts";
import { applyLandingToFleet, nextAirplaneInstanceId, pickFleetAircraftForLanding, rollFlightHoursForLeg } from "./fleet.ts";
import { LINE_STAND_IDS } from "./stands.ts";

/** Stands válidos para landing events (line maintenance).
 *  H4-H5: solo LINE stands. Los BaseStands los reserva el sistema de A/C/D checks. */
export const INITIAL_STANDS = LINE_STAND_IDS;

/** Duración típica de un turnaround (avión en stand) — entre 45 y 90 minutos. */
const TURNAROUND_MIN = 45;
const TURNAROUND_MAX = 90;

/** Fase 5A V2: hora del día (relative al dayStart=06:00) a partir de la cual un landing
 *  puede pernoctar. 13h después de 06:00 = 19:00. */
const OVERNIGHT_CANDIDATE_HOUR_FROM_DAY_START = 13;
/** Probabilidad de pernoctar dado que es candidate (last landings del día). */
const OVERNIGHT_PROBABILITY = 0.5;
/** Ventana de departure tras pernocta: 06:30 + jitter 0-60min (07:00-07:30). */
const OVERNIGHT_DEPARTURE_OFFSET_MIN = 30; // sobre el dayStart del día siguiente
const OVERNIGHT_DEPARTURE_JITTER = 60;

/**
 * Genera una matrícula tipo "EC-XYZ" (España). El prefijo varía según aerolínea
 * pero MVP solo usa "EC-" para simplicidad.
 */
export function generateRegistration(rng: Rng): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I/O para evitar ambigüedad
  let out = "EC-";
  for (let i = 0; i < 3; i++) out += letters[Math.floor(rng.next() * letters.length)];
  return out;
}

/**
 * Calcula cuántos aviones aterrizan HOY según el contrato.
 * expected ± variance (uniforme).
 */
export function rollDailyLandings(rng: Rng, contract: Contract, balance: Balance): number {
  const expected = contract.expectedLandingsPerDay;
  const variance = balance.landingsVariance;
  const min = Math.max(0, Math.floor(expected * (1 - variance)));
  const max = Math.ceil(expected * (1 + variance));
  return randInt(rng, min, max);
}

/**
 * Genera los aviones que llegan en UN día concreto bajo un contrato.
 * Los reparte uniformemente entre 06:00 y 22:00 del día (16h ventana operativa).
 *
 * H1: cada landing escoge un FleetAircraft de la aerolínea (excluyendo los que ya están
 *     in-service hoy entre arrival y departure). Devuelve la flota mutada con FH+cycles aplicados.
 *
 * @param busyRegistrations matrículas que ya están en stand HOY entre arrival y scheduledDeparture.
 *        Permite a `game.ts` evitar que la misma matrícula esté en dos sitios a la vez.
 */
export function generateDailyArrivals(
  rng: Rng,
  contract: Contract,
  airline: Airline,
  balance: Balance,
  dayNumber: number,
  fleet: readonly FleetAircraft[],
  busyRegistrations: ReadonlySet<string> = new Set(),
): { arrivals: Airplane[]; updatedFleet: FleetAircraft[] } {
  const count = rollDailyLandings(rng, contract, balance);
  const arrivals: Airplane[] = [];
  let workingFleet: FleetAircraft[] = [...fleet];

  const dayStart = (dayNumber - 1) * DAY_MINUTES + 6 * 60; // 06:00 del día N
  const dayEnd = dayStart + 16 * 60; // 22:00 mismo día

  // Fase 4 fix (2026-05-15, hallazgo Dani): la misma matrícula puede aterrizar VARIAS veces
  // al día (narrow-body real hace 3-8 cycles/día), siempre que no solape temporalmente con
  // otra estancia suya. Antes el código forzaba "1 cycle/día por avión" vía `usedToday`,
  // lo que es irreal para flota basada en nuestro aeropuerto.
  //
  // Estrategia: hasta 6 attempts por landing buscando una matrícula + ventana sin solape
  // con ventanas YA asignadas hoy a esa matrícula. Si no encuentra slot → skip (raro con
  // pocos landings/día). busyRegistrations sigue excluyendo aviones en A/C/D check.
  const occupiedWindowsByReg: Map<string, Array<[number, number]>> = new Map();
  const MAX_ATTEMPTS_PER_LANDING = 6;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_LANDING; attempt++) {
      const fleetAircraft = pickFleetAircraftForLanding(rng, airline.id, workingFleet, busyRegistrations);
      if (!fleetAircraft) { placed = false; break; } // toda flota en check, abandonar landing

      const arrivalMinute = Math.floor(randFloat(rng, dayStart, dayEnd));
      const turnaroundMinutes = randInt(rng, TURNAROUND_MIN, TURNAROUND_MAX);

      // Fase 5A V2: pernocta. Si arrival ≥ 19:00 (last sorties del día), prob OVERNIGHT_PROB
      // que el avión se quede toda la noche. Su scheduledDeparture pasa al amanecer siguiente.
      const isOvernightCandidate = (arrivalMinute - dayStart) >= OVERNIGHT_CANDIDATE_HOUR_FROM_DAY_START * 60;
      const overnight = isOvernightCandidate && rng.next() < OVERNIGHT_PROBABILITY;
      const departureMinute = overnight
        ? dayStart + DAY_MINUTES + OVERNIGHT_DEPARTURE_OFFSET_MIN + Math.floor(rng.next() * OVERNIGHT_DEPARTURE_JITTER)
        : arrivalMinute + turnaroundMinutes;

      const windows = occupiedWindowsByReg.get(fleetAircraft.registration) ?? [];
      // Dos ventanas [a1,b1] y [a2,b2] solapan si a1 < b2 && a2 < b1.
      const overlaps = windows.some(([s, e]) => arrivalMinute < e && departureMinute > s);
      if (overlaps) continue; // retry con otro pick + ventana random

      const flightHours = rollFlightHoursForLeg(rng);
      arrivals.push({
        instanceId: nextAirplaneInstanceId(),
        registration: fleetAircraft.registration,
        model: fleetAircraft.model,
        engineVariant: fleetAircraft.engineVariant,
        contractId: contract.id,
        standId: "", // se asigna en assignStands
        arrivalMinute,
        scheduledDepartureMinute: departureMinute,
        status: "Idle",
        flightHoursThisLeg: flightHours,
        overnight: overnight || undefined,
      });
      occupiedWindowsByReg.set(fleetAircraft.registration, [...windows, [arrivalMinute, departureMinute]]);
      workingFleet = applyLandingToFleet(workingFleet, fleetAircraft.registration, flightHours);
      placed = true;
      break;
    }
    if (!placed) {
      // Tras 6 attempts no se encontró slot temporal libre: skip este landing.
      // Estadísticamente raro con `expectedLandingsPerDay 3-9` y flota de 8 aviones.
    }
  }

  // Ordenar por arrivalMinute (cronológico)
  arrivals.sort((a, b) => a.arrivalMinute - b.arrivalMinute);
  return { arrivals, updatedFleet: workingFleet };
}

/**
 * Asigna stand a un avión nuevo. Devuelve el standId asignado o "" si no hay libre.
 * Un stand está ocupado si tiene un avión cuya ventana [arrivalMinute, scheduledDepartureMinute] solapa con el nuevo.
 */
export function assignStand(
  newArrival: Airplane,
  existing: readonly Airplane[],
  stands: readonly string[] = INITIAL_STANDS,
): string {
  for (const stand of stands) {
    const conflicts = existing.some(
      (p) =>
        p.standId === stand &&
        p.status !== "Departed" &&
        !(p.scheduledDepartureMinute <= newArrival.arrivalMinute ||
          p.arrivalMinute >= newArrival.scheduledDepartureMinute),
    );
    if (!conflicts) return stand;
  }
  return ""; // ramp / esperando
}

/**
 * Avanza el estado de los aviones tras un tick. Marca como Departed los que pasaron su scheduledDepartureMinute.
 */
export function updateAirplaneStatuses(airplanes: readonly Airplane[], nowMinute: number): Airplane[] {
  return airplanes.map((p) => {
    if (p.status === "Departed") return p;
    if (nowMinute >= p.scheduledDepartureMinute) {
      return { ...p, status: "Departed" as const };
    }
    if (nowMinute >= p.arrivalMinute && p.status === "Idle") {
      // Recién aterrizado, mantener Idle hasta que aparezca WO. Si hay WO viva, otro módulo lo cambiará.
      return p;
    }
    return p;
  });
}

/** Aviones en stand AHORA (entre arrival y departure). */
export function airplanesOnStand(airplanes: readonly Airplane[], nowMinute: number): Airplane[] {
  return airplanes.filter(
    (p) => p.status !== "Departed" && p.arrivalMinute <= nowMinute && nowMinute < p.scheduledDepartureMinute,
  );
}

/** Aviones esperando llegar (futuros). */
export function airplanesPending(airplanes: readonly Airplane[], nowMinute: number): Airplane[] {
  return airplanes.filter((p) => p.arrivalMinute > nowMinute);
}

/** Convenience: cuántos stands ocupados ahora. */
export function standsOccupiedNow(airplanes: readonly Airplane[], nowMinute: number): number {
  return airplanesOnStand(airplanes, nowMinute).filter((p) => p.standId !== "").length;
}
