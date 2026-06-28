// verify-audit-fixes.mjs — demostración EN VIVO de los dos arreglos de producto de la auditoría
// 2026-06-28, sobre el MISMO arranque que la UI (preset LEAS_oviedo, lineMode) y CON gestión
// activa de cuadrillas (como un jugador real: sin asignar, las WO no cierran inspección y no
// rueda ningún finding). No toca el sim: solo observa el estado real y replica el filtro viejo
// vs nuevo para el before/after.
//
//   #1  Los findings de callout ruedan en AMBAS ramas de la inspección (MainTask y Test/direct-
//       dispatch). Prueba estructural: hay findings colgando de WOs que NUNCA pasaron por MainTask
//       (imposibles antes) + tasa empírica ≈ CALLOUT_FINDING_PROB (10%) en vez del viejo ~6%.
//   #2  deferWoManually acepta a un B1 OffShift como firmante del MEL. Escenario con SOLO B1
//       OffShift (ninguno Idle) → filtro viejo (Idle) = 0 firmantes, nuevo (Idle||OffShift) ≥1, y
//       la función real devuelve ok:true. Control negativo: estado no elegible ⇒ rechazado.
//
// Uso: node .scripts/verify-audit-fixes.mjs [seedsFindings] [diasFindings]

import { readFileSync } from "node:fs";
import {
  createGame, advanceGame, deferWoManually, assignCrewToWo, hireCandidate, setMechanicShift,
  CALLOUT_FINDING_PROB,
} from "../src/lib/game.ts";
import { buildDefaultCrews } from "../src/lib/sim/crews.ts";
import { getMelCategory } from "../src/lib/sim/mel.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";

// === Datos (réplica exacta de expert-play / startGameFromPreset) ===
const root = new URL("../", import.meta.url);
const J = (p) => JSON.parse(readFileSync(new URL(p, root)));
const balance = J("src/lib/data/balance.json");
const airlines = J("src/lib/data/airlines.json");
const classification = J("src/lib/data/wo_classification.json");
const kindMap = new Map(classification.classifications.map((c) => [c.id, c.kind]));
const templates = J("src/lib/data/workorders.json").map((w) => ({ ...w, kind: kindMap.get(w.id) ?? "callout" }));
const defs = J("src/lib/data/maintenance_checks.json");
const dailyChecks = J("src/lib/data/daily_checks.json").map((d) => ({ ...d, kind: "mpd" }));
const preset = J("src/lib/data/airports/LEAS_oviedo.preset.json");

const newGame = (seed) => {
  const g = createGame(balance, airlines, templates, seed, defs, dailyChecks, { lineMode: true, airportPreset: preset });
  g.autoPauseEnabled = false; g.shiftGatingEnabled = true; g.clock.speed = 1;
  return g;
};
const tplOf = (id) => templates.find((t) => t.id === id);
const mById = (g, id) => g.mechanics.find((m) => m.id === id);
const POST_INSP = new Set(["MainTask", "Test", "Rework", "Release", "Completed"]);
const allWos = (g) => g.workOrders.concat((g.archive && g.archive.workOrders) || []);

// === Driver activo mínimo (throughput, no economía): día-1 ficha + reparte turnos; cada paso
//     asigna codiciosamente cuadrillas Idle elegibles a las WO en ToPlane. Lo justo para que las
//     inspecciones se cierren y el sim "respire" como en una partida jugada. ===
function makeDriver() {
  let setup = false;
  return function manage(g) {
    const now = g.clock.minute;
    if (!setup && now >= 365) {
      setup = true;
      const rated = g.candidates.filter((c) => (c.typeRatings || []).some((r) => r.model === "A320" && r.engineVariant === "CFM56"));
      for (const cand of rated.slice(0, 3)) hireCandidate(g, cand.id);
      const helpers = g.candidates.filter((c) => c.base === null);
      for (const hc of helpers.slice(0, 2)) hireCandidate(g, hc.id);
      const offs = g.mechanics.filter((m) => (m.base === "B1" || m.base === "B2") && !m.isLeadForeman);
      if (offs[1]) setMechanicShift(g, offs[1].id, "night");
      if (offs[2]) setMechanicShift(g, offs[2].id, "afternoon");
      if (offs[3]) setMechanicShift(g, offs[3].id, "night");
      g.crews = buildDefaultCrews(g.mechanics);
    }
    // Reparto codicioso: cuadrilla con oficial Idle rated para (model, engine, requiredCategory).
    for (const wo of g.workOrders) {
      if (wo.phase !== "ToPlane" || wo.assignedMechanicIds.length > 0) continue;
      const ap = g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
      const tpl = tplOf(wo.templateId);
      if (!ap || !tpl) continue;
      const crew = g.crews.find((c) => c.officerIds.map((id) => mById(g, id)).filter(Boolean).some((m) =>
        m.state === "Idle" && (m.typeRatings || []).some((r) => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === tpl.requiredCategory)));
      if (crew) assignCrewToWo(g, wo.instanceId, crew.id);
    }
  };
}

