# MRO Tycoon — Game Design Document (mínimo viable)

> **Output Fase 1.** GDD apretado, no enciclopedia. Suficiente para validar que Fase 2 (vertical slice HTML+Tauri) puede arrancar con decisiones tomadas. Input: `unity_legacy/BRIEF_recovery.md`.
>
> Decisiones nuevas tomadas en Fase 1 con Dani: **sandbox + derrota clara** · **USP = autenticidad aeronáutica nicho**.

---

## 1. TL;DR / Pitch

Eres el director de un MRO independiente (Maintenance, Repair, Overhaul) que sirve narrowbody A320/A321 a 4 aerolíneas ficticias. Aceptas contratos, fichas mecánicos certificados EASA B1/B2, gestionas hangares y turnos. **Cada Work Order es real**: 100 templates con ATA chapters auténticos, sacados del manual técnico. El juego se ve como un control room — paneles, listas, dashboards, un mapa esquemático del aeropuerto. Cero 3D, cero animaciones de aviones volando.

**Loop sentido**: la emoción no es ver aviones aterrizar, es la decisión informada en el panel de asignación. *"Esta WO crítica entra a las 14:20, tengo a Pedro libre pero su rating B1 caduca en 3 semanas; ¿le asigno o me arriesgo a la penalización SLA?"*

**Una frase de venta**: "Project Hospital con aviones reales y manual técnico EASA."

---

## 2. USP y posicionamiento Steam

**USP**: único tycoon con dominio aeronáutico real (ATA chapters, EASA licensing, A320 family) modelado a nivel de Work Order individual.

**Target audience**: intersección de dos nichos hardcore:
- Aviation enthusiasts (sims de aerolínea tipo *Airline Tycoon*, MS Flight Sim, jugadores de Aerosoft)
- Tycoon hardcore (Project Hospital, Software Inc., Production Line, Capitalism Lab)

**Mercado realista**: 10-30k unidades vendidas en primer año, precio €19,99. High reviews (target 85%+ positive), low refund rate por especificidad.

**Steam tags planeados**: Aviation · Management · Tycoon · Realistic · Simulation · Sandbox · Singleplayer · Indie · Resource Management.

**Anti-USP** (lo que NO somos):
- No es *Airline Tycoon* (ahí gestionas la aerolínea, aquí el taller que la sirve)
- No es *Microsoft Flight Sim* (no pilotamos)
- No es *Two Point Hospital* (sin humor visual; estética seca)

---

## 3. Forma del juego: sandbox + derrota clara

**No hay condición de victoria explícita.** Empiezas con 1 hangar, 2 mecánicos, balance inicial. Creces a tu ritmo. La "victoria" es auto-impuesta vía hitos visibles en UI (1er hangar nuevo, 1er millón de balance, contratar 1er Master mechanic, firmar contrato con las 4 aerolíneas, etc).

**Derrota** (Game Over, save bloqueado):
1. **Bancarrota**: balance < 0 durante 2 semanas consecutivas (gracia para corregir).
2. **Reputación cero**: reputación global ≤ 0 y todos los contratos cancelados.

**Final implícito de partida**: cuando el jugador decide. Save es continuo, no hay run.

**Por qué este modelo**: combina la libertad de Project Hospital con el riesgo real de Production Line. La derrota da tensión sin imponer un final artificial. Encaja con autenticidad: un MRO real no "gana", sobrevive y crece o cierra.

---

## 4. Game loop en 5 escalas

Diseñar el loop a varias escalas evita que el jugador se aburra en cualquier zoom temporal.

### 4.1 Microloop (15 segundos)
Tick del simulador: las WOs progresan en tiempo real (con multiplicador 1x/2x/5x/pause). El jugador ve barras moviéndose, contadores subiendo, notificaciones llegando. **Acción esperada**: scanear el panel principal, click ocasional para abrir detalle.

