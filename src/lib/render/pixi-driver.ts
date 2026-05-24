// Fase 5D Â· P-Î³ + skin system: driver Pixi v8 con 5 themes seleccionables vivos.
//
// Themes (skins):
//   - "cic":       (default) CIC/NASA mission control oscuro azul. Estilo P-Î³ original.
//   - "blueprint": Plano tÃ©cnico azul Prusia + cyan + cotas + leyendas ICAO.
//   - "faa":       Airport diagram beige/papel, lÃ­neas negras gruesas, letras grandes.
//   - "iso":       Fake-iso con hangares y oficina con "altura" (box plano elevado).
//   - "neon":      CIC actual + glow neÃ³n sutil + pulsos en stands activos.
//
// La sync layer no cambia entre themes; solo el dibujado.
// P-Î³ motion paths (aviÃ³n taxiing + furgo mec) funcionan en todos los themes.

import { Application, Container, Graphics, Sprite, Text, FederatedPointerEvent } from "pixi.js";
import type { RenderMechanic, RenderState } from "./types.ts";
import { bakeJetSprite } from "./sprite-bakery.ts";
import { loadAssets, getTexture } from "./assets.ts";
// F5D · datos OSM del aeropuerto OVD (LEAS) — © OpenStreetMap contributors (ODbL).
// Generado offline por .scripts/osm_to_pixi.mjs (proyección equirectangular normalizada).
import ovdPaths from "../../assets/airports/ovd.paths.json" with { type: "json" };

export type Theme = "cic" | "blueprint" | "faa" | "iso" | "neon" | "steam" | "lateral" | "network" | "isodiag" | "simairport" | "airportceo" | "ceofull" | "ceopng" | "huge" | "f5d";

// ---------- Paletas por theme ----------
interface ThemePalette {
  bgDay: number;
  bgNight: number;
  apronFill: number;
  apronStroke: number;
  runway: number;
  runwayStripe: number;
  taxiway: number;
  taxiwayStripe: number;
  taxilane: number;
  callelane: number;
  centerLine: number;
  hangarZoneStroke: number;
  standFill: number;
  standStroke: number;
  standLabel: number;
  freeLabel: number;
  officeWall: number;
  officeWindow: number;
  officeDoor: number;
  officeOutline: number;
  vanColor: number;
  vanReturning: number;
  taxiingPlane: number;
  text: number;
  textMuted: number;
  shadow: number;
  runwayClosed: number;
  /** Color de relleno aviÃ³n usando airline color base; en blueprint/FAA se ignora. */
  airplaneUsesAirline: boolean;
  /** Fallback color aviÃ³n cuando airplaneUsesAirline=false. */
  airplaneFill: number;
  airplaneStrokeAlpha: number;
  /** Mostrar cotas tipo "60m" sobre pista/stands. Solo blueprint. */
  showDimensions: boolean;
  /** Fake-iso: aplicar profundidad a hangares y oficina (rect base + tejado elevado). */
  iso3d: boolean;
  /** Halos glow extra alrededor de aviones/stands ocupados. */
  glow: boolean;
  /** FAA: tipografÃ­a y nÃºmeros grandes, letras gigantes en taxiway. */
  faaStyle: boolean;
  /** Steam look: dibujados ricos (hangares con tejado, oficina detallada, vans con cabina,
   *  aviones con motores/cabina, pavimento texturizado). */
  steamMode: boolean;
  /** SimAirport: marcas amarillas grandes en stands, chevrons en taxiway,
   *  aviones blancos top-down con cola coloreada por aerolÃ­nea. */
  simairportMode: boolean;
  /** AirportCEO: bordes amarillos en taxiways/calles, paleta frÃ­a, aviones realistas,
   *  mÃºltiples lÃ­neas de pintura tÃ©cnica, edificios operacionales. */
  airportceoMode: boolean;
  fontMono: string;
  fontSans: string;
}

