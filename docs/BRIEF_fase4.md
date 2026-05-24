# BRIEF Fase 4 — Viabilidad económica + operación 24/7

> Brief vivo de Fase 4. Time-box **17 días** (~2-3 semanas). Arranca 2026-05-15, cierre objetivo ~2026-06-01.
>
> **Premisa**: Fase 3 entregó la profundidad sistémica (A/C/D + MEL + Part-145 + mercado laboral + shifts + rep segmentada), pero el auto-playtest 5 seeds × 28 d con 1 contrato cierra con **Δbalance medio negativo** y 1-2/5 game overs. El sistema funciona pero **no es jugable a largo plazo**: cualquier feature nueva se construye sobre una economía que sangra. Fase 4 lo arregla y activa el shift gating productivo que el Bloque L dejó como "informativo" para no romper el balance antes de tiempo.
>
> **Scope decidido (2026-05-15)**: rebalance + shift gating + "reparar ya" + playtest validado. No entran: día/noche pillar, progresión orgánica, click-to-detail, dashboard KPIs, SBs/ADs, inventario, eventos aleatorios → quedan para Fase 4.5 o Fase 5 según cómo respiremos.

---

## Objetivo de la fase

Que una sesión real de 28 días ingame con jugador humano competente termine con balance ≥ +50k €, rep ≥ 50 en TODAS las aerolíneas activas, y 0/5 game overs en auto-playtest. Que el shift gating productivo esté activo (mecánico fuera de turno NO progresa WOs). Que la decisión "diferir" tenga una vuelta atrás ("Reparar ya") en lugar de ser one-way hasta vencimiento.

---

## Bloques

### Bloque O — Diagnóstico baseline (días 1-2)
**Por qué primero**: antes de tunear hay que saber por dónde sangra el dinero. El auto-playtest actual da agregados pero no desglosa transaction types ni evolución semanal.

**Decisiones de diseño**:
- Enriquecer `auto_playtest.mjs` con desglose por `TransactionType` (salarios vs base fees vs WO payments vs penalties vs maintenance fees vs fixed cost).
- Trazar evolución semanal de balance + rep + WOs completadas + mecánicos en working/idle.
- Sin tocar números todavía. El output sirve de baseline pre-tuning.
- **Variable a observar**: ¿el problema es ingresos bajos, salarios altos, o penalty SLA matando? El playtest baseline indica 0 failed WOs y 0 deferred, así que la fuga ES estructural (no por mala asignación), no por gameplay.

**Salida**: doc `docs/FASE4_baseline.md` con números crudos + hipótesis 3-4 palancas para tocar.

### Bloque P — Rebalance económico (días 3-7)
**Por qué crítico**: sin esto, Fase 4 fracasa antes de empezar.

**Decisiones de diseño** (todas dependientes del Bloque O findings):
- **Ingresos**: candidato a subir — `paymentPerWOMinute` de contratos, `baseFeePerWeek`, o tarifas A/C/D check (`maintenanceCheckFee`). Probable subida 10-25%.
- **Gastos fijos**: candidato a revisar — `weeklyFixedCost` 12k€/sem fijo independiente de número de hangares es probablemente alto al arranque. Considerar escalar con número de stands ocupados o hacerlo 6-8k inicial + 4-6k por hangar adicional.
- **Salarios**: candidato a NO tocar (ya están en línea con realidad MRO mid-tier). Si tocamos, primero ratios entre niveles.
- **Penalty SLA**: el slaMultiplier 1.20 vs 1.05 original es ya un buen colchón. Vigilar que con shift gating no se rompa.
- **Iteración**: tunear, correr 5×28d, repetir. Target: Δbalance medio **≥ +50k €**, game overs **0/5**, rep media ≥ 50.
- **No introducir números mágicos**: cada cambio en `balance.json` o constantes hardcoded debe tener una línea de comentario justificando.

**Riesgo**: trivializar el juego con economía demasiado generosa. Mitigación: el Bloque Q (shift gating) reintroduce escasez controlada de mano de obra.

### Bloque Q — Shift gating productivo (días 8-12)
**Por qué crítico**: el Bloque L lo dejó como "informativo + coste salarial". Activarlo cambia drásticamente el throughput diario — un mecánico morning solo trabaja [06-14), con lo que la flota necesita cobertura 24/7 si quiere operar 24h.

**Decisiones de diseño**:
- `inShift(mech, nowMinute)` decide si un mecánico contribuye o no. Out-of-shift → `mech.state = OffShift` y no progresa work.
- **Hand-off entre turnos**: cuando un mecánico sale de turno mientras está Working, libera la WO (vuelve a unassigned o se autocontinúa con quien quede). Decisión MVP: **liberar a Idle/OffShift, la WO queda pausada y debe ser re-asignada por el jugador.** Decisión Fase 4.5: auto-handoff a otro mecánico con el rating disponible (estilo Project Hospital).
- **Notif** "🕐 Pedro saliendo de turno, WO #248 pausada" para que el jugador no lo descubra a las 8h.
- **Mecánicos iniciales**: 7 mecánicos todos `morning` por default es 0 cobertura tarde+noche. Considerar arrancar con shifts mixtos (4 morning, 2 afternoon, 1 night) o dejar que el jugador descubra el problema.
- **Coordinación con Bloque P**: el rebalance debe contemplar que cobertura 24/7 es ~3× headcount → más salarios → más ingresos necesarios. Probable que el Bloque P meta cobertura mixta default y suba ingresos.

**Riesgo**: complejidad de hand-off explota en UX. Mitigación: MVP libera-y-re-asigna, auto-handoff a Fase 4.5.

