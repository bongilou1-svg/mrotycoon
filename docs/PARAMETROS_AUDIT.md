# MRO Tycoon — Auditoría de parámetros iniciales

> Salida de la pausa Fase 4 Q6 (2026-05-15). Lista exhaustiva de TODOS los parámetros y constantes que afectan al gameplay, agrupados por sistema. Cada fila: **dónde está · valor actual · qué significa · referencia real (cuando la sé) · veredicto**.
>
> Objetivo: revisar uno a uno, decidir realista vs juego, y dejar el balance del Bloque Q6 (rebalance post-shift-gating) construido sobre cifras defensibles. Donde pongo **POR VERIFICAR** quiere decir que es una intuición razonable pero no la garantizo — Dani la mira y decide.
>
> Convención: 💰 económico · ⏱️ temporal · ✈️ aeronáutico · 👥 RRHH · 📊 probabilidad/balance · 🚦 gameplay/UX.

---

## 1. Reloj y constantes de tiempo

| # | Param | Valor actual | Dónde | Qué es | Real |
|---|---|---|---|---|---|
| 1.1 | ⏱️ `DAY_MINUTES` | 1440 (24h) | `sim/time.ts:21` | Minutos en un día ingame | Trivial, no se toca. |
| 1.2 | ⏱️ `WEEK_MINUTES` | 10080 (7d) | `sim/time.ts:22` | Cierre semanal de economía | Trivial. |
| 1.3 | ⏱️ `START_MINUTE` | 0 (= 00:00 día 1) | `sim/time.ts:18` | A qué hora arranca la partida | **Cuidado**: el comentario en el código decía "06:00" pero `getHour(0) = 0` (medianoche). Con shift gating, arrancar a 00:00 significa que los mecánicos morning están OffShift hasta las 06:00 — primer evento jugable a las 6h ingame. **Sugerencia: arrancar a las 06:00 (minute = 360)** para que el jugador no vea 6h en blanco al empezar. |
| 1.4 | ⏱️ `MINUTES_PER_TICK_AT_1X` | 1 | `sim/time.ts:20` | Cada tick UI real = 1 min ingame en 1× | Convención del juego. |

---

## 2. Flota — FH (Flight Hours) y cycles

| # | Param | Valor actual | Dónde | Qué es | Real | Veredicto |
|---|---|---|---|---|---|---|
| 2.1 | ✈️ `FLEET_SIZE_PER_AIRLINE` | 8 | `sim/fleet.ts:14` | Aviones por aerolínea cuando se siembra flota | Aerolínea pequeña/regional ~20-40 narrow-body. 8 es para que un MVP "se sienta" sin saturar UI. **POR VERIFICAR si Dani quiere subirlo a 12-15 para sentir más volumen**. |
| 2.2 | ✈️ `FH_PER_LEG_MIN` / `MAX` | 3.0 / 5.0 | `sim/fleet.ts:17-18` | FH añadidas por landing | Realista para A320 narrow-body (vuelos europeos típicos 2-5h). ✓ |
| 2.3 | ✈️ Cycles por landing | +1 (hardcoded) | `sim/fleet.ts:228` | 1 ciclo = 1 takeoff + 1 landing | **Estándar industria**. ✓ Esto es lo del "fc por día" que mencionabas — un avión puede hacer 3-6 landings/día, así que un avión genera 3-6 cycles/día, no 1. La constante es por landing, no por día. |

### ¿Aging inicial de flota? (Fase 3 N fix)

`ageInitialFleet` en `fleet.ts:148-184` reparte FH desigual entre los 8 aviones de cada aerolínea:
- 1er avión: 0-100 FH (casi nuevo desde último A-check) y 0-33 cycles
- 2°-4° aviones: 100-300 FH / 33-100 cycles
- 5°-6° aviones: 300-500 FH / 100-167 cycles
- 7°-8° aviones: 500-580 FH / 167-194 cycles

Esto fuerza A-checks distribuidos durante las primeras semanas (A-check a 600 FH o 200 cycles).

**Veredicto**: gameplay-driven, no realista en sentido estricto pero útil. Dejar.

---

## 3. Aviones — landings y turnaround

