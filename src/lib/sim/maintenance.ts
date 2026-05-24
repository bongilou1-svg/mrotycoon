// Lógica del sistema A/C/D check (base maintenance).
//
// H2: helpers básicos (lookup, ID generator, instanciación Scheduled).
// H3: detección automática de checks debidos (FH o cycles cruzaron umbral) y schedule.
// H4-H7: stand BaseMaintenance, asignación de mecánicos, billing — pendientes.

import type {
  AircraftModel,
  CheckDefinition,
  CheckType,
  FleetAircraft,
  MaintenanceCheckInstance,
  Mechanic,
} from "$lib/types";
import { BASE_STAND_IDS } from "./stands.ts";
import { DAY_MINUTES } from "./time.ts";

let mcCounter = 0;

/** Reset del contador (tests + new game + save load). */
export function resetMaintenanceCheckCounter(value = 0): void {
  mcCounter = value;
}

/** Getter para serialización. */
export function getMaintenanceCheckCounter(): number {
  return mcCounter;
}

/** Genera el próximo ID "MC-NNNNNN". */
export function nextMaintenanceCheckId(): string {
  mcCounter += 1;
  return `MC-${mcCounter.toString().padStart(6, "0")}`;
}

/** Busca la definición de check para un (type, model). Devuelve undefined si no existe. */
export function findCheckDefinition(
  defs: readonly CheckDefinition[],
  type: CheckType,
  model: AircraftModel,
): CheckDefinition | undefined {
  return defs.find((d) => d.type === type && d.model === model);
}

/**
 * Crea una instancia Scheduled de un check sobre una matrícula concreta. Congela los
 * snapshots de manDays/baseFee/parkingDays en este punto.
 */
export function scheduleCheck(
  registration: string,
  type: CheckType,
  model: AircraftModel,
  defs: readonly CheckDefinition[],
  nowMinute: number,
): MaintenanceCheckInstance {
  const def = findCheckDefinition(defs, type, model);
  if (!def) throw new Error(`No CheckDefinition para type=${type} model=${model}`);
  return {
    instanceId: nextMaintenanceCheckId(),
    registration,
    type,
    scheduledMinute: nowMinute,
    standId: "",
    phase: "Scheduled",
    assignedMechanicIds: [],
    manMinutesAccumulated: 0,
    manDaysIdeal: def.manDays,
    baseFee: def.baseFee,
    parkingDays: def.parkingDays,
    overrunDaysPenalized: 0,
  };
}

const ALL_TYPES: readonly CheckType[] = ["A", "C", "D"];

/** Devuelve los contadores (FH, cycles) que cuentan para un type concreto. */
function fhCyclesForType(f: FleetAircraft, type: CheckType): { fh: number; cycles: number } {
  if (type === "A") return { fh: f.fhSinceLastA, cycles: f.cyclesSinceLastA };
  if (type === "C") return { fh: f.fhSinceLastC, cycles: f.cyclesSinceLastC };
  return { fh: f.fhSinceLastD, cycles: f.cyclesSinceLastD };
}

/**
 * Detecta qué checks habría que schedular. Para cada (FleetAircraft, type) que YA NO tenga
 * un check activo (Scheduled o InProgress) de ese tipo y haya cruzado triggerFH O triggerCycles,
 * devuelve la lista de candidatos.
 *
 * Decisión: A/C/D son independientes — un avión puede tener simultáneamente A scheduled y C
 * scheduled. En la realidad un C-check engloba el A pero esa optimización entra en Fase 4.
 */
export function detectChecksDue(
  fleet: readonly FleetAircraft[],
  defs: readonly CheckDefinition[],
  existingChecks: readonly MaintenanceCheckInstance[],
): Array<{ registration: string; type: CheckType; model: AircraftModel }> {
  const activeByReg = new Map<string, Set<CheckType>>();
  for (const c of existingChecks) {
    if (c.phase === "Completed" || c.phase === "Cancelled") continue;
    let set = activeByReg.get(c.registration);
    if (!set) {
      set = new Set();
      activeByReg.set(c.registration, set);
    }
    set.add(c.type);
  }
  const due: Array<{ registration: string; type: CheckType; model: AircraftModel }> = [];
  for (const f of fleet) {
    const existing = activeByReg.get(f.registration);
    for (const type of ALL_TYPES) {
      if (existing && existing.has(type)) continue;
      const def = findCheckDefinition(defs, type, f.model);
      if (!def) continue;
      const { fh, cycles } = fhCyclesForType(f, type);
      if (fh >= def.triggerFH || cycles >= def.triggerCycles) {
        due.push({ registration: f.registration, type, model: f.model });
      }
    }
  }
  return due;
}

