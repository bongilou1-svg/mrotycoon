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

/** Pivot iteración 2026-05-24: estado visual derivado para colorear el avión en mapa.
 *  Comunica al jugador qué hay que mirar:
 *    - `idle`    → contratado, en stand sin WO viva → color base aerolínea (cyan blueprint).
 *    - `working` → al menos 1 WO/check con mec asignado en marcha → verde.
 *    - `delayed` → pasada `scheduledDeparture` y aún en stand (WO no cerrada) → ámbar.
 *    - `aog`     → `aogEscalated` true (delay ≥ 6h o flag in-vivo) → rojo pulsante.
 *    - `daily`   → tiene daily check abierto (subtareas DC-*) → cyan más claro/marino.
 *  El driver mapea cada uno a su color/badge. */
export type AirplaneDisplayState = "idle" | "working" | "delayed" | "aog" | "daily";

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
  /** Pivot 2026-05-24: estado visual semántico — el driver lo mapea a paleta. */
  displayState: AirplaneDisplayState;
  /** WO callout abierta más relevante (la primera open en orden de emisión). Si está set,
   *  el click en el avión del mapa abre el modal de esta WO en lugar del modal flota. */
  activeWoInstanceId?: string;
  /** Check A/C/D InProgress sobre este avión. Click → modal check. Prevalece sobre WO. */
  activeCheckInstanceId?: string;
  /** Daily check (>=1 subtarea DC-* open). Click → modal daily detallado por avión. */
  hasOpenDaily?: boolean;
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

/** Pivot línea pura · Aeropuerto vivo: movimientos del schedule que NO son trabajables
 *  por el jugador (no contratados o type rating no habilitado). Aparecen en el mapa
 *  con halo tenue para dar sensación de aeropuerto vivo, pero no generan WO ni
 *  ocupan stand del sim. Se calculan en cada `buildRenderState` desde el snapshot. */
export interface RenderPassthroughTraffic {
  callsign: string;
  airlineCode: string;
  /** OSM ref del parking position (e.g. "06", "08A"). Stands libres no usados por sim. */
  standOsmRef: string;
  /** Visualmente "rodando" tras aterrizaje — interpolación pista→stand. */
  taxiing: boolean;
  /** 0..1 progreso del taxi visual. */
  taxiProgress: number;
  /** True si modelo no es A320/A321 CFM56/V2500 (Embraer/CRJ/ATR/B737/A321neo).
   *  Visual aún más muted. */
  notHandled: boolean;
  /** True si la aerolínea tiene contrato activo del jugador (handled visualmente más
   *  brillante que un no-contratado). Hoy es false para todos los passthrough porque
   *  los contratados+handled van por `airplanes`, no por aquí. Reservado para futuro. */
  contracted: boolean;
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
  /** Cuadrilla del mecánico (si pertenece a una). El driver dibuja UNA furgo por cuadrilla. */
  crewId?: string;
  /** Color de la furgoneta de la cuadrilla (0xRRGGBB) para distinguirlas en el mapa. */
  crewColor?: number;
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
  /** Pivot línea pura · aeropuerto vivo: tráfico del schedule actualmente en stand
   *  que NO genera trabajo MRO. Ver `RenderPassthroughTraffic`. */
  passthroughTraffic: RenderPassthroughTraffic[];
  /** Pivot MRO línea pura: si false, NO renderizar los plots ghost Stage 3/4 (están
   *  reservados para endgame y aún no son comprables). El sim también rechaza startBuild
   *  para target>2 con este flag false. Default false en arranque post-pivot. */
  hangarBuildUnlocked: boolean;
}
