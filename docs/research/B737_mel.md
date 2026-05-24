# Boeing 737 — MMEL & WO Templates Research

**Aircraft scope:** Boeing 737-100/-200/-300/-400/-500/-600/-700/-800/-900/-900ER (NG family) + 737 MAX 7/8/9/10.
**Engines:** CFM56-7B (NG), LEAP-1B (MAX).
**Output files:**
- `data/research/mel_catalog_B737.json` — 87 sample MEL items.
- `data/research/workorders_real_B737.json` — 170 WO templates.

Mismo schema que el A32x (`mel_catalog.json` / `workorders_real.json`). La taxonomía ATA es universal — `data/research/ata_chapters.json` se reutiliza tal cual.

---

## 1. MMEL B737 — análisis del corpus

### 1.1 Documentos de referencia

| Documento | Revisión | Cobertura | Tamaño aprox. |
|-----------|---------|-----------|---------------|
| FAA MMEL B-737 | Rev 62 (2022-11-28) | -100 → -900ER (NG y clásicos) | ~750 páginas |
| FAA MMEL B-737 MAX | Rev 6 Draft (2024-04-23) | -7/-8/-8200/-9/-10 | ~250 páginas |
| EASA MMEL Supplement | rev 19 (2013) | -600/-700/-800/-900 | suplemento |
| Transport Canada TCS | Rev 62 mirror | NG family | suplemento |

**Total items individuales en MMEL B-737 Rev 62:** ~1300-1500 (estimación a partir de tabla de contenidos y muestreos por capítulo). Más voluminoso que el MMEL A320 (~1100-1300 items) por dos razones:
1. Cubre 9 variantes de fuselaje en un solo documento (-100 a -900ER), con tablas variant-specific por item.
2. Histórico legacy más largo (1968 vs 1988 del A320) → más items deprecated arrastrados.

El MMEL MAX añade ~200 items adicionales específicos: MCAS / AOA disagree alerting, Engine Indicating Crew Alerting System (EICAS-equivalent en MAX), Load Reduction Device (LRD), door plug indication (-9), etc.

### 1.2 Distribución por categoría (estimación)

| Categoría | % aprox MMEL B-737 | % aprox MMEL A320 | Notas |
|-----------|--------------------|---------------------|-------|
| A (operator-defined) | ~7% | ~8% | Casi calcado |
| B (3 días) | ~22% | ~20% | Ligeramente más en B737 (más items críticos por fly-by-cable vs FBW) |
| C (10 días) | ~53% | ~55% | Mayoría — calcado |
| D (120 días) | ~18% | ~17% | Cabin/cosmetic items, calcado |

La distribución es prácticamente idéntica a A320 — ambos son narrow-bodies maduros con MMELs pulidos por la FAA durante décadas. La diferencia real está en **cuáles** items existen, no en cuántos por categoría.

### 1.3 Sample items por capítulo (catalog generado: 87 items)

Distribución del sample en `mel_catalog_B737.json`:

| ATA | Capítulo | Items sample |
|-----|----------|--------------|
| 21 | Air Conditioning | 5 |
| 22 | Auto Flight | 3 |
| 23 | Communications | 4 |
| 24 | Electrical Power | 4 |
| 25 | Equipment / Furnishings | 4 |
| 26 | Fire Protection | 4 |
| 27 | Flight Controls | 5 |
| 28 | Fuel | 5 |
| 29 | Hydraulic Power | 4 |
| 30 | Ice & Rain | 4 |
| 31 | Indicating | 3 |
| 32 | Landing Gear | 6 |
| 33 | Lights | 3 |
| 34 | Navigation | 9 (+1 MAX-specific AOA) |
| 35 | Oxygen | 2 |
| 36 | Pneumatic | 3 |
| 38 | Water/Waste | 2 |
| 44 | Cabin Systems | 2 |
| 46 | Information Systems | 1 |
| 49 | APU | 3 |
| 52 | Doors | 2 (1 MAX-9 specific) |
| 56 | Windows | 1 |
| 73-80 | Powerplant | 6 (CFM56-7B / LEAP-1B agnostic salvo notado) |

