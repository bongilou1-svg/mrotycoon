// Fase 5D · P-α: sync layer.
//
// Convierte GameState en RenderState puro y serializable. NO importa Pixi ni DOM.
// Tests deterministas en `tests/render_sync.mjs`.

import { canUnlockHangars, type GameState } from "../game.ts";
import { currentStands } from "../sim/stands.ts";
import { runwayClosedAt } from "../sim/events.ts";
import { DAY_MINUTES } from "../sim/time.ts";
import type { RenderAirplane, RenderMechanic, RenderStand, RenderState, TimeOfDay } from "./types.ts";

/** Día: 06:00-21:59. Noche: 22:00-05:59. Alineado con el badge HUD ☀️/🌙 ya existente. */
export function timeOfDayFor(minute: number): TimeOfDay {
  const hourOfDay = Math.floor((minute % DAY_MINUTES) / 60);
  return hourOfDay >= 6 && hourOfDay < 22 ? "day" : "night";
}

/** P-γ: cuánto dura visualmente el taxi (pista → stand) tras el arrival. No tiene
 *  efecto en el sim — solo controla cuándo el driver muestra el avión "taxiándose" en
 *  motion path frente a "parado en stand". */
export const TAXIING_DURATION_MIN = 4;

export function buildRenderState(g: GameState): RenderState {
  const stage = g.mroStage;
  const stands = currentStands(stage);

  // Filtramos por ventana física [arrivalMinute, scheduledDepartureMinute) en lugar de
  // confiar en `status`: el campo `Departed` no se actualiza automáticamente en advanceGame
  // (deuda pre-F5D), así que la única verdad fiable de presencia es la ventana de vuelo.
  const now = g.clock.minute;
  const airplanes: RenderAirplane[] = g.airplanes
    .filter((a) => a.arrivalMinute <= now && a.scheduledDepartureMinute > now)
    .map((a) => {
      const contract = g.contracts.find((c) => c.id === a.contractId);
      const taxiAge = now - a.arrivalMinute;
      const taxiing = taxiAge >= 0 && taxiAge < TAXIING_DURATION_MIN;
      const taxiProgress = TAXIING_DURATION_MIN > 0
        ? Math.max(0, Math.min(1, taxiAge / TAXIING_DURATION_MIN))
        : 1;
      return {
        instanceId: a.instanceId,
        registration: a.registration,
        standId: a.standId || null,
        airlineId: contract?.airlineId ?? "",
        status: a.status,
        overnight: a.overnight ?? false,
        taxiing,
        taxiProgress,
      };
    });

  // Index aviones por stand para lookup O(1).
  const airplaneByStand = new Map<string, string>();
  for (const a of airplanes) {
    if (a.standId) airplaneByStand.set(a.standId, a.instanceId);
  }
  // Checks InProgress por stand.
  const checkByStand = new Map<string, { onPlatform: boolean }>();
  for (const c of g.maintenanceChecks) {
    if (c.phase === "InProgress" && c.standId) {
      checkByStand.set(c.standId, { onPlatform: c.onPlatform ?? false });
    }
  }

  const renderStands: RenderStand[] = stands.map((s) => {
    const check = checkByStand.get(s.id);
    return {
      id: s.id,
      type: s.type,
      airplaneInstanceId: airplaneByStand.get(s.id) ?? null,
      checkInProgress: !!check,
      checkOnPlatform: check?.onPlatform ?? false,
    };
  });

  // Mecs visibles. Para cada uno con destino, resolvemos el standId destino vía
  // assignedWoInstanceId → airplane.standId, o vía assignedCheckInstanceId → check.standId.
  // P-γ: progress 0..1 para interpolación del furgo en motion path oficina→stand.
  const travelMin = (g.balance.officeToStandMinutes ?? 2) || 1;
  const mechanics: RenderMechanic[] = g.mechanics.map((m) => {
    let destStandId: string | null = null;
    if (m.assignedWoInstanceId) {
      const wo = g.workOrders.find((w) => w.instanceId === m.assignedWoInstanceId);
      if (wo) {
        const ap = g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
        destStandId = ap?.standId || null;
      }
    } else if (m.assignedCheckInstanceId) {
      const chk = g.maintenanceChecks.find((c) => c.instanceId === m.assignedCheckInstanceId);
      destStandId = chk?.standId || null;
    }
    let progress = 0;
    if (m.state === "ToPlane" || m.state === "Returning") {
      progress = Math.max(0, Math.min(1, 1 - m.stateRemainingMinutes / travelMin));
    } else if (m.state === "Working") {
      progress = 1;
    }
    return {
      id: m.id,
      name: m.name,
      state: m.state,
      destStandId,
      progress,
    };
  });

  return {
    minute: g.clock.minute,
    timeOfDay: timeOfDayFor(g.clock.minute),
    mroStage: stage,
    airplanes,
    stands: renderStands,
    mechanics,
    runwayClosed: runwayClosedAt(g.randomEvents, g.clock.minute),
    // En lineMode el unlock depende de progreso (rep+balance+contratos). En legacy
    // los plots ghost están siempre disponibles (comportamiento pre-pivot).
    hangarBuildUnlocked: g.lineModeEnabled ? canUnlockHangars(g) : true,
  };
}
