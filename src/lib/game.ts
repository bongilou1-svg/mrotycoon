// Game state global combinando todos los sub-sistemas. Centraliza el tick.
// Mantengo lógica pura aquí; la reactividad Svelte la lleva stores/game.ts.

import type {
  Airplane, Airline, Contract, Mechanic, WorkOrderInstance, WorkOrderTemplate, Balance, FleetAircraft,
  CheckDefinition, MaintenanceCheckInstance, ComplianceState, Candidate, MroStage, ActiveBuild,
  RandomEvent, DepartureKPI, HoursKPI,
} from "$lib/types";
import { STAGE_CONFIG } from "./types/mroStage.ts";
import {
  createDepartureKPI, createAirlineBucket, AOG_DELAY_THRESHOLD_MIN, AOG_ESCALATION_PENALTY_EUR,
  AOG_EVITABLE_PENALTY_MULT, AOG_EVITABLE_REP_MULT, isDelayCauseEvitable,
  DISPATCH_COTA_15, DISPATCH_COTA_60,
  type DelayRootCause,
} from "./types/departureKPI.ts";
import {
  createHoursKPI, bookHoursForTemplate, actualHoursForCompletedWo, recordWoCompletionInHoursKPI,
} from "./types/hoursKPI.ts";
import { rollDailyEvents, runwayClosedAt } from "./sim/events.ts";
import { type ClockState, createClock, advance, DAY_MINUTES, WEEK_MINUTES } from "./sim/time.ts";
import { type Rng, createRng } from "./sim/rng.ts";
import {
  generateInitialContracts, generateInitialContractsLine, generateInitialContractsFromPreset, activeContracts, expireOffers, acceptOffer, rejectOffer,
  tickContractMarket, tickLineCompetition, tickContractTierUpgrade, brandReputation,
  OFFER_TICK_DAYS, LINE_COMPETITION_TICK_DAYS, TIER_UPGRADE_TICK_DAYS, _resetContractCounter,
} from "./sim/contracts.ts";
import { tierLabel } from "./types/contract.ts";
import { generateDailyArrivals, assignStand } from "./sim/airplanes.ts";
import { nextAirplaneInstanceId } from "./sim/fleet.ts";
import { getFlightsForGameDay, pickPoolStatsForCallsign } from "./sim/schedule.ts";
import { generateScheduledArrivals } from "./sim/schedule.ts";
import { currentLineStandIds, currentBaseStandIds } from "./sim/stands.ts";
import { generateInitialFleet, ageInitialFleet, seedFleetForAirline, resetAirplaneInstanceCounter } from "./sim/fleet.ts";
import { scheduleDueChecks, resetMaintenanceCheckCounter, tickMaintenanceChecks, detectChecksUpcoming } from "./sim/maintenance.ts";
import { setFleetWarnedFlag } from "./sim/fleet.ts";
import { rollWoOnLanding, rollDailyChecksOnOvernight } from "./sim/workorders.ts";
import { tickMel, deferWorkOrder, unDeferWorkOrder, MEL_EXPIRY_PENALTY_EUR } from "./sim/mel.ts";
import { createCompliance, tickCompliance } from "./sim/compliance.ts";
import {
  refreshMarket, shouldRefreshMarket, candidateToMechanic, signingBonusFor, severanceFor,
  tickTraining, resetCandidateCounter, MARKET_REFRESH_DAYS,
} from "./sim/labor.ts";
import { MECHANIC_CAP_INITIAL } from "./sim/mechanics.ts";

/**
 * Pivot MRO línea pura (2026-05-24): arrancamos siendo un MRO de línea de UNA aerolínea
 * pequeña, sin hangares interiores. Stages 3-4 (hangar 1 posición y hangar mayor) quedan
 * gated tras alcanzar madurez de endgame: rep media ≥80 con todas tus aerolíneas, balance
 * sólido ≥1M €, y al menos 3 contratos activos (cartera diversificada). Cumple los tres
 * → desbloquea hangares + amplía la oficina (cap mecánicos).
 *
 * Si alguna condición falla, los plots ghost se ocultan en el mapa y `startBuild` rechaza
 * `target > 2`. `hireCandidate` también respeta el cap de oficina hasta el unlock.
 */
export const HANGAR_UNLOCK_MIN_REP_AVG = 80;
export const HANGAR_UNLOCK_MIN_BALANCE_EUR = 1_000_000;
export const HANGAR_UNLOCK_MIN_ACTIVE_CONTRACTS = 3;

export function canUnlockHangars(g: GameState): boolean {
  const reps = Object.values(g.reputation.perAirline);
  if (reps.length === 0) return false;
  const avg = reps.reduce((s, v) => s + v, 0) / reps.length;
  const actives = g.contracts.filter((c) => c.status === "active").length;
  return (
    avg >= HANGAR_UNLOCK_MIN_REP_AVG &&
    g.economy.balance >= HANGAR_UNLOCK_MIN_BALANCE_EUR &&
    actives >= HANGAR_UNLOCK_MIN_ACTIVE_CONTRACTS
  );
}
import {
  tickMoral, tickActiveTraining, startActiveTraining, applyMoralDelta, MORAL_EVENT_DELTAS,
  ACTIVE_TRAINING_COST_EUR, tickShiftTransitions,
} from "./sim/shifts.ts";
import { generateInitialMechanics, generateInitialDualCandidates, eligibleCertifiers } from "./sim/mechanics.ts";
import { assignMechanicsToWo, tickMechanicTravel } from "./sim/assignment.ts";
import { computeStandTravelMinutes } from "./sim/travel.ts";
import { tickAutoAssign, hasActiveLead, findHandoffReplacement } from "./sim/foreman.ts";
import { tickWorkOrders } from "./sim/wo_state_machine.ts";
import {
  type EconomyState, createEconomy, addTransaction, applyWeeklyClose, payForCompletedWo, createTransaction,
} from "./sim/economy.ts";
import {
  type ReputationState, createReputation, applyDelta, applyDeltaGlobal, reputationDeltaForWo,
  allAirlinesBelowThreshold, getAverageRep,
} from "./sim/reputation.ts";
import { serializeGame } from "./sim/save.ts";
import { getStorage } from "./sim/storage.ts";

export interface NotificationItem {
  id: number;
  minute: number;
  text: string;
  type: "info" | "success" | "warning" | "danger";
}

export interface GameState {
  clock: ClockState;
  contracts: Contract[];
  airlines: Airline[]; // referencia estática del data
  mechanics: Mechanic[];
  /** Flota persistente — matrículas vivas que acumulan FH+cycles. Sujeto de los A/C/D checks. */
  fleet: FleetAircraft[];
  airplanes: Airplane[];
  workOrders: WorkOrderInstance[];
  /** A/C/D checks programados, en curso o cerrados. */
  maintenanceChecks: MaintenanceCheckInstance[];
  /** Definiciones estáticas de checks (referencia, no se serializa). */
  checkDefinitions: CheckDefinition[];
  /** Compliance Part-145 (score 0-100, audits periódicas). */
  compliance: ComplianceState;
  /** Pool de candidatos visible en el mercado laboral (Bloque K). */
  candidates: Candidate[];
  /** Minuto del último refresh del mercado — para saber cuándo toca regenerar el pool. */
  marketLastRefreshMinute: number;
  /** Minuto del último tick del mercado de contratos (Bloque M M4). */
  contractMarketLastTickMinute: number;
  /** Pivot MRO línea pura (2026-05-24): minuto del último tick de competencia
   *  (ventana de renovación ~30d). Independiente del tick legacy de mercado. */
  lineCompetitionLastTickMinute: number;
  /** Pivot línea pura · Fase B (2026-05-24): minuto del último tick de upgrade tier
   *  (60d). Cuando una aerolínea con contrato activo alcanza rep umbral, se ofrece
   *  upgrade al tier siguiente. */
  tierUpgradeLastTickMinute: number;
  economy: EconomyState;
  reputation: ReputationState;
  notifications: NotificationItem[];
  rng: Rng;
  woRng: Rng;
  machineRng: Rng;
  /** Rng dedicado al mercado laboral (Bloque K). Aislado del `rng` principal para que la
   *  trayectoria determinista del juego (landings, WOs, contratos…) no cambie según el
   *  estado del mercado. */
  marketRng: Rng;
  balance: Balance;
  templates: WorkOrderTemplate[];
  /** Daily check templates (Fase 5A V3) — se emiten cuando un avión pernocta. */
  dailyCheckTemplates: WorkOrderTemplate[];
  /** flag para no regenerar arrivals del mismo día dos veces */
  arrivalsGeneratedUpToDay: number;
  /** game over flag */
  gameOver: { isOver: boolean; reason?: "bankruptcy" | "reputation" | "compliance" };
  notifCounter: number;
  /** Si true, eventos críticos (AOG…) pausan automáticamente el reloj. Default true para UI.
   *  Tests headless (auto_playtest) lo ponen a false para que el loop no se atasque. */
  autoPauseEnabled: boolean;
  /** Tutorial Rookie (2026-05-30): si true, el PRÓXIMO landing genera un callout
   *  garantizado (salta el dado del 70%) y el flag se auto-consume. Lo activa el
   *  tutorial para que el primer aviso caiga sobre un avión real sin espera azarosa.
   *  Runtime, no se serializa. */
  forceCalloutOnNextLanding?: boolean;
  /** Si true (Fase 4 Q1+Q2), mecánicos fuera de su turno son improductivos y se liberan de WOs
   *  activas al cambiar de turno. Default true. Tests legacy lo ponen a false. No se serializa
   *  (es estado de runtime, no de partida — UI lo podría exponer como toggle). */
  shiftGatingEnabled: boolean;
  /** Fase 5A W: si true y hay al menos 1 Lead Foreman idle, el TMA auto-asigna WOs en
   *  casos triviales (1 cert eligible) y hace auto-handoff entre turnos. Default false
   *  (el jugador activa cuando contrata su primer TMA). */
  autoAssignEnabled: boolean;
  /** Pivot iteración 2026-05-25 · Management: políticas operativas configurables desde
   *  la tab Oficina → Management. Permiten al jugador definir "normas de la casa" para
   *  que el sim haga decisiones rutinarias sin micro-management constante. */
  management: {
    /** Auto-asigna mecs Idle elegibles a WOs sin equipo (greedy: primer match). Si false,
     *  el jugador debe asignar manualmente desde el modal. Default true. */
    autoAssignTrivial: boolean;
    /** Política de MEL auto-defer:
     *   - "never": el jugador difiere manualmente desde el modal WO.
     *   - "ifWouldDelay": (RECOMENDADO) compara tiempo estimado de fix con margen al
     *      departure. Si fix > margen → diferir (el avión iba a entrar en retraso de
     *      todos modos). Si fix ≤ margen → intentar fix normal.
     *   - "always": diferir auto cualquier WO diferible apenas se emite. Mantienes el
     *      avión siempre libre, asumes coste MEL pendiente. */
    melAutoDefer: "never" | "ifWouldDelay" | "always";
    /** Si true, cuando no hay mec idle elegible para una WO pero hay uno OffShift con
     *  rating válido, llamarlo automáticamente a hora extra (cuesta ~½ día salario,
     *  moral -5). Default false (decisión económica del jugador). */
    overtimeAutoCall: boolean;
  };
  /** Fase 5A X: etapa actual del MRO (1-4). Default 1. */
  mroStage: MroStage;
  /** Fase 5A X: build en curso (si lo hay). Cuando completionMinute pasa, sube mroStage. */
  activeBuild: ActiveBuild | null;
  /** Fase 5B-δ: historia de KPIs por semana, para dashboard. Push snapshot tras cada
   *  weekly close. Capado a 52 semanas (1 año ingame) para acotar memoria/save. */
  kpiHistory: Array<{
    week: number;
    balance: number;
    repAvg: number;
    woCompleted: number;
    woLate: number;
    woFailed: number;
    complianceScore: number;
    mechanicsCount: number;
  }>;
  /** Fase 5C: eventos aleatorios (runway closure, SB). Acumulados durante la partida. */
  randomEvents: RandomEvent[];
  /** Último día en el que se rolearon eventos (para no rolear varias veces el mismo día). */
  eventsRolledForDay: number;
  /** F5D scope creep: si true, los arrivals se generan desde el snapshot OVD real
   *  (src/assets/airports/ovd.schedule.json) en lugar del generador estocástico.
   *  Default false para no romper save v7 ni tests legacy. */
  useScheduleArrivals?: boolean;
  /** Pivot MRO línea pura (2026-05-24): modo de partida del jugador. Cuando true:
   *   - El cap de oficina mecánicos aplica (hireCandidate respeta MECHANIC_CAP_INITIAL).
   *   - Los plots ghost de hangares están ocultos hasta canUnlockHangars(g)===true.
   *   - El sistema de competencia usa tickLineCompetition (no el legacy tickContractMarket).
   *  Cuando false (default): comportamiento legacy completo (tests, partidas migradas v8). */
  lineModeEnabled: boolean;
  /** Pivot línea pura · KPI departures + TDR. Acumulador desde el inicio de la partida.
   *  Se actualiza en `processDepartures` cuando un avión sale del stand. */
  departureKPI: DepartureKPI;
  /** Pivot línea pura · Fase A modelo HH: acumulador horas-hombre book vs real.
   *  Se actualiza en el wo_completed event handler. KPI ratio eficiencia = book/actual. */
  hoursKPI: HoursKPI;
  /** Pivot línea pura · Fase D subscription HH/sem (2026-05-24): snapshot del
   *  hoursKPI.perAirline[id].bookHoursBilled al último weekly close. Permite que el
   *  próximo weekly close calcule las HH facturadas DELTA esa semana. */
  lastWeeklyHoursSnapshot: Record<string, number>;
  /** Pivot iteración 2026-05-25 — Framework multi-aeropuerto. ICAO del aeropuerto
   *  donde se juega esta partida. Si undefined, partida legacy (asumir LEAS). Al
   *  cargar un save, se usa para volver a cargar el preset correspondiente. */
  airportIcao?: string;
  /** Pivot iteración 2026-05-25 — Performance archive. Aviones Departed y WOs cerradas
   *  más antiguas de 6h sim se mueven aquí desde sus arrays principales (g.airplanes,
   *  g.workOrders) para que el hot path del tick no las itere. Se RETIENEN 90 días sim
   *  como audit trail (Event Tracking "Todos", modal flota historial). Pasados los 90d
   *  se purgan definitivamente. KPIs agregados (departureKPI/hoursKPI/reputation) NO
   *  dependen de esta lista — son contadores que se actualizan al cierre de cada WO/avión.
   *  Inicialmente vacío. */
  archive?: {
    airplanes: Airplane[];
    workOrders: WorkOrderInstance[];
  };
}