| # | Param | Valor actual | Dónde | Qué es | Real | Veredicto |
|---|---|---|---|---|---|---|
| 3.1 | ✈️ `TURNAROUND_MIN` / `MAX` | 45 / 90 min | `sim/airplanes.ts:20-21` | Tiempo del avión en stand entre arrival y departure | A320 turnaround real **25-50 min** en operación normal. 45-90 es generoso. **Sugerencia: bajar a 35-70** para reflejar realidad y crear más presión SLA en line maintenance. |
| 3.2 | ✈️ Ventana arrivals (día op.) | 06:00-22:00 (16h) | `sim/airplanes.ts:70-71` | Cuándo aterrizan aviones | Tráfico real europeo es 06:00-23:30 con curfew nocturno. ~OK. Considera ajustar a 06:00-23:00 si quieres "más actividad" nocturna. |
| 3.3 | 📊 `landingsVariance` | 0.20 | `balance.json:45` | ±20% del `expectedLandingsPerDay` | Gameplay-driven (varianza visible). ✓ |
| 3.4 | ✈️ `expectedLandingsPerDay` por contrato | 3-9 (random) | `sim/contracts.ts:27` | Cuántos landings/día trae cada contrato | Realista para narrow-body en un MRO mid-tier. ✓ |

---

## 4. Work Orders — probabilidades y duración de fases

| # | Param | Valor actual | Dónde | Qué es | Real | Veredicto |
|---|---|---|---|---|---|---|
| 4.1 | 📊 `workOrderAtStand` | 0.70 | `balance.json:19` | Prob. de que un landing genere una WO | Heredado del legacy Unity. Muy alto — un line check rutinario tiene ~10-20% de hallazgos. **Sugerencia: bajar a 0.40-0.50** para reducir volumen de WO sin tocar nada más. Reduce la death-spiral del shift gating. |
| 4.2 | 📊 `directDispatch` | 0.40 | `balance.json:20` | Prob. de saltar MainTask tras Inspection (defecto leve) | Heredado del legacy. Razonable. ✓ |
| 4.3 | 📊 `reworkAfterTest` | 0.10 | `balance.json:21` | Prob. de rehacer trabajo tras Test fail | 5-15% real en MRO. ✓ |
| 4.4 | ⏱️ `phaseDurationRatios.inspection` | 0.15 | `balance.json:38` | 15% de `duration` template | Convención del legacy. ✓ |
| 4.5 | ⏱️ `phaseDurationRatios.mainTask` | 1.00 | `balance.json:39` | 100% (la duration nominal es MainTask) | Definicional. ✓ |
| 4.6 | ⏱️ `phaseDurationRatios.test` | 0.10 | `balance.json:40` | 10% | ✓ |
| 4.7 | ⏱️ `phaseDurationRatios.rework` | 1.00 | `balance.json:41` | Igual que MainTask | ✓ |

**Total nominal de una WO sin rework**: `0.15 + 1.00 + 0.10 = 1.25 × duration`. Con rework: `2.25 × duration`. La duration nominal del template (`durationMinutes`) suele ser 20-60 min según JSON.

---

## 5. SLA y penalties

| # | Param | Valor actual | Dónde | Qué es | Real | Veredicto |
|---|---|---|---|---|---|---|
| 5.1 | ⏱️ `slaMultiplier` | **2.50** (subido Fase 4 Q6) | `balance.json:24` | `slaMinute = emission + duration × 2.50` | NO existe analogía real (en MRO real el SLA es contractual, no derivado de duration). En el juego es el "colchón" antes de penalty. Con shift gating, una WO nocturna puede esperar 8h. Si una WO tarda 60min, 60×2.5 = 150 min SLA — todavía dispara penalty si entra a las 21:00 y nadie la coge hasta morning (>9h después). **Por revisar contigo si quieres aún más colchón** (1.50 era pre-Q6, 2.50 post-Q6, podría ir a 3.00). |
| 5.2 | 💰 `aogPenaltyMultiplier` | 5 | `balance.json:25` | AOG late penalty × 5 | Realista — AOG cuesta a la aerolínea ~10k-50k €/h de pérdidas operativas. ✓ |
| 5.3 | ✈️ `officeToStandMinutes` | 2 | `balance.json:26` | Timer mecánico oficina → stand | Razonable para un hangar medio. ✓ |
| 5.4 | 💰 `penaltyPerLateMinute` rango contract | **3-8 €/min** (Q6 iter 4) | `sim/contracts.ts:31` | Penalty/min cuando WO late | Heredado pre-fase 4 era 80-140 €/min (irreal). Bajado en P+Q hasta 3-8 — equivale a ~250-500 €/hora late, razonable para line maintenance no-crítica. **Validar contigo: ¿quieres que un retraso de 1h cueste ~400 €?**. |

