# Fase 4 — Viabilidad económica + operación 24/7 · CIERRE

**Cerrada**: 2026-05-15 (1 sesión intensa, 5 bloques + auditoría)
**Tests**: 593 / 593 ✅ (era 524 al cierre Q5, +69 net en R y refactors)
**Release**: [`builds/v0.3-fase4-viable.html`](../builds/v0.3-fase4-viable.html) (211 KB, single-file vanilla)

---

## Qué entró

### Bloque O — Diagnóstico baseline
Enriquecido `tests/auto_playtest.mjs` con desglose por `TransactionType`, evolución semanal, check de coherencia ledger.

**Baseline 5 seeds × 28d** (pre-rebalance, sin shift gating):
- Δbal medio **−49k €**, 1/5 game overs.
- Fuga estructural: **penalty SLA −174k €** (68% de gastos).
- Causa: ratio penalty/payment 3:1 + late rate 21% combinaba en death-spiral.

Doc en [`docs/FASE4_baseline.md`](FASE4_baseline.md).

### Bloque P — Rebalance económico (3 iteraciones)

**P iter 1**: bajado `penaltyPerLateMinute` 80-140 → 40-70. 5 seeds dio +38k (suerte), 20 seeds reveló −13k.

**P iter 2**: subido `slaMultiplier` 1.20 → 1.50. WOs late ↓75% pero penalty solo ↓11% — **patología FIFO descubierta**: las pocas WOs late lo están MUCHO más (227 min vs 67). Δbal +4k.

**P iter 3**: subido `baseFeePerWeek` 10-18k → 12-22k y `paymentPerWOMinute` 28-42 → 34-50. Δbal medio **+46k €** en 20×28d, 0/20 game overs.

### Bloque Q — Shift gating productivo

**Q1**: `teamEffectiveEfficiency` filtra por shift cuando `nowMinute` se pasa. Certifier off-shift → eff = 0 (WO no progresa).

**Q2/Q3**: `tickShiftTransitions` en `sim/shifts.ts`:
- Idle ↔ OffShift automático según ventana de turno.
- Working/ToPlane fuera de turno → libera mecánico y la WO vuelve a `ToPlane` pending re-asignación.
- Mecánicos en check (`assignedCheckInstanceId`) NO se ven afectados (checks son trabajo multi-día agregado).
- Returning y Training tampoco se ven afectados.

**Q4**: distribución inicial mixta **3 morning / 2 afternoon / 2 night** (era 7 morning). Cobertura 24/7 desde el primer día.

**Q5**: 43 tests en `sim_shift_gating.mjs` (target 20+). Suite legacy actualizada con `g.shiftGatingEnabled = false` donde necesario (sim_maintenance_h4h7, sim_labor_market, sim_part145), y assertions de mecánicos arrancando "todos morning" actualizadas a "3/2/2".

Flag `g.shiftGatingEnabled` (default `true`, no se persiste — runtime toggle) permite tests legacy mantener comportamiento previo.

### Auditoría de parámetros + Bloque Q6 final

**Pausa solicitada por Dani** para revisar TODOS los parámetros iniciales antes de seguir tuneando ciegamente. Doc [`docs/PARAMETROS_AUDIT.md`](PARAMETROS_AUDIT.md) con 15 secciones, 50+ params, comparación con realidad MRO.

**Cambios aplicados tras revisión**:

| Param | Antes | Después | Razón |
|---|---|---|---|
| `FH_PER_LEG_MIN` | 3.0h | **1.0h** | Cubrir legs europeos cortos (Madrid-Barcelona ~1h) |
| `workOrderAtStand` | 0.70 | **0.50** | Heredado legacy alto, real 10-20% line check |
| `ACTIVE_TRAINING_COST_EUR` | 5.000 € | **8.000 €** | Type rating EASA real 8-25k € |
| `ACTIVE_TRAINING_DAYS` | 7 | **14 días** | Type rating real 1-3 semanas |
| `SEVERANCE_WEEKS` | 8 | **16 sem** | Estatuto España ~33d/año trabajado |
| A-check manDays A320 | 2 | **8** | Real 50-150 man-h = 6-19 manDays-24h |
| A-check manDays A321 | 2 | **9** | Idem |
| A-check parking | 1 día | **2 días** | A-check overnight + buffer |
| C-check manDays A320 | 60 | **150** | Real 3000-6000 man-h = 125-250 manDays-24h |
| C-check manDays A321 | 70 | **170** | Idem |
| D-check manDays A320 | 300 | **1000** | Real 1250-2000, compromiso jugable |
| D-check manDays A321 | 340 | **1150** | Idem |
| `penaltyPerLateMinute` | 80-140 €/min | **3-8 €/min** | Penalty estructural ya no es death-spiral |
| `slaMultiplier` | 1.20 | **2.50** | Absorbe espera entre shifts en WOs nocturnas |

