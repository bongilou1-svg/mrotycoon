# Fase 5D — Mapa esquemático Pixi v8 con OSM real OVD · CIERRE

**Cerrada**: 2026-05-24
**Tests**: 873 / 873 ✅ (+70 net F5D: 44 render_sync + 27 sim_schedule + 5 sim_save v7→v8 compat + ajustes)
**Release**: [`builds/v0.5d-pixi-map.html`](../builds/v0.5d-pixi-map.html) (~1.4 MB JS total — Pixi v8 ~520 KB + Three.js core ~500 KB + sim + render + assets)
**Branch**: `f5d-map-pixi-osm` (PENDIENTE — `C:\Users\bongi\mrotycoon` no tiene repo git inicializado. El brief pedía commits atómicos pero requiere `git init` previo. Decisión de usuario: inicializar VCS o seguir sin)

---

## Qué entró

### P-α — Pixi v8 scaffolding + sync layer
- Pixi v8 añadido al bundle vanilla (esbuild IIFE → `window.Render`)
- **Skin "f5d"** en `src/lib/render/pixi-driver.ts` con paleta CIC north-star del SVG ([`F5D_mapa_referencia_visual.svg`](F5D_mapa_referencia_visual.svg)): navy `#0a1428`, runway cyan `#3aa9ff`, stands ámbar `#f5b945`, aviones `#a8dafc`
- Canvas montado en panel Hangar existente (subtab 🗺️ Mapa)
- Sync layer `gameState → renderState` con diff determinístico cada tick (tests `render_sync.mjs` cubren 44 escenarios)
- Decisión técnica: reuso del sistema de skins existente en lugar de `src/map/PixiMap.js` fresh. Misma API `mount/apply/destroy`. Mantiene MVP-first y anti-dispersión

### P-β/γ/δ-min — Pase rico OSM + aviones + furgo
- **Descarga OSM** bbox OVD `(43.554,-6.045,43.575,-6.022)` via Overpass API → `src/assets/airports/ovd.json` (64 KB)
- **Convertidor** `.scripts/osm_to_pixi.mjs` (Node, no Python como sugería el brief — más consistente con el stack):
  - Proyección equirectangular con corrección de latitud
  - Bbox calculado dinámicamente
  - Coords normalizadas a [0..1] (el renderer escala al viewport)
  - Clasifica ways por tag aeroway/building
  - Output: `src/assets/airports/ovd.paths.json` con `aspectRatio: 1.251`
- **Render Pixi**:
  - **1 pista 11/29** real con base stroke 9 cyan opacity 0.45 + highlight central stroke 2 `#a8dafc` + centerline dashes + threshold marks + labels "11"/"29"/"RWY 11/29 · 2200m"
  - **13 taxiways** real OSM como dashed `3 5` cyan opacity 0.55
  - **Apron** polígono fill `#0d1c33` stroke `#1c2d4a`
  - **1 terminal** + **3 tower** + **28 buildings** OSM con fill `#13243f` stroke `#2c4870`
  - **10 parking_positions** OSM con ref (01-09 + 08A). Mapping sim: H1-S1→01, H1-S2→02, H1-S3→03, R1→04, H2-S1→05
  - **Stands activos**: fill `#2a1a08` stroke `#f5b945` + halo + dot core ámbar
  - **Aviones** dot `#a8dafc` r=3.5 + halo `#3aa9ff` r=10 alpha 0.22
  - **Furgo mecs**: rect ámbar oficina→stand (línea recta MVP — OVD OSM no tiene service roads marcados)

### P-δ completo — Polish visual
- **Día/noche modula fondo**: día `#0e1a30`, noche `#06101e` (mismo lenguaje, sólo tono base)
- **Pulso temporal stands activos**: halo ámbar oscila con `sin(minute × 0.35)`, r=7→10 alpha 0.18→0.30
- **Bloom doble fake** en stands activos + aviones: capa externa r+8 alpha 0.06 detrás del halo principal
- **Trail data schematic** taxiing: 4 cuadraditos 3×3 px detrás del avión con fade decay (alpha 0.55→0.07)
- **Compass N** sup-dcha + label "OVD · LEAS" + coords "43.56°N 6.03°W" sup-izq
- **Atribución ODbL** `© OpenStreetMap contributors` esquina inf-dcha, color `#3d6f9d` 11px — obligatoria según licencia ODbL del dataset OSM
- **Sync diag** esquina inf con `t=N · day/night · stage N · aviones=N · mecs=I/T`

### P-ε — Interacción
- **Click stand** → si tiene avión, abre modal del avión (`detailFleetReg`); si libre, notif "Stand libre"
- **Click avión** → abre modal del avión directamente
- **Click plot ghost Stage 3/4** → dispara `startBuild` (reusa flow F5A). Plots visibles según `mroStage`. Labels "STAGE 3 · 500.000 €" / "STAGE 4 · 1.500.000 €"
- **Hover**: outline cyan `#a8dafc` alrededor del elemento hovered
- Callbacks expuestos: `onAirplaneClick(registration)`, `onStandClick(simId, hasAirplane, registration)`, `onBuildClick()`

### Pan / zoom / WASD / minimapa
- **World** F5D fijo `6000 × 4800` (aspect 1.25 ≈ OSM bbox 1.251)
- **Zoom range** `0.15× → 4.0×` (wheel zoom hacia cursor + Q/E + / -)
- **Pan** drag izq + WASD/flechas (velocidad ajustada al zoom)
- **Minimapa** esquina inf-dcha 200×160px: thumbnail apron+pista+stands activos + rectángulo amarillo del viewport
- **FPS counter** sup-dcha con color: cyan ≥55, ámbar 30-55, rojo <30

