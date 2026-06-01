# HANDOFF — Rediseño UI MRO Tycoon (Operaciones · Oficina · Schedule)

**De:** Design Claude (proyecto de diseño)
**Para:** Dev Claude (Cowork desktop · repo `bongilou1-svg/mrotycoon`, rama `f5d-map-pixi-osm`)
**Estado:** maqueta aprobada por Dani · lista para portar a `.scripts/build-vanilla.mjs`

---

## 0. TL;DR para Dev
Hay un **mockup navegable en vanilla JS** (mismo stack que el bundle) que rediseña 3
paneles con un lenguaje "CIC / mission-control": **Operaciones · Event Tracking**,
**Oficina** y **Schedule**. Objetivo de Dani: *"no saber qué está pasando"* → ahora hay
foco de situación, jerarquía por urgencia, y **cada item lleva a su ficha de detalle**
(cajón lateral) con navegación cruzada. Tu trabajo: trasladar CSS + estructura + los
render functions a `build-vanilla.mjs`, **conectándolos al `game` real** (aquí los datos
son una "foto" curada).

---

## 1. Qué hay en el paquete
```
handoff/
├─ HANDOFF.md            ← esto
├─ design_tokens.json    ← tokens nuevos/cambiados (drop-in sobre el :root actual)
├─ prototype/            ← la maqueta navegable (abrir Operaciones.html)
│  ├─ Operaciones.html
│  ├─ ops.css            ← sistema visual CIC (HUD, nav, sitbar, feed, drawer)
│  ├─ ops-panels.css     ← estilos Oficina + Schedule
│  ├─ ops-data.js        ← foto de eventos (WOs/matrículas/aerolíneas reales)
│  ├─ ops-data2.js       ← foto de plantilla + schedule del día
│  ├─ ops-app.js         ← Operaciones + router de paneles + drawer
│  ├─ ops-panels.js      ← Oficina + Schedule + sus cajones
│  └─ notes_operaciones.md
└─ screenshots/          ← referencia visual de cada vista
```

## 2. Mapa maqueta → código real
| Maqueta (función) | Real (`build-vanilla.mjs`) | Acción |
|---|---|---|
| `feedTriage/feedTele/feedBoard` + `evCard` | `renderHangarEventTracking` / `buildEventFeed` | Reemplazar el render del feed; conservar `buildEventFeed` como fuente de datos y mapear sus campos a `evCard`. |
| `renderSitbar` (barra AHORA) | *(nuevo)* | Añadir arriba de Operaciones; contar sobre `game` (AOG, sin asignar, SLA<45, en curso). |
| `renderOfficePanel` / `officeTeam` / `renderCoverage` | `renderOffice` / `renderCoverageGantt` | Sustituir las `card-mini` por tiles + tarjetas de mecánico; rehacer el gantt con bandas legibles. |
| `renderSchedulePanel` | `renderSchedule` | Sustituir la `<table>` por el timeline de filas + barra de situación. |
| `renderMechDrawer` | `renderMechanicDetailModal` | Reusar datos del modal existente; cambiar a layout de cajón. |
| `renderFlightDrawer` | *(nuevo, datos de `getFlightsForGameDay`)* | Click en fila de schedule → cajón. |
| `renderDrawer` (event/WO) | `renderModal` + modales WO/check/contrato | Migrar modales a cajón lateral o mantener modal con este estilo. |
| `renderMapPanel` / `mapMarkers` / `renderStandDrawer` | `renderMap` / `updateMapInfoPanel` + `pixi-driver.ts` | Overlay DOM (HUD + marcadores de stand/avión + leyenda + minimapa) sobre el canvas Pixi; coords de stands desde `parking_positions` del OSM. |

## 3. Tokens
- `design_tokens.json` lista los valores. **Es drop-in**: conserva `--accent #4da3ff` y los
  semánticos; profundiza `--bg` a `#090d15`, añade `--panel-solid`, `--cyan`, fondos `--*-bg`
  y la rejilla de fondo. Fuentes: **Space Grotesk** (display) + **JetBrains Mono** (datos).

## 4. Patrones a respetar al portar
1. **Datos en mono, labels en display+mayúsculas.** Es lo que da el aire CIC.
2. **Raíl izquierdo de color por estado/severidad** en cada tarjeta/fila.
3. **SLA como anillo** (Operaciones) y **barra** (Telemetría) — color por urgencia.
4. **Pill de asignación explícita** (SIN ASIGNAR / EQUIPO·nombres / EN TRÁNSITO / DIFERIDO),
   con el *motivo* cuando no hay técnico.
5. **Cobertura 24h legible**: bandas Mañana/Tarde/Noche con conteo grande + leyenda
   "noche a 0 es normal sin contrato de pernocta". (No volver al gantt de celdas 0/1.)
6. **Cajón de detalle robusto** (ver §5).
7. **Navegación cruzada**: mecánico→su WO, vuelo→avión+WO, WO→avión/operador/stand.

## 5. ⚠️ Nota técnica crítica — el cajón (drawer)
El cajón es `position:fixed; right:0; transform:translateX(102%)` (cerrado) → `none` (abierto).
En algunos entornos la **transición CSS de `transform` se congela** en el frame inicial y el
panel no entra. Solución aplicada en `renderDrawer` (NO quitarla al portar): commit
instantáneo con la transición desactivada + reflow forzado:
```js
// abrir:
dw.classList.add("open");
dw.style.transition = "none";
dw.style.transform  = "none";
void dw.offsetWidth;            // fuerza reflow → aplica ya
// cerrar:
dw.classList.remove("open");
dw.style.transition = "none";
dw.style.transform  = "translateX(102%)";
void dw.offsetWidth;
```

## 6. Lo que NO incluye la maqueta (lo pones tú al integrar)
- Conexión a `game` real (aquí los datos son foto curada coherente).
- Las fichas finales de avión/operador/stand al final de algunos enlaces (esta pasada
  abre WO, mecánico y vuelo).
- Animación de entrada de eventos nuevos / sonido / persistencia.
- **Mapa OSM**: ✅ diseñado (panel "Mapa" en el prototipo). Pendiente: que las coords de
  stands salgan de `parking_positions` reales y subir el contraste de la geometría OSM.

## 7. Sugerencia de orden de implementación
1. Tokens + fuentes (base para todo).
2. Operaciones · Event Tracking (es el núcleo y el de mayor impacto).
3. Cajón de detalle (drawer) reutilizable.
4. Oficina (tiles + cobertura + tarjetas + cajón mecánico).
5. Schedule (timeline + cajón vuelo).
6. Re-correr tests + `npm run bundle`.

## 8. Decisiones abiertas para Dani
- Variante default de Operaciones → recomendación: **A · Triaje** (dejar B/C como toggle).
- ¿Migramos los modales existentes (WO/check/contrato) a cajón lateral, o se quedan como
  modal con este estilo?
