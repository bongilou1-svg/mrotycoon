# Fase 5B — Capa visual · CIERRE (parcial: α + δ + ε + γ; β Tauri parking)

**Cerrada (parcial)**: 2026-05-15 (misma sesión que F4 + F4.5 + F5A)
**Tests**: 744 / 744 ✅ (+3 net en F5B-α, resto UI sin tests)
**Release**: [`builds/v0.5b-fase5b-final.html`](../builds/v0.5b-fase5b-final.html) (247 KB)

---

## Qué entró

### F5B-α — UI quick wins parking F5A (X7 + Y3 + V5)
- **X7 — Panel Construcción**: tab nueva `🏗️ Construcción` en sidebar. Muestra etapa actual con stats (line/base stands, extraHangars), card de próxima etapa con coste/build days/+stands/+fixed cost, botón "Iniciar construcción" conectado a `startBuild()`. Progress bar si hay `activeBuild`. Mensaje cuando alcanzas stage 4.
- **Y3 — Mini-gantt cobertura 24h**: en panel Mecánicos. 24 celdas × 1h coloreadas por shift (morning amarillo / afternoon azul / night púrpura) + densidad (empty rojo / low ámbar / mid-high verde). TMAs excluidos del count.
- **V5 — `nightStarted` flag**: campo opcional en `MaintenanceCheckInstance`. Se marca `true` cuando un check arranca en franja 22:00-06:00. Informativo (no cambia lógica sim — el sistema ya permitía noche).

### F5B-ε — Click-to-detail cards
- **Modal Avión**: click en fleet-card del sub-tab Flota → modal con matrícula, modelo+motor, aerolínea, FH/cycles totales, 3 barras A/C/D check con trigger, indicador check activo (+🌙 night), histórico últimos 5 checks completados, stats WOs (activas/completadas/diferidas/failed), últimos 5 landings.
- **Modal Mecánico**: click en fila tabla Mecánicos (excluyendo dropdowns/botones) → modal con nombre, base, eficiencia, turno, moral colored, salario efectivo (×1.5 si night), antigüedad (años trabajados), severance actual, type ratings, asignación actual (WO o check), training pasivo/activo.
- Estado runtime `detailFleetReg` + `detailMechId`. Modal-close limpia ambos.

### F5B-δ — Dashboard KPIs con sparklines SVG custom
- **`g.kpiHistory`** en GameState: snapshot semanal con balance, repAvg, woCompleted/Late/Failed, complianceScore, mechanicsCount. Capped a 52 semanas.
- **Tab Dashboard** nueva con 6 sparklines SVG custom (no Chart.js — `file://` no carga externals y bundling Chart.js suma 70KB innecesarios):
  - 💰 Balance over time
  - ⭐ Reputación media
  - ✅ WOs completadas acumuladas
  - ⏰ WOs late acumuladas
  - 🛡️ Compliance Part-145
  - ⚙️ Mecánicos contratados
- Cada card: valor actual grande + sparkline + min/Δ/max en mono. Color delta verde/rojo según signo. Empieza vacío hasta primer cierre semanal.

### F5B-γ — Animaciones (CSS + WAAPI nativos, sin GSAP)
- **`tweenNumber(el, target, duration, formatter)`**: anima un elemento entre valor actual y target con ease-out cubic (~400ms). Cancela tween previo si arranca otro. Aplicado al **balance HUD** y a la **reputación HUD**.
- **CSS keyframes**: `slide-in-right` para `.notif:first-child` (notifs nuevas entran deslizando desde la derecha 280ms cubic-bezier).
- **`.bar .fill`**: transition CSS de width 350ms cubic-bezier (las barras de checks, training, moral animan suaves).
- **`.tab-panel`**: fade-in 180ms al cambiar tab.
- **No GSAP**: usado WAAPI + CSS porque `file://` no carga externals y queremos cero deps.

---

## Diferido (parking F5C o hilo nuevo)

### β — Tauri + SqliteBackend (deuda G5-G7 desde Fase 3)
- **Razón del parking**: alto riesgo de bloqueo con toolchain Windows (lld/MinGW bugs ya conocidos en Fase 2). Requiere sesión limpia para iterar. Sin Tauri, el bundle vanilla file:// es perfectamente jugable.
- **Cuándo abrirlo**: hilo nuevo con cabeza fresca + tiempo para debugging Rust si falla. CLAUDE.md ya apunta a F5B-β como próximo.