const PAL: Record<Theme, ThemePalette> = {
  cic: {
    bgDay: 0x131a26, bgNight: 0x070d18,
    apronFill: 0x1a2030, apronStroke: 0x2a3142,
    runway: 0x2a2f3a, runwayStripe: 0xf2f2f2,
    taxiway: 0x4a525e, taxiwayStripe: 0xf2c94c,
    taxilane: 0x55606e, callelane: 0x60697a,
    centerLine: 0xf2f2f2,
    hangarZoneStroke: 0x6a7080,
    standFill: 0x2c3548, standStroke: 0x5a6680,
    standLabel: 0xa8b3c8, freeLabel: 0x5d6677,
    officeWall: 0xd4c89b, officeWindow: 0xffd96b, officeDoor: 0x6e4a2e, officeOutline: 0x8b7d4f,
    vanColor: 0xa78bfa, vanReturning: 0x8b95a8, taxiingPlane: 0x3fb950,
    text: 0xe6e9ef, textMuted: 0x8b95a8,
    shadow: 0x000000, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0x4da3ff, airplaneStrokeAlpha: 0.5,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  blueprint: {
    bgDay: 0x0a1a2e, bgNight: 0x041020,
    apronFill: 0x0e2336, apronStroke: 0x7dd3fc,
    runway: 0x0e2336, runwayStripe: 0xbae6fd,
    taxiway: 0x12304a, taxiwayStripe: 0xfde047,
    taxilane: 0x142e44, callelane: 0x163450,
    centerLine: 0xbae6fd,
    hangarZoneStroke: 0x7dd3fc,
    standFill: 0x0a1a2e, standStroke: 0x7dd3fc,
    standLabel: 0xbae6fd, freeLabel: 0x4a6b8a,
    officeWall: 0x0a1a2e, officeWindow: 0x7dd3fc, officeDoor: 0x7dd3fc, officeOutline: 0x7dd3fc,
    vanColor: 0xc084fc, vanReturning: 0x6a7080, taxiingPlane: 0x86efac,
    text: 0xffffff, textMuted: 0x7dd3fc,
    shadow: 0x000000, runwayClosed: 0xff6b6b,
    airplaneUsesAirline: false, airplaneFill: 0xbae6fd, airplaneStrokeAlpha: 0.9,
    showDimensions: true, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  faa: {
    bgDay: 0xe8dfc6, bgNight: 0xc9bf9c,
    apronFill: 0xd4caa9, apronStroke: 0x1a1a1a,
    runway: 0x2a2a2a, runwayStripe: 0xfafafa,
    taxiway: 0x6b6b6b, taxiwayStripe: 0xffd700,
    taxilane: 0x8a8a78, callelane: 0x9b9b85,
    centerLine: 0xfafafa,
    hangarZoneStroke: 0x1a1a1a,
    standFill: 0xc8b896, standStroke: 0x1a1a1a,
    standLabel: 0x1a1a1a, freeLabel: 0x6e6e5a,
    officeWall: 0xe8d7a8, officeWindow: 0x8a6e3e, officeDoor: 0x4a3018, officeOutline: 0x1a1a1a,
    vanColor: 0x5d2e8c, vanReturning: 0x6e6e5a, taxiingPlane: 0x2d6e3e,
    text: 0x1a1a1a, textMuted: 0x4a4a3a,
    shadow: 0x000000, runwayClosed: 0xc00000,
    airplaneUsesAirline: false, airplaneFill: 0x1a1a1a, airplaneStrokeAlpha: 0,
    showDimensions: false, iso3d: false, glow: false, faaStyle: true, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "Courier New, monospace", fontSans: "Georgia, serif",
  },
  iso: {
    bgDay: 0x131a26, bgNight: 0x070d18,
    apronFill: 0x1a2030, apronStroke: 0x2a3142,
    runway: 0x2a2f3a, runwayStripe: 0xf2f2f2,
    taxiway: 0x4a525e, taxiwayStripe: 0xf2c94c,
    taxilane: 0x55606e, callelane: 0x60697a,
    centerLine: 0xf2f2f2,
    hangarZoneStroke: 0x6a7080,
    standFill: 0x2c3548, standStroke: 0x5a6680,
    standLabel: 0xa8b3c8, freeLabel: 0x5d6677,
    officeWall: 0xd4c89b, officeWindow: 0xffd96b, officeDoor: 0x6e4a2e, officeOutline: 0x8b7d4f,
    vanColor: 0xa78bfa, vanReturning: 0x8b95a8, taxiingPlane: 0x3fb950,
    text: 0xe6e9ef, textMuted: 0x8b95a8,
    shadow: 0x000000, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0x4da3ff, airplaneStrokeAlpha: 0.5,
    showDimensions: false, iso3d: true, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  neon: {
    bgDay: 0x0a0f1a, bgNight: 0x05080f,
    apronFill: 0x121929, apronStroke: 0x4da3ff,
    runway: 0x1a1f2e, runwayStripe: 0xffffff,
    taxiway: 0x3a425a, taxiwayStripe: 0xffd700,
    taxilane: 0x45506a, callelane: 0x506078,
    centerLine: 0xffffff,
    hangarZoneStroke: 0x06b6d4,
    standFill: 0x1a2540, standStroke: 0x4da3ff,
    standLabel: 0xa8c5e8, freeLabel: 0x4a5266,
    officeWall: 0xd4c89b, officeWindow: 0xffd96b, officeDoor: 0x6e4a2e, officeOutline: 0xfde047,
    vanColor: 0xc084fc, vanReturning: 0x8b95a8, taxiingPlane: 0x4ade80,
    text: 0xf0f4ff, textMuted: 0x8ba0c2,
    shadow: 0x000000, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0x4da3ff, airplaneStrokeAlpha: 0.5,
    showDimensions: false, iso3d: false, glow: true, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  steam: {
    // SimAirport / Two Point Hospital â€” saturado, dibujado rico, "indie Steam game".
    bgDay: 0x4a6b3a, bgNight: 0x1f2e1c, // hierba verde (al rededor del aeropuerto)
    apronFill: 0x5a6068, apronStroke: 0x2a2e36, // hormigÃ³n gris
    runway: 0x1f2229, runwayStripe: 0xfff6c4, // asfalto + marcas crema
    taxiway: 0x3a3e48, taxiwayStripe: 0xfdb022,
    taxilane: 0x494e58, callelane: 0x52576a,
    centerLine: 0xfff6c4,
    hangarZoneStroke: 0x3a3e48,
    standFill: 0x4a4f5a, standStroke: 0x2a2e36,
    standLabel: 0xf5f5f5, freeLabel: 0x9098a8,
    officeWall: 0xd4a574, officeWindow: 0x86c5e8, officeDoor: 0x6e4a2e, officeOutline: 0x5e3818,
    vanColor: 0xe85d75, vanReturning: 0x8a92a6, taxiingPlane: 0x4ade80,
    text: 0xfffaef, textMuted: 0xc5c5c5,
    shadow: 0x000000, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0x4da3ff, airplaneStrokeAlpha: 0.4,
    showDimensions: false, iso3d: false, glow: true, faaStyle: false, steamMode: true, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  // Los 3 layouts radicalmente distintos usan renderers propios y no consumen estos
  // campos â€” placeholder de paleta CIC para satisfacer el type.
  lateral: {
    bgDay: 0x131a26, bgNight: 0x070d18, apronFill: 0, apronStroke: 0, runway: 0, runwayStripe: 0,
    taxiway: 0, taxiwayStripe: 0, taxilane: 0, callelane: 0, centerLine: 0, hangarZoneStroke: 0,
    standFill: 0, standStroke: 0, standLabel: 0, freeLabel: 0, officeWall: 0, officeWindow: 0,
    officeDoor: 0, officeOutline: 0, vanColor: 0, vanReturning: 0, taxiingPlane: 0,
    text: 0xe6e9ef, textMuted: 0x8b95a8, shadow: 0, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0, airplaneStrokeAlpha: 0,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  network: {
    bgDay: 0x0a0e18, bgNight: 0x05080f, apronFill: 0, apronStroke: 0, runway: 0, runwayStripe: 0,
    taxiway: 0, taxiwayStripe: 0, taxilane: 0, callelane: 0, centerLine: 0, hangarZoneStroke: 0,
    standFill: 0, standStroke: 0, standLabel: 0, freeLabel: 0, officeWall: 0, officeWindow: 0,
    officeDoor: 0, officeOutline: 0, vanColor: 0, vanReturning: 0, taxiingPlane: 0,
    text: 0xe6e9ef, textMuted: 0x8b95a8, shadow: 0, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0, airplaneStrokeAlpha: 0,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  isodiag: {
    bgDay: 0x2c3344, bgNight: 0x0f131c, apronFill: 0, apronStroke: 0, runway: 0, runwayStripe: 0,
    taxiway: 0, taxiwayStripe: 0, taxilane: 0, callelane: 0, centerLine: 0, hangarZoneStroke: 0,
    standFill: 0, standStroke: 0, standLabel: 0, freeLabel: 0, officeWall: 0, officeWindow: 0,
    officeDoor: 0, officeOutline: 0, vanColor: 0, vanReturning: 0, taxiingPlane: 0,
    text: 0xe6e9ef, textMuted: 0x8b95a8, shadow: 0, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0, airplaneStrokeAlpha: 0,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  simairport: {
    bgDay: 0x2a2f38, bgNight: 0x14171c,
    apronFill: 0x3a3f47, apronStroke: 0x1a1c20,
    runway: 0x282b30, runwayStripe: 0xf5f5f5,
    taxiway: 0x44494f, taxiwayStripe: 0xfdc640,
    taxilane: 0x484d54, callelane: 0x4d525a,
    centerLine: 0xfdc640,
    hangarZoneStroke: 0xfdc640,
    standFill: 0x40454d, standStroke: 0xfdc640,
    standLabel: 0xfdc640, freeLabel: 0x7a8090,
    officeWall: 0x6e7480, officeWindow: 0xfde047, officeDoor: 0x2a2e36, officeOutline: 0x1a1c20,
    vanColor: 0xfdc640, vanReturning: 0x8b95a8, taxiingPlane: 0xf5f5f5,
    text: 0xfafafa, textMuted: 0xa8b3c8,
    shadow: 0x000000, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0xfafafa, airplaneStrokeAlpha: 0.3,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: true, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  airportceo: {
    bgDay: 0x6b7280, bgNight: 0x2a3142,
    apronFill: 0x515862, apronStroke: 0x2a3142,
    runway: 0x2a2e36, runwayStripe: 0xfafafa,
    taxiway: 0x4a525e, taxiwayStripe: 0xfdc640,
    taxilane: 0x52576a, callelane: 0x5a6068,
    centerLine: 0xfafafa,
    hangarZoneStroke: 0x8b95a8,
    standFill: 0x484d54, standStroke: 0xfdc640,
    standLabel: 0xfafafa, freeLabel: 0x9098a8,
    officeWall: 0xbfc7d0, officeWindow: 0x3a4d6a, officeDoor: 0x2a2e36, officeOutline: 0x2a3142,
    vanColor: 0xff6b6b, vanReturning: 0x8b95a8, taxiingPlane: 0xfafafa,
    text: 0xfafafa, textMuted: 0xb8bfca,
    shadow: 0x000000, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0xfafafa, airplaneStrokeAlpha: 0.4,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: true,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  ceofull: {
    bgDay: 0x6b7280, bgNight: 0x2a3142, apronFill: 0, apronStroke: 0, runway: 0, runwayStripe: 0,
    taxiway: 0, taxiwayStripe: 0, taxilane: 0, callelane: 0, centerLine: 0, hangarZoneStroke: 0,
    standFill: 0, standStroke: 0, standLabel: 0, freeLabel: 0, officeWall: 0, officeWindow: 0,
    officeDoor: 0, officeOutline: 0, vanColor: 0, vanReturning: 0, taxiingPlane: 0,
    text: 0xfafafa, textMuted: 0xb8bfca, shadow: 0, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0xfafafa, airplaneStrokeAlpha: 0.4,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  ceopng: {
    bgDay: 0x6b7280, bgNight: 0x2a3142, apronFill: 0, apronStroke: 0, runway: 0, runwayStripe: 0,
    taxiway: 0, taxiwayStripe: 0, taxilane: 0, callelane: 0, centerLine: 0, hangarZoneStroke: 0,
    standFill: 0, standStroke: 0, standLabel: 0, freeLabel: 0, officeWall: 0, officeWindow: 0,
    officeDoor: 0, officeOutline: 0, vanColor: 0, vanReturning: 0, taxiingPlane: 0,
    text: 0xfafafa, textMuted: 0xb8bfca, shadow: 0, runwayClosed: 0xff3b3b,
    airplaneUsesAirline: true, airplaneFill: 0xfafafa, airplaneStrokeAlpha: 0.4,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  huge: {
    bgDay: 0x0d1a2e, bgNight: 0x050a17, apronFill: 0, apronStroke: 0, runway: 0, runwayStripe: 0,
    taxiway: 0, taxiwayStripe: 0, taxilane: 0, callelane: 0, centerLine: 0, hangarZoneStroke: 0,
    standFill: 0, standStroke: 0, standLabel: 0, freeLabel: 0, officeWall: 0, officeWindow: 0,
    officeDoor: 0, officeOutline: 0, vanColor: 0, vanReturning: 0, taxiingPlane: 0,
    text: 0xe6ecf5, textMuted: 0x7a93b8, shadow: 0, runwayClosed: 0xff6b6b,
    airplaneUsesAirline: false, airplaneFill: 0x3a6db0, airplaneStrokeAlpha: 0,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
  // F5D — paleta exacta del north-star SVG. CIC dark navy + cyan runway + ambar stands.
  // P-alpha: scaffold placeholder (fondo + grid + label). OSM real entra en P-beta.
  f5d: {
    bgDay: 0x0a1428, bgNight: 0x0a1428,
    apronFill: 0x0d1c33, apronStroke: 0x1c2d4a,
    runway: 0x3aa9ff, runwayStripe: 0xa8dafc,
    taxiway: 0x3aa9ff, taxiwayStripe: 0xa8dafc,
    taxilane: 0x2c4870, callelane: 0x2c4870,
    centerLine: 0x0a1428,
    hangarZoneStroke: 0x2c4870,
    standFill: 0x0d1c33, standStroke: 0x2c4870,
    standLabel: 0x5da0e0, freeLabel: 0x3d6f9d,
    officeWall: 0x13243f, officeWindow: 0x5da0e0, officeDoor: 0x0a1428, officeOutline: 0x2c4870,
    vanColor: 0xf5b945, vanReturning: 0x3d6f9d, taxiingPlane: 0xa8dafc,
    text: 0xa8dafc, textMuted: 0x5da0e0,
    shadow: 0x000000, runwayClosed: 0xff6b6b,
    airplaneUsesAirline: false, airplaneFill: 0xa8dafc, airplaneStrokeAlpha: 0,
    showDimensions: false, iso3d: false, glow: false, faaStyle: false, steamMode: false, simairportMode: false, airportceoMode: false,
    fontMono: "JetBrains Mono, monospace", fontSans: "Inter, sans-serif",
  },
};

// ---------- Mapping sim id â†’ slot grid ----------
type SlotPos = { col: number; row: number; label: string };
const SIM_TO_SLOT: Record<string, SlotPos> = {
  "H1-S1": { col: 0, row: 0, label: "351" },
  "H1-S2": { col: 1, row: 0, label: "451" },
  "H1-S3": { col: 2, row: 0, label: "551" },
  "R1":    { col: 0, row: 1, label: "352" },
  "H2-S1": { col: 1, row: 1, label: "452" },
};
const ALL_SLOTS: Array<SlotPos> = [
  { col: 0, row: 0, label: "351" }, { col: 1, row: 0, label: "451" }, { col: 2, row: 0, label: "551" },
  { col: 0, row: 1, label: "352" }, { col: 1, row: 1, label: "452" }, { col: 2, row: 1, label: "552" },
];

function airlineColor(airlineId: string): number {
  let h = 0;
  for (let i = 0; i < airlineId.length; i++) h = ((h << 5) - h + airlineId.charCodeAt(i)) | 0;
  const palette = [0xff9f43, 0x4da3ff, 0xa78bfa, 0x3fb950, 0xd29922, 0xf85149];
  return palette[Math.abs(h) % palette.length];
}

// ---------- Helpers ----------
function strokeDashed(g: Graphics, x1: number, y1: number, x2: number, y2: number, dash = 8, gap = 6, width = 1, color = 0xffffff, alpha = 1): void {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len, uy = dy / len;
  let d = 0;
  while (d < len) {
    const e = Math.min(d + dash, len);
    g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * e, y1 + uy * e);
    d = e + gap;
  }
  g.stroke({ width, color, alpha });
}

function dashedRect(g: Graphics, x: number, y: number, w: number, h: number, opts: { dash?: number; gap?: number; width?: number; color?: number; alpha?: number } = {}): void {
  const dash = opts.dash ?? 10, gap = opts.gap ?? 6, width = opts.width ?? 1.5, color = opts.color ?? 0x6a7080, alpha = opts.alpha ?? 0.7;
  strokeDashed(g, x, y, x + w, y, dash, gap, width, color, alpha);
  strokeDashed(g, x + w, y, x + w, y + h, dash, gap, width, color, alpha);
  strokeDashed(g, x + w, y + h, x, y + h, dash, gap, width, color, alpha);
  strokeDashed(g, x, y + h, x, y, dash, gap, width, color, alpha);
}

type Pt = { x: number; y: number };

function lerpPath(pts: Pt[], t: number): { pos: Pt; segIdx: number; segT: number } {
  if (pts.length === 0) return { pos: { x: 0, y: 0 }, segIdx: 0, segT: 0 };
  if (pts.length === 1) return { pos: pts[0], segIdx: 0, segT: 0 };
  const N = pts.length - 1;
  const clamped = Math.max(0, Math.min(1, t));
  const seg = clamped * N;
  const i = Math.min(N - 1, Math.floor(seg));
  const localT = seg - i;
  return {
    pos: {
      x: pts[i].x + (pts[i + 1].x - pts[i].x) * localT,
      y: pts[i].y + (pts[i + 1].y - pts[i].y) * localT,
    },
    segIdx: i, segT: localT,
  };
}

function pathHeading(pts: Pt[], t: number): number {
  if (pts.length < 2) return 0;
  const { segIdx } = lerpPath(pts, t);
  const a = pts[segIdx];
  const b = pts[segIdx + 1];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export type DriverCallbacks = {
  onBuildClick?: () => void;
  /** F5D P-ε: click sobre avión — abre modal con `detailFleetReg = registration`. */
  onAirplaneClick?: (registration: string) => void;
  /** F5D P-ε: click sobre stand — si tiene avión, abre modal del avión. */
  onStandClick?: (simId: string, hasAirplane: boolean, registration: string | null) => void;
};

export class PixiDriver {
  readonly kind = "pixi" as const;
  private app: Application | null = null;
  private layerBg: Container | null = null;
  private layerRoad: Container | null = null;
  private layerStaticLabels: Container | null = null;
  private layerSprites: Container | null = null;
  private layerMoving: Container | null = null;
  private layerOverlay: Container | null = null;
  private target: HTMLElement | null = null;
  private callbacks: DriverCallbacks = {};
  private theme: Theme = "cic";
  private lastState: RenderState | null = null;

  // ceofull camera state (pan + zoom). World es 3000Ã—1800; viewport es el canvas.
  private worldRoot: Container | null = null;
  private worldHUD: Container | null = null;
  private worldMinimap: Container | null = null;
  private worldStaticCache: Container | null = null; // estÃ¡tica (pavimento, edificios) cacheada
  private worldDynamic: Container | null = null;     // aviones, furgos (re-dibuja cada apply)
  private camera = { x: 0, y: 0, zoom: 0.5 };
  private cameraInitialized = false;
  private dragState: { active: boolean; sx: number; sy: number; cx: number; cy: number } = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 };
  private assetsLoaded = false;
  private assetsLoading = false;
  // Huge skin: keyboard navigation
  private keyState = new Set<string>();
  private kbLoopId: number | null = null;
  private kbLastT = 0;
  // Cache key para evitar redibujar la estática en cada tick. Solo cuando cambian
  // mroStage, timeOfDay o el theme se invalida.
  private staticCacheKey: string | null = null;
  // F5D P-ε: hover state (forzamos rerender en next tick natural)
  private f5dHoveredStand: string | null = null;
  private f5dHoveredAirplane: string | null = null;

  setCallbacks(cb: DriverCallbacks): void { this.callbacks = cb; }
  setTheme(t: Theme): void {
    // Reset cámara solo si cambia entre skins con sistema de cámara distinto.
    // Skins con cámara pan/zoom: huge, ceofull, ceopng, f5d. Cada uno tiene su world.
    const camThemes = new Set<Theme>(["huge", "ceofull", "ceopng", "f5d"]);
    if (this.theme !== t && (camThemes.has(this.theme) || camThemes.has(t))) {
      this.cameraInitialized = false;
    }
    this.theme = t;
    this.staticCacheKey = null;
    if (this.lastState) this.apply(this.lastState);
  }
  getTheme(): Theme { return this.theme; }

  async mount(target: HTMLElement): Promise<void> {
    if (this.app) return;
    this.target = target;
    const app = new Application();
    await app.init({
      background: PAL[this.theme].bgDay,
      resizeTo: target,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    target.appendChild(app.canvas);
    this.app = app;
    this.layerBg = new Container();
    this.layerRoad = new Container();
    this.layerStaticLabels = new Container();
    this.layerSprites = new Container();
    this.layerMoving = new Container();
    this.layerOverlay = new Container();
    // World container para skin ceofull: se pan/zoom. Hijos: estÃ¡tica + dinÃ¡mica.
    this.worldRoot = new Container();
    this.worldStaticCache = new Container();
    this.worldDynamic = new Container();
    this.worldRoot.addChild(this.worldStaticCache, this.worldDynamic);
    this.worldHUD = new Container();
    this.worldMinimap = new Container();
    app.stage.addChild(
      this.layerBg, this.layerRoad, this.layerStaticLabels, this.layerSprites, this.layerMoving, this.layerOverlay,
      this.worldRoot, this.worldHUD, this.worldMinimap,
    );

    // Event listeners para pan/zoom (solo activos cuando theme === "ceofull"/"ceopng"/"huge")
    app.canvas.addEventListener("pointerdown", this.onCanvasPointerDown);
    window.addEventListener("pointermove", this.onCanvasPointerMove);
    window.addEventListener("pointerup", this.onCanvasPointerUp);
    app.canvas.addEventListener("wheel", this.onCanvasWheel, { passive: false });
    // Keyboard navigation (huge skin)
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.startKeyboardLoop();
  }

  private onKeyDown = (ev: KeyboardEvent): void => {
    if (this.theme !== "huge" && this.theme !== "ceofull" && this.theme !== "ceopng" && this.theme !== "f5d") return;
    // No interceptar si estÃ¡ en input/textarea
    const tgt = ev.target as HTMLElement;
    if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
    const k = ev.key.toLowerCase();
    if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","+","-","=","q","e"].includes(k)) {
      this.keyState.add(k);
      ev.preventDefault();
    }
  };
  private onKeyUp = (ev: KeyboardEvent): void => {
    this.keyState.delete(ev.key.toLowerCase());
  };
  private startKeyboardLoop(): void {
    if (this.kbLoopId !== null) return;
    const tick = (t: number) => {
      if (!this.app) return;
      const dt = this.kbLastT === 0 ? 16 : Math.min(33, t - this.kbLastT);
      this.kbLastT = t;
      if ((this.theme === "huge" || this.theme === "ceofull" || this.theme === "ceopng" || this.theme === "f5d") && this.keyState.size > 0) {
        const speed = 600 / this.camera.zoom * (dt / 1000); // world units per frame
        let dx = 0, dy = 0;
        if (this.keyState.has("w") || this.keyState.has("arrowup")) dy += speed;
        if (this.keyState.has("s") || this.keyState.has("arrowdown")) dy -= speed;
        if (this.keyState.has("a") || this.keyState.has("arrowleft")) dx += speed;
        if (this.keyState.has("d") || this.keyState.has("arrowright")) dx -= speed;
        if (this.keyState.has("+") || this.keyState.has("=") || this.keyState.has("e")) this.zoomBy(1.04);
        if (this.keyState.has("-") || this.keyState.has("q")) this.zoomBy(0.96);
        if (dx !== 0 || dy !== 0) {
          this.camera.x += dx;
          this.camera.y += dy;
          this.clampCamera();
          this.applyCamera();
          if (this.lastState) this.drawCEOMinimap(this.lastState);
        }
      }
      this.kbLoopId = requestAnimationFrame(tick);
    };
    this.kbLoopId = requestAnimationFrame(tick);
  }
  private stopKeyboardLoop(): void {
    if (this.kbLoopId !== null) {
      cancelAnimationFrame(this.kbLoopId);
      this.kbLoopId = null;
    }
  }
  private zoomBy(factor: number): void {
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    const prev = this.camera.zoom;
    const maxZ = this.theme === "huge" ? 2.0 : this.theme === "f5d" ? 4.0 : 2.5;
    const minZ = this.theme === "huge" ? 0.02 : this.theme === "f5d" ? 0.15 : 0.25;
    const newZ = Math.max(minZ, Math.min(maxZ, prev * factor));
    if (newZ === prev) return;
    const cx = W / 2, cy = H / 2;
    const wx = cx / prev - this.camera.x;
    const wy = cy / prev - this.camera.y;
    this.camera.zoom = newZ;
    this.camera.x = cx / newZ - wx;
    this.camera.y = cy / newZ - wy;
    this.clampCamera();
    this.applyCamera();
  }

  private onCanvasPointerDown = (ev: PointerEvent): void => {
    if (this.theme !== "ceofull" && this.theme !== "ceopng" && this.theme !== "huge" && this.theme !== "f5d") return;
    if (ev.button !== 0) return;
    this.dragState = { active: true, sx: ev.clientX, sy: ev.clientY, cx: this.camera.x, cy: this.camera.y };
  };
  private onCanvasPointerMove = (ev: PointerEvent): void => {
    if (!this.dragState.active) return;
    const dx = (ev.clientX - this.dragState.sx) / this.camera.zoom;
    const dy = (ev.clientY - this.dragState.sy) / this.camera.zoom;
    this.camera.x = this.dragState.cx + dx;
    this.camera.y = this.dragState.cy + dy;
    this.clampCamera();
    this.applyCamera();
    if (this.lastState) this.drawCEOMinimap(this.lastState);
  };
  private onCanvasPointerUp = (): void => { this.dragState.active = false; };
  private onCanvasWheel = (ev: WheelEvent): void => {
    if (this.theme !== "ceofull" && this.theme !== "ceopng" && this.theme !== "huge" && this.theme !== "f5d") return;
    if (!this.app) return;
    ev.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const prevZoom = this.camera.zoom;
    const factor = ev.deltaY < 0 ? 1.18 : 0.85;
    const maxZ = this.theme === "huge" ? 2.0 : this.theme === "f5d" ? 4.0 : 2.5;
    const minZ = this.theme === "huge" ? 0.02 : this.theme === "f5d" ? 0.15 : 0.25;
    const newZoom = Math.max(minZ, Math.min(maxZ, prevZoom * factor));
    if (newZoom === prevZoom) return;
    const wxBefore = mx / prevZoom - this.camera.x;
    const wyBefore = my / prevZoom - this.camera.y;
    this.camera.zoom = newZoom;
    this.camera.x = mx / newZoom - wxBefore;
    this.camera.y = my / newZoom - wyBefore;
    this.clampCamera();
    this.applyCamera();
    if (this.lastState) this.drawCEOMinimap(this.lastState);
  };

  private clampCamera(): void {
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    const worldW = this.theme === "huge" ? PixiDriver.HUGE_WORLD_W : this.theme === "f5d" ? PixiDriver.F5D_WORLD_W : 3000;
    const worldH = this.theme === "huge" ? PixiDriver.HUGE_WORLD_H : this.theme === "f5d" ? PixiDriver.F5D_WORLD_H : 1800;
    const maxX = 0;
    const minX = W / this.camera.zoom - worldW;
    this.camera.x = Math.max(minX, Math.min(maxX, this.camera.x));
    const maxY = 0;
    const minY = H / this.camera.zoom - worldH;
    this.camera.y = Math.max(minY, Math.min(maxY, this.camera.y));
  }
  private static readonly HUGE_WORLD_W = 60000;
  private static readonly HUGE_WORLD_H = 36000;
  // F5D world: aspect ratio aprox 1.25 (matches OVD bbox 1.251). Tamaño generoso para
  // permitir zoom in al detalle de un stand.
  private static readonly F5D_WORLD_W = 6000;
  private static readonly F5D_WORLD_H = 4800;
  private applyCamera(): void {
    if (!this.worldRoot) return;
    this.worldRoot.scale.set(this.camera.zoom);
    this.worldRoot.position.set(this.camera.x * this.camera.zoom, this.camera.y * this.camera.zoom);
  }

  apply(state: RenderState): void {
    if (!this.app) return;
    this.lastState = state;
    // Layouts radicalmente distintos: delega a renderer propio y termina.
    if (this.theme === "lateral") return this.renderLateral(state);
    if (this.theme === "network") return this.renderNetwork(state);
    if (this.theme === "isodiag") return this.renderIsoDiag(state);
    if (this.theme === "ceofull" || this.theme === "ceopng") return this.renderCEOFullPro(state);
    if (this.theme === "huge") return this.renderHuge(state);
    if (this.theme === "f5d") return this.renderF5DScaffold(state);

    const W = this.app.screen.width;
    const H = this.app.screen.height;
    const P = PAL[this.theme];

    // 1. Background
    this.layerBg!.removeChildren();
    const bgCol = state.timeOfDay === "day" ? P.bgDay : P.bgNight;
    this.app.renderer.background.color = bgCol;
    this.layerBg!.addChild(new Graphics().rect(0, 0, W, H).fill(bgCol));

    // Blueprint: grid de fondo tipo plano
    if (this.theme === "blueprint") {
      const grid = new Graphics();
      for (let x = 0; x < W; x += 30) grid.moveTo(x, 0).lineTo(x, H);
      for (let y = 0; y < H; y += 30) grid.moveTo(0, y).lineTo(W, y);
      grid.stroke({ width: 1, color: P.apronStroke, alpha: 0.08 });
      this.layerBg!.addChild(grid);
    }

    // 2. Layout coords
    const runwayY = 28, runwayH = 22;
    const taxiwayY = runwayY + runwayH + 14, taxiwayH = 18;
    const connectorY2 = taxiwayY + taxiwayH + 28;
    const apronX = 30;
    const apronY = connectorY2 + 4;
    const apronW = W - 60;
    const apronH = H - apronY - 24;

    // Apron
    const apronG = new Graphics().rect(apronX, apronY, apronW, apronH).fill({ color: P.apronFill, alpha: 1 });
    if (this.theme === "faa") apronG.stroke({ width: 2, color: P.apronStroke, alpha: 1 });
    else apronG.stroke({ width: 1, color: P.apronStroke, alpha: 1 });
    this.layerBg!.addChild(apronG);

    // 3. Pista 27L
    const runwayLeft = apronX + 10;
    const runwayRight = apronX + apronW - 10;
    this.layerBg!.addChild(new Graphics().rect(runwayLeft, runwayY, runwayRight - runwayLeft, runwayH).fill(P.runway));
    const thresholdW = 6, thresholdGap = 4, thresholdH = runwayH - 6;
    for (let i = 0; i < 9; i++) {
      const xL = runwayLeft + 14 + i * (thresholdW + thresholdGap);
      const xR = runwayRight - 14 - i * (thresholdW + thresholdGap) - thresholdW;
      this.layerBg!.addChild(new Graphics().rect(xL, runwayY + 3, thresholdW, thresholdH).fill({ color: P.runwayStripe, alpha: 0.75 }));
      this.layerBg!.addChild(new Graphics().rect(xR, runwayY + 3, thresholdW, thresholdH).fill({ color: P.runwayStripe, alpha: 0.75 }));
    }
    const cl = new Graphics();
    strokeDashed(cl, runwayLeft + 90, runwayY + runwayH / 2, runwayRight - 90, runwayY + runwayH / 2, 18, 12, 2, P.runwayStripe, 0.85);
    this.layerBg!.addChild(cl);
    this.layerStaticLabels!.removeChildren();
    const pistaLabel = new Text({
      text: P.faaStyle ? "RWY 27L" : "Pista 27L",
      style: { fontFamily: P.fontSans, fontSize: P.faaStyle ? 14 : 11, fontWeight: P.faaStyle ? "bold" : "normal", fill: P.text },
    });
    pistaLabel.position.set(runwayLeft + 4, runwayY - 16);
    this.layerStaticLabels!.addChild(pistaLabel);
    // Cota blueprint sobre pista
    if (P.showDimensions) {
      const dim = new Text({
        text: `â†  ${Math.round((runwayRight - runwayLeft) * 0.3)} m  â†’`,
        style: { fontFamily: P.fontMono, fontSize: 9, fill: P.text },
      });
      dim.anchor.set(0.5, 0);
      dim.position.set((runwayLeft + runwayRight) / 2, runwayY + runwayH + 1);
      this.layerStaticLabels!.addChild(dim);
    }

    // 4. Taxiway A
    this.layerBg!.addChild(new Graphics().rect(runwayLeft, taxiwayY, runwayRight - runwayLeft, taxiwayH).fill(P.taxiway));
    this.layerBg!.addChild(
      new Graphics()
        .moveTo(runwayLeft + 30, taxiwayY + taxiwayH / 2)
        .lineTo(runwayRight - 30, taxiwayY + taxiwayH / 2)
        .stroke({ width: 1.5, color: P.taxiwayStripe, alpha: 0.75 }),
    );
    const taxiLabel = new Text({
      text: P.faaStyle ? "A" : "Taxiway A",
      style: { fontFamily: P.fontSans, fontSize: P.faaStyle ? 22 : 10, fontWeight: "bold", fill: P.text },
    });
    if (P.faaStyle) {
      taxiLabel.anchor.set(0.5, 0.5);
      taxiLabel.position.set(runwayLeft + 30, taxiwayY + taxiwayH / 2);
    } else {
      taxiLabel.position.set(runwayLeft + 4, taxiwayY - 1);
    }
    this.layerStaticLabels!.addChild(taxiLabel);

    // 5. Hangar zone
    const hzX = apronX + 12, hzY = apronY + 12;
    const hzW = apronW * 0.22, hzH = apronH - 24;
    this.layerBg!.addChild(new Graphics().roundRect(hzX, hzY, hzW, hzH, 8).fill({ color: P.apronFill, alpha: 0.5 }));
    if (P.steamMode) {
      // Steam: dibuja 2 edificios hangar dentro de la zona con tejado/portones/ventanas.
      drawSteamHangarsInside(this.layerBg!, hzX, hzY, hzW, hzH, state.mroStage);
    } else if (this.theme === "faa") {
      // FAA: lÃ­nea continua negra gruesa
      this.layerBg!.addChild(new Graphics().roundRect(hzX, hzY, hzW, hzH, 8).stroke({ width: 2.5, color: P.hangarZoneStroke }));
    } else if (P.iso3d) {
      // Iso: rect base + tejado elevado con lÃ­neas verticales
      const lift = 10;
      this.layerBg!.addChild(new Graphics().roundRect(hzX + lift, hzY - lift, hzW, hzH, 8).fill({ color: 0x232a3a, alpha: 0.85 }).stroke({ width: 1, color: P.hangarZoneStroke, alpha: 0.6 }));
      const conn = new Graphics();
      conn.moveTo(hzX, hzY).lineTo(hzX + lift, hzY - lift);
      conn.moveTo(hzX + hzW, hzY).lineTo(hzX + hzW + lift, hzY - lift);
      conn.moveTo(hzX + hzW, hzY + hzH).lineTo(hzX + hzW + lift, hzY + hzH - lift);
      conn.stroke({ width: 1, color: P.hangarZoneStroke, alpha: 0.5 });
      this.layerBg!.addChild(conn);
      const hzDashIso = new Graphics();
      dashedRect(hzDashIso, hzX, hzY, hzW, hzH, { width: 1.5, color: P.hangarZoneStroke, alpha: 0.75 });
      this.layerBg!.addChild(hzDashIso);
    } else {
      const hzDash = new Graphics();
      dashedRect(hzDash, hzX, hzY, hzW, hzH, { dash: 10, gap: 6, width: 1.5, color: P.hangarZoneStroke, alpha: 0.75 });
      this.layerBg!.addChild(hzDash);
    }
    const hzCenterX = hzX + hzW / 2;
    const hzLabel = new Text({
      text: P.faaStyle ? "HANGAR AREA" : "Espacio hangares",
      style: { fontFamily: P.fontSans, fontSize: P.faaStyle ? 12 : 13, fontWeight: "600", fill: P.text },
    });
    hzLabel.anchor.set(0.5);
    hzLabel.position.set(hzCenterX, hzY + hzH / 2 - 16);
    this.layerStaticLabels!.addChild(hzLabel);
    const stage3Color = state.mroStage < 3 ? P.textMuted : 0x3fb950;
    const stage4Color = state.mroStage < 4 ? P.textMuted : 0x3fb950;
    const hzStage3 = new Text({
      text: state.mroStage < 3 ? "Stage 3 â€” 500k â‚¬" : "Stage 3 âœ“",
      style: { fontFamily: P.fontMono, fontSize: 11, fill: stage3Color },
    });
    hzStage3.anchor.set(0.5);
    hzStage3.position.set(hzCenterX, hzY + hzH / 2 + 8);
    this.layerStaticLabels!.addChild(hzStage3);
    const hzStage4 = new Text({
      text: state.mroStage < 4 ? "Stage 4 â€” 1.5M â‚¬" : "Stage 4 âœ“",
      style: { fontFamily: P.fontMono, fontSize: 11, fill: stage4Color },
    });
    hzStage4.anchor.set(0.5);
    hzStage4.position.set(hzCenterX, hzY + hzH / 2 + 26);
    this.layerStaticLabels!.addChild(hzStage4);
    const hzHit = new Graphics().rect(hzX, hzY, hzW, hzH).fill({ color: 0x000000, alpha: 0.001 });
    hzHit.eventMode = "static";
    hzHit.cursor = "pointer";
    hzHit.on("pointerdown", (_ev: FederatedPointerEvent) => {
      if (this.callbacks.onBuildClick) this.callbacks.onBuildClick();
    });
    this.layerBg!.addChild(hzHit);

    // 6. Grid + callecitas + calle aux + perimetral
    const gridX = hzX + hzW + 24, gridY = apronY + 12;
    const gridW = apronX + apronW - gridX - 12, gridH = apronH - 24;
    const calleW = 22, calleAuxH = 26, perimH = 22;
    const colW = (gridW - 3 * calleW) / 3;
    const rowH = (gridH - calleAuxH - perimH) / 2;
    const colX = [gridX, gridX + colW + calleW, gridX + 2 * (colW + calleW)];
    const rowYs = [gridY, gridY + rowH + calleAuxH];
    const calleAuxY = gridY + rowH;
    const perimY = gridY + 2 * rowH + calleAuxH;

    this.layerRoad!.removeChildren();
    for (let i = 0; i < 3; i++) {
      const cx = colX[i] + colW;
      this.layerRoad!.addChild(new Graphics().rect(cx, gridY, calleW, gridH - perimH).fill(P.callelane));
      // AirportCEO: bordes amarillos en cada lado de la callecita
      if (P.airportceoMode) {
        this.layerRoad!.addChild(new Graphics().rect(cx, gridY, 1.5, gridH - perimH).fill(0xfdc640));
        this.layerRoad!.addChild(new Graphics().rect(cx + calleW - 1.5, gridY, 1.5, gridH - perimH).fill(0xfdc640));
      }
      // SimAirport: centerline amarillo discontinuo en cada callecita
      if (P.simairportMode) {
        const ccl = new Graphics();
        strokeDashed(ccl, cx + calleW / 2, gridY + 6, cx + calleW / 2, gridY + (gridH - perimH) - 6, 8, 6, 1.5, 0xfdc640, 0.8);
        this.layerRoad!.addChild(ccl);
      }
    }
    this.layerRoad!.addChild(new Graphics().rect(gridX, calleAuxY, gridW, calleAuxH).fill(P.taxilane));
    if (P.airportceoMode) {
      this.layerRoad!.addChild(new Graphics().rect(gridX, calleAuxY, gridW, 1.5).fill(0xfdc640));
      this.layerRoad!.addChild(new Graphics().rect(gridX, calleAuxY + calleAuxH - 1.5, gridW, 1.5).fill(0xfdc640));
    }
    const auxCl = new Graphics();
    strokeDashed(auxCl, gridX + 10, calleAuxY + calleAuxH / 2, gridX + gridW - 10, calleAuxY + calleAuxH / 2, 10, 8, 1.5, P.centerLine, 0.85);
    this.layerRoad!.addChild(auxCl);
    this.layerRoad!.addChild(new Graphics().rect(gridX, perimY, gridW, perimH).fill(P.callelane));
    if (P.airportceoMode) {
      this.layerRoad!.addChild(new Graphics().rect(gridX, perimY, gridW, 1.5).fill(0xfdc640));
      this.layerRoad!.addChild(new Graphics().rect(gridX, perimY + perimH - 1.5, gridW, 1.5).fill(0xfdc640));
    }
    // SimAirport: chevrons amarillos en bordes del taxiway principal (entre taxiway y apron)
    if (P.simairportMode) {
      const chevG = new Graphics();
      for (let x = runwayLeft + 30; x < runwayRight - 30; x += 22) {
        chevG.moveTo(x, taxiwayY + taxiwayH + 2).lineTo(x + 8, taxiwayY + taxiwayH + 8).lineTo(x + 16, taxiwayY + taxiwayH + 2);
      }
      chevG.stroke({ width: 1.5, color: 0xfdc640, alpha: 0.8 });
      this.layerBg!.addChild(chevG);
    }

    // Conectores verticales taxiway â†’ apron
    for (let i = 0; i < 3; i++) {
      const cx = colX[i] + colW + calleW / 2;
      this.layerBg!.addChild(
        new Graphics()
          .rect(cx - 8, taxiwayY + taxiwayH, 16, connectorY2 - (taxiwayY + taxiwayH) + (gridY - apronY) + 12)
          .fill(P.taxiway),
      );
    }

    // 7. Stands grid (con inset)
    const standInsetX = 14, standInsetY = 14;
    type SlotBox = { x: number; y: number; w: number; h: number; insetX: number; insetY: number; insetW: number; insetH: number; centerX: number; centerY: number; col: number; row: number; label: string };
    const slotBoxes: Record<string, SlotBox> = {};
    for (const slot of ALL_SLOTS) {
      const x = colX[slot.col], y = rowYs[slot.row];
      const insetX = x + standInsetX, insetY = y + standInsetY;
      const insetW = colW - 2 * standInsetX, insetH = rowH - 2 * standInsetY;
      slotBoxes[slot.label] = {
        x, y, w: colW, h: rowH, insetX, insetY, insetW, insetH,
        centerX: insetX + insetW / 2, centerY: insetY + insetH / 2,
        col: slot.col, row: slot.row, label: slot.label,
      };
    }

    this.layerSprites!.removeChildren();
    this.layerMoving!.removeChildren();

    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);
    const checkByStand = new Map<string, boolean>();
    for (const s of state.stands) if (s.checkInProgress) checkByStand.set(s.id, true);

    for (const slot of ALL_SLOTS) {
      const box = slotBoxes[slot.label];
      const simId = Object.keys(SIM_TO_SLOT).find((k) => SIM_TO_SLOT[k].label === slot.label);
      const stand = simId ? state.stands.find((s) => s.id === simId) : undefined;
      const active = !!stand;
      const ap = simId ? apByStand.get(simId) : undefined;
      const hasCheck = simId ? checkByStand.get(simId) : false;

      // Cell
      const cellGFx = new Graphics()
        .rect(box.insetX, box.insetY, box.insetW, box.insetH)
        .fill({ color: P.standFill, alpha: active ? 1 : 0.35 });
      cellGFx.stroke({ width: this.theme === "faa" ? 2 : 1, color: P.standStroke, alpha: active ? 0.95 : 0.4 });
      this.layerSprites!.addChild(cellGFx);
      // Glow neon en stand ocupado
      if (P.glow && ap && !ap.taxiing) {
        this.layerSprites!.addChild(
          new Graphics()
            .rect(box.insetX - 4, box.insetY - 4, box.insetW + 8, box.insetH + 8)
            .stroke({ width: 6, color: P.standStroke, alpha: 0.18 }),
        );
      }
      // Parking guidance
      const guideX1 = box.insetX + box.insetW * 0.32, guideX2 = box.insetX + box.insetW * 0.68;
      this.layerSprites!.addChild(
        new Graphics()
          .moveTo(guideX1, box.insetY + 6).lineTo(guideX1, box.insetY + box.insetH - 6)
          .moveTo(guideX2, box.insetY + 6).lineTo(guideX2, box.insetY + box.insetH - 6)
          .stroke({ width: 1, color: P.standStroke, alpha: P.faaStyle ? 0.6 : 0.35 }),
      );
      // SimAirport: marca de parking spot (cÃ­rculo + cruz amarilla grande)
      if (P.simairportMode && active) {
        const mc = new Graphics();
        mc.circle(box.centerX, box.centerY, Math.min(box.insetW, box.insetH) * 0.32).stroke({ width: 1.5, color: 0xfdc640, alpha: 0.85 });
        mc.moveTo(box.centerX - 14, box.centerY).lineTo(box.centerX + 14, box.centerY);
        mc.moveTo(box.centerX, box.centerY - 14).lineTo(box.centerX, box.centerY + 14);
        mc.stroke({ width: 1, color: 0xfdc640, alpha: 0.55 });
        this.layerSprites!.addChild(mc);
        // Borde amarillo grueso del stand
        this.layerSprites!.addChild(
          new Graphics().rect(box.insetX, box.insetY, box.insetW, box.insetH).stroke({ width: 1.5, color: 0xfdc640, alpha: 0.85 }),
        );
      }
      // AirportCEO: borde amarillo punteado + nÃºmero grande de stand en esquina + sombra
      if (P.airportceoMode && active) {
        const cb = new Graphics();
        strokeDashed(cb, box.insetX, box.insetY, box.insetX + box.insetW, box.insetY, 8, 4, 1.2, 0xfdc640, 0.9);
        strokeDashed(cb, box.insetX + box.insetW, box.insetY, box.insetX + box.insetW, box.insetY + box.insetH, 8, 4, 1.2, 0xfdc640, 0.9);
        strokeDashed(cb, box.insetX + box.insetW, box.insetY + box.insetH, box.insetX, box.insetY + box.insetH, 8, 4, 1.2, 0xfdc640, 0.9);
        strokeDashed(cb, box.insetX, box.insetY + box.insetH, box.insetX, box.insetY, 8, 4, 1.2, 0xfdc640, 0.9);
        this.layerSprites!.addChild(cb);
      }

      const lbl = new Text({
        text: slot.label,
        style: {
          fontFamily: P.fontMono,
          fontSize: P.faaStyle ? 18 : 11,
          fontWeight: P.faaStyle ? "bold" : "600",
          fill: active ? P.standLabel : P.freeLabel,
        },
      });
      if (P.faaStyle) {
        lbl.anchor.set(0, 0);
        lbl.position.set(box.insetX + 4, box.insetY + 2);
      } else {
        lbl.position.set(box.insetX + 4, box.insetY + 3);
      }
      this.layerSprites!.addChild(lbl);

      if (!active) {
        const off = new Text({
          text: "â€”",
          style: { fontFamily: P.fontSans, fontSize: 10, fill: P.freeLabel },
        });
        off.anchor.set(0.5);
        off.position.set(box.centerX, box.centerY);
        this.layerSprites!.addChild(off);
      } else if (ap && !ap.taxiing) {
        const size = Math.min(box.insetW, box.insetH) * 0.55;
        if (this.theme !== "blueprint") drawShadow(this.layerSprites!, box.centerX + 2, box.centerY + size * 0.35, size * 0.45);
        const fillColor = P.airplaneUsesAirline ? airlineColor(ap.airlineId) : P.airplaneFill;
        if (P.steamMode) {
          drawSteamAirplane(this.layerSprites!, box.centerX, box.centerY, size, fillColor, 0);
        } else if (P.simairportMode) {
          drawSimAirportAirplane(this.layerSprites!, box.centerX, box.centerY, size, fillColor, 0);
        } else if (P.airportceoMode) {
          drawAirportCEOAirplane(this.layerSprites!, box.centerX, box.centerY, size, fillColor, 0);
        } else {
          drawAirplaneTopDown(this.layerSprites!, box.centerX, box.centerY, size, fillColor, 0, P);
        }
        const regT = new Text({
          text: ap.registration,
          style: { fontFamily: P.fontMono, fontSize: 9, fill: P.text },
        });
        regT.anchor.set(0.5, 0);
        regT.position.set(box.centerX, box.insetY + box.insetH - 12);
        this.layerSprites!.addChild(regT);
        if (hasCheck) {
          const cBadge = new Text({
            text: "â›…",
            style: { fontFamily: P.fontSans, fontSize: 11, fill: P.text },
          });
          cBadge.position.set(box.insetX + box.insetW - 18, box.insetY + 2);
          this.layerSprites!.addChild(cBadge);
        }
      } else {
        const txt = ap && ap.taxiing ? "entrandoâ€¦" : "libre";
        const free = new Text({
          text: txt,
          style: { fontFamily: P.fontSans, fontSize: 10, fill: P.freeLabel },
        });
        free.anchor.set(0.5);
        free.position.set(box.centerX, box.centerY);
        this.layerSprites!.addChild(free);
      }
    }

    // 8. Oficina mecs
    const officeW = 90, officeH = 64;
    const officeX = apronX + apronW - officeW - 14;
    const officeY = apronY + apronH - officeH - 14;
    if (P.steamMode) {
      drawSteamOffice(this.layerSprites!, officeX, officeY, officeW, officeH, state.timeOfDay === "night");
    } else {
      if (P.iso3d) {
        const lift = 8;
        this.layerSprites!.addChild(
          new Graphics().roundRect(officeX + lift, officeY - lift, officeW, officeH, 3).fill(P.officeWall).stroke({ width: 1.5, color: P.officeOutline }),
        );
        const officeConn = new Graphics();
        officeConn.moveTo(officeX, officeY).lineTo(officeX + lift, officeY - lift);
        officeConn.moveTo(officeX + officeW, officeY).lineTo(officeX + officeW + lift, officeY - lift);
        officeConn.moveTo(officeX, officeY + officeH).lineTo(officeX + lift, officeY + officeH - lift);
        officeConn.moveTo(officeX + officeW, officeY + officeH).lineTo(officeX + officeW + lift, officeY + officeH - lift);
        officeConn.stroke({ width: 1, color: P.officeOutline, alpha: 0.8 });
        this.layerSprites!.addChild(officeConn);
      }
      this.layerSprites!.addChild(
        new Graphics().roundRect(officeX, officeY, officeW, officeH, 3).fill(P.officeWall).stroke({ width: 1.5, color: P.officeOutline }),
      );
      const winW = 14, winH = 10, winGapX = 8, winGapY = 6;
      const winRowY = officeY + 12;
      const winStartX = officeX + 10;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const wx = winStartX + c * (winW + winGapX);
          const wy = winRowY + r * (winH + winGapY);
          const winColor = this.theme === "faa" ? P.officeWindow : (state.timeOfDay === "night" ? P.officeWindow : 0xf5e9b8);
          this.layerSprites!.addChild(new Graphics().rect(wx, wy, winW, winH).fill(winColor).stroke({ width: 1, color: P.officeOutline }));
        }
      }
      const doorW = 12, doorH = 22;
      this.layerSprites!.addChild(
        new Graphics().rect(officeX + officeW - doorW - 10, officeY + officeH - doorH, doorW, doorH).fill(P.officeDoor).stroke({ width: 1, color: P.officeOutline }),
      );
    }
    const officeLbl = new Text({
      text: P.faaStyle ? "OFFICE" : "Oficina mecs",
      style: { fontFamily: P.fontSans, fontSize: P.faaStyle ? 11 : 11, fontWeight: P.faaStyle ? "bold" : "normal", fill: P.text },
    });
    officeLbl.anchor.set(0.5, 1);
    officeLbl.position.set(officeX + officeW / 2, officeY - 2);
    this.layerSprites!.addChild(officeLbl);
    const idleCount = state.mechanics.filter((m) => m.state === "Idle").length;
    const onShiftCount = state.mechanics.filter((m) => m.state !== "OffShift" && m.state !== "Training").length;
    const officeCount = new Text({
      text: `${idleCount}/${onShiftCount}`,
      style: { fontFamily: P.fontMono, fontSize: 12, fontWeight: "600", fill: P.text },
    });
    officeCount.anchor.set(0.5);
    officeCount.position.set(officeX + officeW / 2, officeY + officeH / 2 + 6);
    this.layerSprites!.addChild(officeCount);

    const officeCenter: Pt = { x: officeX + officeW / 2, y: officeY + officeH / 2 };
    const perimEntryY = perimY + perimH / 2;
    const calleAuxCenterY = calleAuxY + calleAuxH / 2;

    // 9. Furgos
    for (const m of state.mechanics) {
      if (!m.destStandId) continue;
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      const slot = SIM_TO_SLOT[m.destStandId];
      if (!slot) continue;
      const box = slotBoxes[slot.label];
      const calleCx = colX[slot.col] + colW + calleW / 2;
      const path: Pt[] = [
        officeCenter,
        { x: officeX - 6, y: perimEntryY },
        { x: calleCx, y: perimEntryY },
        slot.row === 0 ? { x: calleCx, y: calleAuxCenterY } : { x: calleCx, y: rowYs[1] + rowH / 2 },
        { x: box.centerX, y: box.centerY },
      ];
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const { pos } = lerpPath(path, tForward);
      if (P.steamMode) {
        drawSteamVan(this.layerMoving!, pos.x, pos.y, m.state === "Returning", P);
      } else {
        this.drawVan(pos.x, pos.y, m.state === "Returning", P);
      }
    }
    // Mec Working: punto en stand
    for (const m of state.mechanics) {
      if (m.state !== "Working" || !m.destStandId) continue;
      const slot = SIM_TO_SLOT[m.destStandId];
      if (!slot) continue;
      const box = slotBoxes[slot.label];
      this.layerMoving!.addChild(new Graphics().circle(box.insetX + 10, box.insetY + box.insetH - 10, 3).fill(P.vanColor));
    }

    // 10. Aviones taxiing
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const slot = SIM_TO_SLOT[ap.standId];
      if (!slot) continue;
      const box = slotBoxes[slot.label];
      const calleCx = colX[slot.col] + colW + calleW / 2;
      const path: Pt[] = [
        { x: calleCx, y: taxiwayY + taxiwayH / 2 },
        { x: calleCx, y: gridY - 4 },
        slot.row === 0 ? { x: calleCx, y: box.centerY } : { x: calleCx, y: calleAuxCenterY },
        { x: box.centerX, y: box.centerY },
      ];
      const { pos } = lerpPath(path, ap.taxiProgress);
      const heading = pathHeading(path, ap.taxiProgress);
      // Glow halo (mÃ¡s intenso con theme neon)
      this.layerMoving!.addChild(
        new Graphics().circle(pos.x, pos.y, P.glow ? 22 : 16).fill({ color: P.taxiingPlane, alpha: P.glow ? 0.28 : 0.18 }),
      );
      if (P.steamMode) {
        drawSteamAirplane(this.layerMoving!, pos.x, pos.y, 22, P.taxiingPlane, heading + Math.PI / 2);
      } else if (P.simairportMode) {
        drawSimAirportAirplane(this.layerMoving!, pos.x, pos.y, 22, P.taxiingPlane, heading + Math.PI / 2);
      } else if (P.airportceoMode) {
        drawAirportCEOAirplane(this.layerMoving!, pos.x, pos.y, 22, P.taxiingPlane, heading + Math.PI / 2);
      } else {
        drawAirplaneTopDown(this.layerMoving!, pos.x, pos.y, 22, P.taxiingPlane, heading + Math.PI / 2, P);
      }
    }

    // 11. Overlay
    this.layerOverlay!.removeChildren();
    if (state.runwayClosed) {
      this.layerOverlay!.addChild(new Graphics().rect(0, 0, W, H).fill({ color: P.runwayClosed, alpha: 0.06 }));
      const txt = new Text({
        text: "ðŸ“¢ PISTA CERRADA",
        style: { fontFamily: P.fontSans, fontSize: 14, fontWeight: "bold", fill: P.runwayClosed },
      });
      txt.anchor.set(1, 0);
      txt.position.set(W - 12, 8);
      this.layerOverlay!.addChild(txt);
    }
    const hud = new Text({
      text: `Etapa ${state.mroStage} Â· ${state.timeOfDay === "day" ? "â˜€ï¸ DÃA" : "ðŸŒ™ NOCHE"} Â· t=${state.minute}`,
      style: { fontFamily: P.fontMono, fontSize: 11, fill: P.textMuted },
    });
    hud.anchor.set(1, 0);
    hud.position.set(W - 12, state.runwayClosed ? 30 : 8);
    this.layerOverlay!.addChild(hud);
    // Indicador del skin actual (esquina sup-izq)
    const skinLbl = new Text({
      text: `skin: ${this.theme}`,
      style: { fontFamily: P.fontMono, fontSize: 10, fill: P.textMuted },
    });
    skinLbl.position.set(12, 8);
    this.layerOverlay!.addChild(skinLbl);
  }

  private drawVan(cx: number, cy: number, returning: boolean, P: ThemePalette): void {
    const w = 16, h = 9;
    this.layerMoving!.addChild(
      new Graphics()
        .roundRect(cx - w / 2, cy - h / 2, w, h, 2)
        .fill(returning ? P.vanReturning : P.vanColor)
        .stroke({ width: 1, color: 0xffffff, alpha: 0.55 }),
    );
    this.layerMoving!.addChild(
      new Graphics()
        .rect(cx - w / 2 + 2, cy - h / 2 + 1.5, 4, h - 3)
        .fill({ color: 0xe6e9ef, alpha: 0.6 }),
    );
  }

  // ============================================================
  // === Layouts radicalmente distintos (renderers propios) ====
  // ============================================================

  /** LATERAL Â· Vista de perfil tipo Project Hospital. Hangar cortado por la mitad,
   *  aviÃ³n adentro de perfil, mecs como sprites humanos lateral, pista al fondo
   *  con horizonte + cielo dÃ­a/noche. */
  private renderLateral(state: RenderState): void {
    const app = this.app!;
    const W = app.screen.width, H = app.screen.height;
    const skyDay = 0x6db4e0, skyNight = 0x0a1a2e;
    const sky = state.timeOfDay === "day" ? skyDay : skyNight;
    const ground = 0x4a6b3a;
    app.renderer.background.color = sky;

    [this.layerBg!, this.layerRoad!, this.layerStaticLabels!, this.layerSprites!, this.layerMoving!, this.layerOverlay!].forEach(l => l.removeChildren());

    // Cielo
    this.layerBg!.addChild(new Graphics().rect(0, 0, W, H).fill(sky));
    // Sol/Luna
    const sunX = state.timeOfDay === "day" ? W * 0.78 : W * 0.22;
    const sunY = H * 0.18;
    this.layerBg!.addChild(new Graphics().circle(sunX, sunY, 22).fill(state.timeOfDay === "day" ? 0xfde047 : 0xe8e8f5));
    if (state.timeOfDay === "night") {
      // Estrellitas
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 137) % W);
        const sy = ((i * 89) % (H * 0.5));
        this.layerBg!.addChild(new Graphics().circle(sx, sy, 1).fill({ color: 0xffffff, alpha: 0.6 }));
      }
    }

    // Horizonte: pista al fondo (lÃ­nea horizontal con marcas amarillas)
    const horizonY = H * 0.45;
    this.layerBg!.addChild(new Graphics().rect(0, horizonY, W, 2).fill(0x2a2e36));
    this.layerBg!.addChild(new Graphics().rect(0, horizonY + 2, W, 16).fill(0x1f2229));
    // Marcas pista al fondo
    for (let x = 20; x < W; x += 40) {
      this.layerBg!.addChild(new Graphics().rect(x, horizonY + 9, 22, 2).fill({ color: 0xfdb022, alpha: 0.6 }));
    }
    // Suelo verde
    this.layerBg!.addChild(new Graphics().rect(0, horizonY + 18, W, H - horizonY - 18).fill(ground));
    // Pavimento del hangar (gris)
    const pavY = horizonY + 18;
    const pavH = H - pavY - 8;
    this.layerBg!.addChild(new Graphics().rect(40, pavY, W - 80, pavH).fill(0x5a6068));

    // Hangar grande centrado (rect con tejado triangular, abierto frente)
    const hangarW = Math.min(W * 0.55, 520);
    const hangarH = pavH * 0.85;
    const hangarX = (W - hangarW) / 2 - 80;
    const hangarY = pavY + (pavH - hangarH) / 2;
    // Sombra
    this.layerSprites!.addChild(new Graphics().rect(hangarX + 4, hangarY + 4, hangarW, hangarH).fill({ color: 0x000000, alpha: 0.35 }));
    // Pared trasera
    this.layerSprites!.addChild(new Graphics().rect(hangarX, hangarY + 10, hangarW, hangarH - 10).fill(0x6b7280).stroke({ width: 2, color: 0x2a2e36 }));
    // Tejado triangular
    const roofTri = new Graphics();
    roofTri.moveTo(hangarX - 10, hangarY + 10);
    roofTri.lineTo(hangarX + hangarW / 2, hangarY - 40);
    roofTri.lineTo(hangarX + hangarW + 10, hangarY + 10);
    roofTri.fill(0x9aa1ad).stroke({ width: 2, color: 0x2a2e36 });
    this.layerSprites!.addChild(roofTri);
    // Estructura interior (vigas verticales)
    for (let i = 1; i < 5; i++) {
      const vx = hangarX + (hangarW / 5) * i;
      this.layerSprites!.addChild(new Graphics().moveTo(vx, hangarY + 10).lineTo(vx, hangarY + hangarH).stroke({ width: 1, color: 0x4a4f5a, alpha: 0.4 }));
    }
    // Suelo del hangar (mÃ¡s claro, con marcas amarillas)
    const floorY = hangarY + hangarH - 22;
    this.layerSprites!.addChild(new Graphics().rect(hangarX + 4, floorY, hangarW - 8, 22).fill(0x7a8090));
    this.layerSprites!.addChild(new Graphics().moveTo(hangarX + 8, floorY + 2).lineTo(hangarX + hangarW - 8, floorY + 2).stroke({ width: 1, color: 0xfdb022, alpha: 0.6 }));
    // Label
    const hangarLbl = new Text({
      text: `HANGAR Â· Etapa ${state.mroStage}`,
      style: { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "bold", fill: 0xffffff },
    });
    hangarLbl.anchor.set(0.5, 1);
    hangarLbl.position.set(hangarX + hangarW / 2, hangarY - 8);
    this.layerStaticLabels!.addChild(hangarLbl);

    // AviÃ³n de perfil adentro del hangar (si hay alguno con WO o cualquier presente)
    const presentApFront = state.airplanes.filter((a) => !a.taxiing && a.standId);
    if (presentApFront.length > 0) {
      const ap = presentApFront[0];
      const cx = hangarX + hangarW * 0.5;
      const cy = floorY - 28;
      drawLateralAirplane(this.layerSprites!, cx, cy, hangarW * 0.55, airlineColor(ap.airlineId));
      // MatrÃ­cula
      const reg = new Text({
        text: ap.registration,
        style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: 0xffffff },
      });
      reg.anchor.set(0.5, 1);
      reg.position.set(cx, cy - hangarW * 0.07);
      this.layerStaticLabels!.addChild(reg);
      // Contador stand vs total
      if (presentApFront.length > 1) {
        const more = new Text({
          text: `+${presentApFront.length - 1} en otros stands`,
          style: { fontFamily: "Inter, sans-serif", fontSize: 10, fill: 0xc5c5c5 },
        });
        more.anchor.set(0.5, 0);
        more.position.set(cx, floorY + 26);
        this.layerStaticLabels!.addChild(more);
      }
    } else {
      const noAp = new Text({
        text: "(stands vacÃ­os)",
        style: { fontFamily: "Inter, sans-serif", fontSize: 12, fill: 0xc5c5c5 },
      });
      noAp.anchor.set(0.5, 0.5);
      noAp.position.set(hangarX + hangarW / 2, floorY - 30);
      this.layerStaticLabels!.addChild(noAp);
    }

    // Mecs como sprites humanos lateral en el suelo del hangar (working + ToPlane mostrar caminando)
    const workingMecs = state.mechanics.filter((m) => m.state === "Working");
    workingMecs.slice(0, 6).forEach((_m, i) => {
      const mx = hangarX + 30 + i * 24;
      const my = floorY - 4;
      drawLateralPerson(this.layerSprites!, mx, my, 0xa78bfa);
    });

    // Oficina a la derecha (edificio multi-piso) o izquierda
    const officeW = 120, officeH = 110;
    const officeX = W - officeW - 30;
    const officeY = pavY + (pavH - officeH) / 2;
    drawLateralOffice(this.layerSprites!, officeX, officeY, officeW, officeH, state.timeOfDay === "night");
    // Contador
    const idleC = state.mechanics.filter((m) => m.state === "Idle").length;
    const totC = state.mechanics.filter((m) => m.state !== "OffShift" && m.state !== "Training").length;
    const ofLbl = new Text({
      text: `${idleC}/${totC} disp.`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: 0xffffff },
    });
    ofLbl.anchor.set(0.5, 0);
    ofLbl.position.set(officeX + officeW / 2, officeY + officeH + 4);
    this.layerStaticLabels!.addChild(ofLbl);

    // Mecs en ToPlane â†’ caminando entre oficina y hangar (interpolar X)
    for (const m of state.mechanics) {
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      const startX = officeX;
      const endX = hangarX + hangarW - 10;
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const px = endX - (endX - startX) * (1 - tForward);
      drawLateralPerson(this.layerMoving!, px, floorY + 12, 0xc084fc);
    }

    // AviÃ³n taxiando en la pista del fondo (si hay uno)
    const taxiing = state.airplanes.find((a) => a.taxiing);
    if (taxiing) {
      const taxiX = W * taxiing.taxiProgress * 0.85 + 40;
      drawLateralAirplane(this.layerMoving!, taxiX, horizonY + 6, 80, 0x4ade80);
    }

    // HUD esquina sup
    const hud = new Text({
      text: `LATERAL Â· Etapa ${state.mroStage} Â· ${state.timeOfDay === "day" ? "â˜€ï¸" : "ðŸŒ™"} Â· t=${state.minute}`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: 0xffffff },
    });
    hud.position.set(12, 10);
    this.layerOverlay!.addChild(hud);
    const skinLbl = new Text({ text: "skin: lateral", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: 0xc5c5c5 } });
    skinLbl.anchor.set(1, 0); skinLbl.position.set(W - 12, 10);
    this.layerOverlay!.addChild(skinLbl);
  }

  /** NETWORK Â· Diagrama de flujo abstracto tipo Factorio mid-route. Nodos circulares
   *  conectados por aristas. Aviones como Ã­conos en nodos; mecs como puntos viajando
   *  por aristas. Cero geografÃ­a â€” todo info-dense flow. */
  private renderNetwork(state: RenderState): void {
    const app = this.app!;
    const W = app.screen.width, H = app.screen.height;
    const bg = state.timeOfDay === "day" ? 0x0a0e18 : 0x05080f;
    app.renderer.background.color = bg;
    [this.layerBg!, this.layerRoad!, this.layerStaticLabels!, this.layerSprites!, this.layerMoving!, this.layerOverlay!].forEach(l => l.removeChildren());

    this.layerBg!.addChild(new Graphics().rect(0, 0, W, H).fill(bg));
    // Grid de fondo tipo blueprint sutil
    const gridG = new Graphics();
    for (let x = 0; x < W; x += 40) gridG.moveTo(x, 0).lineTo(x, H);
    for (let y = 0; y < H; y += 40) gridG.moveTo(0, y).lineTo(W, y);
    gridG.stroke({ width: 1, color: 0x1a2030, alpha: 0.4 });
    this.layerBg!.addChild(gridG);

    // Posiciones de nodos:
    //   Pista (hub aterrizaje) â€” izquierda arriba (1 nodo grande)
    //   Hangar zone â€” izquierda centro
    //   Stands 351-552 â€” cÃ­rculos en columna central (2x3)
    //   Oficina â€” derecha arriba
    const cx0 = W * 0.12, cx1 = W * 0.42, cx2 = W * 0.72, cx3 = W * 0.92;
    const cy_top = H * 0.18, cy_mid = H * 0.5, cy_bot = H * 0.82;
    const runwayPos = { x: cx0, y: cy_top };
    const hangarZonePos = { x: cx0, y: cy_bot };
    const officePos = { x: cx3, y: cy_top };
    const standPositions: Record<string, { x: number; y: number; label: string }> = {
      "H1-S1": { x: cx1, y: H * 0.25, label: "351" },
      "H1-S2": { x: cx2, y: H * 0.25, label: "451" },
      "H1-S3": { x: cx2 + (cx3 - cx2) * 0.35, y: H * 0.4, label: "551" },
      "R1":    { x: cx1, y: H * 0.55, label: "352" },
      "H2-S1": { x: cx2, y: H * 0.55, label: "452" },
    };

    // Aristas
    const drawEdge = (a: { x: number; y: number }, b: { x: number; y: number }, color = 0x3a4256, width = 2) => {
      this.layerRoad!.addChild(new Graphics().moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color, alpha: 0.5 }));
    };
    // Pista â†’ cada stand (lÃ­neas de aterrizaje)
    for (const sid of Object.keys(standPositions)) drawEdge(runwayPos, standPositions[sid], 0x4a5d80, 1.5);
    // Hangar zone â†’ cada stand (potencial movimiento entre)
    for (const sid of Object.keys(standPositions)) drawEdge(hangarZonePos, standPositions[sid], 0x4a3d80, 1);
    // Oficina â†’ cada stand (rutas de mecs)
    for (const sid of Object.keys(standPositions)) drawEdge(officePos, standPositions[sid], 0x3a4256, 1);

    // Nodos
    const drawNode = (x: number, y: number, r: number, color: number, label: string, sub?: string) => {
      this.layerSprites!.addChild(new Graphics().circle(x, y, r + 4).fill({ color, alpha: 0.15 }));
      this.layerSprites!.addChild(new Graphics().circle(x, y, r).fill({ color: 0x121929, alpha: 0.95 }).stroke({ width: 2, color }));
      const lbl = new Text({
        text: label,
        style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: "bold", fill: 0xffffff },
      });
      lbl.anchor.set(0.5);
      lbl.position.set(x, y - (sub ? 5 : 0));
      this.layerSprites!.addChild(lbl);
      if (sub) {
        const s = new Text({
          text: sub,
          style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: 0x8b95a8 },
        });
        s.anchor.set(0.5);
        s.position.set(x, y + 8);
        this.layerSprites!.addChild(s);
      }
    };

    // Pista
    drawNode(runwayPos.x, runwayPos.y, 30, 0x4ade80, "RWY 27L", state.runwayClosed ? "CERRADA" : "abierta");
    // Hangar zone
    drawNode(hangarZonePos.x, hangarZonePos.y, 36, 0x06b6d4, "Hangares", state.mroStage >= 4 ? "Stage 4" : state.mroStage >= 3 ? "Stage 3" : `Stage ${state.mroStage}`);
    // Oficina
    const idleC = state.mechanics.filter((m) => m.state === "Idle").length;
    const totC = state.mechanics.filter((m) => m.state !== "OffShift" && m.state !== "Training").length;
    drawNode(officePos.x, officePos.y, 30, 0xfde047, "Oficina", `${idleC}/${totC} mecs`);

    // Stands con aviÃ³n presente
    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);
    for (const sid of Object.keys(standPositions)) {
      const pos = standPositions[sid];
      const ap = apByStand.get(sid);
      const color = ap ? airlineColor(ap.airlineId) : 0x4a5266;
      drawNode(pos.x, pos.y, 22, color, pos.label, ap ? ap.registration : "libre");
    }

    // Mecs en ToPlane â†’ puntos moviÃ©ndose por arista oficinaâ†’stand
    for (const m of state.mechanics) {
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      if (!m.destStandId) continue;
      const dest = standPositions[m.destStandId];
      if (!dest) continue;
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const px = officePos.x + (dest.x - officePos.x) * tForward;
      const py = officePos.y + (dest.y - officePos.y) * tForward;
      this.layerMoving!.addChild(new Graphics().circle(px, py, 4).fill(m.state === "Returning" ? 0x8b95a8 : 0xc084fc).stroke({ width: 1, color: 0xffffff, alpha: 0.7 }));
    }
    // AviÃ³n taxiing â†’ punto moviÃ©ndose por arista pistaâ†’stand
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const dest = standPositions[ap.standId];
      if (!dest) continue;
      const px = runwayPos.x + (dest.x - runwayPos.x) * ap.taxiProgress;
      const py = runwayPos.y + (dest.y - runwayPos.y) * ap.taxiProgress;
      this.layerMoving!.addChild(new Graphics().circle(px, py, 7).fill({ color: 0x4ade80, alpha: 0.3 }));
      this.layerMoving!.addChild(new Graphics().circle(px, py, 4).fill(0x4ade80).stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 }));
    }

    // Click hangar zone
    const hzHit = new Graphics().circle(hangarZonePos.x, hangarZonePos.y, 40).fill({ color: 0x000000, alpha: 0.001 });
    hzHit.eventMode = "static"; hzHit.cursor = "pointer";
    hzHit.on("pointerdown", () => { if (this.callbacks.onBuildClick) this.callbacks.onBuildClick(); });
    this.layerSprites!.addChild(hzHit);

    // HUD
    const hud = new Text({
      text: `NETWORK Â· Etapa ${state.mroStage} Â· ${state.timeOfDay === "day" ? "â˜€ï¸" : "ðŸŒ™"} Â· t=${state.minute}`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: 0xffffff },
    });
    hud.position.set(12, 10);
    this.layerOverlay!.addChild(hud);
    const skinLbl = new Text({ text: "skin: network", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: 0xc5c5c5 } });
    skinLbl.anchor.set(1, 0); skinLbl.position.set(W - 12, 10);
    this.layerOverlay!.addChild(skinLbl);
  }

  /** ISODIAG Â· ProyecciÃ³n isomÃ©trica real diagonal (true iso). Pista en diagonal,
   *  hangares como cubos iso, stands en diamante. Estilo SimCity 2000. */
  private renderIsoDiag(state: RenderState): void {
    const app = this.app!;
    const W = app.screen.width, H = app.screen.height;
    const sky = state.timeOfDay === "day" ? 0x2c3344 : 0x0f131c;
    app.renderer.background.color = sky;
    [this.layerBg!, this.layerRoad!, this.layerStaticLabels!, this.layerSprites!, this.layerMoving!, this.layerOverlay!].forEach(l => l.removeChildren());

    this.layerBg!.addChild(new Graphics().rect(0, 0, W, H).fill(sky));

    // Centro de la escena
    const cx = W / 2, cy = H / 2 + 20;
    // FunciÃ³n iso: world (gx, gy) en grid coords â†’ screen (sx, sy)
    // Iso 2:1 (dimÃ©trica): sx = (gx - gy) * tileW/2, sy = (gx + gy) * tileH/2
    const tileW = 56, tileH = 28;
    const iso = (gx: number, gy: number): Pt => ({ x: cx + (gx - gy) * tileW / 2, y: cy + (gx + gy) * tileH / 2 });

    // Dibujar grid de tiles base (8Ã—8)
    const gridN = 8;
    for (let gx = -gridN / 2; gx < gridN / 2; gx++) {
      for (let gy = -gridN / 2; gy < gridN / 2; gy++) {
        const p0 = iso(gx, gy);
        const p1 = iso(gx + 1, gy);
        const p2 = iso(gx + 1, gy + 1);
        const p3 = iso(gx, gy + 1);
        const isOdd = (gx + gy) % 2 === 0;
        const color = isOdd ? 0x4a6b3a : 0x3e5b32; // hierba
        const t = new Graphics();
        t.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).closePath();
        t.fill(color);
        t.stroke({ width: 0.5, color: 0x1a2030, alpha: 0.4 });
        this.layerBg!.addChild(t);
      }
    }

    // Pista en diagonal (sobre y=-3..-2, gx=-4..4 â†’ diagonal del eje x)
    drawIsoStrip(this.layerBg!, iso, -4, -3, 8, 1, 0x1f2229);
    drawIsoStrip(this.layerBg!, iso, -4, -2, 8, 1, 0x1f2229);
    // Marcas pista
    for (let i = -3; i < 4; i++) {
      const p = iso(i + 0.5, -2.5);
      this.layerBg!.addChild(new Graphics().rect(p.x - 4, p.y - 1, 8, 2).fill({ color: 0xfff6c4, alpha: 0.6 }));
    }
    // Taxiway paralelo
    drawIsoStrip(this.layerBg!, iso, -4, -1, 8, 1, 0x3a3e48);

    // Hangar zone (cubo grande en (-3,1) tamaÃ±o 2Ã—3)
    drawIsoBox(this.layerSprites!, iso, -3, 1, 2, 3, 1.5, 0x6b7280, 0x4a525e, 0x9aa1ad);
    const hzCenterScreen = iso(-2, 2.5);
    const hzLbl = new Text({
      text: "Hangares",
      style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "bold", fill: 0xffffff },
    });
    hzLbl.anchor.set(0.5, 1);
    hzLbl.position.set(hzCenterScreen.x, hzCenterScreen.y - 50);
    this.layerStaticLabels!.addChild(hzLbl);
    // Hit area hangar (rombo aproximado por rect)
    const hzHit = new Graphics().rect(hzCenterScreen.x - 60, hzCenterScreen.y - 60, 120, 80).fill({ color: 0x000000, alpha: 0.001 });
    hzHit.eventMode = "static"; hzHit.cursor = "pointer";
    hzHit.on("pointerdown", () => { if (this.callbacks.onBuildClick) this.callbacks.onBuildClick(); });
    this.layerSprites!.addChild(hzHit);

    // Stands (6 plataformas iso planas en el grid)
    const standCells: Record<string, { gx: number; gy: number; label: string }> = {
      "H1-S1": { gx: 0, gy: 0, label: "351" },
      "H1-S2": { gx: 1, gy: 0, label: "451" },
      "H1-S3": { gx: 2, gy: 0, label: "551" },
      "R1":    { gx: 0, gy: 1, label: "352" },
      "H2-S1": { gx: 1, gy: 1, label: "452" },
    };
    const allStandSlots = [
      { gx: 0, gy: 0, label: "351", sim: "H1-S1" }, { gx: 1, gy: 0, label: "451", sim: "H1-S2" }, { gx: 2, gy: 0, label: "551", sim: "H1-S3" },
      { gx: 0, gy: 1, label: "352", sim: "R1" }, { gx: 1, gy: 1, label: "452", sim: "H2-S1" }, { gx: 2, gy: 1, label: "552", sim: null },
    ];
    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);

    for (const slot of allStandSlots) {
      const active = slot.sim !== null && state.stands.some((s) => s.id === slot.sim);
      const ap = slot.sim ? apByStand.get(slot.sim) : undefined;
      const color = active ? (ap ? 0x4a5266 : 0x3a4256) : 0x2a3142;
      drawIsoTileFill(this.layerSprites!, iso, slot.gx, slot.gy, 1, 1, color, 0x5a6680);
      // Label
      const ctr = iso(slot.gx + 0.5, slot.gy + 0.5);
      const lbl = new Text({
        text: slot.label,
        style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: "bold", fill: active ? 0xffffff : 0x5d6677 },
      });
      lbl.anchor.set(0.5, 0.5);
      lbl.position.set(ctr.x, ctr.y - 6);
      this.layerStaticLabels!.addChild(lbl);
      if (active && ap && !ap.taxiing) {
        // AviÃ³n iso (proyecciÃ³n "ortogrÃ¡fica fake" sobre el tile)
        drawIsoAirplane(this.layerSprites!, ctr.x, ctr.y, 40, airlineColor(ap.airlineId));
      }
    }

    // Oficina (cubo en (3, 2))
    drawIsoBox(this.layerSprites!, iso, 3, 2, 1.4, 1.4, 1, 0xd4a574, 0x8a5e30, 0x8a6e3e);
    const ofCtr = iso(3.7, 2.7);
    const ofLbl = new Text({
      text: "Oficina",
      style: { fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: "bold", fill: 0xffffff },
    });
    ofLbl.anchor.set(0.5, 1);
    ofLbl.position.set(ofCtr.x, ofCtr.y - 35);
    this.layerStaticLabels!.addChild(ofLbl);

    // Mecs ToPlane â†’ punto desplazÃ¡ndose por el grid
    for (const m of state.mechanics) {
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      if (!m.destStandId) continue;
      const dest = standCells[m.destStandId];
      if (!dest) continue;
      const fromG = { x: 3.7, y: 2.7 };
      const toG = { x: dest.gx + 0.5, y: dest.gy + 0.5 };
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const ig = { x: fromG.x + (toG.x - fromG.x) * tForward, y: fromG.y + (toG.y - fromG.y) * tForward };
      const p = iso(ig.x, ig.y);
      this.layerMoving!.addChild(new Graphics().ellipse(p.x, p.y, 4, 2).fill({ color: 0x000000, alpha: 0.4 }));
      this.layerMoving!.addChild(new Graphics().rect(p.x - 6, p.y - 8, 12, 6).fill(m.state === "Returning" ? 0x8b95a8 : 0xc084fc).stroke({ width: 1, color: 0xffffff, alpha: 0.6 }));
    }
    // AviÃ³n taxiing â†’ desplazÃ¡ndose desde pista (gx=-3, gy=-2.5) hacia stand
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const dest = standCells[ap.standId];
      if (!dest) continue;
      const fromG = { x: -2, y: -2.5 };
      const toG = { x: dest.gx + 0.5, y: dest.gy + 0.5 };
      const ig = { x: fromG.x + (toG.x - fromG.x) * ap.taxiProgress, y: fromG.y + (toG.y - fromG.y) * ap.taxiProgress };
      const p = iso(ig.x, ig.y);
      this.layerMoving!.addChild(new Graphics().circle(p.x, p.y, 12).fill({ color: 0x4ade80, alpha: 0.25 }));
      drawIsoAirplane(this.layerMoving!, p.x, p.y, 36, 0x4ade80);
    }

    // HUD
    const hud = new Text({
      text: `ISO Â· Etapa ${state.mroStage} Â· ${state.timeOfDay === "day" ? "â˜€ï¸" : "ðŸŒ™"} Â· t=${state.minute}`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: 0xffffff },
    });
    hud.position.set(12, 10);
    this.layerOverlay!.addChild(hud);
    const skinLbl = new Text({ text: "skin: isodiag", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: 0xc5c5c5 } });
    skinLbl.anchor.set(1, 0); skinLbl.position.set(W - 12, 10);
    this.layerOverlay!.addChild(skinLbl);
  }

  /** CEOFULL Â· Vista expandida tipo AirportCEO: pista grande arriba, terminal central
   *  horizontal con 6 jet bridges saliendo, 6 stands "remote" en la fila sur, hangar zone
   *  separada a la derecha con 3 edificios, edificios operacionales (torre control,
   *  fuel, vehicle parking), oficina mecs en esquina, viales perimetrales amarillos.
   *  Los 5 stands del sim mapean a A1-A5 del terminal (con jet bridge); el resto son
   *  decorativos para dar la sensaciÃ³n de escala AirportCEO real. */
  private renderCEOFull(state: RenderState): void {
    const app = this.app!;
    const W = app.screen.width, H = app.screen.height;
    const skyDay = 0x6b7280, skyNight = 0x1a1f2e;
    const sky = state.timeOfDay === "day" ? skyDay : skyNight;
    app.renderer.background.color = sky;
    [this.layerBg!, this.layerRoad!, this.layerStaticLabels!, this.layerSprites!, this.layerMoving!, this.layerOverlay!].forEach(l => l.removeChildren());

    // Fondo (verde grama exterior)
    this.layerBg!.addChild(new Graphics().rect(0, 0, W, H).fill(state.timeOfDay === "day" ? 0x4a6b3a : 0x1f2e1c));

    // Coords proporcionales (todo cabe en el viewport actual)
    const RWY_Y = H * 0.04, RWY_H = H * 0.05;
    const TWY_Y = RWY_Y + RWY_H + H * 0.01, TWY_H = H * 0.03;
    const APRON_X = W * 0.03;
    const APRON_W = W * 0.94;
    const APRON_Y = TWY_Y + TWY_H + H * 0.005;
    const APRON_H = H - APRON_Y - H * 0.04;

    // Apron principal hormigÃ³n
    this.layerBg!.addChild(new Graphics().rect(APRON_X, APRON_Y, APRON_W, APRON_H).fill(0x515862).stroke({ width: 1, color: 0x2a3142 }));

    // Pista
    this.layerBg!.addChild(new Graphics().rect(APRON_X, RWY_Y, APRON_W, RWY_H).fill(0x2a2e36));
    // Threshold marks
    for (let i = 0; i < 14; i++) {
      const xL = APRON_X + 20 + i * 18;
      const xR = APRON_X + APRON_W - 20 - i * 18 - 8;
      this.layerBg!.addChild(new Graphics().rect(xL, RWY_Y + 4, 8, RWY_H - 8).fill({ color: 0xfafafa, alpha: 0.75 }));
      this.layerBg!.addChild(new Graphics().rect(xR, RWY_Y + 4, 8, RWY_H - 8).fill({ color: 0xfafafa, alpha: 0.75 }));
    }
    const rcl = new Graphics();
    strokeDashed(rcl, APRON_X + 200, RWY_Y + RWY_H / 2, APRON_X + APRON_W - 200, RWY_Y + RWY_H / 2, 24, 14, 2, 0xfafafa, 0.85);
    this.layerBg!.addChild(rcl);
    // Label pista
    const rwyLbl = new Text({ text: "RWY 27L  Â·  2.800 m", style: { fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: "bold", fill: 0xfafafa } });
    rwyLbl.position.set(APRON_X + 6, RWY_Y - 12);
    this.layerStaticLabels!.addChild(rwyLbl);

    // Taxiway A
    this.layerBg!.addChild(new Graphics().rect(APRON_X, TWY_Y, APRON_W, TWY_H).fill(0x4a525e));
    // Centerline amarillo continuo + bordes amarillos finos
    this.layerBg!.addChild(new Graphics().moveTo(APRON_X + 30, TWY_Y + TWY_H / 2).lineTo(APRON_X + APRON_W - 30, TWY_Y + TWY_H / 2).stroke({ width: 1.5, color: 0xfdc640, alpha: 0.85 }));
    this.layerBg!.addChild(new Graphics().rect(APRON_X, TWY_Y, APRON_W, 1.5).fill({ color: 0xfdc640, alpha: 0.7 }));
    this.layerBg!.addChild(new Graphics().rect(APRON_X, TWY_Y + TWY_H - 1.5, APRON_W, 1.5).fill({ color: 0xfdc640, alpha: 0.7 }));
    const twyLbl = new Text({ text: "TWY A", style: { fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: "bold", fill: 0xfdc640 } });
    twyLbl.position.set(APRON_X + 6, TWY_Y + 2);
    this.layerStaticLabels!.addChild(twyLbl);

    // Layout interior del apron
    // Terminal central horizontal â€” rect grande con detalles
    const TERM_X = APRON_X + APRON_W * 0.08;
    const TERM_W = APRON_W * 0.70;
    const TERM_Y = APRON_Y + APRON_H * 0.05;
    const TERM_H = APRON_H * 0.16;

    // Apron norte (callecitas/taxiway entre terminal y stands fila A)
    const NTWY_Y = TERM_Y + TERM_H + 4;
    const NTWY_H = 18;
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, NTWY_Y, APRON_W - 12, NTWY_H).fill(0x4a525e));
    this.layerBg!.addChild(new Graphics().moveTo(APRON_X + 30, NTWY_Y + NTWY_H / 2).lineTo(APRON_X + APRON_W - 30, NTWY_Y + NTWY_H / 2).stroke({ width: 1.2, color: 0xfdc640, alpha: 0.7 }));
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, NTWY_Y, APRON_W - 12, 1).fill({ color: 0xfdc640, alpha: 0.7 }));
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, NTWY_Y + NTWY_H - 1, APRON_W - 12, 1).fill({ color: 0xfdc640, alpha: 0.7 }));

    // Fila stands A (con jet bridges) â€” 6 stands debajo del NTWY
    const ROW_A_Y = NTWY_Y + NTWY_H + 6;
    const ROW_A_H = APRON_H * 0.18;
    const NSTANDS = 6;
    const stand_w = (TERM_W - 10 * (NSTANDS - 1)) / NSTANDS;
    const standsA: Array<{ x: number; y: number; w: number; h: number; centerX: number; centerY: number; label: string; simId: string | null }> = [];
    // Mapping: A1=H1-S1, A2=H1-S2, A3=H1-S3, A4=R1, A5=H2-S1, A6=null (gate futuro)
    const A_SIM = ["H1-S1", "H1-S2", "H1-S3", "R1", "H2-S1", null];
    for (let i = 0; i < NSTANDS; i++) {
      const sx = TERM_X + i * (stand_w + 10);
      const sy = ROW_A_Y;
      standsA.push({
        x: sx, y: sy, w: stand_w, h: ROW_A_H,
        centerX: sx + stand_w / 2, centerY: sy + ROW_A_H / 2,
        label: `A${i + 1}`, simId: A_SIM[i],
      });
    }

    // Conector taxiway â†’ NTWY (3 cortos verticales arriba del NTWY, alineados con grupos)
    for (let i = 0; i < 4; i++) {
      const cx = APRON_X + APRON_W * (0.15 + i * 0.22);
      this.layerBg!.addChild(new Graphics().rect(cx - 9, TWY_Y + TWY_H, 18, NTWY_Y - (TWY_Y + TWY_H) + TERM_H + 10).fill(0x4a525e));
    }

    // Terminal grande (encima del NTWY)
    // Cuerpo + textura tipo edificio terminal
    this.layerSprites!.addChild(new Graphics().rect(TERM_X - 6, TERM_Y - 4, TERM_W + 12, TERM_H + 8).fill({ color: 0x000000, alpha: 0.3 })); // sombra
    this.layerSprites!.addChild(new Graphics().rect(TERM_X, TERM_Y, TERM_W, TERM_H).fill(0xbfc7d0).stroke({ width: 1.5, color: 0x2a3142 }));
    // LÃ­neas tÃ©cnicas (filas de ventanas en el terminal)
    const winRowH = TERM_H * 0.25;
    for (let r = 0; r < 3; r++) {
      const wy = TERM_Y + 6 + r * (winRowH + 2);
      for (let x = TERM_X + 8; x < TERM_X + TERM_W - 8; x += 18) {
        this.layerSprites!.addChild(new Graphics().rect(x, wy, 14, winRowH - 2).fill(state.timeOfDay === "night" ? 0xfde047 : 0x3a4d6a));
      }
    }
    // Tejado superior (banda mÃ¡s oscura)
    this.layerSprites!.addChild(new Graphics().rect(TERM_X, TERM_Y, TERM_W, 4).fill(0x6e7480));
    // Antenas / torres de control (3 protuberancias arriba del terminal)
    for (let i = 0; i < 3; i++) {
      const ax = TERM_X + TERM_W * (0.2 + i * 0.3);
      this.layerSprites!.addChild(new Graphics().rect(ax - 2, TERM_Y - 8, 4, 8).fill(0x6e7480));
      this.layerSprites!.addChild(new Graphics().circle(ax, TERM_Y - 10, 2).fill(0xff6b6b));
    }
    // Label terminal
    const termLbl = new Text({ text: "TERMINAL Â· Pasajeros (exterior)", style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "bold", fill: 0xfafafa } });
    termLbl.anchor.set(0.5, 0.5);
    termLbl.position.set(TERM_X + TERM_W / 2, TERM_Y + TERM_H / 2);
    this.layerStaticLabels!.addChild(termLbl);

    // Jet bridges (6 saliendo desde el terminal hacia abajo y conectando a cada stand A)
    for (let i = 0; i < NSTANDS; i++) {
      const s = standsA[i];
      // Bridge desde la mitad del terminal hacia el stand
      const bridgeStartX = s.centerX;
      const bridgeStartY = TERM_Y + TERM_H;
      const bridgeEndY = s.y - 2;
      this.layerSprites!.addChild(new Graphics().rect(bridgeStartX - 4, bridgeStartY, 8, bridgeEndY - bridgeStartY).fill(0x9098a8).stroke({ width: 0.5, color: 0x2a3142 }));
      // Cabezal en el stand (conector triangular)
      this.layerSprites!.addChild(new Graphics().rect(bridgeStartX - 8, bridgeEndY - 4, 16, 6).fill(0x9098a8).stroke({ width: 0.5, color: 0x2a3142 }));
    }

    // Calle aux central (horizontal entre fila A y fila B)
    const CALLE_AUX_Y = ROW_A_Y + ROW_A_H + 12;
    const CALLE_AUX_H = 22;
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, CALLE_AUX_Y, APRON_W - 12, CALLE_AUX_H).fill(0x52576a));
    const auxCl = new Graphics();
    strokeDashed(auxCl, APRON_X + 12, CALLE_AUX_Y + CALLE_AUX_H / 2, APRON_X + APRON_W - 12, CALLE_AUX_Y + CALLE_AUX_H / 2, 10, 8, 1.5, 0xfafafa, 0.8);
    this.layerBg!.addChild(auxCl);
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, CALLE_AUX_Y, APRON_W - 12, 1.2).fill({ color: 0xfdc640, alpha: 0.7 }));
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, CALLE_AUX_Y + CALLE_AUX_H - 1.2, APRON_W - 12, 1.2).fill({ color: 0xfdc640, alpha: 0.7 }));

    // Fila stands B (remote sin jet bridge) â€” 6 stands mÃ¡s pequeÃ±os
    const ROW_B_Y = CALLE_AUX_Y + CALLE_AUX_H + 6;
    const ROW_B_H = APRON_H * 0.15;
    const NREMOTE = 6;
    const remoteW = (TERM_W - 8 * (NREMOTE - 1)) / NREMOTE;
    const standsB: Array<{ x: number; y: number; w: number; h: number; centerX: number; centerY: number; label: string }> = [];
    for (let i = 0; i < NREMOTE; i++) {
      const sx = TERM_X + i * (remoteW + 8);
      standsB.push({
        x: sx, y: ROW_B_Y, w: remoteW, h: ROW_B_H,
        centerX: sx + remoteW / 2, centerY: ROW_B_Y + ROW_B_H / 2,
        label: `B${i + 1}`,
      });
    }

    // Perimetral inferior horizontal
    const PERIM_Y = ROW_B_Y + ROW_B_H + 4;
    const PERIM_H = 18;
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, PERIM_Y, APRON_W - 12, PERIM_H).fill(0x52576a));
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, PERIM_Y, APRON_W - 12, 1.2).fill({ color: 0xfdc640, alpha: 0.7 }));
    this.layerBg!.addChild(new Graphics().rect(APRON_X + 6, PERIM_Y + PERIM_H - 1.2, APRON_W - 12, 1.2).fill({ color: 0xfdc640, alpha: 0.7 }));

    // Hangar zone (derecha del apron, lateral) â€” 3 hangares
    const HZ_X = TERM_X + TERM_W + 14;
    const HZ_Y = TERM_Y;
    const HZ_W = APRON_X + APRON_W - HZ_X - 8;
    const HZ_H = APRON_H * 0.55;
    // Zona dashed alrededor
    this.layerBg!.addChild(new Graphics().rect(HZ_X, HZ_Y, HZ_W, HZ_H).fill({ color: 0x484d54, alpha: 0.5 }));
    const hzDash = new Graphics();
    dashedRect(hzDash, HZ_X, HZ_Y, HZ_W, HZ_H, { dash: 10, gap: 6, width: 1.5, color: 0xfdc640, alpha: 0.7 });
    this.layerBg!.addChild(hzDash);
    // 3 hangares (cuerpo gris + tejado claro + portÃ³n frontal)
    const hangarH = (HZ_H - 18) / 3;
    for (let i = 0; i < 3; i++) {
      const hx = HZ_X + 6;
      const hy = HZ_Y + 6 + i * (hangarH + 2);
      const hw = HZ_W - 12;
      const active = i === 0 || (i === 1 && state.mroStage >= 3) || (i === 2 && state.mroStage >= 4);
      const fillAlpha = active ? 1 : 0.4;
      this.layerSprites!.addChild(new Graphics().rect(hx, hy, hw, hangarH).fill({ color: 0x6b7280, alpha: fillAlpha }).stroke({ width: 1, color: 0x2a3142, alpha: fillAlpha }));
      this.layerSprites!.addChild(new Graphics().rect(hx, hy, hw, hangarH * 0.22).fill({ color: 0x9aa1ad, alpha: fillAlpha }));
      // PortÃ³n frontal (rect oscuro en el lado izquierdo mirando al apron)
      const doorW = 6, doorH = hangarH * 0.5;
      this.layerSprites!.addChild(new Graphics().rect(hx - 1, hy + hangarH / 2 - doorH / 2, doorW, doorH).fill({ color: 0x1f2229, alpha: fillAlpha }));
      // Label
      const lbl = new Text({ text: i === 0 ? "H1" : i === 1 ? "H2 (Stage 3)" : "H3 (Stage 4)", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: "bold", fill: active ? 0xfafafa : 0x9098a8 } });
      lbl.anchor.set(0.5, 0.5);
      lbl.position.set(hx + hw / 2, hy + hangarH / 2);
      this.layerStaticLabels!.addChild(lbl);
    }
    // Hit area click sobre la zona
    const hzHit = new Graphics().rect(HZ_X, HZ_Y, HZ_W, HZ_H).fill({ color: 0x000000, alpha: 0.001 });
    hzHit.eventMode = "static"; hzHit.cursor = "pointer";
    hzHit.on("pointerdown", () => { if (this.callbacks.onBuildClick) this.callbacks.onBuildClick(); });
    this.layerBg!.addChild(hzHit);

    // Edificios operacionales (lado izquierdo del apron â€” fuel station, parking vehÃ­culos, oficina mecs)
    const OPS_X = APRON_X + 6;
    const OPS_Y = HZ_Y;
    const OPS_W = TERM_X - OPS_X - 8;
    const OPS_H = HZ_H;
    // Oficina mecs (arriba)
    const ofW = OPS_W;
    const ofH = OPS_H * 0.35;
    this.layerSprites!.addChild(new Graphics().rect(OPS_X + 2, OPS_Y + 4, ofW, ofH).fill({ color: 0x000000, alpha: 0.3 }));
    this.layerSprites!.addChild(new Graphics().rect(OPS_X, OPS_Y, ofW, ofH).fill(0xd4a574).stroke({ width: 1.2, color: 0x5e3818 }));
    // Tejado claro
    this.layerSprites!.addChild(new Graphics().rect(OPS_X, OPS_Y, ofW, 4).fill(0xe8c697));
    // Ventanas en grid
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const wx = OPS_X + 4 + c * ((ofW - 8) / 4);
        const wy = OPS_Y + 8 + r * (ofH * 0.4);
        const winW = (ofW - 12) / 4 - 2;
        const winH = ofH * 0.3;
        this.layerSprites!.addChild(new Graphics().rect(wx, wy, winW, winH).fill(state.timeOfDay === "night" ? 0xffd96b : 0x86c5e8).stroke({ width: 0.6, color: 0x5e3818 }));
      }
    }
    const ofLbl = new Text({ text: "Oficina mecs", style: { fontFamily: "Inter, sans-serif", fontSize: 9, fontWeight: "bold", fill: 0xfafafa } });
    ofLbl.anchor.set(0.5, 1);
    ofLbl.position.set(OPS_X + ofW / 2, OPS_Y - 2);
    this.layerStaticLabels!.addChild(ofLbl);
    const idleC = state.mechanics.filter((m) => m.state === "Idle").length;
    const totC = state.mechanics.filter((m) => m.state !== "OffShift" && m.state !== "Training").length;
    const ofCount = new Text({ text: `${idleC}/${totC}`, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: "bold", fill: 0xfafafa } });
    ofCount.anchor.set(0.5);
    ofCount.position.set(OPS_X + ofW / 2, OPS_Y + ofH / 2);
    this.layerStaticLabels!.addChild(ofCount);

    // Torre control (rect estrecho alto a la izquierda del terminal, entre oficina y terminal sur)
    const TCX = OPS_X + ofW / 2 - 8;
    const TCY = OPS_Y + ofH + 8;
    const TCW = 16, TCH = OPS_H * 0.30;
    this.layerSprites!.addChild(new Graphics().rect(TCX, TCY, TCW, TCH).fill(0xbfc7d0).stroke({ width: 1, color: 0x2a3142 }));
    // Cabina de cristal arriba
    this.layerSprites!.addChild(new Graphics().rect(TCX - 4, TCY - 6, TCW + 8, 8).fill(state.timeOfDay === "night" ? 0xfde047 : 0x3a4d6a).stroke({ width: 1, color: 0x2a3142 }));
    // Antena
    this.layerSprites!.addChild(new Graphics().rect(TCX + TCW / 2 - 0.5, TCY - 18, 1, 12).fill(0x2a3142));
    this.layerSprites!.addChild(new Graphics().circle(TCX + TCW / 2, TCY - 19, 1.5).fill(0xff6b6b));
    const tcLbl = new Text({ text: "ATC", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: "bold", fill: 0xfafafa } });
    tcLbl.anchor.set(0.5);
    tcLbl.position.set(TCX + TCW / 2, TCY + TCH / 2);
    this.layerStaticLabels!.addChild(tcLbl);

    // Fuel station (parking de cisternas) abajo de torre
    const FUEL_X = OPS_X;
    const FUEL_Y = TCY + TCH + 8;
    const FUEL_W = OPS_W;
    const FUEL_H = OPS_H * 0.25;
    this.layerSprites!.addChild(new Graphics().rect(FUEL_X, FUEL_Y, FUEL_W, FUEL_H).fill(0x484d54).stroke({ width: 1, color: 0x2a3142 }));
    // 3 cisternas (rect amarillo pequeÃ±os)
    for (let i = 0; i < 3; i++) {
      const tx = FUEL_X + 4 + i * ((FUEL_W - 12) / 3);
      const tw = (FUEL_W - 16) / 3;
      this.layerSprites!.addChild(new Graphics().rect(tx, FUEL_Y + 4, tw, FUEL_H - 8).fill(0xfdc640).stroke({ width: 0.5, color: 0x000000 }));
    }
    const fuelLbl = new Text({ text: "FUEL", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 8, fontWeight: "bold", fill: 0x2a3142 } });
    fuelLbl.anchor.set(0.5);
    fuelLbl.position.set(FUEL_X + FUEL_W / 2, FUEL_Y + FUEL_H / 2);
    this.layerStaticLabels!.addChild(fuelLbl);

    // Drawing stands fila A (con marcas amarillas + aviÃ³n si hay)
    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);

    for (const s of standsA) {
      // Cell con borde amarillo punteado
      this.layerSprites!.addChild(new Graphics().rect(s.x, s.y, s.w, s.h).fill(0x484d54).stroke({ width: 1, color: 0x2a3142 }));
      const cb = new Graphics();
      strokeDashed(cb, s.x, s.y, s.x + s.w, s.y, 6, 3, 1, 0xfdc640, 0.9);
      strokeDashed(cb, s.x + s.w, s.y, s.x + s.w, s.y + s.h, 6, 3, 1, 0xfdc640, 0.9);
      strokeDashed(cb, s.x + s.w, s.y + s.h, s.x, s.y + s.h, 6, 3, 1, 0xfdc640, 0.9);
      strokeDashed(cb, s.x, s.y + s.h, s.x, s.y, 6, 3, 1, 0xfdc640, 0.9);
      this.layerSprites!.addChild(cb);
      // Label esquina sup
      const lbl = new Text({ text: s.label, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: "bold", fill: 0xfafafa } });
      lbl.position.set(s.x + 4, s.y + 2);
      this.layerSprites!.addChild(lbl);
      // AviÃ³n si hay
      const ap = s.simId ? apByStand.get(s.simId) : undefined;
      if (ap && !ap.taxiing) {
        const sz = Math.min(s.w, s.h) * 0.6;
        drawAirportCEOAirplane(this.layerSprites!, s.centerX, s.centerY + 4, sz, airlineColor(ap.airlineId), 0);
        const reg = new Text({ text: ap.registration, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 8, fill: 0xfafafa } });
        reg.anchor.set(0.5, 1);
        reg.position.set(s.centerX, s.y + s.h - 2);
        this.layerSprites!.addChild(reg);
      } else if (s.simId === null) {
        const placeholder = new Text({ text: "futuro", style: { fontFamily: "Inter, sans-serif", fontSize: 9, fill: 0x8b95a8 } });
        placeholder.anchor.set(0.5);
        placeholder.position.set(s.centerX, s.centerY + 4);
        this.layerSprites!.addChild(placeholder);
      } else if (ap && ap.taxiing) {
        const tx = new Text({ text: "entrandoâ€¦", style: { fontFamily: "Inter, sans-serif", fontSize: 9, fill: 0x9098a8 } });
        tx.anchor.set(0.5); tx.position.set(s.centerX, s.centerY + 4);
        this.layerSprites!.addChild(tx);
      } else {
        const free = new Text({ text: "libre", style: { fontFamily: "Inter, sans-serif", fontSize: 9, fill: 0x9098a8 } });
        free.anchor.set(0.5); free.position.set(s.centerX, s.centerY + 4);
        this.layerSprites!.addChild(free);
      }
    }

    // Stands fila B (decorativos, sin sim)
    for (const s of standsB) {
      this.layerSprites!.addChild(new Graphics().rect(s.x, s.y, s.w, s.h).fill({ color: 0x484d54, alpha: 0.5 }).stroke({ width: 1, color: 0x2a3142, alpha: 0.5 }));
      const lbl = new Text({ text: s.label, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: "bold", fill: 0x9098a8 } });
      lbl.position.set(s.x + 3, s.y + 1);
      this.layerSprites!.addChild(lbl);
      const future = new Text({ text: "remote", style: { fontFamily: "Inter, sans-serif", fontSize: 8, fill: 0x6e7480 } });
      future.anchor.set(0.5);
      future.position.set(s.centerX, s.centerY);
      this.layerSprites!.addChild(future);
    }

    // Aviones taxiing en motion path (taxiway â†’ conector â†’ NTWY â†’ stand A)
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const sA = standsA.find((s) => s.simId === ap.standId);
      if (!sA) continue;
      const path: Pt[] = [
        { x: sA.centerX, y: TWY_Y + TWY_H / 2 },
        { x: sA.centerX, y: NTWY_Y + NTWY_H / 2 },
        { x: sA.centerX, y: sA.centerY },
      ];
      const { pos } = lerpPath(path, ap.taxiProgress);
      const heading = pathHeading(path, ap.taxiProgress);
      this.layerMoving!.addChild(new Graphics().circle(pos.x, pos.y, 14).fill({ color: 0x4ade80, alpha: 0.25 }));
      drawAirportCEOAirplane(this.layerMoving!, pos.x, pos.y, 26, 0x4ade80, heading + Math.PI / 2);
    }

    // Furgos mec (oficina â†’ calle aux â†’ stand)
    const officeCenter: Pt = { x: OPS_X + ofW / 2, y: OPS_Y + ofH / 2 };
    for (const m of state.mechanics) {
      if (!m.destStandId) continue;
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      const sA = standsA.find((s) => s.simId === m.destStandId);
      if (!sA) continue;
      const path: Pt[] = [
        officeCenter,
        { x: OPS_X + ofW / 2, y: PERIM_Y + PERIM_H / 2 },
        { x: sA.centerX, y: PERIM_Y + PERIM_H / 2 },
        { x: sA.centerX, y: CALLE_AUX_Y + CALLE_AUX_H / 2 },
        { x: sA.centerX, y: sA.centerY },
      ];
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const { pos } = lerpPath(path, tForward);
      drawSimAirportVan(this.layerMoving!, pos.x, pos.y, m.state === "Returning");
    }

    // HUD top
    const hud = new Text({
      text: `AIRPORT CEO Â· Etapa ${state.mroStage} Â· ${state.timeOfDay === "day" ? "â˜€ï¸ DÃA" : "ðŸŒ™ NOCHE"} Â· t=${state.minute}`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: "bold", fill: 0xfafafa },
    });
    hud.position.set(12, 10);
    this.layerOverlay!.addChild(hud);
    const skinLbl = new Text({ text: "skin: ceofull Â· 6 gates terminal + 6 remote + 3 hangares + ATC + Fuel", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: 0xb8bfca } });
    skinLbl.anchor.set(1, 0); skinLbl.position.set(W - 12, 10);
    this.layerOverlay!.addChild(skinLbl);

    if (state.runwayClosed) {
      this.layerOverlay!.addChild(new Graphics().rect(0, 0, W, H).fill({ color: 0xff3b3b, alpha: 0.06 }));
      const c = new Text({ text: "ðŸ“¢ PISTA CERRADA", style: { fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "bold", fill: 0xff3b3b } });
      c.anchor.set(0.5, 0); c.position.set(W / 2, 30);
      this.layerOverlay!.addChild(c);
    }
  }

  // ====================================================================
  // === CEOFULL PRO: clone serio de AirportCEO con pan/zoom/minimapa ===
  // ====================================================================

  // World coords constantes (3000Ã—1800). El viewport visible depende del zoom.
  private static readonly WORLD_W = 3000;
  private static readonly WORLD_H = 1800;

  // Layout coords en world space (sin escala). Calculadas una vez.
  private get ceoLayout() {
    const W = PixiDriver.WORLD_W, H = PixiDriver.WORLD_H;
    const APRON_X = 80;
    const APRON_W = W - 160;
    const RWY_Y = 50, RWY_H = 90;
    const TWY_Y = 165, TWY_H = 50;
    const APRON_Y = 240;
    const APRON_H = H - APRON_Y - 80;
    const TERM_X = APRON_X + APRON_W * 0.08;
    const TERM_W = APRON_W * 0.66;
    const TERM_Y = APRON_Y + 30;
    const TERM_H = APRON_H * 0.20;
    const NTWY_Y = TERM_Y + TERM_H + 10;
    const NTWY_H = 50;
    const ROW_A_Y = NTWY_Y + NTWY_H + 8;
    const ROW_A_H = 240;
    const CALLE_AUX_Y = ROW_A_Y + ROW_A_H + 16;
    const CALLE_AUX_H = 60;
    const ROW_B_Y = CALLE_AUX_Y + CALLE_AUX_H + 8;
    const ROW_B_H = 200;
    const PERIM_Y = ROW_B_Y + ROW_B_H + 8;
    const PERIM_H = 50;
    const HZ_X = TERM_X + TERM_W + 30;
    const HZ_Y = TERM_Y;
    const HZ_W = APRON_X + APRON_W - HZ_X - 20;
    const HZ_H = APRON_H * 0.55;
    const OPS_X = APRON_X + 20;
    const OPS_Y = HZ_Y;
    const OPS_W = TERM_X - OPS_X - 24;
    const OPS_H = HZ_H;
    const NSTANDS = 6;
    const standAw = (TERM_W - 18 * (NSTANDS - 1)) / NSTANDS;
    const standsA = Array.from({ length: NSTANDS }, (_, i) => {
      const x = TERM_X + i * (standAw + 18);
      const simIds = ["H1-S1", "H1-S2", "H1-S3", "R1", "H2-S1", null];
      return {
        x, y: ROW_A_Y, w: standAw, h: ROW_A_H,
        centerX: x + standAw / 2, centerY: ROW_A_Y + ROW_A_H / 2,
        label: `A${i + 1}`, simId: simIds[i],
      };
    });
    const NREMOTE = 6;
    const standBw = (TERM_W - 14 * (NREMOTE - 1)) / NREMOTE;
    const standsB = Array.from({ length: NREMOTE }, (_, i) => {
      const x = TERM_X + i * (standBw + 14);
      return {
        x, y: ROW_B_Y, w: standBw, h: ROW_B_H,
        centerX: x + standBw / 2, centerY: ROW_B_Y + ROW_B_H / 2,
        label: `B${i + 1}`,
      };
    });
    return {
      APRON_X, APRON_Y, APRON_W, APRON_H,
      RWY_Y, RWY_H, TWY_Y, TWY_H,
      TERM_X, TERM_Y, TERM_W, TERM_H,
      NTWY_Y, NTWY_H,
      ROW_A_Y, ROW_A_H, CALLE_AUX_Y, CALLE_AUX_H,
      ROW_B_Y, ROW_B_H, PERIM_Y, PERIM_H,
      HZ_X, HZ_Y, HZ_W, HZ_H,
      OPS_X, OPS_Y, OPS_W, OPS_H,
      standsA, standsB,
    };
  }

  /** Centra la cÃ¡mara y ajusta zoom para mostrar todo el world inicialmente. */
  private initCeoCamera(): void {
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    // Zoom para que todo el world quepa, con margen
    const fitX = W / PixiDriver.WORLD_W;
    const fitY = H / PixiDriver.WORLD_H;
    this.camera.zoom = Math.max(0.25, Math.min(fitX, fitY) * 0.98);
    // Centrar
    this.camera.x = (W / this.camera.zoom - PixiDriver.WORLD_W) / 2;
    this.camera.y = (H / this.camera.zoom - PixiDriver.WORLD_H) / 2;
    this.cameraInitialized = true;
    this.applyCamera();
  }

  private renderCEOFullPro(state: RenderState): void {
    if (!this.app) return;
    const sky = state.timeOfDay === "day" ? 0x6b7c8f : 0x0a1428;
    this.app.renderer.background.color = sky;
    if (!this.cameraInitialized) this.initCeoCamera();

    // Skin "ceopng" requiere texturas PNG cargadas.
    if (this.theme === "ceopng" && !this.assetsLoaded && !this.assetsLoading) {
      this.assetsLoading = true;
      loadAssets().then(() => {
        this.assetsLoaded = true;
        this.assetsLoading = false;
        this.staticCacheKey = null;
        if (this.lastState && (this.theme === "ceopng" || this.theme === "ceofull")) {
          this.renderCEOFullPro(this.lastState);
        }
      }).catch((e) => {
        this.assetsLoading = false;
        console.error("[ceopng] loadAssets error", e);
      });
    }

    // PERF: cache estatica para evitar redibujar terminal + hangares + pavimento cada tick.
    const key = `${this.theme}:${state.mroStage}:${state.timeOfDay}:${this.assetsLoaded}`;
    if (this.staticCacheKey !== key) {
      [this.layerBg!, this.layerRoad!, this.layerStaticLabels!, this.layerSprites!, this.layerMoving!, this.layerOverlay!].forEach(l => l.removeChildren());
      this.drawCEOStatic(state);
      this.staticCacheKey = key;
    }
    this.drawCEODynamic(state);
    this.drawCEOHUD(state);
    this.drawCEOMinimap(state);
  }

  private drawCEOStatic(state: RenderState): void {
    const root = this.worldStaticCache!;
    root.removeChildren();
    const L = this.ceoLayout;
    const night = state.timeOfDay === "night";

    // â”€â”€ Hierba exterior (world entero) con textura â”€â”€
    const grassColor = night ? 0x1f2e1c : 0x4a6b3a;
    root.addChild(new Graphics().rect(0, 0, PixiDriver.WORLD_W, PixiDriver.WORLD_H).fill(grassColor));
    drawGrassNoise(root, 0, 0, PixiDriver.WORLD_W, PixiDriver.WORLD_H, grassColor);

    // â”€â”€ Pista RWY 27L con detalle â”€â”€
    drawCEORunway(root, L.APRON_X, L.RWY_Y, L.APRON_W, L.RWY_H, night);

    // â”€â”€ Taxiway A con bordes amarillos + centerline â”€â”€
    drawCEOTaxiway(root, L.APRON_X, L.TWY_Y, L.APRON_W, L.TWY_H, "TWY A", night);

    // â”€â”€ Conectores taxiway â†’ apron (4 verticales) â”€â”€
    for (let i = 0; i < 4; i++) {
      const cx = L.APRON_X + L.APRON_W * (0.18 + i * 0.21);
      const wConn = 70;
      drawCEOPavedStrip(root, cx - wConn / 2, L.TWY_Y + L.TWY_H, wConn, L.TERM_Y - (L.TWY_Y + L.TWY_H), false);
      // Centerline amarillo
      root.addChild(new Graphics().rect(cx - 2, L.TWY_Y + L.TWY_H + 8, 4, L.TERM_Y - (L.TWY_Y + L.TWY_H) - 16).fill({ color: 0xfdc640, alpha: 0.7 }));
    }

    // â”€â”€ Apron principal pavimento texturizado â”€â”€
    drawCEOConcretePavement(root, L.APRON_X, L.APRON_Y, L.APRON_W, L.APRON_H);

    // â”€â”€ Terminal multi-nivel con detalle exterior â”€â”€
    drawCEOTerminal(root, L.TERM_X, L.TERM_Y, L.TERM_W, L.TERM_H, night);

    // â”€â”€ Jet bridges (6 desde el terminal hacia cada gate A) â”€â”€
    for (const s of L.standsA) {
      drawCEOJetBridge(root, s.centerX, L.TERM_Y + L.TERM_H, s.y - 8);
    }

    // â”€â”€ NTWY (taxiway norte entre terminal y stands A) â”€â”€
    drawCEOTaxilane(root, L.APRON_X + 20, L.NTWY_Y, L.APRON_W - 40, L.NTWY_H, night);

    // â”€â”€ Stands fila A: marcas amarillas + nÃºmero grande â”€â”€
    for (const s of L.standsA) {
      drawCEOStandMarkings(root, s.x, s.y, s.w, s.h, s.label, s.simId !== null);
    }

    // â”€â”€ Calle aux central â”€â”€
    drawCEOTaxilane(root, L.APRON_X + 20, L.CALLE_AUX_Y, L.APRON_W - 40, L.CALLE_AUX_H, night);

    // â”€â”€ Stands fila B (remote) â”€â”€
    for (const s of L.standsB) {
      drawCEOStandMarkings(root, s.x, s.y, s.w, s.h, s.label, false);
    }

    // â”€â”€ Perimetral inferior â”€â”€
    drawCEOTaxilane(root, L.APRON_X + 20, L.PERIM_Y, L.APRON_W - 40, L.PERIM_H, night);

    // â”€â”€ Hangar zone con 3 hangares + click hit â”€â”€
    drawCEOHangarZone(root, L.HZ_X, L.HZ_Y, L.HZ_W, L.HZ_H, state.mroStage, night);
    const hzHit = new Graphics().rect(L.HZ_X, L.HZ_Y, L.HZ_W, L.HZ_H).fill({ color: 0x000000, alpha: 0.001 });
    hzHit.eventMode = "static"; hzHit.cursor = "pointer";
    hzHit.on("pointerdown", (ev) => {
      ev.stopPropagation();
      if (this.callbacks.onBuildClick) this.callbacks.onBuildClick();
    });
    root.addChild(hzHit);

    // â”€â”€ Edificios operacionales (lateral izq): oficina, ATC, fuel, parking â”€â”€
    const idleC = state.mechanics.filter((m) => m.state === "Idle").length;
    const totC = state.mechanics.filter((m) => m.state !== "OffShift" && m.state !== "Training").length;
    drawCEOOpsBuildings(root, L.OPS_X, L.OPS_Y, L.OPS_W, L.OPS_H, idleC, totC, night);

    // â”€â”€ VegetaciÃ³n perimetral (verde detallado) â”€â”€
    drawCEOVegetation(root, L);
  }

  private drawCEODynamic(state: RenderState): void {
    const root = this.worldDynamic!;
    root.removeChildren();
    const L = this.ceoLayout;
    const usePng = this.theme === "ceopng";

    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);

    // Aviones en gate
    for (const s of L.standsA) {
      const ap = s.simId ? apByStand.get(s.simId) : undefined;
      if (ap && !ap.taxiing) {
        const sz = Math.min(s.w, s.h) * 0.62;
        if (usePng) this.drawCEOBakedJet(root, s.centerX, s.centerY + 10, sz, airlineColor(ap.airlineId), 0);
        else drawCEORealisticAirplane(root, s.centerX, s.centerY + 10, sz, airlineColor(ap.airlineId), 0, state.timeOfDay === "night");
        const reg = new Text({
          text: ap.registration,
          style: { fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: "bold", fill: 0xfafafa },
        });
        reg.anchor.set(0.5, 1);
        reg.position.set(s.centerX, s.y + s.h - 4);
        root.addChild(reg);
      }
    }

    // Aviones taxiing
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const sA = L.standsA.find((s) => s.simId === ap.standId);
      if (!sA) continue;
      const path: Pt[] = [
        { x: sA.centerX - 200, y: L.RWY_Y + L.RWY_H / 2 },
        { x: sA.centerX, y: L.RWY_Y + L.RWY_H / 2 },
        { x: sA.centerX, y: L.TWY_Y + L.TWY_H / 2 },
        { x: sA.centerX, y: L.NTWY_Y + L.NTWY_H / 2 },
        { x: sA.centerX, y: sA.centerY },
      ];
      const { pos } = lerpPath(path, ap.taxiProgress);
      const heading = pathHeading(path, ap.taxiProgress);
      root.addChild(new Graphics().circle(pos.x, pos.y, 50).fill({ color: 0x4ade80, alpha: 0.18 }));
      if (usePng) this.drawCEOBakedJet(root, pos.x, pos.y, 80, 0x4ade80, heading + Math.PI / 2);
      else drawCEORealisticAirplane(root, pos.x, pos.y, 80, 0x4ade80, heading + Math.PI / 2, state.timeOfDay === "night");
    }

    // Furgos mec
    const officeCenterX = L.OPS_X + L.OPS_W / 2;
    const officeCenterY = L.OPS_Y + L.OPS_H * 0.18;
    for (const m of state.mechanics) {
      if (!m.destStandId) continue;
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      const sA = L.standsA.find((s) => s.simId === m.destStandId);
      if (!sA) continue;
      const path: Pt[] = [
        { x: officeCenterX, y: officeCenterY },
        { x: officeCenterX, y: L.PERIM_Y + L.PERIM_H / 2 },
        { x: sA.centerX, y: L.PERIM_Y + L.PERIM_H / 2 },
        { x: sA.centerX, y: L.CALLE_AUX_Y + L.CALLE_AUX_H / 2 },
        { x: sA.centerX, y: sA.centerY },
      ];
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const { pos } = lerpPath(path, tForward);
      const heading = pathHeading(path, tForward);
      // Si ceopng + textura van disponible, usar Sprite PNG; sino vector
      const vanTex = usePng ? getTexture("vehicles", "van_mech") : null;
      if (vanTex) {
        const sp = new Sprite(vanTex);
        sp.anchor.set(0.5);
        sp.position.set(pos.x, pos.y);
        sp.rotation = heading + Math.PI / 2;
        // Tint si es Returning (grisÃ¡ceo)
        if (m.state === "Returning") sp.tint = 0x8b95a8;
        // Escalar a tamaÃ±o aproximado del furgo vector (26Ã—14)
        const targetW = 30;
        sp.scale.set(targetW / sp.texture.width);
        root.addChild(sp);
      } else {
        drawCEOVan(root, pos.x, pos.y, heading, m.state === "Returning");
      }
    }
  }

  /** Dibuja un aviÃ³n usando el sprite baked Kenney-style. Lo bake'a la primera vez
   *  por color de aerolÃ­nea y luego reutiliza la Texture en cache. */
  private drawCEOBakedJet(parent: Container, cx: number, cy: number, size: number, liveryColor: number, rotation: number): void {
    if (!this.app) return;
    const tex = bakeJetSprite(this.app, liveryColor);
    const sp = new Sprite(tex);
    sp.anchor.set(0.5);
    sp.position.set(cx, cy);
    sp.rotation = rotation;
    // Escalar a `size` (size = ancho aprox que ocupa)
    sp.scale.set(size / sp.texture.height);
    parent.addChild(sp);
  }

  private drawCEOHUD(state: RenderState): void {
    const root = this.worldHUD!;
    root.removeChildren();
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    // Top HUD bar
    root.addChild(new Graphics().rect(0, 0, W, 32).fill({ color: 0x000000, alpha: 0.55 }));
    const txt = new Text({
      text: `MRO INTERNATIONAL Â· Etapa ${state.mroStage}/4 Â· ${state.timeOfDay === "day" ? "â˜€ï¸ DÃA" : "ðŸŒ™ NOCHE"} Â· t=${state.minute}`,
      style: { fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "bold", fill: 0xfafafa },
    });
    txt.position.set(12, 8);
    root.addChild(txt);
    const ops = new Text({
      text: `zoom ${this.camera.zoom.toFixed(2)}Ã— Â· drag para pan Â· wheel para zoom`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: 0xb8bfca },
    });
    ops.anchor.set(1, 0);
    ops.position.set(W - 12, 11);
    root.addChild(ops);

    if (state.runwayClosed) {
      root.addChild(new Graphics().rect(0, 32, W, 22).fill({ color: 0xff3b3b, alpha: 0.85 }));
      const c = new Text({ text: "ðŸ“¢ PISTA CERRADA Â· Aviones no podrÃ¡n aterrizar", style: { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "bold", fill: 0xffffff } });
      c.anchor.set(0.5, 0.5); c.position.set(W / 2, 43);
      root.addChild(c);
    }
  }

  private drawCEOMinimap(state: RenderState): void {
    const root = this.worldMinimap!;
    root.removeChildren();
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    const mmW = 220, mmH = 132;
    const mmX = W - mmW - 12;
    const mmY = H - mmH - 12;
    const scaleX = mmW / PixiDriver.WORLD_W;
    const scaleY = mmH / PixiDriver.WORLD_H;
    // Fondo
    root.addChild(new Graphics().rect(mmX, mmY, mmW, mmH).fill({ color: 0x0a1020, alpha: 0.92 }).stroke({ width: 1, color: 0xfdc640 }));
    // Miniaturas de elementos
    const L = this.ceoLayout;
    // Hierba bg
    root.addChild(new Graphics().rect(mmX, mmY, mmW, mmH).fill({ color: 0x2c4423, alpha: 0.4 }));
    // Pista
    root.addChild(new Graphics().rect(mmX + L.APRON_X * scaleX, mmY + L.RWY_Y * scaleY, L.APRON_W * scaleX, L.RWY_H * scaleY).fill(0x2a2e36));
    // Apron
    root.addChild(new Graphics().rect(mmX + L.APRON_X * scaleX, mmY + L.APRON_Y * scaleY, L.APRON_W * scaleX, L.APRON_H * scaleY).fill({ color: 0x515862, alpha: 0.8 }));
    // Terminal
    root.addChild(new Graphics().rect(mmX + L.TERM_X * scaleX, mmY + L.TERM_Y * scaleY, L.TERM_W * scaleX, L.TERM_H * scaleY).fill(0xbfc7d0));
    // Hangar zone
    root.addChild(new Graphics().rect(mmX + L.HZ_X * scaleX, mmY + L.HZ_Y * scaleY, L.HZ_W * scaleX, L.HZ_H * scaleY).fill(0x6b7280));
    // Stands A (puntos)
    for (const s of L.standsA) {
      const apByStand = state.airplanes.find((a) => a.standId === s.simId);
      const c = apByStand && !apByStand.taxiing ? 0x4da3ff : 0x8b95a8;
      root.addChild(new Graphics().rect(mmX + s.x * scaleX, mmY + s.y * scaleY, s.w * scaleX, s.h * scaleY).fill({ color: c, alpha: 0.85 }));
    }
    // Stands B
    for (const s of L.standsB) {
      root.addChild(new Graphics().rect(mmX + s.x * scaleX, mmY + s.y * scaleY, s.w * scaleX, s.h * scaleY).fill({ color: 0x6b7280, alpha: 0.6 }));
    }
    // Viewport rectangle (lo que el usuario ve)
    const vpX = -this.camera.x;
    const vpY = -this.camera.y;
    const vpW = W / this.camera.zoom;
    const vpH = H / this.camera.zoom;
    root.addChild(
      new Graphics().rect(mmX + vpX * scaleX, mmY + vpY * scaleY, vpW * scaleX, vpH * scaleY).stroke({ width: 2, color: 0xfde047, alpha: 0.95 }),
    );
    // Label
    const lbl = new Text({ text: "MAPA", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: "bold", fill: 0xfde047 } });
    lbl.position.set(mmX + 4, mmY + 2);
    root.addChild(lbl);
  }

  // ====================================================================
  // === HUGE: aeropuerto enorme estilo Bus Manager (azul tÃ©cnico) =====
  // ====================================================================

  private initHugeCamera(): void {
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    const fitX = W / PixiDriver.HUGE_WORLD_W;
    const fitY = H / PixiDriver.HUGE_WORLD_H;
    this.camera.zoom = Math.max(0.02, Math.min(fitX, fitY) * 0.96);
    this.camera.x = (W / this.camera.zoom - PixiDriver.HUGE_WORLD_W) / 2;
    this.camera.y = (H / this.camera.zoom - PixiDriver.HUGE_WORLD_H) / 2;
    this.cameraInitialized = true;
    this.applyCamera();
  }

  // ====================================================================
  // === F5D · OSM real OVD/LEAS + paleta CIC north-star ===============
  // ====================================================================
  // Datos OSM cargados desde src/assets/airports/ovd.paths.json (ODbL).
  // Proyección equirectangular pre-normalizada a [0..1] en el convertidor.
  // El renderer escala al viewport actual preservando aspect ratio del bbox.

  /** Mapping sim stand id → ref OSM parking_position. */
  private static readonly F5D_STAND_MAP: Record<string, string> = {
    "H1-S1": "01", "H1-S2": "02", "H1-S3": "03", "R1": "04", "H2-S1": "05",
  };

  /** Rect dibujable en world coords F5D (fijo, no depende del viewport). El world tiene
   *  aspect 1.25 ≈ aspect OVD (1.251). Margen interior para que la pista no toque borde. */
  private f5dArea(): { x: number; y: number; w: number; h: number } {
    const padX = 400, padY = 400;
    return {
      x: padX, y: padY,
      w: PixiDriver.F5D_WORLD_W - padX * 2,
      h: PixiDriver.F5D_WORLD_H - padY * 2,
    };
  }

  /** Inicializa cámara F5D: zoom fit-all + centrado. */
  private initF5DCamera(): void {
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    const fitX = W / PixiDriver.F5D_WORLD_W;
    const fitY = H / PixiDriver.F5D_WORLD_H;
    this.camera.zoom = Math.max(0.15, Math.min(fitX, fitY) * 0.98);
    this.camera.x = (W / this.camera.zoom - PixiDriver.F5D_WORLD_W) / 2;
    this.camera.y = (H / this.camera.zoom - PixiDriver.F5D_WORLD_H) / 2;
    this.cameraInitialized = true;
    this.applyCamera();
  }

  private f5dProject(p: number[], area: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
    return { x: area.x + p[0] * area.w, y: area.y + p[1] * area.h };
  }

  /** Construye un Pixi path desde un array de coords normalizadas. */
  private f5dDrawPath(g: Graphics, coords: number[][], area: { x: number; y: number; w: number; h: number }, closed: boolean): void {
    if (coords.length === 0) return;
    const p0 = this.f5dProject(coords[0], area);
    g.moveTo(p0.x, p0.y);
    for (let i = 1; i < coords.length; i++) {
      const p = this.f5dProject(coords[i], area);
      g.lineTo(p.x, p.y);
    }
    if (closed) g.closePath();
  }

  private renderF5DScaffold(state: RenderState): void {
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    // P-δ: día/noche modula el fondo (mismo lenguaje, sólo tono base)
    const isNight = state.timeOfDay === "night";
    const bgColor = isNight ? 0x06101e : 0x0e1a30;
    this.app.renderer.background.color = bgColor;
    // Pulso temporal para stands activos (sin necesidad de event check_completed)
    const pulseT = (Math.sin(state.minute * 0.35) + 1) / 2; // 0..1
    // Inicializa cámara F5D la primera vez (fit-all + centrado)
    if (!this.cameraInitialized) this.initF5DCamera();
    // Limpieza dinámica + HUD/minimap siempre; estática solo si cambia cache key
    this.worldDynamic!.removeChildren();
    this.worldHUD!.removeChildren();
    this.worldMinimap!.removeChildren();
    [this.layerBg!, this.layerRoad!, this.layerStaticLabels!, this.layerSprites!, this.layerMoving!].forEach(l => l.removeChildren());
    this.layerOverlay!.removeChildren();

    // P-β MVP: redibujar static cada tick (sin cache). Aceptable porque hay pocos
    // elementos. Si hay tirones en runtime, separar static (apron/runway/etc) de
    // dynamic (stands activos overlay) y aplicar cache key.
    this.worldStaticCache!.removeChildren();

    const FW = PixiDriver.F5D_WORLD_W, FH = PixiDriver.F5D_WORLD_H;

    // ── Fondo navy + grid sutil (en world coords) ──
    this.worldStaticCache!.addChild(new Graphics().rect(0, 0, FW, FH).fill(bgColor));
    const grid = new Graphics();
    for (let y = 240; y < FH; y += 240) grid.moveTo(0, y).lineTo(FW, y);
    for (let x = 320; x < FW; x += 320) grid.moveTo(x, 0).lineTo(x, FH);
    grid.stroke({ width: 2, color: 0x142543, alpha: 0.55 });
    this.worldStaticCache!.addChild(grid);

    const area = this.f5dArea();
    const P = ovdPaths.paths;

    // ── Aerodrome boundary (perímetro tenue) ──
    for (const w of P.aerodrome) {
      const g = new Graphics();
      this.f5dDrawPath(g, w.coords, area, true);
      g.stroke({ width: 0.6, color: 0x1c2d4a, alpha: 0.45 });
      this.worldStaticCache!.addChild(g);
    }

    // ── Apron polígono (fondo del area de operaciones) ──
    for (const w of P.apron) {
      const g = new Graphics();
      this.f5dDrawPath(g, w.coords, area, true);
      g.fill({ color: 0x0d1c33, alpha: 1 }).stroke({ width: 0.5, color: 0x1c2d4a });
      this.worldStaticCache!.addChild(g);
    }

    // ── Runway 11/29 — banda gruesa cyan + highlight central + threshold marks ──
    for (const w of P.runways) {
      // Base stroke ancho
      const base = new Graphics();
      this.f5dDrawPath(base, w.coords, area, false);
      base.stroke({ width: 9, color: 0x3aa9ff, alpha: 0.45, cap: "butt" });
      this.worldStaticCache!.addChild(base);
      // Highlight central
      const hl = new Graphics();
      this.f5dDrawPath(hl, w.coords, area, false);
      hl.stroke({ width: 2, color: 0xa8dafc, cap: "butt" });
      this.worldStaticCache!.addChild(hl);
      // Centerline dashes (oscuras sobre el highlight)
      if (w.coords.length >= 2) {
        const p0 = this.f5dProject(w.coords[0], area);
        const pN = this.f5dProject(w.coords[w.coords.length - 1], area);
        const cl = new Graphics();
        strokeDashed(cl, p0.x + 30, p0.y, pN.x - 30, pN.y, 14, 14, 0.6, 0x0a1428, 1);
        this.worldStaticCache!.addChild(cl);
      }
      // Threshold marks (segmentos cortos cyan claros en cabeceras)
      if (w.coords.length >= 2) {
        const p0 = this.f5dProject(w.coords[0], area);
        const pN = this.f5dProject(w.coords[w.coords.length - 1], area);
        const dx = pN.x - p0.x, dy = pN.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        const thrG = new Graphics();
        for (const [base, sign] of [[p0, 1], [pN, -1]] as Array<[{ x: number; y: number }, number]>) {
          for (let k = 0; k < 3; k++) {
            const cx = base.x + ux * sign * (10 + k * 6);
            const cy = base.y + uy * sign * (10 + k * 6);
            thrG.moveTo(cx + px * 4, cy + py * 4).lineTo(cx - px * 4, cy - py * 4);
          }
        }
        thrG.stroke({ width: 2.5, color: 0xa8dafc });
        this.worldStaticCache!.addChild(thrG);
      }
      // Labels cabecera 11 (start) y 29 (end)
      if (w.coords.length >= 2) {
        const p0 = this.f5dProject(w.coords[0], area);
        const pN = this.f5dProject(w.coords[w.coords.length - 1], area);
        const isP0Left = p0.x < pN.x;
        const lbl11 = new Text({ text: "11", style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", fill: 0x5da0e0 } });
        lbl11.position.set((isP0Left ? p0.x : pN.x) + 6, (isP0Left ? p0.y : pN.y) + 16);
        this.worldStaticCache!.addChild(lbl11);
        const lbl29 = new Text({ text: "29", style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", fill: 0x5da0e0 } });
        lbl29.position.set((isP0Left ? pN.x : p0.x) - 18, (isP0Left ? pN.y : p0.y) + 16);
        this.worldStaticCache!.addChild(lbl29);
        // Label centro pista
        const mid = new Text({ text: `RWY ${w.ref || "11/29"} · 2200m`, style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", fill: 0x5da0e0 } });
        mid.anchor.set(0.5, 1);
        mid.position.set((p0.x + pN.x) / 2, (p0.y + pN.y) / 2 - 16);
        this.worldStaticCache!.addChild(mid);
      }
    }

    // ── Taxiways (líneas dashed cyan finas) ──
    for (const w of P.taxiways) {
      if (w.coords.length < 2) continue;
      const g = new Graphics();
      for (let i = 0; i < w.coords.length - 1; i++) {
        const a = this.f5dProject(w.coords[i], area);
        const b = this.f5dProject(w.coords[i + 1], area);
        strokeDashed(g, a.x, a.y, b.x, b.y, 3, 5, 1, 0x3aa9ff, 0.55);
      }
      this.worldStaticCache!.addChild(g);
    }

    // ── Buildings genéricos (fill dark) ──
    for (const w of P.buildings) {
      const g = new Graphics();
      this.f5dDrawPath(g, w.coords, area, true);
      g.fill({ color: 0x13243f, alpha: 0.85 }).stroke({ width: 0.5, color: 0x2c4870 });
      this.worldStaticCache!.addChild(g);
    }

    // ── Terminal (destacado) ──
    for (const w of P.terminal) {
      const g = new Graphics();
      this.f5dDrawPath(g, w.coords, area, true);
      g.fill({ color: 0x13243f, alpha: 1 }).stroke({ width: 0.8, color: 0x2c4870 });
      this.worldStaticCache!.addChild(g);
      // Label "Terminal" en el centroide
      let cx = 0, cy = 0;
      for (const c of w.coords) { const p = this.f5dProject(c, area); cx += p.x; cy += p.y; }
      cx /= w.coords.length; cy /= w.coords.length;
      const lbl = new Text({ text: "Terminal", style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", fill: 0x5da0e0 } });
      lbl.anchor.set(0.5); lbl.position.set(cx, cy);
      this.worldStaticCache!.addChild(lbl);
    }

    // ── Tower(s) ──
    for (const w of P.tower) {
      const g = new Graphics();
      this.f5dDrawPath(g, w.coords, area, true);
      g.fill({ color: 0x13243f, alpha: 1 }).stroke({ width: 0.6, color: 0x2c4870 });
      this.worldStaticCache!.addChild(g);
    }

    // ── Parking positions (stands) ──
    // Cada parking_position es un way con 2-3 puntos: el último es la posición del avión.
    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);

    // Index parking refs por código (01-09 + 08A)
    const standPositions = new Map<string, { x: number; y: number; coords: { x: number; y: number }[] }>();
    for (const pp of P.parkingPositions) {
      if (!pp.ref || pp.coords.length === 0) continue;
      const projected = pp.coords.map((c) => this.f5dProject(c, area));
      const tip = projected[projected.length - 1];
      standPositions.set(pp.ref, { x: tip.x, y: tip.y, coords: projected });
    }

    // Render cada parking position con marca
    for (const [ref, pos] of standPositions) {
      // Mapping sim a OSM ref
      const simId = Object.entries(PixiDriver.F5D_STAND_MAP).find(([_k, v]) => v === ref)?.[0];
      const ap = simId ? apByStand.get(simId) : undefined;
      const active = ap !== undefined;
      // Marca stand
      const g = new Graphics();
      // Línea guía (entrada del taxiway hacia la posición)
      if (pos.coords.length >= 2) {
        g.moveTo(pos.coords[0].x, pos.coords[0].y);
        for (let i = 1; i < pos.coords.length; i++) g.lineTo(pos.coords[i].x, pos.coords[i].y);
        g.stroke({ width: 0.6, color: active ? 0xf5b945 : 0x2c4870, alpha: active ? 0.9 : 0.55 });
      }
      // Rect/marca en la punta
      const boxW = 24, boxH = 14;
      const box = new Graphics()
        .rect(pos.x - boxW / 2, pos.y - boxH / 2, boxW, boxH)
        .fill({ color: active ? 0x2a1a08 : 0x0d1c33, alpha: 1 })
        .stroke({ width: 0.6, color: active ? 0xf5b945 : 0x2c4870 });
      this.worldStaticCache!.addChild(g);
      this.worldStaticCache!.addChild(box);
      if (active) {
        // P-δ: bloom doble + pulso temporal en stands activos (vida visual)
        const haloR = 7 + pulseT * 3;
        const haloA = 0.18 + pulseT * 0.12;
        // Bloom externo (radio amplio, alpha bajo)
        this.worldStaticCache!.addChild(new Graphics().circle(pos.x, pos.y, haloR + 8).fill({ color: 0xf5b945, alpha: 0.06 }));
        // Halo principal
        this.worldStaticCache!.addChild(new Graphics().circle(pos.x, pos.y, haloR).fill({ color: 0xf5b945, alpha: haloA }));
        // Dot core
        this.worldStaticCache!.addChild(new Graphics().circle(pos.x, pos.y, 2.5).fill(0xf5b945));
      }
      // Label ref
      const refLbl = new Text({
        text: ref,
        style: { fontFamily: "Inter, sans-serif", fontSize: 11, fill: active ? 0xf5b945 : 0x3d6f9d },
      });
      refLbl.position.set(pos.x - boxW / 2 + 2, pos.y - boxH / 2 - 14);
      this.worldStaticCache!.addChild(refLbl);

      // P-ε: hover outline si está hovered
      if (this.f5dHoveredStand === ref) {
        this.worldStaticCache!.addChild(
          new Graphics().rect(pos.x - boxW / 2 - 4, pos.y - boxH / 2 - 4, boxW + 8, boxH + 8).stroke({ width: 1.5, color: 0xa8dafc, alpha: 0.85 }),
        );
      }

      // P-ε: hitbox interactivo
      const hit = new Graphics().rect(pos.x - boxW / 2 - 4, pos.y - boxH / 2 - 4, boxW + 8, boxH + 8).fill({ color: 0x000000, alpha: 0.001 });
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.on("pointerover", () => { this.f5dHoveredStand = ref; if (this.lastState) this.apply(this.lastState); });
      hit.on("pointerout", () => { if (this.f5dHoveredStand === ref) { this.f5dHoveredStand = null; if (this.lastState) this.apply(this.lastState); } });
      hit.on("pointerdown", (ev) => {
        ev.stopPropagation();
        if (this.callbacks.onStandClick && simId) {
          this.callbacks.onStandClick(simId, !!ap, ap?.registration ?? null);
        }
      });
      this.worldStaticCache!.addChild(hit);
    }

    // ── Aviones taxiing (P-δ: trail multi-dot + bloom doble + halo pulsante) ──
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const ref = PixiDriver.F5D_STAND_MAP[ap.standId];
      if (!ref) continue;
      const standPos = standPositions.get(ref);
      if (!standPos) continue;
      const entryX = area.x + area.w * 0.3, entryY = area.y + area.h * 0.65;
      const px = entryX + (standPos.x - entryX) * ap.taxiProgress;
      const py = entryY + (standPos.y - entryY) * ap.taxiProgress;
      // Trail line gruesa decay
      this.worldDynamic!.addChild(new Graphics().moveTo(entryX, entryY).lineTo(px, py).stroke({ width: 1.5, color: 0x3aa9ff, alpha: 0.35 }));
      // Trail dots data schematic (4 puntos detrás del avión con fade)
      for (let i = 1; i <= 4; i++) {
        const t = Math.max(0, ap.taxiProgress - i * 0.08);
        const tx = entryX + (standPos.x - entryX) * t;
        const ty = entryY + (standPos.y - entryY) * t;
        const alpha = 0.55 - i * 0.12;
        this.worldDynamic!.addChild(new Graphics().rect(tx - 1.5, ty - 1.5, 3, 3).fill({ color: 0x3aa9ff, alpha }));
      }
      // Bloom externo (alpha bajo, radio amplio) + halo principal + core
      this.worldDynamic!.addChild(new Graphics().circle(px, py, 18).fill({ color: 0x3aa9ff, alpha: 0.08 }));
      this.worldDynamic!.addChild(new Graphics().circle(px, py, 10).fill({ color: 0x3aa9ff, alpha: 0.22 }));
      this.worldDynamic!.addChild(new Graphics().circle(px, py, 3.5).fill(0xa8dafc));
    }

    // ── Aviones parados en stand (P-δ: bloom doble + P-ε: hitbox click/hover) ──
    for (const ap of state.airplanes) {
      if (ap.taxiing || !ap.standId) continue;
      const ref = PixiDriver.F5D_STAND_MAP[ap.standId];
      if (!ref) continue;
      const standPos = standPositions.get(ref);
      if (!standPos) continue;
      this.worldDynamic!.addChild(new Graphics().circle(standPos.x, standPos.y, 18).fill({ color: 0x3aa9ff, alpha: 0.08 }));
      this.worldDynamic!.addChild(new Graphics().circle(standPos.x, standPos.y, 10).fill({ color: 0x3aa9ff, alpha: 0.22 }));
      this.worldDynamic!.addChild(new Graphics().circle(standPos.x, standPos.y, 3.5).fill(0xa8dafc));
      const reg = new Text({
        text: ap.registration,
        style: { fontFamily: "Inter, sans-serif", fontSize: 11, fill: 0x5da0e0 },
      });
      reg.position.set(standPos.x + 10, standPos.y - 4);
      this.worldDynamic!.addChild(reg);
      // P-ε: hover outline
      if (this.f5dHoveredAirplane === ap.instanceId) {
        this.worldDynamic!.addChild(
          new Graphics().circle(standPos.x, standPos.y, 14).stroke({ width: 1.5, color: 0xa8dafc, alpha: 0.85 }),
        );
      }
      // P-ε: hitbox click
      const apHit = new Graphics().circle(standPos.x, standPos.y, 14).fill({ color: 0x000000, alpha: 0.001 });
      apHit.eventMode = "static";
      apHit.cursor = "pointer";
      const apId = ap.instanceId;
      const apReg = ap.registration;
      apHit.on("pointerover", () => { this.f5dHoveredAirplane = apId; if (this.lastState) this.apply(this.lastState); });
      apHit.on("pointerout", () => { if (this.f5dHoveredAirplane === apId) { this.f5dHoveredAirplane = null; if (this.lastState) this.apply(this.lastState); } });
      apHit.on("pointerdown", (ev) => {
        ev.stopPropagation();
        if (this.callbacks.onAirplaneClick) this.callbacks.onAirplaneClick(apReg);
      });
      this.worldDynamic!.addChild(apHit);
    }

    // ── P-ε: Plots ghost Stage 3 / Stage 4 (zonas vacías reservadas para hangares) ──
    // Posicionados al sur del apron OSM en zonas con espacio. Click → onBuildClick.
    const ghostY = area.y + area.h + 80;
    const ghostW = 360, ghostH = 220, ghostGap = 80;
    const ghostStartX = area.x + area.w * 0.25;
    const ghosts: Array<{ stage: number; cost: string; x: number; available: boolean }> = [
      { stage: 3, cost: "500.000 €", x: ghostStartX, available: state.mroStage < 3 },
      { stage: 4, cost: "1.500.000 €", x: ghostStartX + ghostW + ghostGap, available: state.mroStage < 4 && state.mroStage >= 2 },
    ];
    for (const ghost of ghosts) {
      if (!ghost.available) continue;
      const dash = new Graphics();
      dashedRect(dash, ghost.x, ghostY, ghostW, ghostH, { dash: 24, gap: 14, width: 2, color: 0xf5b945, alpha: 0.65 });
      this.worldStaticCache!.addChild(dash);
      // Diagonal fill tenue
      this.worldStaticCache!.addChild(new Graphics().rect(ghost.x, ghostY, ghostW, ghostH).fill({ color: 0x2a1a08, alpha: 0.15 }));
      // Labels
      const t1 = new Text({
        text: `STAGE ${ghost.stage}`,
        style: { fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: "500", fill: 0xf5b945 },
      });
      t1.anchor.set(0.5);
      t1.position.set(ghost.x + ghostW / 2, ghostY + ghostH / 2 - 18);
      this.worldStaticCache!.addChild(t1);
      const t2 = new Text({
        text: ghost.cost,
        style: { fontFamily: "JetBrains Mono, monospace", fontSize: 16, fill: 0xa8dafc },
      });
      t2.anchor.set(0.5);
      t2.position.set(ghost.x + ghostW / 2, ghostY + ghostH / 2 + 14);
      this.worldStaticCache!.addChild(t2);
      const t3 = new Text({
        text: "click para construir",
        style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: 0x5da0e0 },
      });
      t3.anchor.set(0.5);
      t3.position.set(ghost.x + ghostW / 2, ghostY + ghostH / 2 + 42);
      this.worldStaticCache!.addChild(t3);
      // Hover outline
      const gKey = `ghost-${ghost.stage}`;
      if (this.f5dHoveredStand === gKey) {
        this.worldStaticCache!.addChild(
          new Graphics().rect(ghost.x - 4, ghostY - 4, ghostW + 8, ghostH + 8).stroke({ width: 2, color: 0xa8dafc, alpha: 0.9 }),
        );
      }
      // Hit area
      const gHit = new Graphics().rect(ghost.x, ghostY, ghostW, ghostH).fill({ color: 0x000000, alpha: 0.001 });
      gHit.eventMode = "static";
      gHit.cursor = "pointer";
      gHit.on("pointerover", () => { this.f5dHoveredStand = gKey; if (this.lastState) this.apply(this.lastState); });
      gHit.on("pointerout", () => { if (this.f5dHoveredStand === gKey) { this.f5dHoveredStand = null; if (this.lastState) this.apply(this.lastState); } });
      gHit.on("pointerdown", (ev) => {
        ev.stopPropagation();
        if (this.callbacks.onBuildClick) this.callbacks.onBuildClick();
      });
      this.worldStaticCache!.addChild(gHit);
    }

    // ── Furgo mecánicos (línea recta MVP — OSM no marca service roads en LEAS) ──
    // Origen aproximado: centro del terminal
    let officeX = area.x + area.w * 0.45, officeY = area.y + area.h * 0.78;
    if (P.terminal.length > 0) {
      let cx = 0, cy = 0;
      for (const c of P.terminal[0].coords) { const p = this.f5dProject(c, area); cx += p.x; cy += p.y; }
      officeX = cx / P.terminal[0].coords.length;
      officeY = cy / P.terminal[0].coords.length;
    }
    for (const m of state.mechanics) {
      if (!m.destStandId) continue;
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      const ref = PixiDriver.F5D_STAND_MAP[m.destStandId];
      if (!ref) continue;
      const standPos = standPositions.get(ref);
      if (!standPos) continue;
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const px = officeX + (standPos.x - officeX) * tForward;
      const py = officeY + (standPos.y - officeY) * tForward;
      // Trail oficina→stand
      this.worldDynamic!.addChild(new Graphics().moveTo(officeX, officeY).lineTo(px, py).stroke({ width: 0.8, color: 0xf5b945, alpha: 0.35 }));
      // Furgo (rect pequeño ámbar)
      this.worldDynamic!.addChild(new Graphics().rect(px - 4, py - 2, 8, 4).fill({ color: m.state === "Returning" ? 0x3d6f9d : 0xf5b945 }).stroke({ width: 0.5, color: 0xa8dafc, alpha: 0.6 }));
    }

    // ── Overlay HUD ──
    // Header esquina sup-izq
    const hdr1 = new Text({
      text: "OVD · LEAS",
      style: { fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", fill: 0xa8dafc },
    });
    hdr1.position.set(20, 18);
    this.layerOverlay!.addChild(hdr1);
    const hdr2 = new Text({
      text: "Asturias · 43.56°N 6.03°W",
      style: { fontFamily: "Inter, sans-serif", fontSize: 11, fill: 0x5da0e0 },
    });
    hdr2.position.set(20, 38);
    this.layerOverlay!.addChild(hdr2);

    // Compass N
    const compassG = new Graphics();
    compassG.circle(W - 40, 32, 15).stroke({ width: 0.5, color: 0x2c4870 });
    compassG.moveTo(W - 40, 20).lineTo(W - 40, 44).stroke({ width: 0.8, color: 0x5da0e0 });
    compassG.moveTo(W - 44, 24).lineTo(W - 40, 20).stroke({ width: 0.8, color: 0x5da0e0 });
    compassG.moveTo(W - 36, 24).lineTo(W - 40, 20).stroke({ width: 0.8, color: 0x5da0e0 });
    this.layerOverlay!.addChild(compassG);
    const nLbl = new Text({
      text: "N",
      style: { fontFamily: "Inter, sans-serif", fontSize: 11, fill: 0xa8dafc },
    });
    nLbl.position.set(W - 46, 52);
    this.layerOverlay!.addChild(nLbl);

    // Sync diag
    const idleC = state.mechanics.filter((m) => m.state === "Idle").length;
    const onShiftC = state.mechanics.filter((m) => m.state !== "OffShift" && m.state !== "Training").length;
    const diag = new Text({
      text: `t=${state.minute} · ${state.timeOfDay} · stage ${state.mroStage} · aviones=${state.airplanes.length} · mecs ${idleC}/${onShiftC}`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: 0x5da0e0 },
    });
    diag.position.set(20, H - 26);
    this.layerOverlay!.addChild(diag);

    // Atribución OSM esquina inf-dcha (ODbL obligatorio)
    const attr = new Text({
      text: "© OpenStreetMap contributors",
      style: { fontFamily: "Inter, sans-serif", fontSize: 11, fill: 0x3d6f9d },
    });
    attr.anchor.set(1, 1);
    attr.position.set(W - 12, H - 10);
    this.layerOverlay!.addChild(attr);

    // Indicador skin
    const fps = this.app.ticker.FPS;
    const fpsCol = fps >= 55 ? 0x3aa9ff : fps >= 30 ? 0xf5b945 : 0xff6b6b;
    const fpsLbl = new Text({
      text: `${fps.toFixed(0)} fps`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: "bold", fill: fpsCol },
    });
    fpsLbl.anchor.set(1, 0);
    fpsLbl.position.set(W - 12, 50);
    this.layerOverlay!.addChild(fpsLbl);

    const skinLbl = new Text({
      text: `skin: f5d · OSM ${ovdPaths.icao} · zoom ${this.camera.zoom.toFixed(2)}× · WASD/wheel`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: 0x3d6f9d },
    });
    skinLbl.anchor.set(0, 1);
    skinLbl.position.set(12, H - 10);
    this.layerOverlay!.addChild(skinLbl);

    // Minimapa
    this.drawF5DMinimap(state);
  }

  private drawF5DMinimap(state: RenderState): void {
    if (!this.app || !this.worldMinimap) return;
    const root = this.worldMinimap;
    root.removeChildren();
    const W = this.app.screen.width, H = this.app.screen.height;
    const FW = PixiDriver.F5D_WORLD_W, FH = PixiDriver.F5D_WORLD_H;
    const mmW = 200, mmH = mmW / (FW / FH);
    const mmX = W - mmW - 14;
    const mmY = H - mmH - 32;
    const sx = mmW / FW, sy = mmH / FH;
    // Fondo
    root.addChild(new Graphics().rect(mmX, mmY, mmW, mmH).fill({ color: 0x0a1428, alpha: 0.92 }).stroke({ width: 1, color: 0x2c4870 }));
    const area = this.f5dArea();
    const P = ovdPaths.paths;
    // Apron miniatura
    for (const w of P.apron) {
      const g = new Graphics();
      if (w.coords.length === 0) continue;
      const p0 = this.f5dProject(w.coords[0], area);
      g.moveTo(mmX + p0.x * sx, mmY + p0.y * sy);
      for (let i = 1; i < w.coords.length; i++) {
        const p = this.f5dProject(w.coords[i], area);
        g.lineTo(mmX + p.x * sx, mmY + p.y * sy);
      }
      g.closePath().fill({ color: 0x13243f, alpha: 0.85 });
      root.addChild(g);
    }
    // Pista
    for (const w of P.runways) {
      const g = new Graphics();
      if (w.coords.length < 2) continue;
      const p0 = this.f5dProject(w.coords[0], area);
      g.moveTo(mmX + p0.x * sx, mmY + p0.y * sy);
      for (let i = 1; i < w.coords.length; i++) {
        const p = this.f5dProject(w.coords[i], area);
        g.lineTo(mmX + p.x * sx, mmY + p.y * sy);
      }
      g.stroke({ width: 2, color: 0xa8dafc, alpha: 0.8 });
      root.addChild(g);
    }
    // Stands activos
    for (const ap of state.airplanes) {
      if (ap.taxiing || !ap.standId) continue;
      const ref = PixiDriver.F5D_STAND_MAP[ap.standId];
      const pp = P.parkingPositions.find((p) => p.ref === ref);
      if (!pp || pp.coords.length === 0) continue;
      const tip = this.f5dProject(pp.coords[pp.coords.length - 1], area);
      root.addChild(new Graphics().circle(mmX + tip.x * sx, mmY + tip.y * sy, 2.5).fill(0xf5b945));
    }
    // Viewport rect
    const vpX = -this.camera.x, vpY = -this.camera.y;
    const vpW = W / this.camera.zoom, vpH = H / this.camera.zoom;
    root.addChild(
      new Graphics()
        .rect(mmX + vpX * sx, mmY + vpY * sy, vpW * sx, vpH * sy)
        .stroke({ width: 1.5, color: 0xf5b945, alpha: 0.85 }),
    );
    // Label
    const lbl = new Text({ text: "MAPA", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: "bold", fill: 0xf5b945 } });
    lbl.position.set(mmX + 4, mmY + 2);
    root.addChild(lbl);
  }

  private renderHuge(state: RenderState): void {
    if (!this.app) return;
    if (!this.cameraInitialized) this.initHugeCamera();
    const sky = state.timeOfDay === "night" ? 0x050a17 : 0x0d1a2e;
    this.app.renderer.background.color = sky;

    // PERF: estatica cacheada — solo redibujar si cambia mroStage o timeOfDay.
    // El resto de los layers tradicionales NO se usan en huge (los limpiamos solo
    // si el static cache se invalida).
    const key = `huge:${state.mroStage}:${state.timeOfDay}`;
    if (this.staticCacheKey !== key) {
      [this.layerBg!, this.layerRoad!, this.layerStaticLabels!, this.layerSprites!, this.layerMoving!, this.layerOverlay!].forEach(l => l.removeChildren());
      this.drawHugeStatic(state);
      this.staticCacheKey = key;
    }
    this.drawHugeDynamic(state);
    this.drawHugeHUD(state);
    this.drawHugeMinimap(state);
  }

  /** Layout coords del aeropuerto huge (60000Ã—36000) â€” Asturias (LEAS / OVD) al detalle.
   *  1 pista 11/29 horizontal, taxiway A paralelo al norte, terminal lineal con ATC pegada
   *  al extremo este, plataforma con 6 stands remote (sin jet bridges, pasarela mÃ³vil real),
   *  parking al norte, AS-266 acceso desde el norte, mar CantÃ¡brico al fondo, paisaje verde
   *  Asturias alrededor. Sin zona MRO Airbus (no existe en LEAS real). */
  private get hugeLayout() {
    const W = PixiDriver.HUGE_WORLD_W, H = PixiDriver.HUGE_WORLD_H;

    // Layout mockup: taxiway T arriba, 6 columnas norte (cargo NW + 5 stands),
    // terminal central + service road airside, parking masivo sur con cargo SW,
    // ATC + public access derecha, rotonda + brujula esquina SE.

    // Taxiway T arriba (banda horizontal entera + L-connector NW)
    const TWY_A_Y = 400;
    const TWY_A = { x: 0, y: TWY_A_Y, w: W, h: 2000 };
    // L-connector NW saliendo del taxiway hacia arriba (out-of-world hint)
    const TWY_B_Y = -10000;
    const TWY_B = { x: 0, y: -10000, w: 0, h: 0 };
    // No pista visible (mockup solo apron, pista fuera)
    const RWY_X = 0, RWY_W = 0, RWY_H_PIX = 0, RWY1_Y = -10000;
    const RWY1 = { x: 0, y: -10000, w: 0, h: 0 };
    const RWY2_Y = -10000;
    const RWY2 = { x: 0, y: -10000, w: 0, h: 0 };
    const HIGH_SPEED_EXITS: Array<{ rwyY: number; twyY: number; cx: number; toEast: boolean }> = [];
    const HOLDING_BAYS: Array<{ x: number; y: number; w: number; h: number; label: string }> = [];
    const ILS: Array<{ x: number; y: number; w: number; h: number }> = [];

    // CARGO AREA NW (esquina arriba-izq)
    const CARGO_X = 400;
    const CARGO_Y = 3000;
    const CARGO_W = 7000;
    const CARGO_H = 6500;
    const CARGO_APRON_Y = CARGO_Y + CARGO_H + 200;
    const CARGO_APRON_H = 2200;

    // Apron principal (5 stands en fila a la derecha del cargo NW)
    const APRON_X = CARGO_X + CARGO_W + 600;
    const APRON_Y = 3000;
    const APRON_W = W - APRON_X - 1500;
    const APRON_H = 8500;

    // 5 stands en fila: Stand 04 Remote | Gate 01 | Gate 02 | Gate 03 | Stand 05 Remote
    const NSTANDS = 5;
    const standGap = 250;
    const standW = (APRON_W - (NSTANDS - 1) * standGap) / NSTANDS;
    const standH = APRON_H - 600;
    const standsY = APRON_Y + 300;
    // Mockup labels y sim mapping:
    //   pos 0 → "Stand 04 Remote" → sim R1
    //   pos 1 → "Gate 01 Departure" → sim H1-S1
    //   pos 2 → "Gate 02 Departure" → sim H1-S2
    //   pos 3 → "Gate 03 Departure" → sim H1-S3
    //   pos 4 → "Stand 05 Remote" → sim H2-S1
    const SIM_GATE_MAP: Record<string, string> = { "R1": "S04", "H1-S1": "G01", "H1-S2": "G02", "H1-S3": "G03", "H2-S1": "S05" };
    const STAND_LABELS = ["Stand 04 Remote", "Gate 01 Departure", "Gate 02 Departure", "Gate 03 Departure", "Stand 05 Remote"];
    const STAND_CODES = ["S04", "G01", "G02", "G03", "S05"];
    const gates: Array<{ x: number; y: number; w: number; h: number; centerX: number; centerY: number; label: string; longLabel: string; simId: string | null; concourseSide: "L" | "R"; isRemote?: boolean }> = [];
    for (let i = 0; i < NSTANDS; i++) {
      const gx = APRON_X + i * (standW + standGap);
      const code = STAND_CODES[i];
      gates.push({
        x: gx, y: standsY, w: standW, h: standH,
        centerX: gx + standW / 2, centerY: standsY + standH / 2,
        label: code, longLabel: STAND_LABELS[i],
        simId: Object.entries(SIM_GATE_MAP).find(([_k, v]) => v === code)?.[0] || null,
        concourseSide: "L", isRemote: true,
      });
    }
    // No hay concourses ni remotes adicionales
    const CONC_LEFT_X = -20000, CONC_RIGHT_X = -20000, CONC_Y = -20000, CONC_W = 0, CONC_H = 0;
    const remotes: Array<{ x: number; y: number; w: number; h: number; centerX: number; centerY: number; label: string }> = [];
    const MRO_X = -20000, MRO_Y = -20000, MRO_W = 0, MRO_H = 0;
    const LAGARDERE_X = -20000, LAGARDERE_Y = -20000, LAGARDERE_W = 0, LAGARDERE_H = 0;
    const hangars: Array<{ x: number; y: number; w: number; h: number; label: string; stage: number }> = [];
    const DEICE_X = -20000, DEICE_Y = -20000, DEICE_W = 0, DEICE_H = 0;

    // Terminal central horizontal (rect grande oscuro)
    const TERM_X = APRON_X - 1000;
    const TERM_Y = APRON_Y + APRON_H + 1000;
    const TERM_W = W - TERM_X - 6500;
    const TERM_H = 3000;

    // ATC tower derecha (rect estrecho vertical)
    const ATC_X = TERM_X + TERM_W + 200;
    const ATC_Y = TERM_Y;

    // SERVICE ROAD (AIRSIDE) horizontal entre terminal y parking
    const SR_AIRSIDE_Y = TERM_Y + TERM_H + 200;
    const SR_AIRSIDE_H = 1200;

    // Parking masivo sur con cargo SW al lado izq
    const PARK_X = APRON_X;
    const PARK_Y = SR_AIRSIDE_Y + SR_AIRSIDE_H + 500;
    const PARK_W = TERM_W;
    const PARK_H = H - PARK_Y - 3500;

    // CARGO AREA SW
    const CARGO2_X = 400;
    const CARGO2_Y = PARK_Y + 2000;
    const CARGO2_W = 7000;
    const CARGO2_H = 6000;

    // PUBLIC ACCESS rect derecha
    const PUBLIC_X = ATC_X;
    const PUBLIC_Y = SR_AIRSIDE_Y + SR_AIRSIDE_H + 800;
    const PUBLIC_W = W - PUBLIC_X - 400;
    const PUBLIC_H = 10000;

    // SERVICE ROAD (LANDSIDE) abajo horizontal
    const SR_LANDSIDE_Y = PARK_Y + PARK_H + 200;
    const SR_LANDSIDE_H = 1000;

    // Rotonda esquina SE + brújula
    const ROUNDABOUT_X = PARK_X + PARK_W - 1500;
    const ROUNDABOUT_Y = PARK_Y + PARK_H - 800;
    const ROUNDABOUT_R = 1400;
    const COMPASS_X = W - 1500;
    const COMPASS_Y = H - 1500;

    // Variables compat (apuntan a OPS dentro de terminal)
    const OPS_X = TERM_X + 400;
    const OPS_Y = TERM_Y + 300;
    const OPS_W = 5500;
    const OPS_H = TERM_H - 600;
    const GSE_X = -20000, GSE_Y = -20000, GSE_W = 0, GSE_H = 0;
    const FUEL_X = -20000, FUEL_Y = -20000, FUEL_W = 0, FUEL_H = 0;
    const FIRE_X = -20000, FIRE_Y = -20000, FIRE_W = 0, FIRE_H = 0;
    const GA_X = -20000, GA_Y = -20000, GA_W = 0, GA_H = 0;
    const ACCESS_ROAD = { x1: COMPASS_X, y1: SR_LANDSIDE_Y, x2: COMPASS_X, y2: H - 200 };

    return {
      W, H,
      RWY1, RWY2, TWY_A, TWY_B,
      RWY_X, RWY_W, RWY_H_PIX, RWY1_Y, RWY2_Y, TWY_A_Y, TWY_B_Y,
      HIGH_SPEED_EXITS, HOLDING_BAYS, ILS,
      APRON_X, APRON_Y, APRON_W, APRON_H,
      MRO_X, MRO_Y, MRO_W, MRO_H,
      LAGARDERE_X, LAGARDERE_Y, LAGARDERE_W, LAGARDERE_H,
      hangars,
      DEICE_X, DEICE_Y, DEICE_W, DEICE_H,
      TERM_X, TERM_Y, TERM_W, TERM_H,
      CONC_LEFT_X, CONC_RIGHT_X, CONC_Y, CONC_W, CONC_H,
      gates, remotes,
      CARGO_X, CARGO_Y, CARGO_W, CARGO_H,
      CARGO_APRON_Y, CARGO_APRON_H,
      GSE_X, GSE_Y, GSE_W, GSE_H,
      FUEL_X, FUEL_Y, FUEL_W, FUEL_H,
      OPS_X, OPS_Y, OPS_W, OPS_H,
      ATC_X, ATC_Y,
      FIRE_X, FIRE_Y, FIRE_W, FIRE_H,
      GA_X, GA_Y, GA_W, GA_H,
      PARK_X, PARK_Y, PARK_W, PARK_H,
      ACCESS_ROAD,
      // Mockup additions
      SR_AIRSIDE_Y, SR_AIRSIDE_H,
      SR_LANDSIDE_Y, SR_LANDSIDE_H,
      PUBLIC_X, PUBLIC_Y, PUBLIC_W, PUBLIC_H,
      CARGO2_X, CARGO2_Y, CARGO2_W, CARGO2_H,
      ROUNDABOUT_X, ROUNDABOUT_Y, ROUNDABOUT_R,
      COMPASS_X, COMPASS_Y,
      HZ_X: MRO_X, HZ_Y: MRO_Y, HZ_W: MRO_W, HZ_H: MRO_H,
      TERM_SPINE_X: TERM_X, TERM_SPINE_Y: TERM_Y, TERM_SPINE_W: TERM_W, TERM_SPINE_H: TERM_H,
    };
  }

  /** Devuelve true si el getter actual corresponde a LEAS (sin MRO zone). */
  private get _isLEAS(): boolean { return this.hugeLayout.MRO_W === 0; }


  private drawHugeStatic(state: RenderState): void {
    const root = this.worldStaticCache!;
    root.removeChildren();
    const L = this.hugeLayout;
    const night = state.timeOfDay === "night";
    const W = PixiDriver.HUGE_WORLD_W, H = PixiDriver.HUGE_WORLD_H;

    // BG: Asturias LEAS si layout es LEAS, sino azul tecnico generico
    const isLEAS = L.MRO_W === 0;
    if (isLEAS) {
      const seaH = H * 0.10;
      root.addChild(new Graphics().rect(0, 0, W, seaH).fill(night ? 0x0a1f3a : 0x2a5680));
      const wavesG = new Graphics();
      for (let i = 0; i < 30; i++) {
        const wx = (i * 1300) % W;
        const wy = (i * 250) % seaH;
        wavesG.rect(wx, wy, 200, 8).fill({ color: 0xffffff, alpha: 0.18 });
      }
      root.addChild(wavesG);
      const seaLbl = new Text({
        text: "MAR CANTABRICO",
        style: { fontFamily: "Inter, sans-serif", fontSize: 200, fontWeight: "bold", fill: { color: 0xffffff, alpha: 0.35 } },
      });
      seaLbl.anchor.set(0.5); seaLbl.position.set(W / 2, seaH / 2);
      root.addChild(seaLbl);
      root.addChild(new Graphics().rect(0, seaH, W, 200).fill(night ? 0x1a2a14 : 0x3a5b2a));
      root.addChild(new Graphics().rect(0, seaH + 200, W, H - seaH - 200).fill(night ? 0x0e1a0a : 0x2c4a1f));
      const grassG = new Graphics();
      for (let i = 0; i < 800; i++) {
        const gx = (i * 137) % W;
        const gy = seaH + 200 + (i * 89) % (H - seaH - 200);
        const tint = (i % 4 === 0) ? 0x4a7d3a : (i % 7 === 0 ? 0x1a3a14 : 0x2c4a1f);
        grassG.circle(gx + ((i * 71) % 30) - 15, gy + ((i * 43) % 30) - 15, 8 + ((i * 13) % 16)).fill({ color: tint, alpha: 0.4 });
      }
      root.addChild(grassG);
    } else {
      root.addChild(new Graphics().rect(0, 0, W, H).fill(night ? 0x05101e : 0x0d1a2e));
      const gridG = new Graphics();
      for (let x = 0; x < W; x += 2000) gridG.moveTo(x, 0).lineTo(x, H);
      for (let y = 0; y < H; y += 2000) gridG.moveTo(0, y).lineTo(W, y);
      gridG.stroke({ width: 6, color: 0x1a2d4a, alpha: 0.6 });
      root.addChild(gridG);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PERÃMETRO completo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugePerimeter(root, W, H);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ZONA AIR OPERATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ILS antenna farms en cabeceras
    for (const a of L.ILS) drawHugeILS(root, a.x, a.y, a.w, a.h);

    // Pista 11/29 LEAS (label izq = cabecera 29 ENE; label der = cabecera 11 WSW)
    drawHugeRunway(root, L.RWY1.x, L.RWY1.y, L.RWY1.w, L.RWY1.h, "29", "11");
    // RWY2 solo si existe (w > 0)
    if (L.RWY2.w > 0) drawHugeRunway(root, L.RWY2.x, L.RWY2.y, L.RWY2.w, L.RWY2.h, "32L", "14R");

    // Taxiways A y B paralelos
    drawHugeTaxiway(root, L.TWY_A.x, L.TWY_A.y, L.TWY_A.w, L.TWY_A.h, "A");
    if (L.TWY_B.w > 0) drawHugeTaxiway(root, L.TWY_B.x, L.TWY_B.y, L.TWY_B.w, L.TWY_B.h, "B");

    // Conectores rectos entre pista corta y taxiway A
    for (let cx = L.RWY2.x + 2000; cx < L.RWY2.x + L.RWY2.w - 2000; cx += 7000) {
      drawHugeConnector(root, cx, L.RWY2.y + L.RWY2.h, L.TWY_A.y - (L.RWY2.y + L.RWY2.h), 400);
    }
    // Conector entre TWY_A y RWY1 (perpendicular, en intersecciones)
    for (let cx = L.RWY1.x + 5000; cx < L.RWY1.x + L.RWY1.w - 5000; cx += 14000) {
      drawHugeConnector(root, cx, L.TWY_A.y + L.TWY_A.h, L.RWY1.y - (L.TWY_A.y + L.TWY_A.h), 400);
    }

    // High-speed exits (en Ã¡ngulo 30Â° de RWY1 a TWY_A y TWY_B)
    for (const ex of L.HIGH_SPEED_EXITS) {
      drawHugeHighSpeedExit(root, ex.cx, ex.rwyY, ex.twyY, ex.toEast);
    }

    // Holding bays en cabeceras
    for (const hb of L.HOLDING_BAYS) {
      drawHugeHoldingBay(root, hb.x, hb.y, hb.w, hb.h, hb.label);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ APRON principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    root.addChild(new Graphics().rect(L.APRON_X, L.APRON_Y, L.APRON_W, L.APRON_H).fill(0x1f2f48).stroke({ width: 6, color: 0x3a5b8a }));

    // Conector taxiway B â†’ apron (3 entradas anchas)
    for (let cx = L.RWY1.x + 8000; cx < L.RWY1.x + L.RWY1.w - 8000; cx += 18000) {
      drawHugeConnector(root, cx, L.TWY_B.y + L.TWY_B.h, L.APRON_Y - (L.TWY_B.y + L.TWY_B.h), 500);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ZONA MRO AIRBUS (OESTE) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugeMROZone(root, L.MRO_X, L.MRO_Y, L.MRO_W, L.MRO_H);
    // Hall LagardÃ¨re (edificio MRO gigante)
    drawHugeLagardereHall(root, L.LAGARDERE_X, L.LAGARDERE_Y, L.LAGARDERE_W, L.LAGARDERE_H, night);
    // Hangares MRO
    for (const h of L.hangars) {
      const active = h.stage <= state.mroStage;
      drawHugeMROHangar(root, h.x, h.y, h.w, h.h, h.label, h.stage, active);
    }
    // De-icing pad
    drawHugeDeicingPad(root, L.DEICE_X, L.DEICE_Y, L.DEICE_W, L.DEICE_H);
    // Hit area click sobre toda la zona MRO
    const hzHit = new Graphics().rect(L.MRO_X, L.MRO_Y, L.MRO_W, L.MRO_H).fill({ color: 0x000000, alpha: 0.001 });
    hzHit.eventMode = "static"; hzHit.cursor = "pointer";
    hzHit.on("pointerdown", (ev) => { ev.stopPropagation(); if (this.callbacks.onBuildClick) this.callbacks.onBuildClick(); });
    root.addChild(hzHit);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TERMINAL PASAJEROS (CENTRO) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugeTerminal(root, L.TERM_X, L.TERM_Y, L.TERM_W, L.TERM_H, "TERMINAL", night);
    // Concourses solo si W > 0 (LEAS no tiene)
    if (L.CONC_W > 0) {
      drawHugeTerminal(root, L.CONC_LEFT_X, L.CONC_Y, L.CONC_W, L.CONC_H, "CONCOURSE A", night);
      drawHugeTerminal(root, L.CONC_RIGHT_X, L.CONC_Y, L.CONC_W, L.CONC_H, "CONCOURSE B", night);
    }

    // Gates con jet bridges (skip si isRemote — LEAS sin jet bridges)
    for (const g of L.gates) {
      drawHugeGate(root, g.x, g.y, g.w, g.h, g.label, g.simId !== null);
      if (!g.isRemote && L.CONC_W > 0) {
        if (g.concourseSide === "L") {
          drawHugeJetBridge(root, L.CONC_LEFT_X, g.y + g.h / 2, g.x + g.w, g.y + g.h / 2);
        } else {
          drawHugeJetBridge(root, L.CONC_RIGHT_X + L.CONC_W, g.y + g.h / 2, g.x, g.y + g.h / 2);
        }
      }
    }

    // Stands remote (vacío en LEAS)
    for (const r of L.remotes) drawHugeRemote(root, r.x, r.y, r.w, r.h, r.label);

    // GA apron (general aviation, sur del terminal)
    drawHugeGAApron(root, L.GA_X, L.GA_Y, L.GA_W, L.GA_H);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CARGO TERMINAL (ESTE) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugeCargoTerminal(root, L.CARGO_X, L.CARGO_Y, L.CARGO_W, L.CARGO_H, night);
    // Cargo apron debajo
    root.addChild(new Graphics().rect(L.CARGO_X, L.CARGO_APRON_Y, L.CARGO_W, L.CARGO_APRON_H).fill({ color: 0x1f2f48, alpha: 0.85 }).stroke({ width: 4, color: 0x3a5b8a }));
    const cargoApLbl = new Text({ text: "CARGO APRON", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 90, fontWeight: "bold", fill: 0xe6ecf5 } });
    cargoApLbl.anchor.set(0.5); cargoApLbl.position.set(L.CARGO_X + L.CARGO_W / 2, L.CARGO_APRON_Y + L.CARGO_APRON_H / 2);
    root.addChild(cargoApLbl);
    // GSE parking
    drawHugeGSEParking(root, L.GSE_X, L.GSE_Y, L.GSE_W, L.GSE_H);
    // Fuel farm
    drawHugeFuelFarm(root, L.FUEL_X, L.FUEL_Y, L.FUEL_W, L.FUEL_H);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ OPS / OFICINA MECS (dentro MRO sur) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const idleC = state.mechanics.filter((m) => m.state === "Idle").length;
    const totC = state.mechanics.filter((m) => m.state !== "OffShift" && m.state !== "Training").length;
    drawHugeOpsBuildings(root, L.OPS_X, L.OPS_Y, L.OPS_W, L.OPS_H, idleC, totC, night);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ATC tower (centro, visual a ambas pistas) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugeATC(root, L.ATC_X, L.ATC_Y, night);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FIRE STATION (central south, acceso rÃ¡pido) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugeFireStation(root, L.FIRE_X, L.FIRE_Y, L.FIRE_W, L.FIRE_H);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PARKING PÃšBLICO + LANDSIDE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugeParking(root, L.PARK_X, L.PARK_Y, L.PARK_W, L.PARK_H);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CARRETERA DE ACCESO civiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHugeAccessRoad(root, L);
  }

  private drawHugeDynamic(state: RenderState): void {
    const root = this.worldDynamic!;
    root.removeChildren();
    const L = this.hugeLayout;

    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);

    // Aviones en gate
    for (const g of L.gates) {
      const ap = g.simId ? apByStand.get(g.simId) : undefined;
      if (ap && !ap.taxiing) {
        const sz = Math.min(g.w, g.h) * 0.75;
        drawHugeAirplane(root, g.centerX, g.centerY, sz, g.concourseSide === "L" ? -Math.PI / 2 : Math.PI / 2);
      }
    }

    // Aviones taxiando
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const g = L.gates.find((g) => g.simId === ap.standId);
      if (!g) continue;
      // Path: aterriza en pista 1 desde el oeste â†’ taxiway A â†’ conector â†’ apron â†’ gate
      const path: Pt[] = [
        { x: L.RWY1.x + 500, y: L.RWY1.y + L.RWY1.h / 2 },
        { x: g.centerX, y: L.RWY1.y + L.RWY1.h / 2 },
        { x: g.centerX, y: L.TWY_A.y + L.TWY_A.h / 2 },
        { x: g.centerX, y: L.TWY_B.y + L.TWY_B.h / 2 },
        { x: g.centerX, y: g.centerY },
      ];
      const { pos } = lerpPath(path, ap.taxiProgress);
      const heading = pathHeading(path, ap.taxiProgress);
      // Halo verde sutil
      root.addChild(new Graphics().circle(pos.x, pos.y, 600).fill({ color: 0x4ade80, alpha: 0.15 }));
      drawHugeAirplane(root, pos.x, pos.y, 1100, heading + Math.PI / 2, 0x4ade80);
    }

    // Furgos mec
    for (const m of state.mechanics) {
      if (!m.destStandId) continue;
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      const g = L.gates.find((gg) => gg.simId === m.destStandId);
      if (!g) continue;
      // Furgo desde oficina hasta el gate (path simple)
      const path: Pt[] = [
        { x: L.OPS_X + L.OPS_W / 2, y: L.OPS_Y + L.OPS_H / 2 },
        { x: L.OPS_X + L.OPS_W / 2, y: g.centerY },
        { x: g.centerX, y: g.centerY },
      ];
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const { pos } = lerpPath(path, tForward);
      const heading = pathHeading(path, tForward);
      drawHugeVan(root, pos.x, pos.y, heading, m.state === "Returning");
    }
  }

  private drawHugeHUD(state: RenderState): void {
    const root = this.worldHUD!;
    root.removeChildren();
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    root.addChild(new Graphics().rect(0, 0, W, 38).fill({ color: 0x0a1a2e, alpha: 0.92 }).stroke({ width: 1, color: 0x3a5b8a }));
    const txt = new Text({
      text: `MRO INTERNATIONAL AIRPORT Â· Etapa ${state.mroStage}/4 Â· ${state.timeOfDay === "day" ? "â˜€ï¸ DÃA" : "ðŸŒ™ NOCHE"} Â· t=${state.minute}`,
      style: { fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "bold", fill: 0xe6ecf5 },
    });
    txt.position.set(14, 11);
    root.addChild(txt);
    const ops = new Text({
      text: `zoom ${this.camera.zoom.toFixed(3)}Ã— Â· WASD/flechas pan Â· wheel zoom Â· Q/E zoom`,
      style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: 0x7a93b8 },
    });
    ops.anchor.set(1, 0); ops.position.set(W - 14, 13);
    root.addChild(ops);
  }

  private drawHugeMinimap(state: RenderState): void {
    const root = this.worldMinimap!;
    root.removeChildren();
    if (!this.app) return;
    const W = this.app.screen.width, H = this.app.screen.height;
    const mmW = 280, mmH = 168;
    const mmX = W - mmW - 14;
    const mmY = H - mmH - 14;
    const scaleX = mmW / PixiDriver.HUGE_WORLD_W;
    const scaleY = mmH / PixiDriver.HUGE_WORLD_H;
    root.addChild(new Graphics().rect(mmX, mmY, mmW, mmH).fill({ color: 0x05101e, alpha: 0.95 }).stroke({ width: 1.5, color: 0x3a5b8a }));
    const L = this.hugeLayout;
    // Pistas
    root.addChild(new Graphics().rect(mmX + L.RWY1.x * scaleX, mmY + L.RWY1.y * scaleY, L.RWY1.w * scaleX, L.RWY1.h * scaleY).fill(0x4a7daa));
    root.addChild(new Graphics().rect(mmX + L.RWY2.x * scaleX, mmY + L.RWY2.y * scaleY, L.RWY2.w * scaleX, L.RWY2.h * scaleY).fill(0x4a7daa));
    // Apron
    root.addChild(new Graphics().rect(mmX + L.APRON_X * scaleX, mmY + L.APRON_Y * scaleY, L.APRON_W * scaleX, L.APRON_H * scaleY).fill({ color: 0x1f2f48, alpha: 0.9 }));
    // Terminal
    root.addChild(new Graphics().rect(mmX + L.TERM_SPINE_X * scaleX, mmY + L.TERM_SPINE_Y * scaleY, L.TERM_SPINE_W * scaleX, L.TERM_SPINE_H * scaleY).fill(0x6a93c2));
    root.addChild(new Graphics().rect(mmX + L.CONC_LEFT_X * scaleX, mmY + L.CONC_Y * scaleY, L.CONC_W * scaleX, L.CONC_H * scaleY).fill(0x6a93c2));
    root.addChild(new Graphics().rect(mmX + L.CONC_RIGHT_X * scaleX, mmY + L.CONC_Y * scaleY, L.CONC_W * scaleX, L.CONC_H * scaleY).fill(0x6a93c2));
    // Hangar zone
    root.addChild(new Graphics().rect(mmX + L.HZ_X * scaleX, mmY + L.HZ_Y * scaleY, L.HZ_W * scaleX, L.HZ_H * scaleY).fill(0x3a5b8a));
    // Viewport rect
    const vpX = -this.camera.x, vpY = -this.camera.y;
    const vpW = W / this.camera.zoom, vpH = H / this.camera.zoom;
    root.addChild(new Graphics().rect(mmX + vpX * scaleX, mmY + vpY * scaleY, vpW * scaleX, vpH * scaleY).stroke({ width: 2, color: 0xfde047, alpha: 0.95 }));
    const lbl = new Text({ text: "MAPA", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: "bold", fill: 0xfde047 } });
    lbl.position.set(mmX + 4, mmY + 2);
    root.addChild(lbl);
  }

  destroy(): void {
    if (!this.app) return;
    const canvas = this.app.canvas;
    canvas.removeEventListener("pointerdown", this.onCanvasPointerDown);
    window.removeEventListener("pointermove", this.onCanvasPointerMove);
    window.removeEventListener("pointerup", this.onCanvasPointerUp);
    canvas.removeEventListener("wheel", this.onCanvasWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.stopKeyboardLoop();
    this.keyState.clear();
    this.app.destroy(true, { children: true });
    if (this.target && canvas.parentNode === this.target) this.target.removeChild(canvas);
    this.app = null;
    this.layerBg = this.layerRoad = this.layerStaticLabels = this.layerSprites = this.layerMoving = this.layerOverlay = null;
    this.worldRoot = this.worldHUD = this.worldMinimap = this.worldStaticCache = this.worldDynamic = null;
    this.target = null;
    this.callbacks = {};
    this.lastState = null;
    this.cameraInitialized = false;
  }

  isMounted(): boolean { return this.app !== null; }
}

