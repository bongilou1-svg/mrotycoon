// Generación + máquina de estados de Work Orders.
// La generación: al aterrizar un avión, 70% prob de aparecer WO con template compatible.
// El SLA = duration × slaMultiplier (1.05 por defecto).
//
// Máquina de estados completa (5 fases) la llevamos en C7.

import type {
  WorkOrderTemplate,
  WorkOrderInstance,
  Airplane,
  Balance,
  AircraftModel,
  EngineVariant,
} from "$lib/types";
import { randPick, randBool, type Rng } from "./rng.ts";

let _instanceCounter = 0;

/** Reset del contador interno (para tests reproducibles). */
export function _resetInstanceCounter(): void {
  _instanceCounter = 0;
}

/** Filtra templates compatibles con un (model + engineVariant). Vacío en compatibles = todos. */
export function compatibleTemplates(
  templates: readonly WorkOrderTemplate[],
  model: AircraftModel,
  engineVariant: EngineVariant,
): WorkOrderTemplate[] {
  return templates.filter((t) => {
    const okModel = t.aircraftModelsCompatibles.length === 0 || t.aircraftModelsCompatibles.includes(model);
    const okEngine = t.engineVariantsCompatibles.length === 0 || t.engineVariantsCompatibles.includes(engineVariant);
    return okModel && okEngine;
  });
}

/**
 * Selecciona una WO ponderada por (severity_weight × template.probability).
 * Distribución implícita: Minor mucho más común que Critical, según el dataset.
 */
export function pickWeightedTemplate(rng: Rng, templates: readonly WorkOrderTemplate[]): WorkOrderTemplate {
  // En MVP usamos selección uniforme entre los templates (la distribución del dataset
  // ya impone que Minor sea mayoría). Si más adelante queremos ponderar, multiplicamos
  // por severityWeight aquí.
  return randPick(rng, templates);
}

/**
 * Decide si aparece WO al landing y, si sí, genera la instance.
 *
 * @returns WorkOrderInstance o null si no salió WO en este avión.
 */
export function rollWoOnLanding(
  rng: Rng,
  airplane: Airplane,
  templates: readonly WorkOrderTemplate[],
  balance: Balance,
): WorkOrderInstance | null {
  if (!randBool(rng, balance.probabilities.workOrderAtStand)) return null;
  const compat = compatibleTemplates(templates, airplane.model, airplane.engineVariant);
  if (compat.length === 0) return null;
  const template = pickWeightedTemplate(rng, compat);
  return instantiateWorkOrder(template, airplane, balance);
}

/** Crea una WorkOrderInstance a partir de template + avión. SLA derivado. */
export function instantiateWorkOrder(
  template: WorkOrderTemplate,
  airplane: Airplane,
  balance: Balance,
): WorkOrderInstance {
  _instanceCounter += 1;
  return {
    instanceId: `WI-${_instanceCounter.toString().padStart(5, "0")}`,
    templateId: template.id,
    airplaneRegistration: airplane.registration,
    airplaneInstanceId: airplane.instanceId,
    emissionMinute: airplane.arrivalMinute,
    assignedMechanicIds: [],
    phase: "ToPlane", // empieza en ToPlane porque aún no hay mecánicos asignados; pasará a Inspection al asignar
    phaseElapsedMinutes: 0,
    slaMinute: airplane.arrivalMinute + Math.round(template.durationMinutes * balance.slaMultiplier),
  };
}

/** WOs activas (no completed/failed). */
export function activeWorkOrders(wos: readonly WorkOrderInstance[]): WorkOrderInstance[] {
  return wos.filter((w) => w.phase !== "Completed" && w.phase !== "Failed");
}

/** WOs sin asignar (Phase ToPlane y sin mecánicos). */
export function unassignedWorkOrders(wos: readonly WorkOrderInstance[]): WorkOrderInstance[] {
  return wos.filter((w) => w.assignedMechanicIds.length === 0 && w.phase === "ToPlane");
}

/** Helper para tests: cuenta WOs por phase. */
export function countByPhase(wos: readonly WorkOrderInstance[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of wos) {
    out[w.phase] = (out[w.phase] ?? 0) + 1;
  }
  return out;
}

/**
 * Fase 5A V4: emite N daily checks cuando un avión pernocta.
 *
 * El avión está toda la noche en stand → se aprovecha para checks rutinarios que no entran
 * en un turnaround normal: pre-flight visual, brake wear, tyre pressure, fluids, etc.
 *
 * @param airplane debe tener `overnight === true`. Caller responsable de chequear.
 * @param dailyCheckTemplates dataset de daily_checks.json.
 * @returns 2-4 WorkOrderInstances de daily check, sin solapar.
 */
export function rollDailyChecksOnOvernight(
  rng: Rng,
  airplane: Airplane,
  dailyCheckTemplates: readonly WorkOrderTemplate[],
  balance: Balance,
): WorkOrderInstance[] {
  if (dailyCheckTemplates.length === 0) return [];
  // Pickear 2-4 templates distintos. Si el dataset es pequeño, devolvemos los disponibles.
  const count = Math.min(dailyCheckTemplates.length, 2 + Math.floor(rng.next() * 3)); // 2, 3, 4
  const compat = compatibleTemplates(dailyCheckTemplates, airplane.model, airplane.engineVariant);
  if (compat.length === 0) return [];
  // Selección sin reemplazo
  const pool = [...compat];
  const picked: WorkOrderTemplate[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked.map((tpl) => instantiateWorkOrder(tpl, airplane, balance));
}
