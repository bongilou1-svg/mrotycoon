# BRIEF Fase 3 — Profundidad sistémica

> Brief vivo de Fase 3. Time-box **27 días** (~4 semanas). Arranca 2026-05-14, cierre objetivo ~2026-06-10.
>
> **Premisa**: Fase 2 dejó un vertical slice jugable pero "plano" — todas las WOs son line maintenance idénticas, una sola decisión real (a quién asignar), reputación global, sin compliance, sin escalabilidad del equipo. Fase 3 mete la profundidad que justifica el USP "MRO tycoon auténtico" y los sistemas tycoon que dan ritmo de gestión.

---

## Objetivo de la fase

Pasar de "loop demostrable" a "loop con tradeoffs reales". Al cierre de Fase 3, una sesión de 1h debería incluir:

1. **Decisiones aeronáuticas no triviales** — diferir una WO menor para liberar stand, planificar un C-check semana que viene, tener un AOG vs un base maintenance peleando por mecánicos.
2. **Decisiones tycoon no triviales** — contratar un B1 V2500 caro porque entra un contrato A321neo, abrir turno de noche aunque mate la moral, invertir en training de un helper porque escasean B1.
3. **Consecuencias reales** — una mala racha de deferrals dispara una auditoría que penaliza; descuidar una aerolínea premium hace que deje de ofertar; reputación segmentada permite jugar nichos.

---

## Sistemas a meter (por bloque)

### Bloque G — Saneamiento (días 1-3)
**Por qué primero**: el auto-playtest cerró Fase 2 con reputación cayendo -42 puntos en 14 días y 0/5 game over solo porque el umbral es bajo. Meter más volumen (A/C/D, MEL forzosos) amplifica el problema si no tuneamos antes. Además aprovechamos para retomar Tauri (MCP homelab-runner debería haberse recuperado del timeout de cierre).

**Decisiones de diseño**:
- Balance tuning conservador — preferir un par de ajustes pequeños en deltas y ratios sobre rediseños grandes. Validar con la herramienta que ya tenemos (`auto_playtest.mjs`).
- Tauri: si en 1 día no abre ventana → seguir en vanilla, decisión de Fase 5 retomarlo. No bloquea Fase 3.
- Sqlite backend: implementar solo si Tauri vivo. Si no, dejar `LocalStorageBackend` con TODO marcado.

**Salida**: balance que aguanta 14 días sin caer rep <30, Tauri vivo o claramente bloqueado y documentado.

### Bloque H — A/C/D Checks (días 4-9) 🔴
**Por qué crítico**: es el sistema más diferencial frente a otros tycoons. Cualquiera puede hacer "asigna mecánico a tarea". MRO Tycoon necesita FH/cycles, scheduled maintenance y la presión de base stands ocupados días/semanas para sentir el dominio.

**Decisiones de diseño**:
- **FH y cycles** son las dos métricas autenticidad. Cada landing suma 1 cycle y 3-5 FH según destino simulado.
- **Triggers por modelo**: A check cada 600 FH o 200 cycles (lo que llegue primero), C cada 7500 FH o 5000 cycles, D cada 25000 FH o 12000 cycles. Números basados en realidad A320 family.
- **Tipos de stand**: 3 line + 1 base inicial. Base stand bloqueado días enteros para C/D check. Esto crea la "decisión de calendario" — un C check ocupa 14 días tu único base stand, ¿lo aceptas la semana que viene o lo retrasas?
- **Tarifa por check**: A ~10-20k, C ~80-150k, D ~500k. Gran ingreso pero gran inmovilización.
- **No mezclar UI con line**: las WOs de check viven en el panel Hangar tab "Base maintenance" (no se mezclan con line WOs).

**Riesgo**: complejidad balanceo. Si no atinas las tarifas, A/C/D o aplasta económicamente al jugador o trivializa el resto. Mitigación: validar con auto-playtest del Bloque N.

### Bloque I — MEL/Deferrals (días 10-13) 🔴
**Por qué crítico**: el MEL (Minimum Equipment List) es la palanca de decisión más rica que hay en MRO. "Esto se puede volar 10 días sin reparar, pero después o lo reparas o el avión queda grounded". Sin esto el jugador solo tiene velocidad como variable; con MEL tiene priorización real.

**Decisiones de diseño**:
- **Categorías reales**: A=3 días, B=10 días, C=120 días, D=indefinido. ~30% de WO templates son deferrable (mezclar B+C+D, con A raro), el resto son no-deferrable.
- **Decisión visible**: el modal de WO recibe "Reparar ahora" + "Diferir hasta {fecha}". El segundo libera stand y pasa la WO a `Deferred`.
- **Consecuencias del abuso**: deferrals que vencen sin reparar disparan reparación forzosa (penaliza -5 rep) o son detectados en auditoría Part-145 (multa). El sistema crea incentivo a abusar; el contrapeso es el Bloque J.
- **Tracking visible**: panel/tab "Deferrals activos" con countdowns. Ver en un golpe de vista cuánto bordeas el reglamento.