function drawShadow(parent: Container, cx: number, cy: number, r: number): void {
  parent.addChild(new Graphics().ellipse(cx, cy, r, r * 0.4).fill({ color: 0x000000, alpha: 0.28 }));
}

// ---------- Steam look (SimAirport / Two Point Hospital vibe) ----------

/** Pinta 2 edificios hangar dentro de la zona [hzX..hzW]. Cada hangar tiene cuerpo gris
 *  oscuro, tejado a dos aguas mÃ¡s claro (lÃ­nea horizontal central), portÃ³n abierto en frente,
 *  y filas de ventanas laterales. Stage 3/4 cambian opacidad (construido vs futuro). */
function drawSteamHangarsInside(parent: Container, hzX: number, hzY: number, hzW: number, hzH: number, mroStage: number): void {
  const gap = 12;
  const buildW = hzW - gap * 2;
  const buildH = (hzH - gap * 3) / 2;
  // Hangar superior (Stage 3) â€” mÃ¡s definido si stage >= 3
  drawSteamHangarBuilding(parent, hzX + gap, hzY + gap, buildW, buildH, mroStage >= 3 ? 1 : 0.35, "Stage 3");
  drawSteamHangarBuilding(parent, hzX + gap, hzY + gap * 2 + buildH, buildW, buildH, mroStage >= 4 ? 1 : 0.35, "Stage 4");
}