// ============================================================================
// #1 — Findings de callout en AMBAS ramas de la inspección
// ============================================================================
console.log("\n══════════════════════════════════════════════════════════════════");
console.log(" #1  FINDINGS DE CALLOUT — ¿ruedan también en la rama direct-dispatch?");
console.log("══════════════════════════════════════════════════════════════════");

const N_SEEDS = parseInt(process.argv[2] ?? "20", 10);
const DAYS = parseInt(process.argv[3] ?? "21", 10);
const STEP = 5;

let inspectedCallouts = 0, directDispatch = 0, mainTaskBranch = 0;
let calloutFindings = 0, findingsOnDirect = 0, findingsOnMain = 0;

for (let s = 0; s < N_SEEDS; s++) {
  const g = newGame(1000 + s * 37);
  const drive = makeDriver();
  const phasesSeen = new Map();
  const totalMin = DAYS * DAY_MINUTES;
  for (let t = 0; t < totalMin; t += STEP) {
    advanceGame(g, STEP);
    if (g.gameOver.isOver) break;
    drive(g);
    for (const w of g.workOrders) {
      let set = phasesSeen.get(w.instanceId);
      if (!set) { set = new Set(); phasesSeen.set(w.instanceId, set); }
      set.add(w.phase);
    }
  }

  const branchOf = new Map();
  for (const w of allWos(g)) {
    const tpl = tplOf(w.templateId);
    if (!tpl || w.parentWoInstanceId !== undefined || w.templateId.startsWith("DC-")) continue;
    const seen = phasesSeen.get(w.instanceId) || new Set([w.phase]);
    if (![...seen].some((p) => POST_INSP.has(p))) { branchOf.set(w.instanceId, null); continue; }
    const branch = seen.has("MainTask") ? "main" : "direct";
    branchOf.set(w.instanceId, branch);
    inspectedCallouts++;
    if (branch === "direct") directDispatch++; else mainTaskBranch++;
  }
  const woIndex = new Map(allWos(g).map((w) => [w.instanceId, w]));
  for (const w of allWos(g)) {
    if (w.parentWoInstanceId === undefined) continue;
    const parent = woIndex.get(w.parentWoInstanceId);
    if (!parent || parent.templateId.startsWith("DC-")) continue;
    calloutFindings++;
    const branch = branchOf.get(parent.instanceId);
    if (branch === "direct") findingsOnDirect++;
    else if (branch === "main") findingsOnMain++;
  }
}

const rate = inspectedCallouts ? calloutFindings / inspectedCallouts : 0;
const directFrac = inspectedCallouts ? directDispatch / inspectedCallouts : 0;
const oldExpected = CALLOUT_FINDING_PROB * (1 - directFrac);
console.log(`  seeds=${N_SEEDS}  días=${DAYS}`);
console.log(`  callout-WOs con inspección cerrada (denominador): ${inspectedCallouts}`);
console.log(`    · rama MainTask:        ${mainTaskBranch}`);
console.log(`    · rama Test (direct):   ${directDispatch}  (${(directFrac * 100).toFixed(0)}% direct-dispatch)`);
console.log(`  findings de callout totales: ${calloutFindings}`);
console.log(`    · sobre padre MainTask:  ${findingsOnMain}`);
console.log(`    · sobre padre DIRECT:    ${findingsOnDirect}   ⟵ IMPOSIBLES antes del fix`);
console.log(`  tasa empírica = ${calloutFindings}/${inspectedCallouts} = ${(rate * 100).toFixed(1)}%   (config CALLOUT_FINDING_PROB = ${(CALLOUT_FINDING_PROB * 100).toFixed(0)}%)`);
console.log(`  tasa que daría el código VIEJO (solo MainTask) ≈ ${(oldExpected * 100).toFixed(1)}%`);
const pass1a = findingsOnDirect > 0;
const pass1b = inspectedCallouts >= 100 && Math.abs(rate - CALLOUT_FINDING_PROB) < 0.04;
console.log(`  → ${pass1a ? "✓" : "✗"} hay findings en la rama direct-dispatch (estructuralmente imposibles antes)`);
console.log(`  → ${pass1b ? "✓" : "✗"} N≥100 y la tasa empírica casa con el config (10%), no con el viejo (~6%)`);

// ============================================================================
// #2 — deferWoManually acepta firmante B1 OffShift
// ============================================================================
console.log("\n══════════════════════════════════════════════════════════════════");
console.log(" #2  MEL DEFER — ¿puede firmar un B1 OffShift (fuera de turno)?");
console.log("══════════════════════════════════════════════════════════════════");

const ratedB1For = (g, ap) => g.mechanics.filter((m) => m.base === "B1" && !m.isLeadForeman &&
  m.typeRatings.some((r) => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === "B1"));