export interface CreateGameOptions {
  /** Pivot MRO línea pura (2026-05-24). Default false (compat tests legacy). UI lo pasa true. */
  lineMode?: boolean;
  /** Pivot iteración 2026-05-25 — Framework multi-aeropuerto. Si se pasa, el setup
   *  inicial (balance, mecs, contratos) se deriva del preset en vez de los hardcoded
   *  legacy. Si undefined, comportamiento actual (compat con todos los tests y saves).
   *  Cuando esté completo, el UI siempre pasará un preset al iniciar partida desde la
   *  pantalla de selección de aeropuerto. */
  airportPreset?: import("./types/airport-preset").AirportPreset;
  /** INC3: datos OSM del aeropuerto (el objeto <icao>.paths.json con standMap + parkingPositions +
   *  terminal + bbox). Si se pasa, createGame precomputa standTravelMinutes (viaje variable). */
  airportPaths?: unknown;
}

export function createGame(
  balance: Balance,
  airlines: Airline[],
  templates: WorkOrderTemplate[],
  seed = 42,
  checkDefinitions: CheckDefinition[] = [],
  dailyCheckTemplates: WorkOrderTemplate[] = [],
  opts: CreateGameOptions = {},
): GameState {
  const lineMode = opts.lineMode === true;
  const rng = createRng(seed);
  // Reset de contadores de instance IDs para que partidas con la misma seed sean
  // 100% reproducibles (ALI-* y MC-*).
  resetAirplaneInstanceCounter(0);
  resetMaintenanceCheckCounter(0);
  resetCandidateCounter(0);
  _resetContractCounter(1000);
  // Contratos:
  //  - Pivot iteración 2026-05-25: si hay preset, generar exactos del preset.
  //  - Línea pura legacy: 1 active (Iberia hardcoded).
  //  - Legacy clásico: 1 active + 2 offered.
  const initialContracts = opts.airportPreset?.setup?.initialContracts
    ? generateInitialContractsFromPreset(airlines, opts.airportPreset.setup.initialContracts)
    : lineMode
      ? generateInitialContractsLine(rng, airlines)
      : generateInitialContracts(rng, airlines);
  const activeAirlineIds = new Set(initialContracts.filter((c) => c.status === "active").map((c) => c.airlineId));
  const activeAirlines = airlines.filter((al) => activeAirlineIds.has(al.id));
  // Flota persistente solo para aerolíneas con contrato activo. FH=0 y luego envejece con
  // el marketRng (aislado del rng principal) para no contaminar la trayectoria determinista.
  const baseFleet = generateInitialFleet(rng, activeAirlines);
  const marketRng = createRng(seed + 3);
  const fleet = ageInitialFleet(marketRng, baseFleet);
  const g: GameState = {
    clock: createClock(undefined, 0), // arranca pausado en START_MINUTE (06:00 día 1)
    airlines,
    templates,
    dailyCheckTemplates,
    balance,
    fleet,
    contracts: initialContracts,
    // Pivot iteración 2026-05-25: si hay preset, generar mecs según specs.
    // Sino, comportamiento legacy (linePool si lineMode, sino pool tradicional).
    mechanics: generateInitialMechanics(rng, balance, {
      linePool: lineMode,
      specs: opts.airportPreset?.setup?.initialMechs,
    }),
    airplanes: [],
    workOrders: [],
    maintenanceChecks: [],
    checkDefinitions,
    compliance: createCompliance(rng, 0),
    // Pivot iteración 2026-05-24: en lineMode pre-cargamos 2 candidatos dual-rated
    // B1+B2 con type rating completo A320/A321 × CFM56/V2500. Son "la jugada buena"
    // para que el jugador refuerce el pool inicial (1 solo mec) en los primeros días.
    // Se añaden ENCIMA del refreshMarket normal (que también genera random ~5-8 más).
    candidates: lineMode
      ? [...generateInitialDualCandidates(marketRng, balance, 2), ...refreshMarket(marketRng, [], balance, 0)]
      : refreshMarket(marketRng, [], balance, 0),
    marketLastRefreshMinute: 0,
    contractMarketLastTickMinute: 0,
    lineCompetitionLastTickMinute: 0,
    tierUpgradeLastTickMinute: 0,
    // Pivot iteración 2026-05-25: si hay preset, balance inicial del preset. Sino, legacy.
    economy: createEconomy(opts.airportPreset?.setup?.initialBalance ?? balance.startingBalance),
    // Línea pura: aerolínea contratada arranca a rep 60 (margen para subir/bajar);
    // legacy mantiene todas a startingReputation.
    reputation: (() => {
      const base = createReputation(balance.startingReputation, airlines);
      if (lineMode) {
        for (const id of activeAirlineIds) base.perAirline[id] = 60;
      }
      return base;
    })(),
    notifications: [],
    rng,
    woRng: createRng(seed + 1),
    machineRng: createRng(seed + 2),
    marketRng,
    arrivalsGeneratedUpToDay: 0,
    gameOver: { isOver: false },
    notifCounter: 0,
    autoPauseEnabled: true,
    shiftGatingEnabled: true,
    autoAssignEnabled: false,
    management: {
      autoAssignTrivial: true,
      melAutoDefer: "ifWouldDelay", // pivot 2026-05-25: realista por default
      overtimeAutoCall: false,
    },
    mroStage: 1,
    activeBuild: null,
    kpiHistory: [],
    weeklyWoStats: { completed: 0, late: 0, failed: 0 }, // Fase C: acumulador semanal por eventos
    randomEvents: [],
    eventsRolledForDay: 0,
    // Línea pura: schedule real OVD activo por default. Legacy: arrivals stocásticos.
    useScheduleArrivals: lineMode,
    lineModeEnabled: lineMode,
    departureKPI: createDepartureKPI(),
    hoursKPI: createHoursKPI(),
    lastWeeklyHoursSnapshot: {},
    airportIcao: opts.airportPreset?.icao, // undefined si no se pasó preset (legacy)
    standTravelMinutes: computeStandTravelMinutes(opts.airportPaths as never, balance), // INC3

    archive: { airplanes: [], workOrders: [] }, // perf archive: vacío al inicio
  };
  // Pivot iteración 2026-05-25 — Multi-airport: extender homeBaseAirports de las
  // aerolíneas del game state con las declaradas como `homeBased:true` en el preset.
  // Esto permite que el preset sea la fuente de verdad de "qué aerolíneas tienen base
  // operativa AQUÍ" sin tener que editar airlines.json global cada vez que añadimos un
  // aeropuerto. Ejemplo: BIO preset dice V7.homeBased=true → extendemos
  // V7.homeBaseAirports con ["LEBB"] solo para esta partida.
  const presetIcao = opts.airportPreset?.icao;
  const presetOps = opts.airportPreset?.operators;
  if (presetIcao && presetOps) {
    for (const presetOp of presetOps) {
      if (!presetOp.homeBased) continue;
      const airline = g.airlines.find((a) => a.iataCode === presetOp.iata);
      if (!airline) continue;
      const existing = airline.homeBaseAirports ?? [];
      if (!existing.includes(presetIcao)) {
        airline.homeBaseAirports = [...existing, presetIcao];
      }
    }
  }
  // Pivot iteración 2026-05-25: pre-seed de aviones que pasaron la NOCHE ANTERIOR en
  // stand. Sin esto, el mapa arranca vacío al inicio del Día 1 06:00 — irreal para
  // un aeropuerto regional. Por cada aerolínea contratada con overnight habitual,
  // colocamos un avión "que llegó anoche y sale esta mañana 06:30". Daily check ya
  // completado (lo hizo el turno night ficticio). Visualmente: al abrir el juego ya
  // ves vida en stand y el primer evento es el departure de la mañana.
  if (lineMode) seedPreOvernighters(g);
  return g;
}

/** Pre-seed de aviones que pasaron la noche pasada en stand. Ver comentario en createGame. */
function seedPreOvernighters(g: GameState): void {
  const startMinute = g.clock.minute; // típicamente 360 (06:00)
  const standsAvail = currentLineStandIds(g.mroStage);
  let standIdx = 0;
  for (const c of g.contracts) {
    if (c.status !== "active") continue;
    const al = g.airlines.find((a) => a.id === c.airlineId);
    if (!al?.iataCode) continue;
    // Pivot iteración 2026-05-25: solo aerolíneas con BASE en este aeropuerto pernoctan.
    // El airportIcao se toma del game state (set desde preset.icao en createGame).
    // El homeBaseAirports puede venir del global airlines.json o haber sido extendido
    // por el preset (operators[].homeBased) en createGame.
    const airportIcao = g.airportIcao ?? "LEAS";
    const isBased = (al.homeBaseAirports ?? []).includes(airportIcao);
    if (!isBased) continue;
    // Buscar el último arrival overnight del Día 1 de esta aerolínea (≥19:00) — modela el
    // patrón recurrente: si V73585 vuela todos los días overnight, AYER también lo hizo.
    const flights = getFlightsForGameDay(1);
    const overnighters = flights
      .filter((f) => f.type === "arrival" && f.airlineCode === al.iataCode && f.scheduledMinute >= 19 * 60)
      .sort((a, b) => b.scheduledMinute - a.scheduledMinute); // último primero
    if (overnighters.length === 0) continue;
    const pattern = overnighters[0]; // ej IB3219 @ 21:05
    // Pivot iteración 2026-05-25: la SALIDA del pre-overnighter debe ser el PRIMER departure
    // REAL de la aerolínea hoy (no un valor inventado tipo 06:30). Conceptualmente el
    // avión que pernoctó ayer es el que opera la primera rotación de salida hoy.
    const firstDepartureToday = flights
      .filter((f) => f.type === "departure" && f.airlineCode === al.iataCode)
      .sort((a, b) => a.scheduledMinute - b.scheduledMinute)[0];
    if (!firstDepartureToday) continue; // sin departure, no tiene sentido pre-seedearlo
    // Matrícula: del pool real (bio.fleet.json/ovd.fleet.json) usando el callsign del
    // primer departure como semilla determinista. Si el pool está vacío (poco probable
    // post-saneamiento), fallback a sintética "V7-OVN". Esto reemplaza el placeholder
    // anterior que generaba siempre "V7-OVN" / "IB-OVN" — feedback Dani 2026-05-25:
    // las matrículas sintéticas se veían raras al arrancar BIO.
    const poolStats = pickPoolStatsForCallsign(firstDepartureToday.callsign, al.iataCode);
    const physicalReg = poolStats?.registration ?? `${al.iataCode}-OVN`;
    // Stand libre
    if (standIdx >= standsAvail.length) break; // sin stands libres, no más pre-seeds
    const standId = standsAvail[standIdx++];
    const arrivalMinute = -(DAY_MINUTES - pattern.scheduledMinute); // ej -175 = "ayer 21:05"
    const scheduledDepartureMinute = firstDepartureToday.scheduledMinute; // departure real del schedule
    const instanceId = nextAirplaneInstanceId();
    g.airplanes.push({
      instanceId,
      registration: physicalReg,
      model: pattern.model as "A320" | "A321",
      engineVariant: pattern.engineVariant as "CFM56" | "V2500",
      contractId: c.id,
      standId,
      arrivalMinute,
      scheduledDepartureMinute,
      status: "Idle",
      flightHoursThisLeg: 2.5,
      overnight: true,
      arrivalCallsign: pattern.callsign,
      nextDepartureCallsign: firstDepartureToday.callsign,
    });
    // Asegurar entry en fleet (para que A/C/D y daily lookups funcionen)
    if (!g.fleet.some((f) => f.registration === physicalReg)) {
      g.fleet.push({
        registration: physicalReg,
        airlineId: c.airlineId,
        model: pattern.model as "A320" | "A321",
        engineVariant: pattern.engineVariant as "CFM56" | "V2500",
        totalFH: 12000, totalCycles: 4500,
        fhSinceLastA: 200, cyclesSinceLastA: 80,
        fhSinceLastC: 1200, cyclesSinceLastC: 400,
        fhSinceLastD: 8000, cyclesSinceLastD: 2800,
      });
    }
    // Emit las DC-* del overnight como YA COMPLETADAS (el turno night ficticio las hizo).
    // Visualmente el jugador ve "EC-LUC · Daily check · X/X subtareas ✓" en feed.
    const dcs = rollDailyChecksOnOvernight(g.woRng,
      { instanceId, registration: physicalReg, arrivalMinute, scheduledDepartureMinute,
        model: pattern.model, engineVariant: pattern.engineVariant, contractId: c.id,
        standId, status: "Idle", flightHoursThisLeg: 2.5 } as never,
      g.dailyCheckTemplates, g.balance);
    for (const wo of dcs) {
      g.workOrders.push({ ...wo, phase: "Completed" });
    }
  }
}

