// Pivot MRO línea pura (2026-05-24): KPI de departures + TDR (Total Delay Ratio).
// Se acumula cada vez que un avión sale del stand (puntual, tarde o AOG escalado).

export interface DepartureAirlineBucket {
  /** Departures totales de aviones de esta aerolínea. */
  departures: number;
  /** De los departures, los que salieron puntuales (delay === 0). */
  onTime: number;
  /** De los departures, los que salieron tarde (delay > 0). */
  late: number;
  /** De los departures, los que escalaron a AOG por delay (≥ 180 min). */
  aog: number;
  /** De los AOG, cuántos fueron EVITABLES (mec_busy / mec_offshift / no_rated_cert /
   *  other). Penalty × 1.5 + rep × 1.5. Pivot línea pura · Fase 2 (2026-05-24). */
  aogEvitable: number;
  /** Suma de minutos de delay (incluye los puntuales que aportan 0). */
  sumDelayMinutes: number;
}

export interface DepartureKPI {
  /** Acumuladores globales (todas las aerolíneas, contratadas o no). */
  totalDepartures: number;
  totalOnTime: number;
  totalLate: number;
  totalAog: number;
  /** De los totalAog, cuántos fueron EVITABLES. Pivot Fase 2. */
  totalAogEvitable: number;
  sumDelayMinutes: number;
  /** Acumuladores por aerolínea (Airline.id). */
  perAirline: Record<string, DepartureAirlineBucket>;
}

export function createDepartureKPI(): DepartureKPI {
  return {
    totalDepartures: 0,
    totalOnTime: 0,
    totalLate: 0,
    totalAog: 0,
    totalAogEvitable: 0,
    sumDelayMinutes: 0,
    perAirline: {},
  };
}

/** Pivot línea pura · Fase 2: factor multiplicador AOG según evitabilidad. */
export const AOG_EVITABLE_PENALTY_MULT = 1.5;
export const AOG_EVITABLE_REP_MULT = 1.5;

/** Tipo de causa raíz del delay (sub-set de WorkOrderInstance.delayRootCause).
 *  Los 4 primeros son EVITABLES (jugador tenía capacidad pero no la usó/perdió).
 *  Los 2 últimos NO EVITABLES (causa externa o AOG técnico inevitable). */
export type DelayRootCause =
  | "mec_busy" | "mec_offshift" | "no_rated_cert" | "other"
  | "external_event" | "aog_inevitable";

export function isDelayCauseEvitable(cause: DelayRootCause | undefined): boolean {
  return cause === "mec_busy" || cause === "mec_offshift" || cause === "no_rated_cert" || cause === "other" || cause === undefined;
}

/** TDR global: minutos de delay medio por departure. Si N=0 devuelve 0. */
export function getTdrGlobal(kpi: DepartureKPI): number {
  return kpi.totalDepartures > 0 ? kpi.sumDelayMinutes / kpi.totalDepartures : 0;
}

/** TDR de una aerolínea. Si no hay departures de esa aerolínea, devuelve 0. */
export function getTdrForAirline(kpi: DepartureKPI, airlineId: string): number {
  const b = kpi.perAirline[airlineId];
  if (!b || b.departures === 0) return 0;
  return b.sumDelayMinutes / b.departures;
}

/** Umbral de delay (en minutos) para escalar a AOG. Decisión iteración 2026-05-25:
 *  vuelve a 180 (3h) según design original — un avión que tarda >3h en arrancar ya es
 *  un problema operativo serio para la aerolínea (cancelaciones en cadena, repatriaciones,
 *  rotación rota). El balancing post-Fase 2 que lo subió a 6h fue un parche temporal;
 *  la solución estructural es que el jugador tenga mecs suficientes (1 inicial + 2 dual
 *  en mercado) y sepa contratarlos. EC-MGZ con 360m en partida real era doloroso pero
 *  realista — el problema es no tener cobertura, no el threshold. */
export const AOG_DELAY_THRESHOLD_MIN = 180;
/** Penalty fija al escalar a AOG por delay (€). Aplicada UNA VEZ al departure.
 *  Bajada de 25k→10k en balancing pass post-Fase 2 — coherente con AOG threshold
 *  6h: solo se aplica a AOGs realmente graves. Con multiplicador evitable 1.5×
 *  el cargo total queda en 15k para evitables y 10k para no evitables. */
export const AOG_ESCALATION_PENALTY_EUR = 10_000;