function drawSteamHangarBuilding(parent: Container, x: number, y: number, w: number, h: number, alpha: number, label: string): void {
  // Sombra debajo
  parent.addChild(new Graphics().rect(x + 3, y + 3, w, h).fill({ color: 0x000000, alpha: 0.35 * alpha }));
  // Cuerpo
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: 0x6b7280, alpha }).stroke({ width: 1.5, color: 0x2a2e36, alpha: 0.9 * alpha }));
  // Tejado (banda superior mÃ¡s clara, ~25% de h)
  const roofH = h * 0.28;
  parent.addChild(new Graphics().rect(x, y, w, roofH).fill({ color: 0x9aa1ad, alpha }));
  // LÃ­nea cumbrera (centro tejado)
  parent.addChild(new Graphics().moveTo(x + 4, y + roofH / 2).lineTo(x + w - 4, y + roofH / 2).stroke({ width: 1, color: 0x4a4f5a, alpha }));
  // PortÃ³n frontal (abierto) â€” rect oscuro centrado en la mitad inferior
  const doorW = w * 0.32, doorH = h * 0.42;
  parent.addChild(new Graphics().rect(x + w / 2 - doorW / 2, y + h - doorH - 6, doorW, doorH).fill({ color: 0x1f2229, alpha: 0.95 * alpha }).stroke({ width: 1, color: 0x000000, alpha }));
  // Marcos de las puertas (correderas laterales)
  parent.addChild(new Graphics().rect(x + w / 2 - doorW / 2 - 4, y + h - doorH - 6, 4, doorH).fill({ color: 0x4a4f5a, alpha }));
  parent.addChild(new Graphics().rect(x + w / 2 + doorW / 2, y + h - doorH - 6, 4, doorH).fill({ color: 0x4a4f5a, alpha }));
  // Ventanas laterales (4 ventanas pequeÃ±as en mitad de la altura)
  const wins = 5;
  const winW = (w - 16) / wins - 4;
  const winH = h * 0.12;
  for (let i = 0; i < wins; i++) {
    const wx = x + 8 + i * (winW + 4);
    parent.addChild(new Graphics().rect(wx, y + roofH + 6, winW, winH).fill({ color: 0x86c5e8, alpha: 0.7 * alpha }).stroke({ width: 1, color: 0x2a2e36, alpha }));
  }
  // Label en la cumbrera
  const t = new Text({
    text: label,
    style: { fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: "bold", fill: 0xfffaef },
  });
  t.anchor.set(0.5, 0.5);
  t.position.set(x + w / 2, y + roofH * 0.5);
  t.alpha = alpha;
  parent.addChild(t);
}

