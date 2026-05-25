// Convertidor OSM → paths normalizados para Pixi.
//
// Lee src/assets/airports/<icao>.json (Overpass), proyecta lat/lon a coords normalizadas
// [0..1] preservando aspect ratio del bbox (corrección por latitud), clasifica los ways
// por tag aeroway/building y escribe src/assets/airports/<icao>.paths.json.
//
// Uso: node .scripts/osm_to_pixi.mjs ovd

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const icao = (process.argv[2] || "ovd").toLowerCase();
const inputPath = join("src/assets/airports", `${icao}.json`);
const outputPath = join("src/assets/airports", `${icao}.paths.json`);

const raw = JSON.parse(readFileSync(inputPath, "utf-8"));
const ways = raw.elements.filter((e) => e.type === "way" && e.geometry);

// Calcula bbox real desde todas las coords
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const w of ways) {
  for (const p of w.geometry) {
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }
}

// Proyección equirectangular con corrección de latitud — preserva aspecto real
const latCenter = (minLat + maxLat) / 2;
const lonScale = Math.cos((latCenter * Math.PI) / 180);
const rawW = (maxLon - minLon) * lonScale;
const rawH = maxLat - minLat;
const aspectRatio = rawW / rawH;

function project(lon, lat) {
  // Y se invierte (lat alta = norte = arriba; pero pantalla Y crece hacia abajo)
  const x = ((lon - minLon) * lonScale) / rawW;
  const y = (maxLat - lat) / rawH;
  return [Math.round(x * 100000) / 100000, Math.round(y * 100000) / 100000];
}

// Clasifica ways por tag dominante
const paths = {
  runways: [],
  taxiways: [],
  apron: [],
  aerodrome: [],
  terminal: [],
  tower: [],
  hangars: [],
  buildings: [],
  parkingPositions: [],
  serviceRoads: [],
  other: [],
};

for (const w of ways) {
  const coords = w.geometry.map((p) => project(p.lon, p.lat));
  const tags = w.tags || {};
  const item = { id: w.id, coords, name: tags.name || tags.ref || null };

  if (tags.aeroway === "runway") {
    paths.runways.push({ ...item, ref: tags.ref, width: tags.width });
  } else if (tags.aeroway === "taxiway") {
    paths.taxiways.push(item);
  } else if (tags.aeroway === "apron") {
    paths.apron.push(item);
  } else if (tags.aeroway === "aerodrome") {
    paths.aerodrome.push(item);
  } else if (tags.aeroway === "terminal" || tags.building === "terminal") {
    paths.terminal.push(item);
  } else if (tags.aeroway === "tower" || tags.man_made === "tower" || tags.building === "tower") {
    paths.tower.push(item);
  } else if (tags.aeroway === "hangar" || tags.building === "hangar") {
    paths.hangars.push(item);
  } else if (tags.aeroway === "parking_position") {
    paths.parkingPositions.push({ ...item, ref: tags.ref });
  } else if (tags.highway === "service" || tags.aeroway === "service" || tags.service === "yes") {
    paths.serviceRoads.push(item);
  } else if (tags.building) {
    paths.buildings.push({ ...item, building: tags.building });
  } else {
    paths.other.push(item);
  }
}

// Pivot iteración 2026-05-25 — Multi-airport: garantizar que TODOS los parking_positions
// tengan un `ref` (sintético "vp-NNN" si OSM no proporciona uno). Esto asegura que el
// pixi-driver puede indexarlos uniformemente sin importar de qué aeropuerto vienen.
// Aeropuertos pequeños como OVD suelen tener refs "01"-"09"; los grandes (BIO, MAD,
// BCN) raramente los tienen y caerían como invisibles antes del fix.
let vpCounter = 0;
for (const pp of paths.parkingPositions) {
  if (!pp.ref) pp.ref = `vp-${String(vpCounter++).padStart(3, "0")}`;
}

// Generar standMap: mapping desde IDs lógicos del game (H1-S1..H1-S5, R1, H2-S1, H1-B1,
// H2-B1, H3-B1, H3-B2) a refs de parking_position del paths.json. Prefiere refs OSM
// numéricos ("01"-"09") por orden si están disponibles; si no, usa los primeros N
// parking_positions del array (orden de aparición en OSM).
const SIM_STAND_IDS = ["H1-S1", "H1-S2", "H1-S3", "H1-S4", "H1-S5", "R1", "H2-S1", "H1-B1", "H2-B1", "H3-B1", "H3-B2"];
// Refs OSM numéricos primero (01, 02, ..., 08A, 09) ordenados por valor numérico.
const realRefs = paths.parkingPositions
  .filter((p) => p.ref && /^\d+[A-Z]?$/.test(p.ref))
  .sort((a, b) => {
    const na = parseInt(a.ref, 10), nb = parseInt(b.ref, 10);
    if (na !== nb) return na - nb;
    return a.ref.localeCompare(b.ref);
  })
  .map((p) => p.ref);
// Pool restante: parking_positions que NO están ya en realRefs (sintéticos vp-NNN o refs
// no-numéricos), en su orden de aparición OSM.
const usedSet = new Set(realRefs);
const restRefs = paths.parkingPositions
  .map((p) => p.ref)
  .filter((r) => !usedSet.has(r));
// Concatenar: reales primero (preserva mapping OVD pre-refactor), sintéticos después.
const refsToUse = [...realRefs, ...restRefs];
const standMap = {};
for (let i = 0; i < SIM_STAND_IDS.length && i < refsToUse.length; i++) {
  standMap[SIM_STAND_IDS[i]] = refsToUse[i];
}

const output = {
  icao: icao.toUpperCase(),
  source: "OpenStreetMap contributors (ODbL)",
  bbox: { minLon, maxLon, minLat, maxLat },
  aspectRatio: Math.round(aspectRatio * 1000) / 1000,
  paths,
  standMap,
  counts: Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, v.length])),
};

writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`✓ ${outputPath} generado`);
console.log(`  bbox: ${minLon.toFixed(4)}..${maxLon.toFixed(4)} lon, ${minLat.toFixed(4)}..${maxLat.toFixed(4)} lat`);
console.log(`  aspect ratio: ${aspectRatio.toFixed(3)} (w/h)`);
console.log(`  counts:`, output.counts);
