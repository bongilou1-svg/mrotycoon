# MRO Tycoon — Vertical Slice v0.1

Release de cierre de Fase 2 (2026-05-14).

## Cómo jugar

Doble-click en `index.html` → abre en Chrome (cualquier navegador moderno funciona).

El juego arranca en **pausa**. Pulsa `1×` / `2×` / `5×` en la esquina superior derecha para que el reloj empiece.

## Controles principales

- **Sidebar izquierda**: 4 tabs (Hangar / Mecánicos / Contratos / Economía)
- **Esquina superior derecha**: 💾 Save / 📂 Load / 🆕 New game · controles de velocidad
- **Click en WO**: abre modal con detalle + asignador manual (elegir certifier con type rating válido + 0-2 helpers)

## Flujo sugerido

1. Pulsa **5×**
2. Espera a que llegue el primer avión (~10s reales)
3. Cuando aparezca una WO, click en su card para asignarle mecánicos a mano
4. Pulsa **2×** para ver progreso con calma
5. Al cumplir la primera semana ingame verás autosave + cierre semanal en notificaciones
6. Acepta una oferta de contrato → más aviones → más actividad

## Estado conocido (findings de auto-playtest)

- Gameplay viable: 0/5 game over en 14 días simulados
- Reputación cae rápido (-42 puntos en 14 días) — pendiente tuning Fase 3
- Save/Load funciona con localStorage del navegador (continuidad determinista verificada)

## Versión

- v0.1.0-alpha — vertical slice
- 100 work orders ATA A320/A321
- 4 aerolíneas ficticias (SkyAirlines, SunAirlines, TreeAirlines, Starairlines)
- 7 mecánicos iniciales (3 B1 + 2 B2 + 2 helpers)
- 151/151 tests verdes en sim core
