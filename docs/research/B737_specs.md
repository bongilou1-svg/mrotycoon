# Boeing 737 NG & MAX — Public Reference Specs

**Propósito:** base de datos pública para alimentar el catálogo de aeronaves del juego MRO Tycoon. Datos cruzados entre Wikipedia, Boeing Airport Planning Documents, FAA TCDS A16WE, EASA TCDS IM.A.120 (MAX), planespotters.net, airfleets.net, AviationWeek y FlightGlobal. Cuando una cifra varía entre fuentes se elige la más conservadora/pública. **Datos para uso de juego, no para operación real.**

**Última actualización:** 2026-05-15

> El 737-600 (NG corto) se considera obsoleto: producción cerrada 2006, ~10 unidades en servicio mundial. Se omite por irrelevancia comercial salvo nota mínima en sección histórica.

---

## 0. Tabla resumen de variantes

| Variante       | Family   | EIS       | MTOW (kg) | OEW (kg) | Range (nm) | Pax 2-class | Pax max | Length (m) | Wingspan (m) | Engines               |
|----------------|----------|-----------|-----------|----------|------------|-------------|---------|------------|--------------|-----------------------|
| 737-700        | B737NG   | 1997-12   | 70 080    | 38 147   | 3 010      | 126         | 149     | 33.63      | 35.79        | CFM56-7B22/24/26      |
| 737-800        | B737NG   | 1998-04   | 79 016    | 41 413   | 2 935      | 162         | 189     | 39.47      | 35.79        | CFM56-7B24/26/27      |
| 737-900        | B737NG   | 2001-05   | 79 016    | 42 901   | 2 745      | 177         | 189     | 42.11      | 35.79        | CFM56-7B26/27         |
| 737-900ER      | B737NG   | 2007-04   | 85 130    | 44 676   | 2 950      | 180         | 220     | 42.11      | 35.79        | CFM56-7B26/27         |
| 737 MAX 7      | B737MAX  | 2024-Q4*  | 80 286    | 42 012   | 3 850      | 138         | 172     | 35.56      | 35.92        | LEAP-1B25             |
| 737 MAX 8      | B737MAX  | 2017-05   | 82 191    | 45 065   | 3 500      | 162         | 189     | 39.52      | 35.92        | LEAP-1B27/28          |
| 737 MAX 8-200  | B737MAX  | 2021-06   | 82 191    | 45 720   | 3 500      | 197         | 200     | 39.52      | 35.92        | LEAP-1B27/28          |
| 737 MAX 9      | B737MAX  | 2018-03   | 88 314    | 47 150   | 3 300      | 178         | 220     | 42.16      | 35.92        | LEAP-1B27/28          |
| 737 MAX 10     | B737MAX  | 2025-Q3*  | 89 800    | 49 000   | 3 300      | 188         | 230     | 43.79      | 35.92        | LEAP-1B28             |

\* MAX 7 obtuvo certificación FAA tras retraso por sistema anti-ice; MAX 10 está en proceso de certificación final 2025. Wingspan MAX incluye Advanced Technology winglets (de fábrica). NG estándar lleva blended winglets (retrofit en muchos -700/-800 originales).

---

## 1. 737-700

- **Primer vuelo:** 1997-02-09
- **Entrada en servicio:** 1997-12-17 (Southwest Airlines)
- **MTOW:** 60 330 – 70 080 kg (variantes WV; alta WV020 = 70 080 kg)
- **MZFW:** ~58 600 kg
- **MLW:** 58 604 kg
- **OEW:** 38 147 kg (típico con interior 126 pax)
- **Pax típica two-class:** 126. Densidad alta: 149 (Southwest 143, charter hasta 149 max exit limit)
- **Range:** hasta 3 010 nm (5 575 km) con winglets
- **Cruise Mach:** 0.785 económico, MMo 0.82
- **Cruise altitude:** 41 000 ft máximo certificado (FL410)
- **Wingspan:** 34.32 m sin winglets, 35.79 m con blended winglets
- **Length:** 33.63 m
- **Fuel capacity:** 26 025 L (6 875 USG estándar) — depósito central + 2 alares
- **Fleet en servicio mundial:** ~920 activos (oct 2025), Southwest principal operador (~430)
- **Daily utilization típico:** 7 – 9 FH/día, 4 – 6 cycles/día (Southwest ~7.5 FH y ~5 cycles, perfil corto radio US doméstico)