---

## 2. Comparativa B737 vs A32x — qué cambia y qué no

### 2.1 Qué NO cambia (taxonomía universal)
- ATA chapters: idénticos. ATA 21 = Air Conditioning en cualquier avión.
- Estructura del MMEL: mismo formato FAA con ID `XX-YY-ZZ`, categorías A/B/C/D, intervalos de rectificación.
- Type ratings B1 (mech/struct/powerplant) vs B2 (avionics/electrical) — categorías EASA Part 66 universales.
- Lógica de mantenimiento: A-check / C-check / D-check con triggers por hora/ciclo/calendario.

### 2.2 Diferencias clave

| Sistema | A32x | B737 | Impacto en WO templates |
|---------|------|------|---------------------------|
| **Hidráulico (29)** | Green / Yellow / Blue + PTU | System A / System B / Standby + PTU rudder | Distinto vocabulario; Skydrol LD-4 común |
| **Flight Controls (27)** | Fly-by-wire (ELAC/SEC/FAC) | Cable + hyd convencional (NG); MAX añade FBW spoilers | B737 tiene WO de stab trim cutout (crítico post-MCAS), no tiene WO de ELAC/SEC/FAC |
| **Engine Control (73)** | EEC ch A/B (FADEC) | EEC ch A/B (FADEC) | Idéntico concepto; LRUs distintos |
| **Pneumatic (36/75)** | HP/IP valves + precoolers | 5th/8th stage tap + PRSOV + VBV/VSV scheduling | B737 tiene WO específicos para 8th stage / VBV (NG) |
| **APU (49)** | Honeywell 131-9A | Honeywell APS3200 / GTCP85 (NG) / APS5000-class (MAX) | Mismas operaciones (oil, bleed valve, fire bottle), distintos LRUs |
| **Avionics (42/45/46)** | IMA + AFDX (NEO), ATSU | Federated ARINC 429 + CDS (Common Display System) | B737 tiene menos items en 42/45/46; A32x NEO mucho más denso aquí |
| **Fuel (28/47)** | NGS (Air Separation Module) en chapter 47 | FRM mandado post-SFAR 88 (Boeing CTC-Inerting), no chapter 47 dedicado | B737 tiene WO de CDCCL inspection en chapter 28 |
| **Indicating (31)** | ECAM | CDS (Common Display System), no ECAM | Distinto sistema de mensajes pero misma idea (BITE) |
| **Display laws** | Normal / Alternate / Direct law | N/A en NG; MAX no introduce | A32x tiene WO ELAC/SEC related; B737 no |
| **Yaw damper** | FAC | SMYD (Stall Management Yaw Damper) | Distinto LRU en B737 |
| **Landing Gear (32)** | MLG/NLG estándar; gravity extension cable | MLG/NLG; gravity extension manual handle ~B737-specific drama (manual lever pulls cable) | B737 tiene WO específico de "gravity extension manual handle test" |

### 2.3 ADs y SBs específicos B737 incluidos como WO templates

- **Pickle fork outboard chord crack** (NG, AD 2019-20-08): WO-B737-32-004 (NDT inspection) + WO-B737-32-005 (repair fitting installation, ~40h, AOG). Aplicable a NG con >22,600 cycles. 5% de los primeros 500 inspeccionados resultaron positivos. Causa probable: stress redistribution por adición de winglets.
- **MAX 9 mid-exit door plug** (AD 2024-02-51): WO-B737-52-003 (visual inspection + bolt torque check) y WO-B737-52-004 (R/R retention bolts). Post-Alaska 1282, Jan 2024. United encontró bolts sueltos en 5+ aviones tras la directiva.
- **MCAS / AOA disagree** (AD 2018-23-51 superseded por RTS Summary 2020): WO-B737-34-006 (handling damage check) + WO-B737-34-007 (AOA vane R/R, MAX, CRITICAL+AOG).
- **LEAP-1B Load Reduction Device (LRD) / cabin smoke** (NTSB urgent rec 2025-06): WO-B737-72-005 (software update). Tras incidente Southwest 737-8 Dec 2023 (smoke en cabina post bird strike).
- **Fuel tank wiring CDCCL** (SFAR 88 / 14 CFR Part 26 Subpart D): WO-B737-28-006 (mandatory inspection del wiring conduit en tanque central, MAJOR, no deferrable). Boeing reportó arcing en aviones >50,000 FH.