### 4.2 Loop táctico (1 minuto)
Llega una notificación: "WO crítica #248 sin asignar en stand 3, SLA 25 min". El jugador abre panel WO, ve qué mecánicos están libres y certificados, **asigna 1 certifier + 0-2 helpers**, confirma. Vuelve al panel principal. **Acción**: 3-5 clicks, decisión rápida.

### 4.3 Loop operativo (10 minutos)
Final de turno de mecánico, candidato nuevo en el mercado laboral, llega oferta de contrato nuevo. **Decisiones medias**:
- ¿Pedro pide aumento, negocio o lo dejo ir?
- ¿Acepto el contrato con SunAirlines aunque la penalty SLA es 2x la habitual?
- ¿Compro la herramienta especial X (single-buy CapEx) para acceder a las WOs de motor categoría 71?

### 4.4 Loop semanal (1 hora real ≈ 1 semana ingame a 5x)
Cierre semanal: cobras BaseFees de contratos, pagas salarios + costes fijos. KPIs visibles: ingresos brutos, neto, WOs completadas, % SLA cumplido, reputación delta. **Decisión estratégica**: ¿este beneficio lo reinvierto en hangar nuevo, en fichaje senior, en herramienta, o lo guardo de colchón?

### 4.5 Loop largo (sesión completa, 5-30 horas)
Crecimiento estructural: pasar de 1 hangar a 3, de 2 mecánicos a 20, de 1 contrato a 4. Desbloquear progresivamente type ratings nuevos (CFM56 + V2500), categorías licencias (empiezas solo B1, contratas B2 después), severidades de WO (al principio capamos a Minor/Major, Critical entra con reputación X).

---

## 5. Sistemas core

### 5.1 Sistemas que SÍ entran en MVP (Fase 2, vertical slice)

| Sistema | Alcance MVP | Por qué |
|---|---|---|
| **Tiempo + tick** | Pause / 1x / 2x / 5x. Reloj ingame visible. | Sin esto no hay loop. |
| **Contratos** | 4 aerolíneas ficticias, 1 contrato activable al arranque + 2 ofertables. | Mínimo para sentir el negocio. |
| **Aviones + scheduler** | Generación de landings según contrato (probabilísticos). Aparecen en stand, no se ven aterrizar. | Input del loop. |
| **Work Orders (line maintenance)** | 100 templates portados del CSV legacy. Generación 70% al landing. 5 fases. SLA. **Todo es line maintenance reactiva** (en stand, durante turnaround). Base maintenance entra en Fase 3. | Es el corazón. |
| **AOG flag** | Columna `isAOG` añadida al CSV. ~2-3% de WOs Critical son AOG. Penalty SLA x5, urgencia visual roja, no diferible. | Tensión gratis. Coste 1 columna + 1 condicional UI. |
| **Mecánicos** | 5-8 iniciales generados, type ratings, eficiencia, estados (Idle/ToPlane/Working/Returning). | Sin esto no hay decisión. |
| **Asignación UI** | Selector con filtro automático por certificación. Botón Asignar. | Reemplaza drag&drop legacy. |
| **Hangares** | 1 hangar inicial con N stands. Construible: hasta 3 hangares. | Decisión espacial sin 3D. |
| **Economía** | Balance, transacciones, weekly closing. | Sin esto no hay derrota. |
| **Reputación** | Global, sube/baja con éxito/fallo. Visible en HUD. | Mide rendimiento. |
| **Save/Load** | SQLite vía Tauri. Autoguardado cada cierre semanal. | Imprescindible para retention. |
| **i18n** | ES + EN, hot-reload runtime. | Locale ya traducido del legacy. |

### 5.2 Sistemas aparcados para fases posteriores

