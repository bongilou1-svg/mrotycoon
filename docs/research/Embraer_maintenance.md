# Embraer E-Jet (E1 + E2) Maintenance Programs — Research Doc

> Investigacion publica para validar/corregir los placeholders de mantenimiento del juego.
> Fecha: 2026-05-15. Autor: agente investigacion. Status: borrador para uso interno (game design).
> **Aviso**: muchos numeros reales son rangos no publicados oficialmente; Aircraft Commerce, IATA MCTF
> e IBA publican sintesis pero los detalles finos viven en MPDs propietarios. Donde la fuente es
> "consensus" significa promedio de varios articulos publicos cruzados, no dato auditado.

Companion: `docs/research/A32x_maintenance.md` (baseline narrowbody para comparativa).
Datos JSON: `data/research/maintenance_intervals_Embraer.json`.

---

## 1. Resumen ejecutivo

La familia Embraer E-Jet (E170/175/190/195, EIS 2004) y la E-Jet E2 (E190-E2/E195-E2, EIS 2018)
usan un programa **MSG-3** definido por el Embraer Maintenance Planning Document (MPD) y aprobado
por ANAC (Brasil), FAA y EASA. Como Airbus, Embraer ya no nombra "D check" en el MRBR moderno: las
tareas heavy structural se reparten en C-checks elevados (C8 / C12).

Hallazgos clave:

- **A check (E1)**: extendido a **750 FH / 750 FC / 4 meses** (post-2013 escalation desde 600 FH).
- **A check (E2)**: **1000 FH / 1000 FC / 6 meses** desde EIS — el intervalo basico mas alto del segmento single-aisle.
- **C check (E1)**: **7500 FH / 24 meses** (escalation desde 6000 FH). Some operators stay 6000.
- **C check (E2)**: **10000 FH / 36 meses**. Heavy-check downtime -15% vs E1, sin out-of-phase tasks.
- **"D check"**: ya no existe como bloque unico; reemplazado por C8 (~6 anos) y C12 (~12 anos).
- **CF34-8E / -10E**: shop visits **1.0-1.9 M EUR** (performance), **2.5-4.5 M EUR** (full overhaul + LLP). LLP life 22400-25000 cycles.
- **PW1900G (E2)**: heredado parcialmente del lio PW1100G; data limitada, restricciones AD activas.
- **Landing gear**: 20-25k FC / 144 meses, ~**320 k EUR**.
- **CPFH total** E175 ~**850 USD/FH**, E190 ~**950 USD/FH** (regional segment baseline IATA MCTF). Aprox **30% mas barato** que A320 en absoluto, pero ratio FC/FH ~1.7x mayor.

---

## 2. Tabla de intervalos A/B/C/D (MRBR Embraer + escalations)

| Check | Variante | Intervalo (FH) | Intervalo (FC) | Intervalo (cal) | Man-hours | Downtime | Notas |
|-------|----------|---------------:|---------------:|----------------:|----------:|---------:|-------|
| Transit / Daily | E170/175/190/195 | — | — | 24-48 h | 1-2 | minutos | Walk-around, fluidos, defectos |
| Weekly check | E-Jet family | — | — | 7 dias | 4-8 | 2-4 h | Visual + sistemas |
| **A check** | E170/E175 | 750 | 750 | 4 meses | 40-120 | overnight | Subdividido A1..An. Post-2013 escalation desde 600 FH |
| **A check** | E190/E195 | 750 | 750 | 4 meses | 45-135 | overnight | ~10% mas MH por fuselaje |
| **A check** | E190-E2 / E195-E2 | **1000** | **1000** | **6 meses** | 40-120 | overnight | Mejor del segmento single-aisle |
| **C check** | E170/E175 | 7500 | — | 24 meses | 2200-4600 | 7-18 dias | Embraer lo llama 'Basic check'. Escalation desde 6000 FH (2013) |
| **C check** | E190/E195 | 7500 | — | 24 meses | 2600-5100 | 8-20 dias | +15% MH vs E170/175 |
| **C check** | E190-E2 / E195-E2 | **10000** | — | **36 meses** | 2200-4500 | 6-17 dias | Sin out-of-phase tasks; -15% downtime vs E1 |
| **C8 heavy** | E170/E175 | — | — | ~6 anos | 3500-6500 | 14-30 dias | Structural inspection 1 |
| **C12 heavy** ("ex-D") | E170/E175 | 25000 | 16000 | 144 meses | 5000-10000 | 21-50 dias | 12 anos. Pintura, full strip, structural deep |
| **C12 heavy** ("ex-D") | E190/E195 | 25000 | 16000 | 144 meses | 6000-11000 | 21-55 dias | +15% vs E170/175 |
| CPCP | E2 | — | — | 8 anos | (incluido) | concurrent | Solo 82 tareas (vs 240 en E1) |

