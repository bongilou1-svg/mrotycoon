// Serialización del GameState. Output JSON-serializable.
// Estrategia: extraer solo data plana (no funciones, no refs a templates/airlines/balance estáticos).
// Las refs estáticas se rehidratan al deserializar pasándolas de fuera.

import type { GameState } from "$lib/game";
import type {
  Balance, Airline, WorkOrderTemplate, CheckDefinition, MroStage, ActiveBuild, RandomEvent, DepartureKPI, HoursKPI,
} from "$lib/types";
import { createDepartureKPI } from "../types/departureKPI.ts";
import { createHoursKPI } from "../types/hoursKPI.ts";
import { restoreRng } from "./rng.ts";
import { getAirplaneInstanceCounter, resetAirplaneInstanceCounter } from "./fleet.ts";
import { getMaintenanceCheckCounter, resetMaintenanceCheckCounter } from "./maintenance.ts";
import { getCandidateCounter, resetCandidateCounter } from "./labor.ts";
import { migrateLegacyReputation } from "./reputation.ts";
import { _getContractCounter, _resetContractCounter } from "./contracts.ts";

/** v1 = pre-Fase3. v2 = añade fleet + aliCounter + AirplaneInstance.{instanceId,flightHoursThisLeg}.
 *  v3 = añade maintenanceChecks + mcCounter. v4 = añade compliance (Bloque J).
 *  v5 = añade candidates + marketLastRefreshMinute + candidateCounter (Bloque K).
 *  v6 = reputation pasa de {value:n} a {perAirline:{id:n,…}} + contractMarketLastTickMinute (Bloque M).
 *  v7 = Fase 5: mroStage + activeBuild + kpiHistory + randomEvents + flags.
 *  v8 = F5D: añade useScheduleArrivals (snapshot OVD opcional). Default false en migración v7.
 *  v9 = pivot MRO línea pura (2026-05-24): añade lineCompetitionLastTickMinute. Default 0 en migr.
 *  v10 = pivot línea pura · KPI departures: añade departureKPI + campos airplane
 *  (actualDepartureMinute, delayMinutes, aogEscalated). Defaults sanos en migración.
 *  v11 = pivot línea pura · Fase A modelo HH: añade hoursKPI (book vs actual).
 *  v12 = pivot línea pura · Fase B Tiers: añade tierUpgradeLastTickMinute + upgrade
 *  field en Contract.
 *  v16 = corte 2026-05-30: NO cambia el schema. Bump deliberado para INVALIDAR saves
 *  pre-v16, que podían contener aviones "overnighter" fantasma EN TIERRA sembrados con
 *  la lógica previa al fix de `isBased` en seedPreOvernighters (una partida OVD→Vueling
 *  debe arrancar con 0 aviones; los saves viejos mostraban ~19). storage.ts los purga
 *  al leer; deserializeGame solo acepta la versión actual. */
export const SAVE_VERSION = 16;

export interface GameSavePayload {
  version: number;
  savedAt: string; // ISO timestamp real
  clock: GameState["clock"];
  contracts: GameState["contracts"];
  mechanics: GameState["mechanics"];
  fleet: GameState["fleet"];
  airplanes: GameState["airplanes"];
  workOrders: GameState["workOrders"];
  maintenanceChecks: GameState["maintenanceChecks"];
  economy: GameState["economy"];
  reputation: GameState["reputation"];
  notifications: GameState["notifications"];
  rngStates: { rng: number; woRng: number; machineRng: number; marketRng?: number };
  arrivalsGeneratedUpToDay: number;
  gameOver: GameState["gameOver"];
  notifCounter: number;
  aliCounter: number;
  mcCounter: number;
  autoPauseEnabled?: boolean;
  compliance: GameState["compliance"];
  candidates: GameState["candidates"];
  marketLastRefreshMinute: number;
  candidateCounter: number;
  contractMarketLastTickMinute?: number;
  contractCounter?: number;
  // v7 (Fase 5A+5B+5C): polish + sistemas nuevos.
  shiftGatingEnabled?: boolean;
  autoAssignEnabled?: boolean;
  mroStage?: MroStage;
  activeBuild?: ActiveBuild | null;
  kpiHistory?: GameState["kpiHistory"];
  randomEvents?: RandomEvent[];
  eventsRolledForDay?: number;
  // v8 (F5D scope creep): toggle snapshot OVD real.
  useScheduleArrivals?: boolean;
  // v9 (pivot MRO línea pura): tick de competencia simple (ventana 30d).
  lineCompetitionLastTickMinute?: number;
  // v9 (pivot MRO línea pura): modo de partida — cap oficina + competencia diferente.
  lineModeEnabled?: boolean;
  // v10 (pivot línea pura · KPI): acumulador de departures + TDR.
  departureKPI?: DepartureKPI;
  // v11 (pivot línea pura · Fase A modelo HH): acumulador horas-hombre.
  hoursKPI?: HoursKPI;
  // v12 (pivot línea pura · Fase B Tiers): tick upgrade tier de contratos.
  tierUpgradeLastTickMinute?: number;
  // v12 (pivot línea pura · Fase D): snapshot HH al último weekly close por aerolínea.
  lastWeeklyHoursSnapshot?: Record<string, number>;
  // v13 (pivot iteración 2026-05-25 · Management): normas operativas configurables.
  management?: GameState["management"];
  // v14 (pivot iteración 2026-05-25 · Multi-airport): ICAO del aeropuerto de la partida.
  airportIcao?: string;
  // v15 (pivot iteración 2026-05-25 · Performance archive): Departed + WOs cerradas
  // antiguas movidas aquí para que el tick no las itere. Retención 90 días sim.
  archive?: { airplanes: GameState["airplanes"]; workOrders: GameState["workOrders"] };
}