/** Fase 5C: rollea eventos aleatorios cuando entramos en un día nuevo. Llamado desde
 *  `ensureArrivals` antes de generar arrivals (los eventos pueden afectar la disponibilidad
 *  de pista). Idempotente vía `eventsRolledForDay`. */
function rollEventsIfNewDay(g: GameState): void {
  const today = Math.floor(g.clock.minute / DAY_MINUTES) + 1;
  while (g.eventsRolledForDay < today) {
    g.eventsRolledForDay += 1;
    const events = rollDailyEvents(g.rng, g.eventsRolledForDay, g.fleet);
    for (const ev of events) {
      g.randomEvents.push(ev);
      if (ev.type === "runway_closure") {
        const startHour = Math.floor((ev.startMinute % DAY_MINUTES) / 60);
        const durationH = Math.floor((ev.endMinute - ev.startMinute) / 60);
        pushNotification(g, `📢 Pista cerrada ${startHour}:00 (${durationH}h): ${ev.reason}`, "warning");
      } else if (ev.type === "service_bulletin") {
        const regs = ev.affectedRegistrations.join(", ");
        pushNotification(g, `📢 Airbus emite SB sobre ${ev.model}/${ev.engineVariant === "any" ? "todos motores" : ev.engineVariant} · afectados: ${regs}`, "info");
      }
    }
  }
}

/** Pivot iteración 2026-05-25 — Performance archive.
 *
 *  Mueve a `g.archive` (que NO se itera en hot paths del tick):
 *   - airplanes Departed cuyo actualDepartureMinute es más antiguo que ARCHIVE_AGE_MIN
 *   - workOrders Completed/Failed/Deferred-expired cuya última actividad es más antigua
 *
 *  Luego purga del archive las entries más antiguas que ARCHIVE_RETENTION_MIN (90 días sim).
 *
 *  Llamado cada N ticks (NO cada tick — el cost es bajo pero acumula). Si se llama solo cuando
 *  el reloj cruza una hora natural (cada 60 min sim), basta.
 *
 *  Idempotente. NO afecta KPIs agregados (departureKPI/hoursKPI/reputation viven aparte).
 *  Las WOs Deferred ACTIVAS (no vencidas, esperando próximo landing) NO se archivan — siguen
 *  vivas en g.workOrders hasta que el avión aterrice y se cierren. */
const ARCHIVE_AGE_MIN = 360;            // 6h sim: tiempo para que un avión Departed deje de ser "recién salido"
const ARCHIVE_RETENTION_MIN = 90 * 24 * 60; // 90 días sim · política Dani 2026-05-25
function archiveStaleEntries(g: GameState): void {
  if (!g.archive) g.archive = { airplanes: [], workOrders: [] };
  const now = g.clock.minute;
  const cutoffArchive = now - ARCHIVE_AGE_MIN;
  const cutoffRetention = now - ARCHIVE_RETENTION_MIN;

  // 1. Mover airplanes Departed antiguos a archive
  const remainingAirplanes: Airplane[] = [];
  for (const a of g.airplanes) {
    const isDepartedOld = a.status === "Departed"
      && a.actualDepartureMinute !== undefined
      && a.actualDepartureMinute < cutoffArchive;
    if (isDepartedOld) {
      g.archive.airplanes.push(a);
    } else {
      remainingAirplanes.push(a);
    }
  }
  if (remainingAirplanes.length !== g.airplanes.length) {
    g.airplanes = remainingAirplanes;
  }

  // 2. Mover workOrders cerradas antiguas a archive
  const remainingWos: WorkOrderInstance[] = [];
  for (const w of g.workOrders) {
    const isClosed = w.phase === "Completed" || w.phase === "Failed";
    // Para Deferred: solo archivar si EXPIRÓ (deferralExpiryMinute pasó) — las vivas siguen siendo activas
    const isExpiredDefer = w.phase === "Deferred"
      && w.deferralExpiryMinute !== undefined
      && w.deferralExpiryMinute < cutoffArchive;
    if ((isClosed || isExpiredDefer) && (w.completionMinute ?? w.deferralExpiryMinute ?? 0) < cutoffArchive) {
      g.archive.workOrders.push(w);
    } else {
      remainingWos.push(w);
    }
  }
  if (remainingWos.length !== g.workOrders.length) {
    g.workOrders = remainingWos;
  }

  // 3. Purga archive más antiguo que retention (90d)
  g.archive.airplanes = g.archive.airplanes.filter(a =>
    (a.actualDepartureMinute ?? a.arrivalMinute) >= cutoffRetention
  );
  g.archive.workOrders = g.archive.workOrders.filter(w =>
    (w.completionMinute ?? w.deferralExpiryMinute ?? w.emissionMinute) >= cutoffRetention
  );
}

/** Pivot iteración 2026-05-25: re-attach de MEL deferreds entre landings de la misma
 *  matrícula. Una WO Deferred apunta al `airplaneInstanceId` del landing donde se diferió,
 *  pero cuando el avión despega (Departed) ese instanceId queda "huérfano" — el defecto
 *  físico sigue en la matrícula. Coherente con MEL real: el defecto pertenece al avión,
 *  no al vuelo.
 *
 *  Esta función hace un SWEEP de todas las deferreds: si su `airplaneInstanceId` actual
 *  apunta a un avión que YA NO está presente (Departed o no existe), busca el próximo
 *  landing FUTURO de la misma matrícula y reasigna. Si no hay landing futuro inmediato,
 *  la deferral se queda apuntando al viejo (vivirá hasta que aterrice otro o expire).
 *  Idempotente. Se llama en cada tick (después de processDepartures y ensureArrivals)
 *  para cubrir el caso en que ambos landings se pre-generaron antes del defer. */
function reattachDeferralsToActiveLandings(g: GameState): void {
  const now = g.clock.minute;
  for (let i = 0; i < g.workOrders.length; i++) {
    const w = g.workOrders[i];
    if (w.phase !== "Deferred") continue;
    const currentLanding = g.airplanes.find((a) => a.instanceId === w.airplaneInstanceId);
    // Si el landing actual sigue presente (no Departed), nada que hacer.
    if (currentLanding && currentLanding.status !== "Departed") continue;
    // Buscar próximo landing de la misma matrícula que sea PRESENTE o FUTURO y NO Departed.
    const candidates = g.airplanes
      .filter((a) => a.registration === w.airplaneRegistration &&
        a.instanceId !== w.airplaneInstanceId &&
        a.status !== "Departed" &&
        (a.actualDepartureMinute === undefined || a.actualDepartureMinute > now))
      .sort((a, b) => a.arrivalMinute - b.arrivalMinute);
    if (candidates.length === 0) continue; // no hay próximo, sigue colgada del viejo
    const next = candidates[0];
    g.workOrders[i] = { ...w, airplaneInstanceId: next.instanceId };
  }
}

/** Genera arrivals de los próximos N días si aún no se generaron. */
function ensureArrivals(g: GameState, daysAhead = 3): void {
  rollEventsIfNewDay(g);
  const today = Math.floor(g.clock.minute / DAY_MINUTES) + 1;
  const targetDay = today + daysAhead;
  // Matrículas en base check (Scheduled o InProgress): no pueden ser pickeadas para landings
  // de línea. Una matrícula entra en check al cruzar umbral; mientras esté Scheduled no debería
  // generar landings nuevos (el "ferrying al MRO" se abstrae como "deja de volar"). InProgress
  // ocupa físicamente BaseStand H1-B1 los `parkingDays`.
  const inCheck = new Set<string>(
    g.maintenanceChecks
      .filter((c) => c.phase === "Scheduled" || c.phase === "InProgress")
      .map((c) => c.registration),
  );
  for (let d = g.arrivalsGeneratedUpToDay + 1; d <= targetDay; d++) {
    const dayStart = (d - 1) * DAY_MINUTES;
    const dayEnd = d * DAY_MINUTES;
    const busyToday = new Set<string>(
      g.airplanes
        .filter((a) => a.arrivalMinute < dayEnd && a.scheduledDepartureMinute > dayStart)
        .map((a) => a.registration),
    );
    for (const reg of inCheck) busyToday.add(reg);

    // F5D scope creep: si useScheduleArrivals está activo, generamos desde el snapshot
    // OVD. Pivot MRO línea pura: pasamos `airlines` para mapear por iataCode (los vuelos
    // VY/V7/U2 se descartan si no hay contrato firmado con esa aerolínea).
    if (g.useScheduleArrivals) {
      const { arrivals, updatedFleet } = generateScheduledArrivals(d, g.contracts, g.fleet, busyToday, g.airlines);
      g.fleet = updatedFleet;
      const checkOccupied = new Set(
        g.maintenanceChecks.filter((c) => c.phase === "InProgress" && c.onPlatform).map((c) => c.standId),
      );
      const availableLineStands = currentLineStandIds(g.mroStage).filter((s) => !checkOccupied.has(s));
      for (const arr of arrivals) {
        if (runwayClosedAt(g.randomEvents, arr.arrivalMinute)) continue;
        const stand = assignStand(arr, g.airplanes, availableLineStands);
        g.airplanes.push({ ...arr, standId: stand });
        busyToday.add(arr.registration);
      }
    } else {
      for (const c of activeContracts(g.contracts)) {
        const al = g.airlines.find((a) => a.id === c.airlineId);
        if (!al) continue;
        const { arrivals, updatedFleet } = generateDailyArrivals(g.rng, c, al, g.balance, d, g.fleet, busyToday);
        g.fleet = updatedFleet;
        for (const arr of arrivals) {
          if (runwayClosedAt(g.randomEvents, arr.arrivalMinute)) continue;
          const checkOccupied = new Set(
            g.maintenanceChecks.filter((c) => c.phase === "InProgress" && c.onPlatform).map((c) => c.standId),
          );
          const availableLineStands = currentLineStandIds(g.mroStage).filter((s) => !checkOccupied.has(s));
          const stand = assignStand(arr, g.airplanes, availableLineStands);
          g.airplanes.push({ ...arr, standId: stand });
          busyToday.add(arr.registration);
        }
      }
    }
    g.arrivalsGeneratedUpToDay = d;
  }
  // Tras generar los arrivals del horizon, comprobar si alguna matrícula cruzó umbral de check.
  // Cada día puede disparar 0..N checks scheduled. La fase real (ejecución, billing) llega en H6.
  if (g.checkDefinitions.length > 0) {
    // H9: avisos anticipados (≤ CHECK_WARNING_FH_MARGIN FH del trigger). Una vez por ventana
    // — flag warned{Type} en el FleetAircraft evita spam; se baja al completar el check.
    const upcoming = detectChecksUpcoming(g.fleet, g.checkDefinitions, g.maintenanceChecks);
    for (const u of upcoming) {
      const fa = g.fleet.find((f) => f.registration === u.registration);
      const alreadyWarned =
        u.type === "A" ? fa?.warnedA : u.type === "C" ? fa?.warnedC : fa?.warnedD;
      if (alreadyWarned) continue;
      g.fleet = setFleetWarnedFlag(g.fleet, u.registration, u.type, true);
      pushNotification(
        g,
        `⚠️ ${u.registration} vence ${u.type}-check en ${Math.ceil(u.remainingFH)} FH`,
        "warning",
      );
    }
    // Detección + schedule de checks ya debidos.
    const { checks, newlyScheduled } = scheduleDueChecks(
      g.fleet,
      g.checkDefinitions,
      g.maintenanceChecks,
      g.clock.minute,
    );
    g.maintenanceChecks = checks;
    for (const nc of newlyScheduled) {
      pushNotification(g, `🛠️ ${nc.registration} programado para ${nc.type}-check`, "warning");
    }
  }
}

