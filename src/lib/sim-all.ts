// Re-exporta todo el sim core en un solo bundle para esbuild IIFE.
export * from "./sim/rng.ts";
export * from "./sim/time.ts";
export * from "./sim/contracts.ts";
export * from "./sim/airplanes.ts";
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
// data
import workordersJson from "./data/workorders.json";
import airlinesJson from "./data/airlines.json";
import balanceJson from "./data/balance.json";
import maintenanceChecksJson from "./data/maintenance_checks.json";
import dailyChecksJson from "./data/daily_checks.json";
export const DATA = {
  workOrders: workordersJson,
  airlines: airlinesJson,
  balance: balanceJson,
  maintenanceChecks: maintenanceChecksJson,
  dailyChecks: dailyChecksJson,
};
