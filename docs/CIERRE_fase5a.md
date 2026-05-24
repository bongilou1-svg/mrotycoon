# Fase 5A — Sistemas pendientes de sim · CIERRE

**Cerrada**: 2026-05-15 (1 sesión muy intensa tras Fase 4 + 4.5)
**Tests**: 741 / 741 ✅ (+109 net en Fase 5A: +47 day_night +29 foreman +39 mro_stage −6 ajustes)
**Release**: [`builds/v0.5a-fase5a-final.html`](../builds/v0.5a-fase5a-final.html) (226 KB)

---

## Qué entró

### Bloque V — Día/noche real
- **Pernoctas**: aviones con arrival ≥19:00 pernoctan con prob 0.5. `scheduledDeparture` pasa al amanecer siguiente (06:30-07:30).
- **Daily checks**: dataset `data/daily_checks.json` con 5 templates (visual walkaround, tyre pressure, brake wear, fluids check, CVR/FDR). Auto-emitidos 2-4 por pernocta vía `rollDailyChecksOnOvernight`.
- **HUD badge día/noche**: ☀️/🌙 según hora ingame con glow CSS nocturno.
- **V5 (A-check nocturno)** → diferido a Fase 5B/parking. Los daily checks ya dan el ritmo nocturno.
- 47 tests en `sim_day_night.mjs`. Bundle intermedio `builds/v0.5a-fase5a-blockV.html`.

### Bloque W — TMA jefe + auto-handoff turnos
- **Tipo `Mechanic.isLeadForeman`** + constantes `LEAD_FOREMAN_WEEKLY_SALARY = 2500`, `LEAD_FOREMAN_CANDIDATE_PROBABILITY = 0.05`.
- **Mercado laboral**: ~5% de candidatos (edad ≥30) son Lead Foreman.
- **Hire automático activa setting**: contratar TMA → `g.autoAssignEnabled = true` automáticamente. Fire último TMA → desactiva.
- **Auto-handoff turnos**: cuando un certifier sale de shift, si hay TMA idle + setting on → `findHandoffReplacement` busca otro certifier on-shift con rating válido. Si encuentra → re-asigna inmediato (la WO no pausa). Notif `🔁 TMA: N WOs reasignadas`.
- **Sin TMA**: comportamiento Fase 4 — WO pausa al cambio de turno.
- **`eligibleHelpers` excluye TMAs** (defensivo — el TMA no es asignable a WOs).
- 29 tests en `sim_foreman.mjs`. Bundle intermedio `builds/v0.5a-fase5a-blockW.html`.

### Bloque X — Progresión orgánica MRO (4 etapas)
- **`STAGE_CONFIG`** con 4 etapas:
  - **1** (default): 3 line + 1 base. Coste 0.
  - **2**: stand extra en plataforma. 100k €, instant. 4 line + 1 base.
  - **3**: hangar interior 1 posición. 500k €, **14 días** de construcción. 5 line + 2 base + 5k €/sem fixed extra.
  - **4**: hangar mayor 3 posiciones. 1.5M €, **30 días** construcción. 5 line + 4 base + 15k €/sem fixed extra.
- **`g.mroStage`** + **`g.activeBuild`** en GameState. `startBuild()` action cobra coste y arranca countdown (o sube directo si instant). `tickConstruction` finaliza al llegar `completionMinute`.
- **Stands dinámicos**: `currentStands(stage)`, `currentLineStandIds(stage)`, `currentBaseStandIds(stage)` reemplazan los catálogos estáticos en `assignStand` y `tickMaintenanceChecks`.
- **`extraHangars` ahora vivo**: `applyWeeklyClose` recibe el delta automáticamente desde `STAGE_CONFIG[g.mroStage].extraHangars` (el hook que Fase 4.5 dejó dormido).
- **X5 (A en plataforma con penalty calidad)** → parking F5B. Stage 2 es solo "stand extra".
- **X7 (UI panel construcción)** → diferido a Fase 5B (parte del polish UX). La acción `startBuild` funciona via API.
- 39 tests en `sim_mro_stage.mjs`. Bundle intermedio `builds/v0.5a-fase5a-blockX.html`.