### Scope creep · Vuelos reales OVD (decisión consciente del usuario)
**Limitación documentada**: FlightRadar24/FlightAware API premium ($300-2000/mes), OpenSky histórico requiere OAuth + bloquea acceso libre (HTTP 403), AENA usa SPA + AJAX a API interna oculta. Decisión pragmática: **snapshot sintético basado en información pública**.

- **Snapshot horarios** [`src/assets/airports/ovd.schedule.json`](../src/assets/airports/ovd.schedule.json):
  - 86 vuelos × 7 plantillas día-de-semana (L-D)
  - Callsigns reales: IB3217/IB3216 (MAD), VY1804/VY1805 (BCN), V72143 (TFS), U22461 (LGW)
  - Modelos normalizados a cluster sim: A320/A321 + CFM56/V2500
  - Horarios planificados típicos OVD invierno (L-V 12-14 movs, S-D 10)
- **Pool matrículas + FC/FH estimados** [`src/assets/airports/ovd.fleet.json`](../src/assets/airports/ovd.fleet.json):
  - 24 matrículas plausibles dentro de rangos EASA España (EC-Ixx/Lxx/Mxx/Nxx) + UK (G-Ezxx)
  - Iberia 10 · Vueling 7 · Volotea 4 · easyJet 3
  - FC/FH estimados desde fecha entrega × utilización típica operador (IB 3000 FH/año, VY 3500, V7 2500, U2 3200)
  - `fhSinceLastA/C/D` random dentro del cycle típico → mix de aviones cerca/lejos de su próximo check desde día 1
- **Módulo** `src/lib/sim/schedule.ts`:
  - `getFlightsForGameDay(N)`: cycling 7-day determinista. Game day 1 = lunes
  - `generateScheduledArrivals(gameDay, contracts, fleet, busy)`: arrivals con horarios reales del JSON
  - `ensureFleetEntry`: lazy creation con stats del pool plausible (mismo callsign → mismas stats, hash determinista)
  - Mapeo opaco al primer contract activo (sin tocar `airlines.json`, save v7 backward compat intacto)
- **Toggle UI** en panel Mapa: botón `Schedule OVD OFF/ON`. Al activar:
  - Limpia arrivals futuros sin completar
  - Reset cursor `arrivalsGeneratedUpToDay` al día actual
  - Próximos arrivals salen del snapshot

### Save v8 — F5D backward compat
- `SAVE_VERSION` bumped `7 → 8`
- Nuevo campo opcional `useScheduleArrivals?: boolean` en payload (default `false` en migración v7)
- Acepta load de v6, v7, v8. v7→v8 sin pérdida de datos
- Tests round-trip cubren v7 sin flag, v8 con flag true, v7 con flag (forward-compat reading)

---

## Decisiones tomadas durante el camino

1. **Pixi v8 reusing skins system** vs `src/map/PixiMap.js` fresh — reusar mantiene anti-dispersión, evita duplicar mount/destroy lifecycle
2. **`osm_to_pixi.mjs` en Node** vs Python del brief — consistencia con stack, evita dependencia Python
3. **Furgo línea recta** vs road network OSM real — LEAS no tiene `highway=service` ni `aeroway=service` marcados. Pendiente para iteración futura
4. **Bloom fake con círculos** vs `BlurFilter` Pixi — bloom WebGL real requiere reorganizar layers + impacto perf. El fake da visual cercano sin coste
5. **Burst constante pulsante** vs event-driven en `check_completed` — event-driven requiere extender RenderState con `recentEvents`. MVP usa pulso temporal `sin(minute)`
6. **Scope creep aprobado**: vuelos reales OVD. Decisión consciente del usuario tras avisar de salida del time-box del brief
7. **Snapshot sintético** vs API premium (FR24/FlightAware) o OpenSky OAuth — viabilidad para indie offline-Steam. Datos plausibles, no exactos hace 365 días
8. **Pool matrículas plausibles + FC/FH estimados** vs datos reales por matrícula — FC/FH reales por matrícula no son públicos (operacional privada). Estimaciones ±10-20% son lo realista

---

## Atribución y licencias

- **Datos OSM**: © OpenStreetMap contributors, licencia [ODbL](https://www.openstreetmap.org/copyright). Atribución visible en `src/lib/render/pixi-driver.ts` (esquina inf-dcha del skin f5d) y en este documento
- **Pixi v8**: MIT
- **Three.js**: MIT (instalado pero no se usa en el skin f5d; queda como skin "3D real" separado del baseline F5D)
- **Schedule + Fleet snapshots**: sintéticos, basados en información pública del aeropuerto

---

## Parking · ideas para F6+ o post-Steam

- **Burst real al cerrar check** (event-driven, extiende `RenderState.recentEvents`)
- **Furgo road network OSM real** (A* sobre nodos taxiway si no hay service road marcado)
- **Bloom WebGL real** con `BlurFilter` Pixi reorganizando layers
- **Airlines reales en sim** (IB/VY/V7/U2 con sus contracts propios) — requiere refactor `airlines.json` + save v9
- **OpenSky integration** con cuenta OAuth del usuario → histórico real exacto hace 365 días
- **Más aeropuertos** (multi-airport selection) — Opción C parqueada explícitamente en el brief, post-Steam
- **Burst partículas explícitas** en cierre de A/C/D check
- **Día/noche transition smooth** (lerp paleta en lugar de switch binario)

---

## Próximo paso

**Fase 6 — Pre-Steam page + demo** (2 semanas estimadas):
- Descripción Steam con USP autenticidad MRO nicho
- Tags + screenshots usando el skin f5d como hero shot
- Trailer storyboard (60s con time-lapse del aeropuerto en el mapa)
- Press kit
- Demo refinada (3-5 días gameplay polished) para Next Fest / Itch.io
- ≥500 wishlists objetivo
