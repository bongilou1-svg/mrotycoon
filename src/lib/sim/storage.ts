// Storage abstracto para Save/Load. MVP: localStorage browser. Migración futura: tauri-plugin-sql.
// API agnóstica para que cambiar de backend sea trivial.
//
// Una sola "slot" en MVP. Fase 4+ podemos añadir múltiples slots.

import type { GameSavePayload } from "./save.ts";

const SLOT_KEY = "mro-tycoon-save-v1";

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
      return JSON.parse(raw) as GameSavePayload;
    } catch (e) {
      throw new Error(`No se pudo cargar (localStorage corrupto): ${(e as Error).message}`);
    }
  }
  async hasSave(): Promise<boolean> {
    try {
      return localStorage.getItem(SLOT_KEY) !== null;
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

// In-memory backend para tests Node (sin localStorage).
class InMemoryBackend implements StorageBackend {
  private slot: GameSavePayload | null = null;
  async save(p: GameSavePayload) { this.slot = JSON.parse(JSON.stringify(p)); }
  async load() { return this.slot ? JSON.parse(JSON.stringify(this.slot)) : null; }
  async hasSave() { return this.slot !== null; }
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
