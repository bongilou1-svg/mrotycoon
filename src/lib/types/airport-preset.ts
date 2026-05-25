// Pivot iteración 2026-05-25 — Framework multi-aeropuerto.
// Schema del preset que define un aeropuerto completo: ICAO, dificultad, setup
// inicial, aerolíneas operadoras, milestones de progresión. Cada aeropuerto
// (OVD, MAD, BCN, etc.) tendrá su propio preset JSON cargado al iniciar partida.
//
// Diseño: `createGame(preset?)`. Sin preset = comportamiento legacy hardcoded
// (compat con saves v13 y tests). Con preset = setup desde el JSON.
//
// Ver docs/BRIEF_multi_airport_preset.md para diseño completo + roadmap.

export type AirportDifficulty = 1 | 2 | 3 | 4 | 5;

/** Mecánico inicial: helper o dual con perfil estándar. */
export interface InitialMechSpec {
  /** Tipo predefinido. `dual-B1B2` = senior con todas las habilitaciones A320/A321
   *  CFM56/V2500 tanto B1 como B2 (mec polivalente). */
  type: "dual-B1B2" | "B1-mainline" | "B2-mainline" | "helper";
  shift: "morning" | "afternoon" | "night";
}

/** Contrato inicial: aerolínea + tier + términos económicos. */
export interface InitialContractSpec {
  /** IATA de la aerolínea (debe existir en `operators` del preset). */
  airlineIata: string;
  /** Tier humano. Por ahora informativo; en futuro indexa templates de contrato. */
  tier: string;
  baseFeePerWeek: number;
  paymentPerWOMinute: number;
  penaltyPerLateMinute: number;
  minReputation: number;
  expectedLandingsPerDay: number;
  /** Si true, el contrato incluye 1+ matrículas que pernoctan (con daily checks).
   *  Si false, solo callouts puntuales en turnaround. */
  withOvernight: boolean;
  /** Si `withOvernight: true`, matrículas base que pernoctan (opcional, sino se
   *  rotan aleatoriamente desde el fleet pool del aeropuerto). */
  baseRegistrations?: string[];
}

/** Aerolínea operadora con su perfil económico y de habilitación. */
export interface AirportOperator {
  iata: string;
  icao: string;
  name: string;
  /** Color brand hex (#RRGGBB). */
  color: string;
  /** Si true, los aviones pernoctan en este aeropuerto (base operativa). */
  homeBased: boolean;
  /** Brand score mínimo del MRO para que esta aerolínea oferte contrato (0-100). */
  brandThreshold: number;
  /** Modelos de avión que opera. */
  fleetModels: string[];
  /** Si está set, la aerolínea SOLO puede contratarse cuando el jugador desbloquea
   *  habilitación para este tipo de avión. Ej: "CRJ" para Air Nostrum, "E190" para
   *  KLM Cityhopper, "ATR" para Air Europa Express. Si undefined, aerolínea
   *  contratable desde el día 1 si el brand cruza threshold. */
  requiresUnlockType?: string;
}

/** Milestone de progresión narrativa (oferta de contrato nueva, unlock de tipo, etc).
 *  Triggers: brandMin, daysMin, balanceMin, previousMilestone (encadenamiento). */
export interface AirportMilestone {
  id: string;
  trigger: {
    brandMin?: number;
    daysMin?: number;
    balanceMin?: number;
    previousMilestone?: string;
    investmentRequired?: number;
  };
  type: "newContractOffer" | "upgradeContract" | "unlockAircraftType";
  /** Parámetros dependientes del type. Schema poco estricto por ahora — formaliza
   *  cuando implementemos la milestone engine. */
  params: Record<string, unknown>;
  /** Texto de notif al jugador cuando dispara. */
  notif: string;
}

/** Preset completo de un aeropuerto. */
export interface AirportPreset {
  /** ICAO de 4 letras (LEAS, LEMD, LEBL, ...). */
  icao: string;
  /** IATA de 3 letras (OVD, MAD, BCN, ...). */
  iata: string;
  /** Nombre humano del aeropuerto. */
  name: string;
  /** ISO-2 del país. */
  country: string;
  city: string;
  difficulty: AirportDifficulty;
  difficultyLabel: string;
  /** Descripción de 1-2 frases mostrada en card de selección de aeropuerto. */
  description: string;

  /** Setup inicial al crear partida. */
  setup: {
    initialBalance: number;
    initialMechCap: number;
    initialMechs: InitialMechSpec[];
    /** Pre-cargar N candidatos dual senior en el mercado al iniciar (la "jugada buena"). */
    marketPreloadDualCandidates: number;
    /** Contratos activos desde el día 1. */
    initialContracts: InitialContractSpec[];
  };

  /** Aerolíneas que operan en este aeropuerto. Conducen el sistema de competencia
   *  (qué aerolíneas pueden ofertarte cuando subes brand). */
  operators: AirportOperator[];

  /** Eventos de progresión narrativa específicos del aeropuerto. */
  milestones: AirportMilestone[];
}

/** Type guard runtime para validar un JSON cargado. */
export function isAirportPreset(x: unknown): x is AirportPreset {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.icao === "string" && o.icao.length === 4 &&
    typeof o.iata === "string" && o.iata.length === 3 &&
    typeof o.name === "string" &&
    typeof o.country === "string" &&
    typeof o.city === "string" &&
    typeof o.difficulty === "number" && o.difficulty >= 1 && o.difficulty <= 5 &&
    typeof o.description === "string" &&
    typeof o.setup === "object" && o.setup !== null &&
    Array.isArray(o.operators) &&
    Array.isArray(o.milestones)
  );
}
