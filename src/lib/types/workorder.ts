// WorkOrder — verdad del dominio MRO.
// Template = catálogo estático (los 100 en data/workorders.json).
// Instance = lo que se genera en runtime cuando llega un avión y "se enferma".
// El template define QUÉ hacer; la instance trackea cómo va.

import type { AircraftModel, EngineVariant } from "./airplane";

/** Licencia EASA Part-66 que un mecánico puede tener. */
export type MechanicCategory = "B1" | "B2";

/** Severidad de la WO (afecta penalty, urgencia visual, probabilidad de aparición). */
export type Severity = "Minor" | "Major" | "Critical";

/** Origen de la WO según modelo HH + Tiers (2026-05-24).
 *  - `callout`: reactivo. Defecto/fallo reportado por tripulación o detectado en walkaround.
 *    Llega "al teléfono" del MRO de línea cuando un avión aterriza con problema.
 *    Únicas que pueden disparar `rollWoOnLanding`.
 *  - `mpd`: preventivo. Tarea programada por el Maintenance Planning Document del
 *    fabricante (interval horas vuelo / ciclos / calendario). Daily check, A-check,
 *    oil servicing, inspecciones recurrentes. Únicas que pueden disparar `rollDailyChecksOnOvernight`.
 *  Tier 1 → solo callouts + daily check mpd. Tier 2+ → suma packages mpd más pesados. */
export type WoKind = "callout" | "mpd";

/** Capítulo ATA (Air Transport Association). Numeración estándar de sistemas del avión. */
export type AtaChapter = number; // ej. 21 (ECS), 32 (Landing gear), 71 (Engine)

/** Categoría MEL (Minimum Equipment List) — define cuánto puede diferirse una WO antes
 *  de obligar a reparación o disparar penalty regulatoria.
 *  - A: 3 días
 *  - B: 10 días
 *  - C: 120 días
 *  - D: indefinido (hasta el próximo C-check)
 *  - null: NO diferible (debe arreglarse antes de salir el avión)
 *
 *  Las WOs `isAOG` SIEMPRE son null por mucho que el template diga otra cosa. */
export type MelCategory = "A" | "B" | "C" | "D" | null;

/** Lo que define un tipo de WO. 100 de estos en data/workorders.json. */
export interface WorkOrderTemplate {
  /** ID estable, prefijo "WO-" + número. Usado en saves. */
  id: string;
  /** Descripción humana breve (ej. "Replace cabin sunvisor RH"). */
  description: string;
  /** Capítulo ATA — agrupa por sistema del avión. */
  ata: AtaChapter;
  /** Categoría EASA requerida en el certifier. */
  requiredCategory: MechanicCategory;
  /** Duración estándar en minutos ingame. Tuneable en balance.json. */
  durationMinutes: number;
  /** Modelos compatibles. Vacío = todos. */
  aircraftModelsCompatibles: AircraftModel[];
  /** Variantes de motor compatibles. Vacío = todos. */
  engineVariantsCompatibles: EngineVariant[];
  /** Si la WO puede diferirse (MEL). Campo legacy, se mantiene por compat. Fase 3 I1 introduce
   *  `melCategory` que es la verdad nueva. La derivación cuando falta `melCategory` en datos
   *  legados está en `sim/mel.ts:deriveMelCategory()`. */
  deferrable: boolean;
  /** Categoría MEL. Opcional para retro-compat con `workorders.json` legacy — si falta se
   *  deriva con `deriveMelCategory()` a partir de (severity, isAOG, deferrable). */
  melCategory?: MelCategory;
  /** Severidad — afecta probabilidad de aparición y penalty. */
  severity: Severity;
  /** Si es AOG (Aircraft On Ground) — penalty x5, no diferible aunque deferrable. ~2-3% de Critical. */
  isAOG: boolean;
  /** Probabilidad relativa de aparición dentro de su severidad (1.0 = normal). */
  probability: number;
  /** Lista de piezas requeridas. MVP lo muestra como info, no bloquea. */
  partsRequired: string[];
  /** Lista de herramientas requeridas. MVP lo muestra como info, no bloquea. */
  toolsRequired: string[];
  /** Notas internas (no se muestran al jugador en MVP). */
  notes?: string;
  /** Si true, este template es un daily check (Fase 5A V3) — se genera al pernoctar el avión,
   *  no probabilísticamente al landing. Dataset separado en `data/daily_checks.json`. */
  isDailyCheck?: boolean;
  /** Origen del trabajo (callout = reactivo, mpd = preventivo). Inyectado por el loader
   *  a partir de `wo_classification.json` para workorders.json y forzado a `mpd` para
   *  daily_checks.json (todos son MPD por definición). Filtra qué templates pueden disparar
   *  cada generador (callout → `rollWoOnLanding`, mpd → `rollDailyChecksOnOvernight`). */
  kind: WoKind;
}

