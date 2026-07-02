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
// Pivot iteración 2026-05-25 — multi-airport: OVD se mantiene como default cargado
// estáticamente para preservar compat tests/legacy. Para swap a otro aeropuerto (BIO,
// ALC, etc.) usar `setActiveAirportData(schedule, fleet)` antes de crear el game.
import defaultOvdSchedule from "../../assets/airports/ovd.schedule.json" with { type: "json" };
import defaultOvdFleet from "../../assets/airports/ovd.fleet.json" with { type: "json" };

type AirportScheduleData = typeof defaultOvdSchedule;
type AirportFleetData = typeof defaultOvdFleet;

let scheduleData: AirportScheduleData = defaultOvdSchedule;
let fleetData: AirportFleetData = defaultOvdFleet;

/** Swap del aeropuerto activo en runtime (multi-airport).
 *  Default = OVD (LEAS). Llamar antes de createGame con preset.airportIcao !== "LEAS". */
export function setActiveAirportData(schedule: AirportScheduleData, fleet: AirportFleetData): void {
  scheduleData = schedule;
  fleetData = fleet;
}

/** Re-export del asset OVD para que sim-all.ts lo exponga en DATA.airportRuntime sin
 *  duplicar el JSON en el bundle (esbuild dedupes por re-export, no por path doble). */
export const _ovdScheduleAsset = defaultOvdSchedule;
export const _ovdFleetAsset = defaultOvdFleet;

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

/** Códigos IATA de aerolíneas con ≥1 vuelo SERVICIABLE (handled) en el schedule activo.
 *  Deep pass 2026-07-01: el mercado ofertaba contratos de aerolíneas sin un solo vuelo que
 *  el MRO pueda atender (IB/U2 sin vuelos en OVD; YW/NT/KL solo CRJ/E195/E175) → fee semanal
 *  íntegro por cero trabajo y cero riesgo ("dinero gratis", estrategia dominante degenerada).
 *  Este set alimenta el filtro de ofertas de tickLineCompetition. */
export function servedAirlineCodes(): Set<string> {
  const codes = new Set<string>();
  for (const key of PATTERN_KEYS) {
    const flights = (scheduleData.patterns as Record<string, ScheduledFlight[]>)[key] ?? [];
    for (const f of flights) {
      if (isFlightHandled(f)) codes.add(f.airlineCode);
    }
  }
  return codes;
}

/** Devuelve los vuelos planeados para el game day N (cycle 7 días). */
export function getFlightsForGameDay(gameDay: number): ScheduledFlight[] {
  // gameDay 1 → lunes, gameDay 8 → lunes, gameDay 6 → sábado, etc.
  const idx = ((gameDay - 1) % 7 + 7) % 7;
  const key: PatternKey = PATTERN_KEYS[idx];
  return scheduleData.patterns[key] as ScheduledFlight[];
}

/** Pool de stats FH/FC plausibles por operador. Asignación determinista por callsign:
 *  hash → índice estable → mismo callsign siempre arranca con la misma matrícula del pool.
 *  Exportada para que game.ts seedPreOvernighters use matrículas reales del pool
 *  en lugar de las sintéticas tipo "V7-OVN". */
export function pickPoolStatsForCallsign(callsign: string, airlineCode: string): typeof defaultOvdFleet.fleet[number] | null {
  const candidates = fleetData.fleet.filter((f) => f.airlineCode === airlineCode);
  if (candidates.length === 0) return null;
  let h = 0;
  for (let i = 0; i < callsign.length; i++) h = ((h << 5) - h + callsign.charCodeAt(i)) | 0;
  return candidates[Math.abs(h) % candidates.length];
}

/** Pivot iteración 2026-05-25: variante con fallback a matrícula alternativa del pool
 *  si la primary está ocupada. Realidad operacional: si el avión EC-IXM aún sigue en
 *  mantenimiento al MRO y la aerolínea tiene que operar el siguiente IB3219, asigna
 *  otra matrícula del pool. Resuelve el bug donde el IB3219 día N+1 se saltaba porque
 *  EC-IXM seguía en stand desde la noche anterior con WO abierta.
 *  Recorre el pool empezando por la matrícula primary (orden determinista hash) y va
 *  saltando hasta encontrar una libre. Si TODAS están busy, devuelve null. */