---

## 3. Metodología de generación de WO templates

### 3.1 Cuotas por capítulo

Calibradas a frecuencia real de line + base maintenance B737. Más densos en:
- ATA 32 (Landing Gear, 11 templates) — incluye 2 templates de pickle fork
- ATA 12 (Servicing, 10) — top-ups y servicings de turnaround
- ATA 27 (Flight Controls, 9), 28 (Fuel, 9), 29 (Hyd, 9), 21 (A/C, 9) — sistemas de mayor cadencia
- ATA 24 (Electrical, 7), 25 (Furnishings, 7), 34 (Nav, 7) — densidad media-alta

Menos densos en:
- ATA 11 (Placards, 3), 51 (Standard Practices, 0), 53 (Fuselage, 2), 56 (Windows, 2) — bajo turnover
- ATA 47 (Inert Gas) — omitido (no hay capítulo dedicado en B737, FRM se trata bajo 28)
- ATA 5 (Time Limits, 4) — solo task cards meta

### 3.2 Distribución alcanzada vs diana

| Métrica | Diana | Alcanzado | Status |
|---------|-------|-----------|--------|
| Total templates | ≥150 | 170 | OK (+13%) |
| Severity Minor | ~70% | 68.8% (117) | OK |
| Severity Major | ~25% | 27.1% (46) | OK |
| Severity Critical | ~5% | 4.1% (7) | OK |
| Deferrable rate | 30-40% | 34.7% (59) | OK (centro del rango) |
| Type rating B2 | ~32% | 25.3% (43) | Algo bajo (ver gap §5) |
| Type rating B1 | ~68% | 74.7% (127) | Algo alto |
| Engine-specific | n/a | 16 (9.4%) | OK |
| AOG WOs | n/a | 5 | OK (door plug, IDG disconnect, pickle fork, MCAS, repair fitting) |
| Chapters covered | n/a | 38 | OK |

### 3.3 Naming convention
- ID prefix: `WO-B737-XX-NNN` (XX = ATA chapter, NNN = sequence). Distingue fácilmente del catálogo A32x que usa `WO-XX-NNN`.
- Part numbers: placeholders `P/N BA-737-XXXXX`, `P/N CFM-XXX-XXXX`, `P/N LEAP-XXX-XXXX`. Nunca P/Ns reales OEM.
- `engineSpecific`: `null` si aplica a ambos motores; `"CFM56-7B"` (NG) o `"LEAP-1B"` (MAX) cuando procede.

---

## 4. Tabla resumen WO count por capítulo

