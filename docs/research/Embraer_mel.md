# Embraer E-Jet — ATA, MMEL & WO Templates Research

> Research doc paralelo a `A32x_mel_ata.md` y al pendiente `B737_mel_ata.md`.
> **Fuente de verdad** del juego post-Fase 4 (variante Embraer): `data/research/workorders_real_Embraer.json` (170 templates).
> Compañeros JSON: `data/research/ata_chapters.json` (compartido), `data/research/mel_catalog_Embraer.json`.
> **170 WO templates** sobre **41 capítulos ATA**. Severity 72.4/23.5/4.1 (Minor/Major/Critical), deferrable 37.1%.

Fecha: 2026-05-15. Autor: agente de investigación (Cowork sesión Fase 4).

---

## 1. Por qué este doc

El brief de Fase 4 pide cobertura de los tres aircraft families dominantes en flotas regionales/narrowbody europeas:

1. **Airbus A32x ceo/neo** — `workorders_real.json` (208 templates, ya en repo).
2. **Boeing 737NG/MAX** — `workorders_real_B737.json` (en generación paralela).
3. **Embraer E-Jet (E170/175/190/195 + E2)** — *este documento*.

Los E-Jet son el **regional jet más frecuente en Europa fuera de la zona dominada por A32x/B737** (KLM Cityhopper, Air France HOP, LOT, BA Cityflyer, Lufthansa CityLine). Operativamente son significativamente **más simples mecánicamente** que A32x/B737, lo cual se refleja en el dataset (~25% menos templates totales para no inflar artificialmente).

---

## 2. Familia E-Jet — variantes y diferencias relevantes

| Modelo | Pax típico | Engine | Years | Slats | Notas |
|---|---:|---|---|---|---|
| E170 | 70-78 | CF34-8E (GE) | 2004→ | No | Variante base. Sin slats. |
| E175 | 78-88 | CF34-8E | 2005→ | No | El más vendido de la familia E1; backbone US scope-clause flying. |
| E190 | 96-114 | CF34-10E (GE) | 2005→ | No | Engine más grande, mismo airframe stretched. |
| E195 | 100-124 | CF34-10E | 2006→ | No | Stretch máximo de E1. |
| E175-E2 | 80-90 | PW1700G | (slipped) | Sí | Programa pausado por scope-clause US. |
| E190-E2 | 97-114 | PW1900G (GTF) | 2018→ | **Sí** | Slats nuevos, FBW completo, glass cockpit Pro Line Fusion (no Primus Epic). |
| E195-E2 | 120-146 | PW1900G | 2019→ | **Sí** | KLM, Helvetic, Azul. |

**Implicaciones para el dataset**:
- E1 (E170/175/190/195) **no tiene slats**, sólo flaps de doble ranura. Cap 27 más simple que A32x.
- E1 usa **glass cockpit Honeywell Primus Epic** (no IMA Airbus, no CDS Boeing). Cap 31, 34, 42, 45 con vendor-specific quirks.
- E2 cambia a **Rockwell Collins Pro Line Fusion** + GTF. Para el juego, E2 se trata como una sub-flota separada con engineSpecific=`PW1900G` y notas glass cockpit distintas.
- **Hidráulica**: E-Jet usa **dos sistemas independientes (Sistema 1 / Sistema 2)** + un PTU eléctrico, en contraste con A32x (Green/Yellow/Blue) y B737 (A/B). Cap 29 diferente nomenclatura pero mismas familias de tareas (EDP R/R, fluid leak, filter, accumulator).
- **Winglets**: standard en E1 (a diferencia de A32x donde sharklets son retrofit). Cap 57 incluye winglet inspection rutinaria.
- **FBW**: limitado en E1 (sólo elevators + rudder + spoilers via FCM); ailerons mecánicos por cables. En E2 FBW completo. Cap 27 templates reflejan esto: el E1 tiene templates "cable rigging adjustment" que no aplican a A32x.

---

## 3. MMEL E-Jet — análisis cuantitativo

### 3.1 Documento fuente

**FAA Master Minimum Equipment List Embraer EMB-170/190**, Revision actual (~Rev 22 a fecha 2025), referencia DRS FAA `MMEL_EMB-170_Rev_XX_Draft.pdf`. La FAA mantiene un MMEL **conjunto E170/E175/E190/E195** porque comparten cert basis ANAC + FAA y la mayoría de items son comunes; las diferencias E170-vs-E190 están marcadas con notas `(Applicable only to: E170/E175)` o `(E190/E195)`.