**Riesgo**: que el jugador difiera todo y trivialice el line maintenance. Mitigación: hacer auditorías regulares (Bloque J) penalizando ratio deferrals/total WOs.

### Bloque J — Part-145 (días 14-16)
**Por qué**: meta-sistema regulatorio que da contrapeso al MEL. EASA Part-145 es la certificación obligatoria para un MRO en Europa. Perderla = game over efectivo.

**Decisiones de diseño**:
- **Score 0-100** visible en HUD. Inicial 80.
- **Auditorías cada 60-90 días** ingame (no calendario real). Notificación 3 días antes para corregir.
- **Algoritmo de auditoría** revisa: deferrals abusados (>50% expirados sin reparar), WOs failed sin justificar, tiempo medio cierre WO, ratio AOG no resueltos a tiempo. Score se mueve ±10 según findings.
- **Tramos de penalty**:
  - Score >70: nada
  - Score 30-70: multa 5-25k €
  - Score <30: multa 50k € + suspensión 1 contrato
  - Score <10: game over (revocación certificación)
- **Recovery posible**: el jugador puede recuperar score con buenos meses (sin auditoría inmediata, pero acumula crédito).

**Riesgo**: que se sienta "castigo aleatorio" más que "consecuencia coherente". Mitigación: las notificaciones previas + el panel score con findings desglosados ayudan a que el jugador vea qué corregir.

### Bloque K — Mercado laboral (días 17-19)
**Por qué**: con A/C/D + MEL + line activos, 7 mecánicos no escalan. El jugador necesita la palanca de contratar (y la consecuencia de pagar salarios crecientes).

**Decisiones de diseño**:
- **Candidatos generados** con perfil realista: más helpers que B2 (escasos), B1 con type rating CFM56 común vs V2500 raro.
- **Salario esperado** correlaciona con experiencia. Negociar no incluido en MVP — si lo contratas, pagas su precio.
- **Training pasivo** lento: un helper que trabaje en WOs CFM56 durante 90 días gana el rating gratis. Premia continuidad.
- **Despido** posible siempre, con coste = 2 meses salario (severance). Free choice.
- **Refresco de candidatos** cada 7 días ingame: pool de 5-10 visible.

**Riesgo**: que sea solo botón "Hire/Fire" sin profundidad. Mitigación: las personalidades stub (3 traits aleatorios) en MVP, profundidad real en Fase 4 si el sistema funciona.

### Bloque L — Turnos + moral + training activo (días 20-22)
**Por qué**: lo último del cluster tycoon depth. Operar 24/7 vs 8h y gestionar fatiga genera decisiones presupuestarias y de RRHH. Training activo da palanca de inversión.

**Decisiones de diseño**:
- **3 turnos**: morning (08-16), afternoon (16-00), night (00-08) + off. Mecánico tiene 1 turno asignado.
- **Salario nocturno × 1.5** — abrir turno noche cuesta más pero permite cobertura.
- **Moral 0-100**: cae por turnos consecutivos, WOs failed; sube por descanso, completar WO crítica, training, salario alto.
- **Eficiencia = base × moralMultiplier**: 0.5× con moral 0, 1.2× con moral 100.
- **Training activo**: 5k € + 7 días → +1 type rating o subir base (helper→B1, B1→B2). 1 training simultáneo por mecánico máx.

**Riesgo**: demasiada información en panel Mecánicos. Mitigación: columnas colapsables, vista por defecto compacta.

### Bloque M — Reputación segmentada (días 23-24)
**Por qué**: con varias aerolíneas, una rep global es plana. Segmentada permite "cuidar contrato premium aunque la otra aerolínea me odie" y abre estrategias de nicho.

**Decisiones de diseño**:
- **Por aerolínea, inicial 50**. Deltas aplican solo a la aerolínea del evento.
- **HUD**: mostrar rep media + tarjeta mini expandible por aerolínea.
- **Ofertas de contrato** ponderan rep esa aerolínea. Si rep < 20 → deja de ofertar.
- **Game over por rep**: todas las aerolíneas < 10 (no solo global < 10).
- **Migración save**: campo `reputation` ahora object. Backward compat al cargar saves v1.

**Riesgo**: complejidad UI. Mitigación: HUD mantiene rep media para vista rápida, detalle en click.

### Bloque N — Auto-playtest + cierre (días 25-27)
**Por qué**: el auto-playtest funcionó tan bien en Fase 2 (detectó el rep -42 sin sesión humana) que lo reusamos. Sin él, no validamos el balance integrado.

**Decisiones de diseño**:
- **5 seeds × 28 días** simulados (no solo 14, para ver el ciclo completo A check + auditoría + contratación).
- **Variables nuevas a trackear**: deferrals abusados, score Part-145, A/B/C checks completados, contrataciones, moral media.
- **Triage**: P0 (game over inesperado, bug bloqueante) → fix día 26. Resto a backlog Fase 4.
- **Release**: `builds/v0.2-fase3-depth.html` vanilla. Si Tauri vivo, también `.exe`.
- **Cierre**: doc `docs/CIERRE_fase3.md` con findings + transición a Fase 4.

