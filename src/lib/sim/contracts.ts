// Sistema de contratos. Funciones puras sobre listas inmutables.

import type { Contract, ContractTier, Airline } from "$lib/types";
import { randInt, randFloat, type Rng } from "./rng.ts";

// ---- Tier system (Fase 4.5) ----

/** Multiplicadores económicos por tier (sobre los rangos standard). */
export const TIER_FEE_MULT: Record<ContractTier, number> = {
  standard: 1.0,
  premium: 1.35,
  deluxe: 1.75,
};

/** Multiplicador de penalty/min por tier (deluxe es más exigente con el SLA). */
export const TIER_PENALTY_MULT: Record<ContractTier, number> = {
  standard: 1.0,
  premium: 1.0,
  deluxe: 1.5,
};

/** Suma a `minReputation` por tier (premium exige más rep, deluxe mucho más). */
export const TIER_MIN_REP_BONUS: Record<ContractTier, number> = {
  standard: 0,
  premium: 20,
  deluxe: 45,
};

/**
 * Decide el tier que va a ofertar una aerolínea según su rep con el MRO.
 *  - rep < 55: solo standard.
 *  - rep 55-79: 70% standard / 30% premium.
 *  - rep ≥ 80: 50% standard / 35% premium / 15% deluxe.
 */
export function pickTierForRep(rng: Rng, airlineRep: number): ContractTier {
  if (airlineRep < 55) return "standard";
  const r = rng.next();
  if (airlineRep < 80) return r < 0.7 ? "standard" : "premium";
  if (r < 0.5) return "standard";
  if (r < 0.85) return "premium";
  return "deluxe";
}

/** Duración de ofertas iniciales antes de expirar (en minutos ingame). */
export const OFFER_EXPIRY_MINUTES = 3 * 24 * 60; // 3 días

export interface ContractGenParams {
  /** Reputación actual del jugador — afecta calidad de ofertas. */
  reputation: number;
  /** Minuto actual ingame. */
  nowMinute: number;
}

/**
 * Genera términos económicos para un contrato. Más reputación → mejores fees + más exigencia.
 */
export function rollContractTerms(rng: Rng, params: ContractGenParams, tier: ContractTier = "standard") {
  // Escala "calidad" 0-1 a partir de reputación 0-100. Min reputation 50 = base.
  const repFactor = Math.max(0.6, Math.min(1.4, params.reputation / 50));
  const feeMult = TIER_FEE_MULT[tier];
  const penaltyMult = TIER_PENALTY_MULT[tier];
  const minRepBonus = TIER_MIN_REP_BONUS[tier];

  // Rangos base (standard, calibrados en Fase 4 Q6 iter 4):
  //   baseFee 12-22k, payment 50-72 €/min, penalty 3-8 €/min, minRep 35-55 + escala rep.
  // Fase 4.5: multiplicadores tier escalan fees/penalty/minRep.
  const baseFeePerWeek = Math.round(randInt(rng, 12000, 22000) * repFactor * feeMult);
  const paymentPerWOMinute = Math.round(randFloat(rng, 50, 72) * repFactor * feeMult);
  const penaltyPerLateMinute = Math.round(randFloat(rng, 3, 8) * repFactor * penaltyMult);
  const minReputation = Math.max(0, Math.min(95, Math.round(randInt(rng, 35, 55) + (repFactor - 1) * 15) + minRepBonus));
  const expectedLandingsPerDay = randInt(rng, 3, 9);

  return { baseFeePerWeek, paymentPerWOMinute, penaltyPerLateMinute, minReputation, expectedLandingsPerDay, tier };
}

/**
 * Estado inicial al new game: 1 contrato activo (de la primera aerolínea) + 2 ofertados.
 * Legacy — usado por tests pre-pivot. El nuevo arranque del juego usa
 * `generateInitialContractsLine` (1 activo, sin ofertas).
 */
export function generateInitialContracts(rng: Rng, airlines: readonly Airline[]): Contract[] {
  if (airlines.length < 3) {
    throw new Error("Need at least 3 airlines for initial contracts");
  }
  const out: Contract[] = [];

  // 1 activo (primera aerolínea — la "amistosa" de arranque)
  const activeTerms = rollContractTerms(rng, { reputation: 50, nowMinute: 0 });
  out.push({
    id: "C-001",
    airlineId: airlines[0].id,
    status: "active",
    offeredAtMinute: 0,
    ...activeTerms,
  });

  // 2 ofertados (siguientes aerolíneas, expirando en 3 días)
  for (let i = 0; i < 2; i++) {
    const terms = rollContractTerms(rng, { reputation: 50, nowMinute: 0 });
    out.push({
      id: `C-${(i + 2).toString().padStart(3, "0")}`,
      airlineId: airlines[i + 1].id,
      status: "offered",
      offeredAtMinute: 0,
      expiresAtMinute: OFFER_EXPIRY_MINUTES,
      ...terms,
    });
  }

  return out;
}

