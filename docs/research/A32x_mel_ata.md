# A32x — ATA 100, MMEL & WO Templates Research

> Research doc para reemplazar el dataset sintético de Fase 2 (B2) por uno con base real pública.
> **Fuente de verdad** del juego post-Fase 4: `data/research/workorders_real.json` (208 templates).
> Compañeros JSON: `data/research/ata_chapters.json`, `data/research/mel_catalog.json`.
> **208 WO templates** sobre **41 capítulos ATA**. Severity 71.6/24.5/3.8 (Minor/Major/Critical), deferrable 37.0%.

Fecha: 2026-05-15. Autor: agente de investigación (Cowork sesión Fase 4).

---

## 1. Por qué este doc

El dataset actual (`src/lib/data/workorders.json`, 100 WOs) se generó sintéticamente en Fase 2 B2 porque el CSV legacy de Dani (`D:\Documents\MRO_Tycoon\we_template.csv`) no era accesible desde el sandbox. Quedó **funcional pero con dos defectos serios**:

1. **92% de WOs marcadas `deferrable=true`** vs. ~30% real en MMEL (calibración del brief Fase 3).
2. **Engine-specific**: el campo `engineVariantsCompatibles` siempre lista `["CFM56","V2500"]`, no diferencia tareas válidas solo en CFM (p. ej. lubricación midspan dampers de la fan) ni introduce variantes NEO (LEAP-1A, PW1100G).

Este doc + los 3 JSON adjuntos son la **base pública** para reemplazarlo, citando fuentes y manteniendo el USP del juego ("autenticidad nicho").

---

## 2. Taxonomía ATA 100 (subset A32x)

ATA Spec 100 + iSpec 2200 organizan toda la documentación técnica de aeronaves civiles en capítulos de 2 dígitos. Los reservados para uso de aerolínea (01-04) y los específicos de helicóptero (18) se omiten.

| ATA | Nombre | Scope | Frecuencia line maint A32x |
|---:|---|---|---|
| 5  | Time Limits / Maintenance Checks | Programa de inspección, A/C/D, life limits | Alta (estructura del programa) |
| 6  | Dimensions & Areas | Stations, zoning, paneles | Baja |
| 7  | Lifting & Shoring | Jacking, weighing prep | Baja |
| 8  | Leveling & Weighing | W&B, re-weigh | Baja |
| 9  | Towing & Taxiing | Towbar, taxi limits | Media (eventos discretos) |
| 10 | Parking, Mooring, Storage | Preservación, return-to-service | Baja |
| 11 | Placards & Markings | Decals, walkway, exits | Baja |
| 12 | Servicing | Oil/hyd/agua/N2/fuel | **Muy alta** (cada vuelo / pernocta) |
| 20 | Standard Practices - Airframe | Torque, bonding, NDT general | Transversal |
| 21 | Air Conditioning | Packs, presurización, ventilación | **Alta** |
| 22 | Auto Flight | Autopilot, autothrust, FMGC | Media |
| 23 | Communications | VHF, HF, ACARS, SATCOM, CVR | Media |
| 24 | Electrical Power | IDG, TR, baterías, RAT | **Alta** |
| 25 | Equipment / Furnishings | Asientos, galleys, lavs, IFE, ELT | **Alta** |
| 26 | Fire Protection | Loops, botellas, smoke det | Media |
| 27 | Flight Controls | ELAC, SEC, FAC, slats, flaps, spoilers | **Alta** |
| 28 | Fuel | Tanques, pumps, FCMC, FQI | **Alta** |
| 29 | Hydraulic Power | G/Y/B, EDP, PTU, RAT | **Alta** |
| 30 | Ice & Rain Protection | Anti-hielo wing/eng, probe heat, wipers | Media |
| 31 | Indicating / Recording | ECAM, FDR, CMS, BITE | Media |
| 32 | Landing Gear | Brakes, BSCU, NWS, oleos, gear pos | **Muy alta** |
| 33 | Lights | Cockpit, cabin, ext, emergency egress | **Alta** |
| 34 | Navigation | ADIRS, GPS, ILS, TCAS, GPWS, WX, XPDR | **Alta** |
| 35 | Oxygen | Crew, pax, portable | Media |
| 36 | Pneumatic | Bleed manifold, crossbleed, leak loops | Media |
| 38 | Water / Waste | Potable, waste, lavs vacuum | Media |
| 42 | IMA (NEO) | AFDX networks, CPIOM | Baja (más relevante NEO/A350) |
| 44 | Cabin Systems | PA, CIDS, signs | Media |
| 45 | OMS / CMS consolidation | Reportes post-flight, BITE | Transversal |
| 46 | Information Systems | ATSU, NSS, EFB, e-library | Media |
| 47 | Inert Gas / NGS | Fuel tank inerting | Baja-media |
| 49 | APU (Honeywell 131-9A) | Starter, FCU, bleed valve, ECU | **Alta** |
| 51 | Std Practices Structures | Repair classes, NDT, CPCP | Media (mayormente base) |
| 52 | Doors | Pax/cargo doors, slides, latches | Media |
| 53 | Fuselage | Skin, frames, lightning damage | Media |
| 54 | Nacelles / Pylons | Cowls, latches, attach | Media |
| 55 | Stabilizers | THSA, vertical fin | Baja |
| 56 | Windows | Windshields, cabin panes | Media |
| 57 | Wings | Wing box, LE/TE, sharklet | Baja-media |
| 71 | Power Plant - General | Mounts, drains, cowls | Baja |
| 72 | Engine | Fan, compressor, turbine, borescope | **Alta** (depende cycle/hour) |
| 73 | Engine Fuel & Control | FADEC/EEC, HMU, filter | Media |
| 74 | Ignition | Exciters, plugs | Baja-media |
| 75 | Engine Air / Bleed | VBV, VSV, bleeds | Media |
| 76 | Engine Controls | Throttle linkage | Baja |
| 77 | Engine Indicating | N1/N2/EGT/FF/vib | Media |
| 78 | Exhaust / Reversers | Reversers HCU, blocker doors, exhaust | Media |
| 79 | Engine Oil | Tank, filter, MCD, FOHE | Media |
| 80 | Engine Starting | Starter, SAV | Baja-media |