/** FH de margen para emitir aviso anticipado de check. */
export const CHECK_WARNING_FH_MARGIN = 50;

/**
 * Detecta matrículas que están a ≤ CHECK_WARNING_FH_MARGIN FH de cruzar un trigger (sin tener
 * ya un check activo del mismo tipo). Devuelve los "casi" para que la UI pueda avisar.
 */
export function detectChecksUpcoming(
  fleet: readonly FleetAircraft[],
  defs: readonly CheckDefinition[],
  existingChecks: readonly MaintenanceCheckInstance[],
): Array<{ registration: string; type: CheckType; remainingFH: number }> {
  const activeByReg = new Map<string, Set<CheckType>>();
  for (const c of existingChecks) {
    if (c.phase === "Completed" || c.phase === "Cancelled") continue;
    let set = activeByReg.get(c.registration);
    if (!set) {
      set = new Set();
      activeByReg.set(c.registration, set);
    }
    set.add(c.type);
  }
  const out: Array<{ registration: string; type: CheckType; remainingFH: number }> = [];
  for (const f of fleet) {
    const existing = activeByReg.get(f.registration);
    for (const type of ALL_TYPES) {
      if (existing && existing.has(type)) continue;
      const def = findCheckDefinition(defs, type, f.model);
      if (!def) continue;
      const { fh } = fhCyclesForType(f, type);
      const remaining = def.triggerFH - fh;
      if (remaining > 0 && remaining <= CHECK_WARNING_FH_MARGIN) {
        out.push({ registration: f.registration, type, remainingFH: remaining });
      }
    }
  }
  return out;
}

/**
 * Helper para H3: detecta checks debidos sobre `fleet`, los schedula y devuelve la lista
 * combinada (existentes + nuevos). No muta `existingChecks`.
 */
export function scheduleDueChecks(
  fleet: readonly FleetAircraft[],
  defs: readonly CheckDefinition[],
  existingChecks: readonly MaintenanceCheckInstance[],
  nowMinute: number,
): { checks: MaintenanceCheckInstance[]; newlyScheduled: MaintenanceCheckInstance[] } {
  const due = detectChecksDue(fleet, defs, existingChecks);
  const newlyScheduled: MaintenanceCheckInstance[] = due.map((d) =>
    scheduleCheck(d.registration, d.type, d.model, defs, nowMinute),
  );
  return { checks: [...existingChecks, ...newlyScheduled], newlyScheduled };
}

// -------- Tick del sistema de checks (H6) --------
//
// Decisiones MVP, documentadas porque son simplificaciones conscientes:
//  - 1 base check a la vez (BASE_STAND_IDS tiene tamaño 1 en MVP).
//  - manDay = 1440 min (24h-equivalent), no 480 min (8h). Es decir, asumimos que los
//    mecánicos asignados a un base check trabajan "in shift" durante el parking entero
//    (turno único contínuo). En Fase 4 (Bloque L turnos) refinamos.
//  - El avión "aparece" en el base stand al transicionar Scheduled→InProgress; no hay
//    ferrying desde el contrato de línea. Abstracción razonable para MVP.
//  - Auto-asignación de team: min(idleMechanics, ceil(manDays/parkingDays)). Manual en Fase 4.
//  - Late penalty: -5000 €/día completo de overrun. Se devenga día a día, no al cierre.

/** Minutos de trabajo necesarios para 1 manDay según la convención MVP (24h equivalent). */
export const MANDAY_MINUTES = DAY_MINUTES;
/** Penalty por día completo de overrun, € escalado por tipo (Fase 4 audit Dani):
 *   - A-check 1.500 €/día (A overnight, overrun 3d = 4.5k vs fee 12k = 38%).
 *   - C-check 5.000 €/día (estándar; era el valor previo único).
 *   - D-check 15.000 €/día (D overhaul mayor, overrun 5d = 75k = significativo).
 *
 *  La constante `LATE_CHECK_PENALTY_PER_DAY = 5000` se mantiene para backward compat con
 *  tests legacy que la importan (mappea al valor C-check). Para penalty real: usar
 *  `latePenaltyForType(type)`. */
export const LATE_CHECK_PENALTY_PER_DAY = 5000;
export const LATE_CHECK_PENALTY_BY_TYPE: Record<"A" | "C" | "D", number> = {
  A: 1500,
  C: 5000,
  D: 15000,
};
export function latePenaltyForType(type: "A" | "C" | "D"): number {
  return LATE_CHECK_PENALTY_BY_TYPE[type];
}

