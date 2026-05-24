// Game state global combinando todos los sub-sistemas. Centraliza el tick.
// Mantengo lógica pura aquí; la reactividad Svelte la lleva stores/game.ts.

import type {
  Airplane, Airline, Contract, Mechanic, WorkOrderInstance, WorkOrderTemplate, Balance, FleetAircraft,
  CheckDefinition, MaintenanceCheckInstance, ComplianceState, Candidate, MroStage, ActiveBuild,
  RandomEvent, DepartureKPI,
} from "$lib/types";
import { STAGE_CONFIG } from "./types/mroStage.ts";
import { createDepartureKPI, AOG_DELAY_THRESHOLD_MIN, AOG_ESCALATION_PENALTY_EUR } from "./types/departureKPI.ts";
import { rollDailyEvents, runwayClosedAt } from "./sim/events.ts";
import { type ClockState, createClock, advance, DAY_MINUTES, WEEK_MINUTES } from "./sim/time.ts";
import { type Rng, createRng } from "./sim/rng.ts";
import {
  generateInitialContracts, generateInitialContractsLine, activeContracts, expireOffers, acceptOffer, rejectOffer,
  tickContractMarket, tickLineCompetition, OFFER_TICK_DAYS, LINE_COMPETITION_TICK_DAYS, _resetContractCounter,
} from "./sim/contracts.ts";
import { generateDailyArrivals, assignStand } from "./sim/airplanes.ts";
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
import { generateInitialMechanics, eligibleCertifiers } from "./sim/mechanics.ts";
import { assignMechanicsToWo, tickMechanicTravel } from "./sim/assignment.ts";
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
  /** Si true (Fase 4 Q1+Q2), mecánicos fuera de su turno son improductivos y se liberan de WOs
   *  activas al cambiar de turno. Default true. Tests legacy lo ponen a false. No se serializa
   *  (es estado de runtime, no de partida — UI lo podría exponer como toggle). */
  shiftGatingEnabled: boolean;
  /** Fase 5A W: si true y hay al menos 1 Lead Foreman idle, el TMA auto-asigna WOs en
   *  casos triviales (1 cert eligible) y hace auto-handoff entre turnos. Default false
   *  (el jugador activa cuando contrata su primer TMA). */
  autoAssignEnabled: boolean;
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
}

export interface CreateGameOptions {
  /** Pivot MRO línea pura (2026-05-24). Default false (compat tests legacy). UI lo pasa true. */
  lineMode?: boolean;
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
  // Contratos: legacy (1 active + 2 offered) vs línea pura (1 active solo).
  const initialContracts = lineMode
    ? generateInitialContractsLine(rng, airlines)
    : generateInitialContracts(rng, airlines);
  const activeAirlineIds = new Set(initialContracts.filter((c) => c.status === "active").map((c) => c.airlineId));
  const activeAirlines = airlines.filter((al) => activeAirlineIds.has(al.id));
  // Flota persistente solo para aerolíneas con contrato activo. FH=0 y luego envejece con
  // el marketRng (aislado del rng principal) para no contaminar la trayectoria determinista.
  const baseFleet = generateInitialFleet(rng, activeAirlines);
  const marketRng = createRng(seed + 3);
  const fleet = ageInitialFleet(marketRng, baseFleet);
  return {
    clock: createClock(undefined, 0), // arranca pausado en START_MINUTE (06:00 día 1)
    airlines,
    templates,
    dailyCheckTemplates,
    balance,
    fleet,
    contracts: initialContracts,
    mechanics: generateInitialMechanics(rng, balance, { linePool: lineMode }),
    airplanes: [],
    workOrders: [],
    maintenanceChecks: [],
    checkDefinitions,
    compliance: createCompliance(rng, 0),
    candidates: refreshMarket(marketRng, [], balance, 0),
    marketLastRefreshMinute: 0,
    contractMarketLastTickMinute: 0,
    lineCompetitionLastTickMinute: 0,
    economy: createEconomy(balance.startingBalance),
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
    mroStage: 1,
    activeBuild: null,
    kpiHistory: [],
    randomEvents: [],
    eventsRolledForDay: 0,
    // Línea pura: schedule real OVD activo por default. Legacy: arrivals stocásticos.
    useScheduleArrivals: lineMode,
    lineModeEnabled: lineMode,
    departureKPI: createDepartureKPI(),
  };
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
    if (blocking.length > 0) continue;

