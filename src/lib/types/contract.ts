// Contratos con aerolíneas. El jugador puede aceptar/rechazar ofertas y
// gestionar los activos. 1 contrato activo + 2 ofertas en MVP.

export type ContractStatus = "offered" | "active" | "expired" | "cancelled";

/**
 * Tier del contrato (Fase 4.5):
 *   - standard: lo "normal" del MVP. minRep 35-55, fees base.
 *   - premium: aerolíneas exigentes. minRep ~55-75, fees ×1.35.
 *   - deluxe: Tier-1 (Emirates/Singapore-like). minRep ~80-92, fees ×1.75, penalty ×1.5.
 *
 * Field opcional en `Contract`: si missing → standard (backward compat con saves v6).
 */
export type ContractTier = "standard" | "premium" | "deluxe";

export interface Contract {
  id: string;
  airlineId: string;
  status: ContractStatus;
  /** Aviones esperados por día (probabilístico). */
  expectedLandingsPerDay: number;
  /** Ingreso fijo semanal (€). Se paga en cierre de semana. */
  baseFeePerWeek: number;
  /** Pago por minuto de WO ejecutada (€/min). */
  paymentPerWOMinute: number;
  /** Penalización por minuto fuera de SLA (€/min). AOG aplica x5. */
  penaltyPerLateMinute: number;
  /** Reputación mínima requerida para mantener el contrato (0-100). */
  minReputation: number;
  /** Minuto ingame en el que se firmó (si active) o se ofreció (si offered). */
  offeredAtMinute: number;
  /** Minuto ingame en el que expira la oferta o termina el contrato. */
  expiresAtMinute?: number;
  /** Tier del contrato (Fase 4.5). Default standard si missing. */
  tier?: ContractTier;
}