Fuentes: Jet Access blog "Embraer Maintenance Program Changes" (2013 escalation 600->750 FH y 6000->7500 FH);
Aircraft Commerce Issue 72 (CF34/E-Jet); Skylink 2021 EMB Forecast; Wikipedia "Embraer E-Jet E2 family";
AirInsight "E-Jets E2 A Program Review" (2016); Theseus thesis Fernandez "Base Maintenance Capability E190" (2017).

### Notas importantes
- **El MRBR Embraer actual NO tiene "D check"**, igual que Airbus. La heavy structural maintenance vive en C8/C12.
- **E2 tiene los intervalos mas largos del segmento single-aisle**: 10000 FH C-check supera a A320neo (6000 FH) y B737 MAX (~6000 FH). Diseno post-2010 que aprovecho aprendizaje de E1.
- **Calendar limit suele dominar** en operadores regionales con utilizacion 8-12 FH/dia. Un E175 a 10 h/dia llega a 750 FH en ~75 dias, asi que el gating de 4 meses calendario no aprieta. Pero a 6 h/dia (operacion baja) si.

---

## 3. Phase-check vs block-check (industria moderna)

### Definiciones
- **Block check**: avion sale de servicio durante todo el C-check (7-20 dias). Modelo clasico.
- **Phased check**: C-check troceado en paquetes de varios dias.
- **Equalised**: tareas C distribuidas entre A-checks overnight.

### Quien usa que (Embraer, publicamente conocido)
| Filosofia | Ejemplos tipicos | Por que |
|-----------|------------------|---------|
| Block C | SkyWest, Republic, Envoy (US regionals con CPA) | Fleets grandes pero centralized maintenance bases (SLC, IND); MRO 3rd party |
| Phased C | KLM Cityhopper, Air France HOP | Mainline-style operations en Europa |
| Equalised | Operadores boutique (Helvetic, Porter) | Maximiza utilizacion; requiere reliability data muy bueno |

**Implicacion para el juego**: misma decision estrategica que A32x — block (mas simple, mas downtime) vs
phased (mas overhead, menos AOG). Para E-Jets el block es mas comun por la economia CPA US.

---

## 4. Motor — CF34-8E / CF34-10E / PW1900G

### CF34-8E (E170/E175)
- **Thrust**: 14200-14500 lbf
- **LLP life**: **22400-25000 cycles** (LLP refurbishment)
- **Hot section**: on-condition, sin HSI on-wing programado. Tratado en performance restoration shop visit.
- **Shop visit first run**: 12000-16000 FH
- **Shop visit mature**: 8000-12000 FH (mas frecuente que CFM56 por mayor cycle rate de regionales)
- **Shop visit cost**:
  - Hospital: 200-500 k EUR
  - Performance restoration: 0.9-1.8 M EUR
  - Full overhaul + LLP: 2.5-4.0 M EUR
- **LLP stack price**: ~1.9 M EUR
- **Duracion shop**: 50-90 dias
- **Notas**: Aviation Week reporta "engine lessors brace for CF34 maintenance wave" 2025-2027 — flota envejeciendo, ola de shop visits inminente. SVR (shop visit rate) mayor que CFM56-5B porque regionales ciclan mas (sectors 1.5h vs 2.5h narrowbody).

### CF34-10E (E190/E195)
- **Thrust**: 18500-20000 lbf
- **LLP life**: **25000 cycles**
- **Hot section**: idem -8E.
- **Shop visit cost**:
  - Hospital: 230-580 k EUR
  - Performance restoration: 1.0-1.9 M EUR
  - Full overhaul + LLP: 2.9-4.5 M EUR
- **LLP stack price**: ~1.9 M EUR; Azorra firmo SMO 2024 con GE que reduce LLP shop visit cost **-30%** para sus -10E.
- **Duracion shop**: 55-95 dias
- **Fuente coste de referencia**: GE/IBA citan "overhaul $1.5M+ y LLP set $2.1M para 25k cycle life".