/** Oficina con porche, columnas, antena, ventanas con marco. */
function drawSteamOffice(parent: Container, x: number, y: number, w: number, h: number, night: boolean): void {
  // Sombra
  parent.addChild(new Graphics().rect(x + 3, y + 3, w, h).fill({ color: 0x000000, alpha: 0.4 }));
  // Tejado (banda crema mÃ¡s clara arriba, ~22%)
  const roofH = h * 0.22;
  parent.addChild(new Graphics().rect(x, y, w, roofH).fill(0xe8c697).stroke({ width: 1.2, color: 0x5e3818 }));
  // Cuerpo
  parent.addChild(new Graphics().rect(x, y + roofH, w, h - roofH).fill(0xd4a574).stroke({ width: 1.2, color: 0x5e3818 }));
  // Porche delante (lÃ­nea horizontal con columnas)
  const porchY = y + h - 14;
  parent.addChild(new Graphics().rect(x + 8, porchY, w - 16, 5).fill(0xc89460).stroke({ width: 1, color: 0x5e3818 }));
  // 3 columnas pequeÃ±as
  for (let i = 0; i < 3; i++) {
    const cx = x + 14 + i * ((w - 28) / 2);
    parent.addChild(new Graphics().rect(cx - 1.5, porchY + 5, 3, 8).fill(0x9c6e3c));
  }
  // Ventanas: 4 (2x2) con marco, iluminadas si noche
  const winW = 13, winH = 9, winGapX = 7, winGapY = 5;
  const winRowY = y + roofH + 6;
  const winStartX = x + 9;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const wx = winStartX + c * (winW + winGapX);
      const wy = winRowY + r * (winH + winGapY);
      parent.addChild(new Graphics().rect(wx, wy, winW, winH).fill(night ? 0xffd96b : 0x86c5e8).stroke({ width: 1, color: 0x5e3818 }));
      // Cruz del marco
      parent.addChild(
        new Graphics()
          .moveTo(wx + winW / 2, wy).lineTo(wx + winW / 2, wy + winH)
          .moveTo(wx, wy + winH / 2).lineTo(wx + winW, wy + winH / 2)
          .stroke({ width: 0.8, color: 0x5e3818, alpha: 0.7 }),
      );
    }
  }
  // Puerta de entrada centrada bajo el porche, oscura
  const doorW = 10, doorH = 16;
  parent.addChild(new Graphics().rect(x + w / 2 - doorW / 2, y + h - doorH - 1, doorW, doorH).fill(0x4a2c10).stroke({ width: 1, color: 0x000000 }));
  // Antena (lÃ­nea + cÃ­rculo)
  const antX = x + w - 12, antY1 = y - 6, antY2 = y + 4;
  parent.addChild(new Graphics().moveTo(antX, antY1).lineTo(antX, antY2).stroke({ width: 1, color: 0x2a2e36 }));
  parent.addChild(new Graphics().circle(antX, antY1, 2).fill(0xe85d75));
}

