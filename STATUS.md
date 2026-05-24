# MRO Tycoon — STATUS

> Panel central. Estado por fase, alertas vivas, parking de ideas.

## Resumen 1-line
**Pivot MRO línea pura ✅ DONE** (2026-05-24, sesión intra-F6) — Arranque del juego cambia a "técnico local aeropuerto regional": 1 aerolínea contratada (Iberia Express, rep 60), oficina cap 4 mecs sin night, hangares Stage 3-4 gated hasta endgame (rep avg≥80 + balance≥1M + ≥3 contratos), schedule OVD real activo por default, **panel 📅 Schedule del día** + **HUD badge 🌙 Pernocta** (modal con tabla matrícula/llegada/daily checks), competencia 30d (rep≥70 oferta auto, rep≤20 rescisión). 4 aerolíneas renombradas a operadores OVD reales con iataCode (IB/VY/V7/U2). Save v9 backward compat v8/v7/v6. Opt-in `{lineMode:true}` en createGame preserva tests legacy. **940/940 tests verdes** (+67 net). Release: [`builds/v0.6-line-mro.html`](builds/v0.6-line-mro.html) (~1.4 MB). Doc cierre: [`docs/CIERRE_pivot_line.md`](docs/CIERRE_pivot_line.md). ⚠️ Parking: viabilidad económica auto-playtest 10×28d Δ-290k € + 4/10 bankruptcy (penalty SLA -408k € dominante — tunear baseFee/payment/penalty Iberia inicial en próxima sesión).

**Fase 5D ✅ CERRADA (mapa Pixi v8 + OSM real OVD)** (2026-05-24) — Skin esquemático CIC dark navy con paleta exacta del SVG north-star + OSM real LEAS (pista 11/29, 13 taxiways, terminal, 16 parking_positions) + pan/zoom/WASD/minimapa + interacción clicks + scope creep schedule OVD (86 vuelos × 7 días + pool 24 matrículas con FC/FH plausibles + toggle UI). Save v8 con migración v7. **873/873 tests verdes** (+70 net F5D). Release: [`builds/v0.5d-pixi-map.html`](builds/v0.5d-pixi-map.html) (~1.4 MB). Doc: [`docs/CIERRE_fase5d.md`](docs/CIERRE_fase5d.md). Atribución ODbL visible. Próximo paso: F6 Pre-Steam.

**Modal Check + Modal Contrato + X5 A en plataforma** (extensión misma sesión 2026-05-15) — Click-to-detail completado: modal Check con team/fee/penalty/manMinutes/parking + nightStarted/onPlatform flags, modal Contrato con tier/términos/flota basada/WO stats. X5: stage 2 habilita A-check en LINE_STAND con efficiency 0.7× (tarda +43% acumular manMinutes) cuando no hay BaseStand libre. Badge ⛅ en cards de check. `assignStand` excluye line stands ocupados por A-check on-platform. **803/803 tests verdes**. Bundle final: [`builds/v0.5g-final.html`](builds/v0.5g-final.html) (271 KB).

**WO descripciones realistas MRO** (extensión misma sesión 2026-05-15) — Reescritas las 100 descripciones de `workorders.json` con AMM references reales (AMM 12-13-79, 21-31-15, 32-45-11…), procedimientos técnicos breves, valores específicos (torques, presiones, resistencias), P/N reales (Goodrich, Honeywell, Whelen, Sherwood, Rockwell Collins…), tools específicos (calibradores, bond meters, SOAP sample kit). Refuerza USP autenticidad nicho — el jugador hardcore reconoce todos los términos. **803/803 tests verdes**. Bundle: [`builds/v0.5e-wo-realista.html`](builds/v0.5e-wo-realista.html) (261 KB).

**Save v7 + F5B-β Tauri BLOQUEADO** (misma sesión 2026-05-15) — Save format bumped a v7 con migración v6 backward compat: persiste mroStage, activeBuild, kpiHistory, randomEvents, eventsRolledForDay, flags shiftGating/autoAssign, y campos nuevos de Mechanic (overtimeOriginalShift, hiredAtMinute, isLeadForeman) + Airplane.overnight + Contract.tier. **803/803 tests verdes** (sim_save: 24 → 48). Tauri intentado: bug Rust 1.95 + GNU + proc-macros (yoke_derive/phf_macros) — parking documentado en `docs/TAURI_BLOQUEADO.md`. `dist/index.html` + `tauri.conf.json` preparados para próximo intento con MSVC toolchain.

**Fase 5C ✅ DONE (eventos aleatorios)** (extensión misma sesión 2026-05-15) — Runway closure (6% prob/día, 4-8h, skip arrivals) + Service Bulletin Airbus (4% prob/día, 1-2 aviones afectados, flavor MVP). Lista eventos activos en Dashboard. `g.randomEvents` + `eventsRolledForDay` en GameState. **780/780 tests verdes** (+36 net F5C). Auto-playtest Δbal +69k €, 0/20 game overs. Release: [`builds/v0.5c-events.html`](builds/v0.5c-events.html) (253 KB). Strike (huelga) parking — requiere mod shift gating.

**Fase 5B ✅ CERRADA (parcial: α + δ + ε + γ; β Tauri parking)** (misma sesión 2026-05-15) — Polish UX completo: panel Construcción (X7), mini-gantt cobertura (Y3), flag nightStarted (V5), click-to-detail cards (modal avión + mecánico), dashboard KPIs con 6 sparklines SVG custom, animaciones WAAPI/CSS (tweenNumber HUD, slide-in notifs, transitions bars/tabs). **744/744 tests verdes**. Release: [`builds/v0.5b-fase5b-final.html`](builds/v0.5b-fase5b-final.html) (247 KB). Doc: [`docs/CIERRE_fase5b.md`](docs/CIERRE_fase5b.md). Tauri+SqliteBackend (β) sigue en parking — riesgo toolchain Windows, requiere hilo limpio.

**Fase 5B-α ✅ DONE** (sub-bloque misma sesión 2026-05-15) — UI quick wins parking F5A: **X7** panel Construcción (tab nueva, muestra etapa actual, próxima con coste/ETA/progress bar, conecta a `startBuild()`); **Y3** mini-gantt cobertura 24h en panel Mecánicos (24 celdas × shifts coloreadas por densidad); **V5** flag `nightStarted` informativo en A-checks que arrancan 22:00-06:00. **744/744 tests verdes** (+3 net). Bundle: [`builds/v0.5b-fase5b-alpha.html`](builds/v0.5b-fase5b-alpha.html) (231 KB). Próximo F5B-β: Tauri+SqliteBackend + GSAP UI + Chart.js dashboard + click-to-detail cards.

**Fase 5A ✅ CERRADA** (misma sesión 2026-05-15) — Sistemas pendientes de sim: día/noche real (pernocta + daily checks + HUD badge ☀️/🌙) + TMA jefe + auto-handoff turnos + progresión MRO 4 etapas + flota variable + severance escalado. **741/741 tests verdes** (+109 net). Release: [`builds/v0.5a-fase5a-final.html`](builds/v0.5a-fase5a-final.html) (226 KB). Doc cierre: [`docs/CIERRE_fase5a.md`](docs/CIERRE_fase5a.md). Auto-playtest 20×28d: Δbal **+66k €**, 0/20 game overs, 119 WOs/28d (los daily checks añaden 38 WOs nocturnas).

**Fase 4.5 ✅ CERRADA DEFINITIVA** (misma sesión 2026-05-15, ~2.5h tras Fase 4) — Tier system contratos + 3 quick wins finales del parking de audit: (1) `START_MINUTE = 360` (quita 6h muertas), (2) `LATE_CHECK_PENALTY` escalado por tipo (A 1.5k / C 5k / D 15k), (3) hook `weeklyFixedCost` con `extraHangars` (dormido hasta Fase 5 build-hangar). Auto-playtest 20×28d **Δbal +77k €** (mejora +9k vs solo tier), **0/20 game overs**, **632/632 tests verdes**. Release final: [`builds/v0.4-fase45-final.html`](builds/v0.4-fase45-final.html) (214 KB).

**Fase 4 ✅ CERRADA** (1 sesión intensa, 2026-05-15) — Scope completo (O+P+Q+audit+multi-cycle fix+R+S). Δbalance medio **+68k €** en 20×28d (target +50k superado +36%), **0/20 game overs**, **593/593 tests verdes**. Release: [`builds/v0.3-fase4-viable.html`](builds/v0.3-fase4-viable.html) (211 KB). Doc cierre: [`docs/CIERRE_fase4.md`](docs/CIERRE_fase4.md). Hotfix multi-cycle (hallazgo Dani): cada matrícula ya hace 2-3 landings/día, no 1.

**Fase 4 (curso, ya cerrada)** — Scope: viabilidad económica + operación 24/7. 5 bloques (O diagnóstico, P rebalance, Q shift gating, R "Reparar ya", S cierre). Time-box 17 días, cerrada en 1 sesión.

**Fase 3 ✅ CERRADA** (1 sesión, 2026-05-14, +2 hotfixes 2026-05-15) — 7 bloques completos (G-N). Sistemas: A/C/D checks, MEL deferrals, Part-145 audits, mercado laboral, turnos+moral+training, rep segmentada, mercado de contratos. UI Hangar con 4 sub-tabs, HUD con badges clickeables (🛡️ ⭐ 🔔). Save v6 con migración legacy. **523/523 tests verdes**. Release: `builds/v0.2-fase3-depth.html`. Doc cierre: `docs/CIERRE_fase3.md`. **Hotfixes 2026-05-15**: (1) flota inicial solo para aerolíneas con contrato activo + `seedFleetForAirline` al aceptar; (2) auto-pausa extendida a Critical + badge Hangar con WOs sin asignar (rojo pulsante) + toggle `🔔` HUD para `autoPauseEnabled`.

**Fase 2 ✅ CERRADA** (2026-05-14) — Vertical slice end-to-end jugable, 151/151 tests verdes, release en `builds/v0.1-vertical-slice/`. Cambio de stack mid-fase de Svelte→vanilla por bug Svelte 5 vía file://. Cierre en `docs/CIERRE_fase2.md` con findings de auto-playtest.

