// Tests del gate de desbloqueo de hangares (endgame, lineMode). Audit 2026-06-11: la lógica
// canUnlockHangars + el gate de startBuild/hireCandidate estaban vivos y cableados pero SIN
// cobertura de test (el test de stage existente corre en legacy → lineModeEnabled=false →
// la guarda se cortocircuita y nunca se evalúa). Esto blinda el contrato del gating.
//
// Deep pass 2026-07-01: la media de rep pasa a ser SOLO sobre aerolíneas con contrato activo.
// Antes promediaba las 10 del dataset con ~6 clavadas a 50 (sin vuelos serviciables) → máximo
// teórico ≈75 y el gate de 80 era matemáticamente imposible (medido a 84 días: plateau 57).

import { readFileSync } from "node:fs";
import {
  createGame, startBuild, canUnlockHangars,
  HANGAR_UNLOCK_MIN_REP_AVG, HANGAR_UNLOCK_MIN_BALANCE_EUR, HANGAR_UNLOCK_MIN_ACTIVE_CONTRACTS,
} from "../src/lib/game.ts";
import { loadWorkOrdersWithKind, loadDailyChecksWithKind } from "./helpers/loadTemplates.mjs";

let pass = 0, fail = 0;
function expect(c, m, d) { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); if (d) console.log("    " + d); } }

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));
const dailyChecks = loadDailyChecksWithKind(import.meta.url);

const lineGame = () => createGame(balance, airlines, templates, 42, defs, dailyChecks, { lineMode: true });
function setUnlock(g, { rep = HANGAR_UNLOCK_MIN_REP_AVG, bal = HANGAR_UNLOCK_MIN_BALANCE_EUR, contracts = HANGAR_UNLOCK_MIN_ACTIVE_CONTRACTS } = {}) {
  g.mroStage = 2;
  g.economy.balance = bal;
  g.reputation.perAirline = {};
  airlines.slice(0, 4).forEach((a) => { g.reputation.perAirline[a.id] = rep; });
  g.contracts = [];
  for (let i = 0; i < contracts; i++) g.contracts.push({ id: "C-" + i, airlineId: airlines[i % airlines.length].id, status: "active" });
  g.activeBuild = null;
}

console.log("\n=== sim/hangar unlock gate (lineMode endgame) ===");

// 1. Por defecto (sin cumplir condiciones) → bloqueado, error explícito.
{
  const g = lineGame(); g.mroStage = 2; g.economy.balance = 2_000_000; g.activeBuild = null;
  expect(canUnlockHangars(g) === false, "default: no desbloqueado (rep baja / pocos contratos activos)");
  const r = startBuild(g);
  expect(r.ok === false && /Hangares bloqueados/.test(r.error || ""), "startBuild a stage 3 BLOQUEADO con mensaje", JSON.stringify(r));
}

// 2. Cada condición sola por debajo del umbral NO basta.
{
  let g = lineGame(); setUnlock(g, { rep: HANGAR_UNLOCK_MIN_REP_AVG - 1 });
  expect(canUnlockHangars(g) === false, `rep ${HANGAR_UNLOCK_MIN_REP_AVG - 1} < ${HANGAR_UNLOCK_MIN_REP_AVG} → bloqueado`);
  g = lineGame(); setUnlock(g, { bal: HANGAR_UNLOCK_MIN_BALANCE_EUR - 1 });
  expect(canUnlockHangars(g) === false, `balance ${HANGAR_UNLOCK_MIN_BALANCE_EUR - 1} < 1M → bloqueado`);
  g = lineGame(); setUnlock(g, { contracts: HANGAR_UNLOCK_MIN_ACTIVE_CONTRACTS - 1 });
  expect(canUnlockHangars(g) === false, `${HANGAR_UNLOCK_MIN_ACTIVE_CONTRACTS - 1} contratos < ${HANGAR_UNLOCK_MIN_ACTIVE_CONTRACTS} → bloqueado`);
}

// 3. Cumpliendo las 3 en los límites exactos (≥) → desbloquea + startBuild a stage 3 pasa.
{
  const g = lineGame(); setUnlock(g, {});
  expect(canUnlockHangars(g) === true, "rep80 + 1M + 3 contratos (límites exactos ≥) → DESBLOQUEADO");
  const r = startBuild(g);
  expect(r.ok === true, "startBuild a stage 3 PASA con condiciones cumplidas", JSON.stringify(r));
  expect(g.activeBuild != null, "build en curso creado (mroStage sube al completar, no al iniciar)");
  expect(g.mroStage === 2, "mroStage sigue 2 hasta que el build complete");
}

// 4. Sin reputación por aerolínea → false (contratadas caen al default 50 < 80).
{
  const g = lineGame(); g.reputation.perAirline = {};
  expect(canUnlockHangars(g) === false, "sin reputación por aerolínea → false");
}

// 4b. Deep pass 2026-07-01: las NO contratadas no arrastran la media. 3 clientes a 80 con el
// resto del dataset hundido a 0 → desbloquea igual (la rep que cuentas es la de tus clientes).
{
  const g = lineGame(); setUnlock(g, {});
  airlines.slice(4).forEach((a) => { g.reputation.perAirline[a.id] = 0; }); // no-clientes por los suelos
  expect(canUnlockHangars(g) === true, "media SOLO sobre contratadas: no-clientes a 0 no bloquean");
}

// 5. Solo aplica en lineMode: en legacy (lineModeEnabled=false) startBuild a stage 3 NO mira el gate.
{
  const g = createGame(balance, airlines, templates, 42, defs, dailyChecks); // sin lineMode
  g.mroStage = 2; g.economy.balance = 2_000_000; g.activeBuild = null;
  const r = startBuild(g);
  expect(!(r.error || "").includes("Hangares bloqueados"), "legacy: el gate de hangares NO se aplica");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
