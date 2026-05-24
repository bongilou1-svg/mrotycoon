// Fase 5D · P-α: entrypoint del bundle de render.
//
// esbuild empaqueta este fichero como IIFE con globalName="Render". Resultado:
//   window.Render.PixiDriver, window.Render.buildRenderState, window.Render.timeOfDayFor
// Mantiene la capa render aislada del bundle Sim — los 803 tests sim siguen sin
// tocar Pixi, y el UI driver vanilla decide cuándo cargar el mapa.

export { PixiDriver } from "./pixi-driver.ts";
export { ThreeDriver } from "./three-driver.ts";
export { buildRenderState, timeOfDayFor } from "./sync.ts";
export { loadAssets, getTexture } from "./assets.ts";
export { bakeJetSprite, clearSpriteBakeCache } from "./sprite-bakery.ts";
export type { RenderState, RenderAirplane, RenderStand, RenderMechanic, TimeOfDay } from "./types.ts";
