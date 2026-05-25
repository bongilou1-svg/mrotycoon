// Procesa data raw AeroDataBox → src/assets/airports/{slug}.schedule.json + {slug}.fleet.json
// con formato del juego. Usa los 7 días lunes-domingo (4-10 mayo 2026) con matrículas
// reales asignadas. Saneamiento via operator-rules.mjs.
//
// Uso:
//   node .scripts/process-airport-schedule.mjs <ICAO> [slug] [cityName]
//
// Ejemplos:
//   node .scripts/process-airport-schedule.mjs LEAS ovd Asturias
//   node .scripts/process-airport-schedule.mjs LEBB bio Bilbao
//   node .scripts/process-airport-schedule.mjs LEAL alc Alicante
//
// Requiere: data/{slug}_raw/2026-05-04..10_{AM,PM}.json (bajados por fetch-airport-week.mjs).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolveOperator, OPERATOR_NAMES } from "./operator-rules.mjs";

const ICAO = (process.argv[2] ?? "").toUpperCase();
const SLUG = (process.argv[3] ?? ICAO).toLowerCase();
const CITY = process.argv[4] ?? ICAO;
if (!ICAO) {
  console.error("Uso: node .scripts/process-airport-schedule.mjs <ICAO> [slug] [cityName]");
  console.error("Ejemplo: node .scripts/process-airport-schedule.mjs LEBB bio Bilbao");
  process.exit(1);
}

const SOURCE_DAYS = {
  monday:    "2026-05-04",
  tuesday:   "2026-05-05",
  wednesday: "2026-05-06",
  thursday:  "2026-05-07",
  friday:    "2026-05-08",
  saturday:  "2026-05-09",
  sunday:    "2026-05-10",
};

const RAW_DIR = `data/${SLUG}_raw`;
const OUT_SCHEDULE = `src/assets/airports/${SLUG}.schedule.json`;
const OUT_FLEET = `src/assets/airports/${SLUG}.fleet.json`;

// Tipos handleable (A320 family CFM56/V2500). Resto es notHandled.
function classifyAircraft(model) {
  const m = (model ?? "").toLowerCase();
  if (m.includes("a320") && !m.includes("neo")) return { model: "A320", engineVariant: "CFM56", notHandled: false };
  if (m.includes("a321") && !m.includes("neo")) return { model: "A321", engineVariant: "V2500", notHandled: false };
  if (m.includes("a319")) return { model: "A319", engineVariant: "CFM56", notHandled: true };
  if (m.includes("crj") || m.includes("regional-jet")) return { model: "CRJ-1000", engineVariant: "CF34-8C5", notHandled: true };
  if (m.startsWith("e295") || m.includes("embraer 195") || m.includes("e195")) return { model: "E195-E2", engineVariant: "PW1900G", notHandled: true };
  if (m.includes("embraer 175") || m.includes("e175")) return { model: "E175", engineVariant: "CF34-8E", notHandled: true };
  if (m.includes("embraer 190") || m.includes("e190")) return { model: "E190", engineVariant: "CF34-10E", notHandled: true };
  if (m.includes("atr")) return { model: "ATR72-600", engineVariant: "PW127M", notHandled: true };
  if (m.includes("saab")) return { model: "Saab2000", engineVariant: "AE2100A", notHandled: true };
  if (m.includes("boeing 737") || m.includes("b737")) return { model: "B737-800", engineVariant: "CFM56-7B", notHandled: true };
  if (m.includes("a321 neo") || m.includes("a321neo")) return { model: "A321neo", engineVariant: "PW1100G", notHandled: true };
  if (m.includes("a320 neo") || m.includes("a320neo")) return { model: "A320neo", engineVariant: "PW1100G", notHandled: true };
  return { model: "Unknown", engineVariant: "Unknown", notHandled: true };
}

function operatorToAirlineCode(op) {
  // operador real ICAO → código IATA usado en airlines.json del juego.
  // Esto define quién FACTURA el MRO (dueño de la flota, no necesariamente quien aparece
  // en el callsign — IB CRJ es realmente ANE = Air Nostrum, IBB E295 es NTC = Binter).
  const map = {
    VOE: "V7",  VLG: "VY",  ANE: "YW",  IBE: "IB",  IBB: "IB",
    EZY: "U2",  EZS: "U2",  NTC: "NT",  DLH: "LH",  KLM: "KL",
    KLC: "KL",  EIN: "EI",  BAW: "BA",  AFR: "AF",  RYR: "FR",
    TVS: "QS",  AEA: "UX",  AEX: "X5",  EVE: "UX",  FRO: "EZ",
    ANS: "AS",  // air nostrum spare
  };
  return map[op] ?? op.slice(0, 2);
}

function processDay(dateStr) {
  const flights = [];
  const fleet = new Map();
  for (const w of ["AM", "PM"]) {
    const path = `${RAW_DIR}/${dateStr}_${w}.json`;
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
  if (!timeStr) return;
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
    // Pivot iteración 2026-05-25 — matrícula REAL del raw (si AeroDataBox la trae).
    // Habilita cálculo correcto de pernoctas por matrícula (no por callsign hash).
    reg: ev.aircraft?.reg ?? null,
  });
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