| ATA | Nombre | Templates | Severity mix (Mi/Ma/Cr) | Notas B737 |
|-----|--------|-----------|---------------------------|-------------|
| 5 | Maintenance Checks | 4 | 3/1/0 | Task cards A/C/D |
| 9 | Towing | 2 | 1/1/0 | Tug coupling damage |
| 10 | Storage | 2 | 2/0/0 | |
| 11 | Placards | 3 | 3/0/0 | Cosmetic, bajo D |
| 12 | Servicing | 10 | 10/0/0 | Oil, hyd, water, tires, SOAP |
| 21 | Air Conditioning | 9 | 7/2/0 | Pack valve, OFV, recirc |
| 22 | Auto Flight | 4 | 3/1/0 | FCC, A/T servo, MCP, SMYD |
| 23 | Communications | 4 | 4/0/0 | VHF, CVR, ACARS, ACP |
| 24 | Electrical | 7 | 5/1/1 | IDG drama, GCU, batt |
| 25 | Furnishings | 7 | 6/1/0 | Cushions, oven, slide |
| 26 | Fire Protection | 5 | 3/2/0 | Fire loops, bottles, smoke det |
| 27 | Flight Controls | 9 | 4/5/0 | Stab trim cutout (post-MCAS) |
| 28 | Fuel | 9 | 5/4/0 | **CDCCL inspection** (SFAR 88) |
| 29 | Hydraulic | 8 | 4/4/0 | System A/B/Standby (no Green/Yellow/Blue) |
| 30 | Ice & Rain | 5 | 2/3/0 | WAI, TAI, pitot heat |
| 31 | Indicating | 4 | 4/0/0 | DFDR, CDS DU |
| 32 | Landing Gear | 11 | 7/2/2 | **Pickle fork (AD 2019-20-08) ×2** |
| 33 | Lights | 5 | 5/0/0 | Bulbs y emergency battery |
| 34 | Navigation | 7 | 3/3/1 | IRS, WX, TCAS, EGPWS, **AOA** |
| 35 | Oxygen | 3 | 3/0/0 | |
| 36 | Pneumatic | 4 | 3/1/0 | PRSOV, crossbleed, leak loop |
| 38 | Water/Waste | 2 | 2/0/0 | |
| 44 | Cabin Systems | 2 | 2/0/0 | PA, interphone |
| 46 | Information Sys | 1 | 1/0/0 | EFB bracket |
| 49 | APU | 5 | 2/3/0 | Hot start, AGB seal, bleed valve |
| 52 | Doors | 4 | 1/1/2 | **MAX 9 door plug (AD 2024-02-51) ×2** |
| 53 | Fuselage | 2 | 1/1/0 | Lightning strike, dent |
| 54 | Nacelles/Pylons | 2 | 1/1/0 | Cowl latch, pylon bolt torque |
| 56 | Windows | 2 | 1/1/0 | WS heat, cabin pane |
| 71 | Powerplant gen | 2 | 2/0/0 | CFM56-7B fan blade lube |
| 72 | Engine | 5 | 1/3/1 | BSI HPT (CFM56-7B y LEAP-1B), HPT R/R, **LRD SW update** |
| 73 | Engine Fuel & Ctrl | 4 | 2/2/0 | EEC, HMU, fuel filter |
| 74 | Ignition | 2 | 2/0/0 | Exciter, plug |
| 75 | Bleed Air (eng) | 3 | 3/0/0 | 8th stage, VBV, VSV (CFM56-7B) |
| 77 | Engine Indicating | 3 | 3/0/0 | N1 vib, EGT harness, N2 |
| 78 | Exhaust/Reverser | 3 | 1/2/0 | T/R deactivation |
| 79 | Engine Oil | 4 | 4/0/0 | Filter, chip detector, transmitters |
| 80 | Engine Starting | 2 | 0/2/0 | SAV, starter R/R |
| **TOTAL** | | **170** | **117/46/7** | |

---

## 5. Gaps y trabajo pendiente

- **Type rating B2 al 25.3%**, target 32%. Razón: muchos WOs de avionics (sensors, transmitters) los hace mecánico B1 en MROs reales si la pieza es line-replaceable; sólo bench test en shop requiere B2. Si se quiere subir, mover ~10 más WOs de chapters 31/34/77 a B2.
- **Chapter 51 (Standard Practices Structures)** sin templates. Realista — son procedimientos genéricos, no work orders. Igual decisión que A32x dataset.
- **Sample MEL items 87**, real MMEL son ~1300-1500. Suficiente para seed; ampliable si el simulador quiere más granularidad.
- **No hay items para -100/-200 classics**: justificado — fleet operativa global ~0% en 2026, solo de interés histórico.
- **MAX 10 cert status** asumido EIS, items genéricos LEAP-1B sirven.

---

## 6. Fuentes citadas

