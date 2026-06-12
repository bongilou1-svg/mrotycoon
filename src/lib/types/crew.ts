// Cuadrilla (crew) — unidad de trabajo del MRO. La compone el jugador en la Oficina (manual):
// uno o dos oficiales con licencia (B1, B2, o B1+B2) + uno o dos helpers. Cada cuadrilla viaja
// en SU furgoneta (una furgo por cuadrilla en el mapa). Dani 2026-06-03.

export interface Crew {
  /** ID estable interno. "CR-1". */
  id: string;
  /** Nombre editable mostrado en la Oficina y el mapa. */
  name: string;
  /** Oficiales con licencia (base B1/B2). 1-2 (B1, B2 o B1+B2). officerIds[0] certifica por defecto. */
  officerIds: string[];
  /** Helpers (mecánicos sin base). Normalmente 1-2. */
  helperIds: string[];
  /** Color de la furgoneta en el mapa (0xRRGGBB) para distinguir cuadrillas a simple vista. */
  color: number;
  /** Turno de la cuadrilla — MANDA sobre el de sus miembros (Dani 2026-06-11): al añadir un
   *  mecánico a la cuadrilla, su turno individual se cambia al de la cuadrilla. Opcional por
   *  retro-compat de saves v18: si falta, se deriva del primer oficial. */
  shift?: "morning" | "afternoon" | "night";
}
