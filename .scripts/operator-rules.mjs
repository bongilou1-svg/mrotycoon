// Capa de saneamiento: dado un vuelo (modelo, marca, callsign, matrícula),
// devuelve el operador REAL = dueño físico del avión (a quien le hacemos el MRO).
//
// Filosofía: AeroDataBox a veces clasifica por callsign comercial (codeshare,
// franchise, wet-lease). El MRO lo hace al DUEÑO de la flota. Ejemplos:
//   - Iberia callsign + CRJ → Air Nostrum (dueño físico)
//   - Vueling callsign + ATR → Air Europa Express (wet-lease real)
//   - Binter callsign confuso + E295 → Binter
//
// Reglas en orden: la primera que matchee gana. Si nada matchea, fallback al callsign ICAO.

export const OPERATOR_NAMES = {
  ANE: "Air Nostrum",
  IBE: "Iberia",
  IBB: "Iberia Express",
  VLG: "Vueling",
  VOE: "Volotea",
  DLH: "Lufthansa",
  BAW: "British Airways",
  RYR: "Ryanair",
  EZS: "easyJet Switzerland",
  EZY: "easyJet UK",
  NTC: "Binter Canarias",
  FRO: "Sun-Air (BA franchise)",
  AFR: "Air France",
  KLM: "KLM",
  KLC: "KLM Cityhopper",
  AEA: "Air Europa",
  AEX: "Air Europa Express",
  TVS: "Smart Wings",
  EIN: "Aer Lingus",
  EVE: "Air Europa",
  ANS: "Air Nostrum",
};

// Reglas (modelo + brand + callsign + reg) → operador real ICAO.
// El campo `model` se compara con startsWith (lower-case insensitive).
// brand/callsignPrefix son exact-match si están definidos.
const RULES = [
  // ── Air Nostrum opera con CRJ siempre, sea cual sea el callsign comercial ──
  { match: { modelStarts: "bombardier crj" }, op: "ANE" },
  { match: { modelStarts: "crj" }, op: "ANE" },
  { match: { modelEquals: "regional-jet" }, op: "ANE" }, // dataset opaco

  // ── Binter Canarias: Embraer E195/E295 ──
  { match: { modelStarts: "e295" }, op: "NTC" },
  { match: { modelStarts: "embraer 195", brand: "NT" }, op: "NTC" },
  { match: { modelStarts: "embraer 190", brand: "NT" }, op: "NTC" },

  // ── KLM Cityhopper: Embraer E175/E190 con marca KL ──
  { match: { modelStarts: "embraer 175", brand: "KL" }, op: "KLC" },
  { match: { modelStarts: "embraer 190", brand: "KL" }, op: "KLC" },
  { match: { modelStarts: "e175", brand: "KL" }, op: "KLC" },
  { match: { modelStarts: "e190", brand: "KL" }, op: "KLC" },

  // ── Air Europa Express: ATR con cualquier marca ES (VY codeshare, AeroDataBox confuso) ──
  { match: { modelStarts: "atr" }, op: "AEX" },

  // ── Sun-Air (franquicia BA): Saab 2000 ──
  { match: { modelStarts: "saab" }, op: "FRO" },

  // ── Ryanair: Boeing 737 NG con marca FR ──
  { match: { modelStarts: "boeing 737", brand: "FR" }, op: "RYR" },
  { match: { modelStarts: "boeing 737", brand: "QS" }, op: "TVS" },

  // ── Volotea: A319/A320 con marca V7 o callsign VOE ──
  { match: { brand: "V7" }, op: "VOE" },
  { match: { callsignStarts: "VOE" }, op: "VOE" },

  // ── Vueling: Airbus con marca VY o callsign VLG (sin modelo conflictivo) ──
  { match: { brand: "VY", modelStarts: "airbus" }, op: "VLG" },
  { match: { callsignStarts: "VLG", modelStarts: "airbus" }, op: "VLG" },

  // ── easyJet ──
  { match: { brand: "U2" }, op: "EZY" },
  { match: { brand: "U25" }, op: "EZS" },

  // ── Lufthansa ──
  { match: { brand: "LH" }, op: "DLH" },

  // ── Aer Lingus ──
  { match: { brand: "EI" }, op: "EIN" },

  // ── KLM mainline ──
  { match: { brand: "KL" }, op: "KLM" },

  // ── British Airways ──
  { match: { brand: "BA" }, op: "BAW" },

  // ── Air France ──
  { match: { brand: "AF" }, op: "AFR" },
];

function lower(s) { return (s ?? "").toLowerCase(); }

/** Resuelve operador real. Devuelve { op, source } donde source explica qué regla matcheó. */
export function resolveOperator(ev) {
  const model = lower(ev.aircraft?.model);
  const brand = ev.airline?.iata ?? "";
  const callSign = ev.callSign ?? "";
  const callsignPrefix = callSign.match(/^([A-Z]{3})/)?.[1] ?? "";
  const reg = ev.aircraft?.reg ?? "";

  for (let i = 0; i < RULES.length; i++) {
    const r = RULES[i];
    const m = r.match;
    if (m.modelStarts && !model.startsWith(lower(m.modelStarts))) continue;
    if (m.modelEquals && model !== lower(m.modelEquals)) continue;
    if (m.brand && brand !== m.brand) continue;
    if (m.callsignStarts && callsignPrefix !== m.callsignStarts) continue;
    return { op: r.op, source: `rule#${i}` };
  }
  // Fallback: callsign ICAO si existe
  if (callsignPrefix) return { op: callsignPrefix, source: "fallback-callsign" };
  // Fallback final: airline.icao
  return { op: ev.airline?.icao ?? "???", source: "fallback-airline.icao" };
}