### Otras features no entradas en F5B
- **GSAP `animateMotion` para mapa SVG**: el plan original mencionaba mapa esquemático con aviones moviéndose. Eso es Fase 5C o queda parked — la sensación "control room" del juego es paneles, no movimiento.
- **Stage 2 "A en plataforma con penalty calidad" (X5)**: la mecánica completa de A-check al aire libre con penalty 0.7× eff + más rework. Hoy stage 2 solo añade un line stand.

---

## Decisiones cerradas

- ✅ **Sparklines SVG custom** en lugar de Chart.js: cero deps, file:// compatible, suficiente para el dashboard MVP.
- ✅ **WAAPI + CSS** en lugar de GSAP: cero deps, file:// compatible, animaciones simples bastan para polish.
- ✅ **Modal click-to-detail**: 2 modales (avión + mecánico) cubren las dos entidades principales. Modal WO ya existía pre-F5B. Check modal queda como nice-to-have F5C.
- ✅ **Tauri NO se cierra en F5B**: pasa a Fase 5C o hilo nuevo. La deuda existe pero el juego es jugable sin él.

---

## Métricas finales tras F5B parcial

Auto-playtest 20 seeds × 28 días (sin cambios de balance, solo capa visual):
- **Δbal medio: +66k €** (idéntico a F5A — UI no afecta sim).
- **0/20 game overs**.
- 744/744 tests verdes.

---

## Próximo (hilo nuevo)

**Fase 5B-β Tauri + SqliteBackend** o **Fase 5C Pixi mapa condicional** o **Fase 6 Steam page**.

Mi recomendación: **Tauri** primero (deuda más antigua, condiciona path Steam). Si en 1 día Tauri no arranca → diferir a Fase 6 y abrir Steam page.

Pre-req: validación visual de [`builds/v0.5b-fase5b-final.html`](../builds/v0.5b-fase5b-final.html) por Dani.

---

**Generado**: 2026-05-15 · **Cierre F5B parcial** (α + δ + ε + γ). β diferido.

---

## Extensión F5C — Eventos aleatorios (misma sesión, 2026-05-15 noche)

Añadido tras F5B en la misma sesión:

### F5C — Eventos aleatorios (runway closure + service bulletin)
- **Tipo `RandomEvent`** (union): `RunwayClosureEvent` + `ServiceBulletinEvent`.
- **`g.randomEvents`** + **`g.eventsRolledForDay`** en GameState.
- **`rollDailyEvents(rng, day, fleet)`** en `sim/events.ts`:
  - Runway closure: 6% prob/día. Ventana 4-8h dentro de operación (08:00-20:00). 6 razones flavor (tormenta, FOD, inspección, niebla, etc).
  - Service Bulletin: 4% prob/día. Modelo + motor random. 1-2 aviones afectados. 5 descripciones flavor con ATA real (32, 49, 21, 73, 24).
- **Integración**: `rollEventsIfNewDay` se llama en `ensureArrivals` cuando cruzamos a día nuevo. Idempotente.
- **Skip arrivals durante runway closure**: `runwayClosedAt(events, minute)` filtrado en loop de arrivals.
- **Notifs**: `📢 Pista cerrada` (warning) + `📢 Airbus emite SB` (info).
- **UI**: sección `📢 Eventos activos` al final del Dashboard tab. Cards diferenciadas: closure rojo si activa / gris si normalizada; SB con descripción + matrículas afectadas. Visibles 7 días tras emisión.
- **SB no genera WO real en MVP** — solo notif + entrada en eventos (parking Fase 6).
- **Strike (huelga) parking**: requiere modificar shift gating, demasiado intrusivo para esta sesión.
- 31 tests en `sim_events.mjs` (distribución estadística 1000 días, shape de cada tipo, runwayClosedAt edges, activeEvents filter, integración con createGame+advanceGame).

### Métricas
Auto-playtest 20×28d post-F5C: **Δbal +69k €**, **0/20 game overs**, **780/780 tests verdes**. Eventos no rompen balance (closure es leve, SB es flavor en MVP).

Bundle final: [`builds/v0.5c-events.html`](../builds/v0.5c-events.html) (253 KB).