/**
 * Pivot MRO línea pura (2026-05-24): arrancamos solo con la primera aerolínea (Iberia
 * Express). Las demás existen pero sin contrato firmado — pueden ofrecer vía
 * `tickLineCompetition` cuando ganes reputación. Aerolínea de arranque tier "standard".
 */
export function generateInitialContractsLine(rng: Rng, airlines: readonly Airline[]): Contract[] {
  if (airlines.length < 1) {
    throw new Error("Need at least 1 airline for initial contracts");
  }
  const activeTerms = rollContractTerms(rng, { reputation: 50, nowMinute: 0 }, "standard");
  return [{
    id: "C-001",
    airlineId: airlines[0].id,
    status: "active" as const,
    offeredAtMinute: 0,
    ...activeTerms,
  }];
}

/** Aceptar una oferta (la mueve a "active"). Devuelve nueva lista. */
export function acceptOffer(contracts: readonly Contract[], contractId: string, nowMinute: number): Contract[] {
  return contracts.map((c) => {
    if (c.id !== contractId) return c;
    if (c.status !== "offered") return c;
    return { ...c, status: "active" as const, offeredAtMinute: nowMinute, expiresAtMinute: undefined };
  });
}

/** Rechazar una oferta (la marca como cancelled). */
export function rejectOffer(contracts: readonly Contract[], contractId: string): Contract[] {
  return contracts.map((c) => {
    if (c.id !== contractId) return c;
    if (c.status !== "offered") return c;
    return { ...c, status: "cancelled" as const };
  });
}

/** Marca ofertas como expired si han pasado de su expiresAt. */
export function expireOffers(contracts: readonly Contract[], nowMinute: number): Contract[] {
  return contracts.map((c) => {
    if (c.status !== "offered") return c;
    if (c.expiresAtMinute !== undefined && nowMinute >= c.expiresAtMinute) {
      return { ...c, status: "expired" as const };
    }
    return c;
  });
}

/** Contratos activos en este momento. */
export function activeContracts(contracts: readonly Contract[]): Contract[] {
  return contracts.filter((c) => c.status === "active");
}

/** Ofertas vivas (no expiradas todavía). */
export function liveOffers(contracts: readonly Contract[], nowMinute: number): Contract[] {
  return contracts.filter(
    (c) => c.status === "offered" && (c.expiresAtMinute === undefined || nowMinute < c.expiresAtMinute),
  );
}

/** Mínimo de reputación de aerolínea para que ofrezca nuevos contratos. Bloque M M4. */
export const AIRLINE_OFFER_REP_THRESHOLD = 20;
/** Días entre ticks de generación de ofertas. */
export const OFFER_TICK_DAYS = 7;

// ---- Pivot MRO línea pura — competencia simple (2026-05-24) ----

/** Rep mínima para que una aerolínea sin contrato te ofrezca uno. Más alto que el legacy
 *  (20) porque arrancamos con rep base 50 — el umbral 70 obliga a ganar reputación real. */
export const LINE_OFFER_REP_THRESHOLD = 70;
/** Rep máxima bajo la cual una aerolínea con contrato te lo rescinde y se va con la
 *  competencia. Mismo umbral que el legacy para coherencia. */
export const LINE_CANCEL_REP_THRESHOLD = 20;
/** Días entre ticks de competencia (ventana de renovación: ~mes ingame). */
export const LINE_COMPETITION_TICK_DAYS = 30;
/** Prob máxima de oferta cuando rep=100 (escala lineal desde 70). */
export const LINE_OFFER_MAX_PROB = 0.6;

let _contractCounter = 1000; // empezamos en 1000 para no chocar con C-001..C-003 iniciales
export function _resetContractCounter(v = 1000): void { _contractCounter = v; }
export function _getContractCounter(): number { return _contractCounter; }
function nextContractId(): string {
  _contractCounter += 1;
  return `C-${_contractCounter.toString().padStart(3, "0")}`;
}

/**
 * Tick periódico del mercado de contratos: para cada aerolínea sin contrato activo NI oferta
 * viva, si su rep ≥ AIRLINE_OFFER_REP_THRESHOLD, decide probabilísticamente (más prob cuanto más
 * alta la rep) si generar una nueva oferta.
 *
 * Si rep < threshold: esa aerolínea NUNCA ofrece (te dejan de querer).
 */