export type MaintenanceEvent =
  | { type: "check_started"; checkInstanceId: string; registration: string; checkType: CheckType; teamSize: number }
  | { type: "check_completed"; checkInstanceId: string; registration: string; checkType: CheckType; baseFee: number; overrunDays: number }
  | { type: "check_overrun_day"; checkInstanceId: string; registration: string; checkType: CheckType; cumulativeOverrunDays: number; penalty: number };

export interface MaintenanceTickResult {
  checks: MaintenanceCheckInstance[];
  mechanics: Mechanic[];
  fleet: FleetAircraft[];
  events: MaintenanceEvent[];
}

/** Team size auto-asignado para un check, dado idle disponible. */
function autoTeamSize(manDaysIdeal: number, parkingDays: number, idleCount: number): number {
  const ideal = Math.max(1, Math.ceil(manDaysIdeal / parkingDays));
  return Math.min(idleCount, ideal);
}

/** Devuelve los `n` primeros mecánicos Idle del array (orden estable). */
function takeIdle(mechanics: readonly Mechanic[], n: number): Mechanic[] {
  const out: Mechanic[] = [];
  for (const m of mechanics) {
    if (m.state === "Idle" && out.length < n) out.push(m);
  }
  return out;
}

/** Marca cycles+FH de la matrícula como "recién hecho ese check" (reset a 0).
 *  También baja el flag warned correspondiente para que el aviso pueda re-emitirse
 *  en la siguiente ventana. */
function resetCheckCountersOnFleet(
  fleet: readonly FleetAircraft[],
  registration: string,
  type: CheckType,
): FleetAircraft[] {
  return fleet.map((f) => {
    if (f.registration !== registration) return f;
    if (type === "A") return { ...f, fhSinceLastA: 0, cyclesSinceLastA: 0, warnedA: false };
    if (type === "C") return { ...f, fhSinceLastC: 0, cyclesSinceLastC: 0, warnedC: false };
    return { ...f, fhSinceLastD: 0, cyclesSinceLastD: 0, warnedD: false };
  });
}

/**
 * Tick principal del sistema de checks. Maneja:
 *  1. Transición Scheduled → InProgress cuando hay BaseStand libre + mecánicos.
 *  2. Acumulación de manMinutes para los InProgress.
 *  3. Detección de overrun (penalty por día).
 *  4. Transición InProgress → Completed cuando se cumple el doble criterio
 *     (manMinutes ≥ manDaysIdeal × MANDAY_MINUTES  Y  elapsed ≥ parkingDays × DAY_MINUTES).
 *
 * Inmutable: devuelve nuevas refs para checks/mechanics/fleet.
 */
/** Fase 5C X5: si un A-check usa LINE_STAND (no hay base libre + platformAllowed), la
 *  eficiencia de trabajo cae a 70% (tarda ~43% más en acumular manMinutes). C y D-check
 *  siempre requieren BaseStand. */
export const PLATFORM_A_CHECK_EFFICIENCY = 0.7;

