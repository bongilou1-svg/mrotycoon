// Re-exporta todo el sim core en un solo bundle para esbuild IIFE.
export * from "./sim/rng.ts";
export * from "./sim/time.ts";
export * from "./sim/contracts.ts";
export * from "./sim/airplanes.ts";
export * from "./sim/schedule.ts";
export * from "./sim/fleet.ts";
export * from "./sim/stands.ts";
export * from "./sim/workorders.ts";
export * from "./sim/mechanics.ts";
export * from "./sim/assignment.ts";
export * from "./sim/wo_state_machine.ts";
export * from "./sim/economy.ts";
export * from "./sim/reputation.ts";
export * from "./sim/maintenance.ts";
export * from "./sim/mel.ts";
export * from "./sim/compliance.ts";
export * from "./sim/labor.ts";
export * from "./sim/shifts.ts";
export * from "./sim/save.ts";
export * from "./sim/storage.ts";
export * from "./game.ts";
// Constantes runtime de types/* (no las typed-only)
export { STAGE_CONFIG } from "./types/mroStage.ts";
export {
  tierLabel, tierAllowsACheck, tierAllowsCCheck, tierAllowsDCheck,
  defaultSubscriptionHoursPerWeek, nextTierUp,
} from "./types/contract.ts";
export {
  createDepartureKPI, getTdrGlobal, getTdrForAirline,
  AOG_DELAY_THRESHOLD_MIN, AOG_ESCALATION_PENALTY_EUR,
  AOG_EVITABLE_PENALTY_MULT, AOG_EVITABLE_REP_MULT, isDelayCauseEvitable,
} from "./types/departureKPI.ts";
export {
  createHoursKPI, getHoursEfficiencyGlobal, getHoursEfficiencyForAirline,
  bookHoursForTemplate, hourlyRateEur, actualHoursForCompletedWo,
  recordWoCompletionInHoursKPI,
} from "./types/hoursKPI.ts";
// data
import workordersJson from "./data/workorders.json";
import airlinesJson from "./data/airlines.json";
import balanceJson from "./data/balance.json";
import maintenanceChecksJson from "./data/maintenance_checks.json";
import dailyChecksJson from "./data/daily_checks.json";
import woClassificationJson from "./data/wo_classification.json";

// Pivot iteración 2026-05-24 fix: bundle UI cargaba workorders.json y daily_checks.json
// SIN inyectar el campo `kind` (callout|mpd) que el loader runtime (data/index.ts) sí
// inyecta vía wo_classification.json. Esto hacía que rollWoOnLanding y
// rollDailyChecksOnOvernight filtraran por kind y obtuvieran 0 templates → 0 WOs emitidas
// en partidas reales (mientras los tests pasaban porque usan loadTemplates helper).
// Fix: replicar el merge aquí, en el bundle, para que DATA llegue ya enriquecida.
const _kindByWoId = new Map<string, "callout" | "mpd">();
{
  const arr = (woClassificationJson as { classifications?: unknown }).classifications;
  if (Array.isArray(arr)) {
    for (const entry of arr) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as { id?: unknown; kind?: unknown };
      if (typeof e.id !== "string") continue;
      if (e.kind !== "callout" && e.kind !== "mpd") continue;
      _kindByWoId.set(e.id, e.kind);
    }
  }
}
const _workOrdersWithKind = (workordersJson as Array<Record<string, unknown>>).map((wo) => {
  const id = typeof wo.id === "string" ? wo.id : "";
  const kind = _kindByWoId.get(id) ?? "callout"; // fallback defensivo: callouts son default
  return { ...wo, kind } as never;
});
const _dailyChecksWithKind = (dailyChecksJson as Array<Record<string, unknown>>).map((dc) => ({
  ...dc,
  kind: "mpd" as const,
} as never));

export const DATA = {
  workOrders: _workOrdersWithKind,
  airlines: airlinesJson,
  balance: balanceJson,
  maintenanceChecks: maintenanceChecksJson,
  dailyChecks: _dailyChecksWithKind,
};
