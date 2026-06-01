# Operaciones · Event Tracking — Rediseño (pasada 1)

**Design Claude → handoff para Dev Claude.** Maqueta navegable en `design/Operaciones.html`
(stack vanilla, mismo que el build → portable casi 1:1 a `build-vanilla.mjs`).

## Problema que ataca
Dolor reportado: *"no saber qué está pasando"*. El feed actual es una lista vertical
plana donde un **AOG** y un **daily check** rutinario se ven casi igual; el countdown de
SLA va como texto enterrado y el estado de asignación es texto gris sin peso.

## Decisiones de diseño
1. **Barra de situación "AHORA"** — 6 constantes vitales (En tierra · AOG · Sin asignar ·
   SLA en riesgo · En curso · Cerradas) + **frase-resumen autogenerada**. Cada tile filtra
   el feed. Es el foco que faltaba.
2. **Triaje por urgencia con raíles de color** — el feed se agrupa (AOG → en riesgo →
   en curso → programado → cerrado) en vez de cronológico plano. Raíl izquierdo + LED por
   estado. Severidad cromática: AOG/Critical rojo, Major ámbar, Minor azul.
3. **SLA como anillo** (conic-gradient) con minutos y color por urgencia → legible de un
   vistazo, no enterrado.
4. **Pill de asignación explícita**: `SIN ASIGNAR` (ámbar/rojo si crítico), `EQUIPO ·
   nombres`, `EN TRÁNSITO`, `DIFERIDO · MEL`. Con el hint de por qué (ej. "B2 en turno
   tarde · hora extra +2h").
5. **Cada tarjeta → cajón de detalle** (slide-in): WO completa con KPIs, ATA + nombre de
   capítulo, ref AMM, timeline de fases, equipo (chips clicables → mecánico), parts,
   tooling, y **enlaces a avión / operador / stand**. Acciones contextuales (Asignar /
   Diferir / Reparar ya).
6. **3 variantes conmutables** (no excluyentes — Dev puede elegir o dejarlas como toggle):
   - **A · Triaje** — agrupado por urgencia (recomendada como default).
   - **B · Telemetría** — filas densas mono, barra SLA horizontal, dots de fase. Vista
     "consola" para el hardcore que quiere todo a la vista.
   - **C · Tablero** — columnas Sin asignar / En curso / Cerrado (gestión kanban).

## Dirección visual (CIC / mission-control)
- Navy más profundo (`--bg:#090d15`) + textura de rejilla sutil + glow radial.
- Tipo: **Space Grotesk** (display/labels) + **JetBrains Mono** (datos/telemetría).
- LEDs con glow, raíles, acentos de señal. Densa pero con jerarquía clara.

## Tokens nuevos / cambiados (ver `design/ops.css` `:root`)
Conserva la familia del build (accent `#4da3ff`, success/warn/danger/base) y añade:
`--bg #090d15`, `--panel-solid #111925`, `--raised`, `--cyan #3ad6c5`, fondos `--*-bg`
para badges, y la rejilla de fondo. Drop-in sobre los tokens actuales.

## Qué NO es todavía (pasada 2+)
- Datos reales del sim (aquí es una "foto" curada con WOs/matrículas reales).
- Las fichas de avión/operador/stand al final de los enlaces (esta pasada abre WO).
- Animación de entrada de eventos nuevos, sonido, persistencia.

## Pendiente de Dani / Dev
- ¿Variante default? (recomiendo **A · Triaje**).
- ¿Llevamos este sistema de tarjetas/raíles también a Schedule y Oficina? (coherencia).

---

# Pasada 2 — Oficina + Schedule (mismo lenguaje CIC, navegable)

Ahora el prototipo es **multi-panel**: la nav cambia entre Operaciones / Oficina /
Schedule (los demás quedan como "próximamente"). Una sola historia coherente atraviesa
los tres paneles (Paula+Diego en el AOG PTU, Iván en el FCV+daily, Marta en tránsito al
beacon, Lucía en turno tarde; el Schedule muestra los vuelos de Volotea/Vueling que
generan ese trabajo).

## Oficina
- **Barra de situación** (Plantilla 5/5 · En trabajo · En tránsito · Disponibles · Moral
  media · €/sem) — mismo patrón que Operaciones.
- **Cobertura 24h rediseñada**: el gantt original era un "mar de rojo" ilegible (celdas
  0/1 minúsculas) que asustaba sin querer. Nuevo: 3 bandas (Mañana/Tarde/Noche) con conteo
  grande, marcador "ahora" y **leyenda que explica que la noche a 0 es normal** sin
  contrato de pernocta. Quita ansiedad falsa.
- **Mecánicos como tarjetas** (no tabla densa): avatar, estado (pill con LED), tarea
  actual, moral (barra), eficiencia, turno, salario. Click → **cajón de mecánico**
  (ratings, asignación con enlace a la WO, antigüedad/indemnización, acciones).
- Sub-tabs Equipo / Contratación / Management con el mismo segmented control.

## Schedule
- **Barra de situación** (Movimientos · ARR · DEP · Contratados · Leads · Próximo mov.)
  + frase que distingue **operadores contratados** (generan trabajo) de **leads**
  comerciales (rep para captarlos).
- **Timeline de vuelos**: hora, pill ARR/DEP, callsign, ruta, modelo, operador con punto
  de color de marca, estado (En tierra / Cerrado / Programado / Lead sin habilitación).
  Pasados atenuados, próximo resaltado, pernoctas con 🌙. Click → **cajón de vuelo**
  (estado comercial, enlace a aeronave y al trabajo asociado).

## Conectividad cruzada (lo nuevo importante)
Los cajones enlazan entre sí: mecánico → su WO; vuelo → su aeronave y su WO; WO → avión /
operador / stand. Es el "todo lleva al detalle" que pediste, ahora atravesando paneles.

## Nota técnica para Dev
- El cajón de detalle es `position:fixed` y se abre con `transform` inline desde JS
  (`renderDrawer`) para no depender de la cascada `.drawer.open` (daba problemas de timing
  en algunos entornos). Al portar, mantener ese patrón o equivalente robusto.
- Ficheros: `ops.css` + `ops-panels.css` (estilos), `ops-data.js` + `ops-data2.js`
  (datos foto), `ops-app.js` (Operaciones + router + drawer) + `ops-panels.js` (Oficina +
  Schedule + sus cajones). Todo vanilla → portable casi 1:1 a `build-vanilla.mjs`.

## Siguiente sugerido
- **Overlay del mapa OSM** (lo marcaste): aplicar este lenguaje al panel info del mapa +
  click en stand/avión → cajón de detalle (reusar los cajones ya hechos).

---

# Pasada 3 — Mapa (panel "Mapa", overlay universal sobre OSM real)

Diseñado **encima de la captura real de OVD** (realzada para que el apron se lea — eso es
también la recomendación de contraste para Dev en el render Pixi). **Universal**: todo lo
de encima (HUD, marcadores, leyenda, minimapa) es independiente del aeropuerto; solo cambia
la geometría OSM de fondo y las coords de stands (que en real salen de `parking_positions`).

- **Marcadores de stand** con código (351/451/551 · 352/452/552) + LED de estado
  (AOG rojo pulsante / Sin asignar ámbar / Trabajando azul / Cerrando check cian / Libre) +
  matrícula del ocupante. Click → **ficha de stand** (ocupación → avión, trabajo → WO,
  acciones). Es la pieza que faltaba: *de un vistazo ves qué stand trabaja y en qué*.
- **Aviones taxiando** como tokens legibles (matrícula + raya de color de aerolínea +
  destino). Click → su WO/ficha. **Furgo de mecánicos** con su técnico → ficha del mecánico.
- **HUD overlay clicable** (top-left, recogido): resumen AOG + En tierra + Próximas
  salidas/llegadas; cada fila enlaza a su detalle.
- **Leyenda** de estados, **controles** (zoom + día/noche) y **minimapa** rediseñado con
  puntos de stand por estado.
- **Misma ficha de detalle** que en los paneles → consistencia total mapa ↔ Operaciones ↔
  Oficina ↔ Schedule.

## Nota para Dev (mapa)
- En la maqueta los stands/aviones se posicionan en **% sobre la imagen**. Al portar a Pixi,
  esas coords salen de las `parking_positions` reales del OSM (`ovd.json` etc.) → el overlay
  HTML/CSS se queda igual; solo cambia de dónde vienen las coordenadas y la geometría base.
- **Contraste**: el OSM actual va casi invisible (líneas azul oscuro sobre navy). Subir
  brillo/contraste de la geometría (pista destacada, taxiways legibles, apron con relleno
  sutil) es parte del trabajo — la imagen base de la maqueta muestra el nivel objetivo.
- Render mapa vive en `render/pixi-driver.ts`; el overlay (HUD/marcadores/leyenda) puede ir
  como capa DOM encima del canvas Pixi (no hace falta meterlo en WebGL).

## Estado del prototipo (3 pasadas)
Un solo archivo navegable: **Mapa · Operaciones · Oficina · Schedule**, con fichas de
detalle conectadas entre todos. Ficheros: `ops.css` + `ops-panels.css` + `ops-map.css`,
`ops-data.js` + `ops-data2.js`, `ops-app.js` (router + drawer) + `ops-panels.js` (oficina+
schedule) + `ops-map.js` (mapa), `assets/ovd-map.png`.
