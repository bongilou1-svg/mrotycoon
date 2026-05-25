// Procesa data raw AeroDataBox → src/assets/airports/ovd.schedule.json + ovd.fleet.json
// con formato del juego. Usa data del 4-10 mayo 2026 (lunes-domingo) con matrículas
// reales asignadas. Saneamiento via operator-rules.mjs.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolveOperator, OPERATOR_NAMES } from "./operator-rules.mjs";

const SOURCE_DAYS = {
  monday:    "2026-05-04",
  tuesday:   "2026-05-05",
  wednesday: "2026-05-06",
  thursday:  "2026-05-07",
  friday:    "2026-05-08",
  saturday:  "2026-05-09",
  sunday:    "2026-05-10",
};

// Tipos handleable (A320 family CFM56/V2500). Resto es notHandled.
function classifyAircraft(model) {
  const m = (model ?? "").toLowerCase();
  // A320 mainline + sharklets
  if (m.includes("a320") && !m.includes("neo")) return { model: "A320", engineVariant: "CFM56", notHandled: false };
  if (m.includes("a321") && !m.includes("neo")) return { model: "A321", engineVariant: "V2500", notHandled: false };
  if (m.includes("a319")) return { model: "A319", engineVariant: "CFM56", notHandled: true }; // de momento no handleable
  // Todo lo demás: notHandled
  if (m.includes("crj") || m.includes("regional-jet")) return { model: "CRJ-1000", engineVariant: "CF34-8C5", notHandled: true };
  if (m.startsWith("e295") || m.includes("embraer 195") || m.includes("e195")) return { model: "E195-E2", engineVariant: "PW1900G", notHandled: true };
  if (m.includes("embraer 175") || m.includes("e175")) return { model: "E175", engineVariant: "CF34-8E", notHandled: true };
  if (m.includes("embraer 190") || m.includes("e190")) return { model: "E190", engineVariant: "CF34-10E", notHandled: true };
  if (m.includes("atr")) return { model: "ATR72-600", engineVariant: "PW127M", notHandled: true };
  if (m.includes("saab")) return { model: "Saab2000", engineVariant: "AE2100A", notHandled: true };
  if (m.includes("boeing 737") || m.includes("b737")) return { model: "B737-800", engineVariant: "CFM56-7B", notHandled: true };
  if (m.includes("a321 neo") || m.includes("a321neo")) return { model: "A321neo", engineVariant: "PW1100G", notHandled: true };
  if (m.includes("a320 neo") || m.includes("a320neo")) return { model: "A320neo", engineVariant: "PW1100G", notHandled: true };
  // Fallback: notHandled
  return { model: "Unknown", engineVariant: "Unknown", notHandled: true };
}

function operatorToAirlineCode(op) {
  // Mapeo operador real ICAO → código IATA usado en airlines.json del juego
  // Esto define quién FACTURA el MRO (dueño de la flota).
  const map = {
    VOE: "V7",  // Volotea
    VLG: "VY",  // Vueling
    ANE: "YW",  // Air Nostrum (callsign IB pero operador físico)
    IBE: "IB",  // Iberia mainline (raro en OVD pero por si acaso)
    IBB: "IB",  // Iberia Express
    EZY: "U2",  // easyJet
    EZS: "U2",  // easyJet Switzerland (mismo brand para el juego)
    NTC: "NT",  // Binter
    DLH: "LH",  // Lufthansa
    KLM: "KL",  // KLM mainline
    KLC: "KL",  // KLM Cityhopper (mismo brand)
    EIN: "EI",  // Aer Lingus
    BAW: "BA",  // British Airways
    AFR: "AF",  // Air France
    RYR: "FR",  // Ryanair
    TVS: "QS",  // Smart Wings
    AEA: "UX",  // Air Europa
    AEX: "X5",  // Air Europa Express
    EVE: "UX",  // Air Europa otro callsign
    FRO: "EZ",  // Sun-Air (BA franquicia, aprox)
  };
  return map[op] ?? op.slice(0, 2);
}

function processDay(dateStr) {
  const flights = [];
  const fleet = new Map(); // reg → {model, engineVariant, airlineCode, airlineName}
  for (const w of ["AM", "PM"]) {
    const path = `data/ovd_raw/${dateStr}_${w}.json`;
    if (!existsSync(path)) {
      console.warn(`[warn] missing ${path}`);
      continue;
    }
    const data = JSON.parse(readFileSync(path, "utf8"));
    for (const ev of data.departures ?? []) processFlight(ev, "departure", flights, fleet);
    for (const ev of data.arrivals ?? []) processFlight(ev, "arrival", flights, fleet);
  }
  return { flights, fleet };
}

