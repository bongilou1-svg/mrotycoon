# CIERRE — Pivot MRO línea pura (2026-05-24)

Pivot acordado con Dani el 2026-05-24 tras cerrar F5D: el juego arranca como un MRO de
línea pura en OVD que acaba de firmar el contrato de UNA aerolínea pequeña. Sin hangares
interiores ni cap mecánicos completo — eso se desbloquea en endgame. La fantasía inicial
es "técnico local del aeropuerto regional", no "complejo MRO genérico".

## Entregable

- Bundle: [`builds/v0.6-line-mro.html`](../builds/v0.6-line-mro.html) (~1.4 MB, esbuild
  vanilla, mismo flow que `v0.5g-final.html` y `v0.5d-pixi-map.html`).
- Save format: **v9** (añade `lineCompetitionLastTickMinute` + `lineModeEnabled`).
  Backward compat con v8/v7/v6.
- Suite tests: **940 verdes / 0 rojos** (era 873 al cierre F5D → +67 net).

## Decisión arquitectural — `lineMode` opt-in

El pivot introduce comportamiento divergente (contratos iniciales 1+0, mecs 4, schedule OVD,
rep Iberia=60, cap oficina, hangares gated). En vez de imponerlo en todas las partidas y
romper docenas de tests legacy, se añade un opt:

```ts
createGame(balance, airlines, templates, seed, defs, dailyChecks, { lineMode: true })
```

- **UI de juego** (`build-vanilla.mjs`) pasa `{ lineMode: true }` por default.
- **Tests legacy** llaman sin opts → comportamiento Fase 4-5 preservado (7 mecs, 1+2
  contratos, arrivals stocásticos, sin cap, sin gate hangares).
- **Tests nuevos del pivot** pasan `{ lineMode: true }` explícito.

El flag `g.lineModeEnabled` viaja en el save (v9) para que partidas pivot se restauren
correctamente.

## Los 5 puntos del pivot (estado real)

### P1 ✅ Hangares fuera del onboarding
- `canUnlockHangars(g): boolean` evalúa rep avg ≥80 + balance ≥1M + ≥3 contratos activos.
- `startBuild` rechaza `targetStage > 2` con `Hangares bloqueados hasta endgame (...)`.
- `renderF5DScaffold` oculta plots ghost Stage 3/4 vía `state.hangarBuildUnlocked`.
- `RenderState.hangarBuildUnlocked` derivado: `lineMode ? canUnlockHangars(g) : true`.
- Stages 3-4 NO borrados (vive el código F5A); solo gating. Cuando se cumpla la condición,
  los plots reaparecen y `startBuild` los acepta sin cambios adicionales.

### P2 ✅ Oficina mecánicos en terminal + cap 4
- `generateLinePoolMechanics`: 4 técnicos (2 morning B1+B2 senior CFM56+V2500, 1 afternoon
  B1 junior CFM56, 1 helper afternoon). Sin night.
- `MECHANIC_CAP_INITIAL = 4` exportado de `sim/mechanics.ts`.
- `hireCandidate` bloquea con `Oficina llena (4/4) — amplía en endgame` cuando lineMode +
  `g.mechanics.length >= cap` + `!canUnlockHangars`.
- **Oficina visual ya estaba en el terminal**: `renderF5DScaffold` (línea 2737) calcula
  el origen de la furgo desde el centroide del polígono `P.terminal[0]` del OSM real LEAS.
  No requirió cambios de render.
- Furgo recorre road network OSM sin cambios (solo cambia el origen, ya implementado).

### P3 ✅ Panel Schedule del día (NUEVO)
- Tab `📅 Schedule` en sidebar con badge "movimientos restantes hoy".
- `renderSchedule()` muestra tabla cronológica del día actual (`getFlightsForGameDay(g.day)`)
  con columnas: Hora | Callsign | ARR/DEP | Ruta | Modelo | Operador | Estado.
- Highlight de próximos 3 movimientos en la siguiente hora.
- Filtros `Todos`/`ARR`/`DEP` (state `scheduleFilter`).
- Chips de aerolíneas contratadas (verde) — clarifica qué vuelos generan trabajo MRO.
- Estado derivado en runtime: cruce schedule × `g.airplanes` × `g.contracts`.

### P4 ✅ Vista Pernocta nocturna (NUEVO)
- HUD badge `🌙 Pernocta: N` visible solo de 20:00 a 06:00 ingame.
- Click → modal con tabla matrícula | modelo | llegada | salida prevista | daily checks
  asignados (chips con phase ✓/✗/…).
- Heurística overnight en `generateScheduledArrivals`: por aerolínea, el último arrival
  del día (max `scheduledMinute`) pernocta si llega a partir de las 19:00. Realidad AENA:
  callsigns IB3217 (arrival) y IB3216 (departure) son el mismo avión físico con números
  distintos, así que no se pueden emparejar por callsign. La heurística captura "no hay
  rotación posterior, el avión se queda".
- Las pernoctas disparan `rollDailyChecksOnOvernight` ya existente → 2-4 daily checks
  programados, completados por el equipo de mañana.

