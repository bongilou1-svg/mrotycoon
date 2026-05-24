# Fase 3 — Profundidad sistémica · CIERRE

**Cerrada**: 2026-05-14 (1 sesión intensa, 7 bloques sistémicos)
**Tests**: 512 / 512 ✅
**Release**: [`builds/v0.2-fase3-depth.html`](../builds/v0.2-fase3-depth.html) (146 KB, single-file vanilla)

---

## Qué entró

### Bloque G — Saneamiento (60% scope, días 1-3)
- G1+G2: tuning balance `slaMultiplier 1.05→1.20`, `repCompletedLate -2→-1`. Validado 20 seeds × 14d: rep media 68 vs 7.4 baseline.
- G3 skipped (overshoot del target G2).
- G4: MCP homelab-runner re-verificado.
- **G5-G7 diferidos a Fase 5** (Tauri vivo + SqliteBackend): el stack vanilla+esbuild+LocalStorage es suficiente para Fase 3 entera.

### Bloque H — A/C/D Checks 🔴 (días 4-9)
Sistema diferencial del MRO. **10/10 sub-tasks**.
- **Flota persistente** (H1): `FleetAircraft` con totalFH/totalCycles + per-check fhSinceLastA/C/D. 8 aviones/aerolínea. `AirplaneInstance.instanceId` único por landing event (varias landings pueden compartir matrícula).
- **Tabla A/C/D × A320/A321** (H2): `maintenance_checks.json`. A=600 FH/200 c/1 día parking/12k €. C=7500 FH/5000 c/14 d/110k €. D=25000 FH/16000 c/60 d/550k €.
- **Auto-generador** (H3): `detectChecksDue` + `scheduleDueChecks` integrados en tick. Trigger por FH O cycles. No duplica.
- **Stand catalog** (H4+H5): `LINE_STAND_IDS = ["H1-S1","H1-S2","H1-S3"]` + `BASE_STAND_IDS = ["H1-B1"]`. Line landings excluyen base.
- **Tick lifecycle** (H6): Scheduled→InProgress (auto-asigna team `min(idle, ceil(manDays/parkingDays))`) →Completed (doble criterio manMinutes ≥ manDays×1440 ∧ elapsed ≥ parkingDays×1440). Al cerrar resetea fhSince/cyclesSince y libera stand+team.
- **Billing + overrun penalty** (H7): `maintenanceCheckFee` (income) + `maintenanceCheckPenalty` (-5k €/día overrun, devengado día a día sin double-charge).
- **Avisos anticipados** (H9): `⚠️ vence X-check en N FH` cuando ≤50 FH del trigger. Flags `warned{A,C,D}` evitan spam.
- **UI Hangar Line/Base/Flota** (H8): build script reproducible `.scripts/build-vanilla.mjs`. Sub-tabs en Hangar con cards de check (barras manMinutes/parking, team, fee, overrun) + cards de flota (FH total, barras hasta A y C).
- **Tests** (H10): 82 tests sim core (target 15+).

### Bloque I — MEL/Deferrals 🔴 (días 10-13)
**8/8 sub-tasks**.
- `MelCategory = 'A'|'B'|'C'|'D'|null`. `deriveMelCategory` deriva del legacy `deferrable+severity+isAOG`. AOG/Critical → null.
- Phase `Deferred` + `deferralExpiryMinute`. Acción `deferWoManually` libera mecánicos asignados.
- `tickMel` detecta vencimientos → penalty -10.000 € + -5 rep + notif `🚨` danger.
- UI: sub-tab Hangar "Deferrals" con countdown rojo si <24h. Badges MEL coloreados en cards de WO + en modal. Botón "📋 Diferir (MEL X)" en modal.
- **Calibración Bloque N**: dataset legacy tenía 92% deferrables vs 30% del brief. `deriveMelCategory` ahora hashea por `template.id` para limitar al ~30%.

### Bloque J — Part-145 audits (días 14-16)
**7/7 sub-tasks**.
- `ComplianceState` (score 0-100 inicial 80, lastAudit, nextAudit, openFindings[], totalAudits). Audits cada **60-90 días aleatorios**.
- `runAudit` mira MEL expiradas (-3 cada), Failed otras (-2), tasa cierre tardío (-2/-5), overrun checks (-2/-5). Bonus +5 sin findings. Delta clamp `[-15, +10]`.
- Consecuencias: <30 → multa 50k € + suspensión del contrato más exigente. <10 → game over `reason="compliance"`. Auto-pausa si audit grave.
- HUD: `🛡️ score/100` coloreado (green/amber/red), click → modal con findings + tramos.
- Notif pre-aviso `📋` a 3 días, sin spam.

