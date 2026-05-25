// Analiza qué matrículas durmieron cada noche en OVD basándose en datos reales.
// Heurística ESTRICTA:
//   - Una matrícula durmió la noche del día N si:
//     1. Tiene al menos un arrival el día N.
//     2. Tras su último arrival del día N, NO tiene ningún departure el mismo día.
//     3. Tiene un departure el día N+1 (= confirma que se quedó hasta la mañana siguiente).
//   - Si N+1 no está en el dataset, no podemos confirmar overnight → descartar.
//
// Para evitar bias en los bordes, requerimos vecino completo. Solo reportamos días con
// datos del día siguiente disponibles.

import { readFileSync, readdirSync } from "node:fs";

const RAW_DIR = "data/ovd_raw";
const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".json")).sort();

// Construir índice: por matrícula, lista de eventos ordenados cronológicamente.
const eventsByReg = new Map();
const datesAvailable = new Set();

for (const f of files) {
  const data = JSON.parse(readFileSync(`${RAW_DIR}/${f}`, "utf8"));
  const date = f.slice(0, 10);
  datesAvailable.add(date);
  for (const dep of data.departures ?? []) {
    const reg = dep.aircraft?.reg;
    if (!reg) continue;
    if (!eventsByReg.has(reg)) eventsByReg.set(reg, []);
    eventsByReg.get(reg).push({
      date,
      utc: dep.departure?.scheduledTime?.utc ?? "",
      time: dep.departure?.scheduledTime?.local?.slice(11, 16) ?? "??:??",
      type: "departure",
      callsign: dep.number,
      airline: dep.airline?.iata ?? "?",
      model: dep.aircraft?.model ?? "?",
      to: dep.arrival?.airport?.iata,
    });
  }
  for (const arr of data.arrivals ?? []) {
    const reg = arr.aircraft?.reg;
    if (!reg) continue;
    if (!eventsByReg.has(reg)) eventsByReg.set(reg, []);
    eventsByReg.get(reg).push({
      date,
      utc: arr.arrival?.scheduledTime?.utc ?? "",
      time: arr.arrival?.scheduledTime?.local?.slice(11, 16) ?? "??:??",
      type: "arrival",
      callsign: arr.number,
      airline: arr.airline?.iata ?? "?",
      model: arr.aircraft?.model ?? "?",
      from: arr.departure?.airport?.iata,
    });
  }
}

for (const evs of eventsByReg.values()) {
  evs.sort((a, b) => a.utc.localeCompare(b.utc));
}

function nextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Para cada matrícula, detectar overnights con heurística estricta
const overnightByDate = new Map();
for (const [reg, evs] of eventsByReg.entries()) {
  // Agrupar eventos por día
  const byDay = new Map();
  for (const ev of evs) {
    if (!byDay.has(ev.date)) byDay.set(ev.date, []);
    byDay.get(ev.date).push(ev);
  }
  for (const [date, dayEvs] of byDay.entries()) {
    const nd = nextDay(date);
    if (!datesAvailable.has(nd)) continue; // sin vecino, no confirmable
    // Último arrival del día
    const arrivals = dayEvs.filter((e) => e.type === "arrival");
    if (arrivals.length === 0) continue;
    const lastArr = arrivals[arrivals.length - 1];
    // ¿Tiene departure DESPUÉS del último arrival ese mismo día?
    const depAfterArr = dayEvs.find((e) => e.type === "departure" && e.utc > lastArr.utc);
    if (depAfterArr) continue; // se fue el mismo día, no durmió
    // ¿Tiene departure el día N+1?
    const ndEvs = byDay.get(nd) ?? [];
    const depNextDay = ndEvs.find((e) => e.type === "departure");
    if (!depNextDay) continue; // si no sale el día siguiente, no confirmamos overnight
    // Es overnight confirmado
    if (!overnightByDate.has(date)) overnightByDate.set(date, []);
    overnightByDate.get(date).push({
      reg, airline: lastArr.airline, model: lastArr.model,
      lastArrTime: lastArr.time, lastArrCallsign: lastArr.callsign,
      nextDepTime: depNextDay.time, nextDepCallsign: depNextDay.callsign, nextDepDate: nd,
    });
  }
}

// Reportar solo días de mayo 2026 con vecino confirmado
console.log("\n=== AVIONES QUE DURMIERON EN OVD — DATOS REALES MAYO 2026 ===\n");
const dates = [...overnightByDate.keys()].filter((d) => d.startsWith("2026-05") && d !== "2026-05-31").sort();
let totalOvernights = 0;
const totalByAirline = {};
const totalByReg = {};
for (const date of dates) {
  const list = overnightByDate.get(date).sort((a, b) =>
    a.airline.localeCompare(b.airline) || a.reg.localeCompare(b.reg)
  );
  console.log(`📅 ${date}  ·  ${list.length} avión${list.length !== 1 ? "es" : ""}:`);
  for (const info of list) {
    console.log(`   ✈️  ${info.reg.padEnd(7)} ${info.airline}  ${info.model.padEnd(30)} llegó ${info.lastArrTime} (${info.lastArrCallsign}) → sale ${info.nextDepTime} (${info.nextDepCallsign})`);
    totalOvernights++;
    totalByAirline[info.airline] = (totalByAirline[info.airline] ?? 0) + 1;
    if (!totalByReg[info.reg]) totalByReg[info.reg] = { airline: info.airline, model: info.model, nights: 0 };
    totalByReg[info.reg].nights++;
  }
}

console.log(`\n=== TOTALES ${dates.length} días (1-30 mayo, excluyendo 31) ===`);
console.log(`Total overnights: ${totalOvernights}`);
console.log(`Promedio/noche: ${(totalOvernights / dates.length).toFixed(2)}`);

console.log("\nPor aerolínea:");
for (const [code, n] of Object.entries(totalByAirline).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${code}: ${n} noches`);
}

console.log("\nMatrículas con MÁS noches en OVD (top 10):");
const topRegs = Object.entries(totalByReg).sort((a, b) => b[1].nights - a[1].nights).slice(0, 10);
for (const [reg, info] of topRegs) {
  console.log(`  ${reg.padEnd(7)} ${info.airline}  ${info.model.padEnd(30)} ${info.nights} noches`);
}