/** Furgo con cabina perfilada, ruedas, faros. */
function drawSteamVan(parent: Container, cx: number, cy: number, returning: boolean, P: ThemePalette): void {
  const w = 22, h = 11;
  const body = returning ? P.vanReturning : P.vanColor;
  // Sombra debajo
  parent.addChild(new Graphics().ellipse(cx, cy + h / 2 + 1, w / 2, 2.5).fill({ color: 0x000000, alpha: 0.35 }));
  // Cuerpo principal (caja del furgo)
  parent.addChild(new Graphics().roundRect(cx - w / 2, cy - h / 2, w, h, 2).fill(body).stroke({ width: 1, color: 0x000000, alpha: 0.6 }));
  // Cabina mÃ¡s oscura (parte delantera)
  parent.addChild(new Graphics().roundRect(cx - w / 2, cy - h / 2, w * 0.32, h, 2).fill({ color: 0x2a2e36, alpha: 0.5 }));
  // Parabrisas (vidrio claro)
  parent.addChild(new Graphics().rect(cx - w / 2 + 2, cy - h / 2 + 2, w * 0.25, h - 4).fill({ color: 0xc5e6ff, alpha: 0.8 }));
  // Ruedas (2 cÃ­rculos negros pequeÃ±os abajo)
  parent.addChild(new Graphics().circle(cx - w / 2 + 4, cy + h / 2, 1.8).fill(0x0a0a0a));
  parent.addChild(new Graphics().circle(cx + w / 2 - 4, cy + h / 2, 1.8).fill(0x0a0a0a));
  // Faros delanteros (2 puntitos amarillos)
  parent.addChild(new Graphics().circle(cx - w / 2 + 1, cy - h / 4, 1).fill(0xfff6c4));
  parent.addChild(new Graphics().circle(cx - w / 2 + 1, cy + h / 4, 1).fill(0xfff6c4));
}

/** AviÃ³n silueta top-down rico: fuselaje + alas + cola + cabina + 2 motores. */
function drawSteamAirplane(parent: Container, cx: number, cy: number, size: number, color: number, rotation: number): void {
  const fuseL = size * 0.85;
  const fuseW = size * 0.18;
  const wingSpan = size * 1.05;
  const wingW = size * 0.18;
  const tailSpan = size * 0.42;
  const tailW = size * 0.10;
  const g = new Graphics();
  // Sombra exterior sutil (silueta mÃ¡s grande detrÃ¡s, oscuro)
  g.roundRect(-fuseW / 2 - 1, -fuseL / 2, fuseW + 2, fuseL, fuseW * 0.6).fill({ color: 0x000000, alpha: 0.25 });
  g.rect(-wingSpan / 2 - 1, -wingW / 2, wingSpan + 2, wingW + 1).fill({ color: 0x000000, alpha: 0.25 });
  // Fuselaje
  g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.6).fill(color);
  // Alas
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill(color);
  // Cola
  g.rect(-tailSpan / 2, fuseL / 2 - tailW * 1.6, tailSpan, tailW).fill(color);
  // Cabina (rect oscuro frontal, ~20% del fuselaje)
  g.roundRect(-fuseW / 2 + 1, -fuseL / 2 + 2, fuseW - 2, fuseL * 0.18, fuseW * 0.4).fill({ color: 0x1a1f29, alpha: 0.85 });
  // 2 motores (Ã³valos bajo las alas)
  const engY = -wingW / 2 + wingW * 0.5;
  g.ellipse(-wingSpan * 0.3, engY, wingSpan * 0.05, wingW * 0.42).fill({ color: 0x2a2e36 });
  g.ellipse(wingSpan * 0.3, engY, wingSpan * 0.05, wingW * 0.42).fill({ color: 0x2a2e36 });
  // Highlight en el fuselaje (lÃ­nea blanca tenue centrada)
  g.moveTo(0, -fuseL / 2 + 4).lineTo(0, fuseL / 2 - 4).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
  // Borde general
  g.stroke({ width: 1, color: 0x000000, alpha: 0.45 });
  g.position.set(cx, cy);
  g.rotation = rotation;
  parent.addChild(g);
}

// ---------- Helpers: LATERAL skin ----------
function drawLateralAirplane(parent: Container, cx: number, cy: number, size: number, color: number): void {
  const fuseL = size * 0.85, fuseH = size * 0.18;
  const wingW = size * 0.32, wingH = size * 0.06;
  const tailW = size * 0.16, tailH = size * 0.36;
  const g = new Graphics();
  // Sombra
  parent.addChild(new Graphics().ellipse(cx, cy + fuseH * 0.7 + 4, fuseL / 2, 3).fill({ color: 0x000000, alpha: 0.35 }));
  // Fuselaje (rect alargado horizontal con cono frontal)
  g.roundRect(cx - fuseL / 2, cy - fuseH / 2, fuseL, fuseH, fuseH / 2).fill(color);
  // Nariz (triÃ¡ngulo redondeado a la derecha â€” asumimos aviÃ³n mira derecha)
  g.moveTo(cx + fuseL / 2 - 4, cy - fuseH / 2)
   .lineTo(cx + fuseL / 2 + 10, cy)
   .lineTo(cx + fuseL / 2 - 4, cy + fuseH / 2)
   .closePath()
   .fill(color);
  // Cabina (rect oscuro frontal)
  g.roundRect(cx + fuseL / 2 - 14, cy - fuseH / 2 + 1, 10, fuseH * 0.45, 1).fill({ color: 0x1a1f29, alpha: 0.85 });
  // Ala (vista lateral = banda fina debajo del centro)
  g.rect(cx - wingW / 2, cy - 1, wingW, wingH).fill(color);
  g.rect(cx - wingW / 2, cy + wingH, wingW * 0.7, 2).fill({ color: 0x000000, alpha: 0.3 });
  // Cola vertical (timÃ³n)
  g.moveTo(cx - fuseL / 2 + 4, cy - fuseH / 2)
   .lineTo(cx - fuseL / 2 + 10, cy - fuseH / 2 - tailH)
   .lineTo(cx - fuseL / 2 + 16, cy - fuseH / 2 - tailH)
   .lineTo(cx - fuseL / 2 + 22, cy - fuseH / 2)
   .closePath()
   .fill(color);
  // Ruedas (2 cÃ­rculos pequeÃ±os)
  g.circle(cx - fuseL * 0.15, cy + fuseH / 2 + 3, 3).fill(0x1a1a1a);
  g.circle(cx + fuseL * 0.15, cy + fuseH / 2 + 3, 3).fill(0x1a1a1a);
  // Borde
  g.stroke({ width: 1, color: 0x000000, alpha: 0.45 });
  parent.addChild(g);
}

function drawLateralPerson(parent: Container, cx: number, cy: number, color: number): void {
  // Cabeza
  parent.addChild(new Graphics().circle(cx, cy - 12, 3).fill(0xf5d6a8).stroke({ width: 0.5, color: 0x1a1a1a }));
  // Cuerpo (trapecio simple â€” rect)
  parent.addChild(new Graphics().rect(cx - 3, cy - 9, 6, 8).fill(color).stroke({ width: 0.5, color: 0x1a1a1a }));
  // Piernas
  parent.addChild(new Graphics().rect(cx - 3, cy - 1, 2.5, 4).fill(0x2a3142));
  parent.addChild(new Graphics().rect(cx + 0.5, cy - 1, 2.5, 4).fill(0x2a3142));
}

function drawLateralOffice(parent: Container, x: number, y: number, w: number, h: number, night: boolean): void {
  // Sombra
  parent.addChild(new Graphics().rect(x + 4, y + 4, w, h).fill({ color: 0x000000, alpha: 0.35 }));
  // Cuerpo (edificio 3 pisos)
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0xd4a574).stroke({ width: 1.5, color: 0x5e3818 }));
  // Tejado a dos aguas
  const roof = new Graphics();
  roof.moveTo(x - 4, y).lineTo(x + w / 2, y - 18).lineTo(x + w + 4, y).closePath();
  roof.fill(0x8a5e30).stroke({ width: 1.5, color: 0x5e3818 });
  parent.addChild(roof);
  // Ventanas en 3 filas Ã— 3 cols
  const winW = (w - 30) / 3 - 4, winH = (h - 35) / 3 - 6;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const wx = x + 10 + c * (winW + 6);
      const wy = y + 8 + r * (winH + 8);
      parent.addChild(new Graphics().rect(wx, wy, winW, winH).fill(night ? 0xffd96b : 0x86c5e8).stroke({ width: 1, color: 0x5e3818 }));
    }
  }
  // Puerta centrada abajo
  parent.addChild(new Graphics().rect(x + w / 2 - 8, y + h - 18, 16, 18).fill(0x4a2c10).stroke({ width: 1, color: 0x000000 }));
}

// ---------- Helpers: ISODIAG skin ----------
function drawIsoStrip(parent: Container, iso: (gx: number, gy: number) => Pt, gx: number, gy: number, wCells: number, hCells: number, color: number): void {
  const p0 = iso(gx, gy);
  const p1 = iso(gx + wCells, gy);
  const p2 = iso(gx + wCells, gy + hCells);
  const p3 = iso(gx, gy + hCells);
  const g = new Graphics();
  g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).closePath();
  g.fill(color).stroke({ width: 0.5, color: 0x1a1a1a, alpha: 0.3 });
  parent.addChild(g);
}

function drawIsoTileFill(parent: Container, iso: (gx: number, gy: number) => Pt, gx: number, gy: number, wCells: number, hCells: number, fill: number, stroke: number): void {
  const p0 = iso(gx, gy);
  const p1 = iso(gx + wCells, gy);
  const p2 = iso(gx + wCells, gy + hCells);
  const p3 = iso(gx, gy + hCells);
  const g = new Graphics();
  g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).closePath();
  g.fill(fill).stroke({ width: 1, color: stroke, alpha: 0.7 });
  parent.addChild(g);
}

function drawIsoBox(parent: Container, iso: (gx: number, gy: number) => Pt, gx: number, gy: number, wCells: number, hCells: number, heightUnits: number, topColor: number, sideColor1: number, sideColor2: number): void {
  // Base (rombo) + 2 caras laterales (paralelogramos) + tapa (rombo a altura)
  const heightPx = heightUnits * 26;
  const p0 = iso(gx, gy);
  const p1 = iso(gx + wCells, gy);
  const p2 = iso(gx + wCells, gy + hCells);
  const p3 = iso(gx, gy + hCells);
  const top0 = { x: p0.x, y: p0.y - heightPx };
  const top1 = { x: p1.x, y: p1.y - heightPx };
  const top2 = { x: p2.x, y: p2.y - heightPx };
  const top3 = { x: p3.x, y: p3.y - heightPx };
  // Cara derecha
  const right = new Graphics();
  right.moveTo(p1.x, p1.y).lineTo(top1.x, top1.y).lineTo(top2.x, top2.y).lineTo(p2.x, p2.y).closePath();
  right.fill(sideColor1).stroke({ width: 1, color: 0x1a1a1a, alpha: 0.6 });
  parent.addChild(right);
  // Cara izquierda
  const left = new Graphics();
  left.moveTo(p2.x, p2.y).lineTo(top2.x, top2.y).lineTo(top3.x, top3.y).lineTo(p3.x, p3.y).closePath();
  left.fill(sideColor2).stroke({ width: 1, color: 0x1a1a1a, alpha: 0.6 });
  parent.addChild(left);
  // Tapa (techo)
  const top = new Graphics();
  top.moveTo(top0.x, top0.y).lineTo(top1.x, top1.y).lineTo(top2.x, top2.y).lineTo(top3.x, top3.y).closePath();
  top.fill(topColor).stroke({ width: 1, color: 0x1a1a1a, alpha: 0.6 });
  parent.addChild(top);
}

function drawIsoAirplane(parent: Container, cx: number, cy: number, size: number, color: number): void {
  // AviÃ³n iso simplificado: rombo central (fuselaje) + 2 alas paralelogramos + cola
  const fuseL = size * 0.85, fuseW = size * 0.22;
  const wingSpan = size * 1.0, wingW = size * 0.16;
  // Sombra elÃ­ptica
  parent.addChild(new Graphics().ellipse(cx, cy + 4, fuseL / 2, fuseW / 1.5).fill({ color: 0x000000, alpha: 0.32 }));
  // Cuerpo (rombo iso: pequeÃ±o paralelogramo)
  const g = new Graphics();
  g.moveTo(cx, cy - fuseL / 2.5)
   .lineTo(cx + fuseW / 2, cy)
   .lineTo(cx, cy + fuseL / 2.5)
   .lineTo(cx - fuseW / 2, cy)
   .closePath()
   .fill(color);
  // Alas (paralelogramo mÃ¡s ancho)
  g.moveTo(cx - wingSpan / 2, cy - wingW * 0.3)
   .lineTo(cx + wingSpan / 2, cy + wingW * 0.3)
   .lineTo(cx + wingSpan / 2 - 6, cy + wingW * 0.7)
   .lineTo(cx - wingSpan / 2 + 6, cy + wingW * 0.1)
   .closePath()
   .fill(color);
  // Cola pequeÃ±a al fondo
  g.moveTo(cx, cy - fuseL / 2.5)
   .lineTo(cx - fuseW / 3, cy - fuseL / 2)
   .lineTo(cx + fuseW / 3, cy - fuseL / 2)
   .closePath()
   .fill({ color, alpha: 0.85 });
  g.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.55 });
  parent.addChild(g);
}

// ---------- Van compact para ceofull ----------
function drawSimAirportVan(parent: Container, cx: number, cy: number, returning: boolean): void {
  const w = 10, h = 6;
  parent.addChild(new Graphics().ellipse(cx, cy + h / 2 + 1, w / 2, 1.5).fill({ color: 0x000000, alpha: 0.4 }));
  parent.addChild(new Graphics().roundRect(cx - w / 2, cy - h / 2, w, h, 1).fill(returning ? 0x8b95a8 : 0xff6b6b).stroke({ width: 0.5, color: 0x000000, alpha: 0.5 }));
  parent.addChild(new Graphics().rect(cx - w / 2 + 1, cy - h / 2 + 1, 2.5, h - 2).fill({ color: 0xc5e6ff, alpha: 0.8 }));
}

// ---------- SimAirport top-down (blanco + cola color) ----------
function drawSimAirportAirplane(parent: Container, cx: number, cy: number, size: number, tailColor: number, rotation: number): void {
  // Cuerpo blanco con cola coloreada. Aviones de pasajeros estilo SimAirport.
  const fuseL = size * 0.95;
  const fuseW = size * 0.16;
  const wingSpan = size * 1.10;
  const wingW = size * 0.16;
  const tailSpan = size * 0.36;
  const tailH = size * 0.16;
  const g = new Graphics();
  // Alas (rect blanco horizontal centrado)
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill(0xeaeef2);
  // Fuselaje (cuerpo blanco redondeado)
  g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.5).fill(0xfafafa);
  // Cola (banda coloreada en la parte trasera del fuselaje)
  g.rect(-fuseW / 2, fuseL / 2 - tailH * 1.2, fuseW, tailH * 0.8).fill(tailColor);
  // Tail fin horizontal (alerÃ³n trasero)
  g.rect(-tailSpan / 2, fuseL / 2 - tailH * 0.4, tailSpan, tailH * 0.4).fill(0xeaeef2);
  // Cabina oscura en la nariz
  g.roundRect(-fuseW / 2 + 1, -fuseL / 2 + 2, fuseW - 2, fuseL * 0.15, fuseW * 0.4).fill({ color: 0x2a2e36, alpha: 0.9 });
  // Motores (2 Ã³valos grises bajo las alas)
  const engY = -wingW * 0.05;
  g.ellipse(-wingSpan * 0.28, engY, wingSpan * 0.045, wingW * 0.5).fill(0x44494f);
  g.ellipse(wingSpan * 0.28, engY, wingSpan * 0.045, wingW * 0.5).fill(0x44494f);
  // LÃ­nea fina del cuerpo (gradient subtle)
  g.moveTo(0, -fuseL / 2 + 4).lineTo(0, fuseL / 2 - 4).stroke({ width: 0.6, color: 0x9098a8, alpha: 0.6 });
  // Borde general
  g.stroke({ width: 1, color: 0x2a2e36, alpha: 0.55 });
  g.position.set(cx, cy);
  g.rotation = rotation;
  parent.addChild(g);
}