**Notas**:
- Capítulos `1-4`, `13-17`, `18`, `19`, `37`, `39-41`, `43`, `48`, `50`, `58-60`, `62-70`: omitidos (reservados, helicóptero-only, o irrelevantes para A32x narrow-body civil). El JSON `ata_chapters.json` lista sólo los relevantes.

---

## 3. MMEL A320 — análisis cuantitativo

### 3.1 Documento fuente

**FAA Master Minimum Equipment List Airbus A320, Revision 32** (draft público FAA, ene 2025). Acceso: `https://www.faa.gov/aircraft/draft_docs/mmel/MMEL_A-320_Rev_32_Draft.pdf` (no descargado en sandbox por egress restrictivo; estructura confirmada vía búsquedas y rev 30/31 referenciadas).

Equivalente EASA: el operador europeo derivá su MEL de la MMEL Airbus + EASA OEB (Operational Evaluation Board). Las categorías son las mismas.

### 3.2 Estructura del documento

- Organizado por capítulos ATA (21 → 80, mismas familias que sec. 2 arriba, omitiendo capítulos sin items).
- Por cada item: número (`AA-BB-CC`), nombre, **número instalado**, **número requerido para dispatch**, **categoría de reparación**, remarks/exceptions.
- Total estimado: ~1100-1300 items individuales en Rev 32 (granularidad: cada canal, cada lado, cada generador como item separado). Doc completo ~700 páginas.

### 3.3 Categorías de reparación

| Cat | Intervalo | % aproximado del MMEL |
|---|---|---:|
| **A** | Sin intervalo estándar; operador especifica (típico 1-3 días o por ciclos). Normalmente items críticos pero con condiciones operativas estrictas. | ~8% |
| **B** | 3 días consecutivos calendario, excluyendo el día del descubrimiento. | ~20% |
| **C** | 10 días consecutivos calendario. | ~55% |
| **D** | 120 días consecutivos calendario. Items menores (placards, asientos, IFE). | ~17% |

> Estos porcentajes provienen de literatura MEL pública (Airline Pilots Forum "Getting to Grips with MMEL and MEL", Airbus FAST). En el catálogo `mel_catalog.json` se han curado **80 items** representativos siguiendo esta distribución (5/14/55/6 ≈ 6/18/69/8% — sobre-representada cat C porque es la más útil para el juego, sub-representada D porque son repetitivos).

