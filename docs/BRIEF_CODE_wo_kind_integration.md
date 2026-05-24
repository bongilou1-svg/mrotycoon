# BRIEF Code — Integración campo `kind: callout|mpd` en WO

> Para Claude Code (dev agent). Brief autocontenido. Fecha: 2026-05-24.

## Contexto

MRO Tycoon ahora distingue dos tipos de WO según origen:

- **`callout`** → reactivo. Defecto/fallo reportado por tripulación o detectado en walkaround. Genera AOG potencial si bloquea operación >3h (regla pendiente de aprobar, hoy threshold 6h). Es lo que llega "al teléfono" del MRO de línea cuando un avión aterriza con problema.
- **`mpd`** → preventivo. Tarea del Maintenance Planning Document del fabricante (interval por horas vuelo / ciclos / calendario). Daily check, A-check, oil servicing, inspecciones. Programable con antelación.

Esta distinción es **core** del modelo HH + Tiers (ver `STATUS.md § Parking · Modelo HH + Tiers`):
- Tier 1 contrato (line) → manda **callouts + daily checks mpd**
- Tier 2 → suma **A-check mpd packages**
- Tier 3 → suma **C-check mpd packages** (requiere hangar)
- Tier 4 → suma **D-check + mods mpd packages** (hangar mayor)

## Input

`src/lib/data/wo_classification.json` — 100 entries `{ id, kind, rationale }` ya clasificadas a mano por criterio AMM. Distribución:
- 51 callout / 49 mpd
- Por severity: callouts arrastran casi todos los Major+Critical (15+2), mpd casi todo Minor (39)

## Tarea concreta

### 1. Tipo

En `src/lib/types/workorder.ts` (o donde esté el type `WorkOrder` / `WorkOrderTemplate`):

```ts
export type WoKind = "callout" | "mpd";

export interface WorkOrderTemplate {
  // ... campos existentes
  kind: WoKind;
}
```

### 2. Loader

En el loader que parsea `workorders.json` (probablemente `src/lib/data/index.ts` o `src/lib/sim/woRegistry.ts`):
- Cargar adicionalmente `wo_classification.json`
- Hacer merge por `id`: `{ ...wo, kind: classification[wo.id].kind }`
- Test: assertEqual `Object.keys(merged).every(w => w.kind === "callout" || w.kind === "mpd")`

### 3. Generadores

Hoy hay (al menos) 2 generadores de WOs:
- `rollWoOnLanding` (probabilístico, ATA aleatorio)
- `rollDailyCheckWoOnOvernight` (genera 2-3 daily checks por overnight)

Ajustar:
- `rollWoOnLanding` → debe muestrear **solo** de WOs `kind: "callout"` (es reactivo por definición). Excluir mpd del pool.
- `rollDailyCheckWoOnOvernight` → debe muestrear **solo** de WOs `kind: "mpd"` ATA 12 (servicing) + 21 (pack) + 32 (gear inspection) + 26 (fire test) + 5 (visual) — los específicos del paquete daily check. Excluir callout.
- Si entra `rollACheckOnSchedule` (cuando Tier 2 esté en sim) → muestreo de mpd ATA chapters que entran en A-check (12, 21, 24, 25, 27, 28, 29, 30, 32, 33, 34, 35, 38, 49, 52).

### 4. Tests

`src/test/sim_wo_kind.mjs`:
- Cargar workorders + classification
- Assert `rollWoOnLanding` jamás devuelve `kind === "mpd"`
- Assert `rollDailyCheckWoOnOvernight` jamás devuelve `kind === "callout"`
- Smoke: 1000 rolls landing → distribución por kind 100/0
- Smoke: 100 overnights → cada uno solo mpd

Target: +10 tests.

### 5. Regla AOG (PENDIENTE DECISIÓN HUMANA)

⚠️ NO IMPLEMENTAR sin confirmación de Dani. Doc del brief:

Dani dice 2026-05-24 oral: "AOG es como no diferible que hay que reparar, y si es más de 3h de retraso en vuelo, AOG". Código actual tiene `AOG_DELAY_THRESHOLD_MIN = 360` (6h) — bajado de original tras balancing pass.

Opciones a presentar a Dani:
- (A) Aceptar **3h estricto** real-world. Penalty SLA dominaría (auto-playtest seguramente da bankruptcy). Requiere re-balancing fees.
- (B) Mantener **6h** del balancing. Realismo sacrificado, jugabilidad preservada.
- (C) **Variable por tier**: Tier 1 line = 6h tolerante / Tier 2-3 = 4h / Tier 4 premium = 3h.

Recomendación dev: opción **C** — añade textura sistémica + alinea con progresión de exigencia que un MRO premium maneja.

### 6. Save schema bump

Si el campo `kind` entra en `WorkOrderInstance` (no solo en template) → bump save v9 → v10 con migración: ningún WO instance histórico tiene kind, derivar del template al cargar.

Si `kind` queda solo en template (recomendado, no en instance) → no bump.

## NO scope

- ❌ NO portar a otros modelos (B737/ATR/E190) en este task — eso es `WO-DS-*` aparte en TASKS.md.
- ❌ NO refactor Tier (eso es HH-B).
- ❌ NO findings de daily check (eso es HH-C).

## Disciplina

1. Tipos + loader + tests primero (mecánica)
2. Generadores filtrados
3. Tests verde 100%
4. Auto-playtest 5×7d en lineMode — verificar que daily checks siguen apareciendo + callouts siguen apareciendo + balance no se rompe
5. Reportar diff y findings antes de bundle

## Output esperado

- `src/lib/types/workorder.ts` con `kind` añadido
- Loader actualizado en `src/lib/data/`
- Generadores filtrados
- `src/test/sim_wo_kind.mjs` nuevo
- Nota en STATUS.md Última actualización
- Si tocas balance → nota en Parking