// ---------- AirportCEO top-down (blanco con sombra direccional + marcas tÃ©cnicas) ----------
function drawAirportCEOAirplane(parent: Container, cx: number, cy: number, size: number, tailColor: number, rotation: number): void {
  const fuseL = size * 0.92;
  const fuseW = size * 0.17;
  const wingSpan = size * 1.15;
  const wingW = size * 0.14;
  const tailSpan = size * 0.40;
  const tailH = size * 0.14;
  // Sombra direccional larga oscura (offset hacia abajo-derecha) â€” fuera del Graphics rotable
  const shadow = new Graphics();
  const sx = cx + size * 0.10, sy = cy + size * 0.16;
  shadow.ellipse(sx, sy, fuseL / 2, fuseW * 1.8).fill({ color: 0x000000, alpha: 0.35 });
  parent.addChild(shadow);
  const g = new Graphics();
  // Alas
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill(0xeef0f3);
  // Detalle borde alas (lÃ­nea oscura interior â€” slat marking)
  g.moveTo(-wingSpan / 2 + 2, -wingW / 2 + 2).lineTo(wingSpan / 2 - 2, -wingW / 2 + 2).stroke({ width: 0.5, color: 0x9098a8 });
  g.moveTo(-wingSpan / 2 + 2, wingW / 2 - 2).lineTo(wingSpan / 2 - 2, wingW / 2 - 2).stroke({ width: 0.5, color: 0x9098a8 });
  // Fuselaje
  g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.5).fill(0xfafafa);
  // Cola coloreada (vertical fin marcado)
  g.rect(-fuseW / 2, fuseL / 2 - tailH * 1.5, fuseW, tailH * 1.0).fill(tailColor);
  // Tail fin horizontal
  g.rect(-tailSpan / 2, fuseL / 2 - tailH * 0.5, tailSpan, tailH * 0.5).fill(0xeef0f3);
  // Cabina con curvatura
  g.roundRect(-fuseW / 2 + 1, -fuseL / 2 + 1, fuseW - 2, fuseL * 0.13, fuseW * 0.45).fill({ color: 0x1a1f29, alpha: 0.95 });
  // 2 luces nariz amarillas
  g.circle(-fuseW / 4, -fuseL / 2 + 4, 1).fill(0xfdc640);
  g.circle(fuseW / 4, -fuseL / 2 + 4, 1).fill(0xfdc640);
  // Motores (cilindros grises)
  const engY = 0;
  g.roundRect(-wingSpan * 0.32 - wingW * 0.3, engY - wingW * 0.6, wingW * 0.6, wingW * 1.2, wingW * 0.3).fill(0x3a3f47);
  g.roundRect(wingSpan * 0.32 - wingW * 0.3, engY - wingW * 0.6, wingW * 0.6, wingW * 1.2, wingW * 0.3).fill(0x3a3f47);
  // Ventanas (lÃ­nea de puntos pequeÃ±os a lo largo del fuselaje)
  for (let i = -3; i <= 3; i++) {
    g.circle(fuseW / 2 - 1, i * fuseL * 0.08, 0.5).fill({ color: 0x3a4d6a, alpha: 0.6 });
    g.circle(-fuseW / 2 + 1, i * fuseL * 0.08, 0.5).fill({ color: 0x3a4d6a, alpha: 0.6 });
  }
  // Borde general
  g.stroke({ width: 0.8, color: 0x2a2e36, alpha: 0.6 });
  g.position.set(cx, cy);
  g.rotation = rotation;
  parent.addChild(g);
}

function drawAirplaneTopDown(parent: Container, cx: number, cy: number, size: number, color: number, rotation: number, P: ThemePalette): void {
  const fuseL = size * 0.85;
  const fuseW = size * 0.16;
  const wingSpan = size * 1.05;
  const wingW = size * 0.18;
  const tailSpan = size * 0.42;
  const tailW = size * 0.10;
  const g = new Graphics();
  // Blueprint: silueta solo contorno cyan, sin relleno solido
  if (P.airplaneStrokeAlpha > 0 && P.airplaneFill === color) {
    // En blueprint el color del fill es el airplaneFill (cyan)
    g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.6).fill({ color, alpha: 0.15 });
    g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill({ color, alpha: 0.15 });
    g.rect(-tailSpan / 2, fuseL / 2 - tailW * 1.6, tailSpan, tailW).fill({ color, alpha: 0.15 });
  } else {
    g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.6).fill(color);
    g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill(color);
    g.rect(-tailSpan / 2, fuseL / 2 - tailW * 1.6, tailSpan, tailW).fill(color);
  }
  g.stroke({ width: P.airplaneStrokeAlpha > 0 ? 1.2 : 1, color: P.airplaneStrokeAlpha > 0 ? color : 0xffffff, alpha: P.airplaneStrokeAlpha > 0 ? P.airplaneStrokeAlpha : 0.5 });
  g.position.set(cx, cy);
  g.rotation = rotation;
  parent.addChild(g);
}

// ============================================================
// === CEOFULL PRO helpers ===
// ============================================================

function drawGrassNoise(parent: Container, x: number, y: number, w: number, h: number, baseColor: number): void {
  const g = new Graphics();
  for (let i = 0; i < 600; i++) {
    const px = x + ((i * 137) % w);
    const py = y + ((i * 89) % h);
    const dx = ((i * 71) % 20) - 10;
    const dy = ((i * 43) % 20) - 10;
    const tint = (i % 3 === 0) ? 0x5a7d4a : (i % 5 === 0 ? 0x3a5b2a : baseColor);
    g.circle(px + dx, py + dy, 4 + ((i * 13) % 6)).fill({ color: tint, alpha: 0.4 });
  }
  parent.addChild(g);
}

function drawCEORunway(parent: Container, x: number, y: number, w: number, h: number, night: boolean): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0x2a2e36));
  const stripeW = 14, stripeGap = 8;
  for (let i = 0; i < 12; i++) {
    const xL = x + 30 + i * (stripeW + stripeGap);
    const xR = x + w - 30 - i * (stripeW + stripeGap) - stripeW;
    parent.addChild(new Graphics().rect(xL, y + 6, stripeW, h - 12).fill({ color: 0xfafafa, alpha: 0.85 }));
    parent.addChild(new Graphics().rect(xR, y + 6, stripeW, h - 12).fill({ color: 0xfafafa, alpha: 0.85 }));
  }
  const cl = new Graphics();
  strokeDashed(cl, x + 350, y + h / 2, x + w - 350, y + h / 2, 30, 18, 4, 0xfafafa, 0.9);
  parent.addChild(cl);
  const t27 = new Text({ text: "27", style: { fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: "bold", fill: 0xfafafa } });
  t27.anchor.set(0.5); t27.position.set(x + 230, y + h / 2 - 2);
  parent.addChild(t27);
  const tL = new Text({ text: "L", style: { fontFamily: "Inter, sans-serif", fontSize: 26, fontWeight: "bold", fill: 0xfafafa } });
  tL.anchor.set(0.5); tL.position.set(x + 230, y + h / 2 + 24);
  parent.addChild(tL);
  const t09 = new Text({ text: "09", style: { fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: "bold", fill: 0xfafafa } });
  t09.anchor.set(0.5); t09.position.set(x + w - 230, y + h / 2 - 2);
  parent.addChild(t09);
  const tR = new Text({ text: "R", style: { fontFamily: "Inter, sans-serif", fontSize: 26, fontWeight: "bold", fill: 0xfafafa } });
  tR.anchor.set(0.5); tR.position.set(x + w - 230, y + h / 2 + 24);
  parent.addChild(tR);
  for (let lx = x + 60; lx < x + w - 60; lx += 30) {
    parent.addChild(new Graphics().circle(lx, y + 2, 1.5).fill({ color: 0xfde047, alpha: night ? 0.95 : 0.55 }));
    parent.addChild(new Graphics().circle(lx, y + h - 2, 1.5).fill({ color: 0xfde047, alpha: night ? 0.95 : 0.55 }));
  }
}

function drawCEOTaxiway(parent: Container, x: number, y: number, w: number, h: number, label: string, night: boolean): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0x4a525e));
  parent.addChild(new Graphics().rect(x, y, w, 3).fill(0xfdc640));
  parent.addChild(new Graphics().rect(x, y + h - 3, w, 3).fill(0xfdc640));
  parent.addChild(new Graphics().rect(x + 40, y + h / 2 - 1.5, w - 80, 3).fill({ color: 0xfdc640, alpha: 0.9 }));
  const lblBg = new Graphics().rect(x + 16, y + 4, 60, 22).fill(0x2d6e3e).stroke({ width: 1.5, color: 0xfafafa });
  parent.addChild(lblBg);
  const lbl = new Text({ text: label, style: { fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "bold", fill: 0xfafafa } });
  lbl.anchor.set(0.5); lbl.position.set(x + 46, y + 15);
  parent.addChild(lbl);
  for (let lx = x + 30; lx < x + w - 30; lx += 25) {
    parent.addChild(new Graphics().circle(lx, y + h - 1, 1).fill({ color: 0x4da3ff, alpha: night ? 0.9 : 0.5 }));
  }
}

function drawCEOPavedStrip(parent: Container, x: number, y: number, w: number, h: number, _vertical: boolean): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0x4a525e));
  parent.addChild(new Graphics().rect(x, y, 2, h).fill({ color: 0xfdc640, alpha: 0.55 }));
  parent.addChild(new Graphics().rect(x + w - 2, y, 2, h).fill({ color: 0xfdc640, alpha: 0.55 }));
}

function drawCEOTaxilane(parent: Container, x: number, y: number, w: number, h: number, night: boolean): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0x52576a));
  parent.addChild(new Graphics().rect(x, y, w, 2).fill({ color: 0xfdc640, alpha: 0.75 }));
  parent.addChild(new Graphics().rect(x, y + h - 2, w, 2).fill({ color: 0xfdc640, alpha: 0.75 }));
  const cl = new Graphics();
  strokeDashed(cl, x + 20, y + h / 2, x + w - 20, y + h / 2, 18, 12, 2.5, 0xfafafa, 0.85);
  parent.addChild(cl);
  for (let lx = x + 30; lx < x + w - 30; lx += 32) {
    parent.addChild(new Graphics().circle(lx, y + 2, 1).fill({ color: 0x4da3ff, alpha: night ? 0.9 : 0.5 }));
    parent.addChild(new Graphics().circle(lx, y + h - 2, 1).fill({ color: 0x4da3ff, alpha: night ? 0.9 : 0.5 }));
  }
}

function drawCEOConcretePavement(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0x515862));
  const noiseG = new Graphics();
  const cellSize = 24;
  for (let cy = 0; cy < h; cy += cellSize) {
    for (let cx = 0; cx < w; cx += cellSize) {
      const hash = ((cx * 73 + cy * 41) >>> 0) % 100;
      const tint = hash < 30 ? 0x4d525d : hash < 60 ? 0x565b66 : 0x4a4f5a;
      const alpha = 0.25 + (hash % 40) / 200;
      noiseG.rect(x + cx, y + cy, cellSize - 1, cellSize - 1).fill({ color: tint, alpha });
    }
  }
  parent.addChild(noiseG);
  const joinG = new Graphics();
  for (let jx = 0; jx < w; jx += 80) joinG.moveTo(x + jx, y).lineTo(x + jx, y + h);
  for (let jy = 0; jy < h; jy += 80) joinG.moveTo(x, y + jy).lineTo(x + w, y + jy);
  joinG.stroke({ width: 0.8, color: 0x2a2e36, alpha: 0.35 });
  parent.addChild(joinG);
  const stainG = new Graphics();
  for (let i = 0; i < 25; i++) {
    const sx = x + (i * 197) % w;
    const sy = y + (i * 113) % h;
    stainG.ellipse(sx, sy, 8 + (i * 3) % 16, 4 + (i * 5) % 8).fill({ color: 0x1a1c20, alpha: 0.18 + (i % 5) * 0.04 });
  }
  parent.addChild(stainG);
  parent.addChild(new Graphics().rect(x, y, w, h).stroke({ width: 2, color: 0x2a2e36 }));
}

function drawCEOTerminal(parent: Container, x: number, y: number, w: number, h: number, night: boolean): void {
  parent.addChild(new Graphics().rect(x + 4, y + 4, w, h).fill({ color: 0x000000, alpha: 0.35 }));
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0xbfc7d0).stroke({ width: 2, color: 0x2a3142 }));
  parent.addChild(new Graphics().rect(x, y + h * 0.32, w, 2).fill(0x9098a8));
  parent.addChild(new Graphics().rect(x, y + h * 0.65, w, 2).fill(0x9098a8));
  parent.addChild(new Graphics().rect(x, y, w, 6).fill(0x6e7480));
  const winColor = night ? 0xfde047 : 0x3a4d6a;
  const winColorOff = night ? 0x4a4d3a : 0x2d3a52;
  const winW = 12, winH = 14, winGapX = 6;
  for (let level = 0; level < 3; level++) {
    const levelY = y + 12 + level * (h - 18) / 3;
    const cols = Math.floor((w - 16) / (winW + winGapX));
    for (let c = 0; c < cols; c++) {
      const wx = x + 8 + c * (winW + winGapX);
      const lit = (c + level) % 4 !== 0;
      parent.addChild(new Graphics().rect(wx, levelY, winW, winH).fill(lit ? winColor : winColorOff).stroke({ width: 0.5, color: 0x2a3142 }));
    }
  }
  for (let i = 0; i < 5; i++) {
    const ax = x + w * (0.15 + i * 0.18);
    parent.addChild(new Graphics().rect(ax - 2, y - 14, 4, 14).fill(0x4a525e));
    if (i % 2 === 0) parent.addChild(new Graphics().circle(ax, y - 17, 4).fill(0xff6b6b));
    else parent.addChild(new Graphics().rect(ax - 5, y - 19, 10, 5).fill(0x6e7480));
  }
  const sign = new Graphics().roundRect(x + w / 2 - 90, y + 12, 180, 24, 2).fill(0x1a1f29).stroke({ width: 1, color: 0xfdc640 });
  parent.addChild(sign);
  const signTxt = new Text({ text: "MRO INTERNATIONAL", style: { fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "bold", fill: 0xfdc640 } });
  signTxt.anchor.set(0.5); signTxt.position.set(x + w / 2, y + 24);
  parent.addChild(signTxt);
}

function drawCEOJetBridge(parent: Container, cx: number, fromY: number, toY: number): void {
  const len = toY - fromY;
  parent.addChild(new Graphics().rect(cx - 8, fromY, 16, len).fill(0x9aa1ad).stroke({ width: 1, color: 0x2a3142 }));
  parent.addChild(new Graphics().rect(cx - 11, fromY + len * 0.4, 22, 12).fill(0x6e7480).stroke({ width: 1, color: 0x2a3142 }));
  parent.addChild(new Graphics().rect(cx - 14, toY - 6, 28, 8).fill(0x9aa1ad).stroke({ width: 1, color: 0x2a3142 }));
  parent.addChild(new Graphics().rect(cx - 6, fromY + 4, 2, len - 8).fill({ color: 0xfdc640, alpha: 0.6 }));
}

function drawCEOStandMarkings(parent: Container, x: number, y: number, w: number, h: number, label: string, active: boolean): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: 0x484d54, alpha: active ? 1 : 0.4 }));
  const cb = new Graphics();
  strokeDashed(cb, x, y, x + w, y, 12, 6, 2, 0xfdc640, active ? 0.95 : 0.4);
  strokeDashed(cb, x + w, y, x + w, y + h, 12, 6, 2, 0xfdc640, active ? 0.95 : 0.4);
  strokeDashed(cb, x + w, y + h, x, y + h, 12, 6, 2, 0xfdc640, active ? 0.95 : 0.4);
  strokeDashed(cb, x, y + h, x, y, 12, 6, 2, 0xfdc640, active ? 0.95 : 0.4);
  parent.addChild(cb);
  const num = new Text({ text: label, style: { fontFamily: "Inter, sans-serif", fontSize: 60, fontWeight: "bold", fill: { color: 0xfdc640, alpha: 0.35 } } });
  num.anchor.set(0.5); num.position.set(x + w / 2, y + h / 2);
  parent.addChild(num);
  const lbl = new Text({ text: label, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: "bold", fill: 0xfafafa } });
  lbl.position.set(x + 8, y + 4);
  parent.addChild(lbl);
  if (active) {
    parent.addChild(
      new Graphics()
        .moveTo(x + w / 2, y + 14).lineTo(x + w / 2, y + h - 30)
        .moveTo(x + w * 0.3, y + h - 30).lineTo(x + w * 0.7, y + h - 30)
        .stroke({ width: 3, color: 0xfdc640, alpha: 0.85 }),
    );
    parent.addChild(new Graphics().circle(x + w / 2, y + h - 30, 8).stroke({ width: 2, color: 0xfdc640, alpha: 0.85 }));
  } else {
    const tag = new Text({ text: "FUTURE", style: { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "bold", fill: { color: 0xff6b6b, alpha: 0.7 } } });
    tag.anchor.set(0.5); tag.position.set(x + w / 2, y + h - 30);
    parent.addChild(tag);
  }
}

function drawCEOHangarZone(parent: Container, x: number, y: number, w: number, h: number, mroStage: number, night: boolean): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: 0x484d54, alpha: 0.5 }));
  const dash = new Graphics();
  dashedRect(dash, x, y, w, h, { dash: 14, gap: 8, width: 2, color: 0xfdc640, alpha: 0.8 });
  parent.addChild(dash);
  const sign = new Graphics().roundRect(x + w / 2 - 90, y - 22, 180, 22, 2).fill(0x1a1f29).stroke({ width: 1, color: 0xfdc640 });
  parent.addChild(sign);
  const signTxt = new Text({ text: "MAINTENANCE AREA", style: { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "bold", fill: 0xfdc640 } });
  signTxt.anchor.set(0.5); signTxt.position.set(x + w / 2, y - 11);
  parent.addChild(signTxt);
  const hgap = 10;
  const hangarH = (h - hgap * 4) / 3;
  const hangarW = w - hgap * 2;
  for (let i = 0; i < 3; i++) {
    const hx = x + hgap;
    const hy = y + hgap + i * (hangarH + hgap);
    const active = i === 0 || (i === 1 && mroStage >= 3) || (i === 2 && mroStage >= 4);
    const alpha = active ? 1 : 0.4;
    parent.addChild(new Graphics().rect(hx + 3, hy + 3, hangarW, hangarH).fill({ color: 0x000000, alpha: 0.35 * alpha }));
    parent.addChild(new Graphics().rect(hx, hy, hangarW, hangarH).fill({ color: 0x6b7280, alpha }).stroke({ width: 1.5, color: 0x2a3142, alpha }));
    parent.addChild(new Graphics().rect(hx, hy, hangarW, hangarH * 0.18).fill({ color: 0x9aa1ad, alpha }));
    parent.addChild(new Graphics().moveTo(hx + 8, hy + hangarH * 0.09).lineTo(hx + hangarW - 8, hy + hangarH * 0.09).stroke({ width: 1.5, color: 0x4a4f5a, alpha }));
    const doorW = 20, doorH = hangarH * 0.55;
    parent.addChild(new Graphics().rect(hx - 1, hy + hangarH / 2 - doorH / 2, doorW, doorH).fill({ color: 0x1f2229, alpha: 0.95 * alpha }));
    parent.addChild(new Graphics().rect(hx - 3, hy + hangarH / 2 - doorH / 2, 3, doorH).fill({ color: 0x4a4f5a, alpha }));
    parent.addChild(new Graphics().rect(hx + doorW - 1, hy + hangarH / 2 - doorH / 2, 3, doorH).fill({ color: 0x4a4f5a, alpha }));
    for (let wi = 0; wi < 6; wi++) {
      const wx = hx + hangarW * 0.25 + wi * 30;
      parent.addChild(new Graphics().rect(wx, hy + hangarH * 0.3, 22, 16).fill({ color: night ? 0xfde047 : 0x86c5e8, alpha: 0.85 * alpha }).stroke({ width: 0.6, color: 0x2a2e36, alpha }));
    }
    const lbl = new Text({
      text: i === 0 ? "HANGAR 1" : i === 1 ? "HANGAR 2  Â·  Stage 3" : "HANGAR 3  Â·  Stage 4",
      style: { fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "bold", fill: active ? 0xfafafa : 0x9098a8 },
    });
    lbl.anchor.set(0.5, 0.5); lbl.position.set(hx + hangarW / 2 + 30, hy + hangarH / 2);
    parent.addChild(lbl);
    if (!active) {
      const cost = new Text({
        text: i === 1 ? "500.000 â‚¬" : "1.500.000 â‚¬",
        style: { fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: "bold", fill: 0xfdc640 },
      });
      cost.anchor.set(0.5, 0.5); cost.position.set(hx + hangarW / 2 + 30, hy + hangarH / 2 + 22);
      parent.addChild(cost);
    }
  }
}

function drawCEOOpsBuildings(parent: Container, x: number, y: number, w: number, h: number, idle: number, total: number, night: boolean): void {
  const ofH = h * 0.30;
  parent.addChild(new Graphics().rect(x + 4, y + 4, w, ofH).fill({ color: 0x000000, alpha: 0.3 }));
  parent.addChild(new Graphics().rect(x, y, w, ofH).fill(0xd4a574).stroke({ width: 1.5, color: 0x5e3818 }));
  parent.addChild(new Graphics().rect(x, y, w, 6).fill(0xe8c697));
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 6; c++) {
      const wx = x + 6 + c * (w - 12) / 6;
      const wy = y + 14 + r * (ofH - 24) / 2;
      const winW = (w - 24) / 6;
      const winH = (ofH - 30) / 2;
      parent.addChild(new Graphics().rect(wx, wy, winW, winH).fill(night ? 0xffd96b : 0x86c5e8).stroke({ width: 0.5, color: 0x5e3818 }));
    }
  }
  const sign = new Graphics().roundRect(x + w / 2 - 70, y - 18, 140, 18, 2).fill(0x1a1f29);
  parent.addChild(sign);
  const signTxt = new Text({ text: "OFICINA MECS", style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "bold", fill: 0xfafafa } });
  signTxt.anchor.set(0.5); signTxt.position.set(x + w / 2, y - 9);
  parent.addChild(signTxt);
  const cnt = new Text({ text: `${idle} / ${total}`, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 24, fontWeight: "bold", fill: 0xfafafa } });
  cnt.anchor.set(0.5); cnt.position.set(x + w / 2, y + ofH + 18);
  parent.addChild(cnt);
  const cntLbl = new Text({ text: "DISPONIBLES / TOTAL", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: 0xb8bfca } });
  cntLbl.anchor.set(0.5); cntLbl.position.set(x + w / 2, y + ofH + 34);
  parent.addChild(cntLbl);

  const tcY = y + ofH + 60;
  const tcW = 36, tcH = h - ofH - 180;
  const tcX = x + w * 0.20 - tcW / 2;
  parent.addChild(new Graphics().rect(tcX + 3, tcY + 3, tcW, tcH).fill({ color: 0x000000, alpha: 0.35 }));
  parent.addChild(new Graphics().rect(tcX, tcY, tcW, tcH).fill(0xbfc7d0).stroke({ width: 1.5, color: 0x2a3142 }));
  parent.addChild(new Graphics().rect(tcX - 8, tcY - 18, tcW + 16, 22).fill(night ? 0xfde047 : 0x3a4d6a).stroke({ width: 1.5, color: 0x2a3142 }));
  parent.addChild(new Graphics().rect(tcX + tcW / 2 - 1, tcY - 50, 2, 32).fill(0x2a3142));
  parent.addChild(new Graphics().circle(tcX + tcW / 2, tcY - 52, 3).fill(0xff3b3b));
  const tcLbl = new Text({ text: "ATC", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: "bold", fill: 0x2a3142 } });
  tcLbl.anchor.set(0.5); tcLbl.position.set(tcX + tcW / 2, tcY + tcH / 2);
  parent.addChild(tcLbl);

  const fuelY = tcY + 16;
  const fuelW = w * 0.55, fuelH = tcH * 0.75;
  const fuelX = x + w - fuelW - 8;
  parent.addChild(new Graphics().rect(fuelX + 3, fuelY + 3, fuelW, fuelH).fill({ color: 0x000000, alpha: 0.3 }));
  parent.addChild(new Graphics().rect(fuelX, fuelY, fuelW, fuelH).fill(0x484d54).stroke({ width: 1.5, color: 0x2a2e36 }));
  for (let i = 0; i < 4; i++) {
    const tx = fuelX + 8 + i * (fuelW - 16) / 4;
    const tw = (fuelW - 24) / 4;
    parent.addChild(new Graphics().roundRect(tx, fuelY + 8, tw, fuelH - 30, 3).fill(0xfdc640).stroke({ width: 1, color: 0x000000 }));
    parent.addChild(new Graphics().circle(tx + tw * 0.2, fuelY + fuelH - 14, 4).fill(0x1a1a1a));
    parent.addChild(new Graphics().circle(tx + tw * 0.8, fuelY + fuelH - 14, 4).fill(0x1a1a1a));
    parent.addChild(new Graphics().rect(tx + tw - 4, fuelY + 12, 3, fuelH - 36).fill(0xb8901c));
    const lbl = new Text({ text: "JET-A1", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 8, fontWeight: "bold", fill: 0x000000 } });
    lbl.anchor.set(0.5); lbl.position.set(tx + tw / 2, fuelY + fuelH / 2 - 10);
    parent.addChild(lbl);
  }
  const fuelSign = new Text({ text: "FUEL FARM", style: { fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "bold", fill: 0xfafafa } });
  fuelSign.anchor.set(0.5); fuelSign.position.set(fuelX + fuelW / 2, fuelY - 8);
  parent.addChild(fuelSign);

  const pkY = fuelY + fuelH + 24;
  const pkH = y + h - pkY - 8;
  parent.addChild(new Graphics().rect(x, pkY, w, pkH).fill(0x3a3e48).stroke({ width: 1, color: 0x2a2e36 }));
  const slots = 12;
  for (let i = 1; i < slots; i++) {
    const lx = x + (w / slots) * i;
    parent.addChild(new Graphics().rect(lx - 0.5, pkY + 4, 1, pkH - 8).fill({ color: 0xfafafa, alpha: 0.5 }));
  }
  const carColors = [0xff6b6b, 0x4da3ff, 0xfafafa, 0xfde047, 0x3fb950, 0xa78bfa, 0xff9f43, 0x8b95a8];
  for (let i = 0; i < 10; i++) {
    const cx = x + (w / slots) * (i + 0.5);
    const cy = pkY + pkH / 2;
    const color = carColors[i % carColors.length];
    parent.addChild(new Graphics().rect(cx - 9, cy - 12, 18, 24).fill(color).stroke({ width: 0.6, color: 0x1a1a1a }));
    parent.addChild(new Graphics().rect(cx - 6, cy - 10, 12, 6).fill({ color: 0xc5e6ff, alpha: 0.8 }));
    parent.addChild(new Graphics().rect(cx - 6, cy + 4, 12, 6).fill({ color: 0x000000, alpha: 0.3 }));
  }
  const pkSign = new Text({ text: "STAFF PARKING", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: "bold", fill: 0xfafafa } });
  pkSign.anchor.set(0.5); pkSign.position.set(x + w / 2, pkY - 6);
  parent.addChild(pkSign);
}

type CEOLayoutShape = { APRON_X: number; APRON_Y: number; APRON_W: number; APRON_H: number };
function drawCEOVegetation(parent: Container, L: CEOLayoutShape): void {
  const g = new Graphics();
  for (let i = 0; i < 80; i++) {
    const side = i % 4;
    let bx = 0, by = 0;
    if (side === 0) { bx = L.APRON_X + (i * 197) % L.APRON_W; by = L.APRON_Y - 24 - ((i * 13) % 12); }
    else if (side === 1) { bx = L.APRON_X + L.APRON_W + 18 + ((i * 13) % 24); by = L.APRON_Y + (i * 211) % L.APRON_H; }
    else if (side === 2) { bx = L.APRON_X + (i * 251) % L.APRON_W; by = L.APRON_Y + L.APRON_H + 18 + ((i * 17) % 30); }
    else { bx = L.APRON_X - 24 - ((i * 11) % 28); by = L.APRON_Y + (i * 173) % L.APRON_H; }
    g.circle(bx, by, 6 + (i % 4)).fill(0x2c5e26);
    g.circle(bx - 3, by - 2, 4).fill(0x3f7d33);
  }
  parent.addChild(g);
}

function drawCEORealisticAirplane(parent: Container, cx: number, cy: number, size: number, liveryColor: number, rotation: number, _night: boolean): void {
  const fuseL = size * 0.95;
  const fuseW = size * 0.16;
  const wingSpan = size * 1.20;
  const wingW = size * 0.16;
  const tailSpan = size * 0.40;
  const tailW = size * 0.10;
  const shadow = new Graphics();
  const offX = size * 0.08, offY = size * 0.15;
  shadow.ellipse(cx + offX, cy + offY, fuseL / 2, fuseW * 2.5).fill({ color: 0x000000, alpha: 0.38 });
  parent.addChild(shadow);
  const g = new Graphics();
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill(0xeef0f3);
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, 2).fill(0xfafafa);
  g.rect(-wingSpan / 2 + 4, wingW / 2 - 3, wingSpan - 8, 3).fill({ color: 0x9098a8, alpha: 0.8 });
  g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.5).fill(0xfafafa);
  g.rect(-fuseW / 2 + 1, -fuseL * 0.20, fuseW - 2, fuseL * 0.04).fill(liveryColor);
  g.roundRect(-fuseW / 2, fuseL / 2 - tailW * 2, fuseW, tailW * 1.5, fuseW * 0.4).fill(liveryColor);
  g.rect(-tailSpan / 2, fuseL / 2 - tailW * 0.4, tailSpan, tailW * 0.5).fill(0xeef0f3);
  g.roundRect(-fuseW / 2 + 1, -fuseL / 2 + 1, fuseW - 2, fuseL * 0.13, fuseW * 0.5).fill({ color: 0x1a1f29, alpha: 0.95 });
  g.circle(-fuseW * 0.20, -fuseL / 2 + 2, 0.8).fill(0xfdc640);
  g.circle(fuseW * 0.20, -fuseL / 2 + 2, 0.8).fill(0xfdc640);
  const engX = wingSpan * 0.32;
  g.roundRect(-engX - wingW * 0.32, -wingW * 0.6, wingW * 0.65, wingW * 1.4, wingW * 0.32).fill(0x3a3f47);
  g.roundRect(engX - wingW * 0.32, -wingW * 0.6, wingW * 0.65, wingW * 1.4, wingW * 0.32).fill(0x3a3f47);
  g.circle(-engX, -wingW * 0.5, wingW * 0.22).fill({ color: 0x1a1a1a, alpha: 0.8 });
  g.circle(engX, -wingW * 0.5, wingW * 0.22).fill({ color: 0x1a1a1a, alpha: 0.8 });
  const winCount = 12;
  for (let i = 0; i < winCount; i++) {
    const wy = -fuseL * 0.32 + i * (fuseL * 0.55) / winCount;
    g.circle(fuseW / 2 - 1.5, wy, 0.7).fill({ color: 0x3a4d6a, alpha: 0.85 });
    g.circle(-fuseW / 2 + 1.5, wy, 0.7).fill({ color: 0x3a4d6a, alpha: 0.85 });
  }
  g.stroke({ width: 0.6, color: 0x2a2e36, alpha: 0.55 });
  g.position.set(cx, cy);
  g.rotation = rotation;
  parent.addChild(g);
}

function drawCEOVan(parent: Container, cx: number, cy: number, heading: number, returning: boolean): void {
  const w = 26, h = 14;
  const g = new Graphics();
  g.ellipse(2, 3, w / 2, h * 0.7).fill({ color: 0x000000, alpha: 0.4 });
  g.roundRect(-w / 2, -h / 2, w, h, 2).fill(returning ? 0x8b95a8 : 0xff6b6b).stroke({ width: 0.8, color: 0x000000, alpha: 0.6 });
  g.rect(-w / 2 + 1, -h / 2 + 1, w * 0.32, h - 2).fill({ color: 0x2a2e36, alpha: 0.55 });
  g.rect(-w / 2 + 2, -h / 2 + 2, w * 0.26, h - 4).fill({ color: 0xc5e6ff, alpha: 0.85 });
  g.circle(-w / 2 + 5, -h / 2, 2).fill(0x0a0a0a);
  g.circle(-w / 2 + 5, h / 2, 2).fill(0x0a0a0a);
  g.circle(w / 2 - 5, -h / 2, 2).fill(0x0a0a0a);
  g.circle(w / 2 - 5, h / 2, 2).fill(0x0a0a0a);
  g.circle(-w / 2 + 0.5, -h * 0.25, 1).fill(0xfff6c4);
  g.circle(-w / 2 + 0.5, h * 0.25, 1).fill(0xfff6c4);
  g.circle(w / 2 - 0.5, 0, 1).fill(0xff6b6b);
  g.position.set(cx, cy);
  g.rotation = heading + Math.PI / 2;
  parent.addChild(g);
}

// ============================================================
// === HUGE skin helpers (Bus Manager style â€” azul tÃ©cnico) ==
// ============================================================

// Paleta huge
const HUGE = {
  rwy: 0x3a5b8a,
  rwyStripe: 0xe6ecf5,
  twy: 0x2a4366,
  twyStripe: 0xfde047,
  apron: 0x1f2f48,
  apronStroke: 0x3a5b8a,
  building: 0x4a7daa,
  buildingDark: 0x355d85,
  buildingShadow: 0x1a2d4a,
  gate: 0x2a4569,
  gateStroke: 0x6a93c2,
  terminal: 0x6a93c2,
  terminalDark: 0x4a7daa,
  hangar: 0x5a85b5,
  hangarDark: 0x3a6090,
  road: 0x1a2d4a,
  roadStripe: 0xe6ecf5,
  vegetation: 0x1a3a26,
  text: 0xe6ecf5,
  textMuted: 0x7a93b8,
  shadow: 0x000000,
};

function drawHugeRunway(parent: Container, x: number, y: number, w: number, h: number, label27: string, label09: string): void {
  // Sombra
  parent.addChild(new Graphics().rect(x + 80, y + 80, w, h).fill({ color: HUGE.shadow, alpha: 0.35 }));
  // Cuerpo pista
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.rwy).stroke({ width: 8, color: HUGE.rwyStripe, alpha: 0.6 }));
  // Centerline blanco discontinuo
  const cl = new Graphics();
  strokeDashed(cl, x + 200, y + h / 2, x + w - 200, y + h / 2, 240, 160, 14, HUGE.rwyStripe, 0.85);
  parent.addChild(cl);
  // Threshold a cada extremo (8 bandas blancas paralelas)
  for (let i = 0; i < 8; i++) {
    const xL = x + 250 + i * 130;
    const xR = x + w - 250 - i * 130 - 80;
    parent.addChild(new Graphics().rect(xL, y + 60, 80, h - 120).fill({ color: HUGE.rwyStripe, alpha: 0.9 }));
    parent.addChild(new Graphics().rect(xR, y + 60, 80, h - 120).fill({ color: HUGE.rwyStripe, alpha: 0.9 }));
  }
  // NÃºmeros cabeceras enormes
  const t27 = new Text({ text: label27, style: { fontFamily: "Inter, sans-serif", fontSize: 280, fontWeight: "bold", fill: HUGE.rwyStripe } });
  t27.anchor.set(0.5); t27.position.set(x + 1500, y + h / 2);
  parent.addChild(t27);
  const t09 = new Text({ text: label09, style: { fontFamily: "Inter, sans-serif", fontSize: 280, fontWeight: "bold", fill: HUGE.rwyStripe } });
  t09.anchor.set(0.5); t09.position.set(x + w - 1500, y + h / 2);
  parent.addChild(t09);
}

function drawHugeTaxiway(parent: Container, x: number, y: number, w: number, h: number, label: string): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.twy));
  parent.addChild(new Graphics().rect(x, y, w, 12).fill(HUGE.twyStripe));
  parent.addChild(new Graphics().rect(x, y + h - 12, w, 12).fill(HUGE.twyStripe));
  // Centerline amarillo continuo
  parent.addChild(new Graphics().rect(x + 300, y + h / 2 - 6, w - 600, 12).fill(HUGE.twyStripe));
  // Label cartel verde (cada 8000 unidades)
  for (let cx = x + 1500; cx < x + w - 1500; cx += 9000) {
    const bg = new Graphics().rect(cx, y + h + 60, 480, 200).fill(0x2d6e3e).stroke({ width: 6, color: HUGE.text });
    parent.addChild(bg);
    const t = new Text({ text: label, style: { fontFamily: "Inter, sans-serif", fontSize: 140, fontWeight: "bold", fill: HUGE.text } });
    t.anchor.set(0.5); t.position.set(cx + 240, y + h + 160);
    parent.addChild(t);
  }
}

function drawHugeConnector(parent: Container, cx: number, fromY: number, height: number, width: number): void {
  parent.addChild(new Graphics().rect(cx - width / 2, fromY, width, height).fill(HUGE.twy));
  parent.addChild(new Graphics().rect(cx - 4, fromY + 30, 8, height - 60).fill({ color: HUGE.twyStripe, alpha: 0.85 }));
}

