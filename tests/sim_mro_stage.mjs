// Tests progresión orgánica MRO — Fase 5A Bloque X.

import {
  STAGE_CONFIG,
} from "../src/lib/types/mroStage.ts";
import {
  currentStands, currentLineStandIds, currentBaseStandIds, ALL_STANDS,
} from "../src/lib/sim/stands.ts";
import { createGame, advanceGame, startBuild } from "../src/lib/game.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind, loadDailyChecksWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));
const dailyChecks = loadDailyChecksWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

// ---- STAGE_CONFIG sane ----
console.log("\n=== STAGE_CONFIG ===");
expect(STAGE_CONFIG[1].costEur === 0, "stage 1 costo 0");
expect(STAGE_CONFIG[2].costEur === 100_000, "stage 2 costo 100k");
expect(STAGE_CONFIG[3].costEur === 500_000, "stage 3 costo 500k");
expect(STAGE_CONFIG[4].costEur === 1_500_000, "stage 4 costo 1.5M");
expect(STAGE_CONFIG[2].buildDays === 0, "stage 2 instant");
expect(STAGE_CONFIG[3].buildDays === 14, "stage 3 14d");
expect(STAGE_CONFIG[4].buildDays === 30, "stage 4 30d");
expect(STAGE_CONFIG[4].extraHangars === 3, "stage 4 +3 hangares (escala fixed cost)");

// ---- currentStands según stage ----
// Pivot línea pura · iteración 2026-05-24: stage 1 sube de 3 a 5 line stands
// (aeropuerto regional realista). Progresión escala.
console.log("\n=== currentStands escala con stage ===");
{
  const s1 = currentStands(1);
  expect(s1.length === 6 && s1.filter(s=>s.type==="line").length === 5 && s1.filter(s=>s.type==="base").length === 1, "stage 1: 5 line + 1 base");
  const s2 = currentStands(2);
  expect(s2.length === 7 && s2.filter(s=>s.type==="line").length === 6, "stage 2: 6 line + 1 base");
  const s3 = currentStands(3);
  expect(s3.length === 9 && s3.filter(s=>s.type==="line").length === 7 && s3.filter(s=>s.type==="base").length === 2, "stage 3: 7 line + 2 base");
  const s4 = currentStands(4);
  expect(s4.length === 11 && s4.filter(s=>s.type==="line").length === 7 && s4.filter(s=>s.type==="base").length === 4, "stage 4: 7 line + 4 base");
}

// ---- currentLineStandIds y currentBaseStandIds ----
console.log("\n=== current{Line,Base}StandIds ===");
{
  expect(currentLineStandIds(1).length === 5, "stage 1 line=5");
  expect(currentBaseStandIds(1).length === 1, "stage 1 base=1");
  expect(currentLineStandIds(4).length === 7, "stage 4 line=7");
  expect(currentBaseStandIds(4).length === 4, "stage 4 base=4");
}

// ---- createGame arranca en stage 1 ----
console.log("\n=== createGame default stage 1 ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  expect(g.mroStage === 1, `mroStage = 1 (got ${g.mroStage})`);
  expect(g.activeBuild === null, "activeBuild null inicial");
}

// ---- startBuild stage 2 (instant) ----
console.log("\n=== startBuild stage 2 (instant) ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.economy.balance = 200_000; // suficiente para 100k
  const r = startBuild(g);
  expect(r.ok === true, `ok (got ${r.error ?? "ok"})`);
  expect(g.mroStage === 2, `stage 2 directamente (got ${g.mroStage})`);
  expect(g.economy.balance === 100_000, `balance -100k (got ${g.economy.balance})`);
  expect(g.activeBuild === null, "sin activeBuild (instant)");
}

// ---- startBuild stage 3 (14d build) ----
console.log("\n=== startBuild stage 3 (build time) ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.economy.balance = 700_000;
  g.mroStage = 2;
  const startMin = g.clock.minute;
  const r = startBuild(g);
  expect(r.ok === true, `ok (got ${r.error ?? "ok"})`);
  expect(g.mroStage === 2, `aún stage 2 (got ${g.mroStage})`);
  expect(g.activeBuild !== null, "activeBuild set");
  expect(g.activeBuild.targetStage === 3, "target 3");
  expect(g.activeBuild.completionMinute === startMin + 14 * DAY_MINUTES, `completion +14d`);
  expect(g.economy.balance === 200_000, `balance -500k`);

  // No se puede iniciar otra mientras hay build activo
  const r2 = startBuild(g);
  expect(r2.ok === false, "no doble build");
}

// ---- Balance insuficiente ----
console.log("\n=== startBuild balance insuficiente ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.economy.balance = 50_000;
  const r = startBuild(g);
  expect(r.ok === false, "fail balance insuficiente");
  expect(g.mroStage === 1, "stage sigue 1");
}

// ---- Stage 4 max — no se puede subir ----
console.log("\n=== Stage 4 max ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.mroStage = 4;
  const r = startBuild(g);
  expect(r.ok === false, "fail stage 4 max");
  expect(r.error.includes("máxima"), "error message");
}

// ---- tickConstruction finaliza build ----
console.log("\n=== tickConstruction finaliza build cuando completionMinute pasa ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  g.economy.balance = 700_000;
  g.mroStage = 2;
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1;
  startBuild(g);
  // Avanzar 14d + 1 step
  const targetMin = g.activeBuild.completionMinute;
  let safety = 0;
  while (g.clock.minute < targetMin + 60 && safety < 600) {
    advanceGame(g, 60);
    safety++;
  }
  expect(g.mroStage === 3, `stage 3 alcanzado (got ${g.mroStage})`);
  expect(g.activeBuild === null, "activeBuild limpiado");
  const notif = g.notifications.find(n => n.text.includes("Etapa 3"));
  expect(notif !== undefined, `notif Etapa 3 emitida`);
}

// ---- Stage 3+ usa stands extra ----
console.log("\n=== Stage 3 expande stands disponibles ===");
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks);
  expect(currentLineStandIds(g.mroStage).length === 5, "stage 1: 5 line stands");
  g.mroStage = 3;
  expect(currentLineStandIds(g.mroStage).length === 7, "stage 3: 7 line stands");
  expect(currentBaseStandIds(g.mroStage).length === 2, "stage 3: 2 base stands");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