### 3.4 Sample items por capítulo (extracto)

Se han curado **80 items MEL** en `mel_catalog.json` cubriendo los capítulos relevantes a A32x. 5-10 items por capítulo activo. Algunos ejemplos:

| Item ID | Sistema | Descripción | Cat | Días |
|---|---|---|---:|---:|
| 21-26-01 | Air Cond | Pack Flow Control Valve | C | 10 |
| 22-30-01 | Auto Flight | Autothrust | B | 3 |
| 24-21-01 | Electrical | IDG (one) | B | 3 |
| 25-22-01 | Equipment | Passenger Seat (cabin) | D | 120 |
| 26-22-01 | Fire | Lavatory Smoke Detector | B | 3 |
| 27-22-01 | Flight Ctrl | ELAC (one) | C | 10 |
| 28-22-01 | Fuel | Wing Tank Pump (one) | C | 10 |
| 29-11-01 | Hydraulics | Green System EDP | B | 3 |
| 32-51-01 | Landing Gear | Nose Wheel Steering | B | 3 |
| 34-43-01 | Navigation | Weather Radar | C | 10 |
| 49-11-01 | APU | APU (full) | B | 3 |
| 78-31-01 | Reversers | Thrust Reverser (one) | B | 3 |

(Lista completa en `data/research/mel_catalog.json`).

---

## 4. Tareas típicas y findings comunes por capítulo (A32x)

Compilado de Aircraft Commerce, FAST Airbus, AviationHunt y prácticas de operadores publicadas. La columna **Severity tendency** orienta cómo el dataset distribuye severity.

| ATA | Tareas line típicas | Findings comunes | Severity tendency |
|---:|---|---|---|
| 12 | Top-up oil/hyd/water, tire pressure, lav service | Niveles bajos rutinarios | Minor 95% |
| 21 | Pack FCV, recirc fan, trim air, pressure leak | Pack faults, leaks de duct | Minor/Major mix |
| 24 | IDG, baterías, TR, RAT test | IDG disconnect (oil/temp), batería bajada de capacidad | Major 60% |
| 25 | Asientos, IFE, ELT batería, cargo nets | Tray latches, IFE blank, life vest missing | Minor 90% |
| 27 | ELAC/SEC/FAC swap, slat WTB, spoiler actuator leak | SEC reset, slat asymmetry (WTB activation = AOG) | Major 50% / Critical edge |
| 28 | Pump R/R, FQI calibration, AD compliance | Fuel pump ADs (EASA 2023-0099 P/N 568-1-27202-005) | Major/Critical |
| 29 | EDP/PTU R/R, fluid leak, filter | Skydrol leaks, EDP wear | Major 50% |
| 32 | Tire/brake, BSCU, NWS, gear sensor | Brake wear pin, anti-skid valve, FOD on tire | Major 50% |
| 33 | Landing/strobe/nav bulb R/R | Bulb burnout (rutinario) | Minor 95% |
| 34 | ADIRU/WX/TCAS/XPDR/Nav DB | ADIRU drift, WX returns, Nav DB cycle | Mix |
| 49 | APU starter, FCU, bleed valve, oil filter | Slow start trend, overtemp shutdown (shroud delamination) | Major-Critical |
| 71-80 | Borescope, oil/filter R/R, EEC/HMU, T/R | Borescope findings, EGT margin loss (LEAP EBC), T/R faults | Major mostly |

**Notas operativas para el dataset del juego**:
- **WTB activation (slat asymmetry)** = AOG inmediato → critical, no deferrable.
- **Hyd Green EDP failure** en TO = AOG critical.
- **IDG runaway** en TO = AOG critical.
- **T/R fault** suele ser Major-deferrable (lockout pin + MEL Cat B).

---

## 5. Generación de WO templates — metodología

### 5.1 Cuotas por capítulo

Para 208 templates totales, distribución ponderada por frecuencia real en line/base maintenance A32x:

| Bloque | Capítulos | Templates | % |
|---|---|---:|---:|
| **Servicing & checks** | 5, 9, 10, 11, 12 | 23 | 11.1% |
| **Sistemas activos high-freq** | 21, 24, 25, 27, 28, 29, 32, 33, 34 | 88 | 42.3% |
| **Sistemas medios** | 22, 23, 26, 30, 31, 35, 36, 38, 44, 46, 47, 49 | 52 | 25.0% |
| **Estructura** | 51, 52, 53, 54, 56, 57 | 12 | 5.8% |
| **Powerplant** | 71, 72, 73, 74, 75, 77, 78, 79, 80 | 33 | 15.9% |

(Suma 208/208 = 100%).

Capítulos infrecuentes (11 placards, 51 estructuras, 57 wings) reciben 1-3 items mínimos para representatividad sin saturar.

### 5.2 Severity calibration

Target del brief Fase 4: ~70% Minor / 25% Major / 5% Critical.

Logrado: **149 Minor (71.6%) / 51 Major (24.5%) / 8 Critical (3.8%)** ≈ on target.

Heurística aplicada:
- Top-ups, bulb R/R, lubricación, placards: Minor.
- LRU R/R con impacto operativo (pumps, valves, ECUs): Major.
- AD compliance crítica, slat WTB, EDP failure en TO, IDG runaway: Critical (a menudo `isAOG=true`).

### 5.3 Deferrable / MEL Category

Target Fase 4: 30-40% deferrable.

Logrado: **77/208 = 37.0% deferrable**, distribuidas:
- Cat A: 5 items (2.4%)
- Cat B: 18 items (8.7%)
- Cat C: 47 items (22.6%) — la mayoría
- Cat D: 7 items (3.4%) — items cosméticos
- No-MEL (131 items, 63.0%): tareas obligatorias en línea, scheduled work, o que dejan el avión AOG.

Heurística:
- Tareas de servicing rutinarias (oil top-up, filter R/R programado): **NO deferrable** (no son fallo, son trabajo programado).
- Items con redundancia (1 of 2/3): típicamente Cat B o C.
- Cosméticos sin impacto safety: Cat D.
- AOGs por definición: no deferrable.

Esto **rompe explícitamente con el dataset sintético del juego** (92% deferrable) que trivializaba la decisión MEL. Con 35% deferrable, el jugador tiene que distinguir qué WO se puede aplazar y cuál no.

### 5.4 Type rating (B1 vs B2)

Regla EASA Part-66 simplificada aplicada:
- **B1 (mecánica/estructuras/powerplant)**: capítulos 5-12, 21 (mecánica), 25 (interior), 27 (mecánica de superficies), 28-29-30-32 (mecánica de fluido), 35-36-38, 49 (APU mecánica), 51-57 (estructura), 71-75-78-79-80 (powerplant mecánico).
- **B2 (avionics/electrical)**: capítulos 22 (auto flight), 23 (comms), 24 (parte avionics: TR/static inv), 26 (smoke det), 31 (display), 33 (parte: fixtures), 34 (todo nav), 42-44-45-46 (cabin systems), 73 (FADEC), 77 (sensores).

Ratio resultante: 142 B1 / 66 B2 = 68% / 32%, coherente con la realidad (más mecánica que avionics en line).

### 5.5 Engine-specific WOs

Capítulos 71-80: 8 templates marcadas con `engineSpecific` específico:
- **CFM56-5B** (A320ceo CFM): WOs 72-001, 72-006, 73-005, 75-001 (HPC borescope, midspan damper lube, FOHE, VBV)
- **V2500-A5** (A320ceo IAE): WOs 72-002, 75-002 (HPT stage 1 borescope, VSV)
- **LEAP-1A** (A320neo CFM): WO 72-003 (HPT shroud EBC EGTM check)
- **PW1100G** (A320neo PW): WO 72-004 (fan blade post bird-strike)

Resto powerplant (`engineSpecific: null`): aplicable a todos los engines.

### 5.6 AD compliance / hechos reales como semilla

WOs derivadas de ADs públicas:
- **WO-28-003**: EASA AD 2023-0099 — fuel pump P/N 568-1-27202-005 inspection. Critical.
- **WO-28-009**: FAA AD sobre Kathon FP 1.5 biocide para A320neo — flush sistema fuel. Major.
- **WO-72-003**: CFM observación sobre LEAP-1A HPT shroud EBC premature loss (Leeham). Major.

