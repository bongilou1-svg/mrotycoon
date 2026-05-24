// Flota persistente por aerolínea. Cada FleetAircraft acumula FH+cycles a lo largo
// de la partida y es el SUJETO de los A/C/D checks (un check se dispara sobre la matrícula,
// no sobre un landing event puntual).
//
// Distinción clave:
//  - FleetAircraft = la matrícula viva en el mundo del juego (EC-XYZ, persistente).
//  - AirplaneInstance = un landing event concreto (EC-XYZ aterriza el día 4 a las 09:42).
// Varias AirplaneInstance comparten registration a lo largo de la partida.

import type { AircraftModel, EngineVariant } from "./airplane";

export interface FleetAircraft {
  /** Matrícula persistente, tipo "EC-XYZ". Único en todo el game state. */
  registration: string;
  /** Aerolínea propietaria. */
  airlineId: string;
  /** Modelo del avión. */
  model: AircraftModel;
  /** Variante de motor. */
  engineVariant: EngineVariant;
  /** Total horas vuelo acumuladas desde "birth" del avión. */
  totalFH: number;
  /** Total cycles acumulados (1 cycle = 1 takeoff + 1 landing). */
  totalCycles: number;
  /** FH transcurridas desde el último A check (reset al completarlo). */
  fhSinceLastA: number;
  /** Cycles transcurridos desde el último A check. */
  cyclesSinceLastA: number;
  /** FH transcurridas desde el último C check. */
  fhSinceLastC: number;
  /** Cycles transcurridos desde el último C check. */
  cyclesSinceLastC: number;
  /** FH transcurridas desde el último D check. */
  fhSinceLastD: number;
  /** Cycles transcurridos desde el último D check. */
  cyclesSinceLastD: number;
  /** Flags H9: ya se emitió aviso anticipado en esta "ventana" (entre Completed y Completed).
   *  Se resetea al completar el check del tipo correspondiente. */
  warnedA: boolean;
  warnedC: boolean;
  warnedD: boolean;
}
