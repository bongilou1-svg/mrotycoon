// i18n runtime — simple, sin deps externas.
// API: `t("hud.balance")` → "Balance" (o "Balance" en inglés).
// Interpolación: `t("notification.newWO", { stand: "S2", desc: "..." })`.
// Cambio de idioma: setLocale("en"). Reactividad: usar `currentLocale` desde componentes con $effect.

import esLocale from "./es.json";
import enLocale from "./en.json";

export type Locale = "es" | "en";
export type LocaleDict = typeof esLocale;

/** Diccionarios cargados estáticamente — sin lazy load porque el peso total es bajo (~10KB combined). */
const dicts: Record<Locale, unknown> = {
  es: esLocale,
  en: enLocale,
};

/** Estado reactivo del idioma activo. Svelte 5 rune. Default ES. */
let _locale = $state<Locale>("es");

/** Obtener / fijar el locale actual. Reactivo: cualquier componente con $effect lo verá. */
export function getLocale(): Locale {
  return _locale;
}

export function setLocale(locale: Locale): void {
  if (locale === _locale) return;
  if (!(locale in dicts)) {
    console.warn(`[i18n] Unknown locale "${locale}"; keeping "${_locale}"`);
    return;
  }
  _locale = locale;
}

/**
 * Traduce una clave anidada. Si falta, devuelve la clave entre corchetes.
 *
 * Soporta interpolación de placeholders `{name}` con el segundo parámetro:
 *   t("notification.newWO", { stand: "S2", desc: "..." })
 *
 * @param key Clave dotada (ej. "wo.phase.Inspection").
 * @param params Diccionario de placeholders a sustituir en el string final.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dicts[_locale];
  const raw = resolveKey(dict, key);
  if (raw === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing key "${key}" in locale "${_locale}"`);
    }
    return `[${key}]`;
  }
  if (typeof raw !== "string") {
    // Llave intermedia (un objeto) — error de uso.
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Key "${key}" resolves to non-string in locale "${_locale}"`);
    }
    return `[${key}]`;
  }
  return params ? interpolate(raw, params) : raw;
}

// ---- helpers internos ----

function resolveKey(root: unknown, dottedKey: string): unknown {
  const parts = dottedKey.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

const PLACEHOLDER_RE = /\{(\w+)\}/g;

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(PLACEHOLDER_RE, (_match, key) => {
    if (key in params) return String(params[key]);
    return `{${key}}`; // dejar como está si no se proveyó
  });
}