/** Fases por las que pasa una WO en runtime. */
export type WorkOrderPhase =
  | "ToPlane" // mecánico viajando del oficina al stand (timer abstracto, ~2min)
  | "Inspection" // 15% de duration
  | "MainTask" // 100% de duration (skip si direct dispatch)
  | "Test" // 10% de duration
  | "Rework" // 100% de duration (10% prob tras Test)
  | "Deferred" // diferida vía MEL — cuenta atrás hasta deferralExpiryMinute (I3+)
  | "Completed"
  | "Failed";

/** Instancia runtime de una WO concreta sobre un avión concreto. */
export interface WorkOrderInstance {
  /** ID único de la instancia (UUID). */
  instanceId: string;
  /** Referencia al template usado. */
  templateId: string;
  /** Registration del avión donde se hace la WO (display + UI). */
  airplaneRegistration: string;
  /** ID del landing event concreto al que pertenece esta WO. Desambigua cuando la
   *  misma matrícula tiene varios aterrizajes a lo largo de la partida. */
  airplaneInstanceId: string;
  /** Cuándo se emitió la WO (gameTime en minutos ingame desde inicio partida). */
  emissionMinute: number;
  /** Mecánicos asignados (certifier + 0-2 helpers). IDs internos. */
  assignedMechanicIds: string[];
  /** Fase actual. */
  phase: WorkOrderPhase;
  /** Minutos transcurridos dentro de la fase actual. */
  phaseElapsedMinutes: number;
  /** SLA: minuto absoluto en el que la WO empieza a generar penalty. = emissionMinute + durationMinutes × 1.05. */
  slaMinute: number;
  /** Si la WO ha sido diferida vía MEL — minuto absoluto en el que vence la deferral y la WO
   *  pasa a `Failed` con penalty regulatoria. Undefined si nunca se difirió.
   *  Para melCategory='D' (indefinida), se setea a un valor MUY alto (ver `MEL_DEFERRAL_DAYS`). */
  deferralExpiryMinute?: number;
  /** Pivot línea pura · Fase C (2026-05-24): si esta WO es un FINDING generado durante
   *  una daily check subtask, lleva el instanceId del WO padre (la DC-* que lo originó).
   *  Útil para trazar y para que la UI agrupe findings con su daily check origen. */
  parentWoInstanceId?: string;
  /** Pivot línea pura · Fase 2 (2026-05-24): causa raíz del delay si la WO terminó tarde.
   *  Determinado al momento del completion / departure. Usado por el sistema AOG
   *  escalation para decidir penalty evitable vs no evitable. */
  delayRootCause?: "mec_busy" | "mec_offshift" | "no_rated_cert" | "external_event" | "aog_inevitable" | "other";
}

// ---- Type guards ----

const VALID_CATEGORIES = new Set<MechanicCategory>(["B1", "B2"]);
const VALID_SEVERITIES = new Set<Severity>(["Minor", "Major", "Critical"]);
const VALID_KINDS = new Set<WoKind>(["callout", "mpd"]);

/** Valida que un objeto desconocido cumple la shape de WorkOrderTemplate. */
export function isWorkOrderTemplate(x: unknown): x is WorkOrderTemplate {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.description === "string" &&
    typeof o.ata === "number" &&
    typeof o.requiredCategory === "string" &&
    VALID_CATEGORIES.has(o.requiredCategory as MechanicCategory) &&
    typeof o.durationMinutes === "number" &&
    o.durationMinutes > 0 &&
    Array.isArray(o.aircraftModelsCompatibles) &&
    Array.isArray(o.engineVariantsCompatibles) &&
    typeof o.deferrable === "boolean" &&
    typeof o.severity === "string" &&
    VALID_SEVERITIES.has(o.severity as Severity) &&
    typeof o.isAOG === "boolean" &&
    typeof o.probability === "number" &&
    Array.isArray(o.partsRequired) &&
    Array.isArray(o.toolsRequired) &&
    typeof o.kind === "string" &&
    VALID_KINDS.has(o.kind as WoKind)
  );
}