/** Serializa el game state a un objeto JSON-able. */
export function serializeGame(g: GameState): GameSavePayload {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    clock: g.clock,
    contracts: g.contracts,
    mechanics: g.mechanics,
    fleet: g.fleet,
    airplanes: g.airplanes,
    workOrders: g.workOrders,
    maintenanceChecks: g.maintenanceChecks,
    economy: g.economy,
    reputation: g.reputation,
    notifications: g.notifications,
    rngStates: { rng: g.rng.state, woRng: g.woRng.state, machineRng: g.machineRng.state, marketRng: g.marketRng.state },
    arrivalsGeneratedUpToDay: g.arrivalsGeneratedUpToDay,
    gameOver: g.gameOver,
    notifCounter: g.notifCounter,
    aliCounter: getAirplaneInstanceCounter(),
    mcCounter: getMaintenanceCheckCounter(),
    autoPauseEnabled: g.autoPauseEnabled,
    compliance: g.compliance,
    candidates: g.candidates,
    marketLastRefreshMinute: g.marketLastRefreshMinute,
    candidateCounter: getCandidateCounter(),
    contractMarketLastTickMinute: g.contractMarketLastTickMinute,
    contractCounter: _getContractCounter(),
    shiftGatingEnabled: g.shiftGatingEnabled,
    autoAssignEnabled: g.autoAssignEnabled,
    mroStage: g.mroStage,
    activeBuild: g.activeBuild,
    kpiHistory: g.kpiHistory,
    randomEvents: g.randomEvents,
    eventsRolledForDay: g.eventsRolledForDay,
    useScheduleArrivals: g.useScheduleArrivals ?? false,
    lineCompetitionLastTickMinute: g.lineCompetitionLastTickMinute,
    lineModeEnabled: g.lineModeEnabled,
    departureKPI: g.departureKPI,
    hoursKPI: g.hoursKPI,
    tierUpgradeLastTickMinute: g.tierUpgradeLastTickMinute,
    lastWeeklyHoursSnapshot: g.lastWeeklyHoursSnapshot,
    management: g.management,
    airportIcao: g.airportIcao,
    archive: g.archive, // v15: performance archive (Departed + WOs cerradas antiguas)
  };
}

/**
 * Reconstituye un GameState a partir de un payload guardado.
 * Las refs estáticas (balance, airlines, templates, checkDefinitions) se inyectan desde fuera
 * porque NO se guardan.
 */
