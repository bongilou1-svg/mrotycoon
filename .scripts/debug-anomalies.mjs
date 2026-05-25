// Inspecciona casos raros del dataset:
// 1. IBE (Iberia) operando CRJX → debería ser A320
// 2. IBB (Iberia Express) operando E295 marca NT → caos
// 3. VLG (Vueling) operando ATR → imposible
//
// Mostramos los campos brutos para diagnosticar si es bug AeroDataBox o de parsing.

import { readFileSync, readdirSync } from "node:fs";

const RAW_DIR = "data/ovd_raw";
const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".json")).sort();

const cases = {
  "IBE+CRJ": [],
  "IBB+anything-non-A320": [],
  "VLG+non-Airbus": [],
};

for (const f of files) {
  const data = JSON.parse(readFileSync(`${RAW_DIR}/${f}`, "utf8"));
  for (const list of [data.arrivals ?? [], data.departures ?? []]) {
    for (const ev of list) {
      const cs = ev.callSign ?? "";
      const model = ev.aircraft?.model ?? "";
      const opIcao = cs.match(/^([A-Z]{3})/)?.[1];
      const brand = ev.airline?.iata;
      const airIcao = ev.airline?.icao;
      const reg = ev.aircraft?.reg;
      const number = ev.number;
      // CASO 1: callsign IBE + CRJ
      if (opIcao === "IBE" && model.includes("CRJ") && cases["IBE+CRJ"].length < 5) {
        cases["IBE+CRJ"].push({ date: f, number, callSign: cs, brand, airIcao, model, reg });
      }
      // CASO 2: callsign IBB no-A320
      if (opIcao === "IBB" && !model.includes("A320") && !model.includes("A321") && cases["IBB+anything-non-A320"].length < 5) {
        cases["IBB+anything-non-A320"].push({ date: f, number, callSign: cs, brand, airIcao, model, reg });
      }
      // CASO 3: VLG no-Airbus
      if (opIcao === "VLG" && !model.includes("Airbus") && cases["VLG+non-Airbus"].length < 5) {
        cases["VLG+non-Airbus"].push({ date: f, number, callSign: cs, brand, airIcao, model, reg });
      }
    }
  }
}

for (const [caseName, items] of Object.entries(cases)) {
  console.log(`\n=== Caso: ${caseName} (${items.length} ejemplos) ===`);
  for (const x of items) {
    console.log(JSON.stringify(x));
  }
}

// Estadística: distribución callSign vs brand vs model
console.log("\n=== Distribución callSign prefix (top 20) ===");
const csPrefix = {};
for (const f of files) {
  const data = JSON.parse(readFileSync(`${RAW_DIR}/${f}`, "utf8"));
  for (const list of [data.arrivals ?? [], data.departures ?? []]) {
    for (const ev of list) {
      const cs = ev.callSign ?? "";
      const opIcao = cs.match(/^([A-Z]{3})/)?.[1] ?? "(no callsign)";
      csPrefix[opIcao] = (csPrefix[opIcao] ?? 0) + 1;
    }
  }
}
for (const [k, v] of Object.entries(csPrefix).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${k}: ${v}`);
}
