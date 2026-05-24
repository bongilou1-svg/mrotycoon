# A32x Maintenance Programs — Research Doc

> Investigación pública para validar/corregir los placeholders de mantenimiento del juego.
> Fecha: 2026-05-15. Autor: agente investigación. Status: borrador para uso interno (game design).
> **Aviso**: muchos números reales son rangos no publicados oficialmente; Aircraft Commerce, IATA MCTF
> e IBA publican síntesis pero los detalles finos viven en MPDs propietarios. Donde la fuente es
> "consensus" significa promedio de varios artículos públicos cruzados, no dato auditado.

---

## 1. Resumen ejecutivo

La familia A320 (ceo + neo) usa un programa de mantenimiento **MSG-3** definido por el Airbus
Maintenance Planning Document (MPD) y el Maintenance Review Board Report (MRBR) aprobado por
EASA/FAA. Las airlines lo adaptan vía su Aircraft Maintenance Programme (AMP) propio aprobado
por su autoridad. **Las "letter checks" clásicas (A/B/C/D) ya no son la realidad operativa** de la
mayoría de operadores grandes: la industria ha migrado a **phase/equalised checks**, especialmente
en short-haul. El término "D check" no aparece en el MRBR moderno del A320 — la heavy
structural se hace dentro de C-checks elevados (C8, C12) con tareas distribuidas.

Hallazgos clave:

- **A check**: extendido a **750 FH / 750 FC / 120 días** (desde 600 FH/750 FC/100 días tras escalation 2009). Programa optimizado puede llegar a **1000 FH / 1000 FC / 6 meses**.
- **C check**: **20-24 meses / 6000 FH** (extendido desde 18 meses / 4500 FH). Algunos operadores 7500 FH.
- **"D check"**: ya no existe como bloque único; reemplazado por **C8 / C12 heavy** cada 6 y 12 años.
- **Engine shop visit**: CFM56-5B y V2500-A5 entre **0.5 M$ y 3 M$** dependiendo del workscope (hospital → full performance restoration con LLP stack).
- **Landing gear overhaul**: **120 meses / 20 000 cycles**, ~**425-475 k$**.
- **CPFH total**: rango público **600-1 200 $/FH** para A320ceo según IATA MCTF (FY2013 baseline ~1167 $/FH all-in maintenance).
- **NEO**: durabilidad inicial **peor que ceo**; el escándalo PW1100G powder-metal ha disparado los costes de mantenimiento neo. LEAP-1A también tuvo issues (HPT blades, fuel nozzles) pero menos severos.

---

## 2. Tabla de intervalos A/B/C/D (MRBR Airbus + escalations)

| Check | Variante | Intervalo (FH) | Intervalo (FC) | Intervalo (cal) | Man-hours | Downtime | Notas |
|-------|----------|---------------:|---------------:|----------------:|----------:|---------:|-------|
| Transit / Daily | A319/A320/A321 (todas) | — | — | 24-48 h | 1-3 | minutos | Walk-around, fluidos, defectos abiertos |
| Weekly check | A320 family | — | — | 7 días | 5-10 | 2-4 h | Inspección visual, sistemas |
| **A check** | A320ceo (post-2009 escalation) | 750 | 750 | 4 meses (120 días) | 50-150 | overnight (8-24 h) | Subdividido en A1..A8 (cada A8 ≈ 6000 FH añade tareas mayores) |
| **A check** | A320 "optimised programme" Airbus | 1000 | 1000 | 6 meses | 50-150 | overnight | Solo si reliability data lo justifica |
| **A check** | A321 / A319 | similar 750 FH | 750 | 4 meses | A321 algo más MH | overnight | A321 ligeramente mayor por tamaño |
| **C check** | A320ceo (estándar) | 6000 | — | 20-24 meses | 3000-6000 | 10-21 días | Subdividido en C1..C12; tareas heavy aparecen en C8/C12 |
| **C check (heavy / "ex-D")** | A320 (C8) | ~36 000 | — | ~6 años | ~4000-5000 | 14-21 días | Estructurales nivel medio |
| **C check (heavy / "ex-D")** | A320 (C12) | ~72 000 | — | ~12 años | ~6000-12 000 | 21-45 días | Antes del 2009 esto era el **D check**; ahora absorbido en C12. Costes >2 M€ |
| Structural inspection 1 | A320 family | — | — | 5-6 años | incluido en C heavy | concurrent | Tasks SSI |
| Structural inspection 2 | A320 family | — | — | 9-12 años | incluido en C heavy | concurrent | Tasks SSI severos |

