# Airbus A32x Family — Public Reference Specs

**Propósito:** base de datos pública para alimentar el catálogo de aeronaves del juego MRO Tycoon. Datos cruzados entre Wikipedia, Airbus media kits, EASA TCDS y publicaciones especializadas (Aircraft Commerce, FlightGlobal, Simple Flying). Cuando una cifra varía entre fuentes, se elige la más conservadora/pública.

**Última actualización:** 2026-05-15

> **Importante:** Datos para uso de juego, no para operación real. Para AMM/MPD acudir a documentación propietaria del fabricante.

---

## 0. Tabla resumen de variantes

| Variante  | Family | EIS     | MTOW (kg) | OEW (kg) | Range (nm) | Pax 2-class | Pax max | Length (m) | Wingspan (m) | Engines                       |
|-----------|--------|---------|-----------|----------|------------|-------------|---------|------------|--------------|-------------------------------|
| A319ceo   | A32x   | 1996-04 | 75 500    | 40 800   | 3 700      | 124         | 156     | 33.84      | 35.80*       | CFM56-5B / V2500-A5           |
| A320ceo   | A32x   | 1988-04 | 78 000    | 42 600   | 3 300      | 150         | 180     | 37.57      | 35.80*       | CFM56-5B / V2500-A5           |
| A321ceo   | A32x   | 1994-01 | 93 500    | 48 500   | 3 200      | 185         | 220     | 44.51      | 35.80*       | CFM56-5B / V2500-A5           |
| A319neo   | A32x   | 2019-Q2 | 75 500    | 42 400   | 3 750      | 140         | 160     | 33.84      | 35.80*       | LEAP-1A / PW1100G-JM          |
| A320neo   | A32x   | 2016-01 | 79 000    | 44 300   | 3 400      | 150         | 194     | 37.57      | 35.80*       | LEAP-1A / PW1100G-JM          |
| A321neo   | A32x   | 2017-05 | 97 000    | 50 100   | 3 500      | 200         | 244     | 44.51      | 35.80*       | LEAP-1A / PW1100G-JM          |
| A321LR    | A32x   | 2018-11 | 97 000    | 50 800   | 4 000      | 206         | 240     | 44.51      | 35.80*       | LEAP-1A / PW1100G-JM          |
| A321XLR   | A32x   | 2024-Q4 | 101 000   | 52 300   | 4 700      | 200         | 244     | 44.51      | 35.80*       | LEAP-1A / PW1100G-JM          |

\* Wingspan con sharklets (estándar en neo, retrofit común en ceo). Sin sharklets el wingspan original era 34.10 m.

---

## 1. A319ceo

- **Primer vuelo:** 1995-08-25 (Wikipedia A319)
- **Entrada en servicio:** 1996-04-25 (Swissair)
- **MTOW:** 64 000 – 75 500 kg (variantes WV); típica WV001 = 64 t, alta WV026/027 ≈ 75.5 t
- **MZFW:** ~58 500 kg (variantes altas hasta 62 500)
- **MLW:** 61 000 – 63 900 kg
- **OEW:** ~40 800 kg con CFM56, ~40 600 kg con V2500
- **Pax típica two-class:** 124. Densidad alta: 156 (LCC)
- **Range:** hasta 3 700 nm (6 850 km) con sharklets
- **Cruise Mach:** 0.78 económico, MMo 0.82
- **Cruise altitude:** 39 000 ft típico (FL390)
- **Wingspan:** 34.10 m sin sharklets, 35.80 m con sharklets
- **Length:** 33.84 m
- **Fuel capacity:** 23 860 L estándar (idéntica al A320, mismo wing tank)
- **Fleet en servicio mundial:** ~1 229 A319ceo activos (oct 2025)
- **Daily utilization típico:** 6.5 – 8 FH/día, 4 – 6 cycles/día (mucha rotación corto radio)

