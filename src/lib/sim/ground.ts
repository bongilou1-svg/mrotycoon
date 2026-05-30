// Pivot iteración 2026-05-30 — "Aeropuerto vivo, visión general".
//
// Fuente de verdad ÚNICA de "qué aviones están EN TIERRA ahora mismo", combinando:
//   1. Tus aviones reales (game.airplanes) — los que tu MRO gestiona (callouts, daily checks).
//   2. El tráfico del aeropuerto desde el schedule real (passthrough) — todos los movimientos
//      del día en su ventana de turnaround, sean de aerolíneas contratadas o no, incluso
//      modelos que todavía no puedes mantener (Embraer/CRJ/ATR/B737).
//
// Universal por diseño: lee el schedule ACTIVO (intercambiado por setActiveAirportData al
// elegir aeropuerto), así que sirve igual para LEAS/LEBB/LEAL y cualquier futuro aeropuerto.
//
// NO tiene cap de stands — esto es DATA, no render. El mapa Pixi (sync.ts) sí limita por
// stands físicos OSM disponibles; el panel "EN TIERRA" usa este helper como conteo total real.
// Las reglas de overnight/turnaround son idénticas a sync.ts y schedule.ts para que el panel
// y el mapa sean coherentes (mismos aviones, distinta representación).

import type { GameState } from "../game.ts";
import { DAY_MINUTES } from "./time.ts";
import { getFlightsForGameDay, pickPoolStatsForCallsign } from "./schedule.ts";

/** Turnaround visual de un passthrough (min). Igual que SCHEDULED_TURNAROUND_MIN del sim. */
const TURNAROUND_MIN = 55;
/** Minuto del día (≥19:00) por encima del cual el último arrival de la aerolínea pernocta. */
const OVERNIGHT_THRESHOLD_MIN = 19 * 60;
/** Salida del overnighter al día siguiente (06:30 desde dayStart del día siguiente). */
const OVERNIGHT_DEPARTURE_MIN = 6 * 60 + 30;

/** Una entrada de "avión en tierra ahora". `isReal` => es uno de tus aviones MRO. */
export interface GroundAircraft {
  /** Callsign del leg (clave de dedup entre real y passthrough). */
  callsign: string;
  /** Matrícula física para mostrar (EC-XXX). Para passthrough sin pool, cae al callsign. */
  registration: string;
  airlineCode: string;
  airlineId: string | null;
  /** Stand del sim si es real y está asignado; null para passthrough (el panel no lo necesita). */
  standId: string | null;
  /** Minuto absoluto de llegada. */
  arrivalMinute: number;
  /** Minuto absoluto de salida programada (null si desconocido). */
  departureMinute: number | null;
  overnight: boolean;
  /** La aerolínea tiene contrato activo tuyo. */
  contracted: boolean;
  /** Es uno de tus aviones reales (game.airplanes) — trabajo MRO efectivo. */
  isReal: boolean;
  /** Modelo no mantenible todavía (sin type rating): informativo, no genera trabajo. */
  notHandled: boolean;
}

/**
 * Devuelve TODOS los aviones en tierra en el minuto actual del juego, reales + passthrough,
 * deduplicados por callsign (el real tiene prioridad). Lista sin orden garantizado — el
 * consumidor ordena según necesite (p.ej. por salida, o priorizando los tuyos).
 */
