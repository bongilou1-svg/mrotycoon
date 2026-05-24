# B737 NG / MAX Maintenance Programs — Research Doc

> Investigación pública para validar/corregir los placeholders de mantenimiento del juego.
> Espejo del mismo análisis A32x (`A32x_maintenance.md`).
> Fecha: 2026-05-15. Autor: agente investigación. Status: borrador para uso interno (game design).
> **Aviso**: muchos números reales son rangos no publicados oficialmente; Aircraft Commerce, IATA MCTF
> e IBA publican síntesis pero los detalles finos viven en MPDs propietarios. Donde la fuente es
> "consensus" significa promedio de varios artículos públicos cruzados, no dato auditado.
> **Aviso B737 MAX**: la flota MAX entró en servicio 2017 pero el grounding 2019-2020 retrasó
> acumulación de horas. **Datos de heavy mx (P24/P48) reales en MAX casi inexistentes en 2026** —
> primeros P24 esperados 2025-2027, P48 hacia 2027-2030.

---

## 1. Resumen ejecutivo

La familia B737 (NG = -600/-700/-800/-900/-900ER, MAX = MAX 7/8/9/10/8200) usa un programa de
mantenimiento **MSG-3** definido por el **Boeing Maintenance Planning Document (MPD)** y el
Maintenance Review Board Report (MRBR) aprobado por FAA/EASA. Las airlines lo adaptan vía su
Aircraft Maintenance Programme (AMP) propio aprobado por su autoridad. **A diferencia del Airbus
A320 moderno, Boeing aún usa "letter checks" (A/C/D) reconocibles** en marketing técnico —
internamente las llama P1/P8/P48 pero la equivalencia A=P1, C=P8, D=P48 es directa.

Hallazgos clave:

- **A check (P1)**: **500 FH** (vs 750 Airbus). Algunos operadores extienden a 600 FH. Overnight (~8-24h).
- **C check (P8)**: **4000 FH / 18 meses** primer base check del ciclo (vs Airbus 6000 FH / 24 meses).
- **Ciclo Boeing equalised**: P8 / P16 / P24 / P32 / P40 / P48 = 6 base checks en 24 000 FH / 9 años.
- **D check (P48)**: **24 000 FH / 9 años**, **20-30k man-hours**, **2-5 M€**. Boeing aún tiene "D" como bloque definido (Airbus lo eliminó del MRBR moderno).
- **Engine**: monopolio CFM. NG → **CFM56-7B**, MAX → **LEAP-1B**. Sin opción Pratt o IAE como en A320.
- **CFM56-7B**: shop visit típico **2-3 M€** performance restoration, **3-4.5 M€** full overhaul con LLP. Récord on-wing 50 000 FH.
- **LEAP-1B**: durability issues HPT blade similar a -1A, kit retrofit certificación H1 2026 (más tarde que -1A Dec 2024).
- **Landing gear**: **120 meses / 20 000 cycles**, ~**380-500 k€**. Casi idéntico a A320.
- **CPFH total**: **1100-1300 USD/FH** para -800 (orden empate con A320).

---

## 2. Tabla de intervalos A/B/C/D (Boeing MPD + MSG-3)

