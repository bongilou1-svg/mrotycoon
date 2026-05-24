// F5D scope creep · sim de arrivals basado en snapshot real OVD (LEAS).
//
// El snapshot vive en src/assets/airports/ovd.schedule.json con 7 plantillas
// día-de-semana (lunes-domingo) y ~86 vuelos plausibles del aeropuerto Asturias.
//
// Mapeo opaco: cada vuelo schedule se asigna al primer contract ACTIVE del game state.
// El callsign del schedule se usa como `registration` del Airplane (e.g. "IB3217").
// FleetAircraft se crea lazy: si la matrícula no existe, se añade con FH=0/cycles=0
// y persiste entre arrivals del mismo callsign (rotaciones reales del avión).
//
// Time shift: game day 1 = lunes (índice 0 del array de patrones).
//   gameDay → patternIdx = ((gameDay - 1) % 7 + 7) % 7
//
// NO toca airlines.json ni rompe save v7. Solo añade flag `useScheduleArrivals` opcional
// al GameState (default false para no romper tests/saves legacy).

import type { Airplane, Contract, FleetAircraft, AircraftModel, EngineVariant } from "$lib/types";
import { nextAirplaneInstanceId, applyLandingToFleet } from "./fleet.ts";
import { DAY_MINUTES } from "./time.ts";
// JSON snapshots importados en build-time (esbuild loader json + Node TS 22+ con `with`).
import scheduleData from "../../assets/airports/ovd.schedule.json" with { type: "json" };
import fleetData from "../../assets/airports/ovd.fleet.json" with { type: "json" };

export interface ScheduledFlight {
  callsign: string;
  type: "arrival" | "departure";
  remote: string;
  scheduledMinute: number; // minuto del día [0..1439]
  model: AircraftModel;
  engineVariant: EngineVariant;
  airlineCode: string;
  airlineName: string;
}

const PATTERN_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type PatternKey = typeof PATTERN_KEYS[number];

/** Devuelve los vuelos planeados para el game day N (cycle 7 días). */
export function getFlightsForGameDay(gameDay: number): ScheduledFlight[] {
  // gameDay 1 → lunes, gameDay 8 → lunes, gameDay 6 → sábado, etc.
  const idx = ((gameDay - 1) % 7 + 7) % 7;
  const key: PatternKey = PATTERN_KEYS[idx];
  return scheduleData.patterns[key] as ScheduledFlight[];
}

/** Pool de stats FH/FC plausibles por operador. Asignación determinista por callsign:
 *  hash → índice estable → mismo callsign siempre arranca con la misma matrícula del pool. */
function pickPoolStatsForCallsign(callsign: string, airlineCode: string): typeof fleetData.fleet[number] | null {
  const candidates = fleetData.fleet.filter((f) => f.airlineCode === airlineCode);
  if (candidates.length === 0) return null;
  let h = 0;
  for (let i = 0; i < callsign.length; i++) h = ((h << 5) - h + callsign.charCodeAt(i)) | 0;
  return candidates[Math.abs(h) % candidates.length];
}

/** Si la matrícula no existe en fleet, la añade con stats FH/FC del pool plausible.
 *  Mismo callsign siempre asigna mismo pool entry (hash determinista). */
function ensureFleetEntry(
  fleet: readonly FleetAircraft[],
  registration: string,
  airlineCode: string,
  airlineId: string,
  model: AircraftModel,
  engineVariant: EngineVariant,
): FleetAircraft[] {
  const existing = fleet.find((f) => f.registration === registration);
  if (existing) return fleet as FleetAircraft[];
  // Buscar stats en el pool (mismo callsign → mismas stats)
  const poolStats = pickPoolStatsForCallsign(registration, airlineCode);
  const stats = poolStats ?? {
    totalFH: 0, totalCycles: 0,
    fhSinceLastA: 0, cyclesSinceLastA: 0,
    fhSinceLastC: 0, cyclesSinceLastC: 0,
    fhSinceLastD: 0, cyclesSinceLastD: 0,
  };
  return [
    ...fleet,
    {
      registration, airlineId, model, engineVariant,
      totalFH: stats.totalFH, totalCycles: stats.totalCycles,
      fhSinceLastA: stats.fhSinceLastA, cyclesSinceLastA: stats.cyclesSinceLastA,
      fhSinceLastC: stats.fhSinceLastC, cyclesSinceLastC: stats.cyclesSinceLastC,
      fhSinceLastD: stats.fhSinceLastD, cyclesSinceLastD: stats.cyclesSinceLastD,
      warnedA: false, warnedC: false, warnedD: false,
    },
  ];
}