console.log(`=== Procesando ${ICAO} (${SLUG}) 7 días reales (2026-05-04 a 10) ===`);
console.log(`Raw: ${RAW_DIR}`);
const schedule = {
  airport: CITY,
  icao: ICAO,
  name: `${CITY} ${SLUG.toUpperCase()}`,
  source: "AeroDataBox real data 4-10 mayo 2026 + saneamiento operator-rules",
  version: 2,
  notes: `Datos reales semana 4-10 mayo 2026 de ${ICAO}. Operadores físicos resueltos via .scripts/operator-rules.mjs (callsigns IBE/IBB/etc → ANE/NTC/etc según modelo+marca).`,
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

// Pivot iteración 2026-05-25 — Pre-cálculo de stats de pernoctas reales por airline.
// El panel del juego usa estas stats en lugar de heurísticas frágiles. Una matrícula
// pernoctó el día N si:
//   1. Tuvo al menos un arrival el día N
//   2. Tras su último arrival del día N, NO tuvo ningún departure ese día
//   3. Tuvo un departure el día N+1 (= durmió y voló mañana)
// Cuenta TODAS las matrículas que pernoctan cada noche (no solo la "última del día").
const PATTERN_KEYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
function computeOvernightStats() {
  // Recoger todos los flights por (reg, dayKey)
  const byRegDay = {};
  for (const [dayKey, flights] of Object.entries(schedule.patterns)) {
    for (const f of flights) {
      if (!f.reg) continue;
      const k = f.reg + "|" + dayKey;
      if (!byRegDay[k]) byRegDay[k] = { reg: f.reg, dayKey, airlineCode: f.airlineCode, arrivals: [], departures: [] };
      byRegDay[k][f.type === "arrival" ? "arrivals" : "departures"].push(f);
    }
  }
  const overnights = {}; // airlineCode -> { totalPerWeek, perDay: { dayKey: count }, distinctRegs: Set }
  for (const e of Object.values(byRegDay)) {
    if (e.arrivals.length === 0) continue;
    const lastArr = e.arrivals.reduce((m, a) => a.scheduledMinute > m.scheduledMinute ? a : m, e.arrivals[0]);
    const sameDayDepAfter = e.departures.some(d => d.scheduledMinute > lastArr.scheduledMinute);
    if (sameDayDepAfter) continue;
    const dayIdx = PATTERN_KEYS.indexOf(e.dayKey);
    const nextDayKey = PATTERN_KEYS[(dayIdx + 1) % 7];
    const kNext = e.reg + "|" + nextDayKey;
    const nextEntry = byRegDay[kNext];
    if (!nextEntry || nextEntry.departures.length === 0) continue;
    // ✓ Pernoctó
    if (!overnights[e.airlineCode]) overnights[e.airlineCode] = { totalPerWeek: 0, perDay: {}, distinctRegs: new Set() };
    overnights[e.airlineCode].totalPerWeek++;
    overnights[e.airlineCode].perDay[e.dayKey] = (overnights[e.airlineCode].perDay[e.dayKey] || 0) + 1;
    overnights[e.airlineCode].distinctRegs.add(e.reg);
  }
  // Convertir Set → array para JSON-serializable
  const out = {};
  for (const [code, s] of Object.entries(overnights)) {
    out[code] = {
      totalPerWeek: s.totalPerWeek,
      perDay: s.perDay,
      distinctRegs: s.distinctRegs.size,
      avgPerNight: Math.round(s.totalPerWeek / 7 * 10) / 10,
    };
  }
  return out;
}
schedule.overnightStats = computeOvernightStats();

writeFileSync(OUT_SCHEDULE, JSON.stringify(schedule, null, 2));
console.log(`\n✅ Escrito ${OUT_SCHEDULE}`);
console.log(`\n=== Pernoctas REALES por airline (matrícula que duerme aquí + sale día siguiente) ===`);
const ovs = Object.entries(schedule.overnightStats).sort((a,b) => b[1].totalPerWeek - a[1].totalPerWeek);
for (const [code, st] of ovs) {
  if (st.totalPerWeek === 0) continue;
  console.log(`  ${code.padEnd(4)}  ${String(st.totalPerWeek).padStart(3)} pernoctas/sem  (~${st.avgPerNight}/noche · ${st.distinctRegs} matrículas distintas)`);
}

const fleetData = {
  airport: CITY,
  icao: ICAO,
  source: "AeroDataBox real data 4-10 mayo 2026",
  notes: `Pool de matrículas reales operando ${ICAO} esa semana. FH/cycles plausibles asignados deterministically por hash del registration.`,
  fleet: [...allFleet.values()].map((info) => {
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
writeFileSync(OUT_FLEET, JSON.stringify(fleetData, null, 2));
console.log(`✅ Escrito ${OUT_FLEET} (${fleetData.fleet.length} matrículas reales)`);

// Resumen por operador
console.log(`\n=== Resumen schedule generado (movs / airlineCode) ===`);
const counts = {};
for (const dayKey of Object.keys(schedule.patterns)) {
  for (const f of schedule.patterns[dayKey]) {
    counts[f.airlineCode] = (counts[f.airlineCode] ?? 0) + 1;
  }
}
for (const [code, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${code}: ${n} movimientos/sem`);
}