export function deserializeGame(
  payload: GameSavePayload,
  balance: Balance,
  airlines: Airline[],
  templates: WorkOrderTemplate[],
  checkDefinitions: CheckDefinition[] = [],
  dailyCheckTemplates: WorkOrderTemplate[] = [],
): GameState {
  // deserializeGame mantiene la CAPACIDAD de migrar saves v6..actual (defaults sanos para
  // campos nuevos). El CORTE de saves contaminados pre-v16 (overnighters fantasma del
  // seeding previo al fix `isBased`) NO vive aquí: vive en storage.ts (`load`/`hasSave`
  // purgan < MIN_COMPATIBLE_VERSION) porque es una política de la capa de persistencia/UI,
  // no de la deserialización pura. Así no rompemos los tests de migración ni el principio
  // "no romper saves legítimos". Aquí solo rechazamos versiones fuera del rango soportado.
  if (payload.version < 6 || payload.version > SAVE_VERSION) {
    throw new Error(`Save version ${payload.version} no soportada (esperado 6..${SAVE_VERSION} con migración)`);
  }
  resetAirplaneInstanceCounter(payload.aliCounter);
  resetMaintenanceCheckCounter(payload.mcCounter);
  resetCandidateCounter(payload.candidateCounter);
  _resetContractCounter(payload.contractCounter ?? 1000);
  return {
    clock: payload.clock,
    contracts: payload.contracts,
    mechanics: payload.mechanics,
    fleet: payload.fleet,
    airplanes: payload.airplanes,
    workOrders: payload.workOrders,
    maintenanceChecks: payload.maintenanceChecks,
    checkDefinitions,
    economy: payload.economy,
    // Bloque M: migración legacy (v5 y anteriores guardaban `{value:n}`, ahora `{perAirline:{}}`).
    reputation: migrateLegacyReputation(payload.reputation as unknown as { value?: number; perAirline?: Record<string, number> }, airlines),
    notifications: payload.notifications,
    rng: restoreRng(payload.rngStates.rng),
    woRng: restoreRng(payload.rngStates.woRng),
    machineRng: restoreRng(payload.rngStates.machineRng),
    marketRng: restoreRng(payload.rngStates.marketRng ?? 0),
    airlines,
    templates,
    dailyCheckTemplates,
    balance,
    arrivalsGeneratedUpToDay: payload.arrivalsGeneratedUpToDay,
    gameOver: payload.gameOver,
    notifCounter: payload.notifCounter,
    autoPauseEnabled: payload.autoPauseEnabled ?? true,
    shiftGatingEnabled: payload.shiftGatingEnabled ?? true,
    autoAssignEnabled: payload.autoAssignEnabled ?? false,
    // v13 (pivot iteración 2026-05-25 · Management): defaults sensatos para saves antiguos.
    // Migración del valor intermedio "ifBlockedAndNoFix" (que existió brevemente) → "ifWouldDelay".
    management: (() => {
      const m = payload.management ?? {
        autoAssignTrivial: true,
        melAutoDefer: "ifWouldDelay" as const,
        overtimeAutoCall: false,
      };
      if ((m.melAutoDefer as string) === "ifBlockedAndNoFix") {
        return { ...m, melAutoDefer: "ifWouldDelay" as const };
      }
      return m;
    })(),
    // v14 (pivot iteración 2026-05-25 · Multi-airport): icao del aeropuerto. Saves
    // pre-v14 no lo tienen → undefined = partida legacy (asume LEAS hardcoded).
    airportIcao: payload.airportIcao,
    // v15 (pivot iteración 2026-05-25 · Performance archive): listas archivadas para
    // que el tick no las itere. Saves pre-v15 no lo traen → empezar vacío (los Departed
    // y WOs cerradas viejas del save siguen en g.airplanes/g.workOrders hasta que
    // archiveStaleEntries() los mueva en el próximo cruce de hora natural).
    archive: payload.archive ?? { airplanes: [], workOrders: [] },
    compliance: payload.compliance,
    candidates: payload.candidates,
    marketLastRefreshMinute: payload.marketLastRefreshMinute,
    contractMarketLastTickMinute: payload.contractMarketLastTickMinute ?? 0,
    // v7 (Fase 5): defaults para saves v6.
    mroStage: payload.mroStage ?? 1,
    activeBuild: payload.activeBuild ?? null,
    kpiHistory: payload.kpiHistory ?? [],
    randomEvents: payload.randomEvents ?? [],
    eventsRolledForDay: payload.eventsRolledForDay ?? 0,
    // v8 (F5D): default false para saves v7 — el snapshot OVD entra sólo si el jugador activa toggle.
    useScheduleArrivals: payload.useScheduleArrivals ?? false,
    // v9 (pivot línea pura): default 0 para saves v8 — el primer tick disparará a los 30d ingame.
    lineCompetitionLastTickMinute: payload.lineCompetitionLastTickMinute ?? 0,
    // v9 (pivot línea pura): saves v8 y anteriores eran legacy → default false.
    lineModeEnabled: payload.lineModeEnabled ?? false,
    // v10 (pivot línea pura · KPI): saves v9 y anteriores arrancan con KPI vacío.
    departureKPI: payload.departureKPI ?? createDepartureKPI(),
    // v11 (pivot línea pura · Fase A modelo HH): saves v10 y anteriores arrancan vacío.
    hoursKPI: payload.hoursKPI ?? createHoursKPI(),
    // v12 (pivot línea pura · Fase B Tiers): saves v11 y anteriores arrancan en 0.
    tierUpgradeLastTickMinute: payload.tierUpgradeLastTickMinute ?? 0,
    // v12 (pivot línea pura · Fase D): snapshot inicial vacío.
    lastWeeklyHoursSnapshot: payload.lastWeeklyHoursSnapshot ?? {},
  };
}
