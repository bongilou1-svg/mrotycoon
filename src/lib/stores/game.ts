// Store reactivo Svelte 5 alrededor del game state.
// El componente principal arranca el loop con setInterval.

import { advanceGame, type GameState, createGame, setGameSpeed as _setSpeed,
  acceptContractOffer as _accept, rejectContractOffer as _reject,
  assignMechanicsManually as _assign } from "$lib/game";
import { loadGameData } from "$lib/data";
import type { Speed } from "$lib/sim/time.ts";

const data = loadGameData();
let _state = $state<GameState>(createGame(data.balance, data.airlines, data.workOrders, 42));

export function getGame(): GameState {
  return _state;
}

/** Avanza N min ingame (llamado por el game loop). */
export function tick(stepMinutes: number): void {
  _state = advanceGame(_state, stepMinutes);
}

export function setSpeed(s: Speed): void {
  _setSpeed(_state, s);
  // Trigger rebind por si Svelte no detecta mutación profunda
  _state = { ..._state };
}

export function acceptOffer(contractId: string): void {
  _accept(_state, contractId);
  _state = { ..._state };
}

export function rejectOffer(contractId: string): void {
  _reject(_state, contractId);
  _state = { ..._state };
}

export function assign(woId: string, certifierId: string, helperIds: string[]): { ok: boolean; error?: string } {
  const r = _assign(_state, woId, certifierId, helperIds);
  _state = { ..._state };
  return r;
}