/** Duración por defecto del leg (vuelo corto OVD-MAD/BCN/etc). */
const SCHEDULED_LEG_FH = 1.5;
/** Turnaround típico para vuelos del schedule — coincide con la separación arrival↔departure
 *  del mismo callsign en el patrón AENA (55 minutos en la mayoría). */
const SCHEDULED_TURNAROUND_MIN = 55;

/**
 * Genera arrivals desde el schedule para el game day N. Cada arrival se asigna
 * al primer contract activo (mapeo opaco — todos los IB/VY/V7/U2 se mapean a la
 * misma aerolínea del sim, perdiendo distinción operadora pero respetando horarios).
 *
 * @returns aviones a añadir + fleet actualizado (lazy entries para callsigns nuevos)
 */
export function generateScheduledArrivals(
  gameDay: number,
  contracts: readonly Contract[],
  fleet: readonly FleetAircraft[],
  busyRegistrations: ReadonlySet<string> = new Set(),
): { arrivals: Airplane[]; updatedFleet: FleetAircraft[] } {
  const flights = getFlightsForGameDay(gameDay);
  const activeContracts = contracts.filter((c) => c.status === "active");
  if (activeContracts.length === 0) return { arrivals: [], updatedFleet: fleet as FleetAircraft[] };
  const contract = activeContracts[0]; // mapeo opaco
  const airlineId = contract.airlineId;
  const dayOffset = (gameDay - 1) * DAY_MINUTES;
  const arrivals: Airplane[] = [];
  let workingFleet: FleetAircraft[] = [...fleet];

  for (const f of flights) {
    if (f.type !== "arrival") continue;
    if (busyRegistrations.has(f.callsign)) continue;
    workingFleet = ensureFleetEntry(workingFleet, f.callsign, f.airlineCode, airlineId, f.model, f.engineVariant);
    const arrivalMinute = dayOffset + f.scheduledMinute;
    const scheduledDepartureMinute = arrivalMinute + SCHEDULED_TURNAROUND_MIN;
    arrivals.push({
      instanceId: nextAirplaneInstanceId(),
      registration: f.callsign,
      model: f.model,
      engineVariant: f.engineVariant,
      contractId: contract.id,
      standId: "",
      arrivalMinute,
      scheduledDepartureMinute,
      status: "Idle",
      flightHoursThisLeg: SCHEDULED_LEG_FH,
    });
    // Aplica FH+cycles al fleet (la matrícula acumula como rotación real)
    workingFleet = applyLandingToFleet(workingFleet, f.callsign, SCHEDULED_LEG_FH);
  }

  return { arrivals, updatedFleet: workingFleet };
}

/** Helper utility: cuenta total de vuelos en el snapshot. */
export function getScheduleTotalFlights(): number {
  let total = 0;
  for (const k of PATTERN_KEYS) total += scheduleData.patterns[k].length;
  return total;
}

export function getScheduleMetadata(): { airport: string; icao: string; totalFlights: number; airlines: Record<string, number> } {
  const airlines: Record<string, number> = {};
  for (const k of PATTERN_KEYS) {
    for (const f of scheduleData.patterns[k]) {
      airlines[f.airlineCode] = (airlines[f.airlineCode] ?? 0) + 1;
    }
  }
  return {
    airport: scheduleData.airport,
    icao: scheduleData.icao,
    totalFlights: getScheduleTotalFlights(),
    airlines,
  };
}