---

## 6. Mecánicos iniciales — quiénes y cuántos

7 mecánicos al `createGame`. Generados en `sim/mechanics.ts:81-107`.

| # | Mec | base | rating(s) | shift | senior? | salario | eficiencia |
|---|---|---|---|---|---|---|---|
| M-001 | B1 | A320+A321 CFM56 | morning | sí | b1Senior 1600 €/sem | 0.95-1.15 |
| M-002 | B1 | A320+A321 V2500 | afternoon | sí | b1Senior 1600 €/sem | 0.95-1.15 |
| M-003 | B1 | A320 CFM56 | night | no | b1Junior 1100 €/sem | 0.85-1.0 |
| M-004 | B2 | A320+A321 CFM56 | morning | sí | b2Senior 1750 €/sem | 0.95-1.15 |
| M-005 | B2 | A320+A321 V2500 | afternoon | no | b2Junior 1200 €/sem | 0.85-1.0 |
| M-006 | helper | — | morning | — | helper 600 €/sem | 0.60-0.85 |
| M-007 | helper | — | night | — | helper 600 €/sem | 0.60-0.85 |

**Total salario semanal nominal**: 1600+1600+1100+1750+1200+600+600 = **8.450 €/sem** sin night ×1.5.
**Con night multiplier (M-003 y M-007)**: 1600+1600+**1650**+1750+1200+600+**900** = **9.300 €/sem**.

**Anual**: ~485k €/año (escala razonable para un MRO independiente pequeño con 7 técnicos).

### Comparación con salarios reales (mecánico aeronáutico EASA, 2025)

| Rol | Real (España, bruto/año) | Juego (×52 sem) |
|---|---|---|
| Helper sin licencia | ~22-26k € | 31k € |
| B1 junior | ~30-38k € | 57k € |
| B1 senior | ~45-60k € | 83k € |
| B2 junior | ~32-40k € | 62k € |
| B2 senior | ~50-65k € | 91k € |

**Veredicto**: los salarios del juego están **~30-40% por encima** del real español. Esto es razonable porque (a) los salarios reales no incluyen seguros sociales que paga la empresa (otro ~30%), y (b) un MRO Tier-1 paga más. Pero si quieres ser conservador en realismo, **baja un 15-20%** todos los salarios. Te dejo los dos rangos para que decidas.

---

## 7. Mecánicos — turnos (Bloque L + Fase 4 Q6)

| # | Param | Valor actual | Dónde | Qué es | Real | Veredicto |
|---|---|---|---|---|---|---|
| 7.1 | ⏱️ `MORNING_START` | 06:00 | `sim/shifts.ts:22` | Inicio shift mañana | Estándar industria EASA. ✓ |
| 7.2 | ⏱️ `MORNING_END` | 14:00 | `sim/shifts.ts:23` | 8h shift | Convención 3×8h. ✓ |
| 7.3 | ⏱️ `AFTERNOON_END` | 22:00 | `sim/shifts.ts:24` | 8h shift | ✓ |
| 7.4 | 👥 `NIGHT_SHIFT_SALARY_MULT` | 1.5 | `sim/shifts.ts:27` | Salario noche ×1.5 | En España el complemento de nocturnidad real es ~25-35%, no 50%. **Sugerencia: bajar a 1.30** si quieres realismo. |
| 7.5 | 👥 Distribución default | 3 morning / 2 afternoon / 2 night | `sim/mechanics.ts` | Cobertura 24h | Cubre operación 24/7. Realista para un MRO con line maintenance nocturna. ✓ |
| 7.6 | 🚦 Política hand-off shift | "Libera y pausa" (no auto-handoff) | `sim/shifts.ts:tickShiftTransitions` | WO con cert que sale → WO sin asignar | MVP. Real es auto-handoff con shift overlap (~30 min). Fase 4.5 lo refina. |

---

## 8. Moral, eficiencia y training activo