export function tickContractMarket(
  rng: Rng,
  contracts: readonly Contract[],
  airlines: readonly Airline[],
  reputationByAirline: Readonly<Record<string, number>>,
  nowMinute: number,
): { contracts: Contract[]; newlyOffered: Contract[] } {
  const newlyOffered: Contract[] = [];
  const updated: Contract[] = [...contracts];
  for (const al of airlines) {
    const rep = reputationByAirline[al.id] ?? 50;
    if (rep < AIRLINE_OFFER_REP_THRESHOLD) continue;
    // ¿Ya hay contrato vivo (active u offered no expirado)?
    const alreadyEngaged = updated.some(
      (c) =>
        c.airlineId === al.id &&
        (c.status === "active" ||
          (c.status === "offered" && (c.expiresAtMinute === undefined || nowMinute < c.expiresAtMinute))),
    );
    if (alreadyEngaged) continue;
    // Probabilidad escala con rep: 20→0%, 50→~30%, 100→~80%.
    const prob = Math.max(0, (rep - AIRLINE_OFFER_REP_THRESHOLD) / 100);
    if (rng.next() > prob) continue;
    // Fase 4.5: el tier se decide según rep aerolínea con el MRO.
    const tier = pickTierForRep(rng, rep);
    const terms = rollContractTerms(rng, { reputation: rep, nowMinute }, tier);
    const newContract: Contract = {
      id: nextContractId(),
      airlineId: al.id,
      status: "offered",
      offeredAtMinute: nowMinute,
      expiresAtMinute: nowMinute + OFFER_EXPIRY_MINUTES,
      ...terms,
    };
    updated.push(newContract);
    newlyOffered.push(newContract);
  }
  return { contracts: updated, newlyOffered };
}

// ---- Pivot MRO línea pura — competencia simple (2026-05-24) ----

export interface LineCompetitionResult {
  contracts: Contract[];
  /** Aerolíneas que acaban de ofrecerte un contrato (para notif "📋 X quiere contratar"). */
  newOffers: Contract[];
  /** Contratos que la competencia te ha arrebatado (rep ≤ LINE_CANCEL_REP_THRESHOLD).
   *  Lleva el airlineId para que la UI pueda enseñar el nombre en la notif. */
  cancellations: Array<{ contractId: string; airlineId: string }>;
}

/**
 * Tick de competencia del MRO línea pura. Llamado desde `advanceGame` cada
 * LINE_COMPETITION_TICK_DAYS días con un rng dedicado (marketRng) para no contaminar
 * la trayectoria principal.
 *
 *  - Aerolíneas SIN contrato vivo (active u offered) + rep ≥ LINE_OFFER_REP_THRESHOLD
 *    pueden ofrecerte un contrato. Probabilidad escala con (rep-70)/30 hasta MAX_PROB.
 *  - Aerolíneas CON contrato activo y rep ≤ LINE_CANCEL_REP_THRESHOLD pierden el contrato
 *    (status=cancelled) — "adjudicado a competidor".
 *  - Solo cuentan aerolíneas con iataCode (las que aparecen en el schedule real).
 */
export function tickLineCompetition(
  rng: Rng,
  contracts: readonly Contract[],
  airlines: readonly Airline[],
  reputationByAirline: Readonly<Record<string, number>>,
  nowMinute: number,
): LineCompetitionResult {
  const newOffers: Contract[] = [];
  const cancellations: Array<{ contractId: string; airlineId: string }> = [];
  let updated: Contract[] = [...contracts];

  // 1) Rescisiones por rep baja.
  for (let i = 0; i < updated.length; i++) {
    const c = updated[i];
    if (c.status !== "active") continue;
    const rep = reputationByAirline[c.airlineId] ?? 50;
    if (rep <= LINE_CANCEL_REP_THRESHOLD) {
      updated[i] = { ...c, status: "cancelled" as const };
      cancellations.push({ contractId: c.id, airlineId: c.airlineId });
    }
  }

  // 2) Ofertas nuevas para aerolíneas sin contrato vivo con rep alta.
  for (const al of airlines) {
    if (!al.iataCode) continue; // solo aerolíneas reales del schedule
    const rep = reputationByAirline[al.id] ?? 50;
    if (rep < LINE_OFFER_REP_THRESHOLD) continue;
    const alreadyEngaged = updated.some(
      (c) =>
        c.airlineId === al.id &&
        (c.status === "active" ||
          (c.status === "offered" && (c.expiresAtMinute === undefined || nowMinute < c.expiresAtMinute))),
    );
    if (alreadyEngaged) continue;
    // Escala lineal: rep 70→0%, rep 100→MAX_PROB.
    const slope = LINE_OFFER_MAX_PROB / (100 - LINE_OFFER_REP_THRESHOLD);
    const prob = Math.max(0, Math.min(LINE_OFFER_MAX_PROB, (rep - LINE_OFFER_REP_THRESHOLD) * slope));
    if (rng.next() > prob) continue;
    const tier = pickTierForRep(rng, rep);
    const terms = rollContractTerms(rng, { reputation: rep, nowMinute }, tier);
    const newContract: Contract = {
      id: nextContractId(),
      airlineId: al.id,
      status: "offered",
      offeredAtMinute: nowMinute,
      expiresAtMinute: nowMinute + OFFER_EXPIRY_MINUTES,
      ...terms,
    };
    updated.push(newContract);
    newOffers.push(newContract);
  }

  return { contracts: updated, newOffers, cancellations };
}