#### 5.2.A — Núcleo de profundidad aeronáutica (Fase 3) — sin esto el USP "autenticidad" se cae
| Sistema | Por qué entra en Fase 3 |
|---|---|
| **Mantenimiento planificado A/C/D checks** | Es la espina dorsal del MRO real. Generados por flight hours + cycles del avión. Bloquean stand de hangar durante horas/días/semanas. |
| **MEL / Deferrals** | WOs con `deferrable=true` muestran "Reparar ya" vs "Diferir N días/cycles". Decisión rica de gameplay. |
| **EASA Part-145 compliance** | KPI compliance 0-100. Auditoría cada 8 sem. <60 = multa. <30 = revocación temporal (game over económico probable). Es el endgame regulatorio. |
| **Service Bulletins (SBs)** | WOs recurrentes generadas por eventos (Airbus publica SB). Opcionales pero cobrables. |
| **Airworthiness Directives (ADs)** | WOs obligatorias con deadline duro. Si no se cumple → contrato con aerolínea cae. |
| **Cycles + flight hours como métricas duales del avión** | Activan triggers de checks. Sin esto, el A/C/D no tiene cómo dispararse. |
| **Inventario de piezas** (`partsRequired`) | Pedidos + lead time + proveedores. |
| **Herramientas especiales** (`toolsRequired`) | Single-buy CapEx que desbloquea WOs categoría ATA Y. |
| **Mercado laboral** (candidatos) | El BRIEF ya tiene Candidate diseñado. |
| **Type ratings adicionales** (V2500 además de CFM56) | Doblar el universo de WOs disponibles. |
| **KPI Manager + gráficos** | Visualización rica del weekly closing. |

#### 5.2.B — Profundidad tycoon (Fase 3-4) — convención del género
| Sistema | Fase | Por qué |
|---|---|---|
| **Turnos 24/7 (mañana/tarde/noche)** | Fase 3 | Sin esto los mecánicos trabajan 24h corridas, irreal. Define moral y disponibilidad. |
| **Moral / fatiga / satisfaction del mecánico** | Fase 3 | Estándar tycoon. Mecánicos cansados → eficiencia ↓. Burnout → renuncia. |
| **Training activo de mecánicos** | Fase 3 | Invertir €+tiempo en formar a Pedro para type rating V2500. Decisión: contratar senior o promocionar junior. |
| **Reputación segmentada por aerolínea** | Fase 3 | Además de global. Tu relación con SkyAirlines puede ser ★★★★☆ y con SunAirlines ★★☆☆☆. |
| **Eventos aleatorios** (huelga, runway closure, recall por SB urgente) | Fase 4 | Textura. |
| **Progresión meta del MRO** (Tier 1/2/3, hitos, logros) | Fase 4 | Sentido de avance largo. |
| **Difficulty modes** (realista / estándar / casual) | Fase 5 | Tres curvas: realista castiga errores, casual perdona. |
| **Pause-and-plan UX explícito** | Fase 2-3 | Asignaciones en pausa funcionan ya en MVP, pero la UX se afina cuando hay más cosas que asignar. |
| **Sistema de tooltips/help abundante** | Fase 5 | Tycoon serio sin tooltips = review negativo. |
| **Tutorial framework** | Fase 5 | Sobreingeniería para MVP. |
| **Sonido / música** | Fase 5 | — |
| **Accesibilidad** (font-size, daltonismo, screen reader donde se pueda) | Fase 5 | — |

#### 5.2.C — Parking (Tier 3, post-launch o nunca)
NDT como sub-disciplina · engine shop separado · múltiples aeropuertos/escenarios · mod support (Steam Workshop) · competencia con otros MROs · demanda estacional · borescope/APU/gear como componentes con vida útil propia · tooling calibration recurrente.

### 5.3 Modelo aeronáutico — terminología y conceptos (verdad del dominio)

Glosario interno del juego. Esto NO es flavor — son conceptos que el código y la UI usan tal cual, sin traducir a metáfora. El jugador hardcore reconoce estos términos.