### P5 ✅ Contrato inicial único + competencia simple
- `generateInitialContractsLine(rng, airlines)`: 1 activo (Iberia Express) + 0 ofertados.
- Aerolíneas renombradas con `iataCode`: AL-001 Iberia Express (IB), AL-002 Vueling (VY),
  AL-003 Volotea (V7), AL-004 easyJet (U2). Colores brand reales.
- `generateScheduledArrivals` mapea por `iataCode` → contrato activo. Vuelos IB → Iberia.
  Vuelos VY/V7/U2 visibles en panel Schedule pero NO generan landings (otro MRO se los
  lleva). Cuando firmas con esa aerolínea, sus vuelos empiezan a generar trabajo.
- `tickLineCompetition` cada 30d:
  - Aerolíneas sin contrato activo/offered + rep ≥70 → oferta automática con prob
    `(rep-70)/30 × 0.6` (máx 60% por aerolínea por tick).
  - Aerolíneas con contrato activo + rep ≤20 → rescisión, status=cancelled, notif
    "❌ {Vueling} rescinde — contrato adjudicado a competidor".
- Rep inicial: aerolínea contratada (Iberia) = 60, resto = `balance.startingReputation`
  (50). Margen para subir/bajar.
- El sistema legacy `tickContractMarket` sigue activo SOLO si ninguna aerolínea tiene
  iataCode (compat tests pre-pivot).

## Findings auto-playtest 10×28d lineMode

```
Δbalance medio: -290.328 €
Rep media μ: 51.8 (rango 48-64)
WOs/28d: 69.0 (compl 45.1, late 24.6, failed 0, def 0)
A/C/D checks completados: 2.6
Game over runs: 4/10 (todos bankruptcy)

Desglose:
  contractBaseFee      : +59.891 €
  workOrderPayment     : +99.859 €
  salary               : -18.180 €
  weeklyFixedCost      : -43.200 €
  maintenanceCheckFee  : +31.200 €
  maintenanceCheckPenalty: -11.400 €
  penalty (SLA)        : -408.498 €   ← fuga económica dominante
```

**Diagnóstico**: con 4 mecánicos sin night y 1 aerolínea (Iberia ~12 vuelos/día), el 54%
de las WOs salen tarde. El penalty SLA acumulado supera por sí solo el ingreso bruto.
Coherente con el reto de "MRO regional pequeño": difícil sobrevivir sin contratar al
máximo + ganar rep para diversificar.

## ⚠️ Parking — balancing económico línea pura

**ESTE ES EL HEROE BUG A PINCHAR EN LA PRÓXIMA SESIÓN**. No se auto-tuneó porque el
brief lo prohíbe; queda anotado:

1. **Subir contract baseFee Iberia inicial**: actualmente 12-22k €/sem en `rollContractTerms`.
   Línea pura debería arrancar en 20-30k €/sem (compensar capacidad limitada).
2. **Subir paymentPerWOMinute Iberia inicial**: 50-72 €/min actual. Línea pura: 65-90.
3. **Bajar penaltyPerLateMinute Iberia inicial**: 3-8 €/min actual. Línea pura: 2-4.
4. **Considerar cap mecánicos 5 + 1 night** (en vez de 4 sin night). El 50% game over
   se reduciría drásticamente con cobertura nocturna mínima.
5. **Tutorial / hint UI**: cuando rep Iberia ≥70 y aún sin segundo contrato → notif
   "💡 Tu reputación es alta — espera ofertas o contrata segundo mecánico para crecer".

Cualquiera de los puntos 1-3 (o combinación) debería bajar game over a ≤2/10. Tunear con
una pasada similar a Fase 4 Q6 (iterativo, 20 seeds × 28d).

## Lo que NO se tocó (preservado)

- Pipeline OSM (`ovd.paths.json`, projection, render F5D) intacta.
- Sim core A/C/D checks, MEL, Part-145, mercado laboral, eventos.
- Save format anterior (v8/v7/v6 leídos sin error con migración).
- Pernoctas + daily checks ya implementados en F5A → solo se les añadió vista P4.
- `generateInitialContracts` (legacy 1+2) preservado para tests.
- Las 4 aerolíneas con `iataCode` son aditivas — el campo es opcional, tests sin iataCode
  caen al mapeo opaco fallback.

## Disciplina del pivot

- Castellano coloquial respetado.
- `lineMode` opt-in resuelve el conflicto compatibilidad/pivot sin condicional spaghetti.
- 3 sesiones de tests nuevos (`sim_schedule_panel`, `sim_overnight_view`,
  `sim_contract_competition`) — 61 asserts nuevos, todos verdes.
- Time-box ~4-6h respetado (1 sesión, sin recortar puntos 4-5).

## Próximo paso

Sesión de balancing económico línea pura (parking arriba) → bajar game over rate. Luego
F6 Pre-Steam page + demo + GDD comercial. Bundle `v0.6-line-mro.html` sirve para Steam
Next Fest sin tocar nada más.