Fuentes: Airbus MRBR pública vía Aircraft Commerce Issue 111 (2017), MRO Management 2017
(intervalo escalation 2009), AeroTime "alphabet of maintenance", AviationWeek "Airbus
Extends Intervals", Wikipedia *Aircraft maintenance checks*, SofemaOnline blog phase vs block.

### Notas importantes
- **El MRBR Airbus actual NO tiene "D check"**. La heavy structural maintenance se hace en C-checks
  multimúltiplos (C6, C8, C12) o como "Intermediate Layover" / "Major Layover" según workpackaging
  del operador. Aircraft Commerce 2017 (artículo 111_MTCE_A.pdf) lo describe explícitamente.
- **A321 tiene C-check ~10-15 % mayor man-hours** que A320 (más fuselaje, más cabin tasks). A319 ~5-10 % menor.
- **Calendar limit suele dominar** sobre FH en operadores LCC con utilización <8 FH/día.

---

## 3. Phase-check vs block-check (industria moderna)

### Definiciones
- **Block check**: el avión sale de servicio durante todo el C-check completo (10-21 días). Modelo clásico.
- **Phased check**: el C-check se trocea en paquetes de varios días (p.ej. 4 paquetes de 4 días). Mejor disponibilidad.
- **Equalised**: tareas C distribuidas entre A-checks overnight repetitivos. Cero ground time extendido fuera de heavy structural.

### Quién usa qué (públicamente conocido)
| Filosofía | Ejemplos típicos | Por qué |
|-----------|------------------|---------|
| Block C | Charter, leasing returns, fleets pequeñas | Más simple, menos handovers, encaja con MRO 3rd party |
| Phased C | Mainline carriers medianos (Iberia, AF, etc.) | Compromiso disponibilidad/coste |
| Equalised | LCCs muy puros (Ryanair-style), some legacy short-haul | Maximiza utilización; requiere control reliability data muy bueno |

Aircraft Commerce 2017 confirma: un operador A320 corre "20-month C cycle distribuyendo 6-year tasks
entre 60- y 80-month checks" para minimizar AOG; otro "24-month C ahorrando un heavy shop visit cada
6 años". **Ninguna fórmula es universal**.

### Implicación para el juego
La elección de filosofía debería ser una **decisión estratégica del jugador** si MRO Tycoon quiere
profundidad: phase = más slots cortos / más rotación / más overhead admin; block = pocos slots largos
con factura grande puntual. Buen sistema dynamics.

---

## 4. Engine maintenance

### CFM56-5B (A320ceo, dominante en flota legacy)

| Métrica | Valor | Fuente |
|---------|------|--------|
| LLP life cold section (fan, booster) | 30 000 FC | Leeham News / IBA |
| LLP life HPC | 25 000 FC | Leeham News |
| LLP life HPT (hot section) | 20 000 FC (post Tech Insertion); pre-TI hasta 15 000 | Leeham / Aircraft Commerce ISSUE 28 |
| First-run shop visit | típicamente 18 000-25 000 FH on-wing inicial; subsiguientes 12-18 k FH | Aircraft Commerce, IBA |
| Hot Section Inspection (HSI) | "off-wing only"; no hay HSI on-wing programado, todo se hace en shop visit | CFM service docs |
| Shop visit cost — performance restoration | 1.5-3.0 M$ (sin LLP stack) | Leeham, IBA |
| Shop visit cost — full overhaul + LLP core stack | 3.0-5.0 M$ | Leeham (~3 M$ parts+labor + ~1.6 M$ core LLP stack) |
| Hospital visit (mini-shop) | 0.3-0.8 M$ | AAR, Pem-Air |
| LLP stack list price (full set) | ~3.0-3.8 M$ | IBA / Aircraft Commerce |

