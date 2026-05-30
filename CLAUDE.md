# MRO Tycoon — Working Memory

Tycoon de Maintenance/Repair/Overhaul aeronáutico. **Producto comercial standalone** (target: Steam). Texto + paneles + mapa esquemático. Cero 3D, cero animaciones de aviones volando.

> Brief de cada fase en `docs/`. Estado vivo en `STATUS.md`. Backlog en `TASKS.md` (pendiente crear).

## Qué es esto y qué NO es
- ✅ Juego single-player, binario nativo Windows/Mac/Linux (vía Tauri o Godot)
- ✅ UI estilo control room: paneles, listas, dashboards, mapa esquemático SVG
- ✅ Distribución Steam, opcional Itch.io para demo
- ❌ NO es app OVD, NO vive en el UM890, NO depende de Tailscale
- ❌ NO usa Unity (el proyecto Unity viejo en `D:\Documents\MRO_Tycoon\` solo se mina para extraer diseño)
- ❌ NO tiene 3D, animaciones de vuelo, gráficos chulos. Sensación de control room, no de simulador

## Inspiración / referencia
- **Bus Manager 26**: estética UI (paneles oscuros, panel construcción de rutas)
- **Project Hospital**: gestión por turnos, profundidad sistémica, single-player premium
- **Software Inc.**: gestión de equipos+proyectos, sandbox-friendly
- **Production Line**: dashboards densos, KPIs interesantes

## Filosofía juego
Eres el **director de un MRO**: aceptas contratos de aerolíneas, asignas hangares y técnicos, gestionas inventario de piezas y certificaciones, decides qué turnaround te interesa. Emoción = dashboard + decisiones informadas, no espectáculo visual.

## Cómo trabajamos (heredado del homelab)
- **Castellano coloquial**, tono colega.
- Cada paso técnico con **"por qué"** corto antes del cómo.
- **Máximo 2-3 opciones** cuando haya decisión. Yo recomiendo una.
- **MVP-first**: vertical slice feo pero jugable antes que cualquier polish.
- **Time-box agresivo**: si se sale, recortar alcance, no fecha.
- **Anti-dispersión**: ideas brillantes que aparezcan a mitad → al Parking de `STATUS.md`.
- **No preguntar lo obvio**: si el plan está acordado, ejecutar y reportar.
- **GitHub auto-sync (regla a fuego, 2026-05-30)**: cada cierre de fase, cada `builds/v*.html` nuevo, cada cambio sustancial → push automático a `github.com/bongilou1-svg/mrotycoon` antes de cerrar la sesión. Sin pedirlo. Patrón vía skill `github-runner` (bundle → scp → push UM890). Si falla, avisar y NO seguir.

## Estructura del repo
```
MRO tycoon/
├── CLAUDE.md          # este fichero
├── STATUS.md          # estado por fase, alertas vivas, parking de ideas
├── TASKS.md           # backlog vivo (se creará en Fase 1)
├── docs/              # GDD, briefs de fase, decisiones de diseño
├── unity_legacy/      # brief de extracción del proyecto Unity viejo
├── src/               # código del juego (a partir de Fase 2)
└── builds/            # binarios de release (.exe Tauri o .pck Godot)
```

## Stack tech decidido (revisable en Fase 2)
- **HTML/CSS/JS + Tauri** para empaquetar a Steam (.exe ~5MB).
- SVG para mapa esquemático, Canvas para gráficos densos si hace falta.
- SQLite local vía Tauri para persistencia (saves).
- Cero servidor, cero backend, cero deps de red.
- Alternativa única considerada: Godot 4 (si en Fase 2 el prototipo HTML se queda corto).

## Plan en fases (time-boxed)
- **Fase 0 — Arqueología Unity** (1 sesión): extraer modelos+lore+datos del proyecto Unity viejo. ✅ cerrada 2026-05-13.
- **Fase 1 — GDD mínimo** (1 sesión): loop, sistemas, USP, win/lose. ✅ cerrada 2026-05-13.
- **Fase 2 — Vertical slice HTML+Tauri** (2 semanas MVP). ✅ cerrada 2026-05-14.
- **Fase 3 — Profundidad sistémica** (3-4 semanas). ✅ cerrada 2026-05-14.
- **Fase 4 — Viabilidad económica + 24/7** (17 días). ✅ cerrada 2026-05-15.
- **Fase 4.5 — Tier contratos + quick wins audit** (intra-sesión). ✅ cerrada 2026-05-15.
- **Fase 5 — partida en TRES sub-fases** (total 6-8 semanas, decidido 2026-05-15 tras saturación del Parking de STATUS.md con 3 sistemas grandes + 8 features F4.5 + capa visual):
  - **Fase 5A — Sistemas pendientes de sim** (3-4 semanas): día/noche real como eje temporal nuevo (pernocta → daily checks, A-check nocturno), TMA jefe (automatización progresiva tipo Project Hospital: lead foreman asigna mecánicos a WOs solo, jugador sube nivel de abstracción), progresión orgánica del MRO (4 etapas: line+pernocta → A en plataforma → 1 hangar → 3 posiciones), + las 8 features cortas del Parking F4.5 (flota variable por aerolínea, severance escalado por años, auto-handoff turnos, cobertura visual, etc). Disciplina Fase 3-4: sistema → tests → auto-playtest. Cero polish visual.
  - **Fase 5B — Capa visual + Tauri** (2-3 semanas): Tauri+SqliteBackend primero (G5-G7 ya no se difieren más, condicionan render path), luego GSAP encima de la UI vanilla (contadores tickando, paneles slide-in, toasts, barras suaves), mapa esquemático con SVG + GSAP `animateMotion`, click-to-detail visuals, dashboard KPIs con Chart.js.
  - **Fase 5C — Eventos aleatorios** (ejecutada 2026-05-15, repurposada del Pixi original): runway closure + Service Bulletin Airbus. **El slot Pixi original NO se ejecutó aquí** — se gastó en eventos porque daban más profundidad sistémica. Deuda visual quedó parqueada.
- **Pivot MRO línea pura** ✅ cerrado 2026-05-24 (sesión intra-F6). Arranque del juego cambia a "técnico local de aeropuerto regional": 1 sola aerolínea contratada (Iberia Express), oficina cap 4 mecs sin night, hangares Stage 3-4 gated hasta endgame (rep avg≥80 + balance≥1M + ≥3 contratos), schedule OVD real activo por default, vista pernocta nocturna + panel Schedule del día, competencia simple (rep≥70 → oferta auto, rep≤20 → rescisión). Save v9 backward compat v8/v7/v6. **940/940 tests verdes** (+67 net). Release: [`builds/v0.6-line-mro.html`](builds/v0.6-line-mro.html). Doc cierre: [`docs/CIERRE_pivot_line.md`](docs/CIERRE_pivot_line.md). Parking: balancing económico (auto-playtest 10×28d Δ-290k €, 4/10 game over por penalty SLA dominante — sesión de tuning posterior).
- **Fase 5D — Mapa Pixi v8 + OSM real OVD** ✅ cerrada 2026-05-24. Skin "f5d" con paleta CIC north-star del SVG aprobado, OSM real LEAS (pista 11/29 + 13 taxiways + apron + terminal + 16 parking_positions reales) + pan/zoom/WASD/minimapa + interacción clicks + scope creep schedule OVD (86 vuelos × 7 días + pool 24 matrículas con FC/FH plausibles + toggle UI). Save v8 backward compat v7. **873/873 tests verdes** (+70 net F5D). Release: [`builds/v0.5d-pixi-map.html`](builds/v0.5d-pixi-map.html). Doc cierre: [`docs/CIERRE_fase5d.md`](docs/CIERRE_fase5d.md). Plan histórico original abajo:
- **Fase 5D · plan original** (decidido 2026-05-15 tras playtest Dani, pivotado a OSM real 2026-05-24): pagaba la deuda visual que dejó 5C. **Pixi v8** (no SVG+GSAP — descartado: Dani pidió "lo más chulo posible" y el spec necesita filters WebGL). Aviones como puntos luminosos con halo+trail moviéndose entre hangares, hangares con estado visual (libre/trabajando/burst al cerrar check), líneas de actividad pulsantes tipo packets, partículas "data" schematic (no fuego), filter bloom global sutil, paleta día/noche conectada a state F5A, layout del mapa crece con etapa MRO (1→4 visualizado). Cero combustión, cero arcade — aesthetic CIC/NASA mission control. **Layout base acordado con Dani 2026-05-15** (validado con mockup Cowork): pista 27L con taxiway paralelo enlace discreto + 3 conectores → apron estructurado con **callecitas rectas / taxilanes** (verticales entre bloques de stands + **horizontal central como "calle auxiliar" — único acceso a la fila inferior de stands** + perimetral inferior, cero curvas): aviones desde pista bajan por callecita vertical, giran 90° en la auxiliar y acceden a stand de fila superior (norte) o fila inferior (sur). La furgo usa el mismo road network → **"Espacio hangares" como zona grande dashed ocupando todo el flanco IZQUIERDO del apron** (contiene los plots Stage 3 (500k €) y Stage 4 (1.5M €) con costes visibles, click sobre la zona o sobre plot individual abre modal compra build hangar de F5A) → **grid 2×3 de stands** ocupando centro/derecha del apron, marcados con códigos tipo airport real: fila superior 351/451/551, fila inferior 352/452/552, libre o ocupado por avión + sombra → oficina mecánicos en **esquina inferior-DERECHA** del apron, pequeña con ventanas iluminadas → **la furgo de mecánicos** (no mec andando) sale de la oficina y recorre las callecitas con **giros de 90°, líneas rectas estrictas**, hasta llegar al bloque del stand asignado (sustituye representación previa de mec andando trayecto curvo, justifica visualmente el tiempo de viaje del sim) (justifica el tiempo de viaje mecánico real ya simulado). Click sobre plot ghost → reusa el modal compra/build hangar existente de F5A. Click sobre stand → modal stand existente. 6 bloques P-α scaffolding / P-β mapa estático / P-γ aviones vivos / P-δ efectos / P-ε interacción / P-ζ polish+tests+cierre. **Estrategia P-β/γ/δ-min en un pase rico** (opción 1 decidida 2026-05-15, descartadas granular y polish): silueta + aviones simples + mecs en trayecto entran juntos en una iteración de ~2-3h. Partículas masivas + bloom WebGL + estado completo cierre check se quedan en sus bloques posteriores (P-δ completo + P-ζ). ANTES de Fase 6 porque los screenshots/trailer de Steam page se montan con este asset. Brief detallado en `docs/BRIEF_fase5d.md` (pendiente crear).
- **Fase 6 — Pre-Steam: página + demo** (2 semanas, después de 5D).
- **Fase 7 — Lanzamiento + soporte** (open-ended).

Total realista: **5-6 meses** dev a ritmo de side project intenso (revisado al alza por partición Fase 5).

## Decisiones cerradas (no reabrir sin razón nueva)
- **Stack**: HTML+Tauri (Godot reserva).
- **Visual**: esquemático, paneles, cero 3D.
- **Hosting**: ninguno. Standalone. Steam binario.
- **Source de verdad del legacy**: `D:\Documents\MRO_Tycoon\` (versión actual). Versiones viejas en `D:\Documents\old_versions\` ignoradas salvo necesidad puntual.
- **Nombre código**: MRO Tycoon (provisional, decidir nombre comercial en Fase 6).
- **Cada Fase = nuevo hilo Cowork** (proyecto renombrado por Dani por fase).

## Próximo paso inmediato
**Pivot MRO línea pura DONE (2026-05-24)** — Tras cerrar F5D (`v0.5d-pixi-map.html`, 873 tests), Dani pivotó el scope del juego: arranque como MRO de línea regional con 1 aerolínea (Iberia Express) y oficina mínima (4 mecs). Hangares Stage 3-4 desbloqueados solo en endgame. UI nueva: panel Schedule del día + vista pernocta nocturna. Competencia simple basada en rep segmentada existente. Bundle: `builds/v0.6-line-mro.html` (~1.4 MB), 940 tests verdes, save v9. Doc: `docs/CIERRE_pivot_line.md`. **Parking heroe**: balancing económico (penalty SLA -408k €/28d dominante, 4/10 game over en auto-playtest line — tunear baseFee/payment/penalty Iberia inicial en sesión siguiente). Próximo hilo: tuning + Fase 6 Pre-Steam page + demo.

**Modal Check + Contrato + X5 A en plataforma done (legacy nota)** (2026-05-15, extensión sesión). Click-to-detail completo en todas las entidades (avión + mecánico + check + contrato). Stage 2 ya tiene mecánica completa: además de stand extra, habilita A-check en LINE_STAND con eff×0.7 cuando BaseStand ocupado. WO descripciones MRO realistas con AMM refs + P/N reales. Save v7 backward compat. 803/803 tests verdes. Bundle final: [`builds/v0.5g-final.html`](builds/v0.5g-final.html) (271 KB). Tauri BLOQUEADO (toolchain).

**WO descripciones realistas done (legacy nota)** (2026-05-15). Reescritas las 100 descripciones de `data/workorders.json` con calidad técnica MRO real (AMM refs, P/N reales, torques, procedimientos breves). Refuerza USP autenticidad nicho. 803/803 tests verdes. Bundle: [`builds/v0.5e-wo-realista.html`](builds/v0.5e-wo-realista.html) (261 KB). Próximo hilo: **Fase 6 Pre-Steam page + demo + GDD comercial** (no requiere Tauri, bundle vanilla actual sirve para Itch.io/Steam Next Fest).

**Save v7 + Tauri BLOQUEADO (legacy nota)** (2026-05-15). Save v7 persiste 11 campos nuevos F5 con migración v6 backward compat. 803/803 tests verdes. Tauri sigue bloqueado por bug Rust 1.95 + GNU + proc-macros (mismo problema que Fase 2 pero ahora diagnosticado profundamente: yoke_derive/phf_macros not found). Doc `docs/TAURI_BLOQUEADO.md` con 3 workarounds. Próximo hilo: **Fase 6 Pre-Steam page + demo + GDD comercial** (no requiere Tauri, bundle vanilla actual sirve). Si en algún momento se instala MSVC toolchain en el Lenovo, `cd src-tauri && cargo run` debería arrancar Tauri sin cambios adicionales — todo el plumbing está preparado.

**Fase 5C eventos aleatorios DONE (legacy nota)** (2026-05-15, extensión post-5B). Runway closure + Service Bulletin Airbus. **780/780 tests verdes**. Release: [`builds/v0.5c-events.html`](builds/v0.5c-events.html) (253 KB). Próximo hilo: Tauri+SqliteBackend (F5B-β, deuda más antigua) o Fase 6 Steam page + demo + ≥500 wishlists.

**Fase 5B CERRADA parcial (legacy nota)** (2026-05-15, misma sesión que F4 + F4.5 + F5A): α (X7+Y3+V5) + δ (dashboard sparklines) + ε (click-to-detail) + γ (animaciones WAAPI/CSS). **744/744 tests verdes**. Release: [`builds/v0.5b-fase5b-final.html`](builds/v0.5b-fase5b-final.html) (247 KB). Doc cierre: [`docs/CIERRE_fase5b.md`](docs/CIERRE_fase5b.md). **Tauri+SqliteBackend (β) sigue en parking** — deuda G5-G7 de Fase 3, riesgo toolchain Windows ya conocido (lld/MinGW). Próximo hilo: Tauri primero (limpio, debug si falla) o Fase 6 Steam page si Tauri se atasca de nuevo.

**Fase 5B-α DONE (legacy nota)** (2026-05-15, sub-bloque tras F5A). UI quick wins del parking F5A aplicados: X7 panel Construcción + Y3 mini-gantt cobertura + V5 flag nightStarted. **744/744 tests verdes**. Bundle: [`builds/v0.5b-fase5b-alpha.html`](builds/v0.5b-fase5b-alpha.html) (231 KB). Próximo hilo: **F5B-β** — Tauri+SqliteBackend (deuda G5-G7 desde Fase 3) o capa visual GSAP/Chart.js (click-to-detail, dashboard KPIs).

**Fase 5A CERRADA** (2026-05-15 misma sesión que Fase 4 + 4.5). Sistemas sim pendientes entregados: día/noche real, TMA jefe + auto-handoff, progresión MRO 4 etapas, flota variable, severance escalado. **741/741 tests verdes** (+109 net). Auto-playtest 20×28d: Δbal **+66k €**, 0/20 game overs. Release: [`builds/v0.5a-fase5a-final.html`](builds/v0.5a-fase5a-final.html) (226 KB). Doc cierre: [`docs/CIERRE_fase5a.md`](docs/CIERRE_fase5a.md). Próximo hilo: validación visual + abrir **Fase 5B — Capa visual + Tauri** (Tauri+SqliteBackend primero, luego GSAP UI, Chart.js dashboards, click-to-detail, panel construcción UI X7, cobertura visual Y3, A-check nocturno V5).
