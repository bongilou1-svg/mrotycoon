// Fetch semana real de un aeropuerto desde AeroDataBox (RapidAPI).
// Guarda raw en data/{slug}_raw/YYYY-MM-DD_{AM,PM}.json.
// Sleep 1.5s entre calls para no pasar rate limit (1 req/s en free tier).
//
// Uso:
//   node .scripts/fetch-airport-week.mjs <RAPIDAPI_KEY> <ICAO> [slug]
//
// Ejemplos:
//   node .scripts/fetch-airport-week.mjs $KEY LEAS ovd
//   node .scripts/fetch-airport-week.mjs $KEY LEBB bio
//   node .scripts/fetch-airport-week.mjs $KEY LEAL alc
//
// Por defecto baja 9 días (semana + margen). 18 calls = 18 unidades AeroDataBox.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const KEY = process.argv[2];
const ICAO = (process.argv[3] ?? "").toUpperCase();
const SLUG = (process.argv[4] ?? ICAO).toLowerCase();
if (!KEY || !ICAO) {
  console.error("Uso: node .scripts/fetch-airport-week.mjs <RAPIDAPI_KEY> <ICAO> [slug]");
  console.error("Ejemplo: node .scripts/fetch-airport-week.mjs $KEY LEBB bio");
  process.exit(1);
}

const OUT_DIR = `data/${SLUG}_raw`;
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// 1 semana completa real + 1 día antes y después (para confirmar overnighters).
// 9 días × 2 ventanas = 18 calls = 18 unidades AeroDataBox.
const DAYS = ["2026-05-03",
  ...Array.from({ length: 7 }, (_, i) => `2026-05-${(i + 4).toString().padStart(2, "0")}`),
  "2026-05-11"];

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
  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/icao/${ICAO}/${fromIso}/${toIso}?withLeg=true&direction=Both&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false`;
  process.stdout.write(`  fetching ${ICAO} ${dateStr} ${w.tag}... `);
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

console.log(`=== Fetch ${ICAO} (${SLUG}) ${DAYS.length} días × 2 ventanas = ${DAYS.length * 2} calls ===`);
console.log(`Out: ${OUT_DIR}`);
for (const dateStr of DAYS) {
  for (const w of WINDOWS) {
    await fetchWindow(dateStr, w);
    await new Promise((r) => setTimeout(r, 1500)); // 1.5s entre calls
  }
}
console.log("=== DONE ===");
