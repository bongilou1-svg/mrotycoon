// Re-exports centralizados para acceso cómodo desde stores/sim/ui.

export type {
  WorkOrderTemplate,
  WorkOrderInstance,
  WorkOrderPhase,
  MechanicCategory,
  Severity,
  AtaChapter,
  MelCategory,
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
