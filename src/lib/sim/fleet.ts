// Generación y mutación de la flota persistente.
//
// Una flota se genera UNA VEZ al inicio de partida (createGame) y vive durante toda la
// partida. Cada aerolínea tiene N aviones (FLEET_SIZE_PER_AIRLINE). En cada landing
// generado por un contrato activo, escogemos UN avión de la flota de la aerolínea del
// contrato y le sumamos +1 cycle y +Xh FH.

import type { Airline, FleetAircraft } from "$lib/types";
import { generateRegistration } from "./airplanes.ts";
import { randFloat, randPick, type Rng } from "./rng.ts";

/** Tamaño base de flota por aerolínea. 8 aviones permite rotación realista con ~5 landings/día
 *  por contrato sin que una matrícula esté en dos sitios a la vez en un mismo día. */
export const FLEET_SIZE_PER_AIRLINE = 8;

/** Rango de horas de vuelo de un leg típico narrow-body.
 *  Fase 4 audit (2026-05-15): bajado min de 3.0 → 1.0 para cubrir vuelos cortos europeos
 *  (Madrid-Barcelona, Madrid-Sevilla ~1h) además de medios (2-4h) y largos (4-5h). */
const FH_PER_LEG_MIN = 1.0;
const FH_PER_LEG_MAX = 5.0;

let aliCounter = 0;

/** Genera un ID único de landing event tipo "ALI-000123".
 *  Se mantiene un contador estático local para garantizar unicidad dentro de la partida.
 *  TODO Fase 3 G7: si migramos a Sqlite, el contador se sirve desde una secuencia DB. */
export function nextAirplaneInstanceId(): string {
  aliCounter += 1;
  return `ALI-${aliCounter.toString().padStart(6, "0")}`;
}

/** Reset del contador. Solo para tests y new game. */
export function resetAirplaneInstanceCounter(value = 0): void {
  aliCounter = value;
}

/** Devuelve el valor actual del contador (para serialización en saves). */
export function getAirplaneInstanceCounter(): number {
  return aliCounter;
}

/**
 * Genera la flota inicial: cada aerolínea recibe FLEET_SIZE_PER_AIRLINE aviones con
 * matrículas únicas y un MIX DE EDAD realista — fleet aging.
 *
 * Bloque N calibración: si todos arrancan en FH=0, el primer A-check no se dispara hasta
 * 600 FH naturales (≈10-12 semanas reales con 4-5 landings/día). Eso hace que en una primera
 * sesión de 28 días el jugador no vea NUNCA un A-check. Para que la mecánica sea ejercitable
 * desde el principio, distribuimos la flota así:
 *   - 20% nuevos (0-100 FH desde último A)
 *   - 40% jóvenes (100-300 FH)
 *   - 30% maduros (300-500 FH) — cercanos al A check, sale en pocos días
 *   - 10% próximos al A check (500-580 FH) — sale en los primeros días
 *
 * El totalFH se inicializa con la suma esperada de varios ciclos pasados (no relevante para
 * gameplay, solo para "edad realista" visible en UI).
 */
export function generateInitialFleet(rng: Rng, airlines: readonly Airline[]): FleetAircraft[] {
  const out: FleetAircraft[] = [];
  const used = new Set<string>();
  for (const al of airlines) {
    // Fase 5A Y1: usar airline.basedAircraftCount si está definido (representa matrículas
    // basadas en NUESTRO aeropuerto, no la flota total de la aerolínea). Default 8.
    const size = al.basedAircraftCount ?? FLEET_SIZE_PER_AIRLINE;
    for (let i = 0; i < size; i++) {
      let reg = generateRegistration(rng);
      while (used.has(reg)) reg = generateRegistration(rng);
      used.add(reg);
      const slot = randPick(rng, al.fleet);
      out.push({
        registration: reg,
        airlineId: al.id,
        model: slot.model,
        engineVariant: slot.engineVariant,
        totalFH: 0,
        totalCycles: 0,
        fhSinceLastA: 0,
        cyclesSinceLastA: 0,
        fhSinceLastC: 0,
        cyclesSinceLastC: 0,
        fhSinceLastD: 0,
        cyclesSinceLastD: 0,
        warnedA: false,
        warnedC: false,
        warnedD: false,
      });
    }
  }
  return out;
}

