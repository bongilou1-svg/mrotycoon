// Aerolíneas. 4 ficticias en MVP: SkyAirlines, SunAirlines, TreeAirlines, Starairlines.

import type { AircraftModel, EngineVariant } from "./airplane";

export interface Airline {
  id: string;
  name: string;
  /** Path al logo PNG (cuando se porte del legacy). */
  logo?: string;
  /** Color brand (hex) — para UI badges. */
  color: string;
  /** Modelos de avión que opera la aerolínea. */
  fleet: Array<{ model: AircraftModel; engineVariant: EngineVariant }>;
  /** Fase 5A Y1: matrículas que pernoctan/operan habitualmente desde NUESTRO aeropuerto.
   *  Pequeña 3-5 / mediana 6-10 / grande 12-15. Default 8 si missing (backward compat). */
  basedAircraftCount?: number;
}
