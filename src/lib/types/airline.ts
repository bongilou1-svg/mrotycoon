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
  /** Pivot MRO línea pura (2026-05-24): código IATA real para enlazar con el snapshot
   *  OVD (callsigns IB/VY/V7/U2). Permite filtrar arrivals del schedule por contratos
   *  vivos. Si missing, la aerolínea no aparece en el schedule real. */
  iataCode?: string;
  /** Pivot iteración 2026-05-25: umbral de brand del MRO que esta aerolínea exige
   *  para ofrecerte un contrato. Aerolíneas con base/volumen en OVD (Volotea local)
   *  tienen umbral bajo (te quieren antes); operadores internacionales esporádicos
   *  (easyJet) exigen brand alto antes de delegar maintenance. Si undefined →
   *  fallback a `LINE_OFFER_REP_THRESHOLD` (70). Las condiciones del contrato
   *  ofertado escalan con cuánto supere el brand este threshold (más brand sobre
   *  umbral = mejor fee, payment, penalty). */
  brandThreshold?: number;
  /** Pivot iteración 2026-05-25: ICAOs de aeropuertos donde la aerolínea tiene BASE
   *  operativa (sus aviones pernoctan habitualmente ahí). Cuando un arrival aterriza
   *  en uno de estos aeropuertos y es el último del día de la aerolínea, se considera
   *  OVERNIGHT real (pernocta para mantenimiento + primera rotación del día siguiente).
   *  Las aerolíneas SIN base en el aeropuerto hacen turnaround corto (55min sale otra
   *  vez). Iberia Express y Volotea tienen base en LEAS (OVD). Vueling/easyJet/Ryanair
   *  no. Escalable a otros aeropuertos cuando se añadan. */
  homeBaseAirports?: string[];
}
