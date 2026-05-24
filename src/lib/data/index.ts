// Loader del bundle de datos estáticos. Vite empaqueta los JSON al hacer build,
// así que `import data from "./*.json"` es instantáneo en runtime.

import workordersJson from "./workorders.json";
import airlinesJson from "./airlines.json";
import balanceJson from "./balance.json";
import maintenanceChecksJson from "./maintenance_checks.json";
import dailyChecksJson from "./daily_checks.json";

import type {
  WorkOrderTemplate,
  Airline,
  Balance,
  CheckDefinition,
} from "$lib/types";
import { isWorkOrderTemplate } from "$lib/types";

export interface GameData {
  workOrders: WorkOrderTemplate[];
  airlines: Airline[];
  balance: Balance;
  maintenanceChecks: CheckDefinition[];
  /** Fase 5A V3: daily check templates (pernocta auto-emit). */
  dailyChecks: WorkOrderTemplate[];
}

/**
 * Carga, valida y devuelve todos los datos estáticos del juego.
 * Llamar UNA VEZ al arrancar la app (en main.ts). El resultado puede pasarse a stores.
 *
 * Si algún archivo es inválido, lanza Error con detalle. Esto es fallo de
 * compilación moralmente — el juego no debería arrancar con datos rotos.
 */
export function loadGameData(): GameData {
  // 1. WorkOrders
  if (!Array.isArray(workordersJson)) {
    throw new Error("[data] workorders.json no es un array");
  }
  const workOrders: WorkOrderTemplate[] = [];
  for (let i = 0; i < workordersJson.length; i++) {
    const wo = workordersJson[i];
    if (!isWorkOrderTemplate(wo)) {
      throw new Error(`[data] workorders.json[${i}] no cumple shape WorkOrderTemplate (id=${(wo as { id?: string })?.id})`);
    }
    workOrders.push(wo);
  }

  // 2. Airlines
  if (!Array.isArray(airlinesJson)) {
    throw new Error("[data] airlines.json no es un array");
  }
  const airlines = airlinesJson as Airline[]; // shape simple, trusted

  // 3. Balance (single object)
  const balance = balanceJson as Balance;
  if (typeof balance.startingBalance !== "number") {
    throw new Error("[data] balance.json: falta o no es número startingBalance");
  }

  // 4. Maintenance checks (A320/A321 × A/C/D)
  if (!Array.isArray(maintenanceChecksJson)) {
    throw new Error("[data] maintenance_checks.json no es un array");
  }
  const maintenanceChecks = maintenanceChecksJson as CheckDefinition[];
  for (let i = 0; i < maintenanceChecks.length; i++) {
    const c = maintenanceChecks[i];
    if (!["A", "C", "D"].includes(c.type) || !["A320", "A321"].includes(c.model)) {
      throw new Error(`[data] maintenance_checks.json[${i}]: type/model inválido`);
    }
    if (c.triggerFH <= 0 || c.triggerCycles <= 0 || c.manDays <= 0 || c.parkingDays <= 0) {
      throw new Error(`[data] maintenance_checks.json[${i}]: triggers/days deben ser > 0`);
    }
  }

  // 5. Daily check templates (Fase 5A V3)
  if (!Array.isArray(dailyChecksJson)) {
    throw new Error("[data] daily_checks.json no es un array");
  }
  const dailyChecks: WorkOrderTemplate[] = [];
  for (let i = 0; i < dailyChecksJson.length; i++) {
    const dc = dailyChecksJson[i];
    if (!isWorkOrderTemplate(dc)) {
      throw new Error(`[data] daily_checks.json[${i}] no cumple shape (id=${(dc as { id?: string })?.id})`);
    }
    dailyChecks.push(dc);
  }

  return { workOrders, airlines, balance, maintenanceChecks, dailyChecks };
}

/**
 * Stats útiles sobre el dataset cargado. Para mostrar en debug overlay
 * o para tests.
 */
export function describeData(data: GameData): string {
  const byAta = new Map<number, number>();
  const bySev = { Minor: 0, Major: 0, Critical: 0 };
  const byCat = { B1: 0, B2: 0 };
  let aogCount = 0;

  for (const wo of data.workOrders) {
    byAta.set(wo.ata, (byAta.get(wo.ata) ?? 0) + 1);
    bySev[wo.severity]++;
    byCat[wo.requiredCategory]++;
    if (wo.isAOG) aogCount++;
  }

  const ataList = [...byAta.keys()].sort((a, b) => a - b).join(", ");
  return [
    `WorkOrders: ${data.workOrders.length} (Minor=${bySev.Minor}, Major=${bySev.Major}, Critical=${bySev.Critical}, AOG=${aogCount})`,
    `Categories: B1=${byCat.B1}, B2=${byCat.B2}`,
    `ATA chapters: ${ataList}`,
    `Airlines: ${data.airlines.length} (${data.airlines.map((a) => a.name).join(", ")})`,
    `Starting balance: ${data.balance.startingBalance} €`,
  ].join("\n");
}