| Concepto | Definición real | Cómo lo modela el juego |
|---|---|---|
| **Line maintenance** | Trabajo rápido en stand durante turnaround (mins–horas). Sin desmontaje mayor. | WOs del CSV legacy (20–60 min). Es lo que cubre el MVP. |
| **Base maintenance** | Trabajo profundo en hangar (días–semanas). Inspección, desmontaje, overhaul. | A/C/D checks. Fase 3. |
| **A-check** | Cada ~500 FH o ~2 meses. Ligero, ~10h totales, overnight o entre turnos. | Genera WO planificada. Bloquea stand unas horas. Fase 3. |
| **C-check** | Cada ~24 meses. Pesado, 1–2 semanas en hangar. Inspección estructural. | Bloquea stand de hangar durante días. Requiere planning. Fase 3. |
| **D-check** | Cada ~6–10 años. Overhaul total, hasta 2 meses. | Late-game milestone, riesgo y beneficio enormes. Fase 3-4. |
| **AOG (Aircraft On Ground)** | Avión inoperativo por fallo crítico. Aerolínea pierde miles €/h. | Flag `isAOG` en WO Critical. Penalty SLA x5, urgencia visual roja, no diferible. MVP. |
| **MEL (Minimum Equipment List)** | Lista de equipos cuyo fallo permite seguir volando N días/cycles. | WO con `deferrable=true` + `deferralDays/Cycles`. Decisión: arreglar ya o diferir. Fase 3. |
| **CDL (Configuration Deviation List)** | Similar a MEL para componentes externos (panel ausente, etc). | Subset de la mecánica MEL. Fase 3. |
| **Part-145** | Aprobación EASA de organisation MRO. Auditorías. Sin esto no operas legalmente. | KPI compliance + auditoría periódica + riesgo revocación. Fase 3. |
| **Part-66** | Licencia individual de mecánico (B1/B2 + type rating). | Ya en legacy y MVP. ✓ |
| **SB (Service Bulletin)** | Recomendación del fabricante (Airbus). Opcional o mandatoria. | WO recurrente generada por evento. Cobrable a la aerolínea. Fase 3. |
| **AD (Airworthiness Directive)** | Orden regulatoria de EASA/FAA. Cumplimiento obligatorio antes de deadline. | WO inevitable con deadline duro. Si no se cumple → contrato cae. Fase 3. |
| **FH (Flight Hours)** | Horas en vuelo. Métrica de envejecimiento. | Atributo del avión. Activa triggers de check. Fase 3. |
| **Cycles** | 1 ciclo = 1 takeoff + 1 landing. Estrés estructural. | Métrica dual junto a FH. Algunos checks van por cycles, no por hours. Fase 3. |
| **Type rating** | Habilitación del mecánico para `modelo + motor + categoría`. | Ya en legacy y MVP. ✓ |
| **Certifier** | Mecánico con type rating válido que firma la WO. Sin él, la WO no se cierra legal. | Ya en legacy y MVP (1 certifier mínimo por WO). ✓ |
| **Helper** | Mecánico sin type rating asignado a WO como apoyo. Aporta ≤0.5× efficiency del certifier. | Ya en legacy y MVP. ✓ |
| **Turnaround** | Tiempo del avión en tierra entre dos vuelos. Ventana para line maintenance. | El SLA de cada WO está dimensionado para entrar en turnaround típico. ✓ |
| **ATA chapter** | Numeración estándar (Air Transport Association) de sistemas del avión. Cap 21 = ECS, 71 = motor, etc. | Cada WO tiene su ATA. Usado para filtrar herramientas/ratings. Ya en CSV. ✓ |
| **MRO Tier** | Clasificación informal del taller (Tier 1 = puede todo / Tier 3 = sólo line + minor). | Progresión visible. Fase 4. |

---

## 6. Cierre de dudas abiertas (las 5 del brief Fase 0)

### 6.1 Hangares → SÍ, entidad de primera clase
- Hangar tiene: nombre, capacidad (N stands), nivel (1/2/3), categorías de WO permitidas, coste de upkeep semanal.
- MVP: 1 hangar inicial con 3 stands. Construible hasta 3 hangares totales (capacidad escalada).
- Decisión espacial sin 3D: el jugador asigna avión → hangar → stand. Si no hay stand libre, el avión espera en "ramp" con timer de penalty SLA corriendo.
- **Por qué**: añade decisión estratégica (cuándo expandir) sin coste de implementación 3D.