### Bloque Y — Features cortas del audit
- **Y1 — Flota variable por aerolínea** (`airline.basedAircraftCount`): SkyAirlines 8, SunAirlines 6, TreeAirlines 4, Starairlines 9. Default 8 backward compat. `generateInitialFleet` y `seedFleetForAirline` usan el campo.
- **Y2 — Severance escalado por años**: campo `Mechanic.hiredAtMinute` (default 0 para iniciales = "siempre han estado"). `severanceFor(m, nowMinute?)` ahora escala: SEVERANCE_WEEKS base (16) + 0.5 sem/año trabajado. Compatibilidad con tests legacy mantenida (sin `nowMinute` → comportamiento previo fijo).
- **Y3 (cobertura visual mini-gantt)** → parking F5B (es UI, no sim).
- **Y4 (notif agrupada cambio de turno)** → ya cubierto suficiente en Fase 4 Q.

---

## Decisiones cerradas

- ✅ **Cero polish visual** mantenido. UI badges día/noche son funcionales no decorativos.
- ✅ **Backward compat preservado**: tests legacy con `g.shiftGatingEnabled = false` siguen funcionando. Campo `basedAircraftCount` opcional. `severanceFor` sin `nowMinute` usa fijo.
- ✅ **Auto-handoff vía TMA** (no automático sin TMA): mantiene la decisión "vale la pena contratar TMA" como tradeoff económico real.
- ✅ **Stages 1-4 con tiempos realistas**: 14d hangar / 30d hangar mayor reflejan construcción real.

---

## Métricas finales

Auto-playtest 20 seeds × 28 días tras F5A completa:
- **Δbal medio: +66.532 €** (vs Fase 4.5 final +77k — bajada de 11k por carga extra de daily checks; sigue por encima del target +50k).
- **0/20 game overs**.
- WOs/28d: 119.7 (vs 81 pre-F5A — +47% por daily checks de pernocta).
- Rep media: 50.9.
- Penalty SLA: -105k (controlado, no es la fuga principal).

**Distribución por seed**: equilibrada, sin patología.

---

## Findings y backlog Fase 5B (parking)

### Diferido a Fase 5B durante F5A
- **V5 A-check nocturno**: programable durante pernocta. Bonus realismo MRO.
- **X5 A en plataforma con penalty calidad**: stage 2 podría ser "A al aire libre con penalty 0.7× eff + más rework". Hoy solo añade stand line.
- **X7 UI panel construcción**: action `startBuild` funcional, falta UI.
- **Y3 Cobertura visual mini-gantt**: mini-gantt 24h × shifts en panel Mecánicos.

### Pendiente desde Fase 4.5 (sigue)
- Tauri + SqliteBackend (G5-G7 desde Fase 3).
- Click-to-detail cards.
- Dashboard KPIs con gráficos.

### Pendiente desde Fase 4 (parking)
- Contratos deluxe con SLA distinto por tier (hoy solo precio/penalty multiplican).
- Auditorías Part-145 más estrictas en deluxe.
- Eventos especiales (huelga, runway closure).

---

## Próximo (Fase 5B)

Pre-req: validación visual de [`builds/v0.5a-fase5a-final.html`](../builds/v0.5a-fase5a-final.html) por Dani.

**Fase 5B — Capa visual + Tauri** (planificada 2-3 semanas):
1. Tauri+SqliteBackend primero (path Steam, ya no se difiere más).
2. GSAP encima de UI vanilla (animaciones contadores, slide-ins, toasts).
3. Mapa esquemático con SVG + GSAP `animateMotion`.
4. Click-to-detail visuals con drill-down (entidades + histórico).
5. Dashboard KPIs con Chart.js (balance, rep, SLA, throughput).
6. UI panel construcción (X7) y mini-gantt cobertura (Y3).

---

**Generado**: 2026-05-15 · **Cierre Fase 5A**. **Próximo hilo**: validar visualmente y abrir Fase 5B.