| # | Param | Valor actual | Dónde | Qué es | Veredicto |
|---|---|---|---|---|---|
| 8.1 | 👥 `DEFAULT_MORAL` | 70 | `sim/shifts.ts:35` | Moral inicial | ✓ |
| 8.2 | 👥 Moral drift /día | Idle +1 / Working -1 / Training +2 | `sim/shifts.ts:76-81` | Cambio diario por estado | Gameplay-driven. ✓ |
| 8.3 | 👥 Moral por evento WO | onTime +3 / late -2 / critical +5 / failed -8 / aogFailed -15 | `sim/shifts.ts:100-106` | Δ moral por outcome WO | ✓ |
| 8.4 | 👥 `moralMultiplier` | 0.5 + (moral/100)×0.7 → 0.5-1.2× | `sim/shifts.ts:53-56` | Eficiencia × moralMult | Razonable. ✓ |
| 8.5 | 💰 `ACTIVE_TRAINING_COST_EUR` | 5.000 € | `sim/shifts.ts:30` | Coste training activo | Training type rating EASA real cuesta **8-25k €** (semana intensiva). **Sugerencia: subir a 8.000 €** para más realismo. |
| 8.6 | ⏱️ `ACTIVE_TRAINING_DAYS` | 7 días | `sim/shifts.ts:32` | Duración training activo | Type rating real **1-3 semanas**. ✓ |

---

## 9. Mercado laboral — candidatos y rotación

| # | Param | Valor actual | Dónde | Qué es | Veredicto |
|---|---|---|---|---|---|
| 9.1 | 👥 `MARKET_REFRESH_DAYS` | 7 días | `sim/labor.ts:15` | Cada cuánto se renueva el pool | ✓ |
| 9.2 | 👥 `POOL_MIN` / `POOL_MAX` | 5 / 10 | `sim/labor.ts:12-13` | Tamaño del pool | ✓ |
| 9.3 | 📊 Distribución base candidato | 55% helper / 30% B1 / 15% B2 | `sim/labor.ts:50-54` | Probabilidad cada tipo | Realista — B2 es escaso (avionics). ✓ |
| 9.4 | 👥 Edad candidato | 22-58 años | `sim/labor.ts:57` | Rango edad | ✓ |
| 9.5 | 💰 `SIGNING_BONUS_WEEKS` | 4 (= 1 mes) | `sim/labor.ts:17` | Bonus al fichar | Real: signing bonus aeronáutico ~1-3 meses. ✓ |
| 9.6 | 💰 `SEVERANCE_WEEKS` | 8 (= 2 meses) | `sim/labor.ts:19` | Indemnización despido | Real en España (estatuto) ~20 días/año trabajado, mínimo 9 meses para empleados de larga duración. 8 semanas es bajo. **Sugerencia: subir a 12-16 semanas** o escalar con años trabajados (Fase 4.5). |
| 9.7 | ⏱️ `HELPER_PROMOTION_MINUTES` | 90 días Working | `sim/labor.ts:21` | Cuando un helper se promociona a B1 junior | Real: certificación B1 requiere 2-3 años de experiencia + EASA Part-66 exam. 90 días ingame es muy rápido pero compresión necesaria. ✓ |

---

## 10. Contratos — términos de roll

Generados en `sim/contracts.ts:rollContractTerms` cada vez que aparece una oferta nueva.

| # | Param | Valor actual | Dónde | Qué es | Real |
|---|---|---|---|---|---|
| 10.1 | 💰 `baseFeePerWeek` | 12.000-22.000 € | `sim/contracts.ts:29` | Cuota fija semanal por contrato | Realista — aerolíneas pagan ~50-200k €/mes a su MRO de cabecera. 48-88k €/mes. ✓ |
| 10.2 | 💰 `paymentPerWOMinute` | **50-72 €/min** (Q6) | `sim/contracts.ts:30` | Pago por minuto de WO completada | Real: line maintenance se factura ~80-150 €/hora-mecánico (= 1.30-2.50 €/min POR mecánico). Con team de 2-3 mecs, son 4-7 €/min × duration. Nuestros 50-72 €/min × duration son **~10× lo real**. Pero ya incluyen el "margen del MRO" y la compresión económica del juego. **Si quieres realismo: bajar a 10-20 €/min**. |
| 10.3 | 💰 `penaltyPerLateMinute` | **3-8 €/min** (Q6 iter 4) | `sim/contracts.ts:31` | Penalty/min late | Subido en P iter 1, bajado en Q6 iter 4. Razonable para evitar death-spiral. Si payment es 50-72, penalty 3-8 es ~10% del payment — bajo pero coherente con shift gating activo. |
| 10.4 | 📊 `minReputation` | 35-55 (±15 según rep) | `sim/contracts.ts:32` | Rep mínima para mantener contrato | ✓ |
| 10.5 | ⏱️ `OFFER_EXPIRY_MINUTES` | 4320 (3 días) | `sim/contracts.ts:7` | Cuánto dura una oferta antes de expirar | ✓ |
| 10.6 | ⏱️ `OFFER_TICK_DAYS` | 7 | `sim/contracts.ts:116` | Cada cuánto el mercado puede generar ofertas nuevas | ✓ |