### 6.2 Inventario de piezas → APARCADO a Fase 3
- En MVP, `partsRequired` se muestra en el detalle de la WO pero se asume disponible sin gameplay.
- Fase 3: pedido + lead time (1-7 días según pieza), proveedores con precio/velocidad, riesgo de rotura de stock.

### 6.3 Herramientas → SINGLE-BUY CapEx en Fase 3
- En MVP, `toolsRequired` se muestra como info, no bloquea.
- Fase 3: herramientas especiales son CapEx único (€). Comprar herramienta X desbloquea WOs categoría ATA Y. No hay mantenimiento recurrente para no inflar UI.
- **Por qué single-buy y no rental**: la decisión "¿gasto 50k en herramienta de motor o no?" es interesante una vez por sesión, no recurrente.

### 6.4 Movimiento del mecánico → TIMER ABSTRACTO
- Conservar `OfficeToStandMinutes = 2` del legacy como timer abstracto (estado `ToPlane` durante N minutos).
- NO visualizar movimiento. El mecánico simplemente "está de viaje" durante 2 min ingame.
- **Por qué**: textura realista a coste cero. Penalización temporal que crea decisión (mecánico cercano vs mecánico más cualificado pero lejos).

### 6.5 Probabilidades duras del legacy → CONSERVAR + VALIDAR EN PLAYTEST
- Mantener: 70% prob WO al landing, 40% direct dispatch post-Inspection, 10% rework post-Test.
- Tunear en Fase 4 con datos reales de playtest. Inicialmente expuestos en `data/balance.json` para tunear sin recompilar.
- **Por qué conservar**: el legacy tenía estos valores tuneados, suficientes para MVP. Cambiarlos antes de playtest es perder información.

### 6.6 Line vs Base maintenance → AMBAS, pero escalonadas
- MVP cubre solo **line maintenance** (las 100 WOs del CSV legacy son todas line). Es el loop táctico rápido.
- Base maintenance (A/C/D checks) entra en Fase 3 como loop estratégico semanal/mensual.
- **Por qué ambas**: solo line = juego seco a medio plazo (las WOs se repiten). Solo base = sin tensión minuto a minuto. Las dos combinadas dan la profundidad real del MRO.

### 6.7 AOG (Aircraft On Ground) → FLAG MVP, 1 columna CSV
- Nueva columna `isAOG` en `data/workorders.json`. ~2-3% de las WOs Critical llevan `isAOG=true` (≈0.1% del total).
- Efectos: penalty SLA **×5**, badge rojo+pulse en UI, **no diferible** aunque sea normalmente diferible. Notificación con prioridad alta y sonido (Fase 5).
- **Por qué entra en MVP**: la mejor mecánica de tensión del MRO real, implementación trivial. Sin esto el MVP se siente plano.

### 6.8 MEL / Deferrals → Fase 3 como mecánica plena
- En MVP, el flag `deferrable` del legacy se ignora (todas las WOs hay que resolverlas).
- Fase 3: WOs con `deferrable=true` ofrecen modal "Reparar ya" / "Diferir hasta próximo C-check / N días / N cycles".
- Diferir = la WO entra en cola del avión, se reactiva cuando expira el deferral (típicamente coincide con un check programado, ergo ahorro de coste).
- Coste reputacional pequeño con la aerolínea por cada diferral (negativo si abusas).
- **Por qué Fase 3 y no MVP**: requiere tracking de cycles/hours del avión + UI nueva. Encaja con el bloque "núcleo de profundidad aeronáutica".