### Bloque K — Mercado laboral (días 17-19)
**7/7 sub-tasks**.
- `Candidate` (CND-NNNNNN, name, age 22-58, base, ratings, salary ±15%, experience, personality[3] traits, expiresAtMinute +7d).
- `refreshMarket` pool 5-10 cada 7d. Distribución 55% helper / 30% B1 / 15% B2.
- `marketRng` **aislado** del rng principal (evita contaminar trayectoria determinista — bug encontrado y arreglado durante K).
- `hireCandidate` (signing bonus 4 sem). `fireMechanic` (severance 8 sem, solo Idle).
- Training pasivo: helpers en Working acumulan; al cruzar 90 días → promo a B1 junior con rating aleatorio.
- UI: tab `🤝 Mercado` con cards (badge base, edad, eff, ratings, personality, expiry, bonus, botón). Panel Mecánicos: columnas `Train`, botón `👋` Despedir.

### Bloque L — Turnos + moral + training activo (días 20-22)
**8/8 sub-tasks**, con un descope honesto.
- `ShiftSlot = 'morning'|'afternoon'|'night'|'off'`. Ventanas: morning [06-14), afternoon [14-22), night [22-06).
- **L2 deferido a Fase 4**: el brief pedía "productividad 0 fuera de turno", pero re-tunear toda la economía con shift gating excede el scope de Bloque L. **El shift es informativo + modula coste salarial** en MVP (night ×1.5). El helper `inShift()` queda implementado y listo para activarse junto con un rebalanceo de salarios+SLA.
- `moral` 0-100 con `tickMoral` (Idle +1/d, Working -1/d, Training +2/d). Deltas por evento WO completed/late/critical/failed/AOG. `moralMultiplier` 0.5x-1.2x integrado en `teamEffectiveEfficiency`.
- `effectiveWeeklySalary` ×1.5 si night. Tag `[night]` en transacción.
- Training activo: 5.000 € + 7 días en `Training` state. Helper → B1, B1 → B2, B2 → +rating.
- UI Panel Mecánicos: columnas Moral (barra coloreada) + Turno (dropdown live) + Salario coloreado + botones `🎓 👋`.

### Bloque M — Reputación segmentada (días 23-24)
**7/7 sub-tasks**.
- `ReputationState.perAirline[airlineId]` reemplaza el `value` global. `createReputation(initial, airlines)` rellena.
- `applyDelta(state, airlineId, delta)` segmentado. `applyDeltaGlobal` para eventos globales. WO/MEL eventos aplican a la aerolínea del contrato del avión.
- `tickContractMarket` cada 7d: aerolíneas con rep ≥20 sin contrato vivo pueden ofrecer (prob `(rep-20)/100`). Rep <20 nunca ofrece. Counter `C-1001+` no choca con `C-001..C-003` iniciales.
- Game over si TODAS las aerolíneas tienen rep ≤10 (no solo global ≤0).
- Save v6 con `migrateLegacyReputation` para `{value:N}` legacy.
- UI: HUD `⭐ AVG/100` (media), click → modal con lista por aerolínea, barras coloreadas, warning si rep <20.

### Bloque N — Cierre (días 25-27)
**Auto-playtest 5 seeds × 28d** con todos los sistemas activos:
- Δbalance medio -252k €, WOs/28d 116, A/C/D checks completados 1.8 medio.
- 2/5 game overs (bankruptcy) con 1 contrato.
- **Hallazgo importante**: 28 días con A/C/D checks consumiendo equipo es desafiante para 7 mecánicos + 1 contrato. El sistema funciona pero invita a contratar (Bloque K) y diferir (Bloque I). La calibración fina queda para Fase 4.

Calibraciones aplicadas:
- **Dataset MEL** 92% → ~30% deferrables (hash determinista por id).
- **Flota envejecida** al `createGame`: `ageInitialFleet` distribuye FH 0-580 por avión para que los A-checks se ejerciten en primeras semanas.

---

## Extras fuera del plan original
- **Auto-pausa en AOG**: `g.autoPauseEnabled` (default true UI, false tests headless). Solicitud directa del jugador durante validación visual de H.
- **Render-loop optimizado**: throttle 250ms + memoization (panel/modal/notifs) + invalidación explícita en cambios de tab/asignación. Solicitud del jugador tras notar clicks perdidos en cards.
- **Build script reproducible**: `.scripts/build-vanilla.mjs` (esbuild sim-all → IIFE → HTML inline). Reutilizable para todos los bloques futuros.

---

## Findings y backlog Fase 4

