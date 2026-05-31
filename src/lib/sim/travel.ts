// INC3 · ciclo de vida WO v2: tiempo de viaje oficina(MECS)→stand VARIABLE por distancia REAL.
//
// Usa los datos OSM ya presentes en <icao>.paths.json:
//   - standMap:           sim stand id ("H1-S1") → ref de parking OSM ("01")
//   - paths.parkingPositions: polígonos normalizados 0..1 con { ref, coords }
//   - paths.terminal:     se usa su centroide como punto "oficina MECS" (no hay hangars/buildings
//                         en el OSM de OVD; el terminal es el edificio de referencia más central)
//   - bbox:               para convertir coords normalizadas → metros reales
//
// travelMin(stand) = clamp(round(distMetros / apronSpeedMetersPerMinute), min, max).
//
// FUNCIÓN PURA: recibe el objeto paths ya cargado (el test lo lee con readFileSync; el bundle lo
// pasa desde S.DATA.airportRuntime[icao].paths). Si faltan datos devuelve {} y el caller cae al
// valor fijo balance.officeToStandMinutes — comportamiento idéntico al previo a INC3.

type LatLonBox = { minLon: number; maxLon: number; minLat: number; maxLat: number };
type ParkingPos = { ref: string; coords: unknown };
type AirportPaths = {
  bbox?: LatLonBox;
  standMap?: Record<string, string>;
  paths?: { terminal?: unknown; parkingPositions?: ParkingPos[] };
};
type TravelTunables = {
  apronSpeedMetersPerMinute?: number;
  minTravelMinutes?: number;
  maxTravelMinutes?: number;
};

/** Aplana cualquier estructura anidada de coords a una lista de puntos [x,y]. */
export function flatCoords(feat: unknown): number[][] {
  const out: number[][] = [];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") out.push(c as number[]);
    else if (Array.isArray(c)) c.forEach(walk);
    else if (c && typeof c === "object" && "coords" in (c as Record<string, unknown>)) {
      walk((c as Record<string, unknown>).coords);
    }
  };
  walk(feat);
  return out;
}

/** Centroide (media aritmética de vértices) de un feature normalizado. null si no hay puntos. */
export function centroid(feat: unknown): [number, number] | null {
  const pts = flatCoords(feat);
  if (pts.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
}

/** Tamaño del bbox en metros (aprox. equirectangular a la latitud media). */
export function bboxMeters(bbox: LatLonBox): { widthM: number; heightM: number } {
  const latMid = (bbox.minLat + bbox.maxLat) / 2;
  const mPerDegLat = 111132;
  const mPerDegLon = 111320 * Math.cos((latMid * Math.PI) / 180);
  return {
    widthM: (bbox.maxLon - bbox.minLon) * mPerDegLon,
    heightM: (bbox.maxLat - bbox.minLat) * mPerDegLat,
  };
}

/**
 * Mapa standId → minutos de viaje oficina→stand para un aeropuerto, por distancia real OSM.
 * Devuelve {} si faltan datos (sin standMap / sin parkingPositions / sin terminal) → el caller
 * cae al fijo balance.officeToStandMinutes.
 */
export function computeStandTravelMinutes(
  pathsData: AirportPaths | null | undefined,
  balance: TravelTunables,
): Record<string, number> {
  if (!pathsData || !pathsData.standMap || !pathsData.bbox) return {};
  const parkings = pathsData.paths?.parkingPositions;
  if (!parkings || parkings.length === 0) return {};
  const office = centroid(pathsData.paths?.terminal);
  if (!office) return {};

  const { widthM, heightM } = bboxMeters(pathsData.bbox);
  const byRef: Record<string, ParkingPos> = {};
  for (const pp of parkings) byRef[pp.ref] = pp;

  const speed = balance.apronSpeedMetersPerMinute ?? 100;
  const lo = balance.minTravelMinutes ?? 2;
  const hi = balance.maxTravelMinutes ?? 12;

  const out: Record<string, number> = {};
  for (const standId of Object.keys(pathsData.standMap)) {
    const ref = pathsData.standMap[standId];
    const pp = byRef[ref];
    if (!pp) continue;
    const sc = centroid(pp.coords);
    if (!sc) continue;
    const dxM = (sc[0] - office[0]) * widthM;
    const dyM = (sc[1] - office[1]) * heightM;
    const distM = Math.sqrt(dxM * dxM + dyM * dyM);
    const minutes = Math.round(distM / Math.max(1, speed));
    out[standId] = Math.max(lo, Math.min(hi, minutes));
  }
  return out;
}