---

## Criterios de cierre Fase 3

Para considerar Fase 3 cerrada:

- ✅ Loop con A/C/D checks demostrable en sesión real (aviones acumulan FH+cycles, llegan a A check, ocupan base stand, completan, facturan).
- ✅ MEL operativo con UI clara (puedo diferir, ver lista, sufrir consecuencias).
- ✅ Part-145 score visible y auditorías recurrentes con consecuencias (multa o suspensión).
- ✅ Mercado laboral funcional (puedo contratar, despedir, ver candidatos refrescarse).
- ✅ Auto-playtest 5 seeds × 28 días sin game over por bug y con balance razonable (rep no cae <30 en >2 seeds).
- ✅ Build vanilla v0.2 publicado en `builds/` y doc cierre escrito.
- ✅ Tests Fase 3 verdes (target acumulado >200 con los nuevos sistemas).

Bonus (no requeridos para cierre, pero ideales):
- 🎁 Tauri vivo con UI Svelte 5 servida via custom protocol.
- 🎁 SqliteBackend reemplazando LocalStorageBackend.
- 🎁 Turnos + moral + training activo (todo el Bloque L).
- 🎁 Reputación segmentada (todo el Bloque M).

---

## Riesgos vivos (a vigilar durante la fase)

1. **Scope creep aeronáutico** — A/C/D + MEL + Part-145 son sistemas con mil detalles reales. Anclar al MVP: triggers por tabla, no por algoritmo realista; categorías MEL solo 4, no las 100+ reales; auditoría Part-145 solo 4-5 checks, no el reglamento entero.
2. **Realismo asfixia accesibilidad** — el GDD avisa: tycoon nicho corre riesgo de ser ininteligible para no-aviadores. Mitigación: tooltips en cada acrónimo (MEL, FH, AOG, ATA), notificaciones que expliquen consecuencia ("✈️ Auditoría detectó 3 deferrals abusados. Score -8. Si baja de 30, multa.").
3. **Tauri no arranca** — segundo round con la toolchain GNU. Si vuelve a fallar, **no bloquear Fase 3**. Documentar el bloqueo y avanzar en vanilla. Path comercial sigue siendo Tauri (Fase 5-6) pero no en línea crítica de Fase 3.
4. **Auto-playtest no detecta lo que un humano sí** — sistemas más complejos crean dinámicas emergentes. Si Bloque N detecta nada raro pero el juego "se siente mal", reservar sesión de playtest humano (Dani + 1-2 personas) antes de cerrar fase.
5. **homelab-runner MCP** — se cayó al cierre Fase 2. Si vuelve a saturar con Start-Process en background, retroceder a comandos cortos uno a uno.

---

## Inspiración / referencia (recordatorio)

- **Project Hospital**: gestión por turnos + moral + training. Mirar cómo presenta turnos + fatiga sin abrumar.
- **Production Line**: dashboards densos. Inspiración para el panel Hangar con tabs Line/Base.
- **Bus Manager 26**: panel de construcción de rutas → equivalente "configurador de contratos premium" en Fase 4.
- **Software Inc.**: training de empleados con progresión visible. Mismo patrón aplicable a mecánicos.

---

## Estado del repo al abrir Fase 3

```
mrotycoon/
├── CLAUDE.md, STATUS.md, TASKS.md (Fase 3), README.md
├── docs/
│   ├── GDD.md                    # Fase 1
│   ├── CIERRE_fase2.md           # Fase 2 cerrada
│   └── BRIEF_fase3.md            # este
├── unity_legacy/BRIEF_recovery.md
├── src/lib/{sim,data,i18n,types,stores,assets,ui}/
├── src-tauri/                    # Rust shell, sin compilar todavía en Windows
├── tests/                        # 151/151 verdes al cierre Fase 2
├── builds/
│   ├── v0.1-vertical-slice/      # release Fase 2
│   ├── bloque-{a..e}-*.html      # snapshots históricos
└── .scripts/                     # PowerShell helpers (launch-tauri-dev, install-mingw, gen-icon, show-cargo-errors, …)
```

**Path de trabajo confirmado**: `C:\Users\bongi\mrotycoon\` (sin espacios — junction inversa preserva `C:\Users\bongi\Documents\Claude\Projects\MRO tycoon` para tooling Cowork).

**Toolchain Lenovo**: Rust 1.95 GNU + MinGW-w64 16.1 ucrt + lld (workaround "export ordinal too large"), todo user-scope sin admin.

---

**Generado**: 2026-05-14 · **Cerrar Fase 3 objetivo**: ~2026-06-10 · **Próximo**: Bloque G1 — diagnóstico balance baseline con auto_playtest.mjs.