### Calibración pendiente
- **Economía con A/C/D activos**: con 7 mecánicos y 1 contrato, 2-3/5 partidas terminan en bancarrota a 28 días. Falta rebalancear salarios / SLA / pagos por WO / fixed cost.
- **Productividad por shift**: implementar el gating real `inShift → eff×0` requiere rebalance económico (los 7 mecánicos morning solo cubren 8/24h de la ventana operativa).

### Features descopadas
- **Tauri + SqliteBackend** (G5-G7): bundle nativo .exe + persistencia SQL. Movido a Fase 5 junto con polish.
- **Auto-hire/auto-fire IA**: el auto-playtest no escala equipo. Útil como herramienta de testing pero no es feature de juego.

### Posibles mejoras Fase 4
- Modelo de **shifts realista**: handoff entre turnos para WOs largas. Hoy una WO asignada en morning no se la pasa a afternoon.
- **Acción "Reparar ya"** sobre deferral activo: el brief I4 lo mencionaba pero MVP solo deja vencer.
- **Audits Part-145 con mayor profundidad**: el algoritmo actual es heurístico. Fase 4 podría modelar inspecciones específicas.
- **Aerolínea-aerolínea**: rep negativa de una propaga a las amigas (network effects).
- **Inventario de piezas**: brief 9.13 menciona piezas obligatorias bloqueando WO. Hoy son informativas.

### Bugs encontrados y arreglados durante Fase 3
1. **Marketing rng contaminaba trayectoria** (Bloque K): `refreshMarket` consumía `g.rng` principal → mismas seeds diferentes resultados. Fix: `marketRng` aislado.
2. **Auto-pausa rompía auto-playtest** (Bloque N): AOG pausaba el reloj → loop infinito en headless. Fix: flag `autoPauseEnabled`.
3. **Render loop devoraba clicks** (Bloque I): `innerHTML` reset cada 100ms entre mousedown y mouseup. Fix: throttle + memoization.
4. **Flota en base check seguía pickeada para line landings** (Bloque H8 prep): el guard `busyRegistrations` no incluía checks InProgress. Fix: incluir checks Scheduled/InProgress.
5. **MEL 92% deferrables vs 30% target** (Bloque N): `deriveMelCategory` hashea por id ahora.
6. **Flota inicial desconectada de contratos** (Bloque N post-cierre, hallazgo Dani): `generateInitialFleet` creaba 32 aviones (4 aerolíneas × 8) cuando solo 1 tenía contrato activo. Disonancia visual: ofertas de aerolíneas "ya en flota". Fix: la flota nace solo para aerolíneas con contrato activo; `seedFleetForAirline` añade 8 aviones cuando el jugador acepta una oferta nueva. Idempotente (re-aceptar no duplica). +7 tests en `sim_reputation_segmented.mjs`.
7. **WOs se acumulaban sin que el jugador se enterase** (UX hallazgo Dani): a 5× se generaban WOs en background sin que el ojo lo notase. Triple fix:
   - **Auto-pausa extendida a Critical** (antes solo AOG). Cubre el caso del jugador a 5× cuando emerge cualquier WO crítica.
   - **Badge tab Hangar** muestra ahora WOs SIN ASIGNAR (no total activas) con highlight rojo pulsante si >0. Llamada visual a la acción.
   - **Toggle `🔔` en HUD** expone `autoPauseEnabled`. El jugador puede silenciar la pausa en sesiones cortas. Estado tachado cuando off.
   - +4 tests en `sim_autopause.mjs` (Critical dispara, toggle off respeta).

---

## Datos clave
- Suite tests: **151 (Fase 2) → 512 (Fase 3)** = **+361 tests** en una sesión.
- 7 archivos `tests/*.mjs` nuevos en Fase 3 (sim_fleet, h2, h3, h4h7, h9, mel, autopause, part145, labor_market, shifts_moral, reputation_segmented).
- Save format: **v1 → v6** con migración legacy automática.
- Bundle vanilla: **86 KB (Fase 2)  → 146 KB (Fase 3)** = +70% por sistemas nuevos.
- Líneas de sim (TS): ~3.500 (estimado).

---

## Próximo (Fase 4)
Profundidad operativa avanzada. Pre-req: validación visual de v0.2-fase3-depth.html y feedback de Dani.

Candidatos prioritarios:
- Rebalance económico con auto-playtest mejorado (>0/5 game overs a 28d-1 contrato).
- Shift productivity gating activo.
- Acciones avanzadas: "reparar ya" deferral, downsize team mid-WO.
- Inventario de piezas + retrasos por backorder.

Plan completo se detalla al abrir Fase 4 en sesión siguiente.
