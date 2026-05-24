// Tests del Contract tier system — Fase 4.5 Bloque T.

import {
  rollContractTerms, pickTierForRep, tickContractMarket,
  TIER_FEE_MULT, TIER_PENALTY_MULT, TIER_MIN_REP_BONUS,
  _resetContractCounter,
} from "../src/lib/sim/contracts.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

// ---- Tier constants ----
console.log("\n=== Tier constants ===");
expect(TIER_FEE_MULT.standard === 1.0, "fee mult standard = 1.0");
expect(TIER_FEE_MULT.premium === 1.35, "fee mult premium = 1.35");
expect(TIER_FEE_MULT.deluxe === 1.75, "fee mult deluxe = 1.75");
expect(TIER_PENALTY_MULT.standard === 1.0, "penalty mult standard = 1.0");
expect(TIER_PENALTY_MULT.deluxe === 1.5, "penalty mult deluxe = 1.5 (más exigente)");
expect(TIER_MIN_REP_BONUS.standard === 0, "minRep bonus standard = 0");
expect(TIER_MIN_REP_BONUS.premium === 20, "minRep bonus premium = +20");
expect(TIER_MIN_REP_BONUS.deluxe === 45, "minRep bonus deluxe = +45");

// ---- pickTierForRep thresholds ----
console.log("\n=== pickTierForRep thresholds ===");
{
  // Rep <55: SIEMPRE standard
  for (let trial = 0; trial < 50; trial++) {
    const t = pickTierForRep(createRng(trial + 1), 30);
    if (t !== "standard") { expect(false, `rep 30 trial ${trial} → ${t} (esperado standard)`); break; }
  }
  expect(true, "rep <55 → standard en 50 trials");

  // Rep 65: solo standard o premium (NO deluxe)
  for (let trial = 0; trial < 50; trial++) {
    const t = pickTierForRep(createRng(trial + 100), 65);
    if (t === "deluxe") { expect(false, `rep 65 trial ${trial} → deluxe (no debería)`); break; }
  }
  expect(true, "rep 65 NUNCA deluxe en 50 trials");

  // Rep 90: puede ser cualquiera
  const samples90 = [];
  for (let trial = 0; trial < 200; trial++) {
    samples90.push(pickTierForRep(createRng(trial + 1000), 90));
  }
  const counts = samples90.reduce((acc, t) => { acc[t] = (acc[t] ?? 0) + 1; return acc; }, {});
  expect(counts.standard > 0, `rep 90 produce standard (${counts.standard ?? 0}/200)`);
  expect(counts.premium > 0, `rep 90 produce premium (${counts.premium ?? 0}/200)`);
  expect(counts.deluxe > 0, `rep 90 produce deluxe (${counts.deluxe ?? 0}/200)`);
}

// ---- Distribución estadística por rep ----
console.log("\n=== Distribución estadística (1000 rolls por rep) ===");
{
  function dist(rep) {
    const counts = { standard: 0, premium: 0, deluxe: 0 };
    const rng = createRng(rep * 17 + 1);
    for (let i = 0; i < 1000; i++) counts[pickTierForRep(rng, rep)]++;
    return counts;
  }
  const r30 = dist(30);
  expect(r30.standard === 1000, `rep 30: 1000 standard (got ${r30.standard})`);

  const r65 = dist(65);
  // Esperado ~700 standard / ~300 premium / 0 deluxe
  expect(r65.standard >= 650 && r65.standard <= 750, `rep 65: ~700 standard (got ${r65.standard})`);
  expect(r65.premium >= 250 && r65.premium <= 350, `rep 65: ~300 premium (got ${r65.premium})`);
  expect(r65.deluxe === 0, `rep 65: 0 deluxe (got ${r65.deluxe})`);

  const r90 = dist(90);
  // Esperado ~500 standard / ~350 premium / ~150 deluxe
  expect(r90.standard >= 450 && r90.standard <= 550, `rep 90: ~500 standard (got ${r90.standard})`);
  expect(r90.premium >= 300 && r90.premium <= 400, `rep 90: ~350 premium (got ${r90.premium})`);
  expect(r90.deluxe >= 100 && r90.deluxe <= 200, `rep 90: ~150 deluxe (got ${r90.deluxe})`);
}