| Check | Variante | Intervalo (FH) | Intervalo (cal) | Man-hours | Downtime | Notas |
|-------|----------|---------------:|----------------:|----------:|---------:|-------|
| Transit / Daily | B737 todas | — | 24-48 h | 1-3 | minutos | Walk-around, fluidos, defectos abiertos |
| Weekly / Service | B737 todas | — | 7 días | 5-10 | 2-4 h | Inspección visual, sistemas |
| **A check (P1)** | B737-800 NG | 500 | 4 meses | 50-200 | overnight (8-24h) | Boeing P1; algunos operadores 600 FH |
| **A check (P1)** | B737-700 NG | 500 | 4 meses | 45-180 | overnight | ~5-10% menor MH por fuselaje más corto |
| **A check (P1)** | B737-900ER NG | 500 | 4 meses | 55-220 | overnight | ~10-15% mayor MH por fuselaje stretched |
| **A check (P1)** | B737 MAX 8 | 500 | 4 meses | 50-200 | overnight | Mismo programa NG + MSI-22-11 (MCAS check 6000h post-grounding) |
| **C check (P8)** | B737-800 NG | 4000 | 18 meses | 2000-6000 | 7-21 días | Boeing P8 = 1er base check ciclo. Algunos operadores 3600 FH / 15 meses |
| **C check (P8)** | B737-700 NG | 4000 | 18 meses | 1800-5500 | 7-20 días | -5/-10% vs -800 |
| **C check (P8)** | B737-900ER NG | 4000 | 18 meses | 2200-6500 | 8-22 días | +10/+15% vs -800 |
| **C check (P8)** | B737 MAX 8 | 4000 | 18 meses | 2000-6000 | 7-21 días | Estimated; data real escasa, mayoría flota MAX no llega aún |
| **C intermedio (P24)** | B737-800 NG | 12000 | 54 meses (~4.5 años) | 4000-10000 | 14-30 días | Estructural intermedio. Equivalente C8 Airbus |
| **D check (P48)** | B737-800 NG | 24000 | 108 meses (9 años) | 20000-30000 | 30-60 días | Boeing P48. Estructural completo, full strip, pintura |
| **D check (P48)** | B737 MAX 8 | 24000 | 108 meses | 20000-30000 | 30-60 días | PROYECTADO. Primeros P48 reales no esperados hasta 2027-2030 |

Fuentes: b737.org.uk/heavymaint, SP's Aviation "Technicalities of Boeing 737 Maintenance",
Aircraft Commerce Issue 108 (2016) "B737NG Maintenance Analysis & Budget", AviationWeek
"Returning MAX To Service Requires Maintenance Changes", AeroTime "alphabet of maintenance",
Wikipedia *Aircraft maintenance checks*, Skylink "B737 C-Check costs", aviationtitans.com
"Heavy Maintenance Cost 2026".

### Notas importantes
- **El MRBR Boeing 737 SÍ tiene "D check" definido** como P48. Diferencia con Airbus que eliminó D del MRBR moderno y distribuyó en C8/C12.
- **B737 P48 es más concentrado en MH** (20-30k) que C12 Airbus (6-12k). Boeing prefiere el evento-bloque, Airbus el equalised. Implicación operativa: Boeing tiene un AOG event mucho más grande cada 9 años, Airbus distribuye.
- **MAX hereda íntegro el MPD NG** + adiciones post-grounding (MCAS check, autopilot disconnect verifications). Hot-section LEAP-1B tasks añadidas pero airframe casi identical.

---

## 3. Phase-check vs block-check en Boeing 737

### Definiciones
- **Block check (P-style Boeing default)**: el avión sale de servicio durante todo el P-check completo (10-30 días). Modelo Boeing canónico — más concentrado que Airbus.
- **Phased check**: el P8 se trocea en paquetes de varios días. Adoptado por Ryanair, easyJet y otros operadores LCC con utilización alta.
- **Equalised**: tareas P-check distribuidas entre A-checks overnight repetitivos. Maximiza disponibilidad pero requiere reliability data muy buena.

### Particularidades Boeing vs Airbus
Boeing fragmenta el ciclo total en **6 base checks** (P8, P16, P24, P32, P40, P48) cada 4000 FH.
Airbus fragmenta en **12 C-checks** (C1..C12) cada ~2000 FH equivalentes.

**Implicación juego**: Boeing ofrece menos slots de heavy intermedio pero con más scope cada uno.
Airbus pequeños y muchos. La elección de filosofía operacional (block vs phased vs equalised)
debería ser una **decisión estratégica del jugador** independiente del fabricante:

| Filosofía | Ejemplos típicos | Por qué |
|-----------|------------------|---------|
| Block P (Boeing default) | Charter, leasing returns, fleets pequeñas | Más simple, menos handovers, encaja con MRO 3rd party |
| Phased P | Ryanair, Norwegian, mainline med | Compromiso disponibilidad/coste |
| Equalised | LCCs muy puros, Southwest-style | Maximiza utilización; control reliability data muy bueno |

---

## 4. Engine maintenance

### CFM56-7B (B737 NG, dominante en flota legacy)