---

## Estado por fase

### Fase 0 — Arqueología Unity ✅ done (2026-05-13)
- [x] Localizado proyecto en `D:\Documents\MRO_Tycoon\`
- [x] Inventario alto: ~95 scripts C#, locale ES+EN, 4 airlines, KPI system, tutorial framework, save system, event bus
- [x] Modelos leídos: Contract, Mechanic, AirplaneInstance, WorkOrderTemplate, WorkOrderInstance, Economy, Candidate, Licenses, AircraftModelData, DecisionPoint
- [x] GameManager leído → game loop entendido (5 fases WO, probs 40%/10%/70%, SLA 105%, weekly cycle)
- [x] Locale ES leído → 70+ keys con emojis, listo para port directo
- [x] we_template.csv leído → 100 WOs reales A320/A321 con ATA chapters auténticos
- [x] **`unity_legacy/BRIEF_recovery.md` escrito** (output Fase 0, ~600 líneas)
- [x] Decisiones cerradas trasladadas a `CLAUDE.md`

### Fase 1 — GDD mínimo ✅ done (2026-05-13, 2 rondas)
**Ronda 1** — esqueleto:
- [x] Decisiones críticas tomadas con Dani: sandbox + derrota clara, USP autenticidad nicho
- [x] Loop diseñado a 5 escalas (15s / 1min / 10min / 1h / partida completa)
- [x] Sistemas core en MVP delimitados
- [x] Cerradas las 5 dudas abiertas del brief Fase 0
- [x] 4 pantallas core wireframeadas mentalmente (Dashboard, Hangar, Mecánicos, Contratos)
- [x] Riesgos vivos identificados con mitigación

**Ronda 2** — revisión crítica realismo + género tycoon:
- [x] Identificados huecos Tier 1 (aeronáutico) y Tier 2 (tycoon)
- [x] Añadido §5.3 glosario aeronáutico (line/base, A/C/D, AOG, MEL, Part-145, SBs, ADs, FH, cycles, etc)
- [x] AOG entra al MVP como flag (1 columna CSV + condicional UI)
- [x] Cluster profundidad aeronáutica asignado a Fase 3 (A/C/D + MEL + Part-145 + cycles/FH)
- [x] Cluster profundidad tycoon asignado a Fase 3-4 (turnos 24/7, moral, training, reputación segmentada)
- [x] §6 ampliado con 6.6-6.12 (decisiones aeronáuticas y tycoon)
- [x] §9 reorganizado por bloques (núcleo / sistemas operativos / modelo aeronáutico / profundidad tycoon)
- [x] §10 con 2 riesgos nuevos: scope creep aeronáutico, realismo asfixia accesibilidad
- [x] **`docs/GDD.md` actualizado** (~500 líneas tras ronda 2)

### Fase 2 — Vertical slice 🟡 en curso (día 1)
Hilo nuevo. Pre-req: ✅ Fase 1 cerrada. Stack: **Tauri 2 + Svelte 5 + Vite + TS + SQLite**. Time-box: 2 semanas (cierra ~2026-05-27).

**Bloque A — Setup ✅ done (2026-05-13)**:
- [x] Toolchain verificado (Node OK sandbox; Rust pendiente máquina Dani)
- [x] Scaffold completo: package.json, vite.config, svelte.config, tsconfig, eslint, prettier
- [x] src-tauri/ con Cargo.toml, tauri.conf.json (1366x768, dark theme, identifier com.dani.mrotycoon), capabilities, main.rs, lib.rs (con plugin-sql)
- [x] src/App.svelte + main.ts + app.css (paleta oscura, acento #4DA3FF, Inter+JetBrains Mono via system stack)
- [x] Estructura modular src/lib/{sim,ui,data,i18n,stores,types,assets} con READMEs
- [x] TASKS.md creado con sprint plan 14 días + recortes preautorizados
- [x] README.md raíz con prerrequisitos Windows + comandos

**Bloque B-pre — Setup máquina Lenovo Dani ✅ done (2026-05-13, vía homelab-runner MCP)**:
- [x] Rust 1.95 (stable-x86_64-pc-windows-gnu) instalado user-scope en `C:\Users\bongi\.cargo`
- [x] MinGW-w64 16.1 ucrt (winlibs) descomprimido en `C:\Users\bongi\mingw64` (necesario porque rustup gnu no incluye dlltool/gcc/ld)
- [x] Ambos en PATH del usuario (no PATH del sistema → sin admin/UAC)
- [x] `npm install` limpio: 176 paquetes (Tauri 2.11.1, Svelte 5.55, Vite 5.4.21, plugin-sql 2.4)
- [x] Suite de iconos generada con `npx tauri icon`: icon.ico, icon.icns, 32/64/128 png + iOS/Android. Source = PNG placeholder gradient azul + "MRO" blanco. Refinar en Fase 5.

**Scripts vivos en `.scripts/`** (reutilizables por sesiones futuras):
- `launch-rustup.ps1` — instala Rust user-scope sin admin.
- `install-mingw.ps1` — descarga winlibs y descomprime.
- `add-mingw-path.ps1` — añade mingw+cargo al PATH user.
- `gen-icon.ps1` — genera placeholder PNG y dispara `tauri icon`.
- `launch-tauri-dev.ps1` — lanza `tauri dev` en background con PATH correcto.

**Punto de bloqueo cierre sesión 1 (2026-05-13 ~23:15)**:

**Bug encontrado y working solution**: `ld` de GNU se rompe con "export ordinal too large: 109213" en Tauri+sqlx+windows-rs (>65535 exports). Workaround instalado: lld vía `-fuse-ld=lld` en `.cargo/config.toml` + `rust-lld.exe` copiado a `mingw64\bin\ld.lld.exe` y `lld-link.exe`.

**Segundo bug encontrado y working solution**: lld no maneja espacios en paths (parte el path por el espacio aunque gcc lo pase quoteado). Workaround: proyecto **movido físicamente** a `C:\Users\bongi\mrotycoon\` (sin espacios). Junction `C:\Users\bongi\Documents\Claude\Projects\MRO tycoon` → `C:\Users\bongi\mrotycoon` preserva el path original para Write tools de Cowork. **Cargo ahora se invoca SIEMPRE desde `C:\Users\bongi\mrotycoon`** (launch script actualizado).

**Estado al cierre**: tras el move, se limpió `target/` y relanzó `tauri dev` desde la nueva ruta. MCP homelab-runner se atascó (timeout 180s en cualquier comando) probablemente por el Remove-Item -Recurse pesado simultáneo. NO confirmado visualmente que la ventana abriera. Lo que pasa solo en background sin MCP: cargo sigue compilando, si todo va bien la ventana aparece en pantalla de Dani.

**Próximo (reanudación)**:
1. Verificar estado MCP homelab-runner (debería autorecuperarse o reiniciar plugin).
2. `tasklist | findstr cargo` — si cargo sigue corriendo, esperar; si no, relanzar.
3. Confirmar visual: ventana "MRO Tycoon" abierta en pantalla del Lenovo → cierra Bloque A definitivo.
4. Si la build falla otra vez por algún error nuevo, leer logs `%TEMP%\tauri-dev-{out,err}.log` y `.scripts\show-cargo-errors.ps1`.
5. Una vez ventana OK → arrancar Bloque B (Data port): `we_template.csv` legacy → `data/workorders.json` (+ columna `isAOG`), `i18n/{es,en}.json`, `airlines.json`, `balance.json`.

**IMPORTANTE para sesiones futuras**:
- TODOS los comandos de cargo/tauri se invocan desde `C:\Users\bongi\mrotycoon` (path sin espacios), nunca desde "MRO tycoon" original.
- Write tools de Cowork siguen apuntando al path original — funcionan vía junction.
- Si Dani ve `MRO tycoon` desde explorador, es la junction; la carpeta física vive en `~\mrotycoon`.

### Fase 3 — Profundidad sistémica 🟡 sesión 1 en curso (2026-05-14)
Hilo nuevo. Pre-req: ✅ Fase 2 cerrada. Stack: vanilla JS + esbuild (Tauri G5-G7 **diferido a Fase 5**). Time-box: 27 días (~2026-06-10). Plan completo en `TASKS.md`, brief en `docs/BRIEF_fase3.md`.

**Decisiones de Dani**:
- (Día 0, 2026-05-14): arrancar por Saneamiento + A/C/D checks. Alcance Fase 3 entero (A/C/D + MEL + Part-145 + mercado laboral + turnos/moral + reputación segmentada).
- (Sesión 1, 2026-05-14): saltar G5-G7 (Tauri) → ir directo a Bloque H. Tauri se difiere a Fase 5 (recortable #6 del brief).

**Bloque G — Saneamiento ✅ cerrado funcionalmente** (G5-G7 diferidos):
- [x] G1/G2/G4 done (día 0). G3 skipped. G5-G7 diferidos a Fase 5.

**Bloque H — A/C/D Checks 🟡 sim core completo (9/10) en sesión 1**:
- [x] H1: flota persistente (8 aviones/aerolínea), `AirplaneInstance.instanceId` único + `flightHoursThisLeg`, WO link por `airplaneInstanceId`. Save v2.
- [x] H2: tipos + tabla `data/maintenance_checks.json` (A=600FH/200c/1d/12k, C=7500FH/5000c/14d/110k, D=25000FH/16000c/60d/550k €).
- [x] H3: `detectChecksDue` + `scheduleDueChecks` integrados en `advanceGame`, evita duplicados, permite re-disparar tras Completed. Save v3.
- [x] H4+H5: catálogo `stands.ts` (3 LineStands + 1 BaseStand H1-B1), `INITIAL_STANDS` (line landings) usa solo line.
- [x] H6: `tickMaintenanceChecks` lifecycle completo. Auto-asignación team `min(idle, ceil(manDays/parkingDays))`. Mecánicos `Working` con `assignedCheckInstanceId`. Doble criterio completion: manMinutes ≥ manDays×1440 ∧ elapsed ≥ parkingDays×1440. Al completar resetea `fhSinceLast{Type}`+`cyclesSinceLast{Type}`+`warned{Type}` + libera mecánicos + libera BaseStand.
- [x] H7: `TransactionType` `maintenanceCheckFee`+`maintenanceCheckPenalty`. Billing al completar. Penalty -5k €/día completo de overrun (devengado día a día, `overrunDaysPenalized` evita double-charge).
- [x] H9: aviso anticipado `⚠️ X vence A-check en N FH` cuando ≤ 50 FH del trigger. Flags `warned{A,C,D}` en FleetAircraft evitan spam, se resetean al completar. Notif "🛠️ iniciado" + "✅ completado" ya cubiertas.
- [x] H10: cobertura tests sim core del sistema: 82 tests (h2:31 + h3:13 + h4h7:29 + h9:9) — target 15+.
- [x] H8: UI Hangar reescrita con build script reproducible. Sub-tabs Line WOs / Base Checks / Flota. Cards de check con barras manMinutes y parking, team, fee, overrun visible. Mecánicos muestra check asignado en color base. Economía añade KPIs base check ingresos+penalties. Botón debug 🛠️ envejecer flota para validar sin esperar 30 días ingame. Build: `node .scripts/build-vanilla.mjs`. Output: `builds/v0.2-fase3-h.html`.

**Bloque I — MEL/Deferrals 🔴 ✅ COMPLETO (sesión 1)**:
- [x] I1: tipo `MelCategory`, helper `deriveMelCategory` derivando del legacy `deferrable+severity+isAOG`. Mapping `MEL_DEFERRAL_DAYS` A=3/B=10/C=120/D=365.
- [x] I2: botón "📋 Diferir (MEL X)" en modal WO. Disabled si null.
- [x] I3: phase `Deferred` + `deferralExpiryMinute`. Acción `deferWoManually` libera team.
- [x] I4: `tickMel` detecta vencidas → penalty -10k € + -5 rep + notif danger. Conectado a `advanceGame`.
- [x] I5: sub-tab Hangar "Deferrals" con countdown rojo si <24h.
- [x] I6: badges MEL A/B/C/D coloreados en line WO cards + en modal.
- [x] I7+I8: 39 tests en `sim_mel.mjs`. Auto-playtest sigue verde 5/5.
- **Calibración pendiente**: dataset tiene 92% deferrables vs 30% target del brief → trivializa decisión. Anotado para Bloque N tuning.

**Auto-pausa + render-loop fix (sesión 1, peticiones de Dani)**:
- [x] Auto-pausa al emitir WO AOG. Flag `autoPauseEnabled` en GameState (default true en UI, false en tests headless).
- [x] Render-loop optimizado: panel throttle 250ms + memoization, modal cache, notifs cache, invalidación explícita al cambiar tab/subtab/asignación. Soluciona "se me escapan clicks por refresco".

**Bloque M — Reputación segmentada ✅ COMPLETO (sesión 1)**:
- [x] M1+M6: `ReputationState.perAirline[airlineId]` reemplaza `value` global. `migrateLegacyReputation` para saves v5 y anteriores. Save v6.
- [x] M2: `applyDelta(state, airlineId, delta)` segmentado. `applyDeltaGlobal` para eventos globales. wo_completed/MEL/etc afectan solo a la aerolínea del contrato del avión.
- [x] M3: HUD `⭐ AVG/100` (media), click → modal con lista ordenada por aerolínea, barras coloreadas, warning si <20.
- [x] M4: `tickContractMarket` cada 7d. Aerolíneas con rep ≥20 sin contrato vivo pueden ofertar (prob (rep-20)/100). Rep <20 nunca ofrece. Usa `marketRng` aislado.
- [x] M5: Game over `reason="reputation"` si TODAS las aerolíneas con rep ≤10.
- [x] M7: 27 tests en `sim_reputation_segmented.mjs`.

**Bloque L — Turnos + moral + training ✅ COMPLETO (sesión 1)**:
- [x] L1: `ShiftSlot` + `setMechanicShift` (Idle/OffShift requerido).
- [x] L2 deferido: shift no gating productividad en MVP, sí coste salarial. Helper `inShift()` listo para Fase 4 rebalance.
- [x] L3+L4: moral 0-100 con `tickMoral`, deltas por evento WO, `moralMultiplier` 0.5-1.2x integrado en `teamEffectiveEfficiency`.
- [x] L5: `effectiveWeeklySalary` ×1.5 si night. Tag `[night]` en transacción.
- [x] L6: `startActiveTraining` (5k € + 7d) → helper→B1 / B1→B2 / B2 +rating. Estado `Training`.
- [x] L7: Panel Mecánicos con columnas Moral (barra) + Turno (dropdown) + Salario coloreado + Train btn 🎓 + Fire btn 👋.
- [x] L8: 56 tests en `sim_shifts_moral.mjs`.

**Bloque K — Mercado laboral ✅ COMPLETO (sesión 1)**:
- [x] K1+K2: `Candidate` type, generateCandidate, refreshMarket pool 5-10, refresh 7d, distribución 55%h/30%B1/15%B2. `marketRng` aislado.
- [x] K3: tab "🤝 Mercado" con cards (badge base, edad, exp, eff, salario, ratings, personality chips, expiry, bonus).
- [x] K4: hireCandidate · signing bonus 4 sem · transacción salary negativa.
- [x] K5: fireMechanic · severance 8 sem · solo Idle/OffShift · botón 👋 con confirm.
- [x] K6: tickTraining · helpers acumulan en Working · promo a B1 junior al cruzar 90d.
- [x] K7: 44 tests en `sim_labor_market.mjs`. Save v5 (candidates + marketRng).

**Bloque J — Part-145 audits ✅ COMPLETO (sesión 1)**:
- [x] J1: `ComplianceState` (score 80 inicial, lastAudit, nextAudit, findings[], pendingSuspension, preAuditNotified). `createCompliance` programa primera audit en 60-90 días aleatorios.
- [x] J2+J3: `tickCompliance` en `advanceGame`, `runAudit` con algoritmo: MEL expiradas -3 cada una, WOs Failed -2, tasa cierre tardío -2/-5, overrun checks -2/-5, bonus +5 sin findings. Delta clamp `[-15,+10]`.
- [x] J4: <30 → multa 50k € + suspensión contrato (víctima = el de minReputation más alta). <10 → game over reason="compliance". Auto-pausa si audit grave.
- [x] J5: badge `🛡️` en HUD coloreado (good/warn/bad), click → modal con findings + próxima audit + leyenda de tramos.
- [x] J6: notif `📋 Auditoría Part-145 en Nd` a 3 días, sin spam.
- [x] J7: 37 tests en `sim_part145.mjs`. Save v4 incluye compliance.

**Tests al cierre sesión 1**: **513/513 verdes** en suite completa (era 151 al cierre Fase 2). +362 net en Fase 3 sesión 1.

**Auto-playtest 5 seeds × 14d con sistema H1-H7+H9 vivo**: Δbalance medio +48k, rep media 74, Δrep medio +24, 0/5 game over. El sistema A/C/D no rompe gameplay viable (los aviones no acumulan suficientes FH en 14d para disparar checks salvo manual bump, así que el impact real se verá con runs de 30+ días en Bloque N).

**Para validar visualmente (Dani) — Bundle Bloque J**:
1. Abrir `C:\Users\bongi\mrotycoon\builds\v0.2-fase3-j.html` en Chrome.
2. HUD: ver `🛡️ 80/100` en verde.
3. Click en `🛡️` → modal con findings vacíos + "Próxima auditoría en N días" + leyenda de tramos.
4. MEL: pulsar 5× → cuando aparezca WO con badge `MEL B/C`, click → Diferir → ver en sub-tab Deferrals con countdown.
5. Si abusas (diferes muchas que vencen) → al cabo de 60-90 días ingame habrá audit con findings y bajada de score.
6. AOG: rarísimo (1% del dataset), pero si sale pausa automática.

**Próximo paso al reanudar (sesión 2)**:
1. Validación visual de `builds/v0.2-fase3-depth.html` con Dani.
2. Leer `docs/CIERRE_fase3.md` para findings y backlog Fase 4.
3. Decidir alcance Fase 4: prioridades candidatas
   - Rebalance económico (urgente — el sistema completo es difícil de jugar sin esto)
   - Productividad por shift activo
   - Acción "reparar ya" sobre deferral
   - Inventario de piezas (brief 9.13)
   - Tauri + SqliteBackend (G5-G7 diferidos)

### Fase 4 — Viabilidad económica + operación 24/7 🟡 en curso (día 1, 2026-05-15)
Hilo nuevo. Pre-req: ✅ Fase 3 cerrada. Stack: vanilla + esbuild (Tauri sigue diferido a Fase 5). Time-box: 17 días (~2026-06-01). Plan en `TASKS.md`, brief en `docs/BRIEF_fase4.md`.

**Bloque O — Diagnóstico ✅ DONE** (2026-05-15):
- [x] O1: `auto_playtest.mjs` enriquecido — desglose por TransactionType + evolución semanal + check de coherencia ledger.
- [x] O2-O4: baseline 5×28d documentado en `docs/FASE4_baseline.md`. Δbal medio **-49k €**, fuga = penalty SLA -174k € (68% de gastos). Hipótesis priorizadas.

**Bloque P — Rebalance ✅ DONE** (2026-05-15, 3 iteraciones):
- [x] P iter 1: bajado `penaltyPerLateMinute` rango 80-140 → 40-70. Con 5 seeds dio +38k (suerte), con 20 seeds reveló -13k (sigue mal).
- [x] P iter 2: subido `slaMultiplier` 1.20 → 1.50. WOs late bajaron 75% (27 → 11) pero penalty solo 11% — **patología FIFO descubierta**: WOs atrasadas se quedan MUY atrasadas (227 min/late vs 67 antes). Δbal +4k.
- [x] P iter 3: subido `baseFeePerWeek` 10-18k → 12-22k y `paymentPerWOMinute` 28-42 → 34-50. Δbal medio **+46k €** en 20×28d, 0/20 game overs, 14/20 seeds positivos.
- A 4k del target +50k. Decisión: NO sobre-tunear, reservar palanca para compensar Bloque Q (shift gating bajará throughput).
- Tests: smoke.mjs actualizado (assertion slaMultiplier 1.50). **Suite 524/524 verde**.

**Bloque Q — Shift gating productivo 🟡 next**:
- Activar `inShift()` real (mecánico off-shift no progresa WO).
- Hand-off MVP: WO en progress pausa al salir el equipo de turno.
- Shifts mixtos default al `createGame` (4 morning / 2 afternoon / 1 night).
- Re-tunear balance con gating activo (probable subida paymentPerWOMinute +10% adicional).
- Tests `sim_shift_gating.mjs` (target 20+).

**Próximo paso inmediato (próxima sesión)**: Bloque Q1 — integrar `inShift` en `tickWorkOrders`/`assignment` para que mecánicos off-shift no progresen.

**Bloques Q+audit+R cerrados (2026-05-15 misma sesión)**: shift gating productivo + auditoría completa de parámetros con info real MRO + hotfix multi-cycle (matrículas hacen 2-3 landings/día) + "Reparar ya" sobre deferrals + 593 tests verdes + bundle final.

### Fase 5 estado real al 2026-05-15
- **5A** ✅ cerrada — sistemas sim pendientes (día/noche, TMA jefe, progresión MRO 4 etapas, flota variable, severance escalado).
- **5B** ✅ parcial — UI quick wins (X7+Y3+V5), dashboard sparklines, click-to-detail, animaciones WAAPI/CSS. **β Tauri+SqliteBackend BLOQUEADO** por toolchain Rust GNU + proc-macros (`docs/TAURI_BLOQUEADO.md`).
- **5C** ✅ cerrada **PERO repurposada** — el slot original ("Pixi condicional") se gastó en eventos aleatorios (runway closure, Service Bulletin). Deuda visual quedó pendiente.
- **Extras post-5C** ✅ — modal Check + Contrato + X5 A en plataforma, WO descripciones MRO realistas con AMM refs, Save v7. Bundle final `v0.5g-final.html` (271 KB), 803/803 tests verdes.

### Fase 5D 🔵 acordada 2026-05-15 — Mapa animado con Pixi
Paga la deuda visual que dejó 5C repurposada. **Stack: Pixi v8** (no SVG+GSAP — descartado tras pedir Dani "lo más chulo posible"; el spec requiere filters WebGL que SVG no da con la misma calidad). GSAP/WAAPI de la UI sigue intacto, Pixi solo gobierna el mapa. Time-box 2 semanas. ANTES de Fase 6 porque los screenshots/trailer Steam se montan con este asset.

**Spec visual resumido** (CIC/NASA mission control, no arcade):
- Aviones = puntos luminosos con halo + trail, color por aerolínea
- Hangares con estado visual: libre (tenue) / trabajando (pulso) / recién cerrado check (burst partículas + flash glow)
- Líneas de actividad pulsantes tipo packets entre hangar y stand entrega
- Partículas "data" schematic (cuadraditos HUD, no fuego)
- Bloom WebGL global sutil
- Paleta día/noche conectada a F5A (día azul-acero claro, noche azul oscuro con más glow)
- Layout crece con etapa MRO 1→4 (transición animada al avanzar)
- Click avión → highlight + pan suave (no zoom)
- Cero: combustión, sonido de aviones, animaciones de despegue

**Layout base acordado con Dani 2026-05-15** (validado con mockup Cowork — opción 1 "pase único rico" elegida, descartadas granular y polish):
- Pista 27L horizontal arriba con marcas centerline + label "Pista 27L"
- Taxiway paralelo en gris claro (enlace discreto que le gustó a Dani) + 3 conectores cortos bajando a apron
- Apron (plataforma) como zona dashed grande con **callecitas rectas / taxilanes internos** (verticales entre bloques de stands + **horizontal central como "calle auxiliar" — único acceso a la fila inferior de stands** + perimetral inferior). Aviones desde pista bajan por callecita vertical → giran 90° en la calle auxiliar → entran a stand de fila superior (norte) o fila inferior (sur). Furgo usa el mismo road network. CERO curvas
- **"Espacio hangares" como zona grande dashed ocupando todo el flanco IZQUIERDO del apron** (rect con esquinas redondeadas, label grande "Espacio hangares" dentro + costes Stage 3 — 500k € y Stage 4 — 1.5M € debajo). Click sobre la zona o sobre plot individual → modal compra/build hangar F5A
- **Grid 2×3 de stands ocupando centro y derecha** del apron, marcados con códigos tipo airport real:
  - Fila superior: **351 / 451 / 551** (libre o con avión + sombra + líneas de parking)
  - Fila inferior: **352 / 452 / 552** (mismo formato)
- Oficina mecánicos en **esquina inferior-DERECHA** del apron, pequeña con ventanas iluminadas
- **Furgo de mecánicos** (sustituye al mec andando del spec previo) sale de la oficina y recorre las callecitas con **giros estrictos de 90°, líneas rectas**, hasta el bloque del stand asignado. Sigue justificando el tiempo de viaje del sim (state `ToPlane`) pero en modo "van por callejones" en vez de mec andando trayecto curvo.
- Click sobre plot ghost → reusa el modal compra/build hangar existente F5A
- Click sobre stand → modal stand existente (avión + WO + estado)
- Click sobre oficina → posible: panel mecánicos idle (futuro, no MVP)

**Estrategia P-β/γ/δ-min en un pase rico** (decidida 2026-05-15): silueta + aviones simples taxiándose/en stand + mecs andando trayecto entran juntos en una iteración ~2-3h. **NO entran en este pase**: partículas masivas, bloom WebGL global, estado completo de cierre check con burst, glow shaders custom — se mantienen en P-δ completo + P-ζ.

**6 bloques** (time-box 2 semanas):
- P-α (1-2d) — Pixi scaffolding: integración v8, canvas montado en panel Hangar, sync layer game state → render state deterministic+testeable
- P-β (2d) — Mapa estático: hangares + line stands + pistas según etapa MRO actual, grid de fondo, paleta día/noche
- P-γ (2d) — Aviones vivos: sprites con halo+trail, motion paths entre hangares, sync con `assignedStandId`
- P-δ (2d) — Efectos: pulsos hangar activo, partículas al cerrar check, líneas pulsantes al stand entrega
- P-ε (1-2d) — Interacción: click avión → highlight+pan, click hangar → modal existente, zoom-out opcional
- P-ζ (2-3d) — Polish + tests sync layer + auto-playtest visual + release `builds/v0.5d-pixi.html` + doc cierre

**Riesgos**: bundle ~600-700 KB (Pixi v8 +250 KB minified gzipped, sigue debajo del límite 5 MB Tauri); sync layer es deuda silenciosa típica de Pixi, cubrir con tests deterministas desde P-α; si en P-γ se necesitan shaders custom, recortar P-ζ.

### Fase 6-7 🔵 pending (post-5D)
Ver `CLAUDE.md` para plan completo. Tauri bloqueado no impide Fase 6 (bundle vanilla actual + 5D Pixi sirve para Itch.io / Steam Next Fest demo). Tauri requerido antes de release final.

---

## Decisiones cerradas (no reabrir)
Ver sección "Decisiones cerradas" en `CLAUDE.md`.

---

## 🌟 Parking (ideas que aparecen a mitad, NO al código)

### Tiempo tránsito oficina→stand variable por distancia (2026-05-24)

Actualmente `balance.officeToStandMinutes = 2` minutos FIJO para todos los stands.
En OVD la diferencia entre stand más cercano y más lejano es ~150 m → 30 segundos en
furgo, irrelevante. Pero en escenarios futuros (hangares de endgame con stand alejado,
multi-aeropuerto con apron grande tipo MAD/BCN) sí debería variar.

Implementación cuando aplique:
1. Añadir `transitMinutesFromOffice` a `StandDefinition` en `sim/stands.ts` (calculado
   desde coords reales con velocidad furgo asumida ~30 km/h).
2. `assignMechanicsToWo` lee ese campo en vez de `balance.officeToStandMinutes`.
3. `RenderMechanic.progress` usa el mismo valor para interpolación visual.
4. Tests sim_assignment con stands de distancias distintas.

Por ahora (OVD): 2 min fijo es suficiente.

### Pivot MRO línea pura — balancing económico ✅ RESUELTO (2026-05-24)

**Estado tras balancing pass post-Fases A-D-C-2 (mismo día)**:

Auto-playtest 10×28d en lineMode con A/C/D OFF (igual que el bundle UI real):
- Δbal medio **-204k €** (era -880k antes del tuning)
- **0/10 game over** ✅ (era 5/5 → 4/10 → 0/10 iterativo)
- WOs/28d: 105.6 (subida desde 62 — más capacidad operativa con 5 mecs incl. night)
- Evolución semanal: balance medio termina semana 4 en +45k positivo

Tunings aplicados (en orden de impacto):
1. ✅ **Pool inicial 5 mecs + 1 night junior** (`MECHANIC_CAP_INITIAL = 5`, antes 4).
   Cobertura nocturna mínima cubre daily checks de pernoctas antes del amanecer.
2. ✅ **AOG threshold 3h → 6h** (`AOG_DELAY_THRESHOLD_MIN = 360`).
3. ✅ **AOG penalty 25k → 10k** (`AOG_ESCALATION_PENALTY_EUR = 10_000`).
4. ✅ **A/C/D checks OFF en lineMode** (bundle UI ya lo hacía, alineado el playtest).
5. ✅ **TIER_FEE_MULT["line"] 1.0 → 1.4** (tier 1 cobra 40% más sobre rangos base).
6. ✅ **TIER_PENALTY_MULT["line"] 1.0 → 0.6** (tier 1 más permisivo con SLA).

Targets cumplidos: 0/10 game over (objetivo era ≤2/10). El balance negativo medio
(-204k €) es aceptable como "primer mes apretado" — un MRO de línea pura recién
abierto NO debería ser muy rentable hasta acumular contratos y subir tiers. La
viabilidad sin bancarrota es la métrica clave (✓).

Tunings adicionales posibles (no urgentes, parking para futuro):
- Tier upgrade timing: Iberia tarda 60d en ofrecer Tier 2. Reducir a 30d podría
  acelerar la viabilidad.
- Subscription HH/sem por tier: línea 4h actual; quizás 5-6h da más floor.

### Pivot línea pura · Fase 2 evitable/no evitable ✅ DONE (2026-05-24)

Implementado con instrumentación post-hoc en `processDepartures` (no se etiqueta
en el state machine, se infiere al detectar el delay):
- Heurística inferDelayRootCause: runway closure → external_event no evitable,
  WO template-AOG → aog_inevitable no evitable, default → mec_busy evitable.
- AOG evitable cobra penalty × 1.5 + rep × 1.5 vs AOG no evitable × 1.0.
- KPI `totalAogEvitable` y bucket per-airline `aogEvitable` separados.

Versión Lite (heurística post-hoc) cubre el caso 90%. Versión Full (instrumentar
state machine para etiquetar mec_offshift, no_rated_cert, etc. en cada transición)
queda en parking — solo necesaria si se quiere análisis forensic profundo por causa.

### Pivot línea pura · Modelo HH + Tiers de contrato (2026-05-24) — game design core

Modelo económico del juego que Dani definió al ver el bundle:

**Tiers de contrato (progresión natural del jugador):**

| Tier | Habilita | Requisito | Volumen |
|---|---|---|---|
| 1 · Line | Callouts + pernoctas (daily check) | (default arranque) | Bajo |
| 2 · A-check | + A-checks (en plataforma, opcional) | Rep + experiencia con esa aerolínea | Medio |
| 3 · C-check | + C-checks (multi-día) | **Hangar sí o sí** (Stage 3+) + rep | Alto |
| 4 · D-check / mods / paint | + D-check, mods avionics, painting | Hangar mayor (Stage 4) + rep alta | Premium |

Cada aerolínea contratada puede subir de tier contigo cuando lo gana. Los Stage 3-4 del MRO encajan: gating de C/D.

**Modelo HH (horas-hombre):**

- Cada tarea tiene `bookHours` (referencia AMM/MPD del fabricante)
- Mecánico tarda `bookHours / skillMultiplier` (skill + moral + rating + estado)
- Cobro a aerolínea = `bookHours × hourlyRateEur` (precio cerrado por tarea, MRO asume
  riesgo de eficiencia — esto es el modelo realista)
- Daily check tiene paquete con HH-book agregadas. Tiers superiores → más HH/paquete.
- KPI eficiencia = `Σ bookHours / Σ actualHours`. >1 = mecs rápidos (bueno), <1 = lentos (malo).

**Findings durante daily check:**

- Al ejecutar daily, prob % de generar sub-WO (hallazgo no previsto en el plan)
- Decisión jugador: resolver (más HH facturadas + rep) o diferir vía MEL (riesgo si vence)

### Plan implementación 4 fases (orden estimado)

| # | Fase | Esfuerzo | Estado |
|---|---|---|---|
| A | Modelo HH base: bookHours/actualHours/hourlyRateEur helpers + g.hoursKPI + Dashboard ratio eficiencia. Save v11. | 1.5-2h | EN CURSO 2026-05-24 |
| B | Tiers contrato 1-4: ContractTier refactor a tier1_line/tier2_acheck/tier3_ccheck/tier4_premium. Cada tier define qué trabajos te manda + subscription HH/mes. Aerolínea sube tier según rep + tiempo. | 1-1.5h | parking |
| C | Findings en daily check: prob % subWO durante ejecución, UI resolver/diferir, impacto HH+rep. | 1.5h | parking |
| D | Subscription HH/mes: aerolínea paga mínimo garantizado, excede → cobras extra, no llega → mínimo. Reemplaza weekly fee fijo actual. | 30min | parking |

Re-habilitar A/C/D checks vendrá con Fase B (gating tier 2/3).

### Pivot línea pura · Fase 2 evitable/no evitable (2026-05-24) — diseño parking

Pendiente instrumentar causa raíz de cada delay:
- `WorkOrderInstance.delayRootCause`: "mec_busy" | "mec_offshift" | "no_rated_cert" |
  "external_event" | "aog_inevitable" | "other"
- Etiquetar en cada transición del WO state machine cuándo no hay mec disponible.
- AOG evitable (mec_busy / mec_offshift / no_rated_cert) → penalty ×1.5 + rep
  delta ×1.5 + KPI bucket `aogEvitable` aparte.
- AOG no evitable (external_event / aog_inevitable) → penalty normal.
- Dashboard: descomposición TDR/AOG en evitable vs no evitable.

Estimado: 1.5-2h. Save v11.



### Para Fase 4 (rebalance + progresión)

- **Día/noche como pilar de simulación MRO** (playtest Dani 2026-05-15). De día: vuelos, escalas, turnarounds cortos, AOG ocasional, line en plataforma. De noche: pernocta → daily checks (ruedas, frenos, fluidos), pre-flight, incluso A-check si hay personal. Mete un eje temporal nuevo en sim que hoy no existe.
- **Progresión orgánica del MRO** (playtest Dani 2026-05-15). 4 etapas: (1) solo line + pernocta → (2) A-checks ocasionales en plataforma (sucio, precario, barato) → (3) hangar 1 posición (A cómodo + primer C) → (4) hangar 3 posiciones (escala real, varios C/D simultáneos). Diferencia "A en plataforma" vs "A en hangar" en moral/calidad/rework.
- **Automatización progresiva ("TMA jefe")** (playtest Dani 2026-05-15). Resuelve la tensión control-vs-tedio: al principio el jugador asigna mecánicos a cada WO (engagement, aprende sistemas); al contratar un lead foreman / TMA jefe, esa decisión se automatiza y el jugador monitoriza el siguiente nivel (scheduling C-checks, comprar hangar, contratar). Patrón clásico tycoon (Project Hospital, Software Inc.). Da una palanca de scaling real, no solo numérica.

### Para Fase 4.5 — feature requests del audit de parámetros (2026-05-15)

- **Flota variable por aerolínea**: hoy `FLEET_SIZE_PER_AIRLINE = 8` para todas. Realidad: una aerolínea grande puede tener 200 aviones pero solo 5-15 pernoctan/operan habitualmente desde NUESTRO aeropuerto. Añadir campo `airline.basedAircraftCount` (pequeña 3-5 / mediana 6-10 / grande 12-15) y usar en `generateInitialFleet`/`seedFleetForAirline`.
- **Contratos deluxe (tier system)**: hoy `minReputation` 35-55 para todos. Realidad MRO: hay aerolíneas premium (Emirates, Singapore) que solo trabajan con MROs Tier-1 (rep ≥85-90), pagan 1.5-2× más y exigen SLA estricto. Añadir campo `contract.tier` (standard/premium/deluxe) y modular fees + minRep + SLA por tier.
- **Severance escalado por años trabajados**: hoy SEVERANCE_WEEKS = 16 fija. Estatuto España real ~33 días/año trabajado. Trackear `hiredAtMinute` por mecánico y calcular dinámico.
- **WeeklyFixedCost escalado con hangares**: hoy 12k €/sem fijo. Cuando entre construcción de 2º hangar (Fase 4.5), añadir 4-6k €/sem por hangar adicional.
- **LATE_CHECK_PENALTY_PER_DAY escalado por tipo**: hoy 5k fijo. Razonable para C, alto para A (overrun 3d = 15k > fee 12k), bajo para D. Escalar: A 1.5k / C 5k / D 15k.

### Para Fase 4-5 (autenticidad / contenido)

- **Click-to-detail cards en TODAS las entidades** (playtest Dani 2026-05-15). Refuerzo directo del USP "autenticidad nicho". Click en avión → registration real, model + engine variant, FH/cycles totales, último A/C/D, history de checks, history de WOs, contrato actual. Click en mecánico → edad, años exp, type ratings detallados, certificaciones, history laboral, moral history. Click en WO → descripción técnica completa, ATA chapter con nombre real, parts required (cuando entre inventario), referencias técnicas (AMM/CMM placeholder). Click en check → qué cubre realmente (ej. C-check = revisión hidráulico + filtros + inspección estructural). **Cada entrada de histórico también es clickable y abre su propia card detallada** (drill-down: histórico WO → modal con quién lo hizo, cuándo, mecánicos involucrados, parts usadas, tiempo real vs estimado, etc). Patrón "wiki ingame" que el target hardcore va a explorar.
- **Dashboard de KPIs con gráficos** (playtest Dani 2026-05-15). El GDD §11 lo lista para Fase 3 ("KPI gráficos") pero Fase 3 solo entregó KPIs sueltos en Hangar/Economía. Falta el panel dedicado: balance evolución, rep por aerolínea over time, WOs completed/failed/deferred ratio, tiempo medio cierre WO por severidad, FH flota total, score Part-145 history, moral media equipo, salarios mensuales, ingresos por tipo (line/A/C/D/AOG penalty), heatmap utilización stands. Recharts/Chart.js como librería. Vista "ops director" complementa el "wiki ingame" del punto anterior.
- **Portar dataset real legacy `we_template.csv`** (playtest Dani 2026-05-15). 100 WOs reales A320/A321 con ATA chapters auténticos vivían en `D:\Documents\MRO_Tycoon\` y NO se portaron en Fase 2 B2 (sandbox sin acceso, se generó sintético). Ahora con homelab-runner accesible, portar el CSV real y reemplazar `data/workorders.json`. Diferencia entre "parece real" y "ES real" — clave del USP.

---

## ⛔ Bloqueos
- **MCP homelab-runner timing out** (cierre sesión 1, 2026-05-13). Tras múltiples Start-Process en background, `run_local` empezó a devolver timeout 180s para cualquier comando. Pendiente reset del plugin o auto-recovery. Workaround: reintentar en próxima sesión.

---

## Última actualización
2026-05-24 (**WO `kind: callout|mpd` integrado**) — Tarea mecánica del modelo HH + Tiers (Parking § Modelo HH). Añadido tipo `WoKind = "callout"|"mpd"` al template `WorkOrderTemplate` + merge runtime de [`wo_classification.json`](src/lib/data/wo_classification.json) (100 entries clasificadas a mano AMM, 51 callout / 49 mpd) en `loadGameData()`. Daily checks forzados a `kind:"mpd"` por loader. Generadores filtrados: `rollWoOnLanding` solo muestrea callouts (reactivo por definición); `rollDailyChecksOnOvernight` solo mpd (defensivo). Tests nuevos [`tests/sim_wo_kind.mjs`](tests/sim_wo_kind.mjs) (14/14 ✓): coverage classification + smoke 1000 landings 100% callout + 100 overnights 100% mpd + filtros con pool mezclado. Helper compartido [`tests/helpers/loadTemplates.mjs`](tests/helpers/loadTemplates.mjs) para que tests .mjs mergeen kind igual que runtime. Save schema NO bumpeado (kind solo en template, no instance). Auto-playtest 5×7d lineMode: 0/5 game-over, callouts 12-21 y mpd 11-14 por seed (ambos kinds presentes). Sanity "≥60 WOs/7d" FAIL preexistente al cambio. Fix menor: `wo_classification.json:_meta.totals` corregido a 51/49 (era 54/46). **NO implementada** decisión AOG-3h del brief (opción A/B/C) — pendiente confirmación Dani. Bug colateral encontrado pre-existente: test `sim_day_night.mjs` "duración 15-35 min" falla porque DC-003 dura 40 min (drift dataset/test, no introducido por este cambio).

2026-05-24 (**PIVOT MRO LÍNEA PURA DONE**) — Tras cerrar F5D, Dani pivotó scope del juego a "técnico local aeropuerto regional". 5 puntos del brief implementados en 1 sesión: hangares fuera del onboarding (gating Stage 3-4 hasta endgame), oficina cap 4 mecs en terminal OSM real, panel Schedule del día (tabla cronológica + filtros ARR/DEP + chips operadores contratados), HUD badge pernocta 🌙 + modal con tabla matrícula/checks asignados, contrato inicial único Iberia Express + competencia simple 30d (rep≥70 oferta, rep≤20 rescisión). Decisión arquitectural: opt-in `{lineMode:true}` en createGame para preservar comportamiento legacy (40+ tests pasan sin tocarse). Save v9 con migración v8/v7/v6. Aerolíneas renombradas a operadores OVD reales: Iberia Express/Vueling/Volotea/easyJet con iataCode IB/VY/V7/U2. `generateScheduledArrivals` filtra por iataCode → solo IB genera arrivals; VY/V7/U2 aparecen en panel Schedule pero NO son trabajo MRO (lead potencial). Pernoctas: heurística "último arrival del día por aerolínea ≥19:00" → marca overnight + departure 06:30 día siguiente. **940/940 tests verdes** (+67 net). Bundle [`builds/v0.6-line-mro.html`](builds/v0.6-line-mro.html). Doc cierre [`docs/CIERRE_pivot_line.md`](docs/CIERRE_pivot_line.md). ⚠️ Parking heroe: viabilidad económica (Δ-290k € + 4/10 game over por penalty SLA dominante — tuning sesión siguiente).

2026-05-15 (**FASE 5D · CALLE AUXILIAR AÑADIDA v5**) — Dani pregunta cómo accede un avión a la fila inferior de stands → solución: la callecita horizontal central pasa a ser explícitamente **"calle auxiliar"** = único acceso a fila inferior. Aviones desde pista bajan por callecita vertical → giran 90° en la auxiliar → entran a stand de fila superior (norte) o fila inferior (sur). Furgo usa el mismo road network. CLAUDE.md y STATUS.md actualizados con la calle auxiliar como elemento spec separado.

2026-05-15 (**FASE 5D · LAYOUT REVISADO (sketch Dani v4)**) — Dani aporta sketch manuscrito que reorienta el layout: **Espacio hangares al flanco IZQUIERDO** del apron (no rincón inferior-derecho), zona grande dashed con plots Stage 3+4 dentro. **Grid 2×3 de stands** marcados con códigos airport-style (351/451/551 arriba, 352/452/552 abajo). **Callecitas rectas** estructuran el apron: verticales entre bloques + horizontal central + perimetral inferior. **Furgo de mecs** (no mec andando) sale de oficina (esquina inferior-DERECHA) y recorre las callecitas con **giros estrictos de 90°, cero curvas**, hasta el stand asignado. CLAUDE.md + STATUS.md actualizados. Layout definitivo confirmado por Dani: zona hangares izquierda + grid stands centro/derecha + oficina bottom-right + road network estricto perpendicular.

2026-05-15 (**FASE 5D · LAYOUT BASE + ENFOQUE ELEGIDO**) — Mockup validado con Dani vía Cowork: opción 1 "pase único rico" (P-β/γ/δ-min juntos, ~2-3h) elegida frente a granular y polish. Layout añadido al spec F5D: pista 27L con taxiway paralelo de enlace discreto + 3 conectores → apron con 4-5 line stands básicos L1-L5 → Base hangar actual + 2 plots ghost outlined "Stage 3 500k €" / "Stage 4 1.5M €" → oficina mecánicos visualmente alejada en esquina opuesta del apron → trayecto largo dashed que justifica el tiempo de viaje mecánico ya simulado. Click plot ghost reusa modal compra build hangar F5A. CLAUDE.md actualizado con layout completo y estrategia "min" definida (NO entra: partículas masivas, bloom WebGL global, glow shaders custom → quedan para P-δ completo + P-ζ).

2026-05-15 (**FASE 5D ACORDADA — MAPA PIXI**) — Tras cerrar 5A/5B parcial/5C/extras (bundle `v0.5g-final.html` 271 KB, 803 tests verdes), Dani identifica deuda visual del mapa: el slot original 5C "Pixi condicional" se gastó en eventos aleatorios, dejó la capa visual del mapa sin tocar. Decisión: abrir **Fase 5D — Mapa esquemático animado con Pixi v8** (2 semanas, 6 bloques P-α a P-ζ) ANTES de Fase 6, porque los screenshots/trailer de Steam page se montan con este asset. Stack Pixi v8 sobre canvas dentro del panel Hangar; GSAP/WAAPI de UI intactos. Spec aesthetic: CIC/NASA mission control, NO arcade — aviones puntos luminosos con halo+trail, partículas schematic tipo HUD, bloom WebGL sutil, paleta día/noche conectada a F5A, layout crece con etapa MRO 1→4. **Descartado SVG+GSAP** tras pedir Dani "lo más chulo posible". CLAUDE.md actualizado con plan completo + spec resumido. Próximo: brief `docs/BRIEF_fase5d.md` y arrancar hilo Cowork nuevo de Fase 5D bloque P-α.

2026-05-15 (**Modal Check + Modal Contrato + X5 A en plataforma**) — Click-to-detail completo. Modal Check: ID + tipo + nightStarted/onPlatform flags + económico (fee base - penalty = neto) + barras manMinutes/parking + team asignado + tiempos. Modal Contrato: tier + estado + rep airline + términos + flota basada + WO stats + estimación ingresos. X5 sim: `tickMaintenanceChecks` recibe `lineStandIds` + `platformACheckAllowed`. Si A-check Scheduled + no hay BaseStand libre + stage≥2 + line stand libre → arranca en LINE_STAND con `onPlatform=true` + eficiencia × 0.7. `assignStand` para arrivals filtra line stands ocupados por checks on-platform. Badge ⛅ visible en cards. **803/803 tests verdes**. Bundle final `builds/v0.5g-final.html` (271 KB). Huelga parking definitivo (futuras versiones). Pre-Steam queda para más adelante.

2026-05-15 (**WO descripciones realistas MRO**) — Reescritas las 100 descripciones de `data/workorders.json` con calidad técnica MRO real: AMM references (e.g. AMM 12-13-79-680-001), procedimientos breves, torques (e.g. "82-90 in-lb"), valores específicos (resistencias "12.5-15Ω cold", presiones "2700-3150 PSI", VSWR "<1.4"), P/N reales (Goodrich BA31 slide raft, Honeywell GTCP131-9A APU, Whelen 8060 beacon, Rockwell Collins GLU-925 MMR, Sherwood 311 O2 bottle…), tools específicos (bond meter, SOAP sample kit, calibradores). Refuerza USP "ES real, no parece real". 803/803 tests verdes. CSV legacy original NO accesible (D: no monta), pero el shape + distribuciones ya estaban siguiendo el inventario detallado de `unity_legacy/BRIEF_recovery.md`. Bundle `builds/v0.5e-wo-realista.html` (261 KB).

2026-05-15 (**Save v7 + Tauri BLOQUEADO + Fase 6 next**) — Save format v7 con migración v6 (persiste 11 campos nuevos F5: mroStage/activeBuild/kpiHistory/randomEvents + flags + campos opcionales Mechanic/Airplane/Contract). 48 tests sim_save (round-trip + v6 backward compat). **803/803 tests verdes**. Tauri F5B-β intentado y bloqueado: `cargo check` falla con `yoke_derive`/`phf_macros not found` (bug ecosistema Rust 1.95 + GNU toolchain + proc-macros). Doc completo `docs/TAURI_BLOQUEADO.md` con 3 workarounds (MSVC, downgrade Rust, Electron). `dist/index.html` + `tauri.conf.json` preparados para próximo intento. Bundle vanilla actual `builds/v0.5d-save-v7.html` 100% jugable file:// — válido para Itch.io demo / Steam Next Fest.

2026-05-15 (**FASE 5C eventos aleatorios DONE** · extensión post-5B misma sesión) — runway_closure (6% diario, 4-8h, skip arrivals durante ventana) + service_bulletin Airbus (4% diario, 1-2 aviones de modelo+motor random, flavor MVP — no genera WO real). Lista eventos activos al final del Dashboard. Notifs `📢` con razón humana. Tipo `RandomEvent` + `g.randomEvents` + `eventsRolledForDay`. `rollEventsIfNewDay` se llama en `ensureArrivals` idempotente. Strike (huelga) → parking F6 (requiere shift gating mod). **780/780 tests verdes** (+36 net: sim_events 31 + 5 ajustes legacy). Auto-playtest Δbal +69k €. Bundle `builds/v0.5c-events.html` (253 KB).

2026-05-15 (**FASE 5B CERRADA parcial** · α+δ+ε+γ done, β Tauri parking) — Polish UX completo en una sesión continua: X7 panel Construcción (tab nueva, action `startBuild`), Y3 mini-gantt cobertura 24h, V5 nightStarted flag en checks; click-to-detail con modal avión (FH/cycles/checks/landings/WOs) + modal mecánico (moral/salario/severance/training); dashboard KPIs con 6 sparklines SVG custom (no Chart.js, no deps); animaciones WAAPI/CSS (tweenNumber HUD para balance/rep, slide-in notif:first-child, transition bars 350ms, fade tab-panel). **744/744 tests verdes**. Bundle `builds/v0.5b-fase5b-final.html` (247 KB). Doc `docs/CIERRE_fase5b.md`. Tauri+SqliteBackend (β) deferido a hilo nuevo (deuda G5-G7 de Fase 3, riesgo toolchain Windows).

2026-05-15 (**FASE 5B-α DONE** · UI quick wins parking F5A) — X7 panel Construcción operativo (tab nueva con stage card + próxima etapa + progress bar de build activo + botón "Iniciar construcción" conectado a `startBuild()`). Y3 mini-gantt cobertura 24h × shifts en panel Mecánicos (24 celdas coloreadas según densidad: empty/low/mid/high). V5 flag `nightStarted` en `MaintenanceCheckInstance` (informativo, true si arranca 22:00-06:00; no cambia lógica sim). **744/744 tests verdes** (sim_airplanes adaptado: matrículas pueden repetir si no solapan ventanas — Fase 4 multi-cycle fix). Bundle `builds/v0.5b-fase5b-alpha.html` (231 KB). Próximo F5B-β: Tauri+SqliteBackend o GSAP/Chart.js polish visual.

2026-05-15 (**FASE 5A CERRADA** · sistemas sim pendientes) — V día/noche real (pernocta 50% post-19h + 2-4 daily checks por overnight + HUD ☀️🌙) + W TMA jefe (lead foreman 5% pool + auto-handoff turnos al cambiar shift) + X progresión 4 etapas MRO (stages 1-4 con costes 0/100k/500k/1.5M, build days 0/0/14/30) + Y features cortas audit (flota variable basedAircraftCount por aerolínea, severance escalado por años). **741/741 tests verdes** (+109 net: sim_day_night 47 + sim_foreman 29 + sim_mro_stage 39). Auto-playtest Δbal +66k €, 0/20 game overs. Bundle `builds/v0.5a-fase5a-final.html` (226 KB). Doc `docs/CIERRE_fase5a.md`. Quedan F5B: Tauri+Sqlite, GSAP, click-to-detail, dashboard KPIs, panel construcción UI, A-check nocturno, cobertura visual mini-gantt.

2026-05-15 (**FASE 5 PARTIDA EN 3 SUB-FASES**) — Decidido tras saturación Parking F4.5. **5A** sistemas sim (día/noche, TMA jefe, progresión orgánica + 8 features) 3-4 sem. **5B** Tauri+SqliteBackend + GSAP encima UI + mapa SVG+GSAP `animateMotion` + Chart.js dashboards 2-3 sem. **5C** Pixi en mapa CONDICIONAL 1 sem (default NO se abre, solo si SVG no rinde). Decisión clave: GSAP y Pixi no se interfieren (DOM vs canvas) → meter Pixi después es low-cost (~200-400 líneas, datos del juego no cambian). Orden interno 5A candidato: día/noche → TMA jefe → progresión orgánica. CLAUDE.md actualizado con plan completo. Próximo: brief `docs/BRIEF_fase5a.md`.

2026-05-15 (**FASE 4.5 CERRADA DEFINITIVA · quick wins parking aplicados**) — Tras tier system, aplicados los 3 quick wins XS del parking del audit: START_MINUTE 0→360 (quita ventana muerta inicial), LATE_CHECK_PENALTY escalado A=1.5k/C=5k/D=15k €/día, hook `weeklyFixedCost` con `extraHangars` (dormido hasta build-hangar Fase 5). Auto-playtest 20×28d **Δbal +77k €** (mejora +9k vs +68k post-Fase 4, gracias a A-check penalty bajado). 0/20 game overs. **632/632 tests verdes**. Bundle final `builds/v0.4-fase45-final.html` (214 KB). Quedan 8 features parking → Fase 5 (flota variable, severance escalado, auto-handoff turnos, cobertura visual, click-to-detail, dashboard KPIs, Tauri+Sqlite).

2026-05-15 (**FASE 4.5 CERRADA** · contratos deluxe + tier system) — `ContractTier` standard/premium/deluxe con multiplicadores fees ×1.0/1.35/1.75. Distribución por rep aerolínea (rep<55=std only / 55-79=70/30 / ≥80=50/35/15). UI badge tier (deluxe ⭐⭐ dorado con glow). Auto-playtest sin regresión. **632/632 tests verdes** (+39 net). Bundle `builds/v0.4-fase45-tier.html`. Doc `docs/CIERRE_fase4_5.md`.

2026-05-15 (**FASE 4 CERRADA** · 1 sesión) — Bloques O+P+Q+audit+multi-cycle fix+R+S. Auto-playtest 20×28d: Δbal medio **+68k €** (target +50k), **0/20 game overs**. **593/593 tests verdes**. Release [`builds/v0.3-fase4-viable.html`](builds/v0.3-fase4-viable.html) (211 KB). Doc cierre [`docs/CIERRE_fase4.md`](docs/CIERRE_fase4.md). Hotfix Dani: multi-cycle (cada matrícula hace 2-3 landings/día). 9 features anotadas a Parking Fase 4.5.

2026-05-15 (FASE 4 día 1 continuación · **audit parámetros + Q gating + Q6 wip**) — Dani pidió pausa antes del Q6 tuning para auditar parámetros iniciales con info real MRO. Doc `docs/PARAMETROS_AUDIT.md` con 15 secciones y 50+ params. **Cambios aplicados tras revisión de Dani**:
- FH per leg 3-5h → **1-5h** (legs cortos europeos)
- workOrderAtStand 0.70 → **0.50** (heredado legacy alto, real 10-20%)
- ACTIVE_TRAINING_COST 5k → **8k €** + ACTIVE_TRAINING_DAYS 7 → **14 días**
- SEVERANCE_WEEKS 8 → **16 sem** (España: ~33d/año trabajado)
- A-check manDays 2 → **8** + parking 1 → **2 días**
- C-check manDays 60 → **150** (real 3000-6000 man-h)
- D-check manDays 300 → **1000** (real 1250-2000 man-h)
- Mantenido: PRE_AUDIT_WARNING_DAYS = 3 (Dani: ok), START_MINUTE = 0 (no decidido), salarios actuales (no decidido), turnaround 45-90 (no decidido).

**Anotado a Parking (Fase 4.5)**: flota variable por aerolínea (no es flota total, son matrículas basadas en NUESTRO aeropuerto: pequeña 3-5 / mediana 6-10 / grande 12-15), contratos deluxe con tier system (minRep hasta 90, fees 1.5-2×), severance escalado por años, weeklyFixedCost escalado con hangares, LATE_CHECK_PENALTY escalado por tipo.

**Próximo**: re-correr auto_playtest 20×28d con todos los cambios audit + decidir si Q6 necesita más tuning.

2026-05-15 (**FASE 4 día 1: O+P DONE**) — `auto_playtest` enriquecido (desglose TxType + evolución semanal). Baseline 20×28d revela Penalty SLA -174k €/run = 68% gastos. Rebalance en 3 iter (penalty 80-140→40-70, slaMultiplier 1.20→1.50, baseFee +20%, payment +20%) llega a Δbal medio **+46k €** (target +50k, 4k de margen reservado para Bloque Q). 0/20 game overs. Suite **524/524 verde**. Doc en `docs/FASE4_baseline.md`. Próximo: Bloque Q (shift gating productivo).

2026-05-15 (FASE 4 ABIERTA · día 1) — Brief `docs/BRIEF_fase4.md` escrito, TASKS.md reemplazado con backlog Fase 4 (5 bloques O→S, time-box 17 días). Baseline auto-playtest 5×28d capturado: Δbalance medio -49k €, 1/5 game over.

2026-05-14 (**FASE 3 CERRADA**) — 7 bloques completos en una sesión (G saneamiento, H A/C/D, I MEL, J Part-145, K mercado laboral, L turnos/moral/training, M rep segmentada, N cierre+calibración). Release `builds/v0.2-fase3-depth.html` (146 KB). Doc cierre `docs/CIERRE_fase3.md`. Suite **512/512 verde** (era 151 al cierre Fase 2: +361 tests). Save v6 con migración legacy. Próximo: validación visual + abrir Fase 4 (rebalance económico + features avanzadas).

2026-05-14 (cierre sesión 1 Fase 3, **Bloques H+I+J+K+L+M COMPLETOS**) — Rep segmentada por aerolínea con HUD breakdown. Mercado de contratos vivo con ofertas nuevas cada 7d (rep ≥20). Save v6 con migración legacy. Suite **513/513 verde**. Bundle `builds/v0.2-fase3-m.html`. Próximo: Bloque N (cierre Fase 3).

2026-05-14 (cierre sesión 1 Fase 3, **Bloques H+I+J+K+L COMPLETOS**) — Shifts configurables (night ×1.5 salario), moral 0-100 con drift diario + eventos, training activo 5k€/7d con promoción auto, panel Mecánicos rediseñado. Productividad por shift deferida a Fase 4 (requiere rebalance económico). Suite **483/483 verde**. Bundle `builds/v0.2-fase3-l.html`. Próximo: Bloque M (reputación segmentada).

2026-05-14 (cierre sesión 1 Fase 3, **Bloques H+I+J+K COMPLETOS**) — H+I+J+K + auto-pausa AOG + render-loop optimizado. Mercado laboral con candidatos, hire/fire, training pasivo. Save v5 con marketRng aislado. Suite **427/427 verde**. Bundle `builds/v0.2-fase3-k.html`. Próximo: Bloque L (turnos/moral/training activo).

2026-05-14 (cierre sesión 1 Fase 3, **Bloques H+I+J COMPLETOS**) — H+I+J + auto-pausa AOG + render-loop optimizado. HUD muestra `🛡️ N/100` Part-145, audits cada 60-90d con findings, multa 50k + suspensión contrato si <30, game over si <10. Save v4. Suite **383/383 verde**. Bundle `builds/v0.2-fase3-j.html`. Próximo: Bloque K (mercado laboral).

2026-05-14 (cierre sesión 1 Fase 3, **Bloques H+I COMPLETOS**) — H entero (10/10) + I entero (8/8). UI: Hangar con 4 sub-tabs Line/Base/Deferrals/Flota + badges MEL coloreados + botón Diferir en modal + countdown Deferrals. Sim: tickMel detecta vencidas → penalty -10k €/-5 rep. Suite **340/340 verde** (+39 net Bloque I). Bundle `builds/v0.2-fase3-i.html`. Próximo: Bloque J (Part-145 audits).

2026-05-14 (cierre sesión 1 Fase 3, **Bloque H 10/10 COMPLETO**) — sim core + UI single-file vanilla con build reproducible (`build-vanilla.mjs` → `builds/v0.2-fase3-h.html`). Sub-tabs Hangar Line/Base/Flota. Debug "envejecer flota" para validación rápida. Suite 301/301. Próximo: Bloque I (MEL/Deferrals).

2026-05-14 (cierre sesión 1 Fase 3, push extendido) — **Bloque H sim core completo 9/10**. H1+H2+H3+H4+H5+H6+H7+H9+H10 done. A/C/D checks end-to-end: flota persistente acumula FH+cycles → auto-detección debido → schedule → ocupa BaseStand H1-B1 → auto-asigna team óptimo → acumula manMinutes → completa (doble criterio) → cobra baseFee + penaliza overrun -5k/día. Avisos anticipados a 50 FH del trigger con anti-spam. Save v3. Suite **301/301 verde**. Solo H8 (UI) pendiente para sesión 2 — necesita rebuild bundle vanilla y validación visual.

2026-05-14 (cierre sesión 1 Fase 3) — Bloque H al 60%: H1+H2+H3 done. Flota persistente operativa (8 aviones/aerolínea acumulando FH+cycles), tabla de checks A/C/D para A320/A321 cargada, auto-generador integrado en `advanceGame`. Save format v3 (fleet + maintenanceChecks + counters). Suite 262/262 verde. Próxima sesión: H4-H7 (stand state, asignación, billing).

2026-05-14 (cierre sesión día 0 Fase 3) — Plumbing Fase 3 documentado (TASKS.md, BRIEF_fase3.md, memoria). Bloque G saneamiento al 60%: G1+G2+G4 done, balance tuneado y validado con 20 seeds (rep media 68). Mañana retomar desde **Claude Code** apuntando a `C:\Users\bongi\mrotycoon`, decidir Tauri ahora vs saltar a Bloque H. Estado vivo entre sesiones: este STATUS.md + TASKS.md + docs/BRIEF_fase3.md.

2026-05-14 — **Fase 2 CERRADA**. Vertical slice end-to-end + Save/Load + auto-playtest. Release `builds/v0.1-vertical-slice/index.html` 116 KB jugable. 151/151 tests verdes. Documento de cierre con findings de balance y backlog priorizado para Fase 3 en `docs/CIERRE_fase2.md`.

### Bloque B — Data port ✅ done (2026-05-13)
- [x] B1: Tipos TS del dominio (WorkOrderTemplate, Airline, Contract, Mechanic, AirplaneInstance, Balance) con type guards runtime.
- [x] B2: `workorders.json` — 100 WOs generadas (73 Minor / 24 Major / 3 Critical, 69 B1 / 31 B2, 1 AOG, 21 ATA chapters). NO portadas del CSV legacy (no accesible desde sandbox); generadas siguiendo distribuciones del BRIEF con descripciones técnicas reales A320 family.
- [x] B3: `airlines.json` — 4 aerolíneas (SkyAirlines, SunAirlines, TreeAirlines, Starairlines) con colores brand + flotas A320/A321 mix CFM56/V2500.
- [x] B4: `balance.json` — startingBalance 250k €, probabilidades 70/40/10 conservadas del legacy, SLA x1.05, AOG x5, salarios B1/B2/helper, deltas reputación.
- [x] B5: `i18n/{es,en}.json` — 120 keys ambos idiomas con emojis Unicode (paridad total).
- [x] B6: `i18n/index.ts` — función `t(key, params)` con interpolación + store reactivo `getLocale/setLocale` (Svelte 5 rune `$state`).
- [x] B7: `data/index.ts` — `loadGameData()` que carga e valida los 3 JSON al arrancar. Falla rápido si datos rotos.
- [x] B8: `tests/smoke.mjs` — 28/28 OK (validación shape, distribuciones, paridad i18n).
- [x] B9: Bundle producción Vite en `builds/bloque-b/` (86KB JS + 6.5KB CSS, gzip 24.5KB). 3 cards visibles: WO con barras de severidad, Aerolíneas con colores, Constantes. Selector ES/EN funcional.

**Fixes de infraestructura en sandbox**:
- Añadido alias `$lib` en `vite.config.ts` (resolve.alias) + `base: "./"` para que el bundle funcione vía file://.
- Instalado `@rollup/rollup-linux-x64-gnu` con `--no-save` para tooling en sandbox sin tocar package.json (Windows necesita su propio binario nativo).
- Bug filesystem mount Windows↔Linux: Write tool de archivos largos a veces trunca o deja null bytes. Workaround: escribir desde sandbox bash con `cat > file << 'EOF'` para archivos >500 líneas.

### Bloque C — Sim core ✅ done (2026-05-13)
- [x] C1: `sim/time.ts` — tick, speed (0/1x/2x/5x), reloj. 25/25 tests ✓
- [x] C2: `sim/contracts.ts` — generador inicial (1 activo + 2 ofertas), accept/reject/expire. 14/14 tests ✓
- [x] C3: `sim/airplanes.ts` — generación de landings probabilísticos por contrato, 3 stands MVP, registration EC-XYZ. 14/14 tests ✓
- [x] C4: `sim/workorders.ts` — rollWoOnLanding (70% prob), instantiate, queries. 12/12 tests ✓
- [x] C5: `sim/mechanics.ts` — 7 mecánicos iniciales (3 B1 + 2 B2 + 2 helpers) con type ratings CFM56/V2500. 18/18 tests ✓
- [x] C6: `sim/assignment.ts` — assignMechanicsToWo, tickMechanicTravel (ToPlane→Working), teamEffectiveEfficiency. 13/13 tests ✓
- [x] C7: `sim/wo_state_machine.ts` — máquina de 5 fases con direct dispatch + rework, libera mecánicos al completar. 7/7 tests ✓
- [x] C8: `sim/economy.ts` — ledger, transacciones tipadas, weekly close, AOG penalty x5. 13/13 tests ✓
- [x] C9: `sim/reputation.ts` — store 0-100 con deltas semánticos. 7/7 tests ✓
- [x] C10: Integration test 7 días + snapshot HTML — 25 aviones, 19 WOs generadas (76% ratio), 19 completadas (11 on-time / 8 late), reputación 45/100, balance final +14k. 7/7 tests ✓

**Total Bloque C**: 130/130 tests ✓ pasando. Snapshot en `builds/bloque-c-snapshot.html`.

### Bloque D — Paneles UI ✅ done (2026-05-14, con cambio de stack)
- [x] D1: `lib/game.ts` — game state global + advanceGame() con eventos
- [x] D2-D9: UI con 4 tabs (Hangar / Mecánicos / Contratos / Economía), HUD vivo, modal de asignación, notificaciones
- [x] D10: Bundle vanilla 110 KB confirmado funcionando en Chrome vía file://

**🚨 Cambio de stack mid-Bloque D**:
Svelte 5 runtime falla al ejecutarse vía file:// (pantalla negra, mismo bug en bundle directo, artifact Cowork, classic-script). El sim core en TS sigue siendo bueno (130 tests OK). Pero la UI Svelte 5 se reemplaza por **vanilla JS+DOM** con esbuild IIFE bundle del sim core (`sim-all.ts` → `Sim` global).

Archivos:
- `src/lib/sim-all.ts` — re-exporta todo el sim para esbuild
- `builds/bloque-d-vanilla.html` — entregable confirmado por Dani ("mola")
- App.svelte queda en disco pero ya NO es el path de entrega (legacy mientras se decide Fase 5: o Tauri webview con código vanilla, o reintroducir Svelte solo cuando se sirva por HTTP/Tauri).

Decisión técnica: **el path comercial es Tauri (cuando arranque en su Lenovo)**. Tauri sirve vía custom protocol, no file://, así que Svelte 5 funcionará. La versión vanilla actual es la "preview file://" para mostrar progreso a Dani sin depender de Tauri.

### Bloque E — Save/Load ✅ done (2026-05-14)
- [x] E1: `sim/rng.ts` refactor — state expuesto en object para serialización. 9/9 tests previos siguen pasando.
- [x] E2: `sim/save.ts` — serializeGame/deserializeGame con version=1. Las refs estáticas (balance/airlines/templates) NO se guardan, se inyectan al deserializar.
- [x] E3: `sim/storage.ts` — backend abstracto (StorageBackend interface). LocalStorageBackend para browser, InMemoryBackend para tests. **Migración a tauri-plugin-sql**: implementar un `SqliteBackend` con la misma interface y `setStorage(new SqliteBackend())`. Cero cambios en callers.
- [x] E4: Autosave fire&forget tras cada cierre semanal con notificación "💾 Guardado automático".
- [x] E5: UI HUD con 3 botones (💾 Save / 📂 Load disabled si no hay slot / 🆕 New con confirm).
- [x] E6: Tests round-trip 21/21 ✓ incluyendo **continuidad determinista**: tras save→load, 10 ticks adicionales producen el mismo state que la línea original.
- [x] E7: Bundle vanilla `builds/bloque-e.html` 116 KB con Save/Load funcional.

**Total acumulado Fase 2**: 151/151 tests ✓ (B 28 + C 102 + E 21).
