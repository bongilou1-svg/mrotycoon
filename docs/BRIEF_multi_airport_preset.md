# BRIEF · Framework multi-aeropuerto con presets

> Diseño aprobado 2026-05-25. Pendiente de implementación.

## Objetivo

Permitir al jugador elegir aeropuerto inicial (OVD rookie, MAD modo dios, etc.) en pantalla de New Game. Cada aeropuerto define:

- Schedule real (data AeroDataBox saneada).
- Flota real (matrículas + operadores físicos).
- Setup inicial (balance, mecs, contratos, dificultad).
- Milestones de progresión narrativa específicos.
- Aerolíneas que operan ahí + thresholds de brand.
- Layout Pixi (OSM real del aeropuerto).

## Arquitectura

```
src/lib/data/airports/
  LEAS_oviedo.preset.json        ← preset + setup inicial
  LEMD_madrid.preset.json
  LEBL_barcelona.preset.json
  LEAS.schedule.json             ← data real procesada (mes completo)
  LEAS.fleet.json
  LEMD.schedule.json
  ...

src/assets/airports/
  LEAS.geojson                   ← OSM real (ya existe para OVD)
  LEMD.geojson
  ...
```

## Schema preset JSON

Ver `docs/BRIEF_multi_airport_preset_schema.json` (a crear con sample completo OVD).

Campos clave:

- `icao`, `iata`, `name`, `country`, `city`
- `difficulty` (1-5 estrellas) + `difficultyLabel`
- `description` (texto en card de selección)
- `scheduleFile`, `fleetFile`, `osmFile`, `mapTexturesDir`
- `setup`: balance inicial, cap mecs, mecs iniciales, contratos iniciales, candidatos preload, pre-seed overnighters
- `operators`: lista de aerolíneas que operan (con `homeBased`, `brandThreshold`, `requiresUnlockType`)
- `milestones`: eventos de progresión narrativa con triggers + acciones

## Progresión rookie OVD (aprobada)

| Fase | Trigger | Estado |
|---|---|---|
| Día 1 | New game OVD | 1 contrato VY turnaround puntual. 1 mec dual. 200k €. Sin overnighters. |
| ~Sem 3-4 | brand ≥ 65 + on-time alto + 14d | Volotea oferta primer contrato base (1 matrícula A320 EC-KMI pernoctando). |
| ~Mes 2-3 | brand ≥ 78 sostenido | Volotea expande (+EC-NQM). |
| ~Mes 6 | balance ≥ 500k + invertir 200k en habilitación CRJ | Air Nostrum accesible (187 movs MAD/mes). |
| Endgame | brand ≥ 90 + multi-contrato | Wide-body, hangar 2, etc. |

## Modos dificultad por aeropuerto

| Aeropuerto | Stars | Setup | Vibe |
|---|---|---|---|
| OVD (LEAS) | ⭐ | 1 contrato, 1 mec, sin overnighters | Técnico solitario regional |
| SVQ/AGP (LEZL/LEMG) | ⭐⭐⭐ | 3 contratos, 3 mecs, 1-2 overnighters | MRO regional consolidado |
| BCN (LEBL) | ⭐⭐⭐⭐ | 5 contratos, 8 mecs, hub Vueling | Hub presión operativa |
| MAD (LEMD) | ⭐⭐⭐⭐⭐ | 8 contratos, 15 mecs, A320 mainline + AOG diarios | Modo dios |

## Data sources

- **AeroDataBox** (free tier 600 unidades/mes) — actual. Reglas saneamiento en `.scripts/operator-rules.mjs`.
- **Migración futura a FlightAware AeroAPI** ($5/mes) si necesitamos:
  - Campo `operator_iata`/`operator_icao` directo del operador físico (sin saneamiento por reglas).
  - Cuando tengamos 4+ aeropuertos y las reglas crezcan demasiado.

## Próximos pasos (orden propuesto)

### Sesión 1 — Preset schema + refactor loader (3-4h)
- Crear `docs/airport_preset_schema.json` con sample OVD completo.
- Refactor `createGame` para aceptar `presetPath` opcional.
- Mantener compatibilidad con la firma actual (default = LEAS legacy si no se pasa preset).
- Tests: cargar preset + verificar setup inicial coherente.

### Sesión 2 — UI selección aeropuerto + 2 presets reales (3-4h)
- Pantalla New Game con cards de aeropuertos disponibles.
- Generar `LEAS.schedule.json` real desde AeroDataBox data ya descargada (mes mayo 2026).
- Generar `LEAS.fleet.json` real con matrículas vistas + FH plausibles.
- Setup OVD rookie funcional.

### Sesión 3 — Milestones engine + progresión rookie (3-4h)
- Implementar runtime de milestones (triggers + acciones).
- Test: jugar OVD rookie 30 días, verificar Volotea oferta llega.
- UI notif milestone con celebración.

### Sesión 4 — 2do aeropuerto (MAD o SVQ) (3-4h)
- Fetch + sanear schedule MAD.
- Preset MAD con setup modo dios.
- Map Pixi básico (OSM real LEMD).
- Validar dificultad relativa.

## Notas técnicas

- Saves v13 actuales son OVD-specific. Al introducir preset, save format debe incluir `airportIcao` del preset cargado. Migración: si save no tiene `airportIcao`, asumir `LEAS`.
- `airlines.json` global queda DEPRECATED — cada preset trae sus operadores. Migración: leer airlines del preset cargado, no del archivo global.
- Pool de matrículas (`ovd.fleet.json`) actual queda DEPRECATED — cada preset trae su fleet pool.
- `ovd.schedule.json` actual queda DEPRECATED — cada preset trae su schedule.
