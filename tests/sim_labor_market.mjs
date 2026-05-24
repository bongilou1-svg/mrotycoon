// Bloque K — tests del mercado laboral.

import {
  generateCandidate,
  refreshMarket,
  shouldRefreshMarket,
  candidateToMechanic,
  signingBonusFor,
  severanceFor,
  tickTraining,
  POOL_MIN,
  POOL_MAX,
  MARKET_REFRESH_DAYS,
  SIGNING_BONUS_WEEKS,
  SEVERANCE_WEEKS,
  HELPER_PROMOTION_MINUTES,
  resetCandidateCounter,
} from "../src/lib/sim/labor.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { createGame, advanceGame, hireCandidate, fireMechanic } from "../src/lib/game.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== generateCandidate ===");
resetCandidateCounter(0);
const rng = createRng(42);
const c1 = generateCandidate(rng, balance, 1000);
expect(c1.id === "CND-000001", "primer id CND-000001");
expect(c1.age >= 22 && c1.age <= 58, `edad en rango [22,58] (got ${c1.age})`);
expect(c1.efficiency >= 0.6 && c1.efficiency <= 1.2, `efficiency en rango (got ${c1.efficiency})`);
expect(c1.expectedWeeklySalary > 0, "salario > 0");
expect(c1.personality.length === 3, "3 traits de personality");
expect(new Set(c1.personality).size === 3, "personality traits únicos");
expect(c1.generatedAtMinute === 1000, "generatedAtMinute set");
expect(c1.expiresAtMinute === 1000 + MARKET_REFRESH_DAYS * DAY_MINUTES, "expira en 7 días");
if (c1.base !== null) {
  expect(c1.typeRatings.length > 0, "candidato con base tiene type ratings");
  expect(c1.typeRatings.every(r => r.category === c1.base), "todos los ratings coinciden con base");
} else {
  expect(c1.typeRatings.length === 0, "helper sin ratings");
}

// Distribución base 100 muestras
const dist = { helper: 0, B1: 0, B2: 0 };
for (let i = 0; i < 100; i++) {
  const c = generateCandidate(rng, balance, 0);
  if (c.base === null) dist.helper++;
  else if (c.base === "B1") dist.B1++;
  else if (c.base === "B2") dist.B2++;
}
expect(dist.helper > dist.B2, `más helpers que B2 (h=${dist.helper}, b2=${dist.B2})`);
expect(dist.B1 > dist.B2, "más B1 que B2 (B2 son raros)");

console.log("\n=== refreshMarket ===");
const r2 = createRng(7);
const pool = refreshMarket(r2, [], balance, 0);
expect(pool.length >= POOL_MIN && pool.length <= POOL_MAX, `pool en [${POOL_MIN}, ${POOL_MAX}] (got ${pool.length})`);
const aliveIds = new Set(pool.map(c => c.id));
expect(aliveIds.size === pool.length, "ids únicos en pool");

// Refresh con expirados: mantiene los vivos
const second = refreshMarket(r2, pool, balance, 3 * DAY_MINUTES);
const carryover = second.filter(c => pool.some(p => p.id === c.id)).length;
expect(carryover === pool.length, "todos los vivos se mantienen tras refresh a 3 días");

// Refresh tras expiry: descarta todos los antiguos
const fresh = refreshMarket(r2, pool, balance, 10 * DAY_MINUTES);
const survivors = fresh.filter(c => pool.some(p => p.id === c.id)).length;
expect(survivors === 0, "tras 10 días todos expirados — pool 100% nuevo");
expect(fresh.length >= POOL_MIN, "pool re-poblado al mínimo");

console.log("\n=== shouldRefreshMarket ===");
expect(shouldRefreshMarket(0, MARKET_REFRESH_DAYS * DAY_MINUTES - 1) === false, "antes de 7d, no refresh");
expect(shouldRefreshMarket(0, MARKET_REFRESH_DAYS * DAY_MINUTES) === true, "a los 7d, refresh");
expect(shouldRefreshMarket(0, 30 * DAY_MINUTES) === true, "muy pasado, refresh");

