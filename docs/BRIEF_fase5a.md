# BRIEF Fase 5A — Sistemas pendientes de sim

> Brief vivo de Fase 5A (primera sub-fase de la partición Fase 5 acordada 2026-05-15).
> Time-box: **3-4 semanas** reales side project. Arranque 2026-05-15. Cierre objetivo ~2026-06-12.
>
> **Premisa**: con Fase 4 + 4.5 cerradas, la sim económica funciona pero le faltan **tres pilares estructurales** que el playtest visual de Dani (2026-05-15) destapó:
> 1. **Día/noche como eje temporal real**: hoy el reloj corre 24/7 con landings uniformes 06-22 y mecánicos por shift, pero NO hay diferencia operativa de noche (pernoctas, daily checks, pre-flight). El MRO real es una operación distinta de noche.
> 2. **Automatización progresiva ("TMA jefe")**: hoy el jugador asigna mecánico a cada WO manualmente. En MRO real, un lead foreman/TMA jefe asigna por ti; tu rol sube de nivel de abstracción a planificación. Sin esto el late-game se vuelve micro-management agotador.
> 3. **Progresión orgánica del MRO** (4 etapas): hoy arrancas con 1 hangar + 3 line stands + 1 base stand y eso no cambia. En realidad un MRO crece 4 etapas (line+pernocta → A en plataforma → hangar 1 → hangar 3 posiciones).
>
> Más las **8 features cortas del Parking F4.5** que no entraron por scope: flota variable por aerolínea, severance escalado por años, auto-handoff turnos, cobertura visual, click-to-detail, dashboard KPIs (estos dos últimos en realidad son Fase 5B), Tauri+Sqlite (Fase 5B), notif agrupada turnos.
>
> **Disciplina**: mantener Fase 3-4. Sistema → tests → auto-playtest. **Cero polish visual** (eso es Fase 5B). Si una decisión visual aparece, anotar a Parking 5B y seguir.

---

## Objetivo de la fase

Cerrar los tres pilares sim pendientes + las features cortas del audit. Al cierre de 5A, una sesión nocturna ingame debería incluir: aviones aterrizando para pernocta, daily checks auto-generados, A-checks nocturnos optimizando equipos noche, todo gestionado por TMA jefe sin que el jugador haga clicks de asignación. Y debería ser posible **expandir** de 1 hangar a 3 posiciones gastando capital, no jugar siempre en la misma escala.

---

## Bloques

### Bloque V — Día/noche real (semana 1)
**Por qué primero**: cambia la sensación del juego más que ningún otro. Hoy el jugador no percibe diferencia entre las 14h y las 02h salvo por shift gating. Tras V, la noche es operativa con propósito propio.

**Decisiones de diseño**:
- **Pernocta**: nuevo tipo de landing `overnight: boolean`. Probabilidad escala con hora (último landing del día más probable pernocta). Avión overnight ocupa stand desde arrival hasta morning siguiente.
- **Daily Check** auto-generado: cuando un avión pernocta, se emite WO tipo `daily-check` (templates nuevos: visual inspection ATA 5, brake wear ATA 32, tyre pressure ATA 32, fluids ATA 12). 4-6 templates simples 15-30 min. Penalty bajo si late (el avión está disponible al amanecer salvo defecto).
- **A-check nocturno**: A-check programable durante pernocta si avión cumple trigger FH/cycles + hay BaseStand libre + hay team night disponible. Modela realidad MRO.
- **Pre-flight check** al amanecer: 1 WO ligera obligatoria antes del primer vuelo (turnaround minutes). Asegura que el jugador percibe el "ritmo" del amanecer.
- **Eje temporal en HUD**: badge día/noche visible. NO requiere arte, solo emoji/color.

**Riesgo**: rompe el balance Fase 4 si los daily checks son demasiados o caros. Mitigar: dataset corto (4-6 templates), penalty bajo, pagos por completar (compensa salario night ×1.5).

### Bloque W — TMA jefe + automatización progresiva (semana 2)
**Por qué segundo**: depende del flujo de asignación rodado (lo tenemos de F2-F4). Sin esto, el endgame es tedioso.

**Decisiones de diseño**:
- **Mecánico especial "lead foreman"**: tier nuevo de mecánico. Salario alto (~2.500 €/sem). Cuando está hired, auto-asigna mecánicos a WOs sin equipo siguiendo política simple (matcheador greedy: certifier eligible + helper más eficiente).
- **Política configurable** en panel Mecánicos: "auto-asignación" toggle (default off hasta que hires TMA), opciones "priorizar AOG", "priorizar shift actual", "agrupar por matrícula".
- **Visible**: cuando TMA actúa, notif `🎯 TMA: asignados M-001, M-005 a WO-248`. El jugador ve qué hace y puede deshacer.
- **Coste**: salario alto + 1 TMA por hangar máximo. Cuando llegan los hangares 2/3 (Bloque X), necesitas más TMAs.
- **Sub-feature del audit**: auto-handoff entre turnos. Cuando un certifier sale de shift, TMA intenta auto-asignar otro on-shift con rating válido (en lugar de pausar WO). Si no hay → pausa como ahora.

