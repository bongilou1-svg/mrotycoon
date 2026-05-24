// Contratos con aerolíneas. El jugador puede aceptar/rechazar ofertas y
// gestionar los activos.

export type ContractStatus = "offered" | "active" | "expired" | "cancelled";

/**
 * Tier del contrato. Dos sistemas conviven:
 *
 * Pivot línea pura (2026-05-24): tiers progresivos 1-4 que habilitan trabajos:
 *   - "line"    Tier 1 — callouts + pernoctas (daily check). Mínimo.
 *   - "a-check" Tier 2 — + A-checks (en plataforma, opcional). Rep + experiencia.
 *   - "c-check" Tier 3 — + C-checks (multi-día, requiere HANGAR Stage 3+).
 *   - "d-check" Tier 4 — + D-check / mods avionics / painting (Stage 4 + rep alta).
 *
 * Legacy (Fase 4.5) — preservados para no romper tests pre-pivot:
 *   - "standard" fee ×1.0, minRep +0
 *   - "premium"  fee ×1.35, minRep +20
 *   - "deluxe"   fee ×1.75, penalty ×1.5, minRep +45
 *
 * Field opcional en `Contract`: si missing → standard (backward compat con saves v6+).
 */
export type ContractTier = "standard" | "premium" | "deluxe" | "line" | "a-check" | "c-check" | "d-check";

export interface Contract {
  id: string;
  airlineId: string;
  status: ContractStatus;
  /** Aviones esperados por día (probabilístico). */
  expectedLandingsPerDay: number;
  /** Ingreso fijo semanal (€). Se paga en cierre de semana.
   *  Pivot Fase D (2026-05-24): pasa a ser "subscription mínima semanal". El cobro
   *  real es max(actualHoursThisWeek × hourlyRate, baseFeePerWeek) — el mínimo
   *  garantizado de subscription, o las HH facturadas reales si son mayores. */
  baseFeePerWeek: number;
  /** Pago por minuto de WO ejecutada (€/min). Pivot Fase A: helper `hourlyRateEur()`
   *  expone este valor como €/HH (×60). Pivot Fase B: las tarifas tier 2/3/4 escalan
   *  según `TIER_FEE_MULT`. */
  paymentPerWOMinute: number;
  /** Penalización por minuto fuera de SLA (€/min). AOG aplica x5. */
  penaltyPerLateMinute: number;
  /** Reputación mínima requerida para mantener el contrato (0-100). */
  minReputation: number;
  /** Minuto ingame en el que se firmó (si active) o se ofreció (si offered). */
  offeredAtMinute: number;
  /** Minuto ingame en el que expira la oferta o termina el contrato. */
  expiresAtMinute?: number;
  /** Tier del contrato. Default standard si missing. */
  tier?: ContractTier;
  /** Pivot línea pura · Fase D (2026-05-24): subscription HH/sem mínima garantizada
   *  por este contrato. Derivada del tier (line=4h, a-check=12h, c-check=45h, premium=100h).
   *  Si las HH reales facturadas en la semana × rate son mayores → cobras el real.
   *  Si menores → cobras esta subscription × rate. Modelo realista MRO. */
  subscriptionHoursPerWeek?: number;
  /** Pivot línea pura · Fase B (2026-05-24): si presente, esta oferta REEMPLAZA un
   *  contrato activo del mismo airlineId al ser aceptada (mismo contrato, tier
   *  superior). El contrato viejo se marca cancelled automáticamente. */
  upgradesContractId?: string;
}

/** Pivot línea pura · Fase B (2026-05-24): capacidades por tier. */
export function tierAllowsACheck(tier: ContractTier | undefined): boolean {
  return tier === "a-check" || tier === "c-check" || tier === "d-check" || tier === "deluxe";
}
export function tierAllowsCCheck(tier: ContractTier | undefined): boolean {
  return tier === "c-check" || tier === "d-check" || tier === "deluxe";
}
export function tierAllowsDCheck(tier: ContractTier | undefined): boolean {
  return tier === "d-check";
}
/** Label humano corto del tier para UI. */
export function tierLabel(tier: ContractTier | undefined): string {
  switch (tier) {
    case "line": return "Tier 1 · Line";
    case "a-check": return "Tier 2 · A-check";
    case "c-check": return "Tier 3 · C-check";
    case "d-check": return "Tier 4 · D-check";
    case "standard": return "Standard";
    case "premium": return "Premium ⭐";
    case "deluxe": return "Deluxe ⭐⭐";
    default: return "Standard";
  }
}
/** Subscription HH/semana sugerida por tier (Fase D). */
export function defaultSubscriptionHoursPerWeek(tier: ContractTier | undefined): number {
  switch (tier) {
    case "line": return 4;
    case "a-check": return 12;
    case "c-check": return 45;
    case "d-check": return 100;
    case "deluxe": return 45;
    case "premium": return 12;
    case "standard": return 4;
    default: return 4;
  }
}
/** Tier al que un contrato puede ASCENDER (line→a-check→c-check→d-check). undefined si
 *  ya está en el tope o si está en familia legacy. */
export function nextTierUp(tier: ContractTier | undefined): ContractTier | undefined {
  switch (tier) {
    case "line": return "a-check";
    case "a-check": return "c-check";
    case "c-check": return "d-check";
    default: return undefined;
  }
}
