// Fase 5D · P-α: tipos del RenderState.
//
// Capa de presentación separada del sim. El RenderState es la "vista derivada"
// que produce sync.ts a partir del GameState y que consume pixi-driver.ts.
//
// Reglas duras:
//  - RenderState es PURO (serializable, sin refs a clases ni funciones).
//  - sync.ts ↦ buildRenderState NO importa Pixi ni nada del DOM.
//  - pixi-driver.ts es el único punto que toca canvas/WebGL.
//  - Mismo GameState ⇒ mismo RenderState (determinismo, testeado).

export type TimeOfDay = "day" | "night";

/** Avión visible en el mapa. Posición la calcula el driver según standId y layout. */
export interface RenderAirplane {
  instanceId: string;
  registration: string;
  /** Stand al que está asignado el avión. `null` solo si está Departed. */
  standId: string | null;
  /** Aerolínea — para colorear el sprite. */
  airlineId: string;
  status: "Idle" | "InMaintenance" | "Departed";
  /** Si pernocta — informativo para halos especiales. */
  overnight: boolean;
  /** P-γ: true si está dentro de la ventana de taxi (recién aterrizado). Mientras dure,
   *  el driver lo pinta en motion path pista→stand en vez de parado en el stand. */
  taxiing: boolean;
  /** P-γ: 0..1 — progreso del taxi (arrival → arrival + TAXIING_DURATION_MIN). 1 una vez
   *  terminado el taxi. El driver interpola la posición. */
  taxiProgress: number;
}

/** Stand del mapa con estado de ocupación derivado. */
export interface RenderStand {
  id: string;
  type: "line" | "base";
  /** Avión ocupando el stand (línea o base) o `null` si libre. */
  airplaneInstanceId: string | null;
  /** Hay un check `InProgress` ocupando este stand (base o A en plataforma). */
  checkInProgress: boolean;
  /** Si el A-check está en plataforma (stage ≥ 2). Para badge ⛅ en pixi. */
  checkOnPlatform: boolean;
}

/** Mecánico activo en mapa — solo los relevantes para visualización (ToPlane, Working,
 *  Returning, Idle). El driver decide qué pintar según state. */
export interface RenderMechanic {
  id: string;
  name: string;
  state: "Idle" | "ToPlane" | "Working" | "Returning" | "Training" | "OffShift";
  /** Stand destino — calculado vía assignedWoInstanceId → airplane.standId, o vía
   *  assignedCheckInstanceId → check.standId. `null` si el mec está en oficina o sin destino. */
  destStandId: string | null;
  /** P-γ: 0..1 — progreso del trayecto del furgo. ToPlane: 0=oficina, 1=stand. Returning:
   *  igual pero el driver invierte el path. Working: 1 (en stand). Otros estados: 0. */
  progress: number;
}

export interface RenderState {
  /** Minuto absoluto del clock — útil para tweens en pixi-driver. */
  minute: number;
  /** "day" 06:00-21:59, "night" 22:00-05:59 (alineado con HUD ☀️/🌙). */
  timeOfDay: TimeOfDay;
  /** Etapa MRO: condiciona qué stands existen y qué layout pintamos. */
  mroStage: 1 | 2 | 3 | 4;
  airplanes: RenderAirplane[];
  stands: RenderStand[];
  /** Mecs vivos para visualización. Idle se cuenta dentro de la oficina (badge);
   *  ToPlane/Working/Returning se dibujan como furgo o presencia en stand. */
  mechanics: RenderMechanic[];
  /** Hay un runway_closure activo ahora — el driver puede flashear "PISTA CERRADA". */
  runwayClosed: boolean;
}
