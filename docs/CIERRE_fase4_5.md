# Fase 4.5 — Contratos deluxe + Tier system · CIERRE

**Cerrada**: 2026-05-15 (misma sesión que Fase 4, ~2h adicionales)
**Tests**: 632 / 632 ✅ (+39 net en `sim_contracts_tier.mjs`)
**Release final**: [`builds/v0.4-fase45-final.html`](../builds/v0.4-fase45-final.html) (214 KB) — incluye tier system + quick wins parking.

---

## Qué entró

### Tipo + multiplicadores (T1-T3)

- `ContractTier = "standard" | "premium" | "deluxe"` en `types/contract.ts`.
- Campo `tier?: ContractTier` opcional en `Contract` — backward compat con saves v6.
- Constantes en `sim/contracts.ts`:
  - `TIER_FEE_MULT`: standard 1.0 · premium 1.35 · deluxe 1.75
  - `TIER_PENALTY_MULT`: standard 1.0 · premium 1.0 · deluxe 1.5 (más exigente)
  - `TIER_MIN_REP_BONUS`: standard 0 · premium +20 · deluxe +45

### Generación + distribución por rep (T2-T4)

`rollContractTerms(rng, params, tier="standard")` aplica los multiplicadores sobre los rangos base calibrados en Fase 4 Q6:
- baseFee: `randInt(12000, 22000) × repFactor × feeMult`
- payment: `randFloat(50, 72) × repFactor × feeMult`
- penalty: `randFloat(3, 8) × repFactor × penaltyMult`
- minRep: `randInt(35, 55) + (repFactor-1)×15 + minRepBonus` (clamp [0, 95])

`pickTierForRep(rng, airlineRep)`:
- rep < 55 → 100% standard
- rep 55-79 → 70% standard / 30% premium
- rep ≥ 80 → 50% standard / 35% premium / 15% deluxe

`tickContractMarket` usa `pickTierForRep` por aerolínea: cuando una aerolínea decide ofrecer, su tier depende de SU rep con el MRO (segmentada Fase 3 Bloque M).

### UI (T6-T7)

Badge tier en cards de contrato (panel Contratos, activos + ofertas):
- `Standard` → gris neutro
- `Premium ⭐` → azul/dorado suave
- `Deluxe ⭐⭐` → dorado intenso con glow CSS

### Tests (T5)

`sim_contracts_tier.mjs` (39 tests):
- Constantes correctas (8 tests).
- `pickTierForRep` thresholds: rep <55 nunca premium/deluxe, rep 65 nunca deluxe, rep 90 produce los 3.
- Distribución estadística (1000 rolls × 3 reps): clavada — rep 65 da 696/304/0, rep 90 da 502/356/142.
- Multiplicadores aplicados correctamente sobre fees/penalty/minRep con misma seed.
- Default tier (sin parámetro) = standard.
- `tickContractMarket` con rep alta produce mezcla de tiers (en 1000 ticks).
- Backward compat (Contract sin tier field → standard implícito).

### Auto-playtest (T8)

20 seeds × 28 días con Fase 4.5 activo:
- Δbal medio: **+68k €** (idéntico a Fase 4 final — no regresión).
- 0/20 game overs.
- Auto-playtest no acepta ofertas extra, así que contratos siguen siendo `standard`. El sistema tier está listo para cuando un jugador humano lo use.

---

## Decisiones cerradas

- ✅ **Tier es informativo + económico**, NO requiere mecánica nueva (no SLA distinto, no tipo WO especial). Solo modula los números base.
- ✅ **Distribución probabilística por rep aerolínea** (no determinista).
- ✅ **Contratos iniciales son standard** (`generateInitialContracts` no se tocó). El jugador debe ganar rep para que aparezcan tiers superiores.
- ✅ **Save v6 sigue siendo válido** — `tier` opcional, default standard implícito.
- ✅ **Multiplicadores conservadores**: deluxe 1.75× fees es realista (Tier-1 MRO real cobra 1.5-2× a aerolínea premium).

---

## Datos clave