/**
 * Pivot MRO línea pura · Para cada avión cuyo scheduledDepartureMinute ya pasó:
 *  - Si NO tiene WOs activas → marca Departed, computa delayMinutes, registra KPI.
 *    Si delay > 0 → notif info. Si delay ≥ AOG_DELAY_THRESHOLD_MIN (3h) → escalada
 *    AOG: penalty AOG_ESCALATION_PENALTY_EUR + rep delta aogFailed.
 *  - Si SÍ tiene WOs activas → sigue en stand (delay acumula hasta que cierren).
 */
/** Pivot Fase 2 (2026-05-24): determina causa raíz del delay post-hoc.
 *  Heurística sin instrumentar el state machine:
 *   - Si runway estaba cerrado durante el slot scheduledDeparture → external_event (no evitable)
 *   - Si las WOs cerradas del avión incluyen AOG-template → aog_inevitable (no evitable)
 *   - Default → mec_busy (evitable, falta de capacidad)
 */
function inferDelayRootCause(g: GameState, a: Airplane, nowMinute: number): DelayRootCause {
  // runway closure activa durante la ventana de scheduledDeparture
  if (runwayClosedAt(g.randomEvents, a.scheduledDepartureMinute) || runwayClosedAt(g.randomEvents, nowMinute)) {
    return "external_event";
  }
  // WOs sobre este avión que sean template-AOG
  const wosOnAp = g.workOrders.filter((w) => w.airplaneInstanceId === a.instanceId);
  for (const w of wosOnAp) {
    const tpl = g.templates.find((t) => t.id === w.templateId);
    if (tpl?.isAOG) return "aog_inevitable";
  }
  return "mec_busy"; // default — el delay es por falta de capacidad operativa
}

function processDepartures(g: GameState, nowMinute: number): void {
  for (const a of g.airplanes) {
    if (a.status === "Departed") continue;
    if (nowMinute < a.scheduledDepartureMinute) continue;
    // WOs que bloquean salida: cualquiera no cerrada (Completed/Failed/Deferred no bloquean —
    // las diferidas tienen su propio ciclo de vida MEL, el avión puede salir).
    const blocking = g.workOrders.filter(
      (w) =>
        w.airplaneInstanceId === a.instanceId &&
        w.phase !== "Completed" &&
        w.phase !== "Failed" &&
        w.phase !== "Deferred",
    );
    // Pivot línea pura · iteración 2026-05-24: AOG escalation EN VIVO mientras el avión
    // está bloqueado. Si el delay current ya supera el threshold y aún no se ha marcado
    // aogEscalated, marcarlo + cobrar penalty UNA VEZ (no esperar al departure final).
    // Cuando finalmente despegue, processDepartures ya verá aogEscalated=true y no doblará.
    if (blocking.length > 0) {
      const currentDelay = nowMinute - a.scheduledDepartureMinute;
      if (currentDelay >= AOG_DELAY_THRESHOLD_MIN && !a.aogEscalated) {
        a.aogEscalated = true;
        a.aogEscalatedAtMinute = nowMinute;
        const rootCause = inferDelayRootCause(g, a, nowMinute);
        const evitable = isDelayCauseEvitable(rootCause);
        const penaltyMult = evitable ? AOG_EVITABLE_PENALTY_MULT : 1.0;
        const repMult = evitable ? AOG_EVITABLE_REP_MULT : 1.0;
        const penaltyAmount = Math.round(AOG_ESCALATION_PENALTY_EUR * penaltyMult);
        const evitableTag = evitable ? "EVITABLE" : "no evitable";
        const rootCauseLabel = rootCause === "mec_busy" ? "mec ocupado"
          : rootCause === "external_event" ? "evento externo"
          : rootCause === "aog_inevitable" ? "AOG técnico"
          : rootCause ?? "—";
        const c = g.contracts.find((cc) => cc.id === a.contractId);
        pushNotification(
          g,
          `🛑 AOG ${evitableTag} EN CURSO: ${a.registration} +${currentDelay}m (>3h, sigue bloqueado · ${rootCauseLabel})`,
          "danger",
        );
        g.economy = addTransaction(
          g.economy,
          createTransaction("penalty", -penaltyAmount, nowMinute, `AOG en curso ${a.registration} (delay ${currentDelay}m · ${rootCauseLabel})`),
        );
        if (c) g.reputation = applyDelta(g.reputation, c.airlineId, Math.round(g.balance.reputation.aogFailed * repMult));
      }
      continue;
    }

    // Marcar Departed con timing real
    const delay = Math.max(0, nowMinute - a.scheduledDepartureMinute);
    a.actualDepartureMinute = nowMinute;
    a.delayMinutes = delay;
    a.status = "Departed";
    if (delay >= AOG_DELAY_THRESHOLD_MIN) a.aogEscalated = true;

    // Pivot Fase 2: determinar causa raíz si hay delay
    const rootCause: DelayRootCause | undefined = delay > 0 ? inferDelayRootCause(g, a, nowMinute) : undefined;
    const evitable = a.aogEscalated && isDelayCauseEvitable(rootCause);

    // TDR = Technical Dispatch Reliability (refactor 2026-05-31). Un departure es FALLO
    // TÉCNICO solo si el retraso es IMPUTABLE (causa raíz evitable: mec_busy/offshift/
    // no_rated_cert/other) Y ≥15 min. Retraso por causa externa, o <15 min, o avión sin
    // avería → DISPATCH FIABLE (no penaliza el TDR). "Si no intervenimos, no nos cuenta".
    const imputable = delay > 0 && isDelayCauseEvitable(rootCause);
    const impDelay = imputable ? delay : 0;            // minutos que SÍ cuentan contra ti
    const techFail = impDelay >= DISPATCH_COTA_15;     // fallo de dispatch (cota principal D-15)
    const techFail60 = impDelay >= DISPATCH_COTA_60;   // fallo serio (D-60)

    // KPI acumulador (global + por aerolínea)
    const kpi = g.departureKPI;
    kpi.totalDepartures += 1;
    kpi.sumDelayMinutes += impDelay;
    if (techFail) { kpi.totalTechFail15 += 1; if (techFail60) kpi.totalTechFail60 += 1; }
    else kpi.totalReliable += 1;
    if (a.aogEscalated) {
      kpi.totalAog += 1;
      if (evitable) kpi.totalAogEvitable += 1;
    }
    // Legacy mirror (compat UI/saves viejos)
    if (delay === 0) kpi.totalOnTime += 1; else kpi.totalLate += 1;
    const c = g.contracts.find((cc) => cc.id === a.contractId);
    if (c) {
      let b = kpi.perAirline[c.airlineId];
      if (!b) {
        b = createAirlineBucket();
        kpi.perAirline[c.airlineId] = b;
      }
      b.departures += 1;
      b.sumDelayMinutes += impDelay;
      if (techFail) { b.techFail15 += 1; if (techFail60) b.techFail60 += 1; }
      else b.reliable += 1;
      if (a.aogEscalated) {
        b.aog += 1;
        if (evitable) b.aogEvitable += 1;
      }
      if (delay === 0) b.onTime += 1; else b.late += 1;
    }

    // Notifs + AOG escalation. Si ya estaba aogEscalated EN VIVO antes del departure
    // (aogEscalatedAtMinute set), NO doblar el penalty — ya se cobró al cruzar threshold.
    const wasAlreadyEscalated = a.aogEscalatedAtMinute !== undefined;
    if (a.aogEscalated && !wasAlreadyEscalated) {
      const penaltyMult = evitable ? AOG_EVITABLE_PENALTY_MULT : 1.0;
      const repMult = evitable ? AOG_EVITABLE_REP_MULT : 1.0;
      const penaltyAmount = Math.round(AOG_ESCALATION_PENALTY_EUR * penaltyMult);
      const evitableTag = evitable ? "EVITABLE" : "no evitable";
      const rootCauseLabel = rootCause === "mec_busy" ? "mec ocupado"
        : rootCause === "external_event" ? "evento externo"
        : rootCause === "aog_inevitable" ? "AOG técnico"
        : rootCause ?? "—";
      pushNotification(
        g,
        `🛑 AOG ${evitableTag}: ${a.registration} +${delay}m (>3h · ${rootCauseLabel})`,
        "danger",
      );
      g.economy = addTransaction(
        g.economy,
        createTransaction("penalty", -penaltyAmount, nowMinute, `AOG ${evitableTag} ${a.registration} (delay ${delay}m · ${rootCauseLabel})`),
      );
      if (c) g.reputation = applyDelta(g.reputation, c.airlineId, Math.round(g.balance.reputation.aogFailed * repMult));
    } else if (a.aogEscalated && wasAlreadyEscalated) {
      pushNotification(g, `✈️ ${a.registration} finalmente sale tras AOG (+${delay}m total)`, "warning");
    } else if (delay > 0) {
      pushNotification(g, `✈️ ${a.registration} salió con ${delay}m de retraso`, "warning");
    }
  }
}

// ---- Pivot línea pura · Fase C (2026-05-24): findings en daily check ----

/** Probabilidad de generar un finding al completar una daily check subtask. ~15% real
 *  para daily; tunable según playtest. */
export const DAILY_FINDING_PROB = 0.15;
/** ID counter para WOs finding (FND-XXXXXX). */
let _findingCounter = 0;
function nextFindingId(): string {
  _findingCounter += 1;
  return `FND-${_findingCounter.toString().padStart(6, "0")}`;
}

/** Roll de finding al completar daily check. Si dice sí, elige un template plausible
 *  (severity Minor o Major, no AOG) compatible con el modelo del avión y crea una
 *  nueva WO con `parentWoInstanceId` apuntando a la daily. */
function tryRollDailyFinding(g: GameState, parentWo: WorkOrderInstance, ap: Airplane, nowMinute: number): void {
  if (g.woRng.next() > DAILY_FINDING_PROB) return;
  // Elegibles: severity Minor/Major, NO AOG, compatibles con modelo + variant del avión
  const eligible = g.templates.filter(
    (t) =>
      !t.isAOG &&
      (t.severity === "Minor" || t.severity === "Major") &&
      t.aircraftModelsCompatibles.includes(ap.model) &&
      t.engineVariantsCompatibles.includes(ap.engineVariant),
  );
  if (eligible.length === 0) return;
  const tpl = eligible[Math.floor(g.woRng.next() * eligible.length)];
  // Pivot iteración 2026-05-25: finding también respeta SLA = scheduledDeparture del
  // avión. Si el finding se hace antes del próximo departure → on-time; si se queda
  // colgado y bloquea el avión → late. Coherente con createWorkOrderInstance.
  const slaMinute = ap.scheduledDepartureMinute > 0
    ? ap.scheduledDepartureMinute
    : nowMinute + Math.round(tpl.durationMinutes * g.balance.slaMultiplier);
  const finding: WorkOrderInstance = {
    instanceId: nextFindingId(),
    templateId: tpl.id,
    airplaneRegistration: ap.registration,
    airplaneInstanceId: ap.instanceId,
    emissionMinute: nowMinute,
    assignedMechanicIds: [],
    phase: "ToPlane",
    phaseElapsedMinutes: 0,
    slaMinute,
    parentWoInstanceId: parentWo.instanceId,
  };
  g.workOrders.push(finding);
  pushNotification(
    g,
    `🔍 Finding en ${ap.registration}: ${tpl.description.slice(0, 55)} (ATA ${tpl.ata}, book ${(tpl.durationMinutes/60).toFixed(1)}h)`,
    "warning",
  );
}

