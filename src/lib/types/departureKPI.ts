// Pivot MRO línea pura (2026-05-24): KPI de departures + TDR (Total Delay Ratio).
// Se acumula cada vez que un avión sale del stand (puntual, tarde o AOG escalado).

// ============================================================================
// TDR = Technical Dispatch Reliability (refactor 2026-05-31, modelo real ADR).
// ============================================================================
// El KPI principal del MRO es la FIABILIDAD TÉCNICA DE DESPACHO: el % de salidas
// despachadas SIN un fallo técnico imputable a ti. Estándar industria (ATA Spec 2000 /
// Airbus/Boeing): TDR% = (departures − techFails) / departures × 100. Benchmark 98.5-99.5%.
//
// CLAVE del modelo (decidido con Dani):
//  - Un departure solo es FALLO TÉCNICO si salió ≥15 min tarde POR una avería IMPUTABLE a ti
//    (delayRootCause evitable: mec_busy/mec_offshift/no_rated_cert/other). "Si no intervenimos
//    no nos cuenta": un avión sin avería, o con retraso por causa externa, o con retraso <15min,
//    cuenta como DISPATCH OK (suma al numerador, no penaliza).
//  - Cotas de severidad (cuenta el fallo en su cota más alta alcanzada):
//      D-15  = fallo de dispatch (cota principal, la que define el TDR%).
//      D-60  = fallo serio.
//      ≥180  = escala a AOG (la cota más grave).

/** Cotas de retraso técnico imputable (minutos). D-15 es la principal del TDR. */
export const DISPATCH_COTA_15 = 15;
export const DISPATCH_COTA_60 = 60;

export interface DepartureAirlineBucket {
  /** Departures totales de aviones de esta aerolínea. */
  departures: number;
  /** Departures despachados de forma fiable (sin fallo técnico ≥15min imputable). */
  reliable: number;
  /** Fallos técnicos: retraso imputable ≥15 min (incluye los que escalan a 60 y AOG). */
  techFail15: number;
  /** Subconjunto de techFail15 con retraso imputable ≥60 min (fallo serio). */
  techFail60: number;
  /** De los departures, los que escalaron a AOG por delay imputable (≥ 180 min). */
  aog: number;
  /** De los AOG, cuántos fueron EVITABLES. Penalty × 1.5 + rep × 1.5. */
  aogEvitable: number;
  /** Suma de minutos de delay IMPUTABLE (técnico evitable). Para delay medio secundario. */
  sumDelayMinutes: number;
  // --- Legacy (compat retro con saves/UI viejos; se siguen rellenando) ---
  /** @deprecated usar `reliable`. Departures sin delay alguno. */
  onTime: number;
  /** @deprecated usar `techFail15`. Departures con delay>0 (cualquier causa). */
  late: number;
}

export interface DepartureKPI {
  /** Acumuladores globales (todas las aerolíneas, contratadas o no). */
  totalDepartures: number;
  /** Departures despachados de forma fiable (numerador del TDR%). */
  totalReliable: number;
  /** Fallos técnicos imputables ≥15 min (rompen el TDR). */
  totalTechFail15: number;
  /** Fallos técnicos imputables ≥60 min (serios). */
  totalTechFail60: number;
  totalAog: number;
  /** De los totalAog, cuántos fueron EVITABLES. */
  totalAogEvitable: number;
  sumDelayMinutes: number;
  /** Acumuladores por aerolínea (Airline.id). */
  perAirline: Record<string, DepartureAirlineBucket>;
  // --- Legacy (compat) ---
  /** @deprecated usar totalReliable. */
  totalOnTime: number;
  /** @deprecated usar totalTechFail15. */
  totalLate: number;
}

export function createDepartureKPI(): DepartureKPI {
  return {
    totalDepartures: 0,
    totalReliable: 0,
    totalTechFail15: 0,
    totalTechFail60: 0,
    totalAog: 0,
    totalAogEvitable: 0,
    sumDelayMinutes: 0,
    perAirline: {},
    totalOnTime: 0,
    totalLate: 0,
  };
}

/** Crea un bucket por-aerolínea vacío. */
export function createAirlineBucket(): DepartureAirlineBucket {
  return { departures: 0, reliable: 0, techFail15: 0, techFail60: 0, aog: 0, aogEvitable: 0, sumDelayMinutes: 0, onTime: 0, late: 0 };
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

/** TDR% global = Technical Dispatch Reliability: % de departures despachados sin fallo
 *  técnico ≥15 min imputable. Sin departures devuelve 100 (fiabilidad perfecta por defecto).
 *  Rango 0..100. Es el KPI PRINCIPAL del MRO. */
export function getTdrPct(kpi: DepartureKPI): number {
  if (kpi.totalDepartures === 0) return 100;
  return (kpi.totalReliable / kpi.totalDepartures) * 100;
}

/** TDR% de una aerolínea. Sin departures de esa aerolínea, 100. */
export function getTdrPctForAirline(kpi: DepartureKPI, airlineId: string): number {
  const b = kpi.perAirline[airlineId];
  if (!b || b.departures === 0) return 100;
  return (b.reliable / b.departures) * 100;
}

/** Delay medio imputable por departure (métrica SECUNDARIA, minutos). Si N=0 devuelve 0.
 *  @deprecated como KPI principal — usar getTdrPct(). Se mantiene como dato de apoyo. */
export function getTdrGlobal(kpi: DepartureKPI): number {
  return kpi.totalDepartures > 0 ? kpi.sumDelayMinutes / kpi.totalDepartures : 0;
}

/** Delay medio imputable de una aerolínea (secundario). */
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
