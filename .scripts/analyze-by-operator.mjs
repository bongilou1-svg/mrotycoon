// Análisis OVD por OPERADOR REAL (no marca comercial codeshare).
// El operador real se extrae del `callSign` (prefijo ICAO de 3 letras):
//   ANE = Air Nostrum   (opera IB Regional)
//   IBE = Iberia mainline
//   VLG = Vueling
//   VOE = Volotea
//   DLH = Lufthansa
//   BAW = British Airways
//   RYR = Ryanair
//   EZS / EZY = easyJet (Switzerland / UK)
//   IBB = Iberia Express
//   NTC = Binter Canarias
//   ...
// Si no hay callSign, fallback a `airline.icao` (menos fiable porque puede ser codeshare).
//
// Reporta por operador: total movimientos, turnarounds, overnights, matrículas únicas, modelos.

import { readFileSync, readdirSync } from "node:fs";
import { OPERATOR_NAMES, resolveOperator } from "./operator-rules.mjs";

const RAW_DIR = "data/ovd_raw";
const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".json")).sort();

function extractOperatorIcao(ev) {
  return resolveOperator(ev).op;
}

// Cargar eventos
const eventsByOperator = new Map(); // ICAO → {arrivals: [], departures: [], regs: Set, models: Set}
const eventsByReg = new Map();
const datesAvailable = new Set();

for (const f of files) {
  const data = JSON.parse(readFileSync(`${RAW_DIR}/${f}`, "utf8"));
  const date = f.slice(0, 10);
  datesAvailable.add(date);
  const accumulate = (kind, list) => {
    for (const raw of list ?? []) {
      const op = extractOperatorIcao(raw);
      if (!eventsByOperator.has(op)) eventsByOperator.set(op, {
        arrivals: 0, departures: 0, regs: new Set(), models: new Set(),
        commercialBrands: new Set(),
      });
      const opStats = eventsByOperator.get(op);
      opStats[kind === "arrival" ? "arrivals" : "departures"]++;
      if (raw.aircraft?.reg) opStats.regs.add(raw.aircraft.reg);
      if (raw.aircraft?.model) opStats.models.add(raw.aircraft.model);
      if (raw.airline?.iata) opStats.commercialBrands.add(raw.airline.iata);
      // Index by reg para overnight analysis
      const reg = raw.aircraft?.reg;
      if (reg) {
        if (!eventsByReg.has(reg)) eventsByReg.set(reg, []);
        const movement = kind === "arrival" ? raw.arrival : raw.departure;
        eventsByReg.get(reg).push({
          date,
          utc: movement?.scheduledTime?.utc ?? "",
          time: movement?.scheduledTime?.local?.slice(11, 16) ?? "??:??",
          type: kind,
          operator: op,
          model: raw.aircraft?.model ?? "?",
        });
      }
    }
  };
  for (const dep of data.departures ?? []) accumulate("departure", [dep]);
  for (const arr of data.arrivals ?? []) accumulate("arrival", [arr]);
}

// Ordenar eventos por reg cronológicamente
for (const evs of eventsByReg.values()) evs.sort((a, b) => a.utc.localeCompare(b.utc));

function nextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Calcular overnights vs turnarounds por operador
// Solo días con vecino completo en dataset Y matrícula asignada (post-FIDS).
const overnightByOp = {}; // op → count
const turnaroundByOp = {}; // op → count (matrícula que llega+sale mismo día)
const overnightRegs = {}; // op → Set de regs que durmieron al menos 1 vez

