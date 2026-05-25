// Tests del framework multi-aeropuerto (preset loading).
// Pivot iteración 2026-05-25.

import { readFileSync } from "node:fs";
import { isAirportPreset } from "../src/lib/types/airport-preset.ts";

let pass = 0, fail = 0;
function expect(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

console.log("\n=== Schema preset OVD (LEAS_oviedo) ===");
const presetData = JSON.parse(readFileSync(
  new URL("../src/lib/data/airports/LEAS_oviedo.preset.json", import.meta.url),
));

expect(isAirportPreset(presetData), "isAirportPreset() validates JSON shape");
expect(presetData.icao === "LEAS", `icao LEAS (got ${presetData.icao})`);
expect(presetData.iata === "OVD", `iata OVD`);
expect(presetData.difficulty === 1, "difficulty 1 (rookie)");
expect(presetData.setup.initialBalance === 250000, "balance inicial 250k");
expect(presetData.setup.initialMechs.length === 1, "1 mec inicial (rookie austero)");
expect(presetData.setup.initialMechs[0].type === "dual-B1B2", "tipo dual-B1B2");
expect(presetData.setup.marketPreloadDualCandidates === 2, "2 candidatos dual en mercado");
expect(presetData.setup.initialContracts.length === 1, "1 contrato inicial");
expect(presetData.setup.initialContracts[0].airlineIata === "IB",
  "contrato inicial = Iberia Express (compat con setup actual)");
expect(presetData.operators.length === 4, "4 operadores definidos (IB/VY/V7/U2)");
const volotea = presetData.operators.find(o => o.iata === "V7");
expect(volotea?.homeBased === true, "Volotea = home based (operador local OVD)");
expect(volotea?.brandThreshold === 55, "Volotea brandThreshold 55");

console.log("\n=== Rejects malformed preset ===");
expect(!isAirportPreset(null), "null rejected");
expect(!isAirportPreset({}), "empty object rejected");
expect(!isAirportPreset({ icao: "X" }), "incomplete (missing fields) rejected");
expect(!isAirportPreset({ ...presetData, icao: "ABC" }), "icao length != 4 rejected");
expect(!isAirportPreset({ ...presetData, difficulty: 7 }), "difficulty > 5 rejected");

console.log("\n=== createGame propaga airportIcao desde preset ===");
{
  const { createGame } = await import("../src/lib/game.ts");
  const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
  const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
  const { loadWorkOrdersWithKind } = await import("./helpers/loadTemplates.mjs");
  const templates = loadWorkOrdersWithKind(import.meta.url);

  // SIN preset: airportIcao undefined (legacy)
  const gLegacy = createGame(balance, airlines, templates, 42);
  expect(gLegacy.airportIcao === undefined, "sin preset: airportIcao undefined (legacy)");

  // CON preset: airportIcao = preset.icao
  const gPreset = createGame(balance, airlines, templates, 42, undefined, undefined, { airportPreset: presetData });
  expect(gPreset.airportIcao === "LEAS", `con preset: airportIcao = LEAS (got ${gPreset.airportIcao})`);
  expect(gPreset.economy.balance === 250000, `con preset: balance inicial = 250k (got ${gPreset.economy.balance})`);

  // Preset con balance custom: aplica
  const customPreset = { ...presetData, setup: { ...presetData.setup, initialBalance: 500000 } };
  const gCustom = createGame(balance, airlines, templates, 42, undefined, undefined, { airportPreset: customPreset });
  expect(gCustom.economy.balance === 500000, `preset balance 500k aplicado (got ${gCustom.economy.balance})`);

  // Mecs del preset (LEAS = 1 dual-B1B2)
  expect(gPreset.mechanics.length === 1, `preset OVD: 1 mec (got ${gPreset.mechanics.length})`);
  const dual = gPreset.mechanics[0];
  expect(dual.base === "B1", "mec dual base=B1");
  expect(dual.typeRatings.length === 8, `dual tiene 8 type ratings A320/A321 × CFM56/V2500 × B1+B2 (got ${dual.typeRatings.length})`);
  expect(dual.typeRatings.some(r => r.category === "B1"), "incluye ratings B1");
  expect(dual.typeRatings.some(r => r.category === "B2"), "incluye ratings B2");
  expect(dual.shift === "morning", "shift morning");

  // Preset con 3 mecs distintos: helper + B1 + B2
  const presetMulti = { ...presetData, setup: { ...presetData.setup, initialMechs: [
    { type: "dual-B1B2", shift: "morning" },
    { type: "B1-mainline", shift: "afternoon" },
    { type: "helper", shift: "night" },
  ]}};
  const gMulti = createGame(balance, airlines, templates, 42, undefined, undefined, { airportPreset: presetMulti });
  expect(gMulti.mechanics.length === 3, `3 mecs en preset multi (got ${gMulti.mechanics.length})`);
  expect(gMulti.mechanics[1].typeRatings.length === 4, "B1-mainline tiene 4 ratings A320/A321 × CFM56/V2500");
  expect(gMulti.mechanics[1].typeRatings.every(r => r.category === "B1"), "B1-mainline solo B1");
  expect(gMulti.mechanics[2].base === null, "helper sin base");
  expect(gMulti.mechanics[2].typeRatings.length === 0, "helper sin ratings");

  // Contratos iniciales desde preset
  expect(gPreset.contracts.length === 1, `1 contrato inicial del preset (got ${gPreset.contracts.length})`);
  const c = gPreset.contracts[0];
  expect(c.status === "active", "contrato active");
  expect(c.baseFeePerWeek === 15000, `fee semanal del preset = 15000 (got ${c.baseFeePerWeek})`);
  expect(c.tier === "line", "tier line del preset");
  // El airline debe matchear el iataCode del preset (IB)
  const iberiaAir = airlines.find(a => a.iataCode === "IB");
  expect(c.airlineId === iberiaAir.id, "contrato vinculado a Iberia (airlineIata IB del preset)");

  // Preset multi-contrato (V7 + VY)
  const presetMultiContract = { ...presetData, setup: { ...presetData.setup, initialContracts: [
    { airlineIata: "V7", tier: "line", baseFeePerWeek: 12000, paymentPerWOMinute: 55, penaltyPerLateMinute: 4, minReputation: 40, expectedLandingsPerDay: 4, withOvernight: true },
    { airlineIata: "VY", tier: "line", baseFeePerWeek: 8000, paymentPerWOMinute: 50, penaltyPerLateMinute: 5, minReputation: 50, expectedLandingsPerDay: 2, withOvernight: false },
  ]}};
  const gMC = createGame(balance, airlines, templates, 42, undefined, undefined, { airportPreset: presetMultiContract });
  expect(gMC.contracts.length === 2, `2 contratos en preset multi-contract (got ${gMC.contracts.length})`);
  const cVOE = gMC.contracts.find(c => c.airlineId === airlines.find(a => a.iataCode === "V7").id);
  expect(cVOE?.baseFeePerWeek === 12000, "Volotea fee 12k del preset");
}

console.log("\n=== Save v14 propaga airportIcao ===");
{
  const { createGame } = await import("../src/lib/game.ts");
  const { serializeGame, deserializeGame } = await import("../src/lib/sim/save.ts");
  const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
  const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
  const { loadWorkOrdersWithKind } = await import("./helpers/loadTemplates.mjs");
  const templates = loadWorkOrdersWithKind(import.meta.url);

  const g = createGame(balance, airlines, templates, 42, undefined, undefined, { airportPreset: presetData });
  const payload = serializeGame(g);
  expect(payload.airportIcao === "LEAS", "serialize incluye airportIcao");
  const g2 = deserializeGame(payload, balance, airlines, templates);
  expect(g2.airportIcao === "LEAS", "deserialize restaura airportIcao");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