Fuentes: [Boeing 737 Next Gen Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_Next_Generation), [Boeing 737 Airport Planning Document D6-58325-6](https://www.boeing.com/content/dam/boeing/boeingdotcom/company/about_bca/startup/pdf/historical/737-passenger.pdf), [planespotters.net 737-700 production list](https://www.planespotters.net/airframe/list/type/Boeing-737-700/active), [Southwest fleet age data 2024](https://www.southwest.com/about-southwest/fleet/).

---

## 2. 737-800

**El best-seller absoluto del NG.** Backbone de Ryanair, American, Delta, United, GOL, Norwegian.

- **Primer vuelo:** 1997-07-31
- **Entrada en servicio:** 1998-04-21 (Hapag-Lloyd Flug)
- **MTOW:** 70 535 – 79 016 kg (WV alta = 79 016 kg / 174 200 lb estándar)
- **MZFW:** 62 732 kg (138 300 lb)
- **MLW:** 66 361 kg (146 300 lb)
- **OEW:** 41 413 kg (típico interior 162 pax dual class)
- **Pax típica two-class:** 162. Densidad alta: 189 (Ryanair, exit limit con extra puerta tipo III)
- **Range:** ~2 935 nm (5 436 km) con 162 pax y reservas estándar; con winglets gana ~130 nm
- **Cruise Mach:** 0.785 económico, MMo 0.82
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 34.32 m sin winglets / 35.79 m con blended / 35.79 m con split scimitar (Aviation Partners retrofit)
- **Length:** 39.47 m (estirado 3.84 m sobre el -700)
- **Fuel capacity:** 26 025 L (6 875 USG)
- **Fleet en servicio mundial:** ~4 400 activos (oct 2025) — la flota más grande de cualquier variante 737
- **Daily utilization típico:** 8 – 11 FH/día. Ryanair líder ~10.5 FH y 5 – 6 cycles/día. American/Delta US doméstico ~9 FH y ~4 cycles. Long-thin (Norwegian transatlántico) ~10 FH y 1 – 2 cycles.

Fuentes: [Boeing 737-800 Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_Next_Generation#737-800), [Boeing 737 APD D6-58325-6](https://www.boeing.com/content/dam/boeing/boeingdotcom/company/about_bca/startup/pdf/historical/737-passenger.pdf), [airfleets.net Boeing 737-800](https://www.airfleets.net/listing/b737ng-1.htm), [SKYbrary B738](https://skybrary.aero/aircraft/b738), [Ryanair fleet 2024](https://corporate.ryanair.com/about-us/fact-and-figures/).

---

## 3. 737-900

Primera tentativa de estiramiento. Limitada a 189 pax por número de puertas estándar (mismo límite que el -800), lo que la hizo poco atractiva. Sólo ~52 entregadas.

- **Primer vuelo:** 2000-08-03
- **Entrada en servicio:** 2001-05-15 (Alaska Airlines)
- **MTOW:** 79 016 kg (mismo que -800)
- **MZFW:** ~63 300 kg
- **MLW:** 66 361 kg
- **OEW:** ~42 901 kg
- **Pax típica two-class:** 177. Max 189 (limitación puertas)
- **Range:** ~2 745 nm (5 084 km) con 177 pax — penalizado por mismo MTOW que -800 con más OEW
- **Cruise Mach:** 0.785, MMo 0.82
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 34.32 m / 35.79 m con blended winglets
- **Length:** 42.11 m
- **Fuel capacity:** 26 025 L
- **Fleet en servicio mundial:** ~50 activos (oct 2025), mayoría Alaska Airlines y Continental legacy
- **Daily utilization típico:** 8 – 9 FH/día, 3 – 4 cycles/día

Fuentes: [Boeing 737-900 Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_Next_Generation#737-900), [Alaska Airlines historical fleet](https://newsroom.alaskaair.com/fleet).

---

## 4. 737-900ER

El "fix" del -900: añade exit door pair, MTOW mayor y aux fuel tanks opcionales para llegar a la zona del A321ceo. Operador principal: United Airlines (~136 ER), Delta, Lion Air.

- **Primer vuelo:** 2006-09-01
- **Entrada en servicio:** 2007-04-27 (Lion Air)
- **MTOW:** 79 016 – 85 130 kg (alta WV con aux tanks)
- **MZFW:** 67 268 kg
- **MLW:** 71 350 kg
- **OEW:** 44 676 kg
- **Pax típica two-class:** 180. Densidad alta: 220 (LCC con todas las exit doors abiertas)
- **Range:** ~2 950 nm (5 460 km) con 180 pax y aux fuel
- **Cruise Mach:** 0.785, MMo 0.82
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 35.79 m con blended winglets (estándar)
- **Length:** 42.11 m
- **Fuel capacity:** 26 025 L estándar, hasta 29 666 L con 2 aux tanks
- **Fleet en servicio mundial:** ~505 activos (oct 2025)
- **Daily utilization típico:** 9 – 10 FH/día, 4 cycles/día (United doméstico US ~9.5 FH)

Fuentes: [Boeing 737-900ER Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_Next_Generation#737-900ER), [Boeing press release 737-900ER launch 2005](https://boeing.mediaroom.com/2005-07-18-Boeing-Adds-737-900ER-to-Strong-Next-Generation-Family), [United Airlines fleet plan](https://united.mediaroom.com/fleet).

---

## 5. 737 MAX 7

Reemplazo del -700. Certificación FAA retrasada por revisión del sistema anti-ice nacelle (issue post-AS1282). Cert obtenida fines 2024. Launch operator: Southwest Airlines (orden de 234).

- **Primer vuelo:** 2018-03-16
- **Entrada en servicio:** 2024-Q4 (Southwest Airlines, primera entrega comercial postergada)
- **MTOW:** 80 286 kg (177 000 lb)
- **MZFW:** ~65 317 kg
- **MLW:** 66 225 kg
- **OEW:** ~42 012 kg
- **Pax típica two-class:** 138. Max 172
- **Range:** 3 850 nm (7 130 km) — el de mayor radio de la familia MAX
- **Cruise Mach:** 0.79
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 35.92 m con AT winglets
- **Length:** 35.56 m (1.93 m más largo que -700)
- **Fuel capacity:** 25 817 L (6 820 USG)
- **Fleet en servicio mundial:** ~5 (cert reciente, ramp-up en 2025-2026)
- **Daily utilization típico:** 7 – 8 FH/día (estimado, perfil Southwest tipo -700)

Fuentes: [Boeing 737 MAX 7 Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_MAX#737_MAX_7), [FAA certification update 2024](https://www.faa.gov/newsroom/737-max-7-certification), [AviationWeek MAX 7 anti-ice issue](https://aviationweek.com/air-transport/aircraft-propulsion/boeing-pulls-737-7-exemption-request-engine-anti-ice).

---

## 6. 737 MAX 8

Variante central. Reemplazo directo del -800. Líneas de producción Renton más altas. Operadores principales: Southwest, Ryanair (sub-variante 8-200), American, United, Air Canada, Alaska, TUI, GOL.

- **Primer vuelo:** 2016-01-29
- **Entrada en servicio:** 2017-05-22 (Malindo Air)
- **MTOW:** 82 191 kg (181 200 lb)
- **MZFW:** ~65 952 kg
- **MLW:** 69 308 kg
- **OEW:** ~45 065 kg
- **Pax típica two-class:** 162. Max 189 (mismo límite exit doors estándar que -800)
- **Range:** 3 500 nm (6 480 km) — ~14% mejora sobre -800
- **Cruise Mach:** 0.79, MMo 0.82
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 35.92 m con Advanced Technology winglets dual feathered (de fábrica)
- **Length:** 39.52 m
- **Fuel capacity:** 25 817 L (6 820 USG)
- **Fleet en servicio mundial:** ~1 450 activos (oct 2025)
- **Daily utilization típico:** 8 – 11 FH/día, 4 – 6 cycles/día. Ryanair MAX 8-200 ~11.5 FH y 5.5 cycles. Southwest ~9 FH.

Fuentes: [Boeing 737 MAX 8 Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_MAX#737_MAX_8), [Boeing 737 MAX APD D6-38A004](https://www.boeing.com/commercial/airports/737.page), [planespotters MAX 8 list](https://www.planespotters.net/airframe/list/type/Boeing-737-MAX-8/active), [SKYbrary B38M](https://skybrary.aero/aircraft/b38m).

---

## 7. 737 MAX 8-200 (high-density Ryanair)

Sub-variante con un par de exit doors adicional (overwing) para cumplir Type C cabin emergency egress con 200 pax. Pedida originalmente por Ryanair (Boeing la registra como 737-8-200). Mismo airframe que MAX 8, sólo cambia config cabin y cert.

- **Primer vuelo:** 2019-04-13
- **Entrada en servicio:** 2021-06-29 (Ryanair, EI-HEM)
- **MTOW:** 82 191 kg (= MAX 8)
- **MZFW:** ~65 952 kg
- **MLW:** 69 308 kg
- **OEW:** ~45 720 kg (un poco mayor por refuerzo y exit doors extra)
- **Pax típica:** 197. Max certificado: 200 (single class denso, 28-29" pitch)
- **Range:** 3 500 nm
- **Cruise Mach:** 0.79
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 35.92 m
- **Length:** 39.52 m
- **Fuel capacity:** 25 817 L
- **Fleet en servicio mundial:** ~195 (oct 2025), Ryanair Group casi exclusivo (Buzz, Malta Air, Lauda)
- **Daily utilization típico:** 11 – 12 FH/día, 5 – 6 cycles/día (perfil Ryanair clásico)

Fuentes: [Ryanair 737 MAX 8-200 fleet update](https://corporate.ryanair.com/news/), [Boeing press release MAX 200](https://boeing.mediaroom.com/2014-09-08-Ryanair-Boeing-Announce-200-Airplane-Order), [Wikipedia MAX 200 section](https://en.wikipedia.org/wiki/Boeing_737_MAX#737_MAX_8-200).

---

## 8. 737 MAX 9

Reemplazo del -900ER. Más MTOW y wing fuel opcional (aux tanks). Operadores: United (~136), Alaska Airlines (~65), Copa, Lion Air, FlyDubai. Implicada en accidente puerta tapón Alaska 1282 (ene 2024).

- **Primer vuelo:** 2017-04-13
- **Entrada en servicio:** 2018-03-21 (Lion Air)
- **MTOW:** 88 314 kg (194 700 lb)
- **MZFW:** ~69 853 kg
- **MLW:** 74 480 kg
- **OEW:** ~47 150 kg
- **Pax típica two-class:** 178. Max 220 (con plug door en posición exit + Type C)
- **Range:** 3 300 nm (6 110 km)
- **Cruise Mach:** 0.79
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 35.92 m
- **Length:** 42.16 m (idéntico al -900ER, sólo cambia engine, FBW spoiler y winglets)
- **Fuel capacity:** 25 817 L estándar (aux tank opcional añade ~3 600 L)
- **Fleet en servicio mundial:** ~165 activos (oct 2025)
- **Daily utilization típico:** 9 – 10 FH/día, 4 cycles/día (United doméstico ~9.5 FH)

Fuentes: [Boeing 737 MAX 9 Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_MAX#737_MAX_9), [planespotters MAX 9 active fleet](https://www.planespotters.net/airframe/list/type/Boeing-737-MAX-9/active), [NTSB AS1282 preliminary report 2024](https://www.ntsb.gov/news/press-releases/Pages/NR20240206.aspx).

---

## 9. 737 MAX 10

El estiramiento máximo. Compite directamente con A321neo en pax 200+. Innovación clave: tren principal semi-levering (telescópico) para no rozar la cola en rotación con fuselaje 1.7 m más largo que el MAX 9. Cert FAA pendiente cierre 2025. Launch customer: United Airlines (164 pedidos).

- **Primer vuelo:** 2021-06-18
- **Entrada en servicio:** 2025-Q3 (estimación, cert en curso)
- **MTOW:** 89 800 kg (197 900 lb)
- **MZFW:** ~72 120 kg
- **MLW:** 79 288 kg
- **OEW:** ~49 000 kg
- **Pax típica two-class:** 188. Max 230
- **Range:** 3 300 nm (6 110 km) — penalizado por MTOW vs longitud
- **Cruise Mach:** 0.79
- **Cruise altitude:** 41 000 ft
- **Wingspan:** 35.92 m
- **Length:** 43.79 m (el más largo de todos los 737 jamás producidos; 1.65 m más que MAX 9)
- **Fuel capacity:** 25 817 L
- **Fleet en servicio mundial:** ~2 (test fleet + first delivery 2025)
- **Daily utilization típico:** 8 – 9 FH/día estimado (perfil United/Delta doméstico)

Fuentes: [Boeing 737 MAX 10 Wikipedia](https://en.wikipedia.org/wiki/Boeing_737_MAX#737_MAX_10), [Boeing 737-10 launch press 2017](https://boeing.mediaroom.com/2017-06-19-Boeing-Launches-Largest-Version-of-the-737-MAX), [FlightGlobal MAX 10 cert tracker](https://www.flightglobal.com/airframers/boeing-737-max-10/).

---

## 10. Sección motores

### 10.1 CFM56-7B family (NG)

Diseñado específicamente para el 737NG. Variante reducida del CFM56-7 con FADEC dual channel, fan de 61 pulgadas (más pequeño que -5B del A320 para preservar el ground clearance del 737). Compatible con todas las variantes NG cambiando configuración FADEC (mismo hardware en muchos casos). Type rating B1 unificado para todas las variantes NG.

| Engine ID    | Thrust (lbf) | BPR | Weight (kg) | Variantes compatibles                  | EIS  |
|--------------|--------------|-----|-------------|----------------------------------------|------|
| CFM56-7B22   | 22 700       | 5.3 | 2 386       | 737-700                                | 1997 |
| CFM56-7B24   | 24 200       | 5.3 | 2 386       | 737-700, 737-800                       | 1998 |
| CFM56-7B26   | 26 300       | 5.1 | 2 386       | 737-700, -800, -900, -900ER            | 1998 |
| CFM56-7B27   | 27 300       | 5.1 | 2 386       | 737-800, -900, -900ER (alta MTOW)      | 1999 |

Notas:
- Todos comparten core común y fan de 61"; el rating de empuje es vía FADEC + bleed schedule
- TBO típico hot-section ~12 000 – 15 000 EFC, full overhaul ~24 000 EFC
- Producción acumulada: >7 000 motores (CFM Intl)
- Type rating: B1 (737-3xx/4xx/5xx era B1 separado por CFM56-3, pero el NG con -7B se mantiene B1 común con NG)

Fuentes: [CFM56-7B CFM Intl product page](https://www.cfmaeroengines.com/engines/cfm56/), [Wikipedia CFM56](https://en.wikipedia.org/wiki/CFM_International_CFM56#CFM56-7), [EASA TCDS E.066 CFM56-7B](https://www.easa.europa.eu/en/document-library/type-certificates/engine-cs-e/easaime066).

### 10.2 LEAP-1B family (MAX)

Versión 737-específica del LEAP. Fan más pequeño (69") que el LEAP-1A del A320neo (78") para conservar ground clearance del 737, comprometiendo eficiencia bypass (BPR ~9 vs ~11 del 1A). Esto y el reposicionamiento delantero/elevado del nacelle generaron el momento aerodinámico que motivó MCAS.

| Engine ID  | Thrust (lbf) | BPR | Weight (kg) | Variantes compatibles                       | EIS  |
|------------|--------------|-----|-------------|---------------------------------------------|------|
| LEAP-1B25  | 25 000       | 9.0 | 2 780       | 737 MAX 7                                   | 2024 |
| LEAP-1B27  | 27 000       | 9.0 | 2 780       | MAX 8, MAX 8-200, MAX 9                     | 2017 |
| LEAP-1B28  | 28 000       | 9.0 | 2 780       | MAX 8, MAX 8-200, MAX 9, MAX 10 (alta MTOW) | 2017 |

Notas:
- Todos mismo hardware fan/core, rating vía FADEC
- Mejora SFC ~14% sobre CFM56-7B
- Anti-ice nacelle (inlet) issue 2023-2024: composite inlet podía sobrecalentarse en uso prolongado de bleed anti-ice; AD y SB en curso. Afecta a toda la flota MAX hasta retrofit
- Type rating: B1 (mismo que NG; piloto NG → MAX requiere differences training, no nuevo type rating completo, lo que fue argumento clave de Boeing para MCAS 2018)

Fuentes: [CFM LEAP product page](https://www.cfmaeroengines.com/engines/leap/), [Wikipedia CFM LEAP](https://en.wikipedia.org/wiki/CFM_International_LEAP#LEAP-1B), [FAA AD 2023-23-12 nacelle anti-ice](https://drs.faa.gov/), [AviationWeek LEAP-1B inlet review 2024](https://aviationweek.com/aerospace/aircraft-propulsion/cfm-investigating-leap-1b-engine-issues).

---

## 11. Utilización y patrones operativos

### 11.1 Patrones por operador (NG y MAX)

| Operador     | Variante principal | FH/día típico | Cycles/día | Perfil        |
|--------------|--------------------|---------------|------------|---------------|
| Southwest    | 737-700, MAX 8     | 7.5 – 9       | 4.5 – 5.5  | US doméstico, point-to-point |
| Ryanair      | 737-800, MAX 8-200 | 10.5 – 12     | 5 – 6      | EU low-cost, sectores 1.5h |
| United       | 737-900ER, MAX 9   | 9 – 10        | 4          | US dom + Caribe |
| American     | 737-800, MAX 8     | 9 – 10        | 4 – 5      | US doméstico  |
| Alaska       | 737-900ER, MAX 9   | 9 – 11        | 4 – 5      | West Coast US |
| Lion Air     | 737-900ER, MAX 9   | 8 – 9         | 5 – 6      | SE Asia LCC   |
| GOL          | 737-800, MAX 8     | 9 – 10        | 4 – 5      | Brasil dom    |
| TUI Group    | 737-800, MAX 8     | 7 – 9         | 2 – 3      | Charter/leisure |

### 11.2 Cycles vs hours (rule of thumb)

- **Sector medio NG/MAX:** 1.5 – 2.5 h
- Operador LCC con sectores cortos: cycles altos (5+/día) → mayor desgaste tren, neumáticos, frenos
- Operador legacy con sectores medios: ~4 cycles/día → balance frenos/fatigue
- Charter long-thin: 1 – 2 cycles/día → componentes calientes (turbinas) sufren menos por ciclo, pero ratio FH/cycle alto

### 11.3 Estructura de mantenimiento típica (referencia rápida)

- A-check: cada 600 – 800 FH (~6 – 8 semanas)
- C-check: cada 6 000 FH o 24 meses
- Heavy maintenance (D-check / 6Y): cada ~12 años o ~24 000 FH
- Engine on-wing: típicamente 18 000 – 24 000 EFC en NG, similar esperado MAX

---

## 12. Notas históricas relevantes (contexto fiabilidad/percepción mercado)

### 12.1 NG — pickle fork cracks (2019)

En sept 2019 Boeing y FAA emitieron AD 2019-20-02 tras detectar cracks en los **pickle forks** (estructura que une ala a fuselaje) en flotas con >22 600 cycles. Se inspeccionaron ~1 000 aviones globalmente, ~50 (~5%) requirieron reparación o grounding. Coste reparación: ~$500k–1M por airframe. Afectó principalmente -800 con cycles altos (Ryanair, Lion, GOL). [FAA AD 2019-20-02](https://drs.faa.gov/), [Wikipedia 737NG pickle fork](https://en.wikipedia.org/wiki/Boeing_737_Next_Generation#Structural_issues).

### 12.2 MAX — MCAS y grounding 2019-2020

Tras los accidentes Lion Air JT610 (oct 2018, 189 muertos) y Ethiopian ET302 (mar 2019, 157 muertos), causados por intervención errónea del **MCAS (Maneuvering Characteristics Augmentation System)** disparada por sensor AoA único en falla, la FAA grounded todo el MAX el 13 mar 2019. **Grounding global 20 meses.** Return-to-service noviembre 2020 con cambios:
- MCAS lee dos sensores AoA (no uno)
- Stick limits reducidos
- Disable manual posible vía cutout
- Differences training piloto obligatorio (no sólo iPad)

Coste estimado Boeing: >$20 mil millones. Backlog 5 000+ MAX paralizado, recuperación producción aún incompleta 2026. [Wikipedia 737 MAX groundings](https://en.wikipedia.org/wiki/Boeing_737_MAX_groundings), [JATR final report 2019](https://www.faa.gov/sites/faa.gov/files/aircraft/air_cert/aircraft_certification/JATR_B737MAX_Report.pdf).

### 12.3 MAX 9 — Alaska Airlines 1282 door plug blowout (ene 2024)

5 ene 2024, AS1282 (N704AL, MAX 9) sufrió **separación de la mid-cabin door plug** (puerta tapón en posición exit no usada) a FL160 sobre Portland. No fatalidades. NTSB preliminary determinó que **faltaban 4 pernos retención** tras intervención fábrica Boeing/Spirit AeroSystems. FAA grounded ~171 MAX 9 con door plug 19 días para inspección. Consecuencias:
- Cap producción Boeing 737 a 38/mes hasta mejoras quality system
- CEO Dave Calhoun anunció dimisión
- FAA quality oversight reforzada Boeing/Spirit, Spirit re-acquired by Boeing 2024

[NTSB AS1282 preliminary report](https://www.ntsb.gov/news/press-releases/Pages/NR20240206.aspx), [FAA airworthiness directive 2024-02-51](https://drs.faa.gov/).

### 12.4 737-600 — la oveja negra obsoleta

Variante NG más corta (31.2 m, 110 pax). Producción cerrada 2006, sólo 69 entregadas. ~10 activas (oct 2025) en flotas Air Algérie, gobierno. Demanda nula post-EIS por overlap con 737-700. Se omite del catálogo del juego.

---

## 13. Calidad de datos / caveats

| Campo                       | Calidad     | Notas |
|-----------------------------|-------------|-------|
| MTOW, MLW, length, wingspan | ALTA        | Boeing APD + TCDS, cifras públicas robustas |
| OEW                         | MEDIA-ALTA  | Varía con interior; tomado interior estándar two-class Boeing reference |
| MZFW                        | MEDIA       | No siempre publicado; algunos derivados de MLW + fuel |
| Range                       | MEDIA       | Depende de pax/cargo/reservas; tomado spec Boeing marketing (162/178/180 pax típicos) |
| Fuel capacity               | ALTA        | Especificación tank standard; aux tanks opcionales en -900ER aumentan |
| Fleet in service            | MEDIA       | planespotters/airfleets oct 2025; volátil semana a semana |
| Daily utilization           | MEDIA-BAJA  | Estimación basada en reportes operadores y media industria; varía mucho temporada/operador |
| Engine weight               | MEDIA-ALTA  | Dry weight CFM/Boeing public spec |
| Engine BPR                  | ALTA        | Especificación CFM oficial |
| EIS MAX 7 / MAX 10          | MEDIA       | Cert pendiente confirmación final, fechas estimadas a partir de roadmap Boeing 2025 |

**Convenciones:** USG → L con factor 3.785. lbf no convertido (industria aeronáutica usa lbf nativo). FH = flight hours, EFC = engine flight cycles.

**Para uso en MRO Tycoon:** estos datos son suficientes para gameplay (asignación hangar, planificación turnarounds, compatibilidad motor-airframe, balance económico). No usar para operación real ni cálculos de performance.

---

*Fin del documento. Próximo update sugerido: tras certificación final MAX 7/MAX 10 (~2025-2026), refrescar EIS y fleet counts.*
