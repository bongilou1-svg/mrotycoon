// Fetch semana 1-7 mayo 2026 OVD desde AeroDataBox.
// Guarda raw en data/ovd_raw/YYYY-MM-DD_{AM,PM}.json.
// Sleep 1.5s entre calls para no pasar rate limit (1 req/s).

import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const KEY = process.argv[2];
if (!KEY) { console.error("Uso: node fetch-ovd-week.mjs <RAPIDAPI_KEY>"); process.exit(1); }

const OUT_DIR = "data/ovd_raw";
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Mes completo + margen (30 abril + 31 mayo). Los días borde solo se usan para confirmar
// overnighters de mayo (necesitamos saber si el avión sale el día siguiente).
const DAYS = ["2026-04-30",
  ...Array.from({ length: 31 }, (_, i) => `2026-05-${(i + 1).toString().padStart(2, "0")}`)];
const WINDOWS = [
  { tag: "AM", from: "00:00", to: "12:00" },
  { tag: "PM", from: "12:00", to: "24:00" },
];

function nextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
async function fetchWindow(dateStr, w) {
  const outPath = `${OUT_DIR}/${dateStr}_${w.tag}.json`;
  if (existsSync(outPath)) { console.log(`  [skip] ${outPath} ya existe`); return; }
  const fromIso = `${dateStr}T${w.from}`;
  const toIso = w.tag === "PM" ? `${nextDay(dateStr)}T00:00` : `${dateStr}T${w.to}`;
  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/icao/LEAS/${fromIso}/${toIso}?withLeg=true&direction=Both&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false`;
  process.stdout.write(`  fetching ${dateStr} ${w.tag}... `);
  const t0 = Date.now();
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      "x-rapidapi-key": KEY,
    },
  });
  if (!res.ok) {
    console.log(`FAIL ${res.status}`);
    const txt = await res.text();
    console.error("    ", txt.slice(0, 200));
    return;
  }
  const data = await res.json();
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  const arrs = data.arrivals?.length ?? 0;
  const deps = data.departures?.length ?? 0;
  console.log(`ok ${Date.now() - t0}ms · ${arrs} arr · ${deps} dep`);
}

console.log(`=== Fetch OVD ${DAYS.length} días × 2 ventanas = ${DAYS.length * 2} calls ===`);
for (const dateStr of DAYS) {
  for (const w of WINDOWS) {
    await fetchWindow(dateStr, w);
    await new Promise((r) => setTimeout(r, 1500)); // 1.5s entre calls
  }
}
console.log("=== DONE ===");