console.log("\n=== signingBonusFor / severanceFor ===");
const sampleCand = { ...c1, expectedWeeklySalary: 500 };
expect(signingBonusFor(sampleCand) === 500 * SIGNING_BONUS_WEEKS, `bonus = 4 semanas (got ${signingBonusFor(sampleCand)})`);
const sampleMech = { weeklySalary: 600 };
expect(severanceFor(sampleMech) === 600 * SEVERANCE_WEEKS, `severance = 8 semanas (got ${severanceFor(sampleMech)})`);

console.log("\n=== candidateToMechanic ===");
const m = candidateToMechanic(c1, "M-100");
expect(m.id === "M-100", "id pasado");
expect(m.name === c1.name, "nombre preservado");
expect(m.base === c1.base, "base preservado");
expect(m.weeklySalary === c1.expectedWeeklySalary, "salario = expected del candidato");
expect(m.state === "Idle", "state Idle al fichar");
expect(m.trainingMinutes === 0, "training arranca a 0");

console.log("\n=== integración: hireCandidate ===");
const g = createGame(balance, airlines, templates, 42, defs);
const initialBalance = g.economy.balance;
const initialMechCount = g.mechanics.length;
const cand = g.candidates[0];
const bonus = signingBonusFor(cand);
const hireRes = hireCandidate(g, cand.id);
expect(hireRes.ok === true, `hire ok (got ${hireRes.error ?? "ok"})`);
expect(g.mechanics.length === initialMechCount + 1, "+1 mecánico");
expect(g.economy.balance === initialBalance - bonus, `balance -= bonus (${initialBalance} - ${bonus} = ${initialBalance - bonus}, got ${g.economy.balance})`);
expect(g.candidates.find(c => c.id === cand.id) === undefined, "candidato retirado del pool");

// Re-hire mismo candidato → falla
const hireRes2 = hireCandidate(g, cand.id);
expect(hireRes2.ok === false, "no se puede re-fichar candidato retirado");

// Hire con balance insuficiente
const gPoor = createGame(balance, airlines, templates, 42, defs);
gPoor.economy.balance = 100; // muy bajo
const candPoor = gPoor.candidates[0];
const hirePoor = hireCandidate(gPoor, candPoor.id);
expect(hirePoor.ok === false, "fail si balance insuficiente");

console.log("\n=== integración: fireMechanic ===");
const g2 = createGame(balance, airlines, templates, 42, defs);
const mech = g2.mechanics[g2.mechanics.length - 1]; // un helper típicamente al final
const bal2 = g2.economy.balance;
const sev = severanceFor(mech);
const fireRes = fireMechanic(g2, mech.id);
expect(fireRes.ok === true, `fire ok (got ${fireRes.error ?? "ok"})`);
expect(g2.mechanics.find(mm => mm.id === mech.id) === undefined, "mecánico retirado");
expect(g2.economy.balance === bal2 - sev, "balance -= severance");

// Fire de un mecánico inexistente → falla
const fireBad = fireMechanic(g2, "M-999");
expect(fireBad.ok === false, "fire inexistente falla");

console.log("\n=== K6: training pasivo ===");
const g3 = createGame(balance, airlines, templates, 42, defs);
g3.autoPauseEnabled = false;
g3.shiftGatingEnabled = false; // Fase 4: test asume helper sigue Working sin gating
// Marcar manualmente un helper como Working con trainingMinutes cerca del umbral
const helperIdx = g3.mechanics.findIndex(m => m.base === null);
expect(helperIdx >= 0, `hay helpers iniciales (got idx=${helperIdx})`);
g3.mechanics[helperIdx] = {
  ...g3.mechanics[helperIdx],
  state: "Working",
  trainingMinutes: HELPER_PROMOTION_MINUTES - 1,
};
const helperBefore = g3.mechanics[helperIdx];
g3.clock.speed = 1;
advanceGame(g3, 5); // step 5 min → debería promocionar (1 < trainingMinutes ya casi)
const helperAfter = g3.mechanics.find(m => m.id === helperBefore.id);
expect(helperAfter.base === "B1", `helper promocionado a B1 (got ${helperAfter.base})`);
expect(helperAfter.typeRatings.length === 1, "1 type rating asignado");
expect(helperAfter.weeklySalary === balance.salaries.b1Junior, "salario subido a b1Junior");
expect(helperAfter.trainingMinutes === 0, "trainingMinutes reseteado tras promo");
const promoNotif = g3.notifications.find(n => /promocionado/.test(n.text));
expect(promoNotif !== undefined, "notif de promoción emitida");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