### V2500-A5 (alternativa A320ceo, IAE)

| Métrica | Valor | Fuente |
|---------|------|--------|
| LLPs total | 25 partes | Aircraft Commerce ISSUE 56 |
| LLP life (todas) | 20 000 EFC | Aircraft Commerce |
| LLP stack list price | ~3.84 M$ | Aircraft Commerce |
| Shop visit cost típico | 2-4 M$ workscope full | Aircraft Commerce, IBA |
| First-run on-wing | 15 000-22 000 FH típico | IBA |

### LEAP-1A (A320neo, CFM)

| Métrica | Valor | Fuente |
|---------|------|--------|
| First shop visit target | "on-wing parity con CFM56" → 20 000+ FH inicialmente; en práctica primeros 8000-12 000 FH por durabilidad | CFM press, FlightGlobal |
| Issues conocidos | HPT blades, fuel nozzles (fix retrofit en curso 2024-2025) | FlightGlobal, Aviation Week |
| Shop visit cost estimado | 2-4 M$ (datos sparse, mercado MRO inmaduro) | Aviation Week MRO 2024 |
| LLP life | similar a CFM56 (~25-30 k FC objetivo) | CFM brochures |

### PW1100G GTF (A320neo, Pratt)

| Métrica | Valor | Fuente |
|---------|------|--------|
| First shop visit target original | 20 000+ FH | Pratt brochures |
| Realidad actual (2023-2026) | **forced removals 5000-7000 FC** por powder-metal AD | FAA AD, Cranky Flier, Aviation Week |
| Shop visit duración | **250-300 días** por backlog y inspección destructiva | Cranky Flier |
| Shop visit cost extra issue | **6-7 B$ total fleet impact** (Pratt+RTX) | RTX investor update |
| Aircraft on ground por issue | promedio 350 AOG durante 2024; pico ~650 a inicio 2024 | FlightGlobal |
| Inspección HPT/HPC repetitive | cada 2800-3800 FC | FAA AD 2024 |

---

## 5. Landing gear

| Métrica | Valor | Fuente |
|---------|------|--------|
| Overhaul interval | 120 meses / 20 000 FC (lo que llegue antes) | aerokool.com, Aircraft Commerce ISSUE 63 |
| Overhaul cost | 425-475 k$ (set completo: NLG + 2× MLG) | aerokool.com |
| % del coste total maintenance | 2-3 % | aerokool.com |
| Downtime overhaul | 60-90 días (off-wing, gear nuevo o pool); aircraft puede operar con gear de pool | Aircraft Commerce |

Implementación juego: el LG overhaul se solapa con un C-heavy. Operadores grandes mantienen pool
de landing gears para minimizar AOG. Coste 425-475 k$ está documentado para A320-200 ceo.

---

## 6. CPFH benchmarks (cost per flight hour) — IATA MCTF / públicos

> IATA Maintenance Cost Task Force (MCTF) publica resúmenes anuales (Public version del MCX Report).
> El último accesible vía web search referencia FY2013 baseline; 2024 cycle 28 airlines contribuyen pero
> el PDF público de IATA no fue accesible desde este entorno (allowlist).

### A320ceo — desglose típico (orden de magnitud, USD)

