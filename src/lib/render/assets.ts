// Fase 5D · Asset loader para skin ceopng.
//
// Carga texturas PNG con Pixi.Assets. Cada categoría declara su manifest. Si un PNG no
// está disponible (archivo no copiado todavía), `Assets.load` rechaza la promise — el
// consumidor recibe `null` y dibuja fallback vectorial.

import { Assets, Texture } from "pixi.js";

/** Manifest de texturas. Path relativo al HTML del bundle. */
export const ASSET_MANIFEST = {
  vehicles: {
    car_blue: "assets/textures/vehicles/car_blue.png",
    car_red: "assets/textures/vehicles/car_red.png",
    car_white: "assets/textures/vehicles/car_white.png",
    car_yellow: "assets/textures/vehicles/car_yellow.png",
    car_green: "assets/textures/vehicles/car_green.png",
    van_mech: "assets/textures/vehicles/van_purple.png",
    truck_fuel: "assets/textures/vehicles/truck_fuel.png",
    pushback: "assets/textures/vehicles/pushback.png",
  },
  buildings: {
    hangar: "assets/textures/buildings/hangar.png",
    terminal: "assets/textures/buildings/terminal.png",
    office: "assets/textures/buildings/office.png",
    atc_tower: "assets/textures/buildings/atc_tower.png",
    fuel_tank: "assets/textures/buildings/fuel_tank.png",
  },
  people: {
    mechanic_idle: "assets/textures/people/mechanic_idle.png",
    mechanic_walk: "assets/textures/people/mechanic_walk.png",
  },
  props: {
    cone: "assets/textures/props/cone.png",
    luggage: "assets/textures/props/luggage.png",
    gpu: "assets/textures/props/gpu.png",
  },
} as const;

type Category = keyof typeof ASSET_MANIFEST;
type AssetMap = { [C in Category]: { [K in keyof typeof ASSET_MANIFEST[C]]: Texture | null } };

let _loaded: AssetMap | null = null;
let _loading: Promise<AssetMap> | null = null;

/** Devuelve el objeto de texturas cargadas. Si una no existe → null en ese slot.
 *  Llamadas concurrentes esperan al mismo Promise. Resuelto, queda en caché. */
export async function loadAssets(): Promise<AssetMap> {
  if (_loaded) return _loaded;
  if (_loading) return _loading;
  _loading = (async () => {
    const result: any = {};
    for (const cat of Object.keys(ASSET_MANIFEST) as Category[]) {
      result[cat] = {};
      const map = ASSET_MANIFEST[cat] as Record<string, string>;
      for (const key of Object.keys(map)) {
        const url = map[key];
        try {
          const tex = await Assets.load(url);
          result[cat][key] = tex;
        } catch (e) {
          // No existe el archivo (todavía no copiado): null + fallback vectorial.
          result[cat][key] = null;
        }
      }
    }
    _loaded = result as AssetMap;
    return _loaded;
  })();
  return _loading;
}

/** Devuelve textura si está cargada y existe, sino null (fallback). */
export function getTexture<C extends Category, K extends keyof typeof ASSET_MANIFEST[C]>(
  cat: C, key: K,
): Texture | null {
  if (!_loaded) return null;
  return (_loaded[cat] as any)[key];
}
