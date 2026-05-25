// Fase 5D · P-α: sync layer.
//
// Convierte GameState en RenderState puro y serializable. NO importa Pixi ni DOM.
// Tests deterministas en `tests/render_sync.mjs`.

import { canUnlockHangars, type GameState } from "../game.ts";
import type { WorkOrderInstance } from "$lib/types";
import { currentStands } from "../sim/stands.ts";
import { runwayClosedAt } from "../sim/events.ts";
import { DAY_MINUTES } from "../sim/time.ts";
import { getFlightsForGameDay } from "../sim/schedule.ts";
import type { RenderAirplane, RenderMechanic, RenderStand, RenderState, RenderPassthroughTraffic, TimeOfDay, AirplaneDisplayState } from "./types.ts";

/** Pivot iteración 2026-05-25: ya NO una constante fija. Los passthrough usan TODOS los
 *  stands principales OSM que el sim NO ocupa según etapa actual del MRO. Stage 1: sim
 *  ocupa 01-05 (H1-S1..H1-S5) → passthrough disponibles 06, 07, 08, 08A, 09. Stage 2:
 *  sim añade R1 → 06 no disponible. Y así. Coherente con realidad OVD: aviones comerciales
 *  (Air Nostrum, Ryanair) usan stands principales del terminal junto a Iberia, no se
 *  apartan a aviación general. */
const ALL_OSM_PARKING_REFS = ["01", "02", "03", "04", "05", "06", "07", "08", "08A", "09"];
const SIM_OCCUPIED_BY_STAGE: Record<number, string[]> = {
  1: ["01", "02", "03", "04", "05"],
  2: ["01", "02", "03", "04", "05", "06"],
  3: ["01", "02", "03", "04", "05", "06", "07"],
  4: ["01", "02", "03", "04", "05", "06", "07"],
};
function passthroughStandsForStage(stage: 1 | 2 | 3 | 4): string[] {
  const simOcc = new Set(SIM_OCCUPIED_BY_STAGE[stage] ?? []);
  return ALL_OSM_PARKING_REFS.filter((r) => !simOcc.has(r));
}

/** Duración visual del turnaround para passthroughs en minutos. Igual que el
 *  SCHEDULED_TURNAROUND_MIN del sim (55 min) — el avión se ve en stand 55min
 *  desde su arrival, luego desaparece. Salvo si pernocta (heurística overnight). */
const PASSTHROUGH_TURNAROUND_MIN = 55;
/** Minuto del día (≥ 19:00 = 1140) por encima del cual el último arrival de la
 *  aerolínea se considera overnight: se queda en stand toda la noche hasta 06:30
 *  del día siguiente. Mismo umbral que `schedule.ts`. */
const PASSTHROUGH_OVERNIGHT_THRESHOLD_MIN = 19 * 60;
/** Hora de salida overnight (minuto desde dayStart del día siguiente). 06:30. */
const PASSTHROUGH_OVERNIGHT_DEPARTURE_MIN = 6 * 60 + 30;

/** Día: 06:00-21:59. Noche: 22:00-05:59. Alineado con el badge HUD ☀️/🌙 ya existente. */
export function timeOfDayFor(minute: number): TimeOfDay {
  const hourOfDay = Math.floor((minute % DAY_MINUTES) / 60);
  return hourOfDay >= 6 && hourOfDay < 22 ? "day" : "night";
}

/** P-γ: cuánto dura visualmente el taxi (pista → stand) tras el arrival. No tiene
 *  efecto en el sim — solo controla cuándo el driver muestra el avión "taxiándose" en
 *  motion path frente a "parado en stand". */
export const TAXIING_DURATION_MIN = 4;