function pushNotification(g: GameState, text: string, type: NotificationItem["type"] = "info"): void {
  g.notifCounter += 1;
  g.notifications.push({ id: g.notifCounter, minute: g.clock.minute, text, type });
  // Mantener solo las últimas 12
  if (g.notifications.length > 12) g.notifications = g.notifications.slice(-12);
}

/**
 * Avanza el sim un paso de N minutos. Muta el state in-place para eficiencia.
 * Devuelve el state mismo para encadenar/reactivar.
 */
export function advanceGame(g: GameState, stepMinutes: number): GameState {
  if (g.gameOver.isOver) return g;
  if (g.clock.speed === 0) return g; // paused

  // Asegurar que tenemos arrivals planificados
  ensureArrivals(g, 3);

  const now = g.clock.minute;
  const next = now + stepMinutes;

  // 1. Detectar aviones que aterrizan en [now, next]
  let pauseRequested = false;
  for (const p of g.airplanes) {
    if (p.arrivalMinute > now && p.arrivalMinute <= next) {
      // Tutorial Rookie: si el flag está activo, el próximo landing genera callout
      // garantizado (sobre un avión real contratado — los únicos en g.airplanes).
      const forceCallout = g.forceCalloutOnNextLanding === true;
      const wo = rollWoOnLanding(g.woRng, p, g.templates, g.balance, forceCallout);
      if (wo) {
        if (forceCallout) g.forceCalloutOnNextLanding = false; // consumir el flag una sola vez
        g.workOrders.push(wo);
        const tpl = g.templates.find((t) => t.id === wo.templateId);
        pushNotification(
          g,
          `${p.registration}: ${tpl?.description.slice(0, 60) ?? "WO"}${tpl?.isAOG ? " (AOG)" : ""}`,
          tpl?.isAOG ? "danger" : "info",
        );
        // Auto-pausa en eventos que requieren atención inmediata:
        //  - AOG: avión grounded por fallo crítico, penalty x5, no diferible.
        //  - Critical: tiempo crítico, jugador debe ver y decidir asignación.
        if (tpl?.isAOG || tpl?.severity === "Critical") pauseRequested = true;
      }
      // Fase 5A V4: si el avión pernocta, emitir 2-4 daily checks automáticos.
      if (p.overnight && g.dailyCheckTemplates.length > 0) {
        const dcs = rollDailyChecksOnOvernight(g.woRng, p, g.dailyCheckTemplates, g.balance);
        for (const dc of dcs) g.workOrders.push(dc);
        if (dcs.length > 0) {
          pushNotification(g, `🌙 ${p.registration} pernocta · ${dcs.length} daily checks emitidos`, "info");
        }
      }
    }
  }
  if (pauseRequested && g.autoPauseEnabled && g.clock.speed > 0) {
    g.clock = { ...g.clock, speed: 0 };
    pushNotification(g, "⏸️ Pausa automática (evento crítico) — necesita decisión", "danger");
  }

  // 1b. Shift transitions (Fase 4 Q2/Q3): mecánicos Idle↔OffShift según turno; los que están
  //     Working/ToPlane fuera de shift liberan la WO (queda pending re-asignación).
  //     Skip mecánicos en check (assignedCheckInstanceId != null) — checks son trabajo abstracto multi-día.
  if (g.shiftGatingEnabled) {
    const sres = tickShiftTransitions(g.mechanics, g.workOrders, next);
    g.mechanics = sres.mechanics;
    g.workOrders = sres.workOrders;

    // Fase 5A W4: si hay Lead Foreman idle + autoAssignEnabled, intentar handoff antes de
    // pausar. Cuando un certifier sale de shift, busca otro on-shift con rating válido.
    const tryHandoff = g.autoAssignEnabled && hasActiveLead(g.mechanics);
    let handoffCount = 0;
    let pausedCount = 0;
    const pausedRegs: string[] = [];
    for (const ev of sres.events) {
      if (ev.type !== "wo_paused_no_certifier") continue;
      let handed = false;
      if (tryHandoff) {
        const replacement = findHandoffReplacement(
          ev.woInstanceId, g.workOrders, g.mechanics, g.templates, g.airplanes, next, "",
        );
        if (replacement) {
          const r = assignMechanicsToWo(g.mechanics, g.workOrders, ev.woInstanceId, replacement.id, [], g.balance, next, g.standTravelMinutes ?? {});
          if (!r.error) {
            g.mechanics = r.mechanics;
            g.workOrders = r.workOrders;
            handoffCount++;
            handed = true;
          }
        }
      }
      if (!handed) {
        pausedCount++;
        if (pausedRegs.length < 3) pausedRegs.push(ev.airplaneRegistration);
      }
    }
    if (handoffCount > 0) {
      pushNotification(g, `🔁 TMA: ${handoffCount} WO${handoffCount > 1 ? "s" : ""} reasignada${handoffCount > 1 ? "s" : ""} (handoff entre turnos)`, "info");
    }
    if (pausedCount > 0) {
      const head = pausedRegs.join(", ");
      const tail = pausedCount > pausedRegs.length ? ` y ${pausedCount - pausedRegs.length} más` : "";
      pushNotification(g, `🕐 ${pausedCount} WO${pausedCount > 1 ? "s" : ""} pausada${pausedCount > 1 ? "s" : ""} (cambio de turno): ${head}${tail}`, "warning");
    }
  }

  // 2. Auto-asignar WOs sin asignar (greedy: primer certifier eligible). El jugador podrá
  // reasignar manualmente desde el modal.
  // Pivot línea pura · iteración 2026-05-24: buscar template también en
  // dailyCheckTemplates — antes los DC-* (subtareas de daily) no se auto-asignaban
  // porque el find solo miraba en templates.
  // Pivot iteración 2026-05-25 · Management: condicionado a `g.management.autoAssignTrivial`
  // (default true). Si false, el jugador asigna manualmente desde el modal WO. Si true Y
  // overtimeAutoCall, también llama a OffShift como hora extra cuando no hay Idle elegible.
  const mgmt = g.management;
  if (mgmt.autoAssignTrivial) {
    for (const wo of g.workOrders) {
      if (wo.assignedMechanicIds.length > 0 || wo.phase !== "ToPlane") continue;
      const tpl = g.templates.find((t) => t.id === wo.templateId)
        || g.dailyCheckTemplates.find((t) => t.id === wo.templateId);
      const ap = g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
      if (!tpl || !ap) continue;
      const certs = eligibleCertifiers(g.mechanics, tpl, ap.model, ap.engineVariant);
      if (certs.length > 0) {
        const res = assignMechanicsToWo(g.mechanics, g.workOrders, wo.instanceId, certs[0].id, [], g.balance, next, g.standTravelMinutes ?? {});
        if (!res.error) {
          g.mechanics = res.mechanics;
          g.workOrders = res.workOrders;
        }
        continue;
      }
      // Pivot iteración 2026-05-25: overtime auto-call. Si no hay Idle elegible pero hay
      // un OffShift con rating válido → llamarlo a hora extra (cuesta ~½ día salario al
      // terminar + moral -5). Solo si el management lo permite.
      if (mgmt.overtimeAutoCall) {
        const offshiftCert = g.mechanics.find((m) =>
          m.state === "OffShift" && !m.isLeadForeman &&
          m.typeRatings.some((r) => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === tpl.requiredCategory),
        );
        if (offshiftCert) {
          // Convertir a Idle temporal con overtimeOriginalShift set → al volver a Idle
          // tras Returning, cobra overtime y restaura turno.
          for (let i = 0; i < g.mechanics.length; i++) {
            if (g.mechanics[i].id === offshiftCert.id) {
              g.mechanics[i] = {
                ...g.mechanics[i],
                state: "Idle" as const,
                overtimeOriginalShift: g.mechanics[i].shift,
                moral: Math.max(0, (g.mechanics[i].moral ?? 70) - 5),
              };
              break;
            }
          }
          pushNotification(g, `⏱️ ${offshiftCert.name} llamado a hora extra para ${wo.airplaneRegistration}`, "warning");
          const res2 = assignMechanicsToWo(g.mechanics, g.workOrders, wo.instanceId, offshiftCert.id, [], g.balance, next, g.standTravelMinutes ?? {});
          if (!res2.error) {
            g.mechanics = res2.mechanics;
            g.workOrders = res2.workOrders;
          }
        }
      }
    }
  }

  // 2b. Pivot iteración 2026-05-25 · MEL auto-defer policy.
  //   - "never": jugador difiere manual.
  //   - "ifWouldDelay" (default): compara tiempo de fix estimado vs margen al departure.
  //      Si el fix no cabe antes del departure → diferir (el avión iba a retrasar igual).
  //      Si cabe → no diferir, dejar que auto-assign lo coja. Modela decisión racional
  //      del MRO: "si voy a quedar tarde, mejor liberar el avión y reparar al volver".
  //   - "always": cualquier WO diferible se difiere en cuanto se emite. Agresivo.
  // Nota: deferWoManually requiere B1 idle con rating para firmar el MEL. Si no hay,
  // la WO se queda esperando (la política intenta el defer pero res.ok será false).
  if (mgmt.melAutoDefer !== "never") {
    for (const wo of g.workOrders) {
      if (wo.phase !== "ToPlane" || wo.assignedMechanicIds.length > 0) continue;
      const tpl = g.templates.find((t) => t.id === wo.templateId);
      if (!tpl) continue; // daily checks no se difieren auto
      if (tpl.isAOG || tpl.severity === "Critical") continue;
      if (!tpl.deferrable && tpl.melCategory == null) continue;
      const ap = g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
      if (!ap) continue;

      if (mgmt.melAutoDefer === "ifWouldDelay") {
        // Estimar tiempo de fix: usar durationMinutes del template como referencia
        // (asume team óptimo eficiencia ~1.0). Margen = scheduledDeparture - now.
        // Si fix >= margen: el avión iba a salir tarde de todas formas → mejor diferir.
        const timeToDeparture = ap.scheduledDepartureMinute - g.clock.minute;
        const estimatedFixMin = tpl.durationMinutes;
        // Margen de seguridad: 10 min para travel+inspection inicial.
        if (estimatedFixMin + 10 <= timeToDeparture) continue; // hay margen, no diferir
      }
      // (en "always" siempre intentamos diferir)
      const res = deferWoManually(g, wo.instanceId);
      if (res.ok) {
        const policyLabel = mgmt.melAutoDefer === "ifWouldDelay"
          ? "evitar retraso"
          : "política agresiva";
        pushNotification(g, `🤖 MEL auto-firmado · ${wo.airplaneRegistration} liberado (${policyLabel})`, "info");
      }
    }
  }

  // 3. Tick travel
  const travelRes = tickMechanicTravel(g.mechanics, g.workOrders, stepMinutes, next);
  g.mechanics = travelRes.mechanics;
  g.workOrders = travelRes.workOrders;

  // 3b. F5C pulido: mecs que volvieron a Idle CON `overtimeOriginalShift` set → cobrar
  // overtime y restaurar turno original. El cobro es ~1/14 del salario semanal (medio día
  // × 1.5×, modela las horas trabajadas fuera de turno con prima de hora extra).
  for (let i = 0; i < g.mechanics.length; i++) {
    const m = g.mechanics[i];
    if (m.state === "Idle" && m.overtimeOriginalShift !== undefined) {
      const overtimePay = Math.round(m.weeklySalary / 14);
      g.economy = addTransaction(
        g.economy,
        createTransaction("salary", -overtimePay, g.clock.minute, `Hora extra ${m.name} (${m.id})`),
      );
      const originalShift = m.overtimeOriginalShift;
      g.mechanics[i] = { ...m, shift: originalShift, overtimeOriginalShift: undefined };
      pushNotification(g, `⏱️ ${m.name} vuelve a turno ${originalShift} · -${overtimePay.toLocaleString()} € overtime`, "info");
    }
  }

  // 4. Tick state machine. `nowMinute = next` activa el filtro de shift en teamEffectiveEfficiency
  //    cuando shiftGatingEnabled; pasamos -1 para deshabilitarlo (tests legacy).
  // Pivot línea pura · iteración 2026-05-24 fix: las DC-* (subtareas daily) viven en
  // `dailyCheckTemplates`, no en `templates`. Si solo pasamos `g.templates`, tickWorkOrders
  // no encuentra el template, retorna undefined y la WO se queda sin progresar (mec asignado
  // pero progress congelado). Concatenar ambos catálogos para que las DC-* avancen igual.
  const allTemplates = g.dailyCheckTemplates.length > 0
    ? [...g.templates, ...g.dailyCheckTemplates]
    : g.templates;
  const machineRes = tickWorkOrders(
    g.workOrders, g.mechanics, allTemplates, g.balance, stepMinutes, g.machineRng,
    g.shiftGatingEnabled ? next : -1,
    next, // v2: stampClock SIEMPRE = reloj real → los timestamps de cronología se sellan siempre
  );
  g.mechanics = machineRes.mechanics;
  g.workOrders = machineRes.workOrders;

  // 5. Aplicar eventos del state machine
  for (const ev of machineRes.events) {
    if (ev.type === "wo_completed") {
      // Fase C: KPI semanal por EVENTOS (misma fuente que el revenue). late ⊆ completed.
      g.weeklyWoStats.completed += 1;
      if (!ev.onTime) g.weeklyWoStats.late += 1;
      const wo = g.workOrders.find((w) => w.instanceId === ev.woInstanceId);
      // Pivot iteración 2026-05-24: el template puede vivir en `templates` (callouts/AOG)
      // o `dailyCheckTemplates` (DC-* subtareas). Antes solo se buscaba en templates → las
      // DC-* nunca se cobraban ni registraban HH (bug silencioso).
      const tpl = g.templates.find((t) => t.id === ev.templateId)
        || g.dailyCheckTemplates.find((t) => t.id === ev.templateId);
      const ap = wo ? g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId) : undefined;
      const c = ap ? g.contracts.find((cc) => cc.id === ap.contractId) : undefined;
      if (wo && tpl && c) {
        const txs = payForCompletedWo(tpl, wo, c, g.balance, ev.onTime, next);
        for (const tx of txs) g.economy = addTransaction(g.economy, tx);
        // Pivot línea pura · Fase A: registrar HH-book facturadas + HH-actual reales
        recordWoCompletionInHoursKPI(
          g.hoursKPI,
          c.airlineId,
          bookHoursForTemplate(tpl),
          actualHoursForCompletedWo(wo.emissionMinute, next),
        );
        // Pivot línea pura · Fase C: si era una daily check subtask, rollear finding
        // con probabilidad DAILY_FINDING_PROB. El finding es una sub-WO normal (no DC-*)
        // que se añade a g.workOrders — aparecerá como callout en Event Tracking.
        if (tpl.id.startsWith("DC-") && wo && ap) {
          tryRollDailyFinding(g, wo, ap, next);
        }
        // Pivot iteración 2026-05-24: chaining de daily check subtareas. El mec hace TODAS
        // las DC-* del mismo avión EN UN VIAJE — no vuelve a la oficina entre subtareas.
        // Al completar una DC-*, si hay otra DC-* unassigned sobre el mismo avión y el cert
        // sigue presente, encadenar con stateRemainingMinutes=0 (skip Travel).
        if (tpl.id.startsWith("DC-") && wo && ap && wo.assignedMechanicIds.length > 0) {
          const nextDc = g.workOrders.find((w2) =>
            w2.airplaneInstanceId === wo.airplaneInstanceId &&
            w2.templateId.startsWith("DC-") &&
            w2.assignedMechanicIds.length === 0 &&
            w2.phase === "ToPlane",
          );
          if (nextDc) {
            const certId = wo.assignedMechanicIds[0];
            const cert = g.mechanics.find((m) => m.id === certId);
            if (cert) {
              // Forzar mec a Idle (cancelar Returning que el state machine acaba de iniciar),
              // luego asignar la siguiente DC-* con stateRemainingMinutes=0 (ya en stand).
              g.mechanics = g.mechanics.map((m) =>
                m.id === certId
                  ? { ...m, state: "Idle" as const, assignedWoInstanceId: null, assignedCheckInstanceId: null, stateRemainingMinutes: 0 }
                  : m,
              );
              const r = assignMechanicsToWo(g.mechanics, g.workOrders, nextDc.instanceId, certId, [], g.balance, next, g.standTravelMinutes ?? {});
              if (!r.error) {
                g.mechanics = r.mechanics;
                g.workOrders = r.workOrders;
                // Saltar Travel — el mec ya está físicamente en el stand
                g.mechanics = g.mechanics.map((m) =>
                  m.id === certId ? { ...m, stateRemainingMinutes: 0 } : m,
                );
              }
            }
          }
        }
      }
      const repDelta = reputationDeltaForWo(g.balance, ev.onTime ? "completedOnTime" : "completedLate");
      // Bloque M: aplica solo a la aerolínea del contrato del avión. Si no hay contrato resoluble,
      // aplica como global (fallback raro — la WO sin contrato es una situación de error).
      if (c) {
        g.reputation = applyDelta(g.reputation, c.airlineId, repDelta);
      } else {
        g.reputation = applyDeltaGlobal(g.reputation, repDelta);
      }
      // Moral del equipo al cerrar la WO (L3). Aplica a los assignedMechanicIds que aún apunten a esta WO.
      const moralDelta = !ev.onTime
        ? MORAL_EVENT_DELTAS.woCompletedLate
        : ev.isAOG
          ? MORAL_EVENT_DELTAS.woCompletedCritical
          : MORAL_EVENT_DELTAS.woCompletedOnTime;
      g.mechanics = g.mechanics.map((m) =>
        m.assignedWoInstanceId === ev.woInstanceId ? applyMoralDelta(m, moralDelta) : m,
      );
      pushNotification(
        g,
        `WO ${ev.woInstanceId} completada${ev.onTime ? " (on-time)" : " (LATE)"}${ev.isAOG ? " · AOG" : ""}`,
        ev.onTime ? "success" : "warning",
      );
    }
  }

  // 5a. Tick MEL deferrals (Bloque I): detecta deferrals vencidas → Failed + penalty.
  {
    const melRes = tickMel(g.workOrders, next);
    g.workOrders = melRes.workOrders;
    for (const ev of melRes.events) {
      // Fase C: KPI semanal — MEL expirada = WO fallida (único camino de fallo real hoy).
      g.weeklyWoStats.failed += 1;
      g.economy = addTransaction(
        g.economy,
        createTransaction(
          "penalty",
          -ev.penaltyEur,
          next,
          `MEL expirada ${ev.woInstanceId} (${ev.airplaneRegistration})`,
        ),
      );
      // Bloque M: la rep negativa se aplica a la aerolínea del avión. Si no la encontramos
      // (avión ya departed), aplica global.
      const expiredWo = g.workOrders.find((w) => w.instanceId === ev.woInstanceId);
      const expiredAp = expiredWo ? g.airplanes.find((a) => a.instanceId === expiredWo.airplaneInstanceId) : undefined;
      const expiredContract = expiredAp ? g.contracts.find((cc) => cc.id === expiredAp.contractId) : undefined;
      if (expiredContract) {
        g.reputation = applyDelta(g.reputation, expiredContract.airlineId, ev.repDelta);
      } else {
        g.reputation = applyDeltaGlobal(g.reputation, ev.repDelta);
      }
      pushNotification(
        g,
        `🚨 MEL expirada ${ev.airplaneRegistration} · -${MEL_EXPIRY_PENALTY_EUR.toLocaleString()} € · -5 rep`,
        "danger",
      );
    }
  }

  // 5b. Tick A/C/D checks (H6): start scheduled, accumulate work, complete + reset counters,
  //     overrun penalties por día. Eventos → notificaciones + economía.
  if (g.checkDefinitions.length > 0) {
    // Fase 5C X5: A-check en plataforma habilitado desde stage 2.
    const platformAllowed = g.mroStage >= 2;
    const mres = tickMaintenanceChecks(
      g.maintenanceChecks, g.mechanics, g.fleet, stepMinutes, next,
      currentBaseStandIds(g.mroStage),
      currentLineStandIds(g.mroStage),
      platformAllowed,
    );
    g.maintenanceChecks = mres.checks;
    g.mechanics = mres.mechanics;
    g.fleet = mres.fleet;
    for (const ev of mres.events) {
      if (ev.type === "check_started") {
        pushNotification(
          g,
          `🛠️ ${ev.registration}: ${ev.checkType}-check iniciado (${ev.teamSize} mec.)`,
          "info",
        );
      } else if (ev.type === "check_completed") {
        g.economy = addTransaction(
          g.economy,
          createTransaction(
            "maintenanceCheckFee",
            ev.baseFee,
            next,
            `${ev.checkType}-check ${ev.registration}`,
          ),
        );
        pushNotification(
          g,
          `✅ ${ev.registration}: ${ev.checkType}-check completado · +${ev.baseFee.toLocaleString()} €${ev.overrunDays > 0 ? ` (overrun ${ev.overrunDays}d)` : ""}`,
          "success",
        );
      } else if (ev.type === "check_overrun_day") {
        g.economy = addTransaction(
          g.economy,
          createTransaction(
            "maintenanceCheckPenalty",
            -ev.penalty,
            next,
            `${ev.checkType}-check overrun ${ev.registration} día ${ev.cumulativeOverrunDays}`,
          ),
        );
      }
    }
  }

  // 5c. Pivot línea pura · processDepartures: detectar aviones cuya scheduledDeparture
  //     pasó y todas sus WOs cerraron → marcar Departed + computar delay + KPI + AOG
  //     escalation si delay ≥ AOG_DELAY_THRESHOLD_MIN (3h). Si tienen WO activa, siguen
  //     ocupando stand (delay acumula).
  processDepartures(g, next);

  // 5d. Pivot iteración 2026-05-25: re-attach de MEL deferreds a próximos landings.
  // Tras processDepartures algunos aviones pasan a Departed → sus deferreds quedan
  // huérfanas. Las migramos al próximo landing planificado de la misma matrícula
  // para que el jugador pueda cerrarlas en la próxima pernocta.
  reattachDeferralsToActiveLandings(g);

  // 6. Avanzar reloj
  g.clock = advance(g.clock, stepMinutes);

  // 6b. Pivot iteración 2026-05-25 — Performance archive: si cruzamos una hora natural,
  // archivar airplanes Departed + WOs cerradas antiguas (>6h sim) y purgar archive
  // > 90 días sim. Cero pérdida de datos visibles al jugador (Event Tracking, modal
  // flota historial siguen leyendo de archive). Cost manejable porque solo se llama
  // ~1 vez por hora sim (no cada tick).
  if (Math.floor(next / 60) > Math.floor(now / 60)) {
    archiveStaleEntries(g);
  }

  // 7. Cierre semanal si cruzamos
  if (Math.floor(next / WEEK_MINUTES) > Math.floor(now / WEEK_MINUTES)) {
    // Fase 5A X: pasar extraHangars del stage actual (escala fixed cost).
    const extraHangars = STAGE_CONFIG[g.mroStage].extraHangars;
    const weekBeforeClose = Math.floor(now / WEEK_MINUTES) + 1; // semana que acaba de cerrar
    // Pivot Fase D: pasar hoursBilled + lastSnapshot para que el weekly close
    // calcule la bonificación de subscription HH/sem por contrato.
    const hoursBilledByAirline: Record<string, number> = {};
    for (const [aid, b] of Object.entries(g.hoursKPI.perAirline)) {
      hoursBilledByAirline[aid] = b.bookHoursBilled;
    }
    const closeRes = applyWeeklyClose(g.economy, g.contracts, g.mechanics, g.balance, next, extraHangars, {
      hoursBilledByAirline,
      lastWeeklyHoursSnapshot: g.lastWeeklyHoursSnapshot,
    });
    g.economy = closeRes.eco;
    g.lastWeeklyHoursSnapshot = closeRes.newHoursSnapshot;
    pushNotification(g, `📊 Cierre semanal. Balance: ${g.economy.balance.toLocaleString()} €`, "info");
    // Fase 5B-δ: snapshot KPI semanal para dashboard.
    const repValues = Object.values(g.reputation.perAirline);
    const repAvg = repValues.length > 0 ? repValues.reduce((s, v) => s + v, 0) / repValues.length : 0;
    // Fase C (brief maestro): WOs de la semana que cierra, contadas desde los EVENTOS de la
    // semana (wo_completed / mel_expired), misma fuente y escala que el revenue. Antes esto
    // mezclaba el array vivo (podado por el archive → ~0 completadas) con el ledger acumulado
    // (todas las SLA penalties de SIEMPRE → "7 tarde"), produciendo "0 completadas / 37k
    // cobrados / 7 tarde". Ahora el acumulador semanal es coherente y se resetea al cerrar.
    g.kpiHistory.push({
      week: weekBeforeClose,
      balance: g.economy.balance,
      repAvg,
      woCompleted: g.weeklyWoStats.completed,
      woLate: g.weeklyWoStats.late,
      woFailed: g.weeklyWoStats.failed,
      complianceScore: g.compliance?.score ?? 80,
      mechanicsCount: g.mechanics.length,
    });
    // Reset del acumulador para la semana entrante.
    g.weeklyWoStats = { completed: 0, late: 0, failed: 0 };
    // Capar a 52 semanas (1 año ingame)
    if (g.kpiHistory.length > 52) g.kpiHistory.shift();
    // Autosave fire&forget tras cierre semanal
    getStorage()
      .save(serializeGame(g))
      .then(() => pushNotification(g, "💾 Guardado automático", "success"))
      .catch((e) => pushNotification(g, `⚠️ Autosave falló: ${e.message}`, "warning"));
  }

  // 7b. Tick compliance Part-145 (Bloque J): pre-aviso 3 días, audit cuando toca, consecuencias.
  {
    const cres = tickCompliance(
      g.compliance,
      g.workOrders,
      g.templates,
      g.maintenanceChecks,
      g.clock.minute,
      g.rng,
    );
    g.compliance = cres.compliance;
    for (const ev of cres.events) {
      if (ev.type === "audit_pre_warning") {
        pushNotification(g, `📋 Auditoría Part-145 en ${ev.daysUntil}d`, "warning");
      } else if (ev.type === "audit_completed") {
        const sign = ev.delta >= 0 ? "+" : "";
        const findingsTxt = ev.findings.length > 0 ? ` · ${ev.findings.join("; ")}` : "";
        const lvl = ev.score < 30 ? "danger" : ev.score < 70 ? "warning" : "success";
        pushNotification(g, `🛡️ Audit Part-145: score ${ev.score}/100 (${sign}${ev.delta})${findingsTxt}`, lvl);
        if (g.autoPauseEnabled && g.clock.speed > 0 && (ev.score < 30 || ev.delta < -5)) {
          g.clock = { ...g.clock, speed: 0 };
          pushNotification(g, "⏸️ Pausa automática (audit grave)", "danger");
        }
        if (ev.fine > 0) {
          g.economy = addTransaction(
            g.economy,
            createTransaction("penalty", -ev.fine, g.clock.minute, `Multa Part-145 (score ${ev.score})`),
          );
        }
        if (g.compliance.pendingSuspension) {
          // Suspende el contrato activo con menor reputación mínima exigida (penalizamos más al
          // que más nos exigía — heurística simple). Si no hay activos, ignoramos.
          const active = g.contracts.filter((c) => c.status === "active");
          if (active.length > 0) {
            const victim = active.reduce((a, b) => (a.minReputation >= b.minReputation ? a : b));
            g.contracts = g.contracts.map((c) => (c.id === victim.id ? { ...c, status: "cancelled" as const } : c));
            const al = g.airlines.find((a) => a.id === victim.airlineId);
            pushNotification(g, `🚫 Contrato ${al?.name ?? victim.airlineId} suspendido por audit`, "danger");
          }
          g.compliance = { ...g.compliance, pendingSuspension: false };
        }
        if (ev.gameOver) {
          g.gameOver = { isOver: true, reason: "compliance" };
          pushNotification(g, "🛑 CERTIFICACIÓN PART-145 REVOCADA. Fin de partida.", "danger");
        }
      }
    }
  }

  // 7b-bis. Tick moral (Bloque L L3): drift diario de moral según estado de cada mecánico.
  g.mechanics = tickMoral(g.mechanics, stepMinutes);

  // 7b-ter. Tick training activo (Bloque L L6): comprobamos si algún mecánico en estado
  // "Training" llegó a su `activeTrainingUntilMinute` → otorgar mejora.
  {
    const tt = tickActiveTraining(
      g.mechanics,
      next,
      g.marketRng,
      g.balance.salaries.b1Junior,
      g.balance.salaries.b2Junior,
    );
    g.mechanics = tt.mechanics;
    for (const ev of tt.events) {
      const txt = ev.outcome === "new_rating"
        ? `🎓 ${ev.mechanicName}: training completado · nuevo rating`
        : `🎓 ${ev.mechanicName}: training completado · promoción a ${ev.outcome === "promoted_b1" ? "B1" : "B2"}`;
      pushNotification(g, txt, "success");
    }
  }

  // 7c. Tick training pasivo (Bloque K K6): los Working acumulan trainingMinutes,
  //     helpers promocionan a B1 junior al alcanzar el umbral. Usa marketRng para no
  //     contaminar la trayectoria principal del juego.
  {
    const tres = tickTraining(g.mechanics, g.balance, g.marketRng, stepMinutes);
    g.mechanics = tres.mechanics;
    for (const ev of tres.events) {
      pushNotification(
        g,
        `🎓 ${ev.mechanicName} promocionado a B1 junior (${ev.newRating.model}/${ev.newRating.engineVariant})`,
        "success",
      );
    }
  }

  // 7d. Tick mercado laboral (Bloque K K2): refresca pool si toca y descarta expirados.
  if (shouldRefreshMarket(g.marketLastRefreshMinute, g.clock.minute)) {
    g.candidates = refreshMarket(g.marketRng, g.candidates, g.balance, g.clock.minute);
    g.marketLastRefreshMinute = g.clock.minute;
  } else {
    // Aunque no toque refresh, descarta expirados puntualmente.
    g.candidates = g.candidates.filter((c) => c.expiresAtMinute > g.clock.minute);
  }

  // 7e. Tick mercado de contratos. Dos sistemas según el modo de partida:
  //  - Modo legacy (Fase 3 M4): aerolíneas sin iataCode → tickContractMarket cada 7d con
  //    threshold rep≥20. Se mantiene para no romper tests pre-pivot.
  //  - Modo línea pura (pivot 2026-05-24): aerolíneas con iataCode → tickLineCompetition
  //    cada 30d con threshold rep≥70 + rescisión si rep≤20.
  const lineMode = g.airlines.some((a) => a.iataCode);
  if (!lineMode && g.clock.minute - g.contractMarketLastTickMinute >= OFFER_TICK_DAYS * DAY_MINUTES) {
    const cmRes = tickContractMarket(g.marketRng, g.contracts, g.airlines, g.reputation.perAirline, g.clock.minute);
    g.contracts = cmRes.contracts;
    g.contractMarketLastTickMinute = g.clock.minute;
    for (const offer of cmRes.newlyOffered) {
      const al = g.airlines.find((a) => a.id === offer.airlineId);
      pushNotification(g, `📨 Nueva oferta de ${al?.name ?? offer.airlineId} (${offer.id})`, "info");
    }
  }
  if (lineMode && g.clock.minute - g.lineCompetitionLastTickMinute >= LINE_COMPETITION_TICK_DAYS * DAY_MINUTES) {
    // Pivot iteración 2026-05-25: las aerolíneas SIN contrato observan el brand del MRO
    // (score objetivo derivado de KPIs), no su rep individual estática. Esto rompe el
    // deadlock histórico donde Vueling/Volotea/easyJet quedaban a 50 inicial sin nunca
    // cruzar el threshold 70 → 0 ofertas nuevas en partidas reales.
    const contractedReps = g.contracts
      .filter((c) => c.status === "active")
      .map((c) => g.reputation.perAirline[c.airlineId] ?? 50);
    const brand = brandReputation({
      totalDepartures: g.departureKPI.totalDepartures,
      totalOnTime: g.departureKPI.totalOnTime,
      totalAog: g.departureKPI.totalAog,
      contractedReps,
    });
    const lcRes = tickLineCompetition(g.marketRng, g.contracts, g.airlines, g.reputation.perAirline, g.clock.minute, brand);
    g.contracts = lcRes.contracts;
    g.lineCompetitionLastTickMinute = g.clock.minute;
    for (const offer of lcRes.newOffers) {
      const al = g.airlines.find((a) => a.id === offer.airlineId);
      pushNotification(g, `📋 ${al?.name ?? offer.airlineId} quiere contratar contigo (${offer.id})`, "success");
    }
    for (const cx of lcRes.cancellations) {
      const al = g.airlines.find((a) => a.id === cx.airlineId);
      pushNotification(g, `❌ ${al?.name ?? cx.airlineId} rescinde — contrato adjudicado a competidor`, "danger");
    }
  }
  // 7e-bis. Pivot línea pura · Fase B: tick upgrade tier de contratos cada 60d.
  if (lineMode && g.clock.minute - g.tierUpgradeLastTickMinute >= TIER_UPGRADE_TICK_DAYS * DAY_MINUTES) {
    const upRes = tickContractTierUpgrade(g.marketRng, g.contracts, g.reputation.perAirline, g.clock.minute);
    g.contracts = upRes.contracts;
    g.tierUpgradeLastTickMinute = g.clock.minute;
    for (const offer of upRes.newUpgradeOffers) {
      const al = g.airlines.find((a) => a.id === offer.airlineId);
      pushNotification(g, `🆙 ${al?.name ?? offer.airlineId} te ofrece upgrade a ${tierLabel(offer.tier)}`, "success");
    }
  }

  // 7f. Fase 5A X: tick construcción. Si activeBuild + completionMinute pasado → finaliza,
  //     sube mroStage, notifica.
  if (g.activeBuild && g.clock.minute >= g.activeBuild.completionMinute) {
    const newStage = g.activeBuild.targetStage;
    const cfg = STAGE_CONFIG[newStage];
    g.mroStage = newStage;
    g.activeBuild = null;
    pushNotification(g, `🏗️ Etapa ${newStage} alcanzada: ${cfg.label}`, "success");
  }

  // 8. Expirar ofertas
  g.contracts = expireOffers(g.contracts, g.clock.minute);

  // 9. Detectar game over
  if (g.economy.negativeStreakWeeks >= 2) {
    g.gameOver = { isOver: true, reason: "bankruptcy" };
    pushNotification(g, "🛑 BANCARROTA. Balance bajo cero dos semanas consecutivas.", "danger");
  }
  // Bloque M: game over si todas las aerolíneas tienen rep ≤10 (antes era global ≤0).
  // No requiere contratos cancelados porque "todas ≤10" ya implica que nadie te quiere.
  if (allAirlinesBelowThreshold(g.reputation, 10) && Object.keys(g.reputation.perAirline).length > 0) {
    g.gameOver = { isOver: true, reason: "reputation" };
    pushNotification(g, "🛑 TODAS LAS AEROLÍNEAS te han abandonado (rep ≤10 en todas). Fin de partida.", "danger");
  }

  return g;
}

