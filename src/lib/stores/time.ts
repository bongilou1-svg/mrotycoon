// Store reactivo del tiempo de juego (Svelte 5 rune).
// Wrapper sobre las funciones puras de sim/time.ts.

import {
  createClock,
  tick as tickPure,
  setSpeed as setSpeedPure,
  type ClockState,
  type Speed,
} from "$lib/sim/time";

let _clock = $state<ClockState>(createClock());

export function getClock(): ClockState {
  return _clock;
}

export function tick(): ClockState {
  _clock = tickPure(_clock);
  return _clock;
}

export function setSpeed(speed: Speed): void {
  _clock = setSpeedPure(_clock, speed);
}

/** Reset (nueva partida). */
export function resetClock(): void {
  _clock = createClock();
}