### Bloque R — Acción "Reparar ya" sobre deferral (días 13-14)
**Por qué**: feedback del CIERRE_fase3 ("brief I4 mencionaba la acción, MVP solo deja vencer"). Decisión rica de gameplay: jugador difiere para liberar stand → reconsidera y repara antes de que venza para limpiar la lista pre-auditoría.

**Decisiones de diseño**:
- Modal de WO en phase `Deferred` muestra botón "🔧 Reparar ya" además del countdown.
- Click → WO vuelve a phase `Pending` (o `MainTask` con progreso 0 si ya pasaron Inspection antes de diferir).
- Coste: probablemente ningún coste extra. La decisión ya genera tradeoff (ocupa stand de nuevo, cuesta mecánicos).
- **Decisión abierta**: ¿hay penalty de rep menor (-1) por "rectificar deferral"? **No**, no realista. Reparar antes de tiempo es lo deseable regulatoriamente; el coste reputacional ya lo paga el diferir.

**Riesgo**: trivializa MEL (difiero todo, reparo a conveniencia). Mitigación: los deferrals abusados que vencen siguen contando en compliance. La acción "reparar ya" solo afecta a deferrals vivos.

### Bloque S — Cierre + validación (días 15-17)
**Por qué**: igual que N en Fase 3 — sin auto-playtest validado, no cerramos.

**Decisiones de diseño**:
- Re-correr `auto_playtest.mjs` 5×28d con todos los cambios. Comparar contra baseline del Bloque O.
- Si el playtest sigue mal: 1 ronda de tuning extra (medio día), si sigue → documentar bloqueo y abrir Fase 4.5.
- Bundle release `builds/v0.3-fase4-viable.html`.
- Doc cierre `docs/CIERRE_fase4.md` con findings + backlog Fase 4.5.

---

## Criterios de cierre Fase 4

- ✅ Auto-playtest 5×28d: Δbalance medio ≥ +50k €, game overs 0/5, rep media ≥ 50.
- ✅ Shift gating productivo activo: mecánico fuera de turno NO progresa WOs (test que lo verifica).
- ✅ Hand-off MVP funcional: WO en progress pausa al salir el mecánico de turno, jugador re-asigna.
- ✅ Botón "🔧 Reparar ya" funcional en modal Deferred WO.
- ✅ Build vanilla v0.3 publicado en `builds/` y doc cierre escrito.
- ✅ Suite tests verde (target acumulado >550 incluyendo nuevos del shift gating).

Bonus (no requeridos):
- 🎁 Auto-handoff entre turnos (en lugar de pausa).
- 🎁 Mecánicos iniciales con shifts mixtos por default.
- 🎁 Coverage visual en panel Mecánicos (qué shift está cubierto a qué hora).

---

## Riesgos vivos

1. **Tuning económico ad infinitum** — la economía es alta dimensión (10+ palancas). Disciplina: **3 rondas máximo** de tuning. Si tras 3 rondas no cuadra, documentamos el problema y reducimos scope (p.ej. introducir auto-aceptación de ofertas en el playtest para reflejar caso real con multi-contrato).
2. **Shift gating rompe el balance recién tuneado** — orden importa: tunear ANTES de activar gating no funciona, porque gating reduce throughput. Estrategia: **Bloque P con throughput máximo (mock shift OFF) → Bloque Q activa gating y re-tunea SOLO ingresos/costes para compensar** (no tocar precios de WO, eso ya está calibrado para el throughput).
3. **El auto-playtest no representa al jugador humano** — playtest no contrata, no difiere, no entrena. Mitigación: añadir **modo "jugador básico" opcional** al playtest (auto-acepta ofertas con rep ≥ 30, contrata 1 helper/sem si balance > 100k €). Solo si el caso single-contract no calibra bien.
4. **Hand-off MVP frustra UX** — pausar WOs cada 8h porque cambia el turno puede ser molesto. Mitigación: notif clara + considerar que las WOs cortas (line maintenance, 20-60 min) no llegan a cambiar de turno normalmente; solo afecta a C/D checks largos, que son MUCHO menos frecuentes.

---

## Inspiración / referencia

- **Project Hospital** — su sistema de turnos tiene auto-handoff entre médicos del mismo speciality. Ahí está la barra alta, MVP nuestra está por debajo.
- **Production Line** — pricing dinámico de coches. No aplicamos pero el modelo de "ratio costes/ingresos" es la base.

---

## Estado del repo al abrir Fase 4

```
mrotycoon/
├── CLAUDE.md, STATUS.md, TASKS.md (Fase 4), README.md
├── docs/
│   ├── GDD.md                    # Fase 1
│   ├── CIERRE_fase2.md           # Fase 2 cerrada
│   ├── BRIEF_fase3.md            # Fase 3 brief
│   ├── CIERRE_fase3.md           # Fase 3 cerrada 2026-05-14
│   └── BRIEF_fase4.md            # este
├── src/lib/{sim,data,i18n,types,stores,assets,ui}/
├── src-tauri/                    # Diferido a Fase 5
├── tests/                        # 523/523 verdes al cierre Fase 3
├── builds/
│   ├── v0.1-vertical-slice/      # Fase 2
│   └── v0.2-fase3-depth.html     # Fase 3 release
└── .scripts/                     # PowerShell helpers + build-vanilla.mjs
```

---

**Generado**: 2026-05-15 · **Cerrar Fase 4 objetivo**: ~2026-06-01 · **Próximo**: Bloque O1 — enriquecer auto_playtest con desglose por TransactionType + evolución semanal.