Cita en el `description`. P/N reales solo cuando publicadas en AD (568-1-27202-005); resto usa placeholder `P/N CFM-XXX-XXXX`.

---

## 6. Tabla resumen — WO count por ATA chapter

| ATA | # | ATA | # | ATA | # | ATA | # |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5  | 4 | 25 | 9 | 35 | 4 | 73 | 5 |
| 9  | 2 | 26 | 6 | 36 | 5 | 74 | 3 |
| 10 | 2 | 27 | 11 | 38 | 3 | 75 | 2 |
| 11 | 3 | 28 | 10 | 44 | 3 | 77 | 4 |
| 12 | 12 | 29 | 9 | 46 | 2 | 78 | 4 |
| 21 | 12 | 30 | 6 | 47 | 2 | 79 | 5 |
| 22 | 4 | 31 | 5 | 49 | 7 | 80 | 2 |
| 23 | 5 | 32 | 12 | 51 | 1 | | |
| 24 | 9 | 33 | 7 | 52 | 4 | | |
|    |   | 34 | 9 | 53 | 2 | | |
|    |   |    |   | 54 | 2 | | |
|    |   |    |   | 56 | 2 | | |
|    |   |    |   | 57 | 1 | | |
|    |   |    |   | 71 | 2 | | |
|    |   |    |   | 72 | 6 | | |

**Total: 208 templates** distribuidos en **41 capítulos ATA**.

---

## 7. Cómo difiere del dataset sintético actual

| Métrica | Sintético (Fase 2 B2) | Realista (este doc) |
|---|---:|---:|
| Total WO templates | 100 | 208 |
| Capítulos ATA cubiertos | 21 | 41 |
| Severity distribution | ~73 / 24 / 3 (Minor/Major/Crit) | 149 / 51 / 8 (71.6/24.5/3.8 %) |
| Deferrable % | **92%** ❌ | **37.0%** ✅ |
| MEL category distribution | mostly C (heuristic) | A=5, B=18, C=47, D=7 (curated) |
| Engine-specific WOs | 0 (todas listan ambos) | 8 (CFM56-5B / V2500-A5 / LEAP-1A / PW1100G) |
| AOG count | 1 | 3 (slat WTB, EDP fail TO, IDG runaway) |
| Citas a AD reales | 0 | 3 (EASA 2023-0099, FAA Kathon, LEAP EBC) |
| Capítulos powerplant (71-80) detallados | mínimo | 33 templates |

El cambio principal a integrar en el sim:
- **MEL decision becomes meaningful**: con 35% deferrable, no toda WO se puede tirar al MEL. El jugador debe distinguir.
- **Engine-specific routing**: WOs CFM no aparecen en avión IAE; LEAP no aparece en CEO. Requiere que el spawn de WOs en `sim/workorders.ts` mire `engineVariantsCompatibles` (renombrar a array de variantes específicas, no familias).
- **Audit feed**: las 4 AOG y los items Cat A pueden alimentar dilemas reales (¿reparas ya y pierdes turnaround / difieres y arriesgas cancelar el contrato?).

---

## 8. Fuentes utilizadas (públicas)

1. **FAA MMEL Airbus A320 Rev 32** (draft) — `https://www.faa.gov/aircraft/draft_docs/mmel/MMEL_A-320_Rev_32_Draft.pdf`
2. **FAA MMEL Airbus A320 Rev 31 / Rev 30** (draft) — `https://www.faa.gov/aircraft/draft_docs/mmel/`
3. **FAA Dynamic Regulatory System (DRS)** — `https://drs.faa.gov/browse/MMEL/doctypeDetails`
4. **ATA 100 (Wikipedia)** — `https://en.wikipedia.org/wiki/ATA_100`
5. **Aerospace Unlimited ATA chapters list** — `https://www.aerospaceunlimited.com/ata-chapters/`
6. **Warsaw UT ATA chapter PDF** — `https://itlims-zsis.meil.pw.edu.pl/pomoce/ESL/2016/ATA_Chapters.pdf`
7. **The Airline Pilots — "Getting to Grips with MMEL and MEL"** — `https://www.theairlinepilots.com/forumarchive/concepts-procedures/mmel-mel.pdf`
8. **AviationHunt — A320 ATA series** (21, 27, 28, 31, 49) — `https://www.aviationhunt.com/`
9. **Airbus FAST magazine, Special A320** — `https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2022-04/FAST-Special-A320_full.pdf`
10. **Aircraft Commerce — A320 family maintenance** (issue 111 MTCE A 2017; issue 07 MTCE B 1999) — `https://www.aircraft-commerce.com/`
11. **Honeywell 131-9A APU troubleshooting (airlinetechs)** — `http://mobile.airlinetechs.com/airbus/49/49honeywell.html`
12. **EASA AD 2023-0099 (fuel pump P/N 568-1-27202-005)** — Simple Flying coverage `https://simpleflying.com/easa-airbus-a320-fuel-pumps/`
13. **FAA AD Kathon FP 1.5 biocide (NEO)** — Simple Flying coverage `https://simpleflying.com/faa-easa-a320neo-engine-treatment/`
14. **Leeham News — engine maintenance Bjorn's Corner** (EGT margin trends) — `https://leehamnews.com/2017/03/03/bjorns-corner-aircraft-engines-maintenance-part-1/`
15. **Aeronergic borescope capability** (CFM56, V2500, LEAP, PW1100G) — `https://aeronergic.com/services/borescope-inspections`