| Componente | $/FH | % del total |
|-----------|----:|----:|
| **Total maintenance CPFH** | 1100-1300 | 100 % |
| Engine maintenance | 350-550 | 35-40 % |
| Component maintenance (rotables) | 200-300 | 20-25 % |
| Heavy airframe maintenance | 100-180 | 10-15 % |
| Line maintenance | 80-150 | 8-12 % |
| Other (modifications, mat'l, overhead) | 100-200 | resto |

### A320neo — primeros años en servicio
- Iniciamente más bajo (avión nuevo, en garantía) ~600-800 $/FH
- Pico inflado por GTF issue: airlines neo PW han reportado CPFH 1500+ $/FH en 2023-2024
- Estabilización esperada hacia ~900-1100 $/FH cuando madure el shop visit market

### Por flight cycle
- Maintenance: ~3000 $/FC promedio
- Mucho más sensible al ciclo en short-haul (más cycles relativo a FH = más line/A check load)

Fuentes: IATA MCTF FY2013 (vía referencias secundarias), Aviation Week benchmark 2017, Quora/industry
estimates. Datos directos IATA detrás de paywall o restricted.

---

## 7. CEO vs NEO — diferencias en mantenimiento

### Donde el NEO ahorra
- Compartibilidad con ceo en sistemas, tren, aviónica → bajo coste retraining/spares
- Diseño moderno permite intervalos mayores en componentes (ya algunos C tasks de fuselaje extendidos)

### Donde el NEO está peor (estado real 2024-2026)
1. **PW1100G powder-metal AD**: removals cada 5000-7000 FC en lugar de los 20 000+ esperados.
   Shop visit duración 250-300 días. Fleet impact 6-7 B$. Customer comp 80 % del total.
2. **LEAP-1A durability**: HPT blade issues, fuel nozzle redesign retrofit. Mejor que GTF pero
   peor que CFM56-5B en madurez. CFM trabaja en parity de tiempo on-wing pero lleva años de retraso.
3. **Spare engine pool insuficiente** en mercado neo → AOG por falta de motor de reemplazo más alto que ceo.
4. **MRO capacity LEAP/GTF**: industrialización tardía. StandardAero, Lufthansa Technik, MTU añadiendo
   capacidad pero TATs largos en 2024-2026.

### Implicación neo para el juego
Si el juego permite elegir engine type, el GTF debería tener **mayor riesgo / menor coste fuel teórico /
volatility**. CFM56-5B es la opción "boring but reliable". LEAP-1A "intermedio". V2500-A5 "legacy fiable
con LLP stack caro".

---

## 8. MSG-3 framework — overview

**Maintenance Steering Group 3** (publicado por A4A, antes ATA) es la metodología bottom-up estándar
para definir el initial maintenance program de cualquier aeronave certificada moderna (A320 family,
A330, A350, 737NG/MAX, 787, etc.).

Tres áreas de análisis:
1. **Systems & Powerplant** — identificación de Maintenance Significant Items (MSI), análisis de fallo
   funcional, decision tree → tasks (lubrication, operational check, inspection, restoration, discard).
2. **Structures** — Structural Significant Items (SSI), Principal Structural Elements (PSE),
   damage tolerance, environmental damage, accidental damage.
3. **Zonal** — inspección por zonas físicas, captura interferences entre sistemas.

Output del MSG-3 process → **MRBR** (Maintenance Review Board Report) → cada operador hereda en su
**AMP** (Aircraft Maintenance Programme).

Filosofía clave MSG-3: solo se programa una task si **previene** un failure mode con consecuencias
relevantes. Reemplaza el viejo MSG-2 basado en hard-time overhaul de todo. Resultado: muchos
componentes pasaron de "overhaul cada X horas" a "on-condition".

Implicación juego: si quieres profundidad sistémica, el "componente falla y disparas un reactive
task" es realista. La idea de "todo se cambia cada X horas" es MSG-2, ya no la realidad.

---

## 9. Validación balance del juego

Placeholders actuales del juego (de CLAUDE.md / código):

| Check | Juego (actual) | Realidad pública | Veredicto |
|-------|----------------|------------------|-----------|
| **A check** | 600 FH / 200 FC / 1 día / 12 k€ | 750 FH / 750 FC / 4 meses / 50-150 MH / overnight (~8-24 h) / 8-30 k€ | **Cycles MUY bajos** (200 vs 750). FH cerca pero conservador. Coste OK rango bajo. Calendar gating ausente. |
| **C check** | 7500 FH / 5000 FC / 14 días / 110 k€ | 6000 FH / — / 20-24 meses / 3000-6000 MH / 10-21 días / **0.3-0.8 M€** estándar | FH ligero arriba. **Coste muy bajo** (110 k€ vs 300-800 k€ realidad). Downtime OK. |
| **D check** | 25 000 FH / 16 000 FC / 60 días / 550 k€ | "D check" como tal **no existe** en MRBR moderno; equivalente C12 cada 12 años / 6000-12 000 MH / 21-45 días / **2-5 M€** | **Coste muy bajo** (550 k€ vs 2-5 M€). Concept puede mantenerse como abstracción de heavy structural pero rebrand recomendado. |

### Recomendaciones de ajuste

1. **A check**:
   - Subir FC interval a **600-750** (de 200 → 600). El 200 está fuera de la realidad por 3-4×.
   - Mantener FH en 600 (ligeramente conservador OK para juego).
   - Añadir **calendar trigger 4 meses** (importante para low-utilization scenarios).
   - Coste OK 12 k€; podría ampliar rango 8-25 k€.
   - Man-hours: ~50-100 MH si quieres modelar staffing; tu downtime "1 día" está bien.

2. **C check**:
   - FH 6000-7500 OK (mantener).
   - **Subir coste base** a **300-500 k€ típico**, rango **150 k€ (light C) – 1 M€ (C8 heavy)**.
   - Downtime 14 días razonable; modelar variabilidad 7-21 días según workscope.
   - Considerar **subdividir en C-light vs C-heavy** (C1..C7 vs C8/C12) — más realismo y decisión jugador.

3. **D check** (o renombrar a **"Heavy Structural" / "C12"**):
   - Subir coste a **2-5 M€** rango.
   - Downtime 30-60 días bien.
   - FH 25 000 / 16 000 FC bien para equivaler 12 años.
   - **Considerar rename**: en industria moderna ya no se llama D. "C12 Heavy" o "12-year structural"
     suena más auténtico y diferencia tu juego de tycoons que copian Wikipedia 1990.

4. **Añadir si quieres profundidad**:
   - Phase-check option (light C distribuido en A-checks vs block C).
   - Engine shop visit como evento separado (1.5-3 M€, 60-90 días, mucho impact).
   - Landing gear overhaul (425-475 k€, 60-90 días, 12 años).
   - Engine type matters: GTF risk modifier, CFM56 reliable baseline, LEAP intermediate.

5. **CPFH como métrica de score**: si tu jugador-as-MRO-director cobra al cliente CPFH-based, valores
   reales 1100-1300 $/FH para A320ceo; jugador eficiente puede entregar a margen 15-25 % (industria MRO típica).

### Dónde la data es más débil
- **Costes EUR/USD por check de fuente única**: nadie publica precio "oficial" por C check; todo son
  rangos y benchmarks indirectos (Aircraft Commerce, IBA estimates, AviationWeek). Variabilidad real
  ±50 % entre MROs (low-cost asiáticos vs LHT premium).
- **NEO maturity data**: aún en formación, datos cambiando trimestre a trimestre 2024-2026.
- **IATA MCX detalle**: PDF público no accesible desde este entorno (host bloqueado); las cifras
  CPFH usadas vienen de referencias secundarias confirmando FY2013-FY2019 baselines.
- **Man-hours por check exactos**: rangos públicos amplios (3000-6000 para C). Cifra específica es
  función de operador, edad avión, MRO, workscope.

---

## 10. Fuentes

- Aircraft Commerce, "Each member of the A320 family has its maintenance" Issue 111, 2017 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/Maintenance/2017/111_MTCE_A.pdf
- Aircraft Commerce, "A320 family maintenance analysis & budget" Issue 44 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/A320%20FAMILY/ISSUE%2044-A320%20MTCE.pdf
- Aircraft Commerce, "1st & 2nd base airframe check cost analysis" Issue 75 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2011/ISSUE75_MTCE_A.pdf
- Aircraft Commerce, "Comparison CFM56-5B/-7 V2500" Issue 28 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/Maintenance/2003/ISSUE%2028-MTCE-B.pdf
- Aircraft Commerce, "V2500 maintenance analysis & budget" Issue 56 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/V2500/ISSUE%2056-V2500%20MTCE.pdf
- Aircraft Commerce, "Landing gear overhaul suppliers survey" Issue 63 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2009/ISSUE63_MTCE_B.pdf
- AviationWeek, "Airbus Extends Intervals for A320 Maintenance Checks" — https://aviationweek.com/airbus-extends-intervals-a320-maintenance-checks
- AviationWeek, "Pratt Leans On MRO Network To Offset PW1100G Problems" — https://aviationweek.com/mro/aircraft-propulsion/pratt-leans-mro-network-offset-pw1100g-problems
- MRO Management, "Extension Lead" March 2017 (escalation A→750 FH) — https://www.ajw-group.com/storage/downloads/1488390880_extension_lead_-_mro_management.pdf
- AeroTime, "The alphabet of aircraft maintenance" — https://www.aerotime.aero/articles/28347-aircraft-maintenance-abcd-checks
- Wikipedia, "Aircraft maintenance checks" — https://en.wikipedia.org/wiki/Aircraft_maintenance_checks
- SKYbrary, "Maintenance Steering Group-3 (MSG-3)" — https://skybrary.aero/articles/maintenance-steering-group-3-msg-3
- SofemaOnline, "Block, Phased, Equalized check philosophy" — https://www.sofemaonline.com/blog/entry/comparison-of-aircraft-maintenance-block-phased-and-equalized-check-philosophy-1
- Leeham News, "Bjorn's Corner: Aircraft engine maintenance Part 1" — https://leehamnews.com/2017/03/03/bjorns-corner-aircraft-engines-maintenance-part-1/
- Leeham News, "Maintenance Program for the A320/A321" Part 48 — https://leehamnews.com/2024/03/01/bjorn-s-corner-new-aircraft-technologies-part-48-maintenance-program-for-the-a320-a321/
- IBA Group, "What to Look for When Valuing an Engine" 2018 — https://www.iba.aero/resources/articles/what-to-look-for-when-valuing-an-engine-march-2018/
- IBA Group, "Engine values & lease rates September 2024" — https://www.iba.aero/resources/articles/engine-values-lease-rates-september-2024/
- ISTAT / Shannon Ackert, "Aircraft Maintenance Implications During Uncertainty" — https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf
- Aircraft Monitor, "Keeping Score: Engine SVR analysis" — https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/keeping_score_analysis_of_an_engine%E2%80%99s_svr____v1.pdf
- Cranky Flier, "The Problem with Pratt & Whitney's PW1100G Engines" — https://crankyflier.com/2023/09/26/the-problem-with-pratt-whitneys-pw1100g-engines-on-the-a320neo-family/
- FlightGlobal, "P&W GTF issue will ground hundreds of A320neos through 2026" — https://www.flightglobal.com/engines/pandw-geared-turbofan-issue-will-ground-hundreds-of-a320neos-through-2026/154885.article
- FlightGlobal, "New Leap turbofans getting fuel nozzle fix and modified blades" — https://www.flightglobal.com/engines/new-leap-turbofans-are-getting-fuel-nozzle-fix-and-modified-blades-as-part-of-durability-effort-ge-aerospace/157327.article
- aerokool.com, "Aircraft Overhaul Intervals: A Breakdown by Type and Usage" — https://aerokool.com/aircraft-overhaul-intervals-a-breakdown-by-type-and-usage/
- Hindawi, Saltoglu et al. "Aircraft Scheduled Airframe Maintenance and Downtime Integrated Cost Model" 2016 — https://www.hindawi.com/journals/aor/2016/2576825/
- IATA MCX FY2024 Public Report (referenciado, PDF no fetcheable desde este entorno) — https://www.iata.org/contentassets/bf8ca67c8bcd4358b3d004b0d6d0916f/fy2024-mcx-report_public.pdf

---

*Fin del documento. ~340 líneas.*