### 6.9 EASA Part-145 compliance → Fase 3 como meta-sistema
- KPI de compliance 0-100 visible en HUD junto a Balance/Reputación.
- Sube con: WOs cerradas sin incidencia, mecánicos correctamente asignados (rating válido), pocos diferrals usados.
- Baja con: WOs falladas, asignación de mecánico sin rating (bug del jugador, no se permitirá en MVP pero sí en Fase 3 con override "presionar mecánico no certificado"), quejas formales de aerolínea.
- Auditoría EASA cada 8 semanas: si compliance < 60 → multa (€€€). Si < 30 → revocación temporal (4 semanas sin operar, casi siempre game over económico).
- **Por qué Fase 3**: es el endgame regulatorio que diferencia este juego de cualquier otro tycoon. Sin esto, el USP "autenticidad" no se siente.

### 6.10 SBs y ADs → Fase 3, dos sabores
- **Service Bulletin** (recomendación Airbus): WO recurrente generada cada X semanas. Aerolínea decide aceptar (paga al MRO) o ignorar (sin penalty). Tasa de aceptación según contrato.
- **Airworthiness Directive** (orden EASA/FAA): WO obligatoria con deadline duro (ej. "antes de 90 días o el avión se groundea"). El MRO la ejecuta, cobra. Si no entra en deadline → contrato cae.
- **Por qué Fase 3**: trabajo recurrente no planificado que sazona la rutina de A/C/D + line.

### 6.11 Turnos 24/7, moral y training → Fase 3 (sistemas tycoon)
- **Turnos**: cada mecánico tiene un shift (mañana 06-14 / tarde 14-22 / noche 22-06). Disponible solo dentro de su shift. Configurable en panel Mecánicos.
- **Moral/fatiga**: contador 0-100 por mecánico. Baja con WOs Critical seguidas, horas extra, mal asignación. Sube con descansos, ratings nuevos conseguidos, salario por encima del solicitado. Eficiencia real = `base_efficiency × (moral/100)`.
- **Training**: panel de formación. Asignar mecánico junior a curso de type rating CFM56 → 2-3 semanas + €X coste, sale con rating nuevo. El mecánico está fuera de circulación durante el curso.
- **Por qué Fase 3**: son sistemas estándar tycoon que añaden decisiones operativas. Sin ellos el juego se siente mecánico y no humano.

### 6.12 Reputación segmentada por aerolínea → Fase 3
- Cada contrato lleva su propio score de reputación (0-100). El global se calcula como media ponderada por ingresos.
- Efectos: aerolínea con reputación alta ofrece contratos mejores; con reputación baja, amenaza con cancelar y luego cancela.
- **Por qué Fase 3**: añade política y estrategia. En MVP basta con reputación global para validar el loop.

---

## 7. Pantallas core (wireframes mentales)

MVP target: **4 pantallas principales**. Sin transiciones fancy, navegación por pestañas o sidebar.

### 7.1 Dashboard / HUD principal (always-visible top bar)
- Balance · Reputación · Reloj ingame · Speed controls · Notificaciones (badge)
- Activable: panel principal del hangar actual.

### 7.2 Panel Hangar (vista principal)
- Lista de stands ocupados. Cada stand muestra: avión (registration), contrato, WO activa (si hay), fase de WO, progress bar, SLA countdown.
- Lateral derecho: lista de mecánicos del hangar con estado actual.
- Click en WO → modal de detalle + asignar mecánicos.

### 7.3 Panel Mecánicos
- Tabla: nombre, base (B1/B2), type ratings, eficiencia, estado, salario, asignación actual.
- Filtros: por categoría, por rating, por estado.
- Fase 3: añadir mercado laboral (tab "Contratar").

### 7.4 Panel Contratos
- Lista de contratos activos + ofertas pendientes.
- Detalle: aerolínea, flota, BaseFee, PayPerMin, Penalty, reputación mínima, landings/día esperados.
- Botón Aceptar/Rechazar oferta.

### 7.5 Panel Economía (puede ser tab del dashboard en MVP)
- Ledger plano de transacciones recientes.
- KPIs numéricos: ingresos semana, gastos semana, neto, WOs completadas, % SLA.
- Sin gráficos en MVP (Fase 3).

**Total**: 4 pantallas principales + 1-2 modales (detalle WO, detalle mecánico). Cabe en una resolución 1366×768 sin scroll horizontal.