| Métrica | Valor | Fuente |
|---------|------|--------|
| LLPs total | 18 partes | Aircraft Commerce ISSUE 58 |
| LLP life cold section (fan, booster) | 30 000 FC | GE Aerospace |
| LLP life HPC | 25 000 FC | Leeham News |
| LLP life HPT (hot section) | 20 000 FC | Aircraft Commerce ISSUE 28 |
| First-run shop visit | 25 000-30 000 FH on-wing inicial; **récord 50 000 FH** | GE Aerospace, CFM press |
| Mature shop visit interval | 12 000-22 000 FH | Aircraft Commerce, IBA |
| Hot Section Inspection (HSI) | "off-wing only"; no HSI on-wing programado | CFM service docs |
| Shop visit cost — performance restoration | 1.7-3.0 M$ (sin LLP stack) | Aircraft Commerce, IBA |
| Shop visit cost — full overhaul + LLP core stack | 3.5-4.5 M$ (parts >$3M + ~$1.6M core LLP) | Leeham News, Aircraft Commerce |
| Hospital visit (mini-shop) | 0.3-0.8 M$ | StandardAero, AAR |
| LLP stack list price (full set) | ~1.6-2.1 M$ core; full LLP set algo más | IBA |
| Shop visit duration | 60-100 días | StandardAero |

Notas: CFM56-7B y CFM56-5B son **familia hermana** (mismo core, diferentes acomodaciones B737/A320).
Costes y vidas LLP casi idénticos. Reliability altísima — la mayoría de removals son driven por
**LLP expiry**, no por performance. Mercado MRO va a peak 2026-2030 según industry analysts.

### LEAP-1B (B737 MAX, CFM)

| Métrica | Valor | Fuente |
|---------|------|--------|
| First shop visit target | "on-wing parity con CFM56-7B" → 25 000+ FH inicialmente; en práctica 8000-18 000 FH por durabilidad | CFM press, FlightGlobal |
| Issues conocidos | HPT blades (similar a -1A), nozzle desgaste hot/dusty operations | FlightGlobal, AirInsight 2025 |
| Durability kit | -1A certificado **Dec 2024**; -1B certificación **H1 2026** | Safran/CFM press |
| Shop visit cost estimado | 2.5-4 M$ (datos sparse, mercado MRO inmaduro) | Aviation Week MRO 2024 |
| LLP life | similar a CFM56-7B (~25 000 FC objetivo) | CFM brochures |
| Daily support cost | ~$3000/día/engine vs ~$1850/día CFM56 prior | StandardAero/MTU disclosures |

Notas: LEAP-1B en peor situación reliability que -1A (durability kit retrasado 14+ meses).
Operadores como Ascend Airways han reportado dificultades 2024-2025. Hot/dusty operations
(Middle East, India) sufren más wear. NO hay AD masivo equivalente a GTF — issue es
"degradación acelerada", no "grounding mass".

### Diferencia Boeing vs Airbus en engine choice
- B737 NG/MAX: **monopolio CFM**. CFM56-7B → LEAP-1B. El operador no elige.
- A320 family: choice CFM (CFM56-5B/LEAP-1A) o IAE (V2500-A5) o Pratt (PW1100G GTF).

**Implicación juego**: el jugador con flota A320 puede diversificar engine risk. Con flota B737
el riesgo está concentrado. El desastre LEAP-1B (si llega más fuerte) afectaría a todo operador
MAX igual. Esto crea diferenciación estratégica buena para tycoon: "B737 = simpler, less risk diversification; A320 = engine choice strategic palanca".

---

## 5. Landing gear

| Métrica | Valor | Fuente |
|---------|------|--------|
| Overhaul interval | 120 meses / 20 000 FC (lo que llegue antes) | Boeing Services case study, b737.org.uk |
| Overhaul cost | 380-500 k$ (set completo: NLG + 2× MLG) | aerospacerotables.com, Aircraft Commerce |
| % del coste total maintenance | 2-3 % | aerokool.com |
| Downtime overhaul | 60-90 días (off-wing, gear nuevo o pool); aircraft puede operar con gear de pool | Aircraft Commerce, Boeing Services |
| Diferencia Classic vs NG | Classic 25k FC / 10 años; NG simplificación brake change -30% time | b737.org.uk |

Boeing ofrece **Landing Gear Exchange Program** propio similar al de Airbus: el operador no necesita
mantener pool, Boeing entrega gear refurbished mientras el suyo va a overhaul. Coste rango similar
A320 (425-475 k$ documentado para A320-200; 380-500 k$ para B737 NG).

---

## 6. CPFH benchmarks (cost per flight hour) — IATA MCTF / públicos

