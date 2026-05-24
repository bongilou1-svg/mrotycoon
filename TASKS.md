# MRO Tycoon — TASKS (Fase 5A)

> Backlog vivo de Fase 5A — Sistemas pendientes de sim. Time-box: **3-4 semanas**.
> Brief: `docs/BRIEF_fase5a.md`. Disciplina: sim → tests → auto-playtest. Cero polish visual.

## Sprint plan

| Semana | Bloque | Objetivo |
|---|---|---|
| 1 | **V — Día/noche real** | Pernocta + daily checks + A-check nocturno + pre-flight |
| 2 | **W — TMA jefe + auto-handoff** | Lead foreman, auto-asignación, handoff entre turnos |
| 2-3 | **X — Progresión orgánica MRO** | 4 etapas con construcción, activa hook extraHangars |
| Intercalado | **Y — Features cortas audit** | Flota variable, severance escalado, cobertura visual, notif agrupada |
| 4 | **Z — Cierre 5A** | Auto-playtest 5×60d, doc, bundle |

---

## Sprint detallado

### Bloque V — Día/noche real

- [ ] **V1**: Tipos: campo `overnight: boolean` en `Airplane`. Helper `isOvernightCandidate(arrivalMinute, scheduledDepartureMinute)`: true si el avión solaparía con período nocturno suficiente (≥4h en franja 22-06).
- [ ] **V2**: Generación en `generateDailyArrivals`: último landing del día tiene probabilidad alta (~70%) de pernoctar. `scheduledDepartureMinute` se mueve al amanecer siguiente (06:30 + jitter).
- [ ] **V3**: Nuevo dataset `data/daily_checks.json` con 5 templates: visual inspection ATA 5 (15 min), brake wear ATA 32 (25 min), tyre check ATA 32 (20 min), fluids ATA 12 (30 min), pre-flight ATA 5 (15 min). Severity Minor. Penalty bajo. melCategory C (diferible).
- [ ] **V4**: Generador `rollDailyCheckWoOnOvernight`: cuando se detecta avión overnight, emite 2-3 WOs daily-check al instante del aterrizaje. Distinto de `rollWoOnLanding` (que es probabilístico).
- [ ] **V5**: A-check nocturno: en `tickMaintenanceChecks`, si `inNightWindow(nowMinute)` + avión pernocta + cumple trigger + BaseStand libre + team night idle → auto-schedule A-check. Marcar `nightShift: true` en el check para auditoría.
- [ ] **V6**: HUD: badge `🌙` o `☀️` según `inNightWindow`. Pequeño, no intrusivo.
- [ ] **V7**: Tests `sim_day_night.mjs` (target 25+): overnight detection, scheduledDeparture al amanecer, daily checks emitidos, A-check nocturno gating, balance equilibrio.

**Cierre V**: auto-playtest 5×14d: aparece ratio overnight ~30% landings + daily checks completados sin romper balance.

### Bloque W — TMA jefe + auto-handoff

- [ ] **W1**: Tipo `MechanicRole = "B1" | "B2" | "helper" | "lead_foreman"`. Mecánico lead tiene `base = null`, no asignable a WOs, función especial. Salario semanal 2.500 € (config). Setting de auto-asignación.
- [ ] **W2**: Mercado laboral: aerolíneas/candidatos pueden ser lead_foreman (raros, ~5% del pool). Misma flujo hire/fire.
- [ ] **W3**: `tickAutoAssign(g, nowMinute)`: si hay lead_foreman + setting on → buscar WOs sin asignar (phase=ToPlane, sin equipo). Para cada una: encontrar 1 certifier eligible Idle on-shift; si match único → auto-asignar. Si 2+ candidatos eligibles → dejar al jugador.
- [ ] **W4**: Auto-handoff turnos: cuando `tickShiftTransitions` libera certifier al salir de shift, si hay TMA + setting on → buscar otro certifier on-shift con rating válido; si match → re-asignar (sin pasar por ToPlane). Notif "🔁 Handoff: M-005 reemplaza a M-001 saliendo de turno".
- [ ] **W5**: UI panel Mecánicos: cuando hay TMA, sección "Política TMA" con toggle ON/OFF + opciones (priorizar AOG, agrupar por matrícula).
- [ ] **W6**: Tests `sim_tma.mjs` (target 20+): match único auto-asigna, match múltiple no asigna, handoff entre turnos, salario aplicado.

