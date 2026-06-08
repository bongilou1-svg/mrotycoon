# RUNBOOK.md — Realidad operativa del repo (rama `autonomous` = `main`)

> Inspección hecha sobre el contenido real de la rama (snapshot inicial de `main`,
> commit `5204471`). **No asumas nada de npm scripts genéricos**: los comandos de abajo
> son los que existen de verdad en este repo. Si un día divergen, re-inspecciona y actualiza
> este fichero.

## Stack real
- **Frontend:** Svelte 5 (runes) + Vite + TypeScript. Entry `src/main.ts` → `src/App.svelte`
  (lo monta `index.html` con `<script type="module" src="/src/main.ts">`).
- **Empaquetado nativo previsto:** Tauri 2 + Rust → `.exe` (toolchain **bloqueado** en Windows,
  ver `docs/TAURI_BLOQUEADO.md`; no es necesario para desarrollar ni testear el sim).
- **Sim core:** TypeScript puro bajo `src/lib/sim/` + `src/lib/game.ts`. **Sin dependencias de
  DOM/Pixi** → se puede dirigir headless desde Node (así corren tests y el smoke).
- **Node requerido:** v20+ (probado con v22; los tests importan `.ts` directamente vía el
  type-stripping nativo de Node 22, sin paso de compilación).

## Comandos REALES

### Instalar dependencias
```
npm install
```
(Hay `package-lock.json` → gestor es **npm**. Las deps de Rust/Tauri solo se bajan en el primer
`npm run tauri dev`, no hacen falta para sim/tests.)

### Buildear
```
npm run build          # = "vite build" → genera dist/ (app web Svelte)
```
Bundle **single-file vanilla** (un solo .html jugable sin servidor, lo que se sube a builds/):
```
node .scripts/build-vanilla.mjs <salida.html>     # NO hay alias npm en esta rama
```
(En ramas posteriores existe `npm run bundle`; en `autonomous`/`main` aún no — usar el script directo.)

Build nativo `.exe` (requiere toolchain Rust+MSVC, hoy bloqueado):
```
npm run tauri build
```

### Testear
**No hay framework ni runner agregado** (no existe `npm test`). Cada suite es un script Node
autónomo con asserts manuales que imprime `Total: N OK, M FAIL` y sale con código ≠0 si falla.

Un test concreto:
```
node tests/sim_economy.mjs
```
Toda la suite (32 ficheros) de una pasada, contando fallos:
```
fail=0; for t in tests/*.mjs; do node "$t" >/dev/null 2>&1 || { echo "FAIL $t"; fail=$((fail+1)); }; done; echo "fallos: $fail"
```
Estado base verificado en esta inspección: **32/32 ficheros verdes (~802 asserts OK)**.

Otros validadores que existen en `.scripts/`:
```
node .scripts/smoke-render.mjs <build.html>   # parsea el JS del bundle, caza errores de sintaxis
node .scripts/smoke-bundle.mjs                # checks sobre el bundle vanilla
node .scripts/validate-build.mjs              # validación del build
npm run check                                 # type-check Svelte+TS (svelte-check)
npm run lint                                  # ESLint
```

### Arrancar / servir el juego
- **Sin toolchain (recomendado para playtest rápido):** abrir en el navegador el bundle
  single-file más reciente de esta rama → `builds/v0.5g-final.html`. Es autónomo, no necesita
  servidor.
- **Dev con hot-reload de la UI Svelte:**
  ```
  npm run dev        # = "vite", sirve en http://localhost:1420
  ```
- **App nativa (cuando Tauri desbloquee):**
  ```
  npm run tauri dev
  ```

## Mapa rápido del código
- **Entry / arranque:** `src/main.ts` → `src/App.svelte`. `index.html` es el host.
- **Lógica de juego (loop principal):** `src/lib/game.ts` — `createGame(balance, airlines,
  templates, seed, checkDefs, dailyCheckTemplates)` construye el estado; `advanceGame(g,
  stepMinutes)` avanza el tick. También `acceptContractOffer`, `hireCandidate`,
  `setMechanicShift`, `assignMechanicsManually`, etc.
- **Sistemas / economía:** `src/lib/sim/` — `economy.ts`, `reputation.ts`, `contracts.ts`,
  `maintenance.ts`, `workorders.ts`, `assignment.ts`, `mechanics.ts`, `shifts.ts`, `mel.ts`,
  `events.ts` (eventos aleatorios F5C), `schedule.ts`, `stands.ts`, `time.ts`, `rng.ts`
  (RNG determinista por seed). `src/lib/sim-all.ts` re-exporta todo para el bundle esbuild.
- **Estado / stores:** `src/lib/stores/` (`game.ts`, `time.ts`) — capa reactiva Svelte sobre
  el GameState. `src/lib/sim/save.ts` + `storage.ts` = serialización de partidas.
- **UI:** `src/App.svelte` + `src/lib/ui/` (paneles control-room) + `src/lib/render/`
  (Pixi/Three drivers para el mapa esquemático).
- **Datos (tunables):** `src/lib/data/*.json` — `balance.json` (economía), `airlines.json`,
  `workorders.json` (100 WOs), `maintenance_checks.json`, `daily_checks.json`.

## Madurez del juego
**Parcial / prototipo jugable avanzado.** El motor de simulación está maduro y bien cubierto
de tests (32 suites verdes, sim headless determinista, pivote a MRO de línea ya integrado:
contratos, reputación segmentada, turnos, MEL, eventos aleatorios, schedule OVD real). Hay
bundles single-file jugables (`builds/v0.5g-final.html`). **No es un juego completo de
principio a fin todavía.**

Para que sea jugable de principio a fin falta, principalmente: (1) un endgame/condición de
victoria pulida y telegrafiada (existe game-over por quiebra, pero la progresión hasta hangares
Stage 3-4 y "ganar" no está rematada); (2) **balance económico** — el parking del proyecto
señala penalty SLA dominante y game-overs en auto-playtest, pendiente de tuning; (3) cerrar el
empaquetado **Tauri** (hoy bloqueado) para distribución Steam; (4) onboarding/tutorial in-game.
El sim es sólido; lo que falta es contenido de progresión, balance fino y el shell de
distribución.

## Smoke test del agente (creado en esta rama)
La suite del repo valida datos y sistemas, pero **no había un smoke que arrancara el juego y
simulara un turno end-to-end**. Se ha creado uno mínimo en `agent/smoke.mjs`:

```
node agent/smoke.mjs            # seed=42, simula 1 día (288 ticks de 5 min)
node agent/smoke.mjs 100 3      # seed=100, 3 días
```
Verifica que `createGame()` inicializa sin lanzar (balance>0, ≥1 mecánico, ≥1 contrato,
reputación sembrada, no game-over de salida) y que `advanceGame()` simula al menos un día sin
excepciones dejando el reloj y la economía coherentes. Sale con código 0 si todo OK, 1 si algo
falla. **Verificado verde (13/13) sobre esta misma rama.** Es el chequeo rápido que el agente
debe correr antes y después de cada cambio.
