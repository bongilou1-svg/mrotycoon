// Sistema de eventos aleatorios — Fase 5C.
//
// `tickRandomEvents` se llama una vez por día ingame (al cruzar barrera de día). Cada día:
//  - Probabilidad RUNWAY_CLOSURE_DAILY_PROB de runway closure (4-8h en ventana operativa).
//  - Probabilidad SERVICE_BULLETIN_DAILY_PROB de SB sobre un modelo+motor (1-2 aviones afectados).
//
// Determinista usando `rng` (NO marketRng — los eventos son trayectoria principal).

import type {
  RandomEvent, RunwayClosureEvent, ServiceBulletinEvent, FleetAircraft,
} from "$lib/types";
import { randInt, randPick, type Rng } from "./rng.ts";
import { DAY_MINUTES } from "./time.ts";

export const RUNWAY_CLOSURE_DAILY_PROB = 0.06; // 6% prob/día
export const SERVICE_BULLETIN_DAILY_PROB = 0.04; // 4% prob/día

/** Razones de cierre de pista (variedad textual). */
const CLOSURE_REASONS = [
  "Tormenta eléctrica en la zona",
  "Inspección rutinaria de pista",
  "Incidente menor en otra aeronave (sin daños)",
  "Niebla persistente",
  "Mantenimiento de iluminación de pista",
  "Restos de pájaros en pista (FOD)",
];

/** Descripciones de SB Airbus (templates flavor). */
const SB_DESCRIPTIONS = [
  { ata: 32, desc: "SB Airbus: revisión preventiva tren principal (ATA 32)" },
  { ata: 49, desc: "SB Airbus: actualización software APU (ATA 49)" },
  { ata: 21, desc: "SB Airbus: inspección ducting climatización (ATA 21)" },
  { ata: 73, desc: "SB Airbus: ajuste EEC firmware engine (ATA 73)" },
  { ata: 24, desc: "SB Airbus: revisión generador AC primario (ATA 24)" },
];

let _eventCounter = 0;
export function _resetEventCounter(v = 0): void { _eventCounter = v; }
function nextEventId(): string {
  _eventCounter += 1;
  return `EV-${_eventCounter.toString().padStart(6, "0")}`;
}

/** Genera N eventos del día. Llamar UNA vez por día ingame. */
export function rollDailyEvents(
  rng: Rng,
  dayNumber: number,
  fleet: readonly FleetAircraft[],
): RandomEvent[] {
  const out: RandomEvent[] = [];
  const dayStart = (dayNumber - 1) * DAY_MINUTES;

  // 1. Runway closure
  if (rng.next() < RUNWAY_CLOSURE_DAILY_PROB) {
    // Ventana 4-8h, dentro del día operativo (08:00-20:00).
    const durationHours = randInt(rng, 4, 8);
    const startHourOfDay = randInt(rng, 8, 20 - durationHours);
    const start = dayStart + startHourOfDay * 60;
    const end = start + durationHours * 60;
    const reason = randPick(rng, CLOSURE_REASONS);
    const ev: RunwayClosureEvent = {
      id: nextEventId(),
      type: "runway_closure",
      startMinute: start,
      endMinute: end,
      reason,
    };
    out.push(ev);
  }

  // 2. Service Bulletin
  if (fleet.length > 0 && rng.next() < SERVICE_BULLETIN_DAILY_PROB) {
    const sbDesc = randPick(rng, SB_DESCRIPTIONS);
    const models: Array<"A320" | "A321"> = ["A320", "A321"];
    const engines: Array<"CFM56" | "V2500" | "any"> = ["CFM56", "V2500", "any"];
    const model = randPick(rng, models);
    const engineVariant = randPick(rng, engines);
    // Filtrar flota compatible
    const candidates = fleet.filter((f) =>
      f.model === model && (engineVariant === "any" || f.engineVariant === engineVariant),
    );
    if (candidates.length > 0) {
      // 1-2 aviones random
      const count = Math.min(candidates.length, randInt(rng, 1, 2));
      const affected: string[] = [];
      const pool = [...candidates];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = Math.floor(rng.next() * pool.length);
        affected.push(pool[idx].registration);
        pool.splice(idx, 1);
      }
      const now = dayStart + 9 * 60; // 09:00 anuncio típico
      const ev: ServiceBulletinEvent = {
        id: nextEventId(),
        type: "service_bulletin",
        startMinute: now,
        endMinute: now, // puntual
        model,
        engineVariant,
        affectedRegistrations: affected,
        description: sbDesc.desc,
      };
      out.push(ev);
    }
  }

  return out;
}

/** ¿La pista está cerrada en este momento? (skip de arrivals). */
export function runwayClosedAt(events: readonly RandomEvent[], nowMinute: number): boolean {
  return events.some((e) => e.type === "runway_closure" && nowMinute >= e.startMinute && nowMinute < e.endMinute);
}

/** Lista de eventos vivos (no terminados). */
export function activeEvents(events: readonly RandomEvent[], nowMinute: number): RandomEvent[] {
  return events.filter((e) => e.endMinute >= nowMinute || (e.type === "service_bulletin" && !e.cleanedUp));
}

// MVP: SB se notifica + queda en lista de eventos. Aterrizaje siguiente con WO real es Fase 6.
