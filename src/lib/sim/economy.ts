// Economía. Ledger de transacciones + cierre semanal (cobra base fees, paga salarios + costes fijos).
// Game over: balance < 0 durante 2 semanas consecutivas.

import type { Balance, Contract, Mechanic, WorkOrderTemplate, WorkOrderInstance } from "$lib/types";
import { effectiveWeeklySalary } from "./shifts.ts";

export type TransactionType =
  | "salary"
  | "contractBaseFee"
  | "workOrderPayment"
  | "penalty"
  | "weeklyFixedCost"
  | "purchase"
  | "maintenanceCheckFee"
  | "maintenanceCheckPenalty";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // positivo = ingreso, negativo = gasto
  minute: number;
  description: string;
}

let _txCounter = 0;
export function _resetTxCounter() {
  _txCounter = 0;
}

function nextTxId(): string {
  _txCounter += 1;
  return `T-${_txCounter.toString().padStart(6, "0")}`;
}

export function createTransaction(
  type: TransactionType,
  amount: number,
  minute: number,
  description: string,
): Transaction {
  return { id: nextTxId(), type, amount, minute, description };
}

export interface EconomyState {
  balance: number;
  ledger: Transaction[];
  /** Días consecutivos con balance < 0 (para tracking de bancarrota). */
  negativeStreakWeeks: number;
}

export function createEconomy(startingBalance: number): EconomyState {
  return { balance: startingBalance, ledger: [], negativeStreakWeeks: 0 };
}

export function addTransaction(eco: EconomyState, tx: Transaction): EconomyState {
  return {
    ...eco,
    balance: eco.balance + tx.amount,
    ledger: [...eco.ledger, tx],
  };
}

/**
 * Calcula el pago por una WO completada: payment = duration × paymentPerWOMinute.
 * Si llegó tarde, también suma penalty negativo proporcional al exceso.
 */
export function payForCompletedWo(
  template: WorkOrderTemplate,
  wo: WorkOrderInstance,
  contract: Contract,
  balance: Balance,
  onTime: boolean,
  completionMinute: number,
): Transaction[] {
  const txs: Transaction[] = [];
  const payment = Math.round(template.durationMinutes * contract.paymentPerWOMinute);
  txs.push(createTransaction(
    "workOrderPayment",
    payment,
    completionMinute,
    `WO ${wo.instanceId} (${template.id})`,
  ));

  if (!onTime) {
    const lateMinutes = Math.max(0, completionMinute - wo.slaMinute);
    const baseMult = template.isAOG ? balance.aogPenaltyMultiplier : 1;
    const penalty = -Math.round(lateMinutes * contract.penaltyPerLateMinute * baseMult);
    if (penalty !== 0) {
      txs.push(createTransaction(
        "penalty",
        penalty,
        completionMinute,
        `Penalty SLA ${wo.instanceId} (${lateMinutes}min late${template.isAOG ? ", AOG ×5" : ""})`,
      ));
    }
  }

  return txs;
}

/** Coste semanal extra por hangar adicional construido (Fase 4 audit, hook para Fase 5
 *  build-hangar). Hoy `extraHangars = 0` siempre, así que no cambia nada. */
export const WEEKLY_FIXED_COST_PER_EXTRA_HANGAR = 5000;

/**
 * Cierre semanal: cobra base fees de contratos activos, paga salarios + costes fijos.
 * Devuelve nuevo estado de economía + lista de transacciones aplicadas.
 *
 * `extraHangars` (Fase 4 audit hook): número de hangares ADICIONALES sobre el 1 inicial.
 * Default 0 (estado actual MVP). Cuando Fase 5 introduzca construir hangar 2º/3º, el caller
 * pasará el número y el coste fijo escala (5k €/sem por hangar extra).
 */
export function applyWeeklyClose(
  eco: EconomyState,
  contracts: readonly Contract[],
  mechanics: readonly Mechanic[],
  balance: Balance,
  nowMinute: number,
  extraHangars = 0,
): { eco: EconomyState; transactions: Transaction[] } {
  const txs: Transaction[] = [];

  // Ingresos: base fees
  for (const c of contracts) {
    if (c.status !== "active") continue;
    txs.push(createTransaction(
      "contractBaseFee",
      c.baseFeePerWeek,
      nowMinute,
      `Base fee ${c.id}`,
    ));
  }

  // Gastos: salarios. Bloque L L5: turno noche aplica ×1.5 al salario base.
  for (const m of mechanics) {
    const sal = effectiveWeeklySalary(m);
    const tag = m.shift === "night" ? " [night]" : "";
    txs.push(createTransaction(
      "salary",
      -sal,
      nowMinute,
      `Salario ${m.id} ${m.name}${tag}`,
    ));
  }

  // Coste fijo (con hook para hangares adicionales en Fase 5).
  const fixedTotal = balance.weeklyFixedCost + extraHangars * WEEKLY_FIXED_COST_PER_EXTRA_HANGAR;
  const tag = extraHangars > 0 ? ` (+${extraHangars} hangar${extraHangars > 1 ? "es" : ""})` : "";
  txs.push(createTransaction(
    "weeklyFixedCost",
    -fixedTotal,
    nowMinute,
    `Coste fijo semanal${tag}`,
  ));

  let newEco = eco;
  for (const tx of txs) newEco = addTransaction(newEco, tx);

  // Actualizar streak de bancarrota
  if (newEco.balance < 0) {
    newEco = { ...newEco, negativeStreakWeeks: eco.negativeStreakWeeks + 1 };
  } else {
    newEco = { ...newEco, negativeStreakWeeks: 0 };
  }

  return { eco: newEco, transactions: txs };
}

/** Suma de ingresos en la última semana. */
export function recentIncome(eco: EconomyState, sinceMinute: number): number {
  return eco.ledger
    .filter((t) => t.minute >= sinceMinute && t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
}

/** Suma de gastos en la última semana (valor absoluto). */
export function recentExpenses(eco: EconomyState, sinceMinute: number): number {
  return eco.ledger
    .filter((t) => t.minute >= sinceMinute && t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

/** ¿Bancarrota? (≥2 semanas consecutivas en negativo). */
export function isBankrupt(eco: EconomyState): boolean {
  return eco.negativeStreakWeeks >= 2;
}