export function tickMaintenanceChecks(
  checks: readonly MaintenanceCheckInstance[],
  mechanics: readonly Mechanic[],
  fleet: readonly FleetAircraft[],
  stepMinutes: number,
  nowMinute: number,
  /** Fase 5A X: base stands disponibles según `mroStage`. Default a `BASE_STAND_IDS`
   *  (stage 1, comportamiento legacy). */
  baseStandIds: readonly string[] = BASE_STAND_IDS,
  /** Fase 5C X5: line stands disponibles, para A-checks "en plataforma" cuando no hay
   *  BaseStand libre y `platformACheckAllowed` true (stage ≥ 2). */
  lineStandIds: readonly string[] = [],
  /** Fase 5C X5: si true, A-checks pueden arrancar en LINE_STAND con penalty calidad. */
  platformACheckAllowed: boolean = false,
): MaintenanceTickResult {
  const events: MaintenanceEvent[] = [];
  let workingMechanics: Mechanic[] = [...mechanics];
  let workingFleet: FleetAircraft[] = [...fleet];

  // 1. Stands base ocupados ahora mismo (por checks InProgress que aún no han cerrado).
  const occupiedStands = new Set<string>(
    checks.filter((c) => c.phase === "InProgress").map((c) => c.standId),
  );

  // 2. Procesar checks en orden de scheduledMinute (FIFO para starts).
  const sorted = [...checks].sort((a, b) => a.scheduledMinute - b.scheduledMinute);
  const updatedChecks: MaintenanceCheckInstance[] = sorted.map((c) => {
    // --- Scheduled: intentar empezar ---
    if (c.phase === "Scheduled") {
      let freeStand = baseStandIds.find((sid) => !occupiedStands.has(sid));
      let onPlatform = false;
      // Fase 5C X5: si A-check y no hay base libre, permitir LINE_STAND si platformAllowed.
      if (!freeStand && c.type === "A" && platformACheckAllowed && lineStandIds.length > 0) {
        freeStand = lineStandIds.find((sid) => !occupiedStands.has(sid));
        if (freeStand) onPlatform = true;
      }
      if (!freeStand) return c; // sin stand libre, sigue esperando
      const idle = workingMechanics.filter((m) => m.state === "Idle");
      if (idle.length === 0) return c;
      const teamSize = autoTeamSize(c.manDaysIdeal, c.parkingDays, idle.length);
      const team = takeIdle(workingMechanics, teamSize);
      const teamIds = new Set(team.map((m) => m.id));
      // Aceptar el stand y marcar a los mecánicos como Working + assignedCheckInstanceId
      occupiedStands.add(freeStand);
      workingMechanics = workingMechanics.map((m) =>
        teamIds.has(m.id)
          ? { ...m, state: "Working" as const, assignedWoInstanceId: null, assignedCheckInstanceId: c.instanceId, stateRemainingMinutes: 0 }
          : m,
      );
      events.push({
        type: "check_started",
        checkInstanceId: c.instanceId,
        registration: c.registration,
        checkType: c.type,
        teamSize: team.length,
      });
      // Fase 5B V5: marcar si arranca en franja nocturna (22:00-06:00) para auditoría.
      const hourOfDay = Math.floor((nowMinute % DAY_MINUTES) / 60);
      const nightStarted = hourOfDay >= 22 || hourOfDay < 6;
      return {
        ...c,
        phase: "InProgress" as const,
        standId: freeStand,
        startedMinute: nowMinute,
        assignedMechanicIds: team.map((m) => m.id),
        nightStarted: nightStarted || undefined,
        onPlatform: onPlatform || undefined,
      };
    }

    // --- InProgress: acumular manMinutes + comprobar overrun + comprobar finalización ---
    if (c.phase === "InProgress") {
      const teamCount = c.assignedMechanicIds.length;
      // Fase 5C X5: A-check en plataforma → eficiencia 0.7× (tarda ~43% más en acumular).
      const platformPenalty = c.onPlatform ? PLATFORM_A_CHECK_EFFICIENCY : 1.0;
      const manMinutesAccumulated = c.manMinutesAccumulated + teamCount * stepMinutes * platformPenalty;
      const startedAt = c.startedMinute ?? nowMinute;
      const elapsed = nowMinute - startedAt;
      const requiredManMinutes = c.manDaysIdeal * MANDAY_MINUTES;
      const requiredParkingMinutes = c.parkingDays * DAY_MINUTES;

      // Overrun: días completos pasados de parkingDays que aún no se han penalizado.
      let overrunDaysPenalized = c.overrunDaysPenalized;
      if (elapsed > requiredParkingMinutes) {
        const overrunDays = Math.floor((elapsed - requiredParkingMinutes) / DAY_MINUTES);
        while (overrunDaysPenalized < overrunDays) {
          overrunDaysPenalized += 1;
          events.push({
            type: "check_overrun_day",
            checkInstanceId: c.instanceId,
            registration: c.registration,
            checkType: c.type,
            cumulativeOverrunDays: overrunDaysPenalized,
            penalty: latePenaltyForType(c.type),
          });
        }
      }

      // ¿Completa? Doble criterio.
      const workDone = manMinutesAccumulated >= requiredManMinutes;
      const parkingDone = elapsed >= requiredParkingMinutes;
      if (workDone && parkingDone) {
        // Liberar mecánicos a Idle (cero travel, son base hangar).
        const teamIds = new Set(c.assignedMechanicIds);
        workingMechanics = workingMechanics.map((m) =>
          teamIds.has(m.id)
            ? { ...m, state: "Idle" as const, assignedWoInstanceId: null, assignedCheckInstanceId: null, stateRemainingMinutes: 0 }
            : m,
        );
        occupiedStands.delete(c.standId);
        // Resetear contadores per-type del FleetAircraft afectado.
        workingFleet = resetCheckCountersOnFleet(workingFleet, c.registration, c.type);
        events.push({
          type: "check_completed",
          checkInstanceId: c.instanceId,
          registration: c.registration,
          checkType: c.type,
          baseFee: c.baseFee,
          overrunDays: overrunDaysPenalized,
        });
        return {
          ...c,
          phase: "Completed" as const,
          completedMinute: nowMinute,
          manMinutesAccumulated,
          overrunDaysPenalized,
        };
      }

      return {
        ...c,
        manMinutesAccumulated,
        overrunDaysPenalized,
      };
    }

    return c; // Completed | Cancelled — no cambios
  });

  return {
    checks: updatedChecks,
    mechanics: workingMechanics,
    fleet: workingFleet,
    events,
  };
}
