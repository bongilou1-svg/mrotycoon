# BRIEF Fase 4.5 — Contratos deluxe + Tier system

> Brief vivo de Fase 4.5. Time-box: **~3-5 días** reales side project. Arranca 2026-05-15, cierre objetivo ~2026-05-20.
>
> **Premisa**: Fase 4 dejó la economía viable (Δbal medio +68k €/28d) pero todos los contratos son "iguales" — mismo rango de fees, misma minReputation (35-55), misma exigencia. Esto choca con realidad MRO: hay aerolíneas Tier-1 (Emirates, Singapore, Lufthansa premium) que solo trabajan con MROs Tier-1, pagan 1.5-2× más y exigen SLA estricto + rep ≥85-90.
>
> El tier system da:
> - **Progresión visible**: empiezas con standards, ganas rep, desbloqueas premium, luego deluxe.
> - **Decisión rica**: aceptas deluxe pagando bien pero exigiendo más, o te quedas con standards seguros.
> - **Refuerza USP autenticidad**: refleja jerarquía real del mercado MRO.

---

## Objetivo de la fase

Que el jugador, al cruzar umbrales de reputación, vea aparecer ofertas de **tiers superiores** con badges visibles, fees mejores, y exigencias claras (minReputation alta, penalty/min más severo). Que un jugador competente pueda perseguir contratos deluxe como progresión meta.

---

## Bloques

### Bloque T — Contract tier system (días 1-3)

#### Decisiones de diseño

**3 tiers**:
- `standard`: rangos actuales (lo que existe en Fase 4).
- `premium`: fees ×1.35, minRep +20 (rango 55-75), mismo penalty/min ratio.
- `deluxe`: fees ×1.75, minRep +45 (rango 80-92), penalty/min ×1.5 (más exigente).

**Tier es informativo + económico**: NO requiere mecánica nueva (no hay SLA distinto por contrato, no hay tipo de WO especial). Solo modifica los números base de `rollContractTerms`.

**Distribución de ofertas en `tickContractMarket`**:
- Si rep aerolínea < 55: solo standard.
- Si rep 55-79: 70% standard / 30% premium.
- Si rep ≥ 80: 50% standard / 35% premium / 15% deluxe.

**Contratos iniciales**: mantienen `standard` (sin cambio). El jugador debe ganar rep para que aparezcan tier superiores.

**Save**: campo `tier` opcional. Si missing → standard (backward compat con saves v6).

**UI**: badge tier en cards de contrato + ofertas. Colores:
- standard: gris neutro
- premium: azul/dorado suave
- deluxe: dorado intenso / rojo

#### Subtasks

- T1: Tipo `ContractTier` en `types/contract.ts` + campo opcional `tier` en `Contract`.
- T2: `rollContractTerms` acepta tier opcional y aplica multiplicadores.
- T3: Constantes `TIER_MULTIPLIERS` documentadas + helper `pickTierForRep(rng, rep)`.
- T4: `tickContractMarket` usa `pickTierForRep` por aerolínea.
- T5: Suite tests `sim_contracts_tier.mjs` (target 20+): generación por tier, distribución por rep, multiplicadores correctos, backward compat.
- T6: UI badge tier en panel Contratos (activos + ofertas), modal de aceptar oferta muestra tier explícito.
- T7: Bundle `builds/v0.4-fase45-tier.html`.
- T8: Auto-playtest 20×28d: confirmar que con rep alta aparecen premium/deluxe sin romper balance.

### Bloque U — Cierre (día 4-5)

- U1: Doc `docs/CIERRE_fase4_5.md` con resultados + impacto en jugabilidad esperado.
- U2: Actualizar STATUS + CLAUDE + Parking (cosas que no entraron).

---

## Criterios de cierre Fase 4.5

- ✅ ContractTier type + 3 valores + helpers operativos.
- ✅ Generación tier respeta multiplicadores + minRep ranges.
- ✅ `tickContractMarket` distribuye tiers según rep aerolínea (verificado en tests + auto-playtest).
- ✅ UI muestra badge tier visible en cards de contrato + ofertas.
- ✅ Save backward compat: saves v6 sin `tier` cargan como standard.
- ✅ Auto-playtest 20×28d sin regresión (Δbal medio ≥ +50k, 0/20 game overs).
- ✅ Suite tests verde acumulado (>610).

---

## Anti-scope (NO entra en Fase 4.5)

- Tipo de WO especial por tier (todas iguales).
- SLA distinto por tier (mismo slaMultiplier global).
- Auditorías Part-145 más estrictas en deluxe (Fase 5+).
- Eventos especiales por tier (huelga premium etc.) — Fase 5+.
- Refactor de fees por aerolínea individual (todas las airlines pueden ofrecer cualquier tier según rep).

---

**Generado**: 2026-05-15 · **Cerrar Fase 4.5 objetivo**: ~2026-05-20 · **Próximo**: T1 — tipo + campo opcional.