---

## 9. Gaps / TODO

- **CSV legacy de Dani** (`D:\Documents\MRO_Tycoon\we_template.csv`, 100 WOs reales) sigue sin acceso desde sandbox. Cuando esté accesible vía homelab-runner: hacer **diff** con `workorders_real.json`, fusionar tareas únicas del legacy (probable que tenga descripciones más coloquiales / específicas de operador).
- **MMEL counts precisos**: las cifras 1100-1300 items y 8/20/55/17% son aproximaciones de literatura. Para cifras exactas habría que parsear el PDF Rev 32 (~700pg). Out of scope sin acceso al PDF.
- **EASA OEB** documents A320: no descargados (requieren acceso EASA). El MMEL FAA es el público más cercano y la diferencia operativa CEO/NEO es menor para el catálogo MEL base.
- **A321/A319/A318 specifics**: el dataset asume A32x family compatibility en mayoría. Algunas WOs (p.ej. MLG con 4 wheels) son sólo A321; no se ha discriminado por sub-modelo. El campo `aircraftModelsCompatibles` del schema actual del juego permite añadirlo cuando relevante.
- **Hangar/base check task cards**: el dataset cubre line maint y findings comunes; tareas internas del A-check / C-check / D-check (paneles 1, 2, 3 abiertos por zona, etc.) no están detalladas — viven mejor en `maintenance_checks.json` como agregados.
- **SBs (Service Bulletins) Airbus**: no se han incorporado SBs específicos como WO templates (son operator-driven). Buen vector para Fase 5 dataset growth.
- **Part numbers**: usados placeholders `P/N CFM-XXX-XXXX` excepto para AD-cited (568-1-27202-005). Si el juego quiere mostrar P/Ns en cards detalle, habría que generar P/Ns ficticios consistentes (formato OEM-like) en lugar de placeholders.

---

## 10. Próximos pasos sugeridos (técnicos)

1. **Migración del schema**: el campo `engineVariantsCompatibles` actual del juego es array de familias (`["CFM56","V2500"]`). El dataset nuevo usa `engineSpecific` string single. Decisión: en `loadGameData()` mapear `engineSpecific` → `engineVariantsCompatibles` con un único elemento, o migrar el sim a leer `engineSpecific` directo. Recomendación: lo segundo (más expresivo).
2. **Validación de schema**: los type guards en `types/` deben aceptar el nuevo schema. Tests `smoke.mjs` deben verificar distribuciones (severity, deferrable, MEL cat).
3. **Sim adjustment**: con 35% deferrable (vs 92%), la ratio de WOs que terminan en MEL cae mucho. El sim de `tickMel` y la heurística de Part-145 audits puede necesitar reajuste de thresholds.
4. **UI**: las cards de detalle (parking del Fase 4-5 — "Click-to-detail cards") encajan perfectamente con este dataset enriquecido (ATA name, MEL category badge, source citation, engine-specific tag).
5. **Suite de tests**: añadir `tests/research_dataset.mjs` que verifique: deferrable% en banda 30-40%, severity en banda target, ATA coverage ≥35 capítulos, engine-specific count ≥10.