const oldFilter = (mechs, ap) => mechs.filter((m) => m.state === "Idle" && m.base === "B1" && !m.isLeadForeman &&
  m.typeRatings.some((r) => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === "B1"));
const newFilter = (mechs, ap) => mechs.filter((m) => (m.state === "Idle" || m.state === "OffShift") && m.base === "B1" && !m.isLeadForeman &&
  m.typeRatings.some((r) => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === "B1"));

function findDeferrable(g) {
  const ACTIVE = new Set(["ToPlane", "Inspection", "MainTask", "Test", "Rework"]);
  for (const w of g.workOrders) {
    const tpl = tplOf(w.templateId);
    if (!tpl || getMelCategory(tpl) === null) continue; // diferible = categoría MEL derivada != null
    if (!ACTIVE.has(w.phase)) continue;
    const ap = g.airplanes.find((a) => a.instanceId === w.airplaneInstanceId);
    if (ap) return { wo: w, ap, mel: getMelCategory(tpl) };
  }
  return null;
}

// Devuelve la PRIMERA partida (de una lista de seeds) que tenga una WO diferible, jugando activo.
function gameWithDeferrable(seeds, maxDays = 14) {
  for (const seed of seeds) {
    const g = newGame(seed);
    const drive = makeDriver();
    const totalMin = maxDays * DAY_MINUTES;
    for (let t = 0; t < totalMin; t += 5) {
      advanceGame(g, 5);
      if (g.gameOver.isOver) break;
      drive(g);
      const found = findDeferrable(g);
      if (found) return { g, seed, ...found };
    }
  }
  return null;
}

const SEEDS2 = [7, 42, 101, 2024, 555, 13, 88, 9001, 314, 271];
const sc = gameWithDeferrable(SEEDS2);
if (!sc) {
  console.log("  ✗ no se halló WO diferible en los seeds de prueba (no debería pasar)");
} else {
  const { g, wo, ap, seed, mel } = sc;
  const ratedB1 = ratedB1For(g, ap);
  console.log(`  escenario (seed ${seed}): WO ${wo.instanceId} MEL ${mel} sobre ${ap.registration} (${ap.model}/${ap.engineVariant})`);
  console.log(`  B1 rated para ese avión: ${ratedB1.length} (${ratedB1.map((m) => m.name).join(", ") || "—"})`);

  for (const m of g.mechanics) if (ratedB1.some((r) => r.id === m.id)) {
    m.state = "OffShift"; m.assignedWoInstanceId = null; m.assignedCheckInstanceId = null;
  }
  const oldEl = oldFilter(g.mechanics, ap), newEl = newFilter(g.mechanics, ap);
  console.log(`\n  — Escenario madrugada: B1 rated todos OffShift, ninguno Idle —`);
  console.log(`    filtro VIEJO (state===Idle):     ${oldEl.length} firmantes  ${oldEl.length === 0 ? "→ defer MUERTO (error)" : ""}`);
  console.log(`    filtro NUEVO (Idle||OffShift):   ${newEl.length} firmantes  ${newEl.length > 0 ? "→ firma " + newEl[0].name : ""}`);
  const r = deferWoManually(g, wo.instanceId);
  console.log(`    deferWoManually(real) → ok=${r.ok}${r.error ? "  error=\"" + r.error + "\"" : ""}`);
  const note = (g.notifications || []).slice().reverse().find((n) => n.text.includes("MEL"));
  if (note) console.log(`    notificación: ${note.text}`);
  const pass2a = oldEl.length === 0 && newEl.length > 0;
  const pass2b = r.ok === true;
  console.log(`  → ${pass2a ? "✓" : "✗"} el filtro viejo no tenía firmante; el nuevo sí (delta real del fix)`);
  console.log(`  → ${pass2b ? "✓" : "✗"} la función real difiere la WO firmada por el B1 OffShift`);

  // Control negativo: escenario fresco, B1 rated en estado NO elegible (Traveling) → debe fallar.
  const scN = gameWithDeferrable(SEEDS2);
  if (scN) {
    for (const m of scN.g.mechanics) if (ratedB1For(scN.g, scN.ap).some((r) => r.id === m.id)) m.state = "Traveling";
    const rN = deferWoManually(scN.g, scN.wo.instanceId);
    const pass2c = rN.ok === false && /Sin B1 habilitado/.test(rN.error || "");
    console.log(`\n  — Control negativo: B1 rated en 'Traveling' (ni Idle ni OffShift) —`);
    console.log(`    deferWoManually(real) → ok=${rN.ok}  error="${rN.error}"`);
    console.log(`  → ${pass2c ? "✓" : "✗"} estado no elegible ⇒ rechazado (el gate sigue vivo)`);
  }
}

console.log("\n══════════════════════════════════════════════════════════════════\n");