**Riesgo**: trivializa el juego si el TMA es perfecto. Mitigar: TMA solo asigna si hay choice trivial; en empates/conflictos deja la WO sin asignar para que el jugador decida.

### Bloque X — Progresión orgánica del MRO (semanas 2-3, solapa con W)
**Por qué tercero**: requiere el shift gating + auto-handoff ya operativos. Es el cierre del trilema "scale up".

**Decisiones de diseño**:
- **4 etapas explícitas** con coste de inversión:
  1. **Etapa 1 (default)**: line + pernocta. Lo que tienes hoy. 3 line stands + 1 base stand (pernocta).
  2. **Etapa 2**: A en plataforma. Coste 100k €, instantáneo. Habilita A-check al aire libre (sin hangar) — más rápido pero penalty calidad mayor.
  3. **Etapa 3**: 1 hangar interior. Coste 500k € + 14 días construcción. Habilita C-check + 1 BaseStand extra. Activa el hook `extraHangars` (Fase 4.5 dejé dormido).
  4. **Etapa 4**: 3 posiciones (hangar mayor). Coste 1.5M € + 30 días. Habilita D-check + 2 BaseStands extra (3 totales) + +5k/sem fixed cost.
- **UI**: panel Construcción nuevo (tab sidebar). Muestra etapa actual + próximas con coste + ETA.
- **Tiempo de construcción**: nuevo estado `buildingStage` en game, con countdown. Mientras construye no puede iniciarse otra construcción.

### Bloque Y — Features cortas del Parking F4.5 (intercaladas)
Aplicar las 6 features que quedaban del audit:
1. **Flota variable por aerolínea**: campo `airline.basedAircraftCount` (pequeña 3-5, mediana 6-10, grande 12-15). Modifica `seedFleetForAirline`.
2. **Severance escalado por años trabajados**: tracking `hiredAtMinute` en mecánico. Severance = max(16 sem, semanas trabajadas × 0.5).
3. **Auto-handoff entre turnos**: integrado en Bloque W (TMA jefe).
4. **Visualización cobertura horaria**: mini-gantt 24h × 3 shifts en panel Mecánicos. Cuántos mecs cubren cada hora.
5. **Notif agrupada cambio de turno**: ya parcialmente cubierto en Fase 4 Q. Refinar.
6. ~~Click-to-detail cards~~ → Fase 5B.
7. ~~Dashboard KPIs gráficos~~ → Fase 5B.
8. ~~Tauri + SqliteBackend~~ → Fase 5B.

### Bloque Z — Cierre 5A (semana 4)
- Auto-playtest 5 seeds × 60 días (más largo para ver progresión orgánica completa).
- Doc cierre `CIERRE_fase5a.md`.
- Bundle final `builds/v0.5a-fase5a-sim.html`.
- Update STATUS + CLAUDE para entrega a Fase 5B.

---

## Criterios de cierre Fase 5A

- ✅ Día/noche operativo: aviones pernoctan, daily checks auto-generados, A-checks nocturnos posibles.
- ✅ TMA jefe contratable, auto-asignación funcional, auto-handoff turnos.
- ✅ Construcción 4 etapas operativa: jugador puede llegar a etapa 4 en 60 días si lo prioriza.
- ✅ 6 features cortas audit aplicadas.
- ✅ Auto-playtest 5 seeds × 60 días: 0/5 game overs, balance estable.
- ✅ Suite tests verde (target >750 acumulado).

---

## Anti-scope (NO entra)

- **Polish visual de cualquier tipo**: animaciones, click-to-detail, gráficos, sonido → Fase 5B.
- **Tauri / SqliteBackend**: Fase 5B (condiciona render path con GSAP).
- **Steam page / demo**: Fase 6.
- **Contratos deluxe ya en producción**: Fase 4.5 los activó pero la curva de progresión hasta deluxe se evalúa en 5A auto-playtest, no se rebalancea aquí salvo regresión.

---

## Riesgos vivos

1. **Scope creep de los 3 pilares**: cada uno es un mini-bloque. Vigilar: cada bloque V/W/X debe cerrar antes de pasar al siguiente. Si W se desborda, recortar TMA a "auto-handoff básico" y diferir auto-asignación full a Fase 5B.
2. **Daily checks descalibran balance**: el dataset nuevo puede inundar el jugador. Mitigación: dataset corto (4-6 templates), playtest mini cada cierre de bloque.
3. **Construcción hangar rompe shift gating**: extra BaseStand requiere capacity check. Mitigación: el hook `extraHangars` ya está en Fase 4.5, sólo añadir lógica de transición.
4. **Lead foreman trivializa juego**: si TMA es perfecto, el jugador no decide. Mitigación: TMA solo auto-asigna en casos triviales (1 cert eligible + 0 helpers). El jugador sigue decidiendo en multi-WO.

---

**Generado**: 2026-05-15 · **Cerrar Fase 5A objetivo**: ~2026-06-12 · **Próximo**: V1 — diseñar tipos pernocta + daily check templates.