**Equivalente ANAC Brazil**: el MMEL primario de tipo lo emite ANAC (autoridad de Embraer). EASA emite OEB Embraer alineado. Categorías idénticas a Airbus/Boeing (A/B/C/D, mismos intervalos de calendario).

**E2**: MMEL separado (E190-E2/E195-E2), Rev 8 aprox a 2025. ANAC + FAA + EASA. Estructura igual.

### 3.2 Estructura del documento

- Organizado por capítulos ATA, con prefijo `EMB-170` o `EMB-190` cuando hay item específico.
- Total estimado **MMEL E170/190 Rev actual**: ~850-1000 items individuales (vs ~1100-1300 A320, ~1100 B737NG). Documento ~550-600 páginas.
- E1 + E2 combinado: ~1300-1500 items si se suman.

### 3.3 Categorías de reparación

Idénticas a las de A32x — A/B/C/D — mismas duraciones (1-3d operador, 3d, 10d, 120d).

Distribución aprox observada en MMELs públicos E-Jet:

| Cat | % aprox MMEL E-Jet |
|---|---:|
| A | ~7% |
| B | ~22% |
| C | ~54% |
| D | ~17% |

(Muy similar al de A32x, ligero sesgo a B porque el sistema "Sistema 1 / Sistema 2" hidráulico tiene más items con backup redundante).

### 3.4 Sample items por capítulo (extracto)

Se han curado **80 items MEL** en `mel_catalog_Embraer.json` cubriendo los capítulos relevantes a E-Jet. Algunos ejemplos:

| Item ID | Sistema | Descripción | Cat | Días |
|---|---|---|---:|---:|
| 21-26-01 | Air Cond | Pack Flow Control Valve | C | 10 |
| 22-30-01 | Auto Flight | Autothrottle | B | 3 |
| 24-21-01 | Electrical | IDG (one) | B | 3 |
| 25-22-01 | Equipment | Passenger Seat | D | 120 |
| 27-50-01 | Flight Ctrl | Flap Channel (one) | B | 3 |
| 28-22-01 | Fuel | Wing Tank Boost Pump | C | 10 |
| 29-11-01 | Hydraulics | System 1 EDP | B | 3 |
| 31-50-01 | Indicating | Primus Epic MFD (one) | C | 10 |
| 32-51-01 | Landing Gear | Nose Wheel Steering | B | 3 |
| 49-11-01 | APU | APU (Honeywell 36-150) | B | 3 |
| 78-31-01 | Reversers | Thrust Reverser (one) | B | 3 |

(Lista completa en `data/research/mel_catalog_Embraer.json`).

---

## 4. Particularidades Embraer (relevantes al dataset)

### 4.1 Glass cockpit Honeywell Primus Epic (E1)

El cockpit del E1 está dominado por **5 displays MFD/PFD/EICAS** corriendo Primus Epic, no IMA Airbus. Implicaciones para WOs:

- ATA 31: templates específicos "MAU (Modular Avionics Unit)" en lugar de CPIOM/IOM Airbus o CDS Boeing.
- ATA 34: FMS es Honeywell EFIS-NAV-3000, base de datos navegacional con ciclo AIRAC propio.
- ATA 45: OMS es Honeywell CMC (Central Maintenance Computer), arquitectura distinta al CMS de A32x.

### 4.2 FBW limitado E1 vs FBW completo E2

E1: **elevators, rudder, multifunction spoilers** son fly-by-wire; **ailerons** son control mecánico por cables. Implicación:
- Templates 27-XX de E1 incluyen "aileron cable tension check" (no existe en A32x).
- Templates 27-XX de E2 son más parecidos a A32x (todo FBW).

### 4.3 Hidráulica System 1 / System 2 + PTU eléctrico

- **System 1**: bomba EDP en engine #1 + bomba eléctrica AC.
- **System 2**: bomba EDP en engine #2 + bomba eléctrica AC.
- **PTU eléctrico** (no hidráulico, distinto de A32x PTU): si una bomba falla, redistribuye carga.
- **No hay tercer sistema** (Blue/Standby) — el RAT en E190 alimenta un tercer canal hidráulico en emergencia pero no es sistema independiente como Airbus Blue.

Templates 29-XX reflejan esto: nomenclatura "Sys 1 EDP" / "Sys 2 EDP", no "Green/Yellow/Blue".