---

## 11. A/C/D Checks — triggers y duración

De `data/maintenance_checks.json`. Hay 6 filas (A/C/D × A320/A321).

| Check | Trigger FH | Trigger cycles | manDays | parkingDays | baseFee | Real (A320) |
|---|---|---|---|---|---|---|
| A-check A320 | 600 FH | 200 c | 2 | 1 día | 12.000 € | **Real: 500-800 FH ó 6-8 sem, 50-150 man-h (~6-15 man-days), 1-2 días stand. Fee ~10-25k €** |
| A-check A321 | 600 | 200 | 2 | 1 | 13.000 € | ✓ (A321 ligeramente más) |
| C-check A320 | 7.500 FH | 5.000 c | **60** | 14 días | 110.000 € | **Real: 18-24 meses ó ~6000 FH, 3.000-6.000 man-h (~125-250 man-days), 1-2 sem stand. Fee 80-180k €** |
| C-check A321 | 7.500 | 5.000 | 70 | 16 | 130.000 € | ✓ |
| D-check A320 | 25.000 FH | 16.000 c | 300 | 60 días | 550.000 € | **Real: 6-10 años, 30.000-50.000 man-h (~1000-2000 man-days), 6-12 sem stand. Fee 0.5-3 M€** |
| D-check A321 | 25.000 | 16.000 | 340 | 65 | 620.000 € | ✓ |

**Veredicto**:
- A-check: ✓ realista (trigger + duración).
- C-check: **manDays demasiado bajos** (60 vs 125-250 real). Esto hace que el C-check completado sea fácil — un equipo de 5 mecs × 14 días = 70 man-days > 60 = completa rápido. **Sugerencia: subir manDays C a 100-150**.
- D-check: **manDays muy bajos** (300 vs 1000-2000 real). Pero parkingDays 60 está bien. **Si queremos D-check sea épico**: subir manDays a 600-900.
- baseFees: en rango realista bajo. ✓ Mantener.

---

## 12. MEL (Minimum Equipment List) — deferrals

| # | Param | Valor actual | Dónde | Qué es | Real |
|---|---|---|---|---|---|
| 12.1 | ⏱️ MEL A | 3 días | `sim/mel.ts:16` | Defecto crítico — 3 días | EASA estándar. ✓ |
| 12.2 | ⏱️ MEL B | 10 días | `sim/mel.ts:17` | Defecto serio — 10 días | EASA estándar. ✓ |
| 12.3 | ⏱️ MEL C | 120 días | `sim/mel.ts:18` | Defecto menor — 120 días | EASA estándar. ✓ |
| 12.4 | ⏱️ MEL D | 365 días | `sim/mel.ts:19` | "Indefinido" — modelado como 1 año | EASA real es "next scheduled maintenance". Aproximación útil. ✓ |
| 12.5 | 💰 `MEL_EXPIRY_PENALTY_EUR` | 10.000 € | `sim/mel.ts:23` | Multa al vencer un MEL sin reparar | EASA no impone multa fija, depende del Estado miembro. 10k € es bajo (en España puede ser 50k-200k €). **Sugerencia: subir a 25.000 €** o más para que la decisión "diferir" tenga peso. |
| 12.6 | 📊 `MEL_EXPIRY_REP_DELTA` | -5 | `sim/mel.ts:25` | Rep delta al vencer | ✓ |
| 12.7 | 📊 Distribución MEL en dataset | ~30% deferrables (hash determinista) | `sim/mel.ts:50-56` | % de WOs con MEL category | A=5% B=10% C=12% D=3% = 30%. Razonable estadística MRO. ✓ |

---