**Mantenidos sin cambio** (Dani decidió ok):
- `PRE_AUDIT_WARNING_DAYS = 3`
- `START_MINUTE = 0` (medianoche — no se cambió aún)
- Salarios actuales (+30-50% sobre real España, incluye SS empresa)
- `TURNAROUND_MIN/MAX = 45/90` (no decidido)
- `NIGHT_SHIFT_SALARY_MULT = 1.5` (no decidido)

**Anotado a Parking Fase 4.5** (features nuevas, no aplicado):
- **Flota variable por aerolínea**: el actual `FLEET_SIZE_PER_AIRLINE = 8` representa "matrículas basadas en NUESTRO aeropuerto", no flota total. Variar por aerolínea: pequeña 3-5 / mediana 6-10 / grande 12-15. Campo `airline.basedAircraftCount`.
- **Contratos deluxe (tier system)**: minReputation hasta 90 + fees 1.5-2× para Tier-1 premium. Campo `contract.tier`.
- **Severance escalado por años trabajados**.
- **WeeklyFixedCost escala con hangares** (Fase 4.5 con build hangar).
- **LATE_CHECK_PENALTY escalado por tipo** (A 1.5k / C 5k / D 15k €/día overrun).

### Hotfix multi-cycle (hallazgo Dani durante validación visual)

**Bug**: en `generateDailyArrivals`, `usedToday.add()` impedía que la misma matrícula aterrizase >1 vez al día. Realidad: narrow-body real hace 3-8 cycles/día.

**Fix**: cambio a check temporal por matrícula — una matrícula puede tener varias landings al día siempre que no haya solape temporal entre estancias. Hasta 6 attempts por landing para encontrar slot válido.

Verificación: con `expectedLandingsPerDay = 9` y flota 8 aviones, ahora se observa una matrícula haciendo 2-3 landings/día consistente con realidad.

### Bloque R — "Reparar ya" sobre WO Deferred

**R1**: `unDeferWorkOrder(wo)` en `sim/mel.ts` — pasa WO de `Deferred` a `ToPlane`, limpia `deferralExpiryMinute`, sin equipo (pending re-asignación).

**R2**: `unDeferWoManually(g, woId)` en `game.ts` — wrapper con notificación `🔧 EC-XYZ: WO reactivada (MEL cancelado)`. Sin coste extra ni delta de reputación (reparar antes de tiempo es lo deseable).

**R3/R4**: Botón `🔧 Reparar ya` en sub-tab "Deferrals" del Hangar. Handler conectado vía `e.target.dataset.undeferWo`.

**R5**: 26 tests en `sim_mel_undefer.mjs` (target 10+). Cobertura: unit happy path + 4 sad paths, defer+undefer inverso, integración end-to-end con `createGame`+`advanceGame`+`deferWoManually`+`unDeferWoManually` validando reactivación + sin cambios en balance/rep + notif emitida.

### Bloque S — Validación final

**Auto-playtest 20×28d** con TODOS los cambios activos (gating + multi-cycle + rebalance + audit + Reparar ya disponible):

| Métrica | Baseline | Post-Q | Post-audit + multi-cycle |
|---|---:|---:|---:|
| Δbal medio | −49k € | +63k € | **+68k €** |
| Game overs | 1/5 | 0/20 | **0/20** |
| WOs/28d | 112 | 78 | 81 |
| WOs late/28d | 23 | 40 | 38 |
| Rep media | 62 | 50 | 51 |
| Penalty SLA | −174k € | −103k € | −105k € |

**Distribución por seed (Q final)**: 19/20 positivos, 1 levemente negativo (-3k), rango -3k a +203k. Sana, no plana, no patológica.

---

## Datos clave Fase 4

- Suite tests: **524 → 593** (+69 net):
  - +43 en `sim_shift_gating.mjs` (Q5)
  - +26 en `sim_mel_undefer.mjs` (R5)
  - Actualizaciones en sim_economy, sim_shifts_moral, smoke, sim_workorders_gen, sim_maintenance_h2 (assertions adaptadas)