export function buildRenderState(g: GameState): RenderState {
  const stage = g.mroStage;
  const stands = currentStands(stage);

  // Pivot línea pura: el filtro de presencia ahora respeta `actualDepartureMinute` (set
  // por processDepartures) — un avión con WO activa sigue en stand más allá de su
  // scheduledDeparture hasta que la WO cierre. Si no tiene actualDeparture aún, está presente.
  const now = g.clock.minute;

  // Pivot iteración 2026-05-25 — Performance: pre-indexar workOrders activas, contracts y
  // maintenanceChecks UNA SOLA VEZ en lugar de hacer find/filter PER airplane (O(N²) → O(N)).
  // Para BIO con 50 airplanes activos y 100 WOs esto pasa de ~5.000 ops a ~150 ops por tick.
  const activeWosByAirplane = new Map<string, WorkOrderInstance[]>();
  for (const w of g.workOrders) {
    if (w.phase === "Completed" || w.phase === "Failed" || w.phase === "Deferred") continue;
    const arr = activeWosByAirplane.get(w.airplaneInstanceId);
    if (arr) arr.push(w);
    else activeWosByAirplane.set(w.airplaneInstanceId, [w]);
  }
  const contractById = new Map<string, typeof g.contracts[number]>();
  for (const c of g.contracts) contractById.set(c.id, c);
  const inProgressCheckByReg = new Map<string, typeof g.maintenanceChecks[number]>();
  for (const c of g.maintenanceChecks) {
    if (c.phase === "InProgress") inProgressCheckByReg.set(c.registration, c);
  }

  const airplanes: RenderAirplane[] = g.airplanes
    .filter((a) => a.arrivalMinute <= now && (a.actualDepartureMinute === undefined || a.actualDepartureMinute > now))
    .map((a) => {
      const contract = contractById.get(a.contractId);
      const taxiAge = now - a.arrivalMinute;
      const taxiing = taxiAge >= 0 && taxiAge < TAXIING_DURATION_MIN;
      const taxiProgress = TAXIING_DURATION_MIN > 0
        ? Math.max(0, Math.min(1, taxiAge / TAXIING_DURATION_MIN))
        : 1;
      // Pivot iteración 2026-05-24: derivar displayState semántico para que el driver
      // pinte el avión con color/badge según situación operativa. Prioridad:
      // aog > delayed > working > daily > idle. Los IDs activos permiten click contextual.
      const woOnPlane = activeWosByAirplane.get(a.instanceId) ?? [];
      const dailyOpen = woOnPlane.filter((w) => w.templateId?.startsWith?.("DC-"));
      const calloutsOpen = woOnPlane.filter((w) => !w.templateId?.startsWith?.("DC-"));
      const checkOnPlane = inProgressCheckByReg.get(a.registration);
      const hasMechWorking = woOnPlane.some(
        (w) => w.assignedMechanicIds.length > 0 && (w.phase === "MainTask" || w.phase === "Test" || w.phase === "Rework" || w.phase === "Inspection"),
      ) || (checkOnPlane !== undefined && checkOnPlane.assignedMechanicIds.length > 0);
      let displayState: AirplaneDisplayState = "idle";
      if (a.aogEscalated) {
        displayState = "aog";
      } else if (a.scheduledDepartureMinute < now && woOnPlane.length > 0) {
        displayState = "delayed";
      } else if (hasMechWorking) {
        displayState = "working";
      } else if (dailyOpen.length > 0) {
        displayState = "daily";
      }
      // Callout activo prioritario para click; si no hay callout pero hay check, ése.
      const activeWoInstanceId = calloutsOpen[0]?.instanceId;
      const activeCheckInstanceId = checkOnPlane?.instanceId;
      const hasOpenDaily = dailyOpen.length > 0;
      return {
        instanceId: a.instanceId,
        registration: a.registration,
        standId: a.standId || null,
        airlineId: contract?.airlineId ?? "",
        status: a.status,
        overnight: a.overnight ?? false,
        taxiing,
        taxiProgress,
        displayState,
        ...(activeWoInstanceId ? { activeWoInstanceId } : {}),
        ...(activeCheckInstanceId ? { activeCheckInstanceId } : {}),
        ...(hasOpenDaily ? { hasOpenDaily } : {}),
      };
    });

  // Index aviones por stand para lookup O(1).
  const airplaneByStand = new Map<string, string>();
  for (const a of airplanes) {
    if (a.standId) airplaneByStand.set(a.standId, a.instanceId);
  }
  // Checks InProgress por stand.
  const checkByStand = new Map<string, { onPlatform: boolean }>();
  for (const c of g.maintenanceChecks) {
    if (c.phase === "InProgress" && c.standId) {
      checkByStand.set(c.standId, { onPlatform: c.onPlatform ?? false });
    }
  }

  const renderStands: RenderStand[] = stands.map((s) => {
    const check = checkByStand.get(s.id);
    return {
      id: s.id,
      type: s.type,
      airplaneInstanceId: airplaneByStand.get(s.id) ?? null,
      checkInProgress: !!check,
      checkOnPlatform: check?.onPlatform ?? false,
    };
  });

  // Mecs visibles. Para cada uno con destino, resolvemos el standId destino vía
  // assignedWoInstanceId → airplane.standId, o vía assignedCheckInstanceId → check.standId.
  // P-γ: progress 0..1 para interpolación del furgo en motion path oficina→stand.
  // Pivot iteración 2026-05-25 — Performance: pre-index workOrders/airplanes/checks
  // por instanceId para que el .map(m=>) abajo sea O(1) por mecánico en lugar de O(N).
  const woById = new Map<string, WorkOrderInstance>();
  for (const w of g.workOrders) woById.set(w.instanceId, w);
  const airplaneById = new Map<string, typeof g.airplanes[number]>();
  for (const a of g.airplanes) airplaneById.set(a.instanceId, a);
  const checkById = new Map<string, typeof g.maintenanceChecks[number]>();
  for (const c of g.maintenanceChecks) checkById.set(c.instanceId, c);

  const travelMin = (g.balance.officeToStandMinutes ?? 2) || 1;
  const mechanics: RenderMechanic[] = g.mechanics.map((m) => {
    let destStandId: string | null = null;
    if (m.assignedWoInstanceId) {
      const wo = woById.get(m.assignedWoInstanceId);
      if (wo) {
        const ap = airplaneById.get(wo.airplaneInstanceId);
        destStandId = ap?.standId || null;
      }
    } else if (m.assignedCheckInstanceId) {
      const chk = checkById.get(m.assignedCheckInstanceId);
      destStandId = chk?.standId || null;
    }
    let progress = 0;
    if (m.state === "ToPlane" || m.state === "Returning") {
      progress = Math.max(0, Math.min(1, 1 - m.stateRemainingMinutes / travelMin));
    } else if (m.state === "Working") {
      progress = 1;
    }
    return {
      id: m.id,
      name: m.name,
      state: m.state,
      destStandId,
      progress,
    };
  });

  // Pivot línea pura · aeropuerto vivo: para cada flight del día actualmente en
  // ventana de turnaround que NO es uno de los aviones reales (sin contrato firmado
  // o type rating no habilitado), construimos un pseudo-render entry. Stand asignado
  // round-robin sobre los OSM parking refs libres según etapa MRO.
  const passthroughTraffic: RenderPassthroughTraffic[] = [];
  if (g.useScheduleArrivals && g.lineModeEnabled) {
    const today = Math.floor(g.clock.minute / DAY_MINUTES) + 1;
    const dayStart = (today - 1) * DAY_MINUTES;
    const flights = getFlightsForGameDay(today);
    const passthroughStands = passthroughStandsForStage(stage);
    // Pivot línea pura · iteración 2026-05-24 fix: comparar callsign del leg, NO la
    // matrícula. Tras el cambio "registration = matrícula real EC-XXX + arrivalCallsign
    // = IB3219 callsign IATA", el filtro de duplicados debe usar el callsign para no
    // pintar el mismo vuelo dos veces (una como real EC-XXX en sim stand y otra como
    // passthrough con callsign en OSM stand).
    const realCallsigns = new Set(
      g.airplanes
        .filter((a) => a.arrivalMinute <= g.clock.minute && (a.actualDepartureMinute === undefined || a.actualDepartureMinute > g.clock.minute))
        .map((a) => a.arrivalCallsign ?? a.registration),
    );
    const contractsByCode = new Map<string, string>();
    for (const c of g.contracts) {
      if (c.status !== "active") continue;
      const al = g.airlines.find((a) => a.id === c.airlineId);
      if (al?.iataCode) contractsByCode.set(al.iataCode, c.id);
    }
    // Heurística overnight de los passthroughs (mismo criterio que schedule.ts):
    // por aerolínea, el último arrival ≥19:00 se queda en stand toda la noche SI Y SOLO
    // SI la aerolínea tiene base operativa aquí (homeBaseAirports incluye el ICAO).
    const lastArrivalByCode = new Map<string, number>();
    for (const f of flights) {
      if (f.type !== "arrival") continue;
      const prev = lastArrivalByCode.get(f.airlineCode) ?? -1;
      if (f.scheduledMinute > prev) lastArrivalByCode.set(f.airlineCode, f.scheduledMinute);
    }
    // Pivot iteración 2026-05-25 — Multi-airport: usar airportIcao del game state.
    const airportIcao = g.airportIcao ?? "LEAS";
    const isBaseByCode = new Map<string, boolean>();
    for (const al of g.airlines) {
      if (!al.iataCode) continue;
      const bases = al.homeBaseAirports ?? [];
      isBaseByCode.set(al.iataCode, bases.includes(airportIcao));
    }

    let standIdx = 0;
    // Pivot iteración 2026-05-25: pre-loop para "overnighters del AYER" — al arrancar
    // el día 1 a las 06:00 conceptualmente los overnighters de la noche anterior siguen
    // en stand hasta su salida ~06:30. Como no hay schedule de Día 0, modelamos el patrón
    // recurrente: si IB3219/YW8519/FR4571 son overnight HOY, también lo fueron AYER.
    // Para aerolíneas SIN contrato active aparecen como passthrough; las contratadas YA
    // tienen su pre-seed real (seedPreOvernighters en game.ts).
    // Pivot iteración 2026-05-25: el bloque previo de "passthroughs sintéticos por base"
    // se eliminó — el juego refleja SOLO datos reales del schedule. Si Volotea no tiene
    // un arrival nocturno en el dataset, no se inventa. Cuando el dataset real (API)
    // muestre overnighters de V7, aparecerán naturalmente.
    for (const f of flights) {
      if (f.type !== "arrival") continue;
      const arrAbs = dayStart + f.scheduledMinute;
      const isOvernight =
        f.scheduledMinute >= PASSTHROUGH_OVERNIGHT_THRESHOLD_MIN &&
        lastArrivalByCode.get(f.airlineCode) === f.scheduledMinute &&
        isBaseByCode.get(f.airlineCode) === true; // solo basadas pernoctan
      const depAbs = isOvernight
        ? dayStart + DAY_MINUTES + PASSTHROUGH_OVERNIGHT_DEPARTURE_MIN
        : arrAbs + PASSTHROUGH_TURNAROUND_MIN;
      if (g.clock.minute < arrAbs || g.clock.minute >= depAbs) continue;
      if (realCallsigns.has(f.callsign)) continue; // ya es real, no doblar
      if (standIdx >= passthroughStands.length) break; // overflow, los extras se saltan
      const taxiAge = g.clock.minute - arrAbs;
      const taxiing = taxiAge >= 0 && taxiAge < TAXIING_DURATION_MIN;
      const taxiProgress = TAXIING_DURATION_MIN > 0
        ? Math.max(0, Math.min(1, taxiAge / TAXIING_DURATION_MIN))
        : 1;
      passthroughTraffic.push({
        callsign: f.callsign,
        airlineCode: f.airlineCode,
        standOsmRef: passthroughStands[standIdx++],
        taxiing,
        taxiProgress,
        notHandled: f.notHandled === true,
        contracted: contractsByCode.has(f.airlineCode),
      });
    }
  }

  return {
    minute: g.clock.minute,
    timeOfDay: timeOfDayFor(g.clock.minute),
    mroStage: stage,
    airplanes,
    stands: renderStands,
    mechanics,
    runwayClosed: runwayClosedAt(g.randomEvents, g.clock.minute),
    // En lineMode el unlock depende de progreso (rep+balance+contratos). En legacy
    // los plots ghost están siempre disponibles (comportamiento pre-pivot).
    hangarBuildUnlocked: g.lineModeEnabled ? canUnlockHangars(g) : true,
    passthroughTraffic,
  };
}