function drawHugeTerminal(parent: Container, x: number, y: number, w: number, h: number, label: string, night: boolean): void {
  // Sombra
  parent.addChild(new Graphics().rect(x + 60, y + 60, w, h).fill({ color: HUGE.shadow, alpha: 0.45 }));
  // Cuerpo
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.terminal).stroke({ width: 8, color: HUGE.buildingDark }));
  // Borde superior mÃ¡s claro (cenital highlight)
  parent.addChild(new Graphics().rect(x, y, w, 60).fill({ color: 0x86abd4, alpha: 0.6 }));
  // LÃ­neas tÃ©cnicas dentro (filas paralelas a lo largo del eje largo)
  const rows = Math.max(3, Math.floor(h / 600));
  for (let r = 0; r < rows; r++) {
    const ry = y + (h / rows) * (r + 0.5);
    parent.addChild(new Graphics().rect(x + 80, ry - 3, w - 160, 6).fill({ color: HUGE.buildingDark, alpha: 0.55 }));
  }
  // Label arriba (cartel)
  const bg = new Graphics().rect(x + w / 2 - 1200, y - 280, 2400, 200).fill({ color: 0x0a1a2e, alpha: 0.95 }).stroke({ width: 4, color: HUGE.text });
  parent.addChild(bg);
  const t = new Text({ text: label, style: { fontFamily: "Inter, sans-serif", fontSize: 130, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 180);
  parent.addChild(t);
  // PequeÃ±as ventanas iluminadas si night
  if (night) {
    const winCount = Math.floor(w / 80);
    for (let i = 0; i < winCount; i++) {
      if (i % 3 === 0) continue;
      const wx = x + 20 + i * 80;
      parent.addChild(new Graphics().rect(wx, y + 100, 50, 30).fill({ color: 0xfde047, alpha: 0.7 }));
    }
  }
}

function drawHugeGate(parent: Container, x: number, y: number, w: number, h: number, label: string, active: boolean): void {
  // Stand pavimento
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: HUGE.gate, alpha: active ? 1 : 0.45 }).stroke({ width: 6, color: HUGE.gateStroke, alpha: active ? 0.95 : 0.4 }));
  // Borde amarillo dashed
  const cb = new Graphics();
  strokeDashed(cb, x, y, x + w, y, 80, 40, 8, HUGE.twyStripe, active ? 0.9 : 0.35);
  strokeDashed(cb, x + w, y, x + w, y + h, 80, 40, 8, HUGE.twyStripe, active ? 0.9 : 0.35);
  strokeDashed(cb, x + w, y + h, x, y + h, 80, 40, 8, HUGE.twyStripe, active ? 0.9 : 0.35);
  strokeDashed(cb, x, y + h, x, y, 80, 40, 8, HUGE.twyStripe, active ? 0.9 : 0.35);
  parent.addChild(cb);
  // NÃºmero enorme
  const num = new Text({ text: label, style: { fontFamily: "Inter, sans-serif", fontSize: 400, fontWeight: "bold", fill: { color: HUGE.twyStripe, alpha: 0.30 } } });
  num.anchor.set(0.5); num.position.set(x + w / 2, y + h / 2);
  parent.addChild(num);
  // Label compacto esquina sup-izq
  const lbl = new Text({ text: label, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 100, fontWeight: "bold", fill: HUGE.text } });
  lbl.position.set(x + 40, y + 20);
  parent.addChild(lbl);
  // Parking guidance T-shape
  if (active) {
    parent.addChild(
      new Graphics()
        .moveTo(x + w / 2, y + 100).lineTo(x + w / 2, y + h - 200)
        .moveTo(x + w * 0.25, y + h - 200).lineTo(x + w * 0.75, y + h - 200)
        .stroke({ width: 16, color: HUGE.twyStripe, alpha: 0.9 }),
    );
    parent.addChild(new Graphics().circle(x + w / 2, y + h - 200, 60).stroke({ width: 12, color: HUGE.twyStripe, alpha: 0.9 }));
  } else {
    const tag = new Text({ text: "FUTURE", style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: "bold", fill: { color: 0xff6b6b, alpha: 0.65 } } });
    tag.anchor.set(0.5); tag.position.set(x + w / 2, y + h - 200);
    parent.addChild(tag);
  }
}

function drawHugeJetBridge(parent: Container, fromX: number, fromY: number, toX: number, toY: number): void {
  const len = Math.hypot(toX - fromX, toY - fromY);
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const g = new Graphics();
  const width = 80;
  // Body
  g.rect(0, -width / 2, len, width).fill(HUGE.hangar).stroke({ width: 4, color: HUGE.buildingDark });
  // ArticulaciÃ³n
  g.rect(len * 0.4, -width / 2 - 20, 60, width + 40).fill(HUGE.hangarDark);
  // Cabezal final (acoplamiento)
  g.rect(len - 60, -width / 2 - 20, 60, width + 40).fill(HUGE.hangar).stroke({ width: 4, color: HUGE.buildingDark });
  // Tubo amarillo decorativo a lo largo
  g.rect(0, -8, len, 16).fill({ color: HUGE.twyStripe, alpha: 0.5 });
  g.position.set(fromX, fromY);
  g.rotation = angle;
  parent.addChild(g);
}

function drawHugeRemote(parent: Container, x: number, y: number, w: number, h: number, label: string): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: HUGE.gate, alpha: 0.5 }).stroke({ width: 4, color: HUGE.gateStroke, alpha: 0.5 }));
  const cb = new Graphics();
  strokeDashed(cb, x, y, x + w, y, 60, 30, 6, HUGE.twyStripe, 0.5);
  strokeDashed(cb, x + w, y, x + w, y + h, 60, 30, 6, HUGE.twyStripe, 0.5);
  strokeDashed(cb, x + w, y + h, x, y + h, 60, 30, 6, HUGE.twyStripe, 0.5);
  strokeDashed(cb, x, y + h, x, y, 60, 30, 6, HUGE.twyStripe, 0.5);
  parent.addChild(cb);
  const num = new Text({ text: label, style: { fontFamily: "Inter, sans-serif", fontSize: 300, fontWeight: "bold", fill: { color: HUGE.twyStripe, alpha: 0.18 } } });
  num.anchor.set(0.5); num.position.set(x + w / 2, y + h / 2);
  parent.addChild(num);
  const lbl = new Text({ text: label, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 80, fontWeight: "bold", fill: HUGE.textMuted } });
  lbl.position.set(x + 30, y + 20);
  parent.addChild(lbl);
}

function drawHugeHangarZone(parent: Container, x: number, y: number, w: number, h: number, mroStage: number): void {
  // Fondo + dashed border zona
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: HUGE.apron, alpha: 0.7 }));
  const dash = new Graphics();
  dashedRect(dash, x, y, w, h, { dash: 120, gap: 60, width: 14, color: HUGE.twyStripe, alpha: 0.85 });
  parent.addChild(dash);
  // Cartel "MAINTENANCE"
  const bg = new Graphics().rect(x + w / 2 - 1400, y - 280, 2800, 200).fill({ color: 0x0a1a2e, alpha: 0.95 }).stroke({ width: 4, color: HUGE.twyStripe });
  parent.addChild(bg);
  const t = new Text({ text: "MAINTENANCE AREA", style: { fontFamily: "Inter, sans-serif", fontSize: 130, fontWeight: "bold", fill: HUGE.twyStripe } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 180);
  parent.addChild(t);
  // 5 hangares
  const hgap = 200;
  const hangarH = (h - hgap * 6) / 5;
  const hangarW = w - hgap * 2;
  for (let i = 0; i < 5; i++) {
    const hx = x + hgap;
    const hy = y + hgap + i * (hangarH + hgap);
    const active = i === 0 || i === 1 || (i === 2 && mroStage >= 3) || (i === 3 && mroStage >= 4) || (i === 4 && mroStage >= 4);
    const alpha = active ? 1 : 0.35;
    // Sombra
    parent.addChild(new Graphics().rect(hx + 30, hy + 30, hangarW, hangarH).fill({ color: HUGE.shadow, alpha: 0.4 * alpha }));
    // Cuerpo
    parent.addChild(new Graphics().rect(hx, hy, hangarW, hangarH).fill({ color: HUGE.hangar, alpha }).stroke({ width: 8, color: HUGE.hangarDark, alpha }));
    // Borde superior highlight
    parent.addChild(new Graphics().rect(hx, hy, hangarW, 80).fill({ color: 0x86abd4, alpha: 0.55 * alpha }));
    // PortÃ³n frontal
    const doorW = 200, doorH = hangarH * 0.55;
    parent.addChild(new Graphics().rect(hx - 30, hy + hangarH / 2 - doorH / 2, doorW, doorH).fill({ color: HUGE.shadow, alpha: 0.85 * alpha }).stroke({ width: 4, color: HUGE.buildingDark, alpha }));
    // Label
    const lbl = new Text({
      text: i === 0 ? "HANGAR 1" : i === 1 ? "HANGAR 2" : i === 2 ? "HANGAR 3 Â· S3" : i === 3 ? "HANGAR 4 Â· S4" : "HANGAR 5 Â· S4",
      style: { fontFamily: "Inter, sans-serif", fontSize: 130, fontWeight: "bold", fill: active ? HUGE.text : HUGE.textMuted },
    });
    lbl.anchor.set(0.5); lbl.position.set(hx + hangarW / 2, hy + hangarH / 2);
    parent.addChild(lbl);
    if (!active) {
      const cost = new Text({
        text: i === 2 ? "500.000 â‚¬" : i === 3 ? "1.500.000 â‚¬" : "1.500.000 â‚¬",
        style: { fontFamily: "JetBrains Mono, monospace", fontSize: 100, fontWeight: "bold", fill: HUGE.twyStripe },
      });
      cost.anchor.set(0.5); cost.position.set(hx + hangarW / 2, hy + hangarH / 2 + 160);
      parent.addChild(cost);
    }
  }
}

function drawHugeCargoTerminal(parent: Container, x: number, y: number, w: number, h: number, night: boolean): void {
  parent.addChild(new Graphics().rect(x + 60, y + 60, w, h).fill({ color: HUGE.shadow, alpha: 0.4 }));
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.building).stroke({ width: 8, color: HUGE.buildingDark }));
  parent.addChild(new Graphics().rect(x, y, w, 60).fill({ color: 0x86abd4, alpha: 0.55 }));
  // Letrero
  const bg = new Graphics().rect(x + w / 2 - 1100, y - 240, 2200, 180).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "CARGO TERMINAL", style: { fontFamily: "Inter, sans-serif", fontSize: 120, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 150);
  parent.addChild(t);
  // 5 puertas de carga (rectÃ¡ngulos oscuros en la cara sur)
  const doorN = 5;
  const doorW = (w - 200) / doorN;
  for (let i = 0; i < doorN; i++) {
    const dx = x + 100 + i * doorW;
    parent.addChild(new Graphics().rect(dx + 40, y + h - 200, doorW - 80, 180).fill({ color: HUGE.shadow, alpha: 0.8 }).stroke({ width: 4, color: HUGE.buildingDark }));
  }
}

function drawHugeOpsBuildings(parent: Container, x: number, y: number, w: number, h: number, idle: number, total: number, night: boolean): void {
  // Oficina mecs (top 30%)
  const ofH = h * 0.30;
  parent.addChild(new Graphics().rect(x + 60, y + 60, w, ofH).fill({ color: HUGE.shadow, alpha: 0.4 }));
  parent.addChild(new Graphics().rect(x, y, w, ofH).fill(HUGE.building).stroke({ width: 8, color: HUGE.buildingDark }));
  parent.addChild(new Graphics().rect(x, y, w, 50).fill({ color: 0x86abd4, alpha: 0.5 }));
  const bg = new Graphics().rect(x + w / 2 - 900, y - 220, 1800, 160).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "OFICINA MECS", style: { fontFamily: "Inter, sans-serif", fontSize: 110, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 140);
  parent.addChild(t);
  // Contador grande
  const cnt = new Text({ text: `${idle} / ${total}`, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 240, fontWeight: "bold", fill: HUGE.text } });
  cnt.anchor.set(0.5); cnt.position.set(x + w / 2, y + ofH / 2);
  parent.addChild(cnt);

  // Fuel farm (mitad inferior)
  const fY = y + ofH + 400;
  const fH = h - ofH - 600;
  parent.addChild(new Graphics().rect(x + 60, fY + 60, w, fH).fill({ color: HUGE.shadow, alpha: 0.4 }));
  parent.addChild(new Graphics().rect(x, fY, w, fH).fill(HUGE.buildingDark).stroke({ width: 8, color: HUGE.buildingShadow }));
  const fSign = new Graphics().rect(x + w / 2 - 700, fY - 200, 1400, 150).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(fSign);
  const ft = new Text({ text: "FUEL FARM", style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: "bold", fill: HUGE.twyStripe } });
  ft.anchor.set(0.5); ft.position.set(x + w / 2, fY - 125);
  parent.addChild(ft);
  // 4 cisternas redondas
  for (let i = 0; i < 4; i++) {
    const cx = x + 300 + i * ((w - 600) / 3);
    const cy = fY + fH / 2;
    parent.addChild(new Graphics().circle(cx, cy, 280).fill({ color: HUGE.twyStripe, alpha: 0.85 }).stroke({ width: 6, color: HUGE.buildingShadow }));
    parent.addChild(new Graphics().circle(cx, cy, 280).stroke({ width: 12, color: HUGE.buildingShadow, alpha: 0.4 }));
    const tnk = new Text({ text: "JET-A1", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 50, fontWeight: "bold", fill: HUGE.shadow } });
    tnk.anchor.set(0.5); tnk.position.set(cx, cy);
    parent.addChild(tnk);
  }
}

function drawHugeATC(parent: Container, x: number, y: number, night: boolean): void {
  const tW = 400, tH = 1600;
  parent.addChild(new Graphics().rect(x + 60, y + 60, tW, tH).fill({ color: HUGE.shadow, alpha: 0.4 }));
  parent.addChild(new Graphics().rect(x, y, tW, tH).fill(HUGE.building).stroke({ width: 8, color: HUGE.buildingDark }));
  // Cabina vidriada arriba
  parent.addChild(new Graphics().rect(x - 80, y - 200, tW + 160, 240).fill(night ? 0xfde047 : 0x3a4d6a).stroke({ width: 8, color: HUGE.buildingDark }));
  parent.addChild(new Graphics().rect(x - 100, y - 220, tW + 200, 40).fill(HUGE.buildingDark));
  // Antena central
  parent.addChild(new Graphics().rect(x + tW / 2 - 8, y - 600, 16, 380).fill(HUGE.buildingDark));
  parent.addChild(new Graphics().circle(x + tW / 2, y - 620, 24).fill(0xff6b6b));
  // Label ATC
  const lbl = new Text({ text: "ATC", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 100, fontWeight: "bold", fill: HUGE.text } });
  lbl.anchor.set(0.5); lbl.position.set(x + tW / 2, y + tH / 2);
  parent.addChild(lbl);
}

function drawHugeParking(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0x1a2d3e).stroke({ width: 4, color: HUGE.buildingDark }));
  const bg = new Graphics().rect(x + w / 2 - 800, y - 220, 1600, 150).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "STAFF PARKING", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 100, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 145);
  parent.addChild(t);
  // Marcas de plazas (lÃ­neas verticales blancas)
  const slotW = 120, rows = Math.floor(h / 280);
  const slots = Math.floor(w / slotW);
  for (let r = 0; r < rows; r++) {
    const ry = y + 100 + r * 280;
    for (let i = 1; i < slots; i++) {
      parent.addChild(new Graphics().rect(x + i * slotW - 1, ry, 2, 240).fill({ color: HUGE.roadStripe, alpha: 0.5 }));
    }
  }
  // Coches (mucho menos detalle, sÃ³lo rect azulados)
  const carPalette = [0x4a7daa, 0xb84a4a, 0x4ab84a, 0xfdc640, 0x9098a8, 0xeef0f3];
  for (let r = 0; r < rows; r++) {
    const ry = y + 100 + r * 280 + 30;
    for (let i = 0; i < slots; i++) {
      if ((i + r) % 4 === 0) continue;
      const cx = x + i * slotW + slotW / 2;
      const color = carPalette[(i * 7 + r * 3) % carPalette.length];
      parent.addChild(new Graphics().rect(cx - 40, ry, 80, 160).fill(color).stroke({ width: 2, color: HUGE.shadow }));
      parent.addChild(new Graphics().rect(cx - 30, ry + 10, 60, 50).fill({ color: 0xc5e6ff, alpha: 0.8 }));
    }
  }
}

function drawHugeAccessRoads(parent: Container, L: any): void {
  // Carretera perimetral inferior del apron
  const roadH = 200;
  parent.addChild(new Graphics().rect(L.APRON_X, L.APRON_Y + L.APRON_H + 200, L.APRON_W, roadH).fill(HUGE.road).stroke({ width: 4, color: HUGE.buildingDark }));
  // Centerline blanco discontinuo
  const cl = new Graphics();
  strokeDashed(cl, L.APRON_X + 200, L.APRON_Y + L.APRON_H + 200 + roadH / 2, L.APRON_X + L.APRON_W - 200, L.APRON_Y + L.APRON_H + 200 + roadH / 2, 200, 120, 8, HUGE.roadStripe, 0.7);
  parent.addChild(cl);
  // Carretera lateral oeste (conecta parking norte con apron)
  parent.addChild(new Graphics().rect(L.APRON_X - 400, L.PARK_Y, roadH, L.APRON_Y - L.PARK_Y).fill(HUGE.road));
}

function drawHugeAirplane(parent: Container, cx: number, cy: number, size: number, rotation: number, overrideColor?: number): void {
  // AviÃ³n Bus Manager style: silueta azul tÃ©cnica plana con sombra direccional
  const fuseL = size * 1.0;
  const fuseW = size * 0.18;
  const wingSpan = size * 1.20;
  const wingW = size * 0.18;
  const tailSpan = size * 0.45;
  const tailW = size * 0.11;
  const color = overrideColor ?? 0x86abd4;
  // Sombra fuera del rotable
  const shadow = new Graphics();
  shadow.ellipse(cx + size * 0.10, cy + size * 0.16, fuseL / 2, fuseW * 2.6).fill({ color: HUGE.shadow, alpha: 0.45 });
  parent.addChild(shadow);
  // Sprite rotable
  const g = new Graphics();
  // Alas
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill(color);
  // Sombra trasera ala (lÃ­nea oscura)
  g.rect(-wingSpan / 2 + 20, wingW / 2 - 20, wingSpan - 40, 14).fill({ color: HUGE.buildingShadow, alpha: 0.8 });
  // Fuselaje
  g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.5).fill(color);
  // Cabina cockpit oscuro arriba
  g.roundRect(-fuseW / 2 + 4, -fuseL / 2 + 8, fuseW - 8, fuseL * 0.16, fuseW * 0.4).fill({ color: HUGE.shadow, alpha: 0.95 });
  // Cola triangular del color
  g.moveTo(0, fuseL / 2 - tailW * 2.0).lineTo(-tailSpan / 2 * 0.4, fuseL / 2).lineTo(tailSpan / 2 * 0.4, fuseL / 2).closePath().fill(color);
  // Stabilizers horizontales
  g.rect(-tailSpan / 2, fuseL / 2 - tailW * 0.6, tailSpan, tailW * 0.6).fill(color);
  // Motores grises
  const engX = wingSpan * 0.30;
  g.ellipse(-engX, -wingW * 0.3, wingW * 0.30, wingW * 0.85).fill(HUGE.buildingShadow);
  g.ellipse(engX, -wingW * 0.3, wingW * 0.30, wingW * 0.85).fill(HUGE.buildingShadow);
  g.position.set(cx, cy);
  g.rotation = rotation;
  parent.addChild(g);
}

function drawHugeVan(parent: Container, cx: number, cy: number, heading: number, returning: boolean): void {
  const w = 240, h = 130;
  const g = new Graphics();
  g.ellipse(40, 40, w / 2, h * 0.7).fill({ color: HUGE.shadow, alpha: 0.45 });
  g.roundRect(-w / 2, -h / 2, w, h, 20).fill(returning ? 0x6a93c2 : 0xff6b6b).stroke({ width: 6, color: HUGE.shadow });
  g.rect(-w / 2 + 20, -h / 2 + 20, w * 0.3, h - 40).fill({ color: HUGE.shadow, alpha: 0.55 });
  g.rect(-w / 2 + 30, -h / 2 + 30, w * 0.25, h - 60).fill({ color: 0xc5e6ff, alpha: 0.9 });
  g.position.set(cx, cy);
  g.rotation = heading + Math.PI / 2;
  parent.addChild(g);
}

// ============================================================
// === Huge skin Â· helpers TLS coherent ICAO-style ==========
// ============================================================

/** PerÃ­metro completo con fence + carretera de servicio. */
function drawHugePerimeter(parent: Container, W: number, H: number): void {
  const inset = 200;
  // Carretera de servicio perimetral (anillo)
  const roadW = 180;
  const p = new Graphics();
  // Top
  p.rect(inset, inset, W - 2 * inset, roadW).fill(HUGE.road);
  // Bottom
  p.rect(inset, H - inset - roadW, W - 2 * inset, roadW).fill(HUGE.road);
  // Left
  p.rect(inset, inset + roadW, roadW, H - 2 * inset - 2 * roadW).fill(HUGE.road);
  // Right
  p.rect(W - inset - roadW, inset + roadW, roadW, H - 2 * inset - 2 * roadW).fill(HUGE.road);
  parent.addChild(p);
  // LÃ­nea central blanca punteada en la carretera
  const cl = new Graphics();
  strokeDashed(cl, inset + 200, inset + roadW / 2, W - inset - 200, inset + roadW / 2, 150, 100, 6, HUGE.roadStripe, 0.7);
  strokeDashed(cl, inset + 200, H - inset - roadW / 2, W - inset - 200, H - inset - roadW / 2, 150, 100, 6, HUGE.roadStripe, 0.7);
  parent.addChild(cl);
  // Fence (lÃ­nea fina exterior)
  parent.addChild(new Graphics().rect(80, 80, W - 160, H - 160).stroke({ width: 8, color: 0x3a5b8a, alpha: 0.7 }));
  // Fence interior (lÃ­nea punteada)
  const fenceIn = new Graphics();
  dashedRect(fenceIn, inset - 30, inset - 30, W - 2 * inset + 60, H - 2 * inset + 60, { dash: 80, gap: 30, width: 4, color: 0x3a5b8a, alpha: 0.85 });
  parent.addChild(fenceIn);
}

/** ILS antenna farm (rect estrecho perpendicular a la cabecera). */
function drawHugeILS(parent: Container, x: number, y: number, w: number, h: number): void {
  // Plataforma
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.buildingDark).stroke({ width: 4, color: HUGE.buildingShadow }));
  // 4 antenas verticales pequeÃ±as
  for (let i = 0; i < 6; i++) {
    const ax = x + (w / 6) * (i + 0.5);
    parent.addChild(new Graphics().rect(ax - 4, y + 10, 8, h - 20).fill(HUGE.text));
    parent.addChild(new Graphics().circle(ax, y + 14, 8).fill(0xff6b6b));
  }
}

/** High-speed exit en Ã¡ngulo 30Â° desde pista a taxiway. Paralelogramo rotado. */
function drawHugeHighSpeedExit(parent: Container, cx: number, rwyY: number, twyY: number, toEast: boolean): void {
  // Paralelogramo (4 puntos) que conecta la pista con el taxiway en Ã¡ngulo 30Â°
  const len = twyY - rwyY;
  const offset = len * 0.58; // tan(30Â°) â‰ˆ 0.577
  const baseW = 400;
  const dir = toEast ? 1 : -1;
  const g = new Graphics();
  // Trapecio: empieza en (cx, rwyY) y termina en (cx + offset, twyY)
  g.moveTo(cx - baseW / 2, rwyY)
   .lineTo(cx + baseW / 2, rwyY)
   .lineTo(cx + dir * offset + baseW / 2, twyY)
   .lineTo(cx + dir * offset - baseW / 2, twyY)
   .closePath()
   .fill(HUGE.twy);
  parent.addChild(g);
  // Centerline amarillo del exit
  parent.addChild(
    new Graphics()
      .moveTo(cx, rwyY)
      .lineTo(cx + dir * offset, twyY)
      .stroke({ width: 8, color: HUGE.twyStripe, alpha: 0.85 }),
  );
}

/** Holding bay (zona de espera antes de entrar a pista). */
function drawHugeHoldingBay(parent: Container, x: number, y: number, w: number, h: number, label: string): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.twy).stroke({ width: 6, color: HUGE.twyStripe, alpha: 0.85 }));
  // Hold short bar (lÃ­nea amarilla gruesa en el lado de la pista)
  parent.addChild(new Graphics().rect(x, y + h - 18, w, 18).fill({ color: HUGE.twyStripe, alpha: 0.95 }));
  const lbl = new Text({ text: label, style: { fontFamily: "JetBrains Mono, monospace", fontSize: 80, fontWeight: "bold", fill: HUGE.text } });
  lbl.anchor.set(0.5); lbl.position.set(x + w / 2, y + h / 2);
  parent.addChild(lbl);
}

/** Zona MRO con borde dashed + cartel "AIRBUS MAINTENANCE TLS". */
function drawHugeMROZone(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: 0x1a2540, alpha: 0.6 }));
  const dash = new Graphics();
  dashedRect(dash, x, y, w, h, { dash: 140, gap: 70, width: 14, color: HUGE.twyStripe, alpha: 0.85 });
  parent.addChild(dash);
  const bg = new Graphics().rect(x + w / 2 - 1800, y - 280, 3600, 200).fill({ color: 0x0a1a2e, alpha: 0.95 }).stroke({ width: 6, color: HUGE.twyStripe });
  parent.addChild(bg);
  const t = new Text({ text: "AIRBUS MAINTENANCE TLS", style: { fontFamily: "Inter, sans-serif", fontSize: 130, fontWeight: "bold", fill: HUGE.twyStripe } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 180);
  parent.addChild(t);
}

/** Hall LagardÃ¨re: edificio MRO gigante con shape caracterÃ­stica (rect alargado, techos cilÃ­ndricos). */
function drawHugeLagardereHall(parent: Container, x: number, y: number, w: number, h: number, night: boolean): void {
  // Sombra
  parent.addChild(new Graphics().rect(x + 60, y + 60, w, h).fill({ color: HUGE.shadow, alpha: 0.4 }));
  // Cuerpo principal
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.hangar).stroke({ width: 10, color: HUGE.buildingDark }));
  // Bandas de techo (4 bandas horizontales mÃ¡s claras simulando arcos de cubierta)
  for (let i = 0; i < 4; i++) {
    const by = y + 80 + i * (h - 160) / 4;
    parent.addChild(new Graphics().rect(x + 60, by, w - 120, (h - 160) / 4 - 30).fill({ color: 0x86abd4, alpha: 0.35 }).stroke({ width: 3, color: HUGE.buildingDark, alpha: 0.5 }));
  }
  // 6 portones frontales (orientados al sur, hacia el apron MRO)
  const doorW = (w - 600) / 6;
  for (let i = 0; i < 6; i++) {
    const dx = x + 200 + i * (doorW + 80);
    parent.addChild(new Graphics().rect(dx, y + h - 280, doorW, 260).fill({ color: HUGE.shadow, alpha: 0.85 }).stroke({ width: 4, color: HUGE.buildingDark }));
  }
  // Letrero
  const bg = new Graphics().rect(x + w / 2 - 1400, y - 240, 2800, 180).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "HALL LAGARDÃˆRE Â· A380 FAL", style: { fontFamily: "Inter, sans-serif", fontSize: 110, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 150);
  parent.addChild(t);
}

/** Hangar MRO individual con portÃ³n frontal + ventanas + label. */
function drawHugeMROHangar(parent: Container, x: number, y: number, w: number, h: number, label: string, stage: number, active: boolean): void {
  const alpha = active ? 1 : 0.35;
  parent.addChild(new Graphics().rect(x + 30, y + 30, w, h).fill({ color: HUGE.shadow, alpha: 0.4 * alpha }));
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: HUGE.hangar, alpha }).stroke({ width: 10, color: HUGE.hangarDark, alpha }));
  parent.addChild(new Graphics().rect(x, y, w, 90).fill({ color: 0x86abd4, alpha: 0.55 * alpha }));
  // Cumbrera central
  parent.addChild(new Graphics().rect(x + 20, y + h / 2 - 8, w - 40, 16).fill({ color: HUGE.hangarDark, alpha: 0.5 * alpha }));
  // PortÃ³n frontal grande
  const doorW = w * 0.5, doorH = 280;
  parent.addChild(new Graphics().rect(x + (w - doorW) / 2, y + h - doorH - 20, doorW, doorH).fill({ color: HUGE.shadow, alpha: 0.9 * alpha }).stroke({ width: 5, color: HUGE.buildingDark, alpha }));
  // Label
  const lbl = new Text({ text: `${label}${stage > 1 ? ` Â· Stage ${stage}` : ""}`, style: { fontFamily: "Inter, sans-serif", fontSize: 110, fontWeight: "bold", fill: active ? HUGE.text : HUGE.textMuted } });
  lbl.anchor.set(0.5); lbl.position.set(x + w / 2, y + h / 2 - 80);
  parent.addChild(lbl);
  if (!active) {
    const cost = new Text({ text: stage === 3 ? "500.000 â‚¬" : "1.500.000 â‚¬", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 90, fontWeight: "bold", fill: HUGE.twyStripe } });
    cost.anchor.set(0.5); cost.position.set(x + w / 2, y + h / 2 + 80);
    parent.addChild(cost);
  }
}

/** De-icing pad: cuadrado con marcas distintivas. */
function drawHugeDeicingPad(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.twy).stroke({ width: 6, color: 0x86abd4, alpha: 0.85 }));
  // Cruz interna (marcas de de-icing pad)
  parent.addChild(
    new Graphics()
      .moveTo(x + 40, y + 40).lineTo(x + w - 40, y + h - 40)
      .moveTo(x + w - 40, y + 40).lineTo(x + 40, y + h - 40)
      .stroke({ width: 12, color: 0x86abd4, alpha: 0.7 }),
  );
  const lbl = new Text({ text: "DE-ICE", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 100, fontWeight: "bold", fill: 0x86abd4 } });
  lbl.anchor.set(0.5); lbl.position.set(x + w / 2, y + h / 2);
  parent.addChild(lbl);
}

/** GA apron: hangar pequeÃ±o + plataforma con marcas para aviaciÃ³n general. */
function drawHugeGAApron(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill({ color: 0x1f2f48, alpha: 0.7 }).stroke({ width: 5, color: HUGE.gateStroke }));
  // 8 espacios para aviones pequeÃ±os (4Ã—2 grid)
  const slotsX = 4, slotsY = 2;
  const slotW = (w - 120) / slotsX - 40;
  const slotH = (h - 120) / slotsY - 40;
  for (let i = 0; i < slotsX; i++) {
    for (let j = 0; j < slotsY; j++) {
      const sx = x + 60 + i * (slotW + 40);
      const sy = y + 60 + j * (slotH + 40);
      parent.addChild(new Graphics().rect(sx, sy, slotW, slotH).stroke({ width: 4, color: HUGE.twyStripe, alpha: 0.6 }));
      parent.addChild(new Graphics().circle(sx + slotW / 2, sy + slotH / 2, slotW * 0.15).stroke({ width: 3, color: HUGE.twyStripe, alpha: 0.55 }));
    }
  }
  const bg = new Graphics().rect(x + w / 2 - 700, y - 200, 1400, 150).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "GA APRON", style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 125);
  parent.addChild(t);
}

/** GSE parking: zona con vehÃ­culos de servicio. */
function drawHugeGSEParking(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0x1a2d3e).stroke({ width: 4, color: HUGE.buildingDark }));
  const bg = new Graphics().rect(x + w / 2 - 700, y - 200, 1400, 150).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "GSE PARKING", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 100, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 125);
  parent.addChild(t);
  // Rect representando GSE (carritos, escaleras, pushback)
  const palette = [0xfdc640, 0xff6b6b, 0x4ade80, 0xc5e6ff];
  const cols = Math.floor(w / 280);
  const rows = Math.floor(h / 200);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 3 === 2) continue;
      const cx = x + 80 + c * 280;
      const cy = y + 60 + r * 200;
      const color = palette[(r * 7 + c) % palette.length];
      parent.addChild(new Graphics().rect(cx, cy, 200, 120).fill(color).stroke({ width: 3, color: HUGE.shadow }));
    }
  }
}

/** Fuel farm: 4 cisternas circulares grandes. */
function drawHugeFuelFarm(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x + 60, y + 60, w, h).fill({ color: HUGE.shadow, alpha: 0.4 }));
  parent.addChild(new Graphics().rect(x, y, w, h).fill(HUGE.buildingDark).stroke({ width: 6, color: HUGE.buildingShadow }));
  const bg = new Graphics().rect(x + w / 2 - 700, y - 200, 1400, 150).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "FUEL FARM", style: { fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: "bold", fill: HUGE.twyStripe } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 125);
  parent.addChild(t);
  // 4 cisternas
  for (let i = 0; i < 4; i++) {
    const cx = x + 350 + i * ((w - 700) / 3);
    const cy = y + h / 2;
    parent.addChild(new Graphics().circle(cx, cy, 320).fill({ color: HUGE.twyStripe, alpha: 0.85 }).stroke({ width: 8, color: HUGE.buildingShadow }));
    parent.addChild(new Graphics().circle(cx, cy, 320).stroke({ width: 14, color: HUGE.buildingShadow, alpha: 0.4 }));
    const tnk = new Text({ text: "JET-A1", style: { fontFamily: "JetBrains Mono, monospace", fontSize: 60, fontWeight: "bold", fill: HUGE.shadow } });
    tnk.anchor.set(0.5); tnk.position.set(cx, cy);
    parent.addChild(tnk);
  }
}

/** Fire station: edificio rojo con marcas distintivas. */
function drawHugeFireStation(parent: Container, x: number, y: number, w: number, h: number): void {
  parent.addChild(new Graphics().rect(x + 40, y + 40, w, h).fill({ color: HUGE.shadow, alpha: 0.4 }));
  parent.addChild(new Graphics().rect(x, y, w, h).fill(0xa83a3a).stroke({ width: 8, color: 0x6e2828 }));
  parent.addChild(new Graphics().rect(x, y, w, 80).fill(0xc05050));
  // 3 portones rojos para camiones
  const doorW = (w - 240) / 3;
  for (let i = 0; i < 3; i++) {
    const dx = x + 60 + i * (doorW + 60);
    parent.addChild(new Graphics().rect(dx, y + h - 320, doorW, 300).fill({ color: HUGE.shadow, alpha: 0.85 }).stroke({ width: 5, color: 0x6e2828 }));
  }
  const bg = new Graphics().rect(x + w / 2 - 600, y - 200, 1200, 150).fill({ color: 0x0a1a2e, alpha: 0.95 });
  parent.addChild(bg);
  const t = new Text({ text: "FIRE STATION", style: { fontFamily: "Inter, sans-serif", fontSize: 90, fontWeight: "bold", fill: 0xff6b6b } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y - 125);
  parent.addChild(t);
}

function drawHugeAccessRoad(parent: Container, L: any): void {
  // Acceso desde el este (entrada civiles) â€” carretera ancha + arcÃ©n
  const roadH = 200;
  const x1 = L.PARK_X + L.PARK_W;
  const x2 = L.W - 280;
  const y = L.PARK_Y + L.PARK_H / 2 - roadH / 2;
  parent.addChild(new Graphics().rect(x1, y, x2 - x1, roadH).fill(HUGE.road).stroke({ width: 4, color: HUGE.buildingDark }));
  // Centerline
  const cl = new Graphics();
  strokeDashed(cl, x1, y + roadH / 2, x2, y + roadH / 2, 200, 120, 8, HUGE.roadStripe, 0.7);
  parent.addChild(cl);
  // Letrero de salida
  const bg = new Graphics().rect(x2 - 800, y - 250, 700, 180).fill(0x2d6e3e).stroke({ width: 6, color: HUGE.text });
  parent.addChild(bg);
  const t = new Text({ text: "â†‘ A624 TLS", style: { fontFamily: "Inter, sans-serif", fontSize: 90, fontWeight: "bold", fill: HUGE.text } });
  t.anchor.set(0.5); t.position.set(x2 - 450, y - 160);
  parent.addChild(t);
}
