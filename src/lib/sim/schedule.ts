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
  /** Modelo físico del avión. El sim sólo trabaja con A320/A321 hoy. Otros modelos
   *  (E190, CRJ-1000, ATR72-600, B737-800, etc.) aparecen en el panel Schedule como
   *  movimientos del aeropuerto, pero `generateScheduledArrivals` los skipea hasta
   *  que se habilite el type rating correspondiente (futuro). */
  model: string;
  engineVariant: string;
  airlineCode: string;
  airlineName: string;
  /** Si true, este vuelo es informativo (aparece en panel Schedule) pero NO genera
   *  Airplane real ni trabajo MRO. Útil para Embraer/CRJ/ATR/B737 hasta habilitación. */
  notHandled?: boolean;
}

const HANDLED_MODELS = new Set(["A320", "A321"]);
const HANDLED_ENGINES = new Set(["CFM56", "V2500"]);

function isFlightHandled(f: { model: string; engineVariant: string; notHandled?: boolean }): boolean {
  if (f.notHandled === true) return false;
  return HANDLED_MODELS.has(f.model) && HANDLED_ENGINES.has(f.engineVariant);
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
 * Genera arrivals desde el schedule para el game day N. Pivot MRO línea pura (2026-05-24):
 * cada vuelo se mapea por su `airlineCode` IATA al contrato activo cuya aerolínea tenga
 * el mismo `iataCode`. Si no hay contrato vivo para esa aerolínea, el vuelo se SKIPea —
 * el aeropuerto opera ese movimiento pero el jugador no recibe el avión (otro MRO o
 * "self-handling" de la aerolínea).
 *
 * Fallback legacy (mapeo opaco al primer contract activo) cuando ninguna airline tiene
 * `iataCode` definido — preserva compat con tests pre-pivot.
 *
 * @param airlines aerolíneas del game state (necesarias para resolver iataCode → airlineId).
 *                 Si omitidas, usa el fallback legacy.
 *
 * @returns aviones a añadir + fleet actualizado (lazy entries para callsigns nuevos)
 */
export function generateScheduledArrivals(
  gameDay: number,
  contracts: readonly Contract[],
  fleet: readonly FleetAircraft[],
  busyRegistrations: ReadonlySet<string> = new Set(),
  airlines: readonly { id: string; iataCode?: string }[] = [],
): { arrivals: Airplane[]; updatedFleet: FleetAircraft[] } {
  const flights = getFlightsForGameDay(gameDay);
  const activeContracts = contracts.filter((c) => c.status === "active");
  if (activeContracts.length === 0) return { arrivals: [], updatedFleet: fleet as FleetAircraft[] };

  // Map iataCode → contract (solo si tenemos airlines con iataCode).
  const contractByIata = new Map<string, Contract>();
  let anyIata = false;
  for (const c of activeContracts) {
    const al = airlines.find((a) => a.id === c.airlineId);
    if (al?.iataCode) {
      contractByIata.set(al.iataCode, c);
      anyIata = true;
    }
  }
  // Fallback legacy: si nadie tiene iataCode, usa el primer contract (mapeo opaco).
  const fallbackContract = activeContracts[0];

  const dayOffset = (gameDay - 1) * DAY_MINUTES;
  const arrivals: Airplane[] = [];
  let workingFleet: FleetAircraft[] = [...fleet];

  // Pivot MRO línea pura: detección de pernoctas. Realidad AENA: arrival/departure
  // llevan callsigns distintos (IB3217 arriba, IB3216 sale — son el mismo avión físico
  // con números adyacentes). Heurística: por aerolínea, el ÚLTIMO arrival del día
  // pernocta si llega a partir de las 19:00 (no hay rotación posterior). Modela
  // realidad aeropuertos regionales europeos: el último vuelo se queda hasta primera
  // hora del día siguiente.
  const overnightDepartureOffset = 30 + 6 * 60; // 06:30 día siguiente
  const OVERNIGHT_THRESHOLD_MIN = 19 * 60; // 19:00
  const lastArrivalByCode = new Map<string, number>();
  for (const f of flights) {
    if (f.type !== "arrival") continue;
    const prev = lastArrivalByCode.get(f.airlineCode) ?? -1;
    if (f.scheduledMinute > prev) lastArrivalByCode.set(f.airlineCode, f.scheduledMinute);
  }
  function isOvernightCandidate(f: { scheduledMinute: number; airlineCode: string }): boolean {
    if (f.scheduledMinute < OVERNIGHT_THRESHOLD_MIN) return false;
    return lastArrivalByCode.get(f.airlineCode) === f.scheduledMinute;
  }

  for (const f of flights) {
    if (f.type !== "arrival") continue;
    if (busyRegistrations.has(f.callsign)) continue;
    // Pivot línea pura: vuelos con modelo/motor no habilitado (Embraer, CRJ, ATR, B737)
    // se ven en el panel Schedule pero NO generan Airplane en el sim hasta que se
    // habilite el type rating correspondiente.
    if (!isFlightHandled(f)) continue;
    const contract = anyIata
      ? contractByIata.get(f.airlineCode)
      : fallbackContract;
    if (!contract) continue; // aerolínea sin contrato → skip vuelo
    const airlineId = contract.airlineId;
    workingFleet = ensureFleetEntry(workingFleet, f.callsign, f.airlineCode, airlineId, f.model as AircraftModel, f.engineVariant as EngineVariant);
    const arrivalMinute = dayOffset + f.scheduledMinute;
    const overnight = isOvernightCandidate(f);
    const scheduledDepartureMinute = overnight
      ? dayOffset + DAY_MINUTES + overnightDepartureOffset
      : arrivalMinute + SCHEDULED_TURNAROUND_MIN;
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
      overnight: overnight || undefined,
    });
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