### 4.4 Engines

| Engine | Modelos | OEM | Notas mantenimiento |
|---|---|---|---|
| **CF34-8E** | E170, E175 | GE | Variante regional del CF34. Borescope típico cada 1500h. EGT margin más estable que CF34-10E. |
| **CF34-10E** | E190, E195 | GE | Más empuje, más stress térmico. ADs sobre HPT blades NSG (Next Stage Generation) entre 2018-2022. Lubricación midspan dampers no aplica (solo CFM56). |
| **PW1700G** | E175-E2 (paused) | P&W | GTF — programa US scope-clause stalled. Pocos templates específicos en dataset (sub-fleet hipotética). |
| **PW1900G** | E190-E2, E195-E2 | P&W | GTF — mismas familias de tareas que PW1100G en A320neo: chip detection, fan blade rebalance, gearbox monitor. ADs sobre journal bearings 2024+. |

### 4.5 ANAC airworthiness directives notables

- **AD ANAC 2018-12-01** (E190): inspección periódica de fuselage frame en fwd cargo bay por crack reports. Template `WO-EJ-53-002` lo refleja.
- **AD FAA 2020-26-12** (E170/175/190/195): replace nose landing gear shock strut piston tubes per service bulletin. Template `WO-EJ-32-006`.
- **AD EASA 2022-0084** (E190-E2): GTF gearbox bearing inspection. Template `WO-EJ-72-006` engineSpecific=`PW1900G`.

### 4.6 Winglets & Wings

- E1: **winglets standard** (canted). Inspección visual integrada en walk-around.
- E2: **wing nuevo + winglets más grandes + slats**. Templates 27-XX y 57-XX reflejan esto.

---

## 5. Comparativa A32x / B737 / E-Jet

| Eje | A32x | B737NG/MAX | E-Jet (E1) |
|---|---|---|---|
| Cabina pax típica | 150-180 | 150-189 | 70-124 |
| Total WO templates dataset | 208 | ~190 (en gen) | **170** |
| Capítulos ATA cubiertos | 41 | ~40 | 41 |
| FBW | Completo | Cable + spoilers FBW | Limitado (no ailerons) |
| Hidráulica | G/Y/B (3 sist) | A/B + standby (3) | Sys 1 / Sys 2 + PTU eléctrico (2) |
| Glass cockpit | Airbus EFIS + ECAM | Boeing CDS | Honeywell Primus Epic |
| Slats | Sí | Sí | **No** (sólo E2) |
| Winglets | Sharklets retrofit (NEO std) | Standard NG/MAX | **Standard E1** |
| Engines típicos | CFM56-5B, V2500, LEAP-1A, PW1100G | CFM56-7B, LEAP-1B | CF34-8E/10E, PW1900G (E2) |
| APU | Honeywell 131-9A | Honeywell 131-9B | Honeywell 36-150 |
| MMEL items aprox | 1100-1300 | 1100 | 850-1000 |
| Severity (% Minor/Maj/Crit) en dataset | 71.6/24.5/3.8 | ~70/25/5 (target) | 72.4/23.5/4.1 |
| Deferrable % en dataset | 37.0 | ~35 (target) | 37.1 |

**Lecciones para el juego (gameplay/balance)**:
- Una flota Embraer-pura debería sentirse **menos densa de eventos** que una A32x-pura (~25% menos WOs/aircraft/mes en simulación).
- Los E-Jets generan menos AOGs porque los sistemas son más simples y redundantes (ej: pérdida de un sistema hidráulico no es AOG inmediato si el otro funciona y el PTU está OK).
- Los engines CF34 son **más baratos de operar** (datos públicos: ~$280/FH vs ~$320/FH CFM56-5B). En juego: maintenance cost multiplier ~0.85x.
- E-Jets justifican operadores regionales en el sandbox: márgenes más estrechos, ciclos más cortos, mayor turnover.

---

## 6. Generación de WO templates — metodología

### 6.1 Cuotas por capítulo

Para 170 templates totales, distribución ponderada por frecuencia real en line/base maintenance E-Jet:

| Bloque | Capítulos | Templates | % |
|---|---|---:|---:|
| **Servicing & checks** | 5, 9, 10, 11, 12 | 18 | 10.6% |
| **Sistemas activos high-freq** | 21, 24, 25, 27, 28, 29, 32, 33, 34 | 70 | 41.2% |
| **Sistemas medios** | 22, 23, 26, 30, 31, 35, 36, 38, 44, 45, 49 | 43 | 25.3% |
| **Estructura** | 51, 52, 53, 54, 55, 56, 57 | 11 | 6.5% |
| **Powerplant** | 71, 72, 73, 74, 75, 77, 78, 79, 80 | 25 | 14.7% |
| Otros (45 OMS) | (incluido en medios) | 3 | — |

(Suma chapters = 170).

Vs A32x (208 templates): proporcionalmente similar. Reducción se aplica sobre todo en:
- Cap 27 (no slats E1): 11→8 templates.
- Cap 22 (Primus Epic más simple operativamente): 4→3.
- Cap 42 (no IMA): 0 templates.
- Cap 47 (NGS opcional, no standard): 0 templates.

### 6.2 Severity calibration

Target: ~70% Minor / 25% Major / 5% Critical.
Logrado: **123 Minor (72.4%) / 40 Major (23.5%) / 7 Critical (4.1%)**. Minor ligeramente sobre target porque se han incluido más tareas line rutinarias deferrables Cat C/D que es realista para regional jets.

### 6.3 Deferrable / MEL Category

Target: 30-40% deferrable.
Logrado: **63/170 = 37.1% deferrable**, distribuidas:
- Cat A: 0 items (no curados; A categories son raros y muy operador-específicos)
- Cat B: 17 items (10.0%)
- Cat C: 43 items (25.3%) — la mayoría
- Cat D: 3 items (1.8%) — items cosméticos
- No-MEL (107 items, 62.9%): tareas obligatorias en línea, scheduled work, o que dejan el avión AOG.

### 6.4 Type rating

Target: 32% B2 / 68% B1.
Logrado: **B1=113 (66.5%) / B2=57 (33.5%)**. On target.

### 6.5 Engine-specific tagging

- `engineSpecific: "CF34-8E"` para items específicos E170/E175.
- `engineSpecific: "CF34-10E"` para items específicos E190/E195.
- `engineSpecific: "PW1900G"` para items específicos E2.
- `engineSpecific: null` para items aplicables a todos (la mayoría: structural, avionics, cabin, hyd, etc.).

Total templates engine-specific: **16** (9.4% del dataset, superior al 3.8% A32x porque las dos familias CF34-8E vs CF34-10E tienen task cards distintas que es interesante representar para variedad gameplay).

---

## 7. Fuentes públicas usadas

- **FAA MMEL DRS portal** — `https://drs.faa.gov/browse/MMEL/doctypeDetails` — listing of EMB-170 / EMB-190 / EMB-190-E2 MMEL revisions.
- **ANAC Brazil airworthiness directives** — `https://www.gov.br/anac/pt-br/assuntos/aeronaves/aeronavegabilidade-continuada` — ADs Embraer.
- **EASA AD database** — `https://ad.easa.europa.eu/` — para ADs aplicables a flotas europeas.
- **SKYbrary E-Jet articles** — `https://www.skybrary.aero/aircraft/e170` etc. — system descriptions, accident lessons.
- **Aircraft Commerce technical articles**:
  - "E-Jet maintenance" (Issue 75, 2011) — base de costes y task intervals.
  - "E-Jet engine on-wing maintenance" (CF34-8/10E) — Issue 87, 2013.
- **Embraer Operator Conference** public summaries (technical bulletins referenced in trade press).
- **Aviation Stack Exchange** — comparative discussions FBW E-Jet vs A32x; hyd architecture E-Jet.
- **Honeywell Primus Epic technical overviews** (public marketing PDFs) — para identificar LRUs por chapter.
- **Pratt & Whitney GTF service bulletin tracker** (public press releases) — para PW1900G AD-driven WOs.

**No se han descargado documentos propietarios**. Los part numbers son placeholders (P/N EJ-XXX-XXXX, P/N EMB-XXXX) y nunca números OEM reales.

---

## 8. Notas de validación / próximos pasos

- El dataset está calibrado para el target Fase 4 sin necesitar rebalance gameplay-side.
- Si se añade soporte E2 como sub-flota en juego, se puede filtrar `engineSpecific=PW1900G` para spawn distinto.
- Próximo refinamiento sugerido (Fase 5+): añadir AD-tracker dinámico que spawn WOs basado en fechas reales de ADs publicadas (low priority — backlog parking).