> IATA Maintenance Cost Task Force (MCTF) publica resúmenes anuales (Public version del MCX Report).
> El último accesible vía web search referencia FY2019 baseline; PDFs IATA propios behind paywall.

### B737-800 — desglose típico (orden de magnitud, USD)

| Componente | $/FH | % del total |
|-----------|----:|----:|
| **Total maintenance CPFH** | 1100-1300 | 100 % |
| Engine maintenance | 380-500 | 35-40 % |
| Component maintenance (rotables) | 200-300 | 20-25 % |
| Heavy airframe maintenance | 100-180 | 10-15 % |
| Line maintenance | 80-150 | 8-12 % |
| Other (modifications, mat'l, overhead) | 100-200 | resto |

Datos Delta Air Lines -800 (Aviation Week 2018): direct mx airframe ~$220, engine ~$130,
burden ~$150 = ~$500 base + maintenance reserves → ~$1000-1300 all-in.

### B737 MAX 8 — primeros años en servicio (impactado)
- Heavy mx share **bajo** (~8%) porque flota aún joven, casi nadie ha llegado a P24/P48
- Engine share **inflado** por LEAP-1B durability issues
- Componente warranty Boeing/CFM cubre buena parte
- **CPFH se normalizará hacia ~950-1100 USD post-2027** con kit retrofit completo

### Por flight cycle
- Maintenance: ~3000 $/FC promedio (similar A320)
- Mucho más sensible al ciclo en short-haul (más cycles relativo a FH = más line/A check load)

Fuentes: IATA MCTF FY2019 (vía referencias secundarias), Aviation Week benchmark 2018,
SimpleFlying B737 op costs, Skylink "B737 C-check cost per FH". Datos directos IATA detrás
de paywall o restricted.

---

## 7. NG vs MAX — diferencias en mantenimiento

### Donde el MAX ahorra
- Compartibilidad con NG en sistemas, tren, aviónica → bajo coste retraining/spares
- LEAP-1B teóricamente mejor SFC (16% mejor fuel burn) → menos hot section stress proporcional
- Diseño moderno permite intervalos mayores en componentes (algunos systems tasks extendidos)

### Donde el MAX está peor (estado real 2024-2026)
1. **LEAP-1B durability**: HPT blade issues similares a -1A pero kit retrofit retrasado 14+ meses
   (cert H1 2026 vs -1A Dec 2024). Time-on-wing real debajo de target.
2. **MSI-22-11 task adicional**: MCAS signal check al stab trim motor cada 6000 FH añadido post-grounding.
3. **Cracks bear strap forward galley** (AD 2025-3985): tareas inspectivas adicionales.
4. **MRO capacity LEAP-1B insuficiente** en mercado → AOG por falta de motor de reemplazo.
5. **Daily support cost** ~$3000/engine vs ~$1850 CFM56 prior gen.

### Implicación MAX para el juego
Si el juego permite escoger entre NG y MAX:
- **NG**: cheap engine mx (CFM56-7B mature), pero airframe progresa hacia P48 (gran AOG event 2030+).
- **MAX**: airframe joven (no P48 hasta 2027+), pero engine mx volatile y LEAP-1B durability risk.
- **Trade-off**: NG = predictable but aging, MAX = newer but engine risk modifier high.

---

## 8. MSG-3 framework — overview (igual A32x)

Idéntico al A320. **Maintenance Steering Group 3** publicado por A4A es la metodología bottom-up
estándar para el initial maintenance program de B737 NG (1997+) y MAX (2017+). El B737 Classic
(1984-2000) usaba **MSG-2** original (hard-time overhaul de todo); NG migró a MSG-3 por completo.

Tres áreas de análisis (MSI / SSI / Zonal) → MRBR → AMP del operador.

Implicación juego: si quieres profundidad sistémica, el "componente falla y disparas un reactive
task" es realista. La idea de "todo se cambia cada X horas" es MSG-2, ya no la realidad B737 NG/MAX.

---

## 9. Comparativa con A32x

| Aspecto | B737-800 | A320ceo | Diferencia clave |
|---------|----------|---------|------------------|
| **A check** | 500 FH / 4 meses | 750 FH / 4 meses | Boeing más conservador (50% más A-checks/año) |
| **C check (1er base)** | 4000 FH / 18 meses (P8) | 6000 FH / 24 meses (C1) | Boeing más fragmentado (6 vs 12 base checks ciclo) |
| **Estructural intermedio** | P24 ~12 000 FH | C8 ~36 000 FH | Boeing pone primer estructural antes |
| **D check / heavy** | P48 24 000 FH / 9 años, 20-30k MH, 2-5 M€ | C12 25 000 FH / 12 años, 6-12k MH, 1.5-5 M€ | Boeing AOG event MAYOR (+15% downtime, 2-3× MH); Airbus eliminó D del MRBR |
| **Engine choice** | Solo CFM | CFM, IAE, o PW | Airbus diversificación, Boeing concentración |
| **Engine LLP** | CFM56-7B 30k/25k/20k | CFM56-5B 30k/25k/20k | Idéntico (familia hermana) |
| **Engine shop visit cost** | CFM56-7B 1.7-3.0M$ perf, 3.5-4.5M$ full | CFM56-5B 1.5-3.0M$ perf, 3.0-5.0M$ full | Empate técnico |
| **Landing gear** | 20k FC / 120 mo, ~425k$ | 20k FC / 120 mo, ~415k$ | Empate |
| **CPFH total** | 1100-1300 USD/FH | 1100-1300 USD/FH | Empate técnico |
| **MAX vs NEO engine** | LEAP-1B durability issues (kit H1 2026) | LEAP-1A (kit Dec 2024) o GTF (AD masivo 2023+) | NEO sufre más por GTF; MAX por LEAP-1B retraso |

### Implicaciones para el juego
1. **Diferenciación real Boeing vs Airbus existe**: ciclo de checks fragmentado de forma distinta,
   D vs C12, engine choice. Vale la pena modelar diferencia, no solo "narrowbody genérico".
2. **B737 ofrece menos palancas estratégicas** (no engine choice) pero más predecible.
3. **A320 ofrece engine choice como dimensión estratégica** importante.
4. **MAX vs NEO en engine risk**: NEO peor (GTF AD); MAX malo pero menos catastrófico.

---

## 10. Validación balance del juego

Placeholders actuales del juego (genéricos narrowbody, no específico B737 vs A320):

| Check | Juego (actual) | Realidad B737-800 | Realidad A320ceo | Veredicto |
|-------|----------------|-------------------|------------------|-----------|
| **A check** | 600 FH / 200 FC / 1 día / 12 k€ | 500 FH / 4 meses / 50-200 MH / 7-28 k€ | 750 FH / 750 FC / 4 meses / 50-150 MH / 8-30 k€ | **B737 más frecuente**; **FC 200 absurdo en ambos**; coste OK rango bajo |
| **C check** | 7500 FH / 5000 FC / 14 días / 110 k€ | 4000 FH / 18 meses / 2000-6000 MH / 7-21 días / **130-700 k€** | 6000 FH / 24 meses / 3000-6000 MH / 10-21 días / **150-800 k€** | **FH 7500 muy alto** (Boeing 4000); **coste 110k bajo 3-4×** |
| **D check** | 25 000 FH / 16 000 FC / 60 días / 550 k€ | P48 24 000 FH / 9 años / **20-30k MH** / 30-60 días / **1.8-5 M€** | C12 25 000 FH / 12 años / 6-12k MH / 21-60 días / **1.5-5 M€** | **Coste 550k MUY BAJO** 5×; **Boeing MH casi 3× Airbus** |

### Recomendaciones de ajuste B737-específicas

1. **A check**:
   - Bajar FH a **500** (Boeing P1) o mantener 600 si quieres conservador
   - **Eliminar gating FC = 200** (irreal en ambos fabricantes)
   - Añadir calendar trigger 4 meses
   - Coste 12 k€ OK base, ampliar rango 7-28 k€

2. **C check (P8 si modela B737)**:
   - **Bajar FH a 4000** (Boeing P8) — diferenciar del A320 6000
   - Calendar gating 18 meses (vs Airbus 24)
   - **Subir coste base a 250-400 k€ típico**, rango 130 k€ – 700 k€
   - Considerar P-progression (P8 → P24 intermedio → P48 final)

3. **D check (P48 si modela B737)**:
   - **Mantener nombre "D check"** o renombrar a "P48 Heavy" — Boeing aún usa concepto, mejor reconocido
   - Match Boeing P48: **24 000 FH / 9 años**
   - **Subir coste a 2-5 M€ rango** (550k subestima 5×)
   - **Modelar man-hours explícitos 20-30k** — Boeing P48 tiene 3× los MH del Airbus C12, gameplay differentiation
   - Downtime 30-60 días bien

4. **Variant gating**:
   - **B737-700** (light): −5/−10% MH y coste vs -800
   - **B737-800** (standard, 80% flota narrowbody mundial)
   - **B737-900ER** (heavy): +10/+15% MH y coste
   - **B737 MAX 8**: igual NG + flag "estimated"

5. **Engine restriction MAX**:
   - B737 NG → solo CFM56-7B
   - B737 MAX → solo LEAP-1B
   - **No engine choice como en A320** — palanca menos en B737, simplicidad

6. **Eventos especiales B737**:
   - **LEAP-1B durability kit H1 2026** — opción retrofit pagar para mejorar TBO
   - **MAX heavy mx data uncertainty** — usar valores NG con flag "projected"
   - **Cracks bear strap AD 2025** — task adicional inspectiva

### Dónde la data es más débil
- **Costes EUR/USD por check de fuente única**: nadie publica precio "oficial" por C check; todo son
  rangos y benchmarks indirectos. Variabilidad real ±50 % entre MROs (low-cost asiáticos vs LHT premium).
- **MAX heavy mx**: prácticamente sin data real, flota no llega aún. Estimaciones son projection del NG.
- **LEAP-1B real shop visit cost**: mercado inmaduro, MRO capacity recién ramp-up 2024-2026.
- **IATA MCX detalle**: PDF público no accesible desde este entorno (host bloqueado); cifras CPFH
  vienen de referencias secundarias confirmando FY2019 baseline.
- **Man-hours por check exactos**: rangos públicos amplios. P48 oscila 20-30k según source —
  función del operador, edad avión, MRO, workscope.
- **Web fetch deshabilitado**: la mayoría de PDFs Aircraft Commerce, b737.org.uk, IATA, Skylink
  no fetcheables desde este entorno. Datos derivados de WebSearch snippets — calidad menor que A32x.

---

## 11. Fuentes

- b737.org.uk, "Boeing 737 Heavy Maintenance" — http://www.b737.org.uk/heavymaint.htm
- b737.org.uk, "Boeing 737 Landing Gear" — http://www.b737.org.uk/landinggear.htm
- SP's Aviation, "Technicalities of Boeing 737 Maintenance" — https://www.sps-aviation.com/story/?id=2624
- Aircraft Commerce, "B737NG Maintenance Analysis & Budget" Issue 108 (2016) — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/Maintenance/2016/108_MTCE_A.pdf
- Aircraft Commerce, "CFM56-7B Maintenance Analysis & Budget" Issue 58 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/Aircraft%20guides/CFM56-7B/ISSUE58_CFM56_7B_MTCE.pdf
- Aircraft Commerce, "Comparison CFM56-5B/-7B/V2500" Issue 28 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/Maintenance/2003/ISSUE%2028-MTCE-B.pdf
- Aircraft Commerce, "Landing gear overhaul suppliers survey" Issue 63 — https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2009/ISSUE63_MTCE_B.pdf
- AviationWeek, "Returning MAX To Service Requires Maintenance Changes" — https://aviationweek.com/mro/safety-ops-regulation/returning-max-service-requires-maintenance-changes
- Skylink, "B737 C-Check Costs Per Flight Hour" — https://www.skylinkintl.com/blog/heres-how-much-your-b737-c-check-costs-per-flight-hour-plus-how-you-can-reduce-the-maintenance-cost
- AeroTime, "The alphabet of aircraft maintenance" — https://www.aerotime.aero/articles/28347-aircraft-maintenance-abcd-checks
- aviationtitans.com, "Aircraft Heavy Maintenance Cost 2026 Complete D-Check Guide" — https://www.aviationtitans.com/aircraft-heavy-maintenance-visit-usa/
- Wikipedia, "Aircraft maintenance checks" — https://en.wikipedia.org/wiki/Aircraft_maintenance_checks
- Wikipedia, "Boeing 737 Next Generation" — https://en.wikipedia.org/wiki/Boeing_737_Next_Generation
- Wikipedia, "CFM International CFM56" — https://en.wikipedia.org/wiki/CFM_International_CFM56
- Wikipedia, "CFM International LEAP" — https://en.wikipedia.org/wiki/CFM_International_LEAP
- IALTA, "Boeing Maintenance Planning Document (MPD)" — https://ialta.aero/the-boeing-maintenance-planning-document-mpd
- SimpleFlying, "How Much Do Boeing 737s Cost To Operate & Maintain?" — https://simpleflying.com/boeing-737-maintenance-operating-costs/
- SimpleFlying, "Boeing Landing Gear Overhaul Program Benefits" — https://simpleflying.com/how-boeing-landing-gear-overhaul-program-benefits-operators/
- SimpleFlying, "How Many Engineers Required for C-checks" — https://simpleflying.com/how-many-engineers-required-for-c-checks/
- Boeing Services, "737NG Landing Gear Overhaul Enhancements Case Study" — https://services.boeing.com/resources/case-studies/737-landing-gear-overhaul-enhancements
- Aerospace Rotables, "Boeing 737 Landing Gear Overhaul & MRO" — https://aerospacerotables.com/boeing-737-landing-gear-overhaul/
- Aviation Maintenance Magazine, "Narrowbody Engine Maintenance Market is Strong" — https://avm-mag.com/narrowbody-engine-maintenance-market-is-strong
- avitrader, "StandardAero celebrates 1,000th CFM56-7B shop visit" — https://avitrader.com/2024/07/22/standardaero-celebrates-1000th-cfm56-7b-shop-visit/
- StandardAero, "CFM56-7B services" — https://standardaero.com/engines/cfminternational/cfm567b/
- StandardAero, "LEAP-1A and LEAP-1B Lease Engines" — https://standardaero.com/standardaero-adds-lease-engines-to-its-cfm-international-leap-1a-and-leap-1b-service-offering-supporting-the-airbus-a320neo-and-boeing-737-max-customer-base/
- GE Aerospace, "CFM56 engine performance, extended time-on-wing advantage" — https://www.geaerospace.com/news/articles/product/did-you-know-cfm56-engines-performance-extended-time-wing-advantage
- Safran, "FAA and EASA certify more durable CFM LEAP HPT hardware" Dec 2024 — https://www.safran-group.com/pressroom/faa-and-easa-certify-more-durable-cfm-leap-hpt-hardware-2024-12-09
- FlightGlobal, "CFM Leap durability issues and -1B fix readiness" — https://www.flightglobal.com/engines/cfm-takes-key-learnings-from-initial-leap-durability-issues-and-readies-for-roll-out-of-1b-fix/163584.article
- FlightGlobal, "Ascend Airways CFM Leap engine problems on 737 MAX" — https://www.flightglobal.com/fleets/ascend-airways-struggles-with-cfm-leap-engine-reliability-on-737-max-fleet/164562.article
- AirInsight, "The TOW Gap: Why Airlines Favor the LEAP in 2025" — https://airinsight.com/the-tow-gap-why-airlines-favor-the-leap-in-2025/
- Aircraft Monitor, "Keeping Score: Engine SVR analysis" — https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/keeping_score_analysis_of_an_engine%E2%80%99s_svr____v1.pdf
- IBA Group, "What to Look for When Valuing an Engine" — https://www.iba.aero/insight/what-to-look-for-when-valuing-an-engine-march-2018/
- Leeham News, "Bjorn's Corner: Aircraft engine maintenance Part 1" — https://leehamnews.com/2017/03/03/bjorns-corner-aircraft-engines-maintenance-part-1/
- Ryanair Annual Report 2025 — https://investor.ryanair.com/wp-content/uploads/2025/05/Ryanair-2025-Annual-Report.pdf
- Federal Register, "Airworthiness Directives Boeing 737 MAX bear strap" Nov 2025 — https://www.federalregister.gov/documents/2025/11/25/2025-21093/airworthiness-directives-the-boeing-company-airplanes
- TU Delft Repository, "Maintenance Planning Optimization for the Boeing 737 NG" — https://repository.tudelft.nl/islandora/object/uuid:ce629255-e83f-43d9-949c-ea87ffa8678e/datastream/OBJ/download

---

*Fin del documento. ~370 líneas. Espejo del A32x_maintenance.md.*
