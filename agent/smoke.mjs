// ============================================================================
// agent/smoke.mjs — Smoke test mínimo del agente autónomo
// ============================================================================
// Objetivo: verificar que el juego (1) INICIALIZA sin errores y (2) puede
// SIMULAR al menos un turno (un día completo de game loop) sin lanzar y dejando
// un estado coherente. Es el "¿sigue vivo el motor?" que el agente corre antes
// y después de cada cambio en la rama `autonomous`.
//
// USO:   node agent/smoke.mjs [seed=42] [days=1]
// SALIDA: exit 0 si todo OK, exit 1 si algún check falla o algo lanza.
//
// No usa framework: asserts manuales, igual que tests/*.mjs del repo. Maneja el
// sim headless vía createGame()/advanceGame() (mismo patrón que
// tests/auto_playtest.mjs), sin tocar UI ni Pixi.
// ============================================================================

import { readFileSync } from "node:fs";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";

const SEED = parseInt(process.argv[2] ?? "42", 10);
const DAYS = parseInt(process.argv[3] ?? "1", 10);
const STEP = 5; // minutos por tick, igual que el loop real

const load = (f) => JSON.parse(readFileSync(new URL(`../src/lib/data/${f}`, import.meta.url)));
const balance = load("balance.json");
const airlines = load("airlines.json");
const templates = load("workorders.json");
const defs = load("maintenance_checks.json");
const dailyChecks = load("daily_checks.json");

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m, d) => { fail++; console.log(`  ✗ ${m}`); if (d) console.log(`    ${d}`); };
const expect = (cond, m, d) => (cond ? ok(m) : bad(m, d));

console.log(`\n=== agent smoke · seed=${SEED} days=${DAYS} ===`);

// ---- 1) INICIALIZACIÓN ----
let g;
try {
  g = createGame(balance, airlines, templates, SEED, defs, dailyChecks);
  ok("createGame() no lanza");
} catch (e) {
  bad("createGame() no lanza", e?.stack ?? String(e));
  console.log(`\n=== Total: ${pass} OK, ${fail} FAIL ===`);
  process.exit(1);
}

expect(g && typeof g === "object", "devuelve un GameState");
expect(g.economy?.balance > 0, "balance inicial > 0", `got ${g.economy?.balance}`);
expect(Array.isArray(g.mechanics) && g.mechanics.length > 0, "arranca con ≥1 mecánico", `got ${g.mechanics?.length}`);
expect(Array.isArray(g.contracts) && g.contracts.length > 0, "arranca con ≥1 contrato");
expect(g.reputation && Object.keys(g.reputation.perAirline ?? {}).length > 0, "reputación sembrada por aerolínea");
expect(g.gameOver?.isOver === false, "no arranca en game-over");
const startMinute = g.clock.minute;

// ---- 2) SIMULAR AL MENOS UN TURNO (un día) ----
g.clock.speed = 1;
g.autoPauseEnabled = false; // que no se autopause al primer evento
const ticks = Math.round((DAYS * DAY_MINUTES) / STEP);
let advanceThrew = null;
try {
  for (let i = 0; i < ticks; i++) g = advanceGame(g, STEP);
  ok(`advanceGame() simula ${DAYS} día(s) (${ticks} ticks) sin lanzar`);
} catch (e) {
  advanceThrew = e;
  bad("advanceGame() simula sin lanzar", e?.stack ?? String(e));
}

if (!advanceThrew) {
  expect(g.clock.minute > startMinute, "el reloj avanzó", `start=${startMinute} now=${g.clock.minute}`);
  expect(g.clock.minute - startMinute === DAYS * DAY_MINUTES, "avanzó exactamente el tiempo pedido", `Δ=${g.clock.minute - startMinute}`);
  expect(typeof g.economy.balance === "number" && Number.isFinite(g.economy.balance), "balance sigue siendo número finito", `got ${g.economy.balance}`);
  expect(Array.isArray(g.economy.ledger), "el ledger económico es un array");
  expect(g.gameOver && typeof g.gameOver.isOver === "boolean", "gameOver coherente tras simular", JSON.stringify(g.gameOver));
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
