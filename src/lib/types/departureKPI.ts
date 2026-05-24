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
  /** Suma de minutos de delay (incluye los puntuales que aportan 0). */
  sumDelayMinutes: number;
}

export interface DepartureKPI {
  /** Acumuladores globales (todas las aerolíneas, contratadas o no). */
  totalDepartures: number;
  totalOnTime: number;
  totalLate: number;
  totalAog: number;
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
    sumDelayMinutes: 0,
    perAirline: {},
  };
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

/** Umbral de delay (en minutos) para escalar a AOG. */
export const AOG_DELAY_THRESHOLD_MIN = 180;
/** Penalty fija al escalar a AOG por delay (€). Aplicada UNA VEZ al departure. */
export const AOG_ESCALATION_PENALTY_EUR = 25_000;
