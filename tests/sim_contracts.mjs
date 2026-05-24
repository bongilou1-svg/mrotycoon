import {
  generateInitialContracts,
  acceptOffer,
  rejectOffer,
  expireOffers,
  activeContracts,
  liveOffers,
  OFFER_EXPIRY_MINUTES,
} from "../src/lib/sim/contracts.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/contracts ===");
const rng = createRng(42);
const contracts = generateInitialContracts(rng, airlines);

expect(contracts.length === 3, `3 contratos iniciales (got ${contracts.length})`);
expect(activeContracts(contracts).length === 1, "1 activo inicial");
expect(liveOffers(contracts, 0).length === 2, "2 ofertas vivas al inicio");
expect(contracts[0].airlineId === airlines[0].id, "activo es primera aerolínea");
expect(contracts.every(c => c.baseFeePerWeek >= 5000 && c.baseFeePerWeek <= 30000), "fees dentro de rango razonable");
expect(contracts.every(c => c.minReputation >= 0 && c.minReputation <= 100), "minReputation en rango 0-100");
expect(contracts.every(c => c.expectedLandingsPerDay >= 3 && c.expectedLandingsPerDay <= 9), "expected landings 3-9");

const accepted = acceptOffer(contracts, contracts[1].id, 100);
expect(accepted.filter(c => c.status === "active").length === 2, "tras aceptar oferta hay 2 activos");
expect(accepted[1].offeredAtMinute === 100, "offeredAtMinute actualizado al aceptar");

const rejected = rejectOffer(contracts, contracts[1].id);
expect(rejected.filter(c => c.status === "cancelled").length === 1, "tras rechazar hay 1 cancelled");

const beforeExpiry = expireOffers(contracts, OFFER_EXPIRY_MINUTES - 1);
expect(liveOffers(beforeExpiry, OFFER_EXPIRY_MINUTES - 1).length === 2, "antes de expirar siguen vivas");

const afterExpiry = expireOffers(contracts, OFFER_EXPIRY_MINUTES + 10);
expect(afterExpiry.filter(c => c.status === "expired").length === 2, "tras expiry todas marcadas expired");
expect(liveOffers(afterExpiry, OFFER_EXPIRY_MINUTES + 10).length === 0, "0 ofertas vivas post-expiry");

// reproducibilidad
const rng2 = createRng(42);
const contracts2 = generateInitialContracts(rng2, airlines);
expect(JSON.stringify(contracts) === JSON.stringify(contracts2), "mismo seed -> mismos contratos");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