---

## 8. Estética y UI

- **Paleta**: oscura, tipografía sans-serif técnica (Inter, IBM Plex Sans, JetBrains Mono para números/timers).
- **Acento**: 1 color primario (azul aeronáutico o naranja seguridad — decidir en Fase 2 con prototipo).
- **Iconos**: emojis Unicode (legacy ya los usa: ⚙️ 🔧 ✈️ 📊 📋 🔔 ⏰ ✅ ⚠️ ❌). Cero sprite sheets.
- **Animaciones**: mínimas. Progress bars, fade-in de notificaciones, nada más.
- **Inspiración visual**: Bus Manager 26 (paneles oscuros densos), no Two Point Hospital (humor visual).

---

## 9. Decisiones cerradas en Fase 1 (no reabrir)

**Núcleo (visión + forma)**:
- ✅ **Forma**: sandbox infinito + derrota por bancarrota o reputación 0.
- ✅ **USP**: autenticidad aeronáutica nicho. Target hardcore.
- ✅ **Pantallas MVP**: 4 principales + 2 modales.
- ✅ **Iconos**: emojis Unicode, nada de spritesheets.
- ✅ **Save**: SQLite vía Tauri, autosave en cierre semanal.
- ✅ **Tipografía + estética**: oscuro, técnico, denso. Bus Manager 26 / Production Line como referencia.

**Sistemas operativos (cierre dudas Fase 0)**:
- ✅ **Hangares**: sí, entidad de primera clase. MVP con 1 inicial, hasta 3.
- ✅ **Inventario piezas**: aparcado a Fase 3.
- ✅ **Herramientas**: single-buy CapEx en Fase 3.
- ✅ **Movimiento mecánico**: timer abstracto (2 min), no visualizado.
- ✅ **Probabilidades legacy**: conservar valores (70/40/10), tunear en Fase 4.

**Modelo aeronáutico (nuevas en Fase 1, ronda 2)**:
- ✅ **MVP cubre solo line maintenance**. Base (A/C/D checks) en Fase 3.
- ✅ **AOG como flag** en MVP: columna `isAOG` + penalty x5 + no diferible. Coste mínimo, payoff alto.
- ✅ **MEL/Deferrals** como mecánica plena en Fase 3 (modal "reparar/diferir").
- ✅ **EASA Part-145 compliance** como meta-sistema Fase 3: KPI 0-100, auditoría cada 8 sem, multa <60, revocación <30.
- ✅ **SBs** (cobrables, opcionales) y **ADs** (obligatorias, deadline duro) en Fase 3.
- ✅ **Métricas duales avión**: flight hours + cycles a partir de Fase 3 (necesarias para triggers de check).
- ✅ Glosario aeronáutico del juego: terminología real sin traducir (ATA, type rating, certifier, helper, turnaround) — ver §5.3.

**Profundidad tycoon (nuevas en Fase 1, ronda 2)**:
- ✅ **Turnos 24/7** (mañana/tarde/noche) en Fase 3. Mecánico disponible solo en su shift.
- ✅ **Moral/fatiga/satisfaction** de mecánicos en Fase 3. Eficiencia real = base × (moral/100).
- ✅ **Training activo** de mecánicos para type ratings nuevos en Fase 3.
- ✅ **Reputación segmentada por aerolínea** en Fase 3 (además del global, que se mantiene).
- ✅ **Difficulty modes** (3 niveles: realista / estándar / casual) en Fase 5.
- ✅ **NDT, engine shop, múltiples aeropuertos, mod support, competencia, estacionalidad** → Parking (post-launch o nunca).

---