## 13. Part-145 compliance — auditorías

| # | Param | Valor actual | Dónde | Qué es | Real |
|---|---|---|---|---|---|
| 13.1 | 📊 `INITIAL_COMPLIANCE_SCORE` | 80 / 100 | `sim/compliance.ts:16` | Score inicial | Convención del juego. ✓ |
| 13.2 | ⏱️ `AUDIT_INTERVAL_MIN_DAYS` | 60 | `sim/compliance.ts:18` | Días mínimos entre auditorías | EASA real: ~1 audit/año + spot checks. **Sugerencia: subir a 90-120 días** para más realismo (audit cada ~3-4 meses). |
| 13.3 | ⏱️ `AUDIT_INTERVAL_MAX_DAYS` | 90 | `sim/compliance.ts:20` | Máximo | Idem — quizá 150-180 días. |
| 13.4 | ⏱️ `PRE_AUDIT_WARNING_DAYS` | 3 | `sim/compliance.ts:22` | Días de aviso pre-audit | Realista: las auditorías EASA se anuncian 2-4 semanas antes. **Sugerencia: subir a 14 días** para que el jugador pueda "prepararse" (limpiar deferrals, asignar WOs en curso). |
| 13.5 | 💰 Multa <30 score | 50.000 € | `game.ts` | Multa al bajar de 30 | Realista. ✓ |
| 13.6 | 📊 Score < 10 → game over | sí | `game.ts` | Revocación cert | Realista. ✓ |
| 13.7 | 📊 Audit delta clamp | [-15, +10] | `sim/compliance.ts` (runAudit) | Cambio máximo de score por audit | Gameplay-driven. ✓ |

---

## 14. Economía — fixed costs y starting balance

| # | Param | Valor actual | Dónde | Qué es | Real |
|---|---|---|---|---|---|
| 14.1 | 💰 `startingBalance` | 250.000 € | `balance.json:5` | Caja inicial | Pyme MRO Tier-3 arrancando ~100k-500k €. ✓ |
| 14.2 | 📊 `startingReputation` | 50 / 100 | `balance.json:6` | Rep inicial por aerolínea | ✓ |
| 14.3 | 💰 `weeklyFixedCost` | 12.000 € (=48k/mes) | `balance.json:7` | Coste fijo semanal (alquiler hangar, utilities, seguros, admin) | Realista: alquiler de un hangar Tier-3 ~30-50k €/mes + utilities 5-10k + seguros 3-5k = **40-65k €/mes**. 48k/mes encaja. ✓ Pero **NO escala con hangares** — si el jugador construye un 2° hangar (Fase 4.5), debería subir. |
| 14.4 | 💰 Salarios fixed (mecánicos) | Varía 600-1750 €/sem | `balance.json:8-15` | Pago semanal por base | Ya analizado en §6. |
| 14.5 | 💰 `LATE_CHECK_PENALTY_PER_DAY` | 5.000 €/día | `sim/maintenance.ts` (constante interna) | Penalty por día de overrun en A/C/D check | Realista para C-check. Para A-check parece alto (A-check completo cuesta 12k, overrun de 3 días sería 15k). **Sugerencia: escalar penalty con el tipo** (A 1.5k/día, C 5k/día, D 15k/día). |

---

## 15. Reputación — deltas y umbrales

| # | Param | Valor actual | Dónde | Qué es |
|---|---|---|---|---|
| 15.1 | 📊 `woCompletedOnTime` | +1 | `balance.json:30` | Δ rep por WO on-time |
| 15.2 | 📊 `woCompletedLate` | -1 | `balance.json:31` | Δ rep por WO late |
| 15.3 | 📊 `woFailed` | -5 | `balance.json:32` | Δ rep por WO failed |
| 15.4 | 📊 `aogFailed` | -10 | `balance.json:33` | Δ rep por AOG failed |
| 15.5 | 📊 `weeklyTickIfNoContracts` | -1 | `balance.json:34` | Δ rep semanal si no hay contratos |
| 15.6 | 📊 Game over rep | Todas las airlines ≤10 | `game.ts:534` | Cuando termina partida por rep |

Estos están en el rango "gameplay-driven", no hay analogía real directa. ✓

---

## Cambios aplicados en sesión post-audit (2026-05-15)