- Bundle vanilla: 146 KB (Fase 3) → **211 KB** (Fase 4) = +45% por shift transitions + multi-cycle picker + "Reparar ya" UI.
- Save format: sin cambio (v6 sigue válido). `shiftGatingEnabled` es runtime, no se serializa.

---

## Decisiones cerradas en Fase 4

- ✅ **Shift gating productivo activo por default**, runtime toggle `shiftGatingEnabled` para tests legacy.
- ✅ **Cobertura inicial mixta 3/2/2** (morning/afternoon/night).
- ✅ **Hand-off MVP** = "libera y pausa" (WO queda sin equipo, jugador re-asigna). Auto-handoff a Fase 4.5.
- ✅ **Multi-cycle por avión**: matrículas pueden hacer 2-3 landings/día sin solape temporal.
- ✅ **"Reparar ya" sobre deferral**: sin coste extra, sin penalty rep. Modal+sub-tab Hangar.
- ✅ **Parámetros con info real MRO** donde el realismo no rompe gameplay (FH legs, training, severance, A/C/D manDays, MEL).
- ✅ **Compresión económica mantenida** en payments/min (50-72 €/min vs real 10-20) para que economía funcione con números enteros y sin escalar fixed cost.

---

## Findings y backlog Fase 4.5

### Features pendientes anotadas a Parking
1. **Flota variable por aerolínea** (basedAircraftCount).
2. **Contratos deluxe / tier system** (minRep hasta 90).
3. **Severance escalado por años trabajados**.
4. **WeeklyFixedCost escala con hangares construidos**.
5. **LATE_CHECK_PENALTY escalado por tipo** (A/C/D).
6. **Auto-handoff entre turnos** (en lugar de pausa).
7. **Visualización cobertura horaria** en panel Mecánicos (Q7 descopado).
8. **Notif agrupada cambio de turno** (Q8 descopado).
9. **START_MINUTE = 360** (06:00 ingame al arrancar — quita ventana muerta).

### Calibraciones para validar en playtest humano
- ¿Player percibe el balance económico correcto a 28d? (auto-playtest da +68k, pero el jugador puede gestionar mejor que el bot).
- ¿WOs late 50% se siente "normal" o "frustrante"? Si frustrante, considerar pricing dinámico o más cobertura.
- ¿"Reparar ya" se usa de forma natural o solo como escape pre-auditoría?

### Bugs encontrados y resueltos durante Fase 4
1. **Penalty SLA 80-140 €/min vs payment 28-42** — ratio 3:1 causaba death-spiral. Bajado.
2. **Patología FIFO sin priority** — WOs en cola se atrasan más al subir SLA. No es un bug técnico, es un hallazgo de diseño.
3. **WOs nocturnas death-spiral** — con gating activo y solo 1 mech night, las WOs entrantes a las 22h no se procesaban. Resuelto con cobertura 3/2/2.
4. **Multi-cycle/día por avión** (hallazgo Dani): cada avión hacía MÁXIMO 1 cycle/día. Fix con check temporal.
5. **Tests legacy expectaban "todos morning"** — actualizado a "3/2/2".
6. **sim_workorders_gen expectaba 70% prob** — actualizado a 50%.
7. **sim_part145 loop infinito con tunings extremos** — añadido cap de 5000 iters.

---

## Próximo (Fase 4.5 o Fase 5)

Pre-req: validación visual de [`builds/v0.3-fase4-viable.html`](../builds/v0.3-fase4-viable.html) por Dani.

**Candidatos prioritarios** (Dani decide al abrir el hilo):
- **Auto-handoff entre turnos**: matiza el MVP "libera y pausa" con asignación automática a otro mecánico on-shift con rating válido.
- **Contratos deluxe**: tier system con minRep hasta 90, fees 1.5-2×. Da rejugabilidad y progresión visible.
- **Click-to-detail cards**: del playtest 2026-05-15, refuerza USP autenticidad nicho.
- **Dashboard KPIs con gráficos**: del GDD §11, Fase 3 lo prometió pero quedó como kpis sueltos.
- **Tauri + SqliteBackend**: pendiente desde Fase 3 (G5-G7 diferidos). Decidir si va con Fase 5 polish o antes.

Plan completo se detalla al abrir Fase 4.5 / Fase 5 en sesión siguiente.

---

**Generado**: 2026-05-15 · **Input**: Fase 3 cerrada + audit Dani · **Output**: este fichero + `builds/v0.3-fase4-viable.html`.