Fuentes: [Airbus A319 Wikipedia](https://en.wikipedia.org/wiki/Airbus_A319), [Airbus A319 Aircraft Characteristics 2024](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-01/AC_A319_0624.pdf), [SKYbrary A319](https://skybrary.aero/aircraft/a319), [Simple Flying A319 fleet](https://simpleflying.com/airbus-a319neo-future-analysis/).

---

## 2. A320ceo

- **Primer vuelo:** 1987-02-22
- **Entrada en servicio:** 1988-04 (Air France)
- **MTOW:** 73 500 – 78 000 kg (estándar 78 t)
- **MZFW:** ~62 500 kg
- **MLW:** ~66 000 kg
- **OEW:** ~42 600 kg
- **Pax típica two-class:** 150. Densidad alta: 180 (algunos LCC certifican 186)
- **Range:** ~3 300 nm (6 100 km) con sharklets
- **Cruise Mach:** 0.78 económico, MMo 0.82
- **Cruise altitude:** 39 000 ft típico
- **Wingspan:** 34.10 m / 35.80 m sharklets
- **Length:** 37.57 m
- **Fuel capacity:** 23 859 L (6 303 USG)
- **Fleet en servicio mundial:** ~4 600+ A320ceo activos (estimación 2025)
- **Daily utilization típico:** 8.4 FH/día (media global), 4 – 5 cycles/día. LCC tipo Ryanair: 9 – 10 FH, 3 – 4 cycles. Long-thin (China Southern 6h sectores) baja a 2 cycles.

Fuentes: [Airbus A320 family Wikipedia](https://en.wikipedia.org/wiki/Airbus_A320_family), [Airbus A320ceo product page](https://www.aircraft.airbus.com/en/aircraft/a320-family/a320ceo), [Aircraft Commerce 2019 fuel burn](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/General%20Articles/2019/123_FLTOPS_A.pdf).

---

## 3. A321ceo (A321-100 / A321-200)

- **Primer vuelo:** 1993-03-11 (prototipo F-WWIA con V2500)
- **Entrada en servicio:** 1994-01 (Lufthansa)
- **MTOW:** 83 000 kg (-100) / hasta 93 500 kg (-200)
- **MZFW:** ~73 800 kg
- **MLW:** ~77 800 kg
- **OEW:** ~48 500 kg
- **Pax típica two-class:** 185. Densidad alta: 220 (LCC)
- **Range:** hasta 3 200 nm (5 950 km) con sharklets, A321-200
- **Cruise Mach:** 0.78 económico, MMo 0.82
- **Cruise altitude:** 39 100 – 39 800 ft según motor
- **Wingspan:** 34.10 m / 35.80 m sharklets
- **Length:** 44.51 m
- **Fuel capacity:** 23 700 L estándar; con ACT (Additional Center Tank) +2 990 L cada uno (hasta 2 ACT)
- **Fleet en servicio mundial:** ~1 701 A321ceo activos (jun 2025)
- **Daily utilization típico:** 8 – 9 FH/día, 3 – 4 cycles/día. American/Delta operan flotas grandes mainline.

Fuentes: [Airbus A321 Wikipedia](https://en.wikipedia.org/wiki/Airbus_A321), [Airbus A321 Aircraft Characteristics 2022](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2023-02/Airbus-techdata-AC_A321_0322%20(2).pdf), [Ready For Takeoff A321-200](https://readyfortakeoffbook.com/blogs/aircraft-type/airbus-a321-200).

---

## 4. A319neo

- **Primer vuelo:** 2017-03-31 (con LEAP-1A)
- **Certificación tipo:** 2018-12-21
- **Entrada en servicio:** 2019 (primera mitad)
- **MTOW:** 75 500 kg
- **MZFW:** ~62 000 kg (estimación)
- **MLW:** ~63 900 kg
- **OEW:** ~42 400 kg (estimación, +1.6 t vs ceo por motor más pesado)
- **Pax típica two-class:** 140. Densidad alta: 160
- **Range:** hasta 3 750 nm (6 950 km)
- **Cruise Mach:** 0.78 económico
- **Cruise altitude:** 39 000 ft
- **Wingspan:** 35.80 m (sharklets de serie)
- **Length:** 33.84 m
- **Fuel capacity:** 23 860 L
- **Fleet en servicio mundial:** ~35 unidades (oct 2025) — variante minoritaria
- **Daily utilization típico:** 6 – 8 FH/día (estimación, base ceo)

**Nota crítica:** la A319neo tiene apenas 57 pedidos totales. ~50% son operadores chinos (Air China, China Southern, Tibet). Compite mal con A220-300.

Fuentes: [Airbus A319neo product page](https://www.aircraft.airbus.com/en/aircraft/a320-family/a319neo), [Simple Flying A319neo future](https://simpleflying.com/airbus-a319neo-future-analysis/), [Simple Flying A319neo first flight](https://simpleflying.com/airbus-a319neo-first-flight/).

---

## 5. A320neo

- **Primer vuelo:** 2014-09-25
- **Entrada en servicio:** 2016-01-25 (Lufthansa)
- **MTOW:** 79 000 kg (174 200 lb)
- **MZFW:** ~64 300 kg
- **MLW:** ~67 400 kg
- **OEW:** ~44 300 kg
- **Pax típica two-class:** 150. Densidad alta: 194
- **Range:** 3 400 nm (6 300 km)
- **Cruise Mach:** 0.78 económico
- **Cruise altitude:** 39 000 ft
- **Wingspan:** 35.80 m (sharklets serie)
- **Length:** 37.57 m
- **Fuel capacity:** 23 859 L (idéntica ceo, estándar)
- **Fleet en servicio mundial:** estimado ~2 800 (2025) y creciendo rápido
- **Daily utilization típico:** 9 – 10 FH/día, 4 – 5 cycles/día. LCC empuja hacia 11+ FH.

**Reducción consumo vs ceo:** ~15-20% por seat (Airbus claim), ~16% real (PW data).

Fuentes: [Airbus A320neo product page](https://www.aircraft.airbus.com/en/aircraft/a320-family/a320neo), [Airbus A320neo family Wikipedia](https://en.wikipedia.org/wiki/Airbus_A320neo_family), [List of A320neo orders deliveries Wikipedia](https://en.wikipedia.org/wiki/List_of_Airbus_A320neo_family_orders_and_deliveries).

---

## 6. A321neo (base)

- **Primer vuelo:** 2016-02-09
- **Certificación tipo:** 2016-12-15
- **Entrada en servicio:** 2017-05-31 (Virgin America)
- **MTOW:** 97 000 kg (214 000 lb)
- **MZFW:** ~75 600 kg
- **MLW:** ~79 200 kg
- **OEW:** ~50 100 kg
- **Pax típica two-class:** 200. Densidad alta: 244 (high-density)
- **Range:** ~3 500 nm (6 500 km) en config 2-clase 200 pax (varía con motor y winglets)
- **Cruise Mach:** 0.78 económico
- **Cruise altitude:** 39 100 – 39 800 ft según motor
- **Wingspan:** 35.80 m
- **Length:** 44.51 m
- **Fuel capacity:** 23 700 L estándar (sin ACT)
- **Fleet en servicio mundial:** ~1 752 A321neo activos (jun 2025), variante más vendida del programa
- **Daily utilization típico:** 9 – 10 FH/día, 3 – 4 cycles/día (sectores más largos que A320)

**Demand share:** A321neo representa 60-67% del backlog single-aisle Airbus.

Fuentes: [Airbus A321neo product page](https://www.aircraft.airbus.com/en/aircraft/a320-family/a321neo), [Airbus A321neo Wikipedia](https://en.wikipedia.org/wiki/Airbus_A321neo).

---

## 7. A321LR (Long Range)

- **Entrada en servicio:** 2018-11-13 (Arkia Israeli Airlines)
- **MTOW:** 97 000 kg
- **OEW:** ~50 800 kg (con ACTs vacíos)
- **Pax típica:** 206 en 2-clase
- **Range:** 4 000 nm (7 400 km)
- **Fuel capacity:** hasta 32 940 L con 3 ACTs
- **Resto specs:** idénticas A321neo base

Caso de uso: rutas transatlánticas point-to-point delgadas (JetBlue NYC-LON, TAP Lisboa-USA Este).

Fuentes: [Airbus A321 Wikipedia](https://en.wikipedia.org/wiki/Airbus_A321), [Aircraft Investigation A321LR](https://www.aircraftinvestigation.info/airplanes/Airbus_A321LR.html).

---

## 8. A321XLR (Xtra Long Range)

- **Certificación EASA:** 2024-07 (variante LEAP), 2025-02 (variante PW)
- **Entrada en servicio:** 2024-Q4 (Iberia, primera aerolínea operadora)
- **MTOW:** 101 000 – 101 500 kg
- **OEW:** ~52 300 kg (estimación, +1.5 t vs LR por RCT permanente)
- **Pax típica:** 200 en 2-clase, 244 max
- **Range:** 4 700 nm (8 700 km)
- **Fuel capacity:** hasta ~32 940 L (8 700 USG) — con Rear Center Tank (RCT) integral de 12 900 L
- **Resto specs:** misma airframe base A321neo

**Diferencia clave vs LR:** RCT integral en lugar de ACTs modulares. Más fuel total, mejor CG, optimización aerodinámica en la zona del tank.

Fuentes: [Airbus A321XLR product page](https://www.aircraft.airbus.com/en/aircraft/a320-family/a321xlr), [Simple Flying A321XLR fuel tank](https://simpleflying.com/inside-airbus-a321xlr-fuel-tank/), [Simple Flying LR vs XLR](https://simpleflying.com/striking-differences-airbus-a321lr-a321xlr/).

---

## 9. Motores

### 9.1 Tabla resumen motores

| Engine ID      | OEM     | Thrust (lbf) | Bypass ratio | Weight dry (kg) | Type rating | Compatible             | EIS     |
|----------------|---------|--------------|--------------|-----------------|-------------|------------------------|---------|
| CFM56-5B4      | CFM     | 27 000       | 5.7          | ~2 380          | B1.1        | A320, A319 (high-thr)  | 1996    |
| CFM56-5B5      | CFM     | 22 000       | 6.0          | ~2 380          | B1.1        | A319                   | 1996    |
| CFM56-5B6      | CFM     | 23 500       | 5.9          | ~2 380          | B1.1        | A319, A320             | 1996    |
| CFM56-5B7      | CFM     | 27 000       | 5.7          | ~2 380          | B1.1        | A319 (high-thr)        | 1997    |
| CFM56-5B1/2/3  | CFM     | 30 000–33 000| 5.5–5.7      | ~2 450          | B1.1        | A321                   | 1996    |
| V2500-A1       | IAE/PW  | 25 000       | 5.4          | ~2 359          | B1.1        | A320 (early)           | 1989    |
| V2527-A5       | IAE/PW  | 24 800       | 4.8          | ~2 404          | B1.1        | A320                   | 1996    |
| V2533-A5       | IAE/PW  | 31 600       | 4.5          | ~2 404          | B1.1        | A321                   | 1997    |
| LEAP-1A24/26   | CFM     | 24 000–27 000| ~11          | ~3 153          | B1.1        | A319neo, A320neo       | 2016    |
| LEAP-1A30/32/33| CFM     | 30 000–33 000| ~11          | ~3 153          | B1.1        | A321neo / LR / XLR     | 2017    |
| PW1124G-JM     | P&W     | 24 000       | ~12.2        | ~2 858          | B1.1        | A319neo                | 2017    |
| PW1127G-JM     | P&W     | 27 000       | ~12.2        | ~2 858          | B1.1        | A320neo                | 2016    |
| PW1133G-JM     | P&W     | 33 000       | ~12.2        | ~2 858          | B1.1        | A321neo                | 2017    |

### 9.2 Notas por motor

**CFM56-5B family** (CFM = GE + Safran JV)
- Bypass ratio típico 5.5–6.0
- Fan diameter 68.3 in (1.735 m)
- Length 102.4 in
- Variantes -5B/P certificadas 1996 (DAC = Dual Annular Combustor para low NOx, opcional)
- Fleet más extendida en A320ceo, miles de unidades en servicio
- Type rating: parte del rating "Airbus A318/A319/A320/A321 (CFM56)" según EASA Part-66
- Fuente: [Wikipedia CFM56](https://en.wikipedia.org/wiki/CFM_International_CFM56), [CFM56-5B brochure](https://www.cfmaeroengines.com/wp-content/uploads/2017/08/FICHES_CFM56_170x260H-v8.pdf), [EASA TCDS E.003](https://www.easa.europa.eu/en/downloads/7797/en).

**V2500-A5 family** (IAE consorcio, ahora gestionado por P&W)
- Bypass ratio 4.5–5.4 según variante
- Fan diameter 63.5 in
- V2500-A1 fue la versión original (1989), discontinuada para A5 mejorada
- Type rating compartido con CFM56 dentro del rating A320 family — SIN embargo difference training requerido en práctica de organización 145
- Fuente: [Wikipedia V2500](https://en.wikipedia.org/wiki/IAE_V2500), [V2500 specs Aircraft Commerce](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/V2500/ISSUE%2056-V2500%20SPECS.pdf), [EASA TCDS IM.E.069](https://www.easa.europa.eu/en/downloads/7687/en).

**LEAP-1A** (CFM)
- Bypass ratio ~11, OPR ~40
- Fan diameter 78 in (1.98 m) — más grande que CFM56
- Variantes -1A24 (24 000 lbf, A319neo), -1A26 (26 000 lbf, A320neo), -1A30/32/33 (30 000–33 000 lbf, A321neo/LR/XLR)
- EIS A320neo agosto 2016 (Pegasus Airlines fue primera operadora LEAP-1A); Lufthansa EIS A320neo fue PW
- Fuente: [Wikipedia CFM LEAP](https://en.wikipedia.org/wiki/CFM_International_LEAP), [EASA TCDS E.110](https://www.easa.europa.eu/en/downloads/20086/en), [PlaneFYI LEAP-1A](https://planefyi.com/engines/cfm-leap-1a/).

**PW1100G-JM** (Pratt & Whitney, geared turbofan)
- Bypass ratio 12.2:1 — el más alto de la familia
- Fan diameter 81 in (2.06 m)
- Tecnología Geared Turbofan (FDGS reduce velocidad fan vs LP turbine)
- Variantes -JM identificadas por thrust: PW1124G (24k), PW1127G (27k), PW1133G (33k)
- Issues conocidos en servicio: powder metal HPT discs (campaña masiva 2023+, AOG significativos)
- Fuente: [Wikipedia PW1000G](https://en.wikipedia.org/wiki/Pratt_&_Whitney_PW1000G), [P&W press release primera entrega Lufthansa](https://www.airbus.com/en/newsroom/press-releases/2016-02-lufthansa-takes-delivery-of-the-worlds-first-airbus-a320neo-as).

### 9.3 Type ratings B1 / B2

- **B1.1** (Mecánica, turbina aviones): cubre toda la A32x family ceo y neo. Single rating "Airbus A318/A319/A320/A321" — diferenciado por motor: rating CFM56 vs rating IAE V2500 vs rating CFM LEAP-1A vs rating P&W PW1100G.
- **B2** (Aviónica): rating común "Airbus A320 family" con diferencia training entre ceo (cockpit IAE/CFM) y neo (cockpit similar pero sistemas FADEC diferentes).
- Difference training entre subvariantes (A319 ↔ A320 ↔ A321) NO requerido formalmente por Part-66 dentro del mismo rating, pero sí cubierto por organización 145.
- Fuente: [EASA Type Ratings Part-66](https://www.easa.europa.eu/en/the-agency/faqs/type-ratings-part-66-licence), [EASA Part-66 FAQ](https://www.easa.europa.eu/en/the-agency/faqs/part-66).

---

## 10. Utilización típica diaria (FH y cycles)

Datos consolidados de Aircraft Commerce, IBA, Aviation Week:

| Operador modelo       | Variante típica | FH/día | Cycles/día | Sector medio  |
|-----------------------|-----------------|--------|------------|---------------|
| LCC short-haul (Ryanair, Wizz) | A320, A321 | 9.0–11.0 | 3–4 | 2.0–2.5h |
| Mainline EU (Lufthansa, AF) | A319, A320 | 6.5–8.5 | 4–6 | 1.0–1.5h |
| Mainline US (AA, DL) | A321ceo, A321neo | 9.0–10.5 | 3–4 | 2.5–3.0h |
| China Southern long-thin | A320 | 8.0–9.0 | 1.5–2 | 4.5–6h |
| US Major top utilization | A320 | 11.5+ | 4 | 2.8h (excepcional) |

**Industry baseline 2019 pre-COVID:** 10.80 BH/día narrowbody grande, 3.61 deps/día.

**Implicación para MRO Tycoon:** la ratio FH/cycles depende fuertemente del business model de la aerolínea cliente. Un cycle = 1 take-off + 1 landing. Para schedules de hangar, A-checks típicamente cada 750 FH (cada 2-3 meses para uso intenso), C-checks cada 7 500 FH o ~24 meses, D-check cada ~12 años.

Fuentes: [Aircraft Commerce A320 maintenance issue 44](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/A320%20FAMILY/ISSUE%2044-A320%20MTCE.pdf), [Aviation Week Flight Friday A320 utilization](https://aviationweek.com/aerospace/flight-friday-update-a320-familys-engine-utilization), [Airways Magazine art of utilization](https://www.airwaysmag.com/legacy-posts/art-of-aircraft-utilization).

---

## 11. Notas de calidad / gaps conocidos

**Cifras firmes (multi-fuente concordante):**
- Dimensiones físicas (length, wingspan): firmes
- MTOW estándar de cada variante: firme (Airbus + EASA TCDS)
- Cruise speed Mach 0.78: firme
- Fechas first flight / EIS: firmes (multi-fuente)
- Fuel capacity wing tank base: firme
- Thrust ratings motores: firmes (TCDS)

**Cifras estimadas / con incertidumbre:**
- **OEW de variantes neo:** estimadas a partir de la base ceo + ~1.5–1.7 t por motor más pesado. Airbus no publica OEW oficial single point, varía con galley/seat config. Marcado como estimación.
- **MZFW y MLW de algunas variantes neo:** no encontrados en fuentes públicas accesibles vía WebSearch (TCDS detallado no accesible directamente). Estimados.
- **Fleet en servicio:** snapshots dispersos, mezcla A319ceo+neo en algunos counts. Cifras de jun-oct 2025 según fuente.
- **Daily utilization típico:** rango orientativo, no hay un "número" universal — depende profundamente del business model.
- **Weights motores:** combinación de fuentes; CFM56-5B varía 5 250–5 513 lb según fuente (drypod vs wet engine vs base engine).

**Gaps que NO he podido cerrar con fuentes públicas accesibles:**
1. **OEW oficial single point por variante neo** — Airbus solo publica rangos en Aircraft Characteristics PDFs (que sí están en aircraft.airbus.com pero no cargué directamente en este pase).
2. **MZFW y MLW exactos por WV (Weight Variant)** — el TCDS los lista por WV pero el PDF EASA no se cargó.
3. **Fleet split A319ceo vs A319neo activos** — estimado a partir de orders/deliveries.
4. **PW1124G weight exacto** — extrapolado del PW1127G.
5. **CFM56-5B variantes específicas (B1/B2/B3) compatibilidad A321** — la nomenclatura exacta de subvariantes -5B1/B2/B3 vs B4/B5/B6/B7 puede tener overlaps en specs.

**Para Fase 4+ del juego:** estos gaps son tolerables. Para v1.0 Steam, recomendable cargar los Airbus Aircraft Characteristics PDFs oficiales (públicos, gratis, en aircraft.airbus.com) y los EASA TCDS PDFs (gratis en easa.europa.eu) y refinar OEW/MZFW por weight variant. Eso requiere descarga manual o whitelist de dominios.

---

## 12. URLs maestras (índice de fuentes)

**Wikipedia (principal):**
- https://en.wikipedia.org/wiki/Airbus_A320_family
- https://en.wikipedia.org/wiki/Airbus_A320neo_family
- https://en.wikipedia.org/wiki/Airbus_A319
- https://en.wikipedia.org/wiki/Airbus_A321
- https://en.wikipedia.org/wiki/Airbus_A321neo
- https://en.wikipedia.org/wiki/CFM_International_CFM56
- https://en.wikipedia.org/wiki/CFM_International_LEAP
- https://en.wikipedia.org/wiki/IAE_V2500
- https://en.wikipedia.org/wiki/Pratt_%26_Whitney_PW1000G
- https://en.wikipedia.org/wiki/List_of_Airbus_A320neo_family_orders_and_deliveries

**Airbus oficial:**
- https://www.aircraft.airbus.com/en/aircraft/a320-family/a319ceo
- https://www.aircraft.airbus.com/en/aircraft/a320-family/a320ceo
- https://www.aircraft.airbus.com/en/aircraft/a320-family/a319neo
- https://www.aircraft.airbus.com/en/aircraft/a320-family/a320neo
- https://www.aircraft.airbus.com/en/aircraft/a320-family/a321neo
- https://www.aircraft.airbus.com/en/aircraft/a320-family/a321xlr
- https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-01/AC_A319_0624.pdf (A319 AC PDF)
- https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2023-02/Airbus-techdata-AC_A321_0322%20(2).pdf (A321 AC PDF)

**EASA TCDS:**
- https://www.easa.europa.eu/en/downloads/16507/en (A320 family TCDS A.064)
- https://www.easa.europa.eu/en/downloads/7797/en (CFM56-5B/-5C TCDS E.003)
- https://www.easa.europa.eu/en/downloads/7687/en (V2500 TCDS IM.E.069)
- https://www.easa.europa.eu/en/downloads/20086/en (LEAP-1A TCDS E.110)

**Industry / utilization:**
- https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/A320%20FAMILY/ISSUE%2044-A320%20MTCE.pdf
- https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/General%20Articles/2019/123_FLTOPS_A.pdf
- https://aviationweek.com/aerospace/flight-friday-update-a320-familys-engine-utilization

**EASA regulatory:**
- https://www.easa.europa.eu/en/the-agency/faqs/type-ratings-part-66-licence
- https://www.easa.europa.eu/en/the-agency/faqs/part-66

---

*Fin del documento. Si descubres una cifra incorrecta o tienes acceso a un Aircraft Characteristics PDF que cierra un gap, actualiza la sección correspondiente y la entrada del JSON.*