| Param | Antes | Después | Comentario Dani |
|---|---|---|---|
| §2.2 `FH_PER_LEG_MIN` | 3.0 | **1.0** | "entre 1 y 5" — legs cortos europeos |
| §4.1 `workOrderAtStand` | 0.70 | **0.50** | "bajalo" |
| §8.5 `ACTIVE_TRAINING_COST_EUR` | 5.000 € | **8.000 €** | "ok sube" |
| §8.6 `ACTIVE_TRAINING_DAYS` | 7 | **14 días** | "subelo" |
| §9.6 `SEVERANCE_WEEKS` | 8 | **16 sem** | "subelo" |
| §11 A-check manDays A320 | 2 | **8** | "ajusta realista" — 50-150 man-h reales = 6-19 manDays-24h |
| §11 A-check manDays A321 | 2 | **9** | Idem |
| §11 A-check parkingDays | 1 | **2** | A-check overnight + buffer |
| §11 C-check manDays A320 | 60 | **150** | Idem — 3000-6000 man-h reales |
| §11 C-check manDays A321 | 70 | **170** | Idem |
| §11 D-check manDays A320 | 300 | **1000** | Idem — real 1250-2000, compromiso jugable |
| §11 D-check manDays A321 | 340 | **1150** | Idem |
| §13.4 `PRE_AUDIT_WARNING_DAYS` | 3 | **3** (sin cambio) | "ok" — Dani lo mantiene |

## Anotado a Parking Fase 4.5 (features nuevas, no aplicado en Fase 4)

- **Flota variable por aerolínea** (§2.1): "aerolínea pequeña 3-5 / mediana 6-10 / grande 12-15 aviones BASADOS en nuestro aeropuerto. No es flota total." Campo `airline.basedAircraftCount`.
- **Contratos deluxe / tier system** (§10): "habrá deluxe que pidan reputación hasta del 90 o así". minReputation hasta 90, fees 1.5-2× para Tier-1 premium. Campo `contract.tier`.
- **Severance escalado por años trabajados**.
- **WeeklyFixedCost escala con hangares** (Fase 4.5 build hangar).
- **LATE_CHECK_PENALTY_PER_DAY escalado por tipo** (A 1.5k / C 5k / D 15k).

## Aclaraciones de la sesión

- **§2.3 (cycles)**: el código YA suma +1 ciclo por landing. Como un avión hace 3-9 landings/día (`expectedLandingsPerDay` por contrato), un avión real genera 3-9 cycles/día (=hasta 14h de utilización). La constante de código es por landing event, no per día — el "por día" es emergente del contrato.
- **Economía fija vs variable**: solo `weeklyFixedCost = 12k €/sem` es fijo (alquiler+utilities+seguros+admin). Los salarios escalan con cantidad de mecs contratados; ingresos por WO/check dependen de cuántos completes; penalties dependen de tu performance. NO escala aún con hangares (anotado).

---

## Cosas que aún quedan abiertas (Dani decide más adelante)

Por importancia para el balance:

1. 🔴 **§4.1 `workOrderAtStand 0.70`** — heredado del legacy, probablemente demasiado alto. Bajarlo reduce el volumen de WOs y la death-spiral del shift gating. **Mi voto: 0.40-0.50**.
2. 🔴 **§10.2 `paymentPerWOMinute 50-72`** — está ~10× la realidad. Compresión económica vs realismo. **Decidir**: ¿queremos cifras realistas (10-20 €/min con todo lo demás escalado) o cifras infladas para que la economía "funcione"?
3. 🟡 **§5.1 `slaMultiplier 2.50`** — con shift gating, ¿lo subimos a 3.00 o cambiamos enfoque (penalty escalonado por delay)?
4. 🟡 **§6 Salarios** — 30-40% sobre realidad española. ¿Mantenemos o ajustamos?
5. 🟡 **§1.3 `START_MINUTE`** — arrancar a 06:00 (= 360) en lugar de 00:00. Quitar la "ventana muerta" inicial.
6. 🟢 **§3.1 Turnaround 45-90 → 35-70** — realismo + más presión SLA.
7. 🟢 **§11 C-check / D-check manDays** — subirlos para que sean operativamente exigentes.
8. 🟢 **§12.5 Multa MEL vencido 10k → 25k €**.

Cuando me digas por dónde empezamos, voy parámetro a parámetro contigo (te muestro impacto en auto-playtest cada cambio).
