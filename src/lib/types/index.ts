// Re-exports centralizados para acceso cómodo desde stores/sim/ui.

export type {
  WorkOrderTemplate,
  WorkOrderInstance,
  WorkOrderPhase,
  MechanicCategory,
  Severity,
  AtaChapter,
  MelCategory,
  WoKind,
} from "./workorder";
export { isWorkOrderTemplate } from "./workorder";

export type {
  AircraftModel,
  EngineVariant,
  AirplaneStatus,
  AirplaneInstance,
  AirplaneInstance as Airplane,
} from "./airplane";

export type { Airline } from "./airline";
export type { Contract, ContractStatus } from "./contract";
export type { Mechanic, MechanicState, TypeRating, ShiftSlot } from "./mechanic";
export type { Crew } from "./crew";
export type { Balance } from "./balance";
export type { FleetAircraft } from "./fleet";
export type {
  CheckType,
  CheckDefinition,
  CheckPhase,
  MaintenanceCheckInstance,
} from "./maintenance";
export type { ComplianceState } from "./compliance";
export type { Candidate } from "./candidate";
export type { MroStage, StageConfig, ActiveBuild } from "./mroStage";
export { STAGE_CONFIG } from "./mroStage";
export type { ContractTier } from "./contract";
export type {
  RandomEventType, RandomEvent, RandomEventBase, RunwayClosureEvent, ServiceBulletinEvent,
} from "./randomEvent";
export type { DepartureAirlineBucket, DepartureKPI } from "./departureKPI";
export {
  createDepartureKPI, getTdrGlobal, getTdrForAirline,
  getTdrPct, getTdrPctForAirline, createAirlineBucket,
  DISPATCH_COTA_15, DISPATCH_COTA_60,
  AOG_DELAY_THRESHOLD_MIN, AOG_ESCALATION_PENALTY_EUR,
  AOG_EVITABLE_PENALTY_MULT, AOG_EVITABLE_REP_MULT, isDelayCauseEvitable,
} from "./departureKPI";
export type { DelayRootCause } from "./departureKPI";
export type { HoursAirlineBucket, HoursKPI } from "./hoursKPI";
export {
  createHoursKPI, getHoursEfficiencyGlobal, getHoursEfficiencyForAirline,
  bookHoursForTemplate, hourlyRateEur, actualHoursForCompletedWo,
  recordWoCompletionInHoursKPI,
} from "./hoursKPI";