/**
 * Siembra `FLEET_SIZE_PER_AIRLINE` aviones nuevos (FH=0) para UNA aerolínea, si no tiene ya.
 * Usado al aceptar un contrato nuevo: la flota de esa aerolínea pasa a existir en el mundo del juego.
 *
 * Si la aerolínea ya tiene aviones registrados, devuelve la flota sin cambios.
 * Inmutable: devuelve nueva flota.
 */
export function seedFleetForAirline(
  rng: Rng,
  airline: Airline,
  existingFleet: readonly FleetAircraft[],
): FleetAircraft[] {
  if (existingFleet.some((f) => f.airlineId === airline.id)) return [...existingFleet];
  const used = new Set(existingFleet.map((f) => f.registration));
  const out: FleetAircraft[] = [...existingFleet];
  // Fase 5A Y1: tamaño dinámico por aerolínea.
  const size = airline.basedAircraftCount ?? FLEET_SIZE_PER_AIRLINE;
  for (let i = 0; i < size; i++) {
    let reg = generateRegistration(rng);
    while (used.has(reg)) reg = generateRegistration(rng);
    used.add(reg);
    const slot = randPick(rng, airline.fleet);
    out.push({
      registration: reg,
      airlineId: airline.id,
      model: slot.model,
      engineVariant: slot.engineVariant,
      totalFH: 0,
      totalCycles: 0,
      fhSinceLastA: 0,
      cyclesSinceLastA: 0,
      fhSinceLastC: 0,
      cyclesSinceLastC: 0,
      fhSinceLastD: 0,
      cyclesSinceLastD: 0,
      warnedA: false,
      warnedC: false,
      warnedD: false,
    });
  }
  return out;
}

/**
 * Calibración Bloque N: envejece una flota recién creada para que los A-checks se ejerciten
 * en las primeras semanas de juego. Sin esto, FH=0 inicial requiere ~10-12 semanas reales
 * para que el primer A-check dispare orgánicamente (umbral 600 FH).
 *
 * Distribución por índice (asumiendo 8 aviones/aerolínea):
 *   i=0     → nuevo (0-100 FH desde último A)
 *   i=1..3  → joven (100-300 FH)
 *   i=4..5  → maduro (300-500 FH)
 *   i=6..7  → próximo al A check (500-580 FH) → dispara en pocos días
 *
 * Inmutable: devuelve nueva flota, no toca la entrada.
 */
export function ageInitialFleet(rng: Rng, fleet: readonly FleetAircraft[]): FleetAircraft[] {
  const byAirline = new Map<string, FleetAircraft[]>();
  for (const f of fleet) {
    if (!byAirline.has(f.airlineId)) byAirline.set(f.airlineId, []);
    byAirline.get(f.airlineId)!.push(f);
  }
  const aged: FleetAircraft[] = [];
  for (const [, planes] of byAirline) {
    planes.forEach((f, i) => {
      let fhSinceA: number;
      let cyclesSinceA: number;
      if (i === 0) {
        fhSinceA = Math.floor(rng.next() * 100);
        cyclesSinceA = Math.floor(rng.next() * 33);
      } else if (i <= 3) {
        fhSinceA = 100 + Math.floor(rng.next() * 200);
        cyclesSinceA = 33 + Math.floor(rng.next() * 67);
      } else if (i <= 5) {
        fhSinceA = 300 + Math.floor(rng.next() * 200);
        cyclesSinceA = 100 + Math.floor(rng.next() * 67);
      } else {
        fhSinceA = 500 + Math.floor(rng.next() * 80);
        cyclesSinceA = 167 + Math.floor(rng.next() * 27);
      }
      const fhSinceC = Math.floor(rng.next() * 3000);
      const cyclesSinceC = Math.floor(rng.next() * 2000);
      const fhSinceD = Math.floor(rng.next() * 10000);
      const cyclesSinceD = Math.floor(rng.next() * 7000);
      const totalFH = fhSinceA + fhSinceC + 2000 + Math.floor(rng.next() * 5000);
      const totalCycles = cyclesSinceA + cyclesSinceC + 1000 + Math.floor(rng.next() * 3000);
      aged.push({
        ...f,
        totalFH,
        totalCycles,
        fhSinceLastA: fhSinceA,
        cyclesSinceLastA: cyclesSinceA,
        fhSinceLastC: fhSinceC,
        cyclesSinceLastC: cyclesSinceC,
        fhSinceLastD: fhSinceD,
        cyclesSinceLastD: cyclesSinceD,
      });
    });
  }
  return aged;
}

