// PRNG con seed para que las partidas sean reproducibles y los tests deterministas.
// Algoritmo: mulberry32 (32-bit). Refactor: state expuesto para serialización.

export interface Rng {
  /** Estado interno (32-bit unsigned). Mutable: cada next() lo avanza. Exponer permite save/load. */
  state: number;
  /** Avanza y devuelve [0, 1). Muta `state`. */
  next: () => number;
}

export function createRng(seed: number): Rng {
  const rng: Rng = {
    state: seed >>> 0,
    next() {
      this.state = (this.state + 0x6d2b79f5) >>> 0;
      let t = this.state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
  return rng;
}

/** Restaura un Rng desde su `state` previamente serializado. */
export function restoreRng(state: number): Rng {
  return createRng(state >>> 0);
}

/** Entero entre min y max INCLUSIVOS. */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng.next() * (max - min + 1)) + min;
}

export function randFloat(rng: Rng, min: number, max: number): number {
  return min + rng.next() * (max - min);
}

export function randBool(rng: Rng, p: number): boolean {
  return rng.next() < p;
}

export function randPick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng.next() * arr.length)];
}

export function randSample<T>(rng: Rng, arr: readonly T[], k: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < k && copy.length > 0; i++) {
    const idx = Math.floor(rng.next() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}