function processFlight(ev, type, flights, fleet) {
  const opResult = resolveOperator(ev);
  const opIcao = opResult.op;
  const operatorName = OPERATOR_NAMES[opIcao] ?? opIcao;
  const airlineCode = operatorToAirlineCode(opIcao);
  const cls = classifyAircraft(ev.aircraft?.model);
  const timeStr = type === "arrival"
    ? ev.arrival?.scheduledTime?.local?.slice(11, 16)
    : ev.departure?.scheduledTime?.local?.slice(11, 16);
  if (!timeStr) return; // sin hora válida
  const [h, m] = timeStr.split(":").map(Number);
  const scheduledMinute = h * 60 + m;
  const remote = type === "arrival" ? ev.departure?.airport?.iata : ev.arrival?.airport?.iata;
  const callsign = ev.number?.replace(/\s+/g, "") ?? `${airlineCode}???`;
  flights.push({
    callsign,
    type,
    remote: remote ?? "???",
    scheduledMinute,
    model: cls.model,
    engineVariant: cls.engineVariant,
    airlineCode,
    airlineName: operatorName,
    notHandled: cls.notHandled,
  });
  // Acumular fleet (matrícula → operador real)
  if (ev.aircraft?.reg) {
    fleet.set(ev.aircraft.reg, {
      registration: ev.aircraft.reg,
      model: cls.model,
      engineVariant: cls.engineVariant,
      airlineCode,
      operatorIcao: opIcao,
    });
  }
}

console.log("=== Procesando 7 días reales (2026-05-04 a 10) ===");
const schedule = {
  airport: "Asturias",
  icao: "LEAS",
  name: "Asturias OVD",
  source: "AeroDataBox real data 4-10 mayo 2026 + saneamiento operator-rules",
  version: 2,
  notes: "Datos reales semana 4-10 mayo 2026 (lunes-domingo). Operadores físicos resueltos: callsign IBE+CRJ → ANE, IBB+E295 → NTC, VLG+ATR → AEX, etc.",
  patterns: {},
};
const allFleet = new Map();

for (const [dayKey, dateStr] of Object.entries(SOURCE_DAYS)) {
  const { flights, fleet } = processDay(dateStr);
  flights.sort((a, b) => a.scheduledMinute - b.scheduledMinute);
  schedule.patterns[dayKey] = flights;
  for (const [reg, info] of fleet) allFleet.set(reg, info);
  console.log(`  ${dayKey} (${dateStr}): ${flights.length} flights, ${fleet.size} matrículas únicas`);
}

writeFileSync("src/assets/airports/ovd.schedule.json", JSON.stringify(schedule, null, 2));
console.log("\n✅ Escrito src/assets/airports/ovd.schedule.json");

// Genera ovd.fleet.json con matrículas vistas
const fleetData = {
  airport: "Asturias",
  icao: "LEAS",
  source: "AeroDataBox real data 4-10 mayo 2026",
  notes: "Pool de matrículas reales operando OVD esa semana. FH/cycles plausibles asignados deterministically por hash del registration.",
  fleet: [...allFleet.values()].map((info) => {
    // FH/cycles plausibles por hash deterministic
    const h = [...info.registration].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    const abs = Math.abs(h);
    const totalFH = 8000 + (abs % 25000);
    const totalCycles = 2000 + (abs % 10000);
    return {
      registration: info.registration,
      model: info.model,
      engineVariant: info.engineVariant,
      airlineCode: info.airlineCode,
      operatorIcao: info.operatorIcao,
      totalFH, totalCycles,
      fhSinceLastA: abs % 600, cyclesSinceLastA: abs % 200,
      fhSinceLastC: abs % 6000, cyclesSinceLastC: abs % 2000,
      fhSinceLastD: abs % 22000, cyclesSinceLastD: abs % 8000,
    };
  }),
};
writeFileSync("src/assets/airports/ovd.fleet.json", JSON.stringify(fleetData, null, 2));
console.log(`✅ Escrito src/assets/airports/ovd.fleet.json (${fleetData.fleet.length} matrículas reales)`);

// Resumen por operador
console.log("\n=== Resumen schedule generado (movs / airlineCode) ===");
const counts = {};
for (const dayKey of Object.keys(schedule.patterns)) {
  for (const f of schedule.patterns[dayKey]) {
    counts[f.airlineCode] = (counts[f.airlineCode] ?? 0) + 1;
  }
}
for (const [code, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${code}: ${n} movimientos/sem`);
}