### PW1900G (E190-E2 / E195-E2)
- **Thrust**: 15000-22000 lbf (rating dependiente)
- **EIS**: 2018. Engine joven, data publica limitada.
- **LLP life design target**: 22000 cycles
- **LLP life actual restriccion**: HPT disks **5000 FC**, HPC disks **7000 FC** por powder-metal AD heredado del PW1100G.
- **Shop visit current forced**: 2800-3800 FC repetitive inspection
- **Shop visit cost**:
  - Hospital: 350-850 k EUR
  - Performance restoration: 1.5-3.0 M EUR
  - Full overhaul + LLP: 3.0-5.5 M EUR
- **Duracion shop**: 100-280 dias (backlog severo heredado del lio PW1100G)
- **Issues conocidos**: powder-metal contamination AD; backlog MRO; MTU/EME Aero (Rzeszow) anaden capacity.
- **Outlook**: normalizacion esperada post-2027.

### Comparativa engines
| Metrica | CF34-8E | CF34-10E | PW1900G | CFM56-5B (ref A320) |
|---------|---------|----------|---------|---------------------|
| LLP life cycles | 22.4-25k | 25k | 22k design / 5-7k actual | 20-30k |
| Shop visit perf (M EUR) | 0.9-1.8 | 1.0-1.9 | 1.5-3.0 | 1.4-2.8 |
| LLP stack (M EUR) | ~1.9 | ~1.9 | ~3.0 | ~3.2 |
| Shop duracion (dias) | 50-90 | 55-95 | 100-280 | 60-100 |
| Reliability | Alta | Alta | Issue activo | Muy alta |

---

## 5. Landing gear

- **Interval**: **20000 FC** o **144 meses** (whichever first); spec E190 indica 25000 FC / 144 meses. Max **60000 CSN**.
- **Coste overhaul**: **250-400 k EUR** (typical 320 k). Aprox 25% mas barato que A320 LG por menor tamano.
- **Downtime off-wing (componente)**: 60-100 dias.
- **Downtime aircraft AOG (con pool de gears)**: 2-7 dias.
- **% del coste total mantenimiento**: ~2.5%.
- **Operadores**: SkyWest, Republic, Envoy mantienen pool con Liebherr-Aerospace o GA Telesis (Liebherr firmo contrato Envoy 2025; GA Telesis anadio capability E175 2024).

---

## 6. CPFH benchmarks (regional jets)

| Aircraft | CPFH USD | CPFH EUR | Engine % | Component % | Line % | Heavy % | Otros % |
|----------|---------:|---------:|---------:|------------:|-------:|--------:|--------:|
| E170 | 800 | 735 | 40 | 22 | 12 | 13 | 13 |
| E175 | **850** | 780 | 40 | 22 | 12 | 13 | 13 |
| E190 | 950 | 875 | 42 | 21 | 11 | 14 | 12 |
| E195 | 980 | 900 | 42 | 21 | 11 | 14 | 12 |
| E190-E2 (target) | 850 | 780 | 38 | 22 | 12 | 13 | 15 |
| E190-E2 (impacted GTF) | 1150 | 1060 | **50** | 19 | 10 | 12 | 9 |
| A320ceo (referencia) | 1200 | 1100 | 38 | 22 | 10 | 12 | 18 |