**Cierre W**: con 1 TMA contratado + auto-asignación on, las WOs simples se asignan solas. Multi-cert se queda pendiente.

### Bloque X — Progresión orgánica MRO

- [ ] **X1**: Tipo `MroStage = 1 | 2 | 3 | 4`. Campo `g.mroStage` (default 1). Constante `STAGE_CONFIG`:
  - 1: 3 line + 1 base. Sin coste.
  - 2: +A en plataforma (capability flag). 100k €, instant.
  - 3: +1 hangar interior. 500k €, 14d build. +1 BaseStand, +5k weeklyFixed.
  - 4: +hangar mayor 3 pos. 1.5M €, 30d build. +2 BaseStands, +15k weeklyFixed.
- [ ] **X2**: Estado `g.activeBuild`: `{ targetStage, completionMinute }` durante construcción. Bloquea iniciar otra.
- [ ] **X3**: Stands dinámicos: en lugar de constantes `LINE_STAND_IDS` / `BASE_STAND_IDS`, función `currentStands(g)` que devuelve según stage.
- [ ] **X4**: `tickConstruction(g)`: al alcanzar `completionMinute`, sube `mroStage`, libera build, notif.
- [ ] **X5**: A en plataforma (stage 2+): permite A-check en LINE_STAND (no BaseStand), pero penalty calidad: `efficiency × 0.7` durante el A-check ("trabajo al aire libre"). Aumenta probabilidad de rework post-Test.
- [ ] **X6**: `extraHangars` calculado dinámicamente: stage 3 → 1, stage 4 → 2. Pasar a `applyWeeklyClose` desde game.ts.
- [ ] **X7**: UI panel "Construcción" (tab nueva). Stage actual + próximas con coste + ETA. Botón "Construir" si balance suficiente.
- [ ] **X8**: Tests `sim_mro_stage.mjs` (target 20+): transiciones, costes, build time, stand catalog dinámico, hook fixedCost.

**Cierre X**: jugador puede ahorrar capital, comprar etapas, ver hangar 2/3 disponible.

### Bloque Y — Features cortas audit

- [ ] **Y1 — Flota variable por aerolínea**: campo `airline.basedAircraftCount` (3-5/6-10/12-15 según tamaño). Modificar `seedFleetForAirline` + tests.
- [ ] **Y2 — Severance escalado años**: campo `hiredAtMinute` en Mecánico. Severance = max(16 sem, semanasTrabajadas × 0.5 + 8). Update `severanceFor` y tests.
- [ ] **Y3 — Cobertura visual mini-gantt**: panel Mecánicos añade tabla 24h × shifts con count por hora. Si entra mientras hago Bloque W, mejor.
- [ ] **Y4 — Notif agrupada cambio de turno**: ya parcial, refinar con tier de severidad.

### Bloque Z — Cierre 5A

- [ ] **Z1**: Auto-playtest extendido 5 seeds × 60 días (no 28). Variables: máx stage alcanzado, ratio overnight, daily checks completados, TMA hires.
- [ ] **Z2**: Findings + tuning si hace falta (max 1 ronda).
- [ ] **Z3**: Bundle `builds/v0.5a-fase5a-sim.html`.
- [ ] **Z4**: `docs/CIERRE_fase5a.md`.
- [ ] **Z5**: STATUS + CLAUDE → próximo Fase 5B.

---

## Recortes preautorizados

Si día 21 (75% fase) no hay X operativo, sacrificar:
1. **X4 hangar mayor stage 4** → stage 3 max. Stage 4 a Fase 6.
2. **W5 política UI rica** → solo toggle on/off básico.
3. **Y3 cobertura visual** → parking Fase 5B.
4. **V5 A-check nocturno** → daily checks suficientes; A-check nocturno a 5B.

NO recortable: V1-V4 (día/noche core), W1-W4 (TMA core), X1-X3 (stages 1-3 core), Z (cierre).

---

## Notas

- Mantener disciplina **cero polish visual** — anotar a Parking 5B cualquier idea visual.
- Tests siempre antes del bundle.
- Auto-playtest tras cada bloque major (V→W→X) para detectar regresiones.
