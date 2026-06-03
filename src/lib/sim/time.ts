// Motor de tiempo del juego. Funciones puras + estado serializable.
// El "minuto" es la unidad temporal. Día = 1440 min. Semana = 10080 min.
// Speed: 0 (pause), 1 (1 min real = 1 min ingame), 2, 5.
//
// El tick lo dispara el caller (UI con setInterval o test con loop manual).
// Cada tick avanza N minutos según el speed.

export type Speed = 0 | 1 | 2 | 5;

export interface ClockState {
  /** Minutos absolutos desde inicio de partida (0 = 01/01 06:00 de arranque). */
  minute: number;
  /** Velocidad actual. */
  speed: Speed;
}

/** Minuto en el que arranca la partida. Fase 4 audit (Dani): 0 (midnight) → 360 (06:00) para
 *  que arranque cuando empieza la jornada operativa real y no haya 6h muertas con shift gating
 *  activo (los morning mechs entran a las 06:00; arrancando antes, jugador veía la app en blanco).
 *
 *  La numeración de "días" sigue siendo correcta porque getDay(360) = 1 (mismo día que minute 0). */
export const START_MINUTE = 360;
/** En MVP cada tick (100ms real) avanza 1 minuto ingame en speed 1x. */
export const MINUTES_PER_TICK_AT_1X = 1;
export const DAY_MINUTES = 24 * 60; // 1440
export const WEEK_MINUTES = 7 * DAY_MINUTES; // 10080

export function createClock(initialMinute = START_MINUTE, initialSpeed: Speed = 1): ClockState {
  return { minute: initialMinute, speed: initialSpeed };
}

/** Aplica un tick. Devuelve el nuevo estado (inmutable). */
export function tick(state: ClockState): ClockState {
  if (state.speed === 0) return state;
  return { ...state, minute: state.minute + state.speed * MINUTES_PER_TICK_AT_1X };
}

/** Cambia velocidad. */
export function setSpeed(state: ClockState, speed: Speed): ClockState {
  return { ...state, speed };
}

/** Avanza N minutos (para tests, skipear horas, etc). */
export function advance(state: ClockState, minutes: number): ClockState {
  return { ...state, minute: state.minute + minutes };
}

// ---- Helpers de derivación ----

/** Día absoluto desde inicio (1-indexed). */
export function getDay(minute: number): number {
  return Math.floor(minute / DAY_MINUTES) + 1;
}

/** Semana absoluta (1-indexed). */
export function getWeek(minute: number): number {
  return Math.floor(minute / WEEK_MINUTES) + 1;
}

/** Minuto del día (0-1439). */
export function getMinuteOfDay(minute: number): number {
  return minute % DAY_MINUTES;
}

/** Hora del día (0-23). */
export function getHour(minute: number): number {
  return Math.floor(getMinuteOfDay(minute) / 60);
}

/** Minutos en la hora (0-59). */
export function getMinuteOfHour(minute: number): number {
  return getMinuteOfDay(minute) % 60;
}

/** ¿Acaba de empezar una semana nueva? (true en el primer minuto de cada semana). */
export function isWeekStart(prevMinute: number, newMinute: number): boolean {
  return getWeek(prevMinute) !== getWeek(newMinute);
}

/**
 * Formato visible para HUD: "Día 4 · 14:23" en español, o "DD/MM HH:MM" si queremos calendario fingido.
 * Por simplicidad MVP usamos "Día N · HH:MM" — sin pretender simular calendario gregoriano.
 */
export function formatClock(minute: number): string {
  const mi = Math.floor(minute); // el reloj puede ser fraccionario (1x = 1 min/s, tick 100ms)
  const day = getDay(mi);
  const h = getHour(mi);
  const m = getMinuteOfHour(mi);
  return `Día ${day} · ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Formato corto para tabla/widget: "D4 14:23". */
export function formatClockShort(minute: number): string {
  const mi = Math.floor(minute); // ídem: redondeo del reloj fraccionario para display
  const day = getDay(mi);
  const h = getHour(mi);
  const m = getMinuteOfHour(mi);
  return `D${day} ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