    // Marcar Departed con timing real
    const delay = Math.max(0, nowMinute - a.scheduledDepartureMinute);
    a.actualDepartureMinute = nowMinute;
    a.delayMinutes = delay;
    a.status = "Departed";
    if (delay >= AOG_DELAY_THRESHOLD_MIN) a.aogEscalated = true;

    // KPI acumulador (global + por aerolínea)
    const kpi = g.departureKPI;
    kpi.totalDepartures += 1;
    kpi.sumDelayMinutes += delay;
    if (delay === 0) kpi.totalOnTime += 1;
    else kpi.totalLate += 1;
    if (a.aogEscalated) kpi.totalAog += 1;
    const c = g.contracts.find((cc) => cc.id === a.contractId);
    if (c) {
      let b = kpi.perAirline[c.airlineId];
      if (!b) {
        b = { departures: 0, onTime: 0, late: 0, aog: 0, sumDelayMinutes: 0 };
        kpi.perAirline[c.airlineId] = b;
      }
      b.departures += 1;
      b.sumDelayMinutes += delay;
      if (delay === 0) b.onTime += 1;
      else b.late += 1;
      if (a.aogEscalated) b.aog += 1;
    }

    // Notifs + AOG escalation
    if (a.aogEscalated) {
      pushNotification(
        g,
        `🛑 AOG escalado: ${a.registration} salió con ${delay}m de retraso (>3h)`,
        "danger",
      );
      g.economy = addTransaction(
        g.economy,
        createTransaction("penalty", -AOG_ESCALATION_PENALTY_EUR, nowMinute, `AOG escalado ${a.registration} (delay ${delay}m)`),
      );
      if (c) g.reputation = applyDelta(g.reputation, c.airlineId, g.balance.reputation.aogFailed);
    } else if (delay > 0) {
      pushNotification(g, `✈️ ${a.registration} salió con ${delay}m de retraso`, "warning");
    }
  }
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
      const wo = rollWoOnLanding(g.woRng, p, g.templates, g.balance);
      if (wo) {
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
          const r = assignMechanicsToWo(g.mechanics, g.workOrders, ev.woInstanceId, replacement.id, [], g.balance);
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
  for (const wo of g.workOrders) {
    if (wo.assignedMechanicIds.length > 0 || wo.phase !== "ToPlane") continue;
    const tpl = g.templates.find((t) => t.id === wo.templateId);
    const ap = g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
    if (!tpl || !ap) continue;
    const certs = eligibleCertifiers(g.mechanics, tpl, ap.model, ap.engineVariant);
    if (certs.length === 0) continue;
    const res = assignMechanicsToWo(g.mechanics, g.workOrders, wo.instanceId, certs[0].id, [], g.balance);
    if (!res.error) {
      g.mechanics = res.mechanics;
      g.workOrders = res.workOrders;
    }
  }

  // 3. Tick travel
  const travelRes = tickMechanicTravel(g.mechanics, g.workOrders, stepMinutes);
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
  const machineRes = tickWorkOrders(
    g.workOrders, g.mechanics, g.templates, g.balance, stepMinutes, g.machineRng,
    g.shiftGatingEnabled ? next : -1,
  );
  g.mechanics = machineRes.mechanics;
  g.workOrders = machineRes.workOrders;

  // 5. Aplicar eventos del state machine
  for (const ev of machineRes.events) {
    if (ev.type === "wo_completed") {
      const wo = g.workOrders.find((w) => w.instanceId === ev.woInstanceId);
      const tpl = g.templates.find((t) => t.id === ev.templateId);
      const ap = wo ? g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId) : undefined;
      const c = ap ? g.contracts.find((cc) => cc.id === ap.contractId) : undefined;
      if (wo && tpl && c) {
        const txs = payForCompletedWo(tpl, wo, c, g.balance, ev.onTime, next);
        for (const tx of txs) g.economy = addTransaction(g.economy, tx);
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

  // 6. Avanzar reloj
  g.clock = advance(g.clock, stepMinutes);

  // 7. Cierre semanal si cruzamos
  if (Math.floor(next / WEEK_MINUTES) > Math.floor(now / WEEK_MINUTES)) {
    // Fase 5A X: pasar extraHangars del stage actual (escala fixed cost).
    const extraHangars = STAGE_CONFIG[g.mroStage].extraHangars;
    const weekBeforeClose = Math.floor(now / WEEK_MINUTES) + 1; // semana que acaba de cerrar
    const closeRes = applyWeeklyClose(g.economy, g.contracts, g.mechanics, g.balance, next, extraHangars);
    g.economy = closeRes.eco;
    pushNotification(g, `📊 Cierre semanal. Balance: ${g.economy.balance.toLocaleString()} €`, "info");
    // Fase 5B-δ: snapshot KPI semanal para dashboard.
    const repValues = Object.values(g.reputation.perAirline);
    const repAvg = repValues.length > 0 ? repValues.reduce((s, v) => s + v, 0) / repValues.length : 0;
    // WOs del cierre semanal: completas/late/failed acumuladas desde semana previa.
    // Simplificación MVP: usamos contadores absolutos del state actual y derivamos delta vs último snapshot.
    const woCompletedNow = g.workOrders.filter(w => w.phase === "Completed").length;
    const woLateNow = g.economy.ledger.filter(t => t.type === "penalty" && t.description.startsWith("Penalty SLA")).length;
    const woFailedNow = g.workOrders.filter(w => w.phase === "Failed").length;
    const lastSnap = g.kpiHistory[g.kpiHistory.length - 1];
    g.kpiHistory.push({
      week: weekBeforeClose,
      balance: g.economy.balance,
      repAvg,
      woCompleted: woCompletedNow - (lastSnap?.woCompleted ? 0 : 0) , // absoluto; UI derivará delta si quiere
      woLate: woLateNow,
      woFailed: woFailedNow,
      complianceScore: g.compliance?.score ?? 80,
      mechanicsCount: g.mechanics.length,
    });
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
    const lcRes = tickLineCompetition(g.marketRng, g.contracts, g.airlines, g.reputation.perAirline, g.clock.minute);
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
  g.contracts = acceptOffer(g.contracts, contractId, g.clock.minute);
  const c = g.contracts.find((cc) => cc.id === contractId);
  const al = c ? g.airlines.find((a) => a.id === c.airlineId) : undefined;
  if (al) {
    // Si aún no hay flota para esta aerolínea, sembrarla ahora (Bloque N fix: la flota
    // sigue al contrato, no al inicio incondicional).
    const had = g.fleet.some((f) => f.airlineId === al.id);
    if (!had) {
      g.fleet = seedFleetForAirline(g.marketRng, al, g.fleet);
      pushNotification(g, `Contrato aceptado: ${al.name} · 8 aviones añadidos a flota`, "success");
    } else {
      pushNotification(g, `Contrato aceptado: ${al.name}`, "success");
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
  const res = assignMechanicsToWo(g.mechanics, g.workOrders, woInstanceId, certifierId, helperIds, g.balance);
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
 * - Devuelve {ok:false, error} si la WO no es diferible o ya está cerrada.
 * - Si hay mecánicos asignados, los libera a Idle (la WO ya no necesita team activo).
 */
export function deferWoManually(
  g: GameState,
  woInstanceId: string,
): { ok: boolean; error?: string } {
  const wo = g.workOrders.find((w) => w.instanceId === woInstanceId);
  if (!wo) return { ok: false, error: "WO no encontrada" };
  const tpl = g.templates.find((t) => t.id === wo.templateId);
  if (!tpl) return { ok: false, error: "Template no encontrado" };
  const newWo = deferWorkOrder(wo, tpl, g.clock.minute);
  if (!newWo) return { ok: false, error: "WO no diferible (AOG / Critical / sin melCategory) o ya cerrada" };
  // Liberar mecánicos asignados (si los había) — vuelven a Idle directamente, no Returning.
  // Decisión MVP: cuando difieres, los mecánicos no tienen que "volver de la rampa"; asumimos
  // que la decisión se toma antes de moverlos. En Fase 4 podría matizarse.
  const releasedIds = new Set(wo.assignedMechanicIds);
  g.mechanics = g.mechanics.map((m) =>
    releasedIds.has(m.id)
      ? { ...m, state: "Idle" as const, assignedWoInstanceId: null, assignedCheckInstanceId: null, stateRemainingMinutes: 0 }
      : m,
  );
  g.workOrders = g.workOrders.map((w) => (w.instanceId === woInstanceId ? newWo : w));
  pushNotification(g, `📋 ${wo.airplaneRegistration}: WO diferida vía MEL`, "info");
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
