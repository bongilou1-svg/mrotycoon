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

const output = {
  icao: icao.toUpperCase(),
  source: "OpenStreetMap contributors (ODbL)",
  bbox: { minLon, maxLon, minLat, maxLat },
  aspectRatio: Math.round(aspectRatio * 1000) / 1000,
  paths,
  counts: Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, v.length])),
};

writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`✓ ${outputPath} generado`);
console.log(`  bbox: ${minLon.toFixed(4)}..${maxLon.toFixed(4)} lon, ${minLat.toFixed(4)}..${maxLat.toFixed(4)} lat`);
console.log(`  aspect ratio: ${aspectRatio.toFixed(3)} (w/h)`);
console.log(`  counts:`, output.counts);