// ---- Acciones del jugador ----

export function acceptContractOffer(g: GameState, contractId: string): void {
  // Detectar si es upgrade tier antes de aceptar (acceptOffer cancela el original).
  const offer = g.contracts.find((c) => c.id === contractId);
  const isUpgrade = offer?.upgradesContractId !== undefined;
  g.contracts = acceptOffer(g.contracts, contractId, g.clock.minute);
  const c = g.contracts.find((cc) => cc.id === contractId);
  const al = c ? g.airlines.find((a) => a.id === c.airlineId) : undefined;
  if (al) {
    if (isUpgrade) {
      pushNotification(g, `🎉 Upgrade aceptado: ${al.name} → ${tierLabel(c?.tier)}`, "success");
    } else {
      const had = g.fleet.some((f) => f.airlineId === al.id);
      if (!had) {
        g.fleet = seedFleetForAirline(g.marketRng, al, g.fleet);
        pushNotification(g, `Contrato aceptado: ${al.name} · 8 aviones añadidos a flota`, "success");
      } else {
        pushNotification(g, `Contrato aceptado: ${al.name}`, "success");
      }
    }
  }
}

export function rejectContractOffer(g: GameState, contractId: string): void {
  g.contracts = rejectOffer(g.contracts, contractId);
}

export function setGameSpeed(g: GameState, speed: 0 | 1 | 2 | 5): void {
  g.clock = { ...g.clock, speed };
}

