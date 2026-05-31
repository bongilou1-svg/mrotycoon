// Fase C #2 (brief maestro): una aerolínea SOBRE su umbral debe ofertar de forma FIABLE.
// Antes: prob = (rep - threshold) * slope → 0% exacto en el umbral, ~2%/tick justo por encima
// (Volotea +2 ≈ 2%). Ahora: piso LINE_OFFER_BASE_PROB (0.4) en el umbral, subiendo a MAX (0.6)
// en rep=100. Esto es lo que el brief llama "prob que sube rápido (no (exceso)/100)".

import { tickLineCompetition, LINE_OFFER_BASE_PROB, LINE_OFFER_MAX_PROB } from "../src/lib/sim/contracts.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const real = airlines.filter(a => a.iataCode);
const DEFAULT_THRESHOLD = 70; // LINE_OFFER_REP_THRESHOLD fallback cuando brandThreshold es null

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }
function makeRng(v) { return { next: () => v }; }
function repAtOwnThreshold(delta = 0) {
  const m = {};
  for (const a of real) m[a.id] = (a.brandThreshold ?? DEFAULT_THRESHOLD) + delta;
  return m;
}

console.log("\n=== constantes del piso ===");
expect(LINE_OFFER_BASE_PROB === 0.4, `LINE_OFFER_BASE_PROB = 0.4 (got ${LINE_OFFER_BASE_PROB})`);
expect(LINE_OFFER_MAX_PROB > LINE_OFFER_BASE_PROB, `MAX (${LINE_OFFER_MAX_PROB}) > BASE (${LINE_OFFER_BASE_PROB})`);

console.log("\n=== JUSTO en el umbral + rng < piso → TODAS ofertan (antes: 0% → ninguna) ===");
{
  // prob en el umbral = BASE_PROB (0.4). rng 0.3 < 0.4 → oferta. Con la fórmula vieja prob=0 → cero.
  const res = tickLineCompetition(makeRng(0.3), [], real, repAtOwnThreshold(0), 1000);
  expect(res.newOffers.length === real.length,
    `las ${real.length} aerolíneas en su umbral ofertan (got ${res.newOffers.length})`);
}

console.log("\n=== JUSTO en el umbral + rng > piso → ninguna (confirma que el piso es 0.4, no 1.0) ===");
{
  const res = tickLineCompetition(makeRng(0.5), [], real, repAtOwnThreshold(0), 1000);
  expect(res.newOffers.length === 0, `rng 0.5 > piso 0.4 → cero ofertas (got ${res.newOffers.length})`);
}

console.log("\n=== POR DEBAJO del umbral → ninguna oferta (guard intacto, no regresión) ===");
{
  const res = tickLineCompetition(makeRng(0.01), [], real, repAtOwnThreshold(-5), 1000);
  expect(res.newOffers.length === 0, `5 pts bajo umbral → cero ofertas pese a rng mínimo (got ${res.newOffers.length})`);
}

console.log("\n=== rep máxima (100) → prob MAX (0.6): rng 0.55 oferta, 0.65 no ===");
{
  const rep100 = {}; for (const a of real) rep100[a.id] = 100;
  const yes = tickLineCompetition(makeRng(0.55), [], real, rep100, 1000);
  expect(yes.newOffers.length === real.length, `rng 0.55 < MAX 0.6 → todas ofertan (got ${yes.newOffers.length})`);
  const no = tickLineCompetition(makeRng(0.65), [], real, rep100, 1000);
  expect(no.newOffers.length === 0, `rng 0.65 > MAX 0.6 → ninguna (got ${no.newOffers.length})`);
}

console.log("\n=== fiabilidad: en el umbral, ~certero en pocos ticks semanales ===");
{
  // prob 0.4/tick → P(al menos 1 oferta en N ticks) = 1 - 0.6^N. N=6 → ~95.3%.
  // Simulamos con una rng pseudo-determinista por tick para una sola aerolínea.
  const oneAirline = [real[0]];
  const rep = { [real[0].id]: (real[0].brandThreshold ?? DEFAULT_THRESHOLD) };
  const seq = [0.7, 0.8, 0.65, 0.9, 0.72, 0.2]; // 5 fallos (>0.4) y al 6º acierta (0.2<0.4)
  let i = 0;
  const rng = { next: () => seq[i++] };
  let offered = false;
  for (let tick = 0; tick < 6 && !offered; tick++) {
    const res = tickLineCompetition(rng, [], oneAirline, rep, 1000 + tick);
    if (res.newOffers.length > 0) offered = true;
  }
  expect(offered, "una aerolínea en el umbral acaba ofertando en ≤6 ticks semanales (~1.5 meses)");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