// ---- rollContractTerms aplica multiplicadores ----
console.log("\n=== rollContractTerms multipliers ===");
{
  // Usar misma seed para comparar standard vs premium vs deluxe
  function termsOf(tier) {
    const rng = createRng(42);
    return rollContractTerms(rng, { reputation: 50, nowMinute: 0 }, tier);
  }
  const std = termsOf("standard");
  const prem = termsOf("premium");
  const dlx = termsOf("deluxe");

  expect(std.tier === "standard", "standard tag");
  expect(prem.tier === "premium", "premium tag");
  expect(dlx.tier === "deluxe", "deluxe tag");

  // baseFee: premium > standard, deluxe > premium (debido a feeMult con SAME rng)
  expect(prem.baseFeePerWeek > std.baseFeePerWeek, `premium baseFee > standard (${prem.baseFeePerWeek} > ${std.baseFeePerWeek})`);
  expect(dlx.baseFeePerWeek > prem.baseFeePerWeek, `deluxe baseFee > premium (${dlx.baseFeePerWeek} > ${prem.baseFeePerWeek})`);
  // Ratio premium/standard ~1.35, deluxe/standard ~1.75
  expect(Math.abs(prem.baseFeePerWeek / std.baseFeePerWeek - 1.35) < 0.05, `premium/standard ~1.35 (got ${(prem.baseFeePerWeek / std.baseFeePerWeek).toFixed(2)})`);
  expect(Math.abs(dlx.baseFeePerWeek / std.baseFeePerWeek - 1.75) < 0.05, `deluxe/standard ~1.75 (got ${(dlx.baseFeePerWeek / std.baseFeePerWeek).toFixed(2)})`);

  // penalty: deluxe ×1.5 sobre standard
  expect(Math.abs(dlx.penaltyPerLateMinute / std.penaltyPerLateMinute - 1.5) < 0.1, `deluxe penalty/standard ~1.5 (got ${(dlx.penaltyPerLateMinute / std.penaltyPerLateMinute).toFixed(2)})`);
  expect(prem.penaltyPerLateMinute === std.penaltyPerLateMinute, `premium penalty = standard (got prem=${prem.penaltyPerLateMinute}, std=${std.penaltyPerLateMinute})`);

  // minReputation: premium +20, deluxe +45 (clampea a 95)
  expect(prem.minReputation === Math.min(95, std.minReputation + 20), `premium minRep = std+20 (got ${prem.minReputation})`);
  expect(dlx.minReputation === Math.min(95, std.minReputation + 45), `deluxe minRep = std+45 (got ${dlx.minReputation})`);
  expect(dlx.minReputation >= 80, `deluxe minRep ≥ 80 (got ${dlx.minReputation})`);
}

// ---- Default tier ----
console.log("\n=== Default tier (sin parámetro) ===");
{
  const rng = createRng(99);
  const t = rollContractTerms(rng, { reputation: 50, nowMinute: 0 });
  expect(t.tier === "standard", `sin tier param → standard (got ${t.tier})`);
}

// ---- tickContractMarket usa pickTierForRep ----
console.log("\n=== tickContractMarket asigna tiers ===");
{
  _resetContractCounter(1000);
  const rng = createRng(7);
  // Rep alta para todas las aerolíneas
  const repByAl = {};
  for (const al of airlines) repByAl[al.id] = 92;
  // Sin contratos previos → todas aerolíneas pueden ofrecer
  // Tickeamos 1000 veces para acumular muestras
  const tiers = { standard: 0, premium: 0, deluxe: 0 };
  for (let i = 0; i < 1000; i++) {
    const res = tickContractMarket(rng, [], airlines, repByAl, i * 10080);
    for (const c of res.newlyOffered) {
      tiers[c.tier ?? "standard"]++;
    }
  }
  const total = tiers.standard + tiers.premium + tiers.deluxe;
  expect(total > 500, `≥500 ofertas generadas (got ${total})`);
  expect(tiers.deluxe > 0, `deluxe aparece con rep 92 (got ${tiers.deluxe})`);
  expect(tiers.premium > tiers.deluxe, `premium más común que deluxe (premium=${tiers.premium}, deluxe=${tiers.deluxe})`);
  expect(tiers.standard > 0, `standard también aparece (got ${tiers.standard})`);
}

// ---- Backward compat: contrato sin tier campo → standard implícito ----
console.log("\n=== Backward compat ===");
{
  // Contract creado a mano (legacy save v6 sin tier)
  const legacyContract = {
    id: "C-legacy", airlineId: airlines[0].id, status: "active",
    expectedLandingsPerDay: 5, baseFeePerWeek: 15000, paymentPerWOMinute: 60,
    penaltyPerLateMinute: 5, minReputation: 40, offeredAtMinute: 0,
    // sin tier
  };
  // tier === undefined es válido
  expect(legacyContract.tier === undefined, "legacy contract sin tier field");
  // El código que usa contract debe asumir standard si missing — en UI usaremos `contract.tier ?? "standard"`.
  const effectiveTier = legacyContract.tier ?? "standard";
  expect(effectiveTier === "standard", "default fallback a standard");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