/** Asignación manual de mecánicos a WO (usada desde el modal). */
export function assignMechanicsManually(
  g: GameState,
  woInstanceId: string,
  certifierId: string,
  helperIds: string[],
): { ok: boolean; error?: string } {
  const res = assignMechanicsToWo(g.mechanics, g.workOrders, woInstanceId, certifierId, helperIds, g.balance, g.clock.minute, g.standTravelMinutes ?? {});
  if (res.error) return { ok: false, error: res.error };
  g.mechanics = res.mechanics;
  g.workOrders = res.workOrders;
  return { ok: true };
}

/**
 * Acción del jugador: contratar un candidato. Paga signing bonus, mueve a mechanics, retira del pool.
 * Devuelve {ok:false} si el candidato no existe o no se puede pagar.
 */
export function hireCandidate(g: GameState, candidateId: string): { ok: boolean; error?: string } {
  // Pivot MRO línea pura: cap de oficina solo aplica en lineMode. Legacy (tests) no limita.
  // Hasta que se desbloquee la ampliación (endgame) no se puede pasar de MECHANIC_CAP_INITIAL
  // plantilla. Lead Foreman cuenta — el espacio físico es el mismo.
  if (g.lineModeEnabled && g.mechanics.length >= MECHANIC_CAP_INITIAL && !canUnlockHangars(g)) {
    return { ok: false, error: `Oficina llena (${MECHANIC_CAP_INITIAL}/${MECHANIC_CAP_INITIAL}) — amplía en endgame` };
  }
  const cand = g.candidates.find((c) => c.id === candidateId);
  if (!cand) return { ok: false, error: "Candidato no encontrado o expirado" };
  const bonus = signingBonusFor(cand);
  if (g.economy.balance < bonus) return { ok: false, error: `Balance insuficiente: necesitas ${bonus.toLocaleString()} €` };
  // Generar id mecánico nuevo. Tomamos el último M-NNN y sumamos 1.
  const existingIds = g.mechanics
    .map((m) => parseInt(m.id.replace(/^M-/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const nextIdNum = (existingIds.length > 0 ? Math.max(...existingIds) : 0) + 1;
  const mechanicId = `M-${nextIdNum.toString().padStart(3, "0")}`;
  const newMechanic = candidateToMechanic(cand, mechanicId, g.clock.minute);
  g.mechanics = [...g.mechanics, newMechanic];
  g.candidates = g.candidates.filter((c) => c.id !== candidateId);
  g.economy = addTransaction(
    g.economy,
    createTransaction("salary", -bonus, g.clock.minute, `Signing bonus ${cand.name} (${mechanicId})`),
  );
  // Fase 5A W: si es Lead Foreman y no había otro, activar autoAssignEnabled por default.
  if (cand.isLeadForeman && !g.autoAssignEnabled) {
    g.autoAssignEnabled = true;
    pushNotification(g, `🎯 TMA jefe contratado · auto-asignación activada`, "info");
  }
  pushNotification(g, `🤝 Contratado ${cand.name} (${mechanicId}) · -${bonus.toLocaleString()} €`, "success");
  return { ok: true };
}

/**
 * Acción del jugador: cambiar el turno de un mecánico. Solo se aplica si está Idle/OffShift.
 * El cambio entra en vigor inmediatamente.
 */
export function setMechanicShift(g: GameState, mechanicId: string, shift: "morning" | "afternoon" | "night" | "off"): { ok: boolean; error?: string } {
  const m = g.mechanics.find((mm) => mm.id === mechanicId);
  if (!m) return { ok: false, error: "Mecánico no encontrado" };
  if (m.state !== "Idle" && m.state !== "OffShift") {
    return { ok: false, error: "Cambia turno cuando el mecánico esté Idle" };
  }
  g.mechanics = g.mechanics.map((mm) => (mm.id === mechanicId ? { ...mm, shift } : mm));
  return { ok: true };
}

/**
 * Acción del jugador: iniciar training activo. Paga 5k €, el mecánico pasa a Training durante 7 días.
 */
export function startTrainingFor(g: GameState, mechanicId: string): { ok: boolean; error?: string } {
  const m = g.mechanics.find((mm) => mm.id === mechanicId);
  if (!m) return { ok: false, error: "Mecánico no encontrado" };
  if (g.economy.balance < ACTIVE_TRAINING_COST_EUR) return { ok: false, error: `Necesitas ${ACTIVE_TRAINING_COST_EUR.toLocaleString()} €` };
  const res = startActiveTraining(m, g.clock.minute);
  if (!res.ok) return { ok: false, error: res.error };
  g.mechanics = g.mechanics.map((mm) => (mm.id === mechanicId ? res.mechanic : mm));
  g.economy = addTransaction(
    g.economy,
    createTransaction("purchase", -res.cost, g.clock.minute, `Training activo ${m.name}`),
  );
  pushNotification(g, `🎓 Training iniciado: ${m.name} · -${res.cost.toLocaleString()} € · 7d`, "info");
  return { ok: true };
}

/**
 * Acción del jugador: despedir un mecánico. Paga severance, lo retira del pool.
 * Si el mecánico está asignado a WO/check no se le puede despedir directamente (caller debe gestionar).
 */
export function fireMechanic(g: GameState, mechanicId: string): { ok: boolean; error?: string } {
  const m = g.mechanics.find((mm) => mm.id === mechanicId);
  if (!m) return { ok: false, error: "Mecánico no encontrado" };
  if (m.state !== "Idle" && m.state !== "OffShift") {
    return { ok: false, error: "Mecánico ocupado — espera a que termine su WO/check" };
  }
  const severance = severanceFor(m, g.clock.minute);
  g.mechanics = g.mechanics.filter((mm) => mm.id !== mechanicId);
  // Fase 5A W: si era el último Lead Foreman, desactivar autoAssignEnabled.
  if (m.isLeadForeman && !g.mechanics.some((mm) => mm.isLeadForeman)) {
    if (g.autoAssignEnabled) {
      g.autoAssignEnabled = false;
      pushNotification(g, `🎯 TMA jefe despedido · auto-asignación desactivada`, "warning");
    }
  }
  g.economy = addTransaction(
    g.economy,
    createTransaction("salary", -severance, g.clock.minute, `Severance ${m.name} (${mechanicId})`),
  );
  pushNotification(g, `👋 Despedido ${m.name} (${mechanicId}) · -${severance.toLocaleString()} €`, "warning");
  return { ok: true };
}

/**
 * Acción del jugador: diferir una WO vía MEL.
 *  - Devuelve {ok:false, error} si la WO no es diferible o ya está cerrada.
 *  - Pivot línea pura (2026-05-24): requiere un B1 ELEGIBLE (con type rating válido
 *    para modelo+motor del avión) para firmar la decisión MEL. Sin certifier
 *    habilitado disponible, no se puede diferir — el regulador exige firma.
 *  - El cert firmante NO se bloquea (decisión administrativa rápida, ~5-10min real).
 *  - Si hay mecánicos asignados, los libera a Idle (la WO ya no necesita team activo).
 */
export function deferWoManually(
  g: GameState,
  woInstanceId: string,
): { ok: boolean; error?: string } {
  const wo = g.workOrders.find((w) => w.instanceId === woInstanceId);
  if (!wo) return { ok: false, error: "WO no encontrada" };
  const tpl = g.templates.find((t) => t.id === wo.templateId);
  if (!tpl) return { ok: false, error: "Template no encontrado" };
  const ap = g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
  if (!ap) return { ok: false, error: "Avión no encontrado" };

  // Pivot · validar B1 elegible disponible para firmar el MEL. La función eligibleCertifiers
  // filtra mecs Idle con base = requiredCategory + type rating válido para (model, engine).
  // Para diferir SIEMPRE se exige B1 con rating válido (sin importar la requiredCategory del
  // template — el MEL lo firma siempre un B1, no un B2).
  const eligibleSigners = g.mechanics.filter((m) =>
    m.state === "Idle" &&
    m.base === "B1" &&
    !m.isLeadForeman &&
    m.typeRatings.some((r) => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === "B1"),
  );
  if (eligibleSigners.length === 0) {
    return { ok: false, error: `Sin B1 habilitado para firmar MEL (${ap.model}/${ap.engineVariant})` };
  }
  const signer = eligibleSigners[0]; // first match — el primer cert con rating disponible

  const newWo = deferWorkOrder(wo, tpl, g.clock.minute);
  if (!newWo) return { ok: false, error: "WO no diferible (AOG / Critical / sin melCategory) o ya cerrada" };
  // Liberar mecánicos asignados al fix (si los había) — la WO ya no necesita team activo.
  const releasedIds = new Set(wo.assignedMechanicIds);
  g.mechanics = g.mechanics.map((m) =>
    releasedIds.has(m.id)
      ? { ...m, state: "Idle" as const, assignedWoInstanceId: null, assignedCheckInstanceId: null, stateRemainingMinutes: 0 }
      : m,
  );
  g.workOrders = g.workOrders.map((w) => (w.instanceId === woInstanceId ? newWo : w));
  // Días que queda viva la deferral según categoría MEL (A:3 / B:10 / C:120 etc según balance).
  const melCat = newWo.melCategory ?? "?";
  const expiryDays = newWo.deferralExpiryMinute
    ? Math.max(0, Math.ceil((newWo.deferralExpiryMinute - g.clock.minute) / DAY_MINUTES))
    : "?";
  pushNotification(
    g,
    `✍️ MEL ${melCat} firmado por ${signer.name} · ${wo.airplaneRegistration} liberado · cerrar en ≤${expiryDays}d (próxima pernocta o pierde rep+€)`,
    "info",
  );
  return { ok: true };
}

/**
 * Acción del jugador (Fase 5A X): iniciar construcción de la siguiente etapa MRO.
 *  - Si stage actual == 4 → no se puede subir más.
 *  - Si hay activeBuild → ya hay una construcción en curso, no se puede iniciar otra.
 *  - Si balance insuficiente → falla.
 *  - Cobra el coste inmediatamente. Si buildDays=0 (stage 2 ramp) sube ahí mismo.
 *  - Si buildDays>0, crea activeBuild que se resolverá en `tickConstruction` cuando llegue.
 */
export function startBuild(g: GameState): { ok: boolean; error?: string } {
  if (g.activeBuild) return { ok: false, error: "Ya hay una construcción en curso" };
  if (g.mroStage >= 4) return { ok: false, error: "Etapa máxima alcanzada" };
  const target = (g.mroStage + 1) as MroStage;
  // Pivot MRO línea pura: stages 3-4 bloqueados en lineMode hasta endgame. Legacy: libre.
  if (g.lineModeEnabled && target > 2 && !canUnlockHangars(g)) {
    return { ok: false, error: "Hangares bloqueados hasta endgame (rep≥80 · balance≥1M · ≥3 aerolíneas)" };
  }
  const cfg = STAGE_CONFIG[target];
  if (g.economy.balance < cfg.costEur) {
    return { ok: false, error: `Balance insuficiente: necesitas ${cfg.costEur.toLocaleString()} €` };
  }
  // Cobrar coste
  g.economy = addTransaction(
    g.economy,
    createTransaction("purchase", -cfg.costEur, g.clock.minute, `Construcción etapa ${target}: ${cfg.label}`),
  );
  if (cfg.buildDays === 0) {
    // Etapa 2 (ramp expansion) — instantánea
    g.mroStage = target;
    pushNotification(g, `🏗️ Etapa ${target} construida: ${cfg.label}`, "success");
  } else {
    g.activeBuild = {
      targetStage: target,
      startedAtMinute: g.clock.minute,
      completionMinute: g.clock.minute + cfg.buildDays * DAY_MINUTES,
    };
    pushNotification(g, `🏗️ Construcción etapa ${target} iniciada · ${cfg.buildDays} días`, "info");
  }
  return { ok: true };
}

/**
 * Acción del jugador (Fase 4 Bloque R): "Reparar ya" sobre una WO diferida.
 * Cancela el deferral activo; la WO vuelve a ToPlane sin equipo y queda pending re-asignación.
 * - {ok:false} si la WO no está Deferred (o no existe).
 * - Sin coste extra ni delta de reputación: reparar antes de tiempo es lo deseable.
 */
export function unDeferWoManually(
  g: GameState,
  woInstanceId: string,
): { ok: boolean; error?: string } {
  const wo = g.workOrders.find((w) => w.instanceId === woInstanceId);
  if (!wo) return { ok: false, error: "WO no encontrada" };
  if (wo.phase !== "Deferred") return { ok: false, error: "WO no está diferida" };
  const newWo = unDeferWorkOrder(wo);
  if (!newWo) return { ok: false, error: "No se pudo reactivar" };
  g.workOrders = g.workOrders.map((w) => (w.instanceId === woInstanceId ? newWo : w));
  pushNotification(g, `🔧 ${wo.airplaneRegistration}: WO reactivada (MEL cancelado)`, "info");
  return { ok: true };
}
