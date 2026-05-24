# Fase 4 — Baseline diagnóstico (2026-05-15)

> Salida del Bloque O. Captura del estado económico al abrir Fase 4, antes de cualquier tuning.

## Setup del playtest

- `tests/auto_playtest.mjs` enriquecido (Bloque O1) con desglose por TransactionType + evolución semanal.
- **5 seeds × 28 días ingame**, 1 contrato activo, sin acciones de jugador (no acepta ofertas, no contrata, no difiere, no entrena).
- Refleja "peor escenario inicial": el jugador acepta el contrato de arranque y deja correr.

## Tabla por seed

| seed | día | balance | Δbal | rep μ | WOs c/late/f/dif | A/C/D done | game over |
|---:|---:|---:|---:|---:|:---:|---:|---|
| 1   | 29 | 313.056 € | **+63.056 €** | 63 | 158/27/0/0 | 2 | no |
| 7   | 29 | -18.024 € | **-268.024 €** | 61 | 122/40/0/0 | 2 | **bankruptcy** |
| 42  | 29 | 236.998 € | -13.002 € | 60 | 69/14/0/0 | 1 | no |
| 100 | 29 | 293.788 € | +43.788 € | 63 | 133/23/0/0 | 1 | no |
| 333 | 29 | 179.188 € | -70.812 € | 63 | 80/13/0/0 | 2 | no |

**Δbalance medio: −48.999 €** · **Game overs: 1/5** · **Rep media: 62**

## Desglose económico (media 5 seeds)

| Categoría | € medio/28d | % del total |
|---|---:|---:|
| ✅ workOrderPayment | +137.925 | 60% ingresos |
| ✅ contractBaseFee | +49.909 | 22% ingresos |
| ✅ maintenanceCheckFee | +19.400 | 8% ingresos |
| ❌ **penalty (SLA late)** | **-174.433** | **68% gastos** |
| ❌ weeklyFixedCost | -48.000 | 19% gastos |
| ❌ salary | -33.800 | 13% gastos |
| **Σ = Δbalance** | **-48.999** | |

## Diagnóstico

**Hallazgo principal**: el penalty SLA es **el 68% de los gastos** y solo en seed 7 (la única que muere) llega a **-268k €**. No es ruido — es la fuga estructural.

**Math reverse**: 174k € / 23 WOs late ≈ **7.6k €/late WO**. A 110 €/min penalty medio, son ~**69 minutos late por WO**. Para WOs de ~45 min de duración, 69 min late = **2.5× su duración**. Las WOs no llegan tarde por un poco — llegan tardísimo.

**Causa probable** (a verificar con instrumentación más profunda si hace falta):
1. **Congestión de stands**: 3 line stands × 70% landing → WO = WOs entrando más rápido que 7 mecánicos pueden cerrar.
2. **Cobertura horaria**: 7 mecánicos default `morning` cubren solo 8 de 24h, pero los landings entran 24h. WOs nocturnas sin equipo.
3. **Ratio penalty/payment 3:1**: penalty 80-140 €/min vs payment 28-42 €/min. Una hora de retraso en una WO de una hora cuesta más que el ingreso de la WO entera.

**Evolución semanal** confirma: el balance medio baja monotónicamente sem1 264k → sem2 220k → sem3 200k → sem4 201k. Hemorragia constante, no spike.

## Palancas candidatas a tunear (Bloque P)

Orden de impacto esperado, top → bottom:

1. **Reducir ratio penalty/payment** — bajar `penaltyPerLateMinute` (rango contract roll: 80-140) a 40-70 €/min, o sea ~1.5× el payment en vez de 3×. Esto recorta el penalty 40-50% sin cambiar gameplay.
2. **Subir `slaMultiplier`** 1.20 → 1.50 — más holgura, menos WOs late. Riesgo: trivializa la presión SLA.
3. **Cobertura mixta default** — 4 morning / 2 afternoon / 1 night al `createGame`. Reduce congestión nocturna. Coordinado con Bloque Q activado.
4. **Subir `paymentPerWOMinute`** 28-42 → 36-52 — más colchón de ingresos. Riesgo: trivializa la economía si combinado con #1.

**Estrategia recomendada**: combinar #1 (50% menos penalty) + #3 (cobertura mixta) en iteración 1. Si llega al target (+50k €), parar. Si no, añadir #2 o #4 en iteración 2.

**No tocar** (de momento): salaries (están bien calibrados), maintenance check fees (Bloque H ya validado), startingBalance (250k € da margen para 5 semanas malas).

## Próximo

Bloque P iteración 1: aplicar palanca #1 + #3 y re-correr 20 seeds × 28d.

---

## Resultado Bloque P (2026-05-15)

### Iter 1 — bajar penalty 80-140 → 40-70 €/min

5 seeds × 28d: Δbal medio **+38k €** (vs baseline -49k). Falsa alarma de target alcanzado.

20 seeds × 28d: Δbal medio **-13k €** — las 5 seeds tuvieron suerte. La varianza es enorme. Penalty bajó solo a -153k (vs -174k baseline) porque la tasa de retraso seguía siendo 25% (27/108 WOs late). La palanca aislada no es suficiente.

### Iter 2 — añadir slaMultiplier 1.20 → 1.50

20 seeds × 28d: Δbal medio **+4k €**. Las WOs late cayeron 75% (27 → 11) pero el penalty solo bajó 11% (-153k → -136k). **Patología descubierta**: con SLA más holgado, las WOs que SÍ se quedan late lo hacen MUCHO más tarde — pasan de 67 min/late a 227 min/late. La cola FIFO sin priority scheduling penaliza a las atrasadas. Esto es un hallazgo de diseño, no un bug — el sistema funciona, pero el balance compensa apretando otras palancas.

### Iter 3 — subir baseFee +20% (10-18k → 12-22k) y payment +20% (28-42 → 34-50 €/min)

20 seeds × 28d: Δbal medio **+46k €** · 0/20 game overs · rep media 62.8 · 14/20 seeds positivos. Rango -136k a +243k (varianza alta pero distribución sana).

### Veredicto Bloque P

A 4k del target medio +50k. Decisión consciente de NO sobre-tunear ahora: el Bloque Q (shift gating productivo) bajará el throughput diario y necesitará una palanca económica adicional. La reservo para Q. Si tras activar gating Δbal cae bajo +20k, subir paymentPerWOMinute un 10% más allí.

**Cambios persistidos**:
- `src/lib/sim/contracts.ts`: rangos baseFee 12-22k, payment 34-50, penalty 40-70.
- `src/lib/data/balance.json`: slaMultiplier 1.50.
- `tests/smoke.mjs`: assertion de slaMultiplier actualizada.

**Suite tests**: 524/524 verde.