/** Horas de vuelo de un leg, randomizadas. */
export function rollFlightHoursForLeg(rng: Rng): number {
  return randFloat(rng, FH_PER_LEG_MIN, FH_PER_LEG_MAX);
}

/** Filtra la flota de una aerolínea concreta. */
export function fleetByAirline(fleet: readonly FleetAircraft[], airlineId: string): FleetAircraft[] {
  return fleet.filter((f) => f.airlineId === airlineId);
}

/**
 * Elige un avión de la flota de la aerolínea para un landing event. Excluye matrículas que
 * estén CURRENTLY in service (no Departed y no aún departed) para evitar paradojas de la misma
 * matrícula en dos stands a la vez. Si todas están ocupadas → devuelve null (raro; el contrato
 * pierde ese landing).
 */
export function pickFleetAircraftForLanding(
  rng: Rng,
  airlineId: string,
  fleet: readonly FleetAircraft[],
  busyRegistrations: ReadonlySet<string>,
): FleetAircraft | null {
  const available = fleet.filter((f) => f.airlineId === airlineId && !busyRegistrations.has(f.registration));
  if (available.length === 0) return null;
  return randPick(rng, available);
}

/**
 * Devuelve una nueva flota con FH+cycles aplicados a la matrícula que acaba de aterrizar.
 * Pura: no muta el array de entrada.
 */
export function applyLandingToFleet(
  fleet: readonly FleetAircraft[],
  registration: string,
  flightHours: number,
): FleetAircraft[] {
  return fleet.map((f) => {
    if (f.registration !== registration) return f;
    return {
      ...f,
      totalFH: f.totalFH + flightHours,
      totalCycles: f.totalCycles + 1,
      fhSinceLastA: f.fhSinceLastA + flightHours,
      cyclesSinceLastA: f.cyclesSinceLastA + 1,
      fhSinceLastC: f.fhSinceLastC + flightHours,
      cyclesSinceLastC: f.cyclesSinceLastC + 1,
      fhSinceLastD: f.fhSinceLastD + flightHours,
      cyclesSinceLastD: f.cyclesSinceLastD + 1,
    };
  });
}

/** Look-up por matrícula. */
export function findFleetAircraft(
  fleet: readonly FleetAircraft[],
  registration: string,
): FleetAircraft | undefined {
  return fleet.find((f) => f.registration === registration);
}

/** Marca/desmarca el flag warned para una matrícula+tipo en la flota. */
export function setFleetWarnedFlag(
  fleet: readonly FleetAircraft[],
  registration: string,
  type: "A" | "C" | "D",
  value: boolean,
): FleetAircraft[] {
  const key = type === "A" ? "warnedA" : type === "C" ? "warnedC" : "warnedD";
  return fleet.map((f) => (f.registration === registration ? { ...f, [key]: value } : f));
}