### MMEL oficiales
- [FAA MMEL B-737 Rev 62 Draft (2022-11-28)](https://www.faa.gov/sites/faa.gov/files/2022-07/MMEL_B-737_Rev_62_Draft.pdf)
- [FAA MMEL B-737 MAX Rev 6 Draft (2024)](https://www.faa.gov/aircraft/draft_docs/mmel/MMEL_B-737_MAX_Rev_6_Draft)
- [EASA MMEL Supplement B737 600/700/800/900 (2013)](https://www.easa.europa.eu/sites/default/files/dfu/EASA-MMEL(S)-Boeing_737,_600,_700,_800,_900-19-27022013.pdf)
- [Transport Canada B737 MMEL Rev 62](https://wwwapps2.tc.gc.ca/saf-sec-sur/2/MEL-LEM/tcbbs/mmels/B_737.pdf)
- [FAA Dynamic Regulatory System (DRS) MMEL browser](https://drs.faa.gov/browse/MMEL/doctypeDetails)

### ADs y eventos críticos
- FAA AD 2019-20-08 — Boeing 737 NG pickle fork (covered in [aerotime](https://www.aerotime.aero/articles/24050-boeing-737-ng-affected-pickle-forks), [b737.org.uk picklefork.htm](http://www.b737.org.uk/picklefork.htm), [Aviation Maintenance Magazine](https://avm-mag.com/boeing-737-ng-pickle-fork-cracking-issue))
- FAA AD 2024-02-51 — MAX 9 mid-exit door plug ([NTSB report](https://www.npr.org/2024/02/06/1229528737/ntsb-boeing-737-max-9-alaska-airlines-door-plug-missing-bolts), [Leeham News](https://leehamnews.com/2024/02/07/ntsb-confirms-door-plyg-bolts-missing/))
- [FAA Boeing 737 MAX RTS Summary (Aug 2022)](https://www.faa.gov/sites/faa.gov/files/2022-08/737_RTS_Summary.pdf) — MCAS / AOA changes
- [NTSB Recommendation 2025-06-18 LEAP-1B LRD](https://www.ntsb.gov/news/press-releases/Pages/NR20250618.aspx) ([Flight Global coverage](https://www.flightglobal.com/airframers/ntsb-investigating-737-max-smoke-incident-amid-leap-1b-load-reduction-device-scrutiny/160866.article))
- SFAR 88 / 14 CFR Part 26 Subpart D — fuel tank flammability ([eCFR](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-26/subpart-D), [Federal Register 2008](https://www.federalregister.gov/documents/2008/07/21/E8-16084/reduction-of-fuel-tank-flammability-in-transport-category-airplanes))

### Sistemas técnicos
- [b737.org.uk (Chris Brady)](http://www.b737.org.uk/) — hidráulica, fuel, landing gear, MMEL, MCAS
- [Transglobal Training — Boeing 737 Hydraulic System](https://www.transglobaltraining.com/boeing-737-hydraulic-system/)
- [Aircraft Systems Tech — B737 hydraulics](https://www.aircraftsystemstech.com/p/large-aircraft-hydraulic-systems.html)
- [studyaircrafts.com B737 Hydraulic System](https://www.studyaircrafts.com/post/boeing-737-hydraulic-system)
- [b737.org.uk Fuel System](http://www.b737.org.uk/fuel.htm)
- [b737.org.uk Landing Gear](http://www.b737.org.uk/landinggear.htm)
- [b737.org.uk MCAS](http://www.b737.org.uk/mcas.htm)
- [Aviation Hunt — Boeing 737 MEL Items](https://www.aviationhunt.com/boeing-737-mel-items/)
- [Aviation Hunt — Boeing 737 MAX MEL Items](https://www.aviationhunt.com/boeing-737-mel-items/)

### Engine technical
- [Borescope Inspection Guide GEK 119346 (CFM56-5B / -7B HPT)](https://www.scribd.com/document/531654635/Hpt-Bsi-Guide-Gek-119346)
- [Aircraft Commerce CFM56-7B specifications (Issue 58)](https://www.scribd.com/document/644944761/ISSUE58-CFM56-7B-GUIDE-pdf)
- ResearchGate — Yang et al. "Borescope inspection for HPT blade of CFM56-7B engine" (2018)

---

**Próxima iteración sugerida:** si el simulador quiere realismo en assignment de mecánicos, considerar añadir campo `requiresLicense` (ej. `"CFM56-7B Type Course"`, `"LEAP-1B differences"`, `"AD 2024-02-51 training"`) para forzar matching de skills más fino que solo B1/B2.
