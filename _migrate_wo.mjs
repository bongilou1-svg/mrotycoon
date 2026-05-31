// Migración de esquema WO/daily: añade `ref` (AMM parseado), `name` (título corto), y
// aplica clasificación de motor "solo lo evidente" (menciona CFM/V2500 → específico).
// Determinista: relee descriptions reales, no inventa. Self-verifica y exit!=0 si algo falla.
import { readFileSync, writeFileSync } from "node:fs";

const WO_PATH = "src/lib/data/workorders.json";
const DC_PATH = "src/lib/data/daily_checks.json";

// --- parse ref AMM: formato "AMM NN-NN-NN-NNN-NNN" (y variantes más cortas tipo "AMM 05-10-15")
const AMM_RE = /AMM\s+\d{2}-\d{2}-\d{2}(?:-\d{2,3})?(?:-\d{2,3})?/;
function parseRef(desc) {
  const m = String(desc || "").match(AMM_RE);
  return m ? m[0].replace(/\s+/g, " ") : null;
}

// --- name: texto antes del primer em-dash; fallbacks antes de "(AMM" / "." / cap 64
function deriveName(desc) {
  let s = String(desc || "").trim();
  const dash = s.split(/\s*—\s*/)[0];
  if (dash && dash.length >= 4 && dash.length <= 72) return dash.trim();
  let cut = s.split(/\s*\(AMM/)[0].split(/\.\s/)[0].trim();
  if (cut.length > 64) cut = cut.slice(0, 61).trim() + "…";
  return cut || s.slice(0, 60);
}

// --- motor: "solo lo evidente". Menciona CFM(56) → CFM56-only; V2500/IAE → V2500-only; else ambos.
function deriveEngines(desc) {
  const s = String(desc || "");
  if (/CFM/i.test(s)) return ["CFM56"];
  if (/V2500|IAE/i.test(s)) return ["V2500"];
  return ["CFM56", "V2500"];
}

// --- flota: familia A320, mantenimiento de línea común → ambos salvo mención específica de A321/A319.
function deriveFleet(prev) {
  // Conservador: respeta lo que ya hubiera; por defecto ambos.
  if (Array.isArray(prev) && prev.length === 1) return prev;
  return ["A320", "A321"];
}

function migrate(entry, isDaily) {
  const ref = parseRef(entry.description);
  const name = deriveName(entry.description);
  const engines = deriveEngines(entry.description);
  const fleet = deriveFleet(entry.aircraftModelsCompatibles);
  // Esquema "serio": orden de campos legible. Conserva todo lo existente.
  const out = {
    id: entry.id,
    ata: entry.ata,
    ref: ref,
    name: name,
    description: entry.description,
    severity: entry.severity,
    isAOG: entry.isAOG,
    deferrable: entry.deferrable,
    requiredCategory: entry.requiredCategory,
    aircraftModelsCompatibles: fleet,
    engineVariantsCompatibles: engines,
    durationMinutes: entry.durationMinutes,
    probability: entry.probability,
    partsRequired: entry.partsRequired || [],
    toolsRequired: entry.toolsRequired || [],
  };
  if (isDaily || entry.isDailyCheck) out.isDailyCheck = true;
  if (entry.melCategory !== undefined) out.melCategory = entry.melCategory;
  if (entry.notes !== undefined) out.notes = entry.notes;
  return out;
}

function run(path, isDaily) {
  const arr = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(arr)) throw new Error(path + " no es array");
  const migrated = arr.map((e) => migrate(e, isDaily));
  // Self-checks
  let cfm = 0, v25 = 0, both = 0, refs = 0, noname = 0;
  for (const m of migrated) {
    if (!m.id || typeof m.id !== "string") throw new Error("id roto en " + m.id);
    if (typeof m.ata !== "number") throw new Error("ata no number en " + m.id);
    if (!m.name || !m.name.length) noname++;
    if (m.ref) refs++;
    const e = m.engineVariantsCompatibles;
    if (e.length === 1 && e[0] === "CFM56") cfm++;
    else if (e.length === 1 && e[0] === "V2500") v25++;
    else if (e.length === 2) both++;
    else throw new Error("engines inválido en " + m.id + ": " + JSON.stringify(e));
    if (!m.aircraftModelsCompatibles.length) throw new Error("fleet vacío en " + m.id);
  }
  if (noname > 0) throw new Error(noname + " entradas sin name en " + path);
  writeFileSync(path, JSON.stringify(migrated, null, 2) + "\n", "utf8");
  return { n: migrated.length, cfm, v25, both, refs };
}

const wo = run(WO_PATH, false);
const dc = run(DC_PATH, true);
const summary = { workorders: wo, dailychecks: dc };
writeFileSync("_migres.txt", "##MIG##" + JSON.stringify(summary) + "##END##\n");
console.log("##MIG##" + JSON.stringify(summary) + "##END##");
