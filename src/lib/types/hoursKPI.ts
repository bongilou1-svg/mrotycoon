// Pivot línea pura · Fase A modelo HH (2026-05-24):
// Horas-hombre como unidad económica del MRO. Cada tarea tiene `bookHours`
// (referencia AMM/MPD del fabricante). El mecánico tarda más o menos según skill
// y estado → `actualHours`. Cobro a aerolínea = `bookHours × hourlyRateEur`
// (precio cerrado por tarea, el MRO asume el riesgo de eficiencia — modelo real).
//
// El ratio bookHours / actualHours es el KPI eficiencia: >1 = mecs rápidos
// (margen alto), <1 = lentos (margen comido). Dashboard expone el ratio agregado
// global y por aerolínea.

import type { WorkOrderTemplate, Contract } from "$lib/types";

/** HH-book de una tarea: lo que dice el manual del fabricante. Hoy derivado
 *  de `durationMinutes` (compat con dataset existente). Cuando el dataset
 *  evolucione a bookHours explícito, este helper lo lee directo. */
export function bookHoursForTemplate(tpl: WorkOrderTemplate): number {
  return tpl.durationMinutes / 60;
}

/** Tarifa €/HH de un contrato. Derivada de `paymentPerWOMinute × 60`. La unidad
 *  €/min seguirá viva en el contrato; este helper la expone como €/HH para
 *  cobros y dashboard. */
export function hourlyRateEur(contract: Contract): number {
  return contract.paymentPerWOMinute * 60;
}

/** Horas-hombre REALES dedicadas a una WO desde su emisión hasta su completion.
 *  Aproximación simple: tiempo total transcurrido entre emissionMinute y
 *  completionMinute, en horas. Sobreestima ligeramente (incluye tiempo en cola)
 *  pero captura la realidad operacional "ese avión estuvo N horas con WO viva".
 *
 *  Una versión más precisa requiere instrumentar workMinutesAccumulated en el
 *  state machine (solo cuenta Working/Test/Rework, no ToPlane). Se difiere a
 *  Fase 2 (atomic timing) para no inflar este refactor. */
export function actualHoursForCompletedWo(
  emissionMinute: number,
  completionMinute: number,
): number {
  return Math.max(0, (completionMinute - emissionMinute) / 60);
}

export interface HoursAirlineBucket {
  /** HH-book de las WOs facturadas a esta aerolínea (acumulado). */
  bookHoursBilled: number;
  /** HH-actual dedicadas (tiempo real entre emisión y completion). */
  actualHoursWorked: number;
}

export interface HoursKPI {
  /** Acumuladores globales. */
  totalBookHoursBilled: number;
  totalActualHoursWorked: number;
  /** Por aerolínea (Airline.id). */
  perAirline: Record<string, HoursAirlineBucket>;
}

export function createHoursKPI(): HoursKPI {
  return {
    totalBookHoursBilled: 0,
    totalActualHoursWorked: 0,
    perAirline: {},
  };
}

/** Ratio eficiencia: bookHours / actualHours. >1 = mecs rápidos (margen alto),
 *  <1 = lentos. Devuelve 1 cuando no hay datos (neutro). */
export function getHoursEfficiencyGlobal(kpi: HoursKPI): number {
  if (kpi.totalActualHoursWorked === 0) return 1;
  return kpi.totalBookHoursBilled / kpi.totalActualHoursWorked;
}

export function getHoursEfficiencyForAirline(kpi: HoursKPI, airlineId: string): number {
  const b = kpi.perAirline[airlineId];
  if (!b || b.actualHoursWorked === 0) return 1;
  return b.bookHoursBilled / b.actualHoursWorked;
}

/** Registra el cierre de una WO en el KPI. Llamado desde el wo_completed event
 *  handler en game.ts. */
export function recordWoCompletionInHoursKPI(
  kpi: HoursKPI,
  airlineId: string | null,
  bookHours: number,
  actualHours: number,
): void {
  kpi.totalBookHoursBilled += bookHours;
  kpi.totalActualHoursWorked += actualHours;
  if (airlineId) {
    let b = kpi.perAirline[airlineId];
    if (!b) {
      b = { bookHoursBilled: 0, actualHoursWorked: 0 };
      kpi.perAirline[airlineId] = b;
    }
    b.bookHoursBilled += bookHours;
    b.actualHoursWorked += actualHours;
  }
}
