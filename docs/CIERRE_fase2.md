# Cierre Fase 2 — Vertical slice

> 2026-05-14 · time-box 14 días · cerrada con vertical slice end-to-end jugable, **151/151 tests verdes**, build estable entregable.

---

## TL;DR

**Fase 2 cerrada con éxito**, vertical slice end-to-end funcional. El loop completo (aceptar contrato → llegan aviones → generan WOs → asignar mecánicos → progreso por fases → cobrar/penalizar → cierre semanal → save/load) está implementado, testeado y entregado como un único HTML autocontenido de 116 KB.

**Cambio de stack mid-fase**: arrancamos con Tauri 2 + Svelte 5 + Vite (planeado en docs). Tras instalar Rust GNU + MinGW + lld + iconos y mover el proyecto a un path sin espacios, descubrimos que el bundle Svelte 5 falla al ejecutarse vía `file://` (pantalla negra, mismo síntoma en bundle directo, artifact Cowork y classic-script). El sim core en TypeScript siguió siendo bueno. Reemplazamos la capa UI por **vanilla JS + DOM API** con esbuild IIFE bundle. Tauri + Svelte queda como path comercial para Fase 5-6 (sirve via custom protocol, sin file://).

---

## Qué entró

### Bloque B — Data port
100 work orders generadas con cobertura ATA real (21 capítulos, A320/A321 con CFM56/V2500), 4 aerolíneas con flotas mixtas, balance JSON con todas las constantes de tuneo, i18n ES+EN con 120 claves. Tipos TS estrictos con type guards runtime. **28/28 smoke tests**.

### Bloque C — Sim core
10 módulos puros sin DOM, testeables aislados:
- `time.ts` — tick + speed (0/1×/2×/5×) + helpers de calendario
- `rng.ts` — mulberry32 con state serializable
- `contracts.ts` — generación, accept/reject, expiry
- `airplanes.ts` — landings probabilísticos, asignación de stands
- `workorders.ts` — generación 70% al landing, instances con SLA
- `mechanics.ts` — 7 iniciales (3 B1 + 2 B2 + 2 helpers) con type ratings
- `assignment.ts` — certifier + helpers, travel timer, team efficiency
- `wo_state_machine.ts` — 5 fases con direct dispatch + rework
- `economy.ts` — ledger + cierre semanal + AOG penalty ×5
- `reputation.ts` — deltas semánticos por evento
- `game.ts` — state global + `advanceGame()` orquestador

**102/102 tests** módulos + integration test 7 días end-to-end.

### Bloque D — UI vanilla
HUD top vivo (balance, reputación, reloj, speed controls), sidebar con 4 tabs (Hangar / Mecánicos / Contratos / Economía), modal de asignación manual con filtro automático de certifiers por type rating, notificaciones laterales cronológicas, game loop a 100 ms. **`builds/bloque-d-vanilla.html` confirmado funcionando** por Dani.

### Bloque E — Save/Load
`StorageBackend` abstracto con dos implementaciones: `LocalStorageBackend` (browser) y `InMemoryBackend` (tests). Autosave fire-and-forget tras cada cierre semanal. UI con 💾 Save / 📂 Load / 🆕 New. Version guard. **21/21 tests** incluyendo continuidad determinista: tras save→load, los siguientes ticks producen el mismo estado que la línea original sin cortar.

### Auto-playtest (sustituto del playtest humano)
5 seeds × 14 días simulados. Confirma viabilidad del gameplay: 0/5 game over, todas las seeds generan y completan WOs. **Findings importantes en sección dedicada abajo**.

---

## Qué quedó fuera (delegado a Fase 3+)

| Cluster | Por qué quedó fuera | Fase destino |
|---|---|---|
| **A/C/D checks** (base maintenance) | No es line maintenance, requiere FH+cycles tracking del avión | 3 |
| **MEL/Deferrals** | Requiere modal "reparar / diferir" + tracking | 3 |
| **EASA Part-145 compliance** + auditorías | Meta-sistema regulatorio | 3 |
| **Service Bulletins + Airworthiness Directives** | WOs recurrentes generadas por eventos externos | 3 |
| **Turnos 24/7 + moral/fatiga + training** | Profundidad tycoon, fuera del MVP | 3 |
| **Reputación segmentada por aerolínea** | Hay solo global en MVP | 3 |
| **Inventario de piezas** (lead time + proveedores) | `partsRequired` solo se muestra como info | 3 |
| **Herramientas single-buy CapEx** | `toolsRequired` solo se muestra como info | 3 |
| **Type ratings adicionales** (V2500 ya cubierto, pero limitado) | MVP usa 7 mecánicos fijos | 3 |
| **Mercado laboral** (candidatos) | El BRIEF tenía Candidate diseñado | 3 |
| **KPI gráficos** (Chart.js) | Solo números en MVP | 3 |
| **Eventos aleatorios** (huelga, runway closure, recall) | Textura | 4 |
| **Progresión meta** (MRO Tier 1/2/3, hitos, logros) | Sentido de avance largo | 4 |
| **Difficulty modes** (realista/estándar/casual) | Tres curvas | 5 |
| **Tutorial framework + tooltips abundantes** | Estándar Steam | 5 |
| **Sonido / música / accesibilidad** | Polish final | 5 |
| **Tauri funcionando en Windows del Dani** | MCP homelab-runner se cayó mid-fase; pendiente | 2.5/3 |

---

## Findings del auto-playtest (5 seeds × 14 días)

| seed | balance final | Δbal | rep | Δrep | WOs gen | aviones | game over |
|---|---|---|---|---|---|---|---|
| 1   | 237.006 € | -12.994 € | 5  | -45 | 90 | 150 | no |
| 7   | 212.585 € | -37.415 € | 0  | -50 | 68 | 111 | no |
| 42  | 244.734 € |  -5.266 € | 16 | -34 | 26 | 63  | no |
| 100 | 275.218 € | +25.218 € | 0  | -50 | 65 | 103 | no |
| 333 | 270.847 € | +20.847 € | 16 | -34 | 47 | 69  | no |
| **media** | **248k €** | **-1.922 €** | **7.4** | **-42.6** | **59** | **99** | **0/5** |

**Lo bueno**:
- Cero game over en 14 días → gameplay sobrevivible al inicio
- WO/14d medio: 59 → buen volumen, sostenido
- Δbalance medio: ~neutral con 1 solo contrato (esperable, jugador debe aceptar más para crecer)

**Lo preocupante para Fase 3 tuning**:
- **Reputación cae -42.6 puntos en media** en solo 14 días. Dos seeds llegan a 0 (al borde de game over por reputación si pierden contratos).
- **Pico de aviones por 1 sólo certifier B1+1 B2** crea cola de WOs late. Auto-asignación greedy puede no ser óptima.
- **Falta variabilidad**: con 100 aviones generados, las WOs late impactan reputación rápido por el delta -2 por completed late.

**Acción Fase 3 tuning**:
- Revisar `phaseDurationRatios.mainTask` (actual 1.0). Probable que reducir a 0.7 mejore SLA.
- O subir `slaMultiplier` de 1.05 a 1.2-1.3.
- O bajar `reputation.woCompletedLate` de -2 a -1.
- Validar en playtest humano de Fase 3-4 con datos reales antes de cualquier ajuste.

---

## Lecciones aprendidas para futuras fases

1. **Svelte 5 + file:// no van juntos**. Cuando volvamos a Svelte (cuando Tauri sirva HTTP), funcionará. Hasta entonces, vanilla JS + esbuild IIFE es el path de preview rápido.
2. **No confiar en Write tool con archivos >300 líneas en mount Windows↔Linux**. El truco que funcionó: `cat > file << 'EOF'` via bash desde sandbox Linux.
3. **Paths con espacios en Windows + lld**: lld no quotea bien paths con espacios. Move físico + junction inversa es la solución limpia. Documentado en memoria.
4. **Tauri GNU sin admin**: Rust gnu + MinGW (winlibs) + lld + iconos generados con `tauri icon`. Receta probada, documentada en memoria.
5. **homelab-runner MCP se satura con muchos Start-Process consecutivos**. Workaround: lanzar uno, polear con comandos cortos, no acumular procesos en bg.
6. **Auto-playtest > playtest humano para Fase 2**. Detectó problemas de balance reales (rep cae -42 puntos) sin necesidad de organizar sesiones.

---

## Estado del repo al cierre

```
MRO tycoon/
├── CLAUDE.md, STATUS.md, TASKS.md, README.md
├── docs/GDD.md (de Fase 1), CIERRE_fase2.md (este)
├── unity_legacy/BRIEF_recovery.md
├── src/
│   ├── App.svelte                # Bloque D Svelte (NO usado, legacy mientras Tauri vuelve)
│   ├── main.ts, app.css, vite-env.d.ts
│   ├── lib/
│   │   ├── data/*.json           # workorders, airlines, balance
│   │   ├── i18n/{es,en}.json + index.ts
│   │   ├── sim/*.ts              # 10 módulos del core
│   │   ├── stores/{game,time}.ts # Svelte runes (legacy)
│   │   ├── types/*.ts            # tipos del dominio
│   │   ├── game.ts               # state global + advanceGame()
│   │   └── sim-all.ts            # re-export para bundle vanilla
├── src-tauri/                    # Rust shell (preparado, sin compilar todavía en Windows)
├── tests/
│   ├── smoke.mjs, sim_*.mjs (8), integration_7days.mjs, sim_save.mjs, auto_playtest.mjs
├── builds/
│   ├── bloque-{a,b,c}-*.html     # snapshots históricos
│   ├── bloque-d-vanilla.html     # entregable D
│   ├── bloque-e.html             # entregable E (final fase 2)
│   └── v0.1-vertical-slice/      # release fase 2
└── .scripts/                     # PowerShell helpers (install-mingw, launch-tauri-dev, gen-icon…)
```

**Build estable**: `builds/v0.1-vertical-slice/index.html` (= bloque-e.html con metadata).
**151/151 tests verdes** ejecutables con `node --experimental-strip-types tests/*.mjs`.

---

## Próximo: Fase 3 (nueva sesión, nuevo hilo Cowork)

Prioridad recomendada según GDD §5.2.A + auto-playtest:

**Núcleo aeronáutico (lo más importante para sostener USP)**:
1. **A/C/D checks** + FH/cycles del avión — sin esto, line maintenance se repite y aburre
2. **MEL/Deferrals** — decisión rica de gameplay
3. **EASA Part-145 compliance + auditorías** — endgame regulatorio
4. **Mercado laboral + candidatos** — escalar el pool de mecánicos

**Tycoon depth**:
5. **Turnos 24/7 + moral/fatiga** — eficiencia variable
6. **Training activo** — invertir en mecánicos
7. **Reputación segmentada por aerolínea**

**Balance tuning** (basado en findings auto-playtest):
8. Revisar `phaseDurationRatios.mainTask` y/o `slaMultiplier`
9. Considerar +1 certifier B1 inicial para reducir cuello de botella

**Tauri** (paralelo):
10. Cuando homelab-runner MCP esté operativo, retomar `tauri dev` desde `C:\Users\bongi\mrotycoon` (NO el path con espacios) y validar que la build llega al final
11. Una vez Tauri vivo: migrar UI de vanilla a Svelte 5 (el Svelte funcionará vía protocolo Tauri, no file://)
12. Implementar `SqliteBackend` que substituya `LocalStorageBackend` (misma interface)

Time-box Fase 3 sugerido: **3-4 semanas** (más complejo que Fase 2, con sistemas interdependientes).

---

**Generado**: 2026-05-14 · **Entregable**: `builds/v0.1-vertical-slice/index.html` (116 KB autocontained) · **Tests**: 151/151 ✓