function pickPoolStatsAvoidingBusy(
  callsign: string,
  airlineCode: string,
  busyRegs: ReadonlySet<string>,
): typeof defaultOvdFleet.fleet[number] | null {
  const candidates = fleetData.fleet.filter((f) => f.airlineCode === airlineCode);
  if (candidates.length === 0) return null;
  let h = 0;
  for (let i = 0; i < callsign.length; i++) h = ((h << 5) - h + callsign.charCodeAt(i)) | 0;
  const startIdx = Math.abs(h) % candidates.length;
  // Rotar el array empezando por startIdx y devolver la primera no-busy.
  for (let offset = 0; offset < candidates.length; offset++) {
    const cand = candidates[(startIdx + offset) % candidates.length];
    if (!busyRegs.has(cand.registration)) return cand;
  }
  return null; // todas ocupadas
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
  airlines: readonly { id: string; iataCode?: string; homeBaseAirports?: string[] }[] = [],
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
  // Realista (Dani 2026-06-06): pernocta toda llegada de aerolínea BASADA que NO tiene salida
  // posterior ese día (el avión termina su jornada aquí y se queda). Necesitamos el ÚLTIMO
  // departure por aerolínea del día.
  const lastDepartureByCode = new Map<string, number>();
  for (const f of flights) {
    if (f.type !== "departure") continue;
    const prev = lastDepartureByCode.get(f.airlineCode) ?? -1;
    if (f.scheduledMinute > prev) lastDepartureByCode.set(f.airlineCode, f.scheduledMinute);
  }
  // Pivot iteración 2026-05-25: solo aerolíneas con BASE en este aeropuerto pernoctan.
  // Vueling/easyJet/Ryanair hacen turnaround corto en OVD aunque su último arrival sea
  // tarde. Solo Iberia y Volotea (homeBaseAirports incluye "LEAS") dejan aviones overnight.
  const airportIcao = scheduleData.icao;
  const baseByCode = new Map<string, boolean>();
  for (const al of airlines) {
    const code = (al as { iataCode?: string }).iataCode;
    const bases = (al as { homeBaseAirports?: string[] }).homeBaseAirports ?? [];
    if (code) baseByCode.set(code, bases.includes(airportIcao));
  }
  function isOvernightCandidate(f: { scheduledMinute: number; airlineCode: string }): boolean {
    if (baseByCode.get(f.airlineCode) !== true) return false; // solo aerolíneas con base aquí
    // Sin salida posterior ese día → termina su jornada aquí y pernocta (1-2/noche reales en OVD
    // según el snapshot). Sale a la mañana siguiente (06:30) → no queda varado. NO inflamos: solo
    // marcamos bien cuáles se quedan según el propio schedule.
    const lastDep = lastDepartureByCode.get(f.airlineCode) ?? -1;
    return f.scheduledMinute > lastDep;
  }

  // Helper para encontrar el next departure pareja de un arrival (misma aerolínea,
  // tras la hora del arrival, en el mismo día). Si overnight, busca el primer DEP
  // de la misma aerolínea en el día siguiente (no podemos saberlo desde aquí porque
  // generateScheduledArrivals procesa día a día; lo dejamos undefined para overnight
  // y la UI lo deriva del scheduledDeparture o lo busca en otro tick).
  function findNextDepartureCallsign(arr: { scheduledMinute: number; airlineCode: string }): string | undefined {
    const candidates = flights
      .filter((g) => g.type === "departure" && g.airlineCode === arr.airlineCode && g.scheduledMinute > arr.scheduledMinute)
      .sort((a, b) => a.scheduledMinute - b.scheduledMinute);
    return candidates[0]?.callsign;
  }

  for (const f of flights) {
    if (f.type !== "arrival") continue;
    // Pivot línea pura · iteración 2026-05-24: el `registration` del Airplane es la
    // matrícula física REAL (EC-XXX / G-XXX del fleet pool), NO el callsign del vuelo.
    // Mismo callsign hashea siempre a la misma matrícula (determinista). El callsign
    // se guarda en arrivalCallsign para info contextual del leg.
    // Pivot iteración 2026-05-25 fix: si la primary está busy (ej. EC-IXM sigue en
    // mantenimiento en el MRO desde overnight), elegir otra matrícula libre del pool
    // de la aerolínea. Sin este fallback, el callsign del día siguiente se saltaba
    // → "Día 2 sin overnight" cuando en realidad sí había uno planificado.
    const poolStats = pickPoolStatsAvoidingBusy(f.callsign, f.airlineCode, busyRegistrations);
    const physicalReg = poolStats?.registration ?? f.callsign; // fallback al callsign si no hay pool
    if (busyRegistrations.has(physicalReg)) continue; // todas las del pool ocupadas, skip
    // Pivot línea pura: vuelos con modelo/motor no habilitado (Embraer, CRJ, ATR, B737)
    // se ven en el panel Schedule pero NO generan Airplane en el sim hasta que se
    // habilite el type rating correspondiente.
    if (!isFlightHandled(f)) continue;
    const contract = anyIata
      ? contractByIata.get(f.airlineCode)
      : fallbackContract;
    if (!contract) continue; // aerolínea sin contrato → skip vuelo
    const airlineId = contract.airlineId;
    workingFleet = ensureFleetEntry(workingFleet, physicalReg, f.airlineCode, airlineId, f.model as AircraftModel, f.engineVariant as EngineVariant);
    const arrivalMinute = dayOffset + f.scheduledMinute;
    const overnight = isOvernightCandidate(f);
    const scheduledDepartureMinute = overnight
      ? dayOffset + DAY_MINUTES + overnightDepartureOffset
      : arrivalMinute + SCHEDULED_TURNAROUND_MIN;
    arrivals.push({
      instanceId: nextAirplaneInstanceId(),
      registration: physicalReg,
      model: f.model as AircraftModel,
      engineVariant: f.engineVariant as EngineVariant,
      contractId: contract.id,
      standId: "",
      arrivalMinute,
      scheduledDepartureMinute,
      status: "Idle",
      flightHoursThisLeg: SCHEDULED_LEG_FH,
      overnight: overnight || undefined,
      arrivalCallsign: f.callsign,
      nextDepartureCallsign: findNextDepartureCallsign(f),
    });
    workingFleet = applyLandingToFleet(workingFleet, physicalReg, SCHEDULED_LEG_FH);
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