Fuentes: IATA MCTF regional segment baseline; SkyWest 10-K 2024; myaircraftcost.com (cita "$500/h direct
mx" benchmark E175); Aircraft Commerce Issue 72; Embraer commercial brochures (E2 targets).

**Nota**: El benchmark popular de "$500/h" para E175 que circula en blogs operativos refiere a
**direct maintenance** (line + componentes consumibles), no all-in. El all-in con engine reserves +
heavy + LG amortizado va a ~$850/h.

---

## 7. Diferencias vs narrowbody (A32x / B737)

Esta seccion es **clave para game balance**. Regional jets NO son "narrowbodies pequenos" desde la
perspectiva de mantenimiento.

### 7.1 Perfil operativo
| Metrica | E175 | A320 | Delta |
|---------|-----:|-----:|------:|
| Sector tipico (h) | 1.5 | 2.5 | -40% |
| Vuelos/dia | 5-7 | 4-5 | +40% |
| Block hours/dia | 8-12 | 9-11 | similar |
| FH per cycle | ~1.5 | ~2.5 | -40% |
| **Cycles per FH** | **0.67** | **0.40** | **+67%** |

### 7.2 Implicacion para mantenimiento
- **Cycle-driven gating golpea antes en calendario para regionales**:
  - Landing gear: 20000 FC en E175 a 5 vuelos/dia = ~11 anos. En A320 a 4 vuelos/dia = ~14 anos. **Misma calendar, regional gasta mas LG**.
  - Engine LLP: CF34 limit 25000 cycles llega antes que 30000 cycles del CFM56 a misma utilizacion calendario.
  - Engine SVR (shop visit rate): regional tiene mas shop visits por anyo aunque cada uno sea mas barato.
- **FH-driven gating golpea menos**: A-check 750 FH cae mas rapido en A320 (cada 75 dias a 10 h/dia) que en E175 (cada 75 dias a 10 h/dia). Pero E2 con 1000 FH se aleja a 100 dias, **mejor que cualquier narrowbody**.
- **Coste absoluto menor** (~25-35% menos en heavy + engine), pero **frecuencia mayor** -> CPFH no escala linealmente con tamano.

### 7.3 Estructura de coste
| Categoria | E175 % | A320 % | Insight |
|-----------|-------:|-------:|---------|
| Engine | 40 | 38 | Regional engine share algo mayor por SVR |
| Components | 22 | 22 | Similar |
| Line mx | 12 | 10 | Regional pasa mas tiempo en linea (mas turnarounds) |
| Heavy mx | 13 | 12 | Similar % aunque coste absoluto -25% |
| Otros | 13 | 18 | A320 tiene mas "fees" overhead (admin, training) |

### 7.4 Decisiones distintas para el operador
- **Regional**: optimiza ciclos. Pool de landing gears es **mas critico**.
- **Narrowbody**: optimiza FH on-wing. Engine SVR matters mas en absoluto.
- **MRO mixto** (lo que el juego simulara): debe entender ambos perfiles. Hangar slot footprint diferente (E175 ocupa ~70% del area de A320).

---

## 8. Operadores tipicos (relevantes para narrative del juego)

### Norteamerica (CPA = Capacity Purchase Agreement con mainlines)
- **SkyWest**: 262 E175 (Dec 2024), 278 commited 2026. Mayor operador E175 del mundo. Bases SLC, DEN.
- **Republic Airways**: ~200 E170/E175 para AA, DL, UA. Base IND.
- **Envoy Air**: 130+ E170/E175 para American Eagle. Liebherr LG contract 2025.
- **Mesa Airlines**: E175 para United (antes American). Flota reducida 2024.

### Europa
- **KLM Cityhopper**: ~50 E175/E190/E195. Base AMS.
- **Air France HOP**: E170/E190 para AF feeder.
- **Helvetic Airways**: E190-E2 / E195-E2 (boutique Suiza).
- **Lufthansa CityLine**: E190 (saliendo de flota).

### Brasil
- **Azul**: E195 + E195-E2. Operador domestic con Embraer en patio.

### Insight para el juego
Los CPA US dominan demanda de mantenimiento E175 en Norteamerica. Si el juego simula contratos
"airline contracts MRO services", una mecanica realista es **contracts CPA-style con SkyWest-like**:
fee fija per flight hour, MRO absorbe variabilidad de costes. Mas predictible, menor margen.

---

## 9. Recomendaciones balance juego

### 9.1 Calibracion vs placeholders actuales
Asumiendo placeholders identicos a A32x (A:600 FH/200 FC/12k EUR, C:7500/14d/110k, D:25000/60d/550k):

| Check | Placeholder actual | Recomendado E-Jet | Multiplicador |
|-------|-------------------|-------------------|---------------|
| A check FH | 600 | 750 (E1) / 1000 (E2) | +25% / +67% |
| A check FC | 200 | **750** | **+275% (CRITICO)** |
| A check EUR | 12000 | 12000 typical (rango 6k-23k) | OK |
| C check FH | 7500 | 7500 (E1) / 10000 (E2) | OK / +33% |
| C check EUR | 110000 | **290000 typical (rango 110k-620k)** | **+165% (CRITICO)** |
| C12 EUR | 550000 | **2.2-2.6 M typical** | **+300-370% (CRITICO)** |
| Engine SV | n/a | **anadir como evento** | nuevo |
| LG overhaul | n/a | **anadir como evento** | nuevo |

### 9.2 Mecanicas recomendadas especificas regional
1. **Tracker dual FH+FC**: regional jets golpeados por cycles, no FH. El juego DEBE trackear ambos.
2. **Engine type modifier**:
   - CF34-8E/-10E: reliable, barato, SVR alto -> "workhorse"
   - PW1900G: SFC mejor, risk modifier alto (2024-2027 backlog) -> "premium con riesgo"
3. **Aircraft type slot**: E-Jet = 0.7 slots de A320 en hangar. Mas E-Jets caben en mismo hangar -> mas variedad de contratos simultaneos.
4. **CPA contracts** (gameplay layer): fee fija per FH, MRO absorbe variabilidad. Premium estable, menor margen vs ad-hoc.
5. **Pool de landing gears**: opcion estrategica con upfront cost que reduce AOG en LG overhauls. Mas critica que en narrowbody.
6. **E2 como progression unlock**: mejor mantenibilidad (intervalos mas largos), engine PW1900G con risk-reward, aviones nuevos = contratos premium.
7. **MSG-3 inspired**: muchos tasks Embraer son on-condition (sin hard-time). Esto permite gameplay tipo "puedes diferir esta task pero suma risk de unscheduled".

### 9.3 Diferenciacion contra A32x en el juego
| Decision | A32x | E-Jet | Resultado gameplay |
|----------|------|-------|---------------------|
| Hangar slot | 1.0 | 0.7 | Mas E-Jets simultaneos por hangar |
| Heavy check coste | 100% | 70-75% | E-Jet contracts margen menor pero volumen mayor |
| Engine SV frecuencia | baja | media | Mas eventos engine, mas picks/decisiones |
| LG overhaul | 10 anos | 12 anos pero ciclos | Diferente trigger |
| Cliente tipico | LCC, mainline | CPA US, regional EU | Narrativa distinta |

---

## 10. Fuentes consultadas

- **Wikipedia**: "Embraer E-Jet E2 family", "Embraer E-Jet family", "General Electric CF34", "Pratt & Whitney PW1000G", "Aircraft maintenance checks".
- **Jet Access blog**: "Embraer Maintenance Program Changes" (2013 A-check escalation 600->750 FH, C-check 6000->7500 FH).
- **Aircraft Commerce Issue 72** (2010): "CF34-8E/-10E series exclusively power Embraer" (PDF acceso bloqueado en cowork pero sintesis cruzada).
- **AirInsight** (2016): "E-Jets E2 A Program Review" (10000 FH intermediate, sin out-of-phase, CPCP 82 tasks vs 240).
- **Aviation Week**: "Engine Lessors Brace For CF34 Maintenance Wave"; "Analyzing CF34 Engine Reliability".
- **Aviation Business News**: "Reputable regional: CF34 remains a cornerstone"; "MTU PW1500G/PW1900G overhaul services".
- **GE Aerospace press**: "Azorra Aviation SET Maintenance Offer CF34-10E" (2024, -30% LLP shop visit cost).
- **Skylink International**: "2021 Embraer EMB 170/175/190/195 Aircraft Maintenance & Material Forecast".
- **C&L Aero**: "Why Outsource ERJ Landing Gear Overhaul Management?" (12y / 20000 CSO / 60000 CSN max).
- **Liebherr Aerospace press releases**: contrato Envoy Air landing gear (2025).
- **GA Telesis press**: E175 LG capability addition (2024).
- **TrueNoord**: "Regional Jet Market Report" (julio 2022).
- **SkyWest 10-K** (2024): fleet 262 E175.
- **Theseus thesis** Fernandez (2017): "Base Maintenance Capability Research Embraer 190".
- **AirInsight**: "FAA Extends GTF Inspections A220 / Embraer E2".
- **RTX investor update**: GTF fleet impact $6-7B compensation.
- **myaircraftcost.com**: E175 operating cost breakdown ($500/h direct mx benchmark).
- **readyfortakeoffbook.com**: "E175 explained", "E190-E2 explained" (sector 1-3h, 4-6 vuelos/dia).
- **EUROCONTROL Standard Inputs Economic Analyses**: aircraft operating costs reference.

### Fuentes NO accesibles (limitaciones cowork)
- Aircraft Commerce PDFs (host bloqueado): se uso sintesis via search snippets.
- ANAC Brazil docs: no consultados directamente.
- IATA MCTF reports: solo via referencias secundarias.
- MPDs propietarios Embraer: no publicos.

---

## 11. Aviso final

Numeros publicos cruzados de multiples fuentes. Para cualquier dato critico que termine en codigo
del juego (balance economico), validar con segunda fuente. Las fluctuaciones reales entre MROs son
de **+-50%**, asi que cualquier "typical" del JSON debe tratarse como **mediana** no como verdad.

PW1900G data especialmente fluida — engine joven en medio de AD activo. Re-investigar en 12-18
meses si el juego entra en fase de E2 deep simulation.
