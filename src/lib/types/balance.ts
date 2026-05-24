// Constantes de tuneo del juego. Carga desde data/balance.json al inicio.
// Cambiar valores aquí NO requiere recompilar.

export interface Balance {
  /** Balance inicial al arrancar nueva partida (€). */
  startingBalance: number;
  /** Coste fijo semanal del taller (alquiler hangar, utilities). */
  weeklyFixedCost: number;
  /** Salario semanal por defecto según rating del mecánico. */
  salaries: {
    helper: number;
    b1Junior: number;
    b1Senior: number;
    b2Junior: number;
    b2Senior: number;
  };
  /** Probabilidades duras del legacy. */
  probabilities: {
    /** Aparece WO al landing (vs avión sano). */
    workOrderAtStand: number;
    /** Direct dispatch post-Inspection (salta MainTask). */
    directDispatch: number;
    /** Rework tras Test. */
    reworkAfterTest: number;
  };
  /** Multiplicador SLA: tiempo real antes de penalty = duration × slaMultiplier. */
  slaMultiplier: number;
  /** Multiplicador penalty si WO es AOG. */
  aogPenaltyMultiplier: number;
  /** Tiempo abstracto de viaje oficina → stand (minutos ingame). */
  officeToStandMinutes: number;
  /** Delta de reputación por evento. */
  reputation: {
    woCompletedOnTime: number;
    woCompletedLate: number;
    woFailed: number;
    aogFailed: number;
    weeklyTickIfNoContracts: number;
  };
  /** Fases de WO con sus duraciones relativas a duration total del template. */
  phaseDurationRatios: {
    inspection: number; // 0.15 por defecto
    mainTask: number; // 1.0
    test: number; // 0.10
    rework: number; // 1.0
  };
  /** Reputación inicial del jugador. */
  startingReputation: number;
  /** Aviones por día generados por contrato son probabilísticos: la cifra exacta varía ±20%. */
  landingsVariance: number;
}