## 10. Riesgos vivos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Time-box Fase 2 se desborda** | Media | Alto | Recortar alcance del MVP, no la fecha. Si en semana 1 vamos justos, cae el panel Economía (sustituir por números en HUD) o el 2º hangar. |
| **Tauri tiene fricción no prevista** | Baja | Medio | Fallback Godot 4 ya decidido. Reevaluar al final de Fase 2 día 3 (POC Tauri funcional sí/no). |
| **Loop demasiado seco / aburrido** | Media | Alto | Validar con un playtest interno al final de Fase 2 (2-3 personas, sesión 30 min). Si no engancha, ajustar timing/feedback antes de Fase 3. |
| **Dataset 100 WOs no tiene variedad sentida** | Baja | Medio | Ya cubre 25 ATA chapters; debería bastar. Si en playtest los jugadores notan repetición, añadir 50 más con foco en motor y avionics. |
| **Nombre comercial colisiona con marca real** | Media | Bajo | Decisión Fase 6, cuando hay producto. Por ahora "MRO Tycoon" es código. |
| **Target nicho demasiado pequeño** | Media | Alto | Demo gratuita en Steam Next Fest mide interés antes del launch. Si <500 wishlists, replantear posicionamiento Fase 6. |
| **Scope creep aeronáutico en Fase 3** | Alta | Alto | El roadmap §5.2.A tiene 11 sistemas. Tentación de meter todo. Mitigación: Fase 3 prioriza el cluster **A/C/D checks + MEL + Part-145 + cycles/FH** como núcleo de profundidad; SBs/ADs + turnos + moral + training quedan para Fase 4. Confirmar split al cierre de Fase 2 con datos. |
| **Realismo asfixia accesibilidad** | Media | Medio | Difficulty modes en Fase 5 ofrecen "casual" con auto-asignación y sin auditorías Part-145. Realista castiga, casual perdona. Asegura que el nicho hardcore y el tycoon enthusiast curioso coexisten. |

---

## 11. KPIs internos de desarrollo (cómo medimos éxito por fase)

| Fase | Métrica clave de cierre |
|---|---|
| Fase 1 (esta) | GDD firmado. Decisiones de §9 todas cerradas. |
| Fase 2 (MVP) | Vertical slice jugable: aceptar 1 contrato → asignar mecánico → completar WO → cobrar → cierre semanal. Funciona end-to-end. |
| Fase 3 | Núcleo profundidad aeronáutica (A/C/D checks, MEL/deferrals, Part-145, cycles+FH) + sistemas tycoon clave (turnos, moral, training, reputación segmentada) + candidatos + type ratings múltiples + inventario + herramientas + KPI gráficos. |
| Fase 4 | SBs/ADs como WO recurrentes, eventos aleatorios, progresión meta (MRO Tier 1/2/3, hitos, logros), balance tuning vía playtest interno. |
| Fase 5 | Polish: sonido, accesibilidad, performance. Build estable 1 hora sin crash. |
| Fase 6 | Steam page live, demo descargable, ≥500 wishlists pre-launch. |
| Fase 7 | Launch. Reviews ≥80% positivas mes 1. |

---

## 12. Próximo paso

Fase 1 cerrada con este documento. **Siguiente hilo: Fase 2 — Vertical Slice HTML + Tauri.** Pre-requisitos para arrancar:

1. POC Tauri instalado y "hola mundo" funcional (1 día).
2. Estructura de proyecto definida (`src/` con módulos: `sim/`, `ui/`, `data/`, `i18n/`).
3. Datos del legacy portados: `data/workorders.json` (parseado del CSV), `data/i18n/{es,en}.json`, `assets/airlines/*.png`, `assets/avatars/*.png`.
4. Loop mínimo working: tick + 1 contrato + 1 avión + 1 WO + 1 asignación + cobrar.

Time-box Fase 2: **2 semanas**. Si llega al día 10 sin loop end-to-end, recortar (ver §10).

---

**Generado**: 2026-05-13 · **Input**: `unity_legacy/BRIEF_recovery.md` · **Output**: este fichero. Sirve como input directo de Fase 2.
**Última revisión (ronda 2)**: 2026-05-13 — añadido modelo aeronáutico completo (§5.2.A, §5.3, §6.6-6.12). Cerrado hueco "autenticidad" tras revisión crítica.
