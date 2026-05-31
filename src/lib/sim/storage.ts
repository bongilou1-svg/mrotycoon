// Storage abstracto para Save/Load. MVP: localStorage browser. Migración futura: tauri-plugin-sql.
// API agnóstica para que cambiar de backend sea trivial.
//
// Una sola "slot" en MVP. Fase 4+ podemos añadir múltiples slots.

import type { GameSavePayload } from "./save.ts";

const SLOT_KEY = "mro-tycoon-save-v1";

// Corte 2026-05-30: saves anteriores a v16 podían contener aviones "overnighter" fantasma
// EN TIERRA, sembrados por la lógica previa al fix de `isBased` (una partida OVD→Vueling
// debe arrancar vacía; los saves viejos mostraban ~19). Los descartamos al leer para que
// una partida nueva siempre arranque limpia y el save contaminado no recaiga. Mantenerlo
// como literal independiente de SAVE_VERSION: futuras subidas de versión con migración NO
// deben invalidar saves automáticamente; solo se sube este corte cuando haya otro break real.
const MIN_COMPATIBLE_VERSION = 17;

/** True si el payload es de una versión que sabemos cargar sin arrastrar datos corruptos. */
function isCompatibleSave(payload: GameSavePayload | null | undefined): boolean {
  return !!payload && typeof payload.version === "number" && payload.version >= MIN_COMPATIBLE_VERSION;
}

export interface StorageBackend {
  save(payload: GameSavePayload): Promise<void>;
  load(): Promise<GameSavePayload | null>;
  hasSave(): Promise<boolean>;
  clear(): Promise<void>;
}

class LocalStorageBackend implements StorageBackend {
  async save(payload: GameSavePayload): Promise<void> {
    try {
      localStorage.setItem(SLOT_KEY, JSON.stringify(payload));
    } catch (e) {
      throw new Error(`No se pudo guardar (localStorage): ${(e as Error).message}`);
    }
  }
  async load(): Promise<GameSavePayload | null> {
    try {
      const raw = localStorage.getItem(SLOT_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw) as GameSavePayload;
      // Corte 2026-05-30: descartar saves incompatibles (pre-v16 con overnighters fantasma).
      if (!isCompatibleSave(payload)) {
        localStorage.removeItem(SLOT_KEY);
        return null;
      }
      return payload;
    } catch (e) {
      throw new Error(`No se pudo cargar (localStorage corrupto): ${(e as Error).message}`);
    }
  }
  async hasSave(): Promise<boolean> {
    try {
      const raw = localStorage.getItem(SLOT_KEY);
      if (!raw) return false;
      // Validar versión: un save incompatible se purga aquí, de modo que el botón
      // "Continuar partida" del wizard quede deshabilitado en lugar de cargar basura.
      let payload: GameSavePayload | null = null;
      try {
        payload = JSON.parse(raw) as GameSavePayload;
      } catch {
        localStorage.removeItem(SLOT_KEY);
        return false;
      }
      if (!isCompatibleSave(payload)) {
        localStorage.removeItem(SLOT_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(SLOT_KEY);
    } catch {
      // ignore
    }
  }
}

// In-memory backend para tests Node (sin localStorage). Aplica la misma política de
// versión que LocalStorageBackend para que el corte de saves incompatibles sea coherente
// entre backends (y testeable headless sin mock de localStorage).
class InMemoryBackend implements StorageBackend {
  private slot: GameSavePayload | null = null;
  async save(p: GameSavePayload) { this.slot = JSON.parse(JSON.stringify(p)); }
  async load() {
    if (!isCompatibleSave(this.slot)) { this.slot = null; return null; }
    return JSON.parse(JSON.stringify(this.slot));
  }
  async hasSave() {
    if (!isCompatibleSave(this.slot)) { this.slot = null; return false; }
    return true;
  }
  async clear() { this.slot = null; }
}

let _backend: StorageBackend;
if (typeof localStorage !== "undefined") {
  _backend = new LocalStorageBackend();
} else {
  _backend = new InMemoryBackend();
}

export function getStorage(): StorageBackend {
  return _backend;
}

/** Inyectar backend custom (útil para tests o migrar a tauri-plugin-sql). */
export function setStorage(b: StorageBackend): void {
  _backend = b;
}

export { LocalStorageBackend, InMemoryBackend };