- Tests: 593 → **632** (+39 net en sim_contracts_tier).
- Bundle: 211 → **213 KB** (+2 KB por tierBadge + CSS).
- Sin nuevos campos al save format (backward compat).

---

## Quick wins finales (cerrar Fase 4.5 — parking limpio)

Tras revisión Dani: aplicar 3 items XS del parking original de Fase 4 para cerrar la fase con todo el audit honrado:

### #1 — `START_MINUTE` 0 → 360 (06:00)
Quita las 6h muertas iniciales con shift gating activo (los morning mechs empiezan a las 06:00 ingame). El comment original del código decía "0 = 06:00" pero `getHour(0) = 0` (midnight). Ahora alineado: el jugador arranca cuando empieza la jornada operativa.

### #2 — `LATE_CHECK_PENALTY_PER_DAY` escalado por tipo
Antes constante 5.000 €/día para A/C/D. Ahora `LATE_CHECK_PENALTY_BY_TYPE`:
- A-check: **1.500 €/día** (A es overnight, overrun 3d = 4.5k vs fee 12k)
- C-check: **5.000 €/día** (mantiene valor previo)
- D-check: **15.000 €/día** (D overhaul mayor, overrun 5d = 75k significativo)

Helper `latePenaltyForType(type)`. Constante legacy se mantiene para tests pre-Fase4 (mapea al C-value).

### #3 — `weeklyFixedCost` hook escalado por hangares
Añadido parámetro `extraHangars` a `applyWeeklyClose` (default 0). Constante `WEEKLY_FIXED_COST_PER_EXTRA_HANGAR = 5000`. Hoy: 0 hangares extra, sin cambio. Cuando Fase 5 introduzca construir hangar 2º/3º, el caller pasará el contador y la economía escalará automáticamente.

### Impacto en métricas
Auto-playtest 20×28d post-quick-wins: Δbal medio **+77k €** (vs +68k antes — mejora por A-check penalty más bajo). 0/20 game overs. Suite **632/632 verde**.

---

## Findings y backlog Fase 5 (parking)

### No entró en Fase 4.5 (movido a parking)
- **SLA distinto por tier** (Fase 5+): deluxe podría tener slaMultiplier reducido a 2.0 vs 2.5 standard, o penalty/min escalado por delay.
- **Auditorías Part-145 más estrictas en contratos deluxe** (Fase 5+).
- **Eventos especiales por tier** (huelga premium, exigencia auditoría externa) — Fase 5+.

### Pendiente de Fase 4 audit (sigue en parking → Fase 5)
- Flota variable por aerolínea (`basedAircraftCount`).
- Severance escalado por años trabajados (necesita tracking `hiredAtMinute`).
- Auto-handoff entre turnos (en lugar de pausa MVP).
- Visualización cobertura horaria en panel Mecánicos.
- Notif agrupada cambio de turno (parcialmente cubierto).
- Click-to-detail cards (USP autenticidad nicho).
- Dashboard KPIs con gráficos.
- Tauri + SqliteBackend (G5-G7 diferidos desde Fase 3).

### Cerrados en quick wins finales 2026-05-15
- ✅ `START_MINUTE = 360` (#1)
- ✅ `LATE_CHECK_PENALTY_BY_TYPE` (#2)
- ✅ `weeklyFixedCost` hook con `extraHangars` (#3, dormido hasta hangar 2º)

---

## Próximo (Fase 5 o sub-fase)

Pre-req: validación visual de [`builds/v0.4-fase45-tier.html`](../builds/v0.4-fase45-tier.html).

Candidatos prioritarios:
- **Polish UX** (click-to-detail, dashboard KPIs, notificaciones agrupadas) — refuerza USP.
- **Build hangar 2º + 3º + escalado fixed cost** — progresión espacial.
- **Tauri + SqliteBackend** — deuda técnica path comercial.
- **Auto-handoff entre turnos** — matiza shift gating MVP.

---

**Generado**: 2026-05-15 · **Input**: Fase 4 cerrada · **Output**: este fichero + bundle `builds/v0.4-fase45-tier.html`.