export function getGroundTraffic(g: GameState): GroundAircraft[] {
  const now = g.clock.minute;
  const out: GroundAircraft[] = [];
  const seenCallsigns = new Set<string>();

  // Índice: iataCode → { contratado, airlineId } para resolver flags rápido.
  const contractedCodes = new Set<string>();
  for (const c of g.contracts) {
    if (c.status !== "active") continue;
    const al = g.airlines.find((a) => a.id === c.airlineId);
    if (al?.iataCode) contractedCodes.add(al.iataCode);
  }
  const airlineByCode = new Map<string, { id: string; iataCode?: string; homeBaseAirports?: string[] }>();
  for (const a of g.airlines) {
    if (a.iataCode) airlineByCode.set(a.iataCode, a);
  }
  const contractById = new Map<string, (typeof g.contracts)[number]>();
  for (const c of g.contracts) contractById.set(c.id, c);

  // 1. Aviones reales presentes (tu MRO los gestiona).
  for (const a of g.airplanes) {
    const present =
      a.arrivalMinute <= now &&
      (a.actualDepartureMinute === undefined || a.actualDepartureMinute > now);
    if (!present) continue;
    const contract = contractById.get(a.contractId);
    const al = contract ? g.airlines.find((x) => x.id === contract.airlineId) : undefined;
    const cs = a.arrivalCallsign ?? a.registration;
    seenCallsigns.add(cs);
    out.push({
      callsign: cs,
      registration: a.registration,
      airlineCode: al?.iataCode ?? "",
      airlineId: contract?.airlineId ?? null,
      standId: a.standId || null,
      arrivalMinute: a.arrivalMinute,
      departureMinute: a.scheduledDepartureMinute ?? null,
      overnight: a.overnight ?? false,
      contracted: true, // un avión real siempre es de un contrato activo
      isReal: true,
      notHandled: false,
    });
  }

  // 2. Passthrough: tráfico real del aeropuerto que NO es uno de tus aviones.
  // Solo en lineMode con schedule activo (igual gate que sync.ts).
  if (g.useScheduleArrivals && g.lineModeEnabled) {
    const today = Math.floor(now / DAY_MINUTES) + 1;
    const dayStart = (today - 1) * DAY_MINUTES;
    const flights = getFlightsForGameDay(today);
    const airportIcao = g.airportIcao ?? "LEAS";

    // Último arrival por código (para decidir overnight).
    const lastArrivalByCode = new Map<string, number>();
    for (const f of flights) {
      if (f.type !== "arrival") continue;
      const prev = lastArrivalByCode.get(f.airlineCode) ?? -1;
      if (f.scheduledMinute > prev) lastArrivalByCode.set(f.airlineCode, f.scheduledMinute);
    }
    const isBased = (code: string): boolean => {
      const al = airlineByCode.get(code);
      return (al?.homeBaseAirports ?? []).includes(airportIcao);
    };

    for (const f of flights) {
      if (f.type !== "arrival") continue;
      if (seenCallsigns.has(f.callsign)) continue; // ya está como real, no doblar
      const arrAbs = dayStart + f.scheduledMinute;
      const overnight =
        f.scheduledMinute >= OVERNIGHT_THRESHOLD_MIN &&
        lastArrivalByCode.get(f.airlineCode) === f.scheduledMinute &&
        isBased(f.airlineCode);
      const depAbs = overnight
        ? dayStart + DAY_MINUTES + OVERNIGHT_DEPARTURE_MIN
        : arrAbs + TURNAROUND_MIN;
      if (now < arrAbs || now >= depAbs) continue; // fuera de ventana de turnaround
      seenCallsigns.add(f.callsign);
      const al = airlineByCode.get(f.airlineCode);
      const poolStats = pickPoolStatsForCallsign(f.callsign, f.airlineCode);
      out.push({
        callsign: f.callsign,
        registration: poolStats?.registration ?? f.callsign,
        airlineCode: f.airlineCode,
        airlineId: al?.id ?? null,
        standId: null,
        arrivalMinute: arrAbs,
        departureMinute: depAbs,
        overnight,
        contracted: contractedCodes.has(f.airlineCode),
        isReal: false,
        notHandled: f.notHandled === true,
      });
    }
  }

  return out;
}

/** Próximas N salidas (de aviones en tierra ahora con salida futura), orden cronológico. */
export function getUpcomingDepartures(g: GameState, limit = 3): GroundAircraft[] {
  const now = g.clock.minute;
  return getGroundTraffic(g)
    .filter((a) => a.departureMinute !== null && a.departureMinute >= now)
    .sort((a, b) => (a.departureMinute ?? 0) - (b.departureMinute ?? 0))
    .slice(0, limit);
}