for (const [reg, evs] of eventsByReg.entries()) {
  // Agrupar por día
  const byDay = new Map();
  for (const ev of evs) {
    if (!byDay.has(ev.date)) byDay.set(ev.date, []);
    byDay.get(ev.date).push(ev);
  }
  for (const [date, dayEvs] of byDay.entries()) {
    // Solo analizar días 2026-05-01 a 2026-05-24 (datos fiables con matrícula)
    if (date < "2026-05-01" || date > "2026-05-24") continue;
    const nd = nextDay(date);
    if (!datesAvailable.has(nd)) continue;
    const arrivals = dayEvs.filter((e) => e.type === "arrival");
    const departures = dayEvs.filter((e) => e.type === "departure");
    // Operador inferido del último arrival (o departure si solo hay deps)
    const lastEv = arrivals.length > 0 ? arrivals[arrivals.length - 1] : departures[departures.length - 1];
    if (!lastEv) continue;
    const op = lastEv.operator;
    // Turnarounds: cada arrival con departure pareja POSTERIOR mismo día
    for (const arr of arrivals) {
      const pairedDep = departures.find((d) => d.utc > arr.utc);
      if (pairedDep) {
        turnaroundByOp[op] = (turnaroundByOp[op] ?? 0) + 1;
      }
    }
    // Overnight: último arrival sin departure posterior mismo día Y con dep el día siguiente
    if (arrivals.length === 0) continue;
    const lastArr = arrivals[arrivals.length - 1];
    const depAfterLast = departures.find((d) => d.utc > lastArr.utc);
    if (depAfterLast) continue; // no overnight, se fue el mismo día
    const ndEvs = byDay.get(nd) ?? [];
    const depNextDay = ndEvs.find((e) => e.type === "departure");
    if (!depNextDay) continue;
    overnightByOp[op] = (overnightByOp[op] ?? 0) + 1;
    if (!overnightRegs[op]) overnightRegs[op] = new Set();
    overnightRegs[op].add(reg);
  }
}

// Reportar tabla
console.log("\n=== MOVIMIENTOS OVD 1-24 MAYO 2026 POR OPERADOR REAL ===");
console.log("(operador inferido del callSign ICAO, no de la marca comercial)\n");

const rows = [];
for (const [op, stats] of eventsByOperator.entries()) {
  // Filtrar al periodo 1-24 mayo (ya está en arrivals/departures totales sin filtro fecha — refinamos)
  rows.push({
    op,
    name: OPERATOR_NAMES[op] ?? op,
    arr: stats.arrivals,
    dep: stats.departures,
    turnarounds: turnaroundByOp[op] ?? 0,
    overnights: overnightByOp[op] ?? 0,
    overnightRegs: overnightRegs[op]?.size ?? 0,
    uniqueRegs: stats.regs.size,
    models: [...stats.models].join(", "),
    brands: [...stats.commercialBrands].join(", "),
  });
}
rows.sort((a, b) => (b.arr + b.dep) - (a.arr + a.dep));

console.log("Operador            Movs (a/d)   Turnaround  Overnights  Matr.over  Matr.total  Modelos / Marcas comerciales");
console.log("─".repeat(120));
for (const r of rows) {
  const ops = `${r.op} ${r.name}`.padEnd(28);
  const movs = `${r.arr}/${r.dep}`.padEnd(12);
  const turn = String(r.turnarounds).padEnd(11);
  const over = String(r.overnights).padEnd(11);
  const overRegs = String(r.overnightRegs).padEnd(10);
  const totalRegs = String(r.uniqueRegs).padEnd(11);
  const info = r.brands.length > 0 && r.brands !== r.op ? `[brands: ${r.brands}] ` : "";
  console.log(`${ops}${movs}${turn}${over}${overRegs}${totalRegs}${info}${r.models}`);
}

// Top matrículas overnight
console.log("\n=== MATRÍCULAS CON MÁS NOCHES (base operativa real OVD) ===");
const regNightCount = {};
for (const [reg, evs] of eventsByReg.entries()) {
  const byDay = new Map();
  for (const ev of evs) {
    if (!byDay.has(ev.date)) byDay.set(ev.date, []);
    byDay.get(ev.date).push(ev);
  }
  let nights = 0;
  let op = "?";
  let model = "?";
  for (const [date, dayEvs] of byDay.entries()) {
    if (date < "2026-05-01" || date > "2026-05-24") continue;
    const arrivals = dayEvs.filter((e) => e.type === "arrival");
    if (arrivals.length === 0) continue;
    op = arrivals[0].operator;
    model = arrivals[0].model;
    const lastArr = arrivals[arrivals.length - 1];
    const depAfter = dayEvs.find((e) => e.type === "departure" && e.utc > lastArr.utc);
    if (depAfter) continue;
    const ndEvs = byDay.get(nextDay(date)) ?? [];
    if (!ndEvs.find((e) => e.type === "departure")) continue;
    nights++;
  }
  if (nights > 0) regNightCount[reg] = { op, model, nights };
}
const topRegs = Object.entries(regNightCount).sort((a, b) => b[1].nights - a[1].nights).slice(0, 15);
console.log("Matrícula  Op    Operador          Modelo                          Noches");
for (const [reg, info] of topRegs) {
  console.log(`${reg.padEnd(11)}${info.op}   ${(OPERATOR_NAMES[info.op] ?? info.op).padEnd(18)}${info.model.padEnd(32)}${info.nights}`);
}
