# BRIEF de recuperación — MRO Tycoon Unity legacy

> **Output Fase 0**. Resumen de lo extraído del proyecto Unity viejo en `D:\Documents\MRO_Tycoon\`. Esto NO es plan de portado — es inventario de **qué hay y qué vale conservar** de cara al rediseño Fase 1+.

---

## TL;DR

El proyecto Unity legacy es **un MVP de tycoon de MRO al ~35-40%** con arquitectura seria: event bus, save system, adapters, theme manager, tutorial framework, locale ES+EN, KPI con gráficos. **Lo que vale ORO: el diseño de dominio + 100 work orders reales + locale + lógica de fases de WO + sistema de certificaciones EASA.** Lo que cortamos: todo el código C#, prefabs 3D, TaxiPath/DecisionPoint físico, movimiento de mecánicos en world space, packs de aviones/aeropuerto.

Decisión central que ya nos da el legacy: **plataforma A320/A321 con motores CFM56/V2500** y mecánicos con **licencias EASA B1/B2**. Es una elección de diseño concreta y buena (es el narrowbody más vendido del mundo, mercado MRO real gigantesco). La mantenemos.

---

## Concepto del juego (extraído del legacy)

Eres **director de un MRO independiente** que da servicio a aerolíneas ficticias (SkyAirlines, SunAirlines, TreeAirlines, Starairlines). El bucle es:

1. **Firmas contratos** con aerolíneas. Cada uno define: flota a servir, landings esperados por día, ingreso fijo semanal (`BaseFeePerWeek`), pago por minuto de WO (`PaymentPerWOMinute`), penalización por minuto fuera de SLA (`PenaltyPerLateMinute`), reputación mínima requerida.
2. **Llegan aviones** según el scheduler diario del contrato.
3. **En el stand, hay una probabilidad** (70% por defecto) de que aparezca una **Work Order** sacada del catálogo. La WO tiene categoría EASA requerida (B1 o B2), duración estándar, modelo+motor compatibles, ATA chapter, severidad (Minor/Major/Critical), deferrable según MEL, piezas/herramientas requeridas.
4. **Asignas mecánicos** a la WO. Necesitas al menos **un certifier** (mecánico con type rating válido para `modelo+motor+categoría` exigida). Puedes añadir helpers (no certifiers), pero aportan máximo `0.5 × efficiency_del_certifier`.
5. **La WO progresa en 5 fases**: Travel (mecánicos viajan al stand) → Inspection (15% del total) → MainTask (100% del total) → Test (10%) → opcionalmente Rework (igual que MainTask) → Completed. Hay un 40% de "direct dispatch" (skip post-Inspection) y un 10% de rework tras Test.
6. **Cobras** WO×duraciónMinutos×payRate. Si te sales del **SLA** (= 105% de la duración estándar), penalización por minuto. Reputación sube/baja en tiempo real según éxito/fallo.
7. **Fin de semana**: cobras `BaseFeePerWeek` de cada contrato activo, pagas costes fijos + salarios.

Hay **mercado laboral** (Candidate): candidatos generados con licencias, ratings, experiencia, salario solicitado, factor de negociación, "high demand" (+20%). Caducan a 2 semanas. Niveles: Junior (<1000h) → Experienced → Senior → Expert → Master (>10000h).

---

## Datos del dominio (schema directo a TS/JSON)

Tabla resumen de los modelos. Cuando portemos en Fase 2, esto va a tipo TypeScript/Zod 1:1.

| Entidad | Campos clave | Notas |
|---|---|---|
| **Contract** | id, AirlineName, AirlineLogo, AircraftTypes[], FleetSize, ExpectedLandingsPerDay, BaseFeePerWeek, PaymentPerWOMinute, PenaltyPerLateMinute, MinReputation, Active | Scriptable Object. Listas inicializadas en escena. |
| **Mechanic** | Name, Base (B1/B2), Ratings[]={Model, Category, EngineVariant}, Efficiency (0.8-1.2), State (Idle/ToPlane/Working/Returning), AssignedWO, TargetPlaneRegistration | Estados claros + tiempo de viaje. |
| **Candidate** | Name+Surname, Guid, Base, Ratings[], ExperienceHours, SkillLevel (1-10), Efficiency (0.5-1.5), RequestedHourlySalary, NegotiationFactor, IsHighDemand, Specialization (Engines/Avionics/Hydraulics/Electrical/Structures), AvailableUntil, ProgressionTier (1-5) | Buena base para mercado laboral. |
| **AirplaneInstance** | Registration, ModelData (Name+EngineVariant), EngineVariant, Status (Idle/InHangar/InMaintenance), ActiveWOs[], Contract | Light. |
| **AircraftModelData** | Name, EngineVariant | SO. Hoy A320/A321. |
| **WorkOrderTemplate** | id, description, requiredCategory (B1/B2), durationMinutes, aircraftModelsCompatibles, engineVariantsCompatibles, ATA, deferrable, probability, severity (Minor/Major/Critical), partsRequired, toolsRequired, notes | **100 templates ya escritos en `we_template.csv`** — ATA chapters reales. |
| **WorkOrderInstance** | Template, Airplane, AssignedMechanics[], Phase (ToPlane→Inspection→MainTask→Test→Rework→Completed), phaseDurations[5], emissionMinute, status, SLA=duration×1.05 | Lógica de fases muy currada, vale para portar conceptualmente. |
| **TypeRating** | Model, Category (B1/B2), EngineVariant | Cómo se autoriza un mecánico a una WO. |
| **Economy** | Balance, AddIncome/AddExpense, TransactionType (Salary, ContractBaseFee, WorkOrderPayment, Penalty, Refund, Purchase, Other), ProcessWeeklyCosts | Ledger separado. Single source = GameSettings. |

### Constantes del game design (GameSettings.cs — implícitas en código)
- **StartingBalance**: definido en SO (no inspeccionado aún, pero existe).
- **WeeklyFixedCost** + **MechanicWeeklySalary**: costes fijos semanales.
- **DefaultPaymentPerWeek**, **DefaultPaymentPerMinuteWO**, **DefaultPenaltyPerMinuteSLA**: fallbacks cuando el contrato no los define.
- **DefaultReputationChangeWO**: delta reputación por WO completada/fallada.
- **ProbWOAtStand**: 0.7 → 70% de aviones generan WO al llegar.
- **ProbDirectDispatch**: 0.4 → 40% saltan post-Inspection sin MainTask.
- **ProbReworkAfterMainTask**: 0.1 → 10% rework tras Test.
- **OfficeToStandMinutes**: 2 → tiempo de viaje del mecánico (¡cortar visualmente en MVP, mantener como timer abstracto!).

### Dataset de Work Orders (we_template.csv) — 100 entradas reales

Cobertura por capítulo ATA (sample):
- **12** Servicing (refueling, MLI), **21** ECS/Avionics ventilation, **22** AFS/FMGC, **23** Comms (HF/VHF/PA/CVR), **24** Electrical (115V/400Hz), **25** Cabin (sunvisor, seats, coffee maker, ovens), **26** Fire extinguisher, **27** Flight controls (slat/flap), **28** Fuel (transfer, jettison), **29** Hydraulics (reservoir, accumulators, RAT), **30** Anti-ice, **32** Landing gear (MLG/NLG wheels, brakes), **33** Lights (nav, landing, taxi, taxi/wing), **34** Avionics test (radio altimeter, EGPWS, MMR, TCAS), **35** Oxygen (crew bottle, generators, portable), **36** Pneumatic (BMC), **38** Water/waste (lavatory, toilet), **49** APU, **52** Doors (seals, dampers, rubbing strips), **56** Windshield, **71** Engine oil.

Durations: **20-60 min**. Severities: ~85% Minor, ~12% Major, ~3% Critical. Categorías: ~60% B1, ~40% B2. Aircraft compatibles: todas A320/A321; motores CFM56/V2500 (universo cerrado, intencional).

### Aerolíneas ficticias (logos PNG ya hechos)
SkyAirlines, SunAirlines, TreeAirlines, Starairlines. Los **conservamos** — vintage low-fi va perfecto con la estética text+esquemática del nuevo juego.

### Localización (Resources/Localization/)
`spanish.json` + `english.json`. **70+ keys traducidas** con emojis ya en los strings (⚙️ MECÁNICOS, ✈️ ÓRDENES DE TRABAJO, 📊 ECONOMÍA, 📋 CONTRATOS, 🔔 NOTIFICACIONES, ⏰ EN PROGRESO, ✅ COMPLETADO, ⚠️ PENDIENTE, ❌ FALLIDO, etc). Port directo a i18n JS (i18next o solución propia ligera).

---

## Arquitectura legacy (qué vale el patrón, NO el código)

Patrones que mantenemos por conceptualmente sólidos (los re-implementamos en JS/TS, no se transpila):

- **Event Bus desacoplado**: pub/sub global (`NotificationEvent`, `GameDataLoadedEvent`, `WorkOrderCreatedEvent`, etc). En JS: simple `EventTarget` o emitter custom.
- **Adapter layer**: UI no conoce models directamente, va a través de `WorkOrderAdapter`, `MechanicAdapter`, `AirplaneAdapter`, `EconomyAdapter`, `ReputationAdapter`. Esto evita acoplamiento y permite swap de impl. **Conservar este patrón** en Fase 2.
- **Save System con GameState plano + States específicos** (`MechanicState`, `CandidateState`, `WorkOrderState`). Serialización trivial a JSON.
- **Theme System** (ThemeManager + UITheme + UIThemeConnector + HoverEffectManager + TextManager + TextFormatterUtility): consistencia visual. En CSS variables + clases utility, hueso simple.
- **Tutorial framework** (10 archivos: TutorialManager, TutorialDatabase, TutorialStep, TutorialHighlight, TutorialEvents, TutorialUI, TutorialIntegration, TutorialSetup, TutorialEnums, TutorialStepsInitializer, TutorialMissingTypes). Sobreingeniería para MVP. **Aparcar en Fase 5**, NO Fase 2.
- **Localization runtime** con bootstrap y LocalizedText component. Reemplazar por hook React/JS simple. ES y EN listos.
- **KPI Manager + Graph** (KPICardUI + KPIGraphUI + PanelKPIUI). Datos guardados, chart simple. **Lo conservamos en Fase 3**, no antes.

---

## Qué cortamos (NO portar)

| Cosa | Por qué cortarla |
|---|---|
| Código C# completo (~95 archivos) | Re-implementación TS/JS desde cero, más limpia |
| Polyeler Simple Aircraft Pack | 3D, no lo usamos |
| AirportPack | 3D, no lo usamos |
| EasyRoads3D | 3D, no lo usamos |
| TaxiPath + DecisionPoint | Eran world-space; lo abstraemos a "stand asignado" sin movimiento |
| AirplaneSpawner + DailyAirplaneScheduler + AircraftLandingAndTaxiController | Lógica acoplada a 3D; en texto = "avión aparece en stand X a hora Y" |
| MechanicDragHandler + DropZoneCertifier + DropZoneWO + MechanicDropZone | Drag&drop spatial; reemplazar por selector UI (botón Asignar) |
| DayNightCycle | Visual, no aporta gameplay |
| Graphy (Ultimate Stats Monitor) | Debug perf de Unity, irrelevante |
| uDialog | Plugin de diálogos Unity, hay alternativas web 100x más ligeras |
| x Dark UI / Dark UI | Reskin propio en CSS, no necesitamos asset Unity |
| PlayerPrefsEditor | Reemplazado por SQLite o localStorage (en MVP) |
| URP / SpriteShape / 2D animation | Stack render 2D-3D Unity, irrelevante |

---

## Riesgos y dudas para Fase 1 (GDD)

Cosas que el legacy tiene pero **no decide bien** y hay que cerrar antes de codear:

1. **Hangares**: el legacy maneja "stands" (TaxiPath ranura) pero **no hay concepto de hangar** explícito en los modelos. ¿En la versión nueva tenemos hangar como entidad (con capacidad, certificaciones, mejoras)? Recomiendo **sí**: añade decisión espacial sin necesidad de 3D.
2. **Inventario de piezas**: `partsRequired` está en el template del WO pero **no hay sistema de stock**. En el legacy las piezas son lore, no gameplay. Si lo metemos en Fase 3, hay que diseñar pedido + lead time.
3. **Herramientas**: similar a piezas, `toolsRequired` es lore. ¿Lo metemos como CapEx único o como mantenimiento recurrente? Recomiendo **single-buy** para no inflar UI.
4. **Movimiento del mecánico**: `OfficeToStandMinutes=2`. En la versión nueva, ¿lo mantenemos como timer abstracto (recomendado) o lo eliminamos? Timer da textura realista sin coste de implementación.
5. **Probabilidades duras de gameplay** (40% direct dispatch, 10% rework). Conservadoras pero sin justificación. En GDD validamos con cálculo de duración media de WO esperada.
6. **Save system**: el legacy guarda balance, reputación, mecánicos, candidatos, WOs activas, GameClock. **Mantenemos el contrato**. Storage: SQLite vía Tauri (vs localStorage o JSON file). SQLite es el más limpio.
7. **Localización al primer arranque**: el legacy fuerza reinicio para cambiar idioma. Mejor en versión nueva: hot-reload en runtime.
8. **Multiplataforma**: Steam pide Windows mínimo; Mac y Linux son bonus. Tauri lo cubre todos a coste cero.

---

## Activos reutilizables (lift-and-shift)

Estos archivos los **copiamos tal cual** al nuevo proyecto al arrancar Fase 2:

| Archivo legacy | Destino nuevo proyecto | Tratamiento |
|---|---|---|
| `Assets/Resources/Localization/spanish.json` | `src/i18n/es.json` | Reformato a estructura key-value plana |
| `Assets/Resources/Localization/english.json` | `src/i18n/en.json` | Idem |
| `Assets/Resources/Data/we_template.csv` | `data/workorders.csv` (o JSON) | Parsea, ya está limpio |
| `Assets/Resources/Airlines/*.png` (4 logos) | `assets/airlines/` | Lift directo |
| `Assets/Resources/Mecanicos/*.png` (2 avatares IA) | `assets/avatars/` (pool inicial) | Lift directo |
| `Assets/Resources/Background.png` | `assets/ui/background.png` | Evaluar si encaja con la estética nueva |
| `Assets/Resources/iconos1.png` | `assets/ui/icons-sheet.png` | Evaluar |

Iconos UI: la mayoría ya están en los strings de locale como emojis Unicode. **NO necesitamos sprite sheet de iconos** en MVP — los emojis bastan y son free.

---

## Decisiones cerradas (NO reabrir)

- ✅ **Plataforma de aviones**: A320/A321 con CFM56/V2500. Mercado real, dataset cerrado.
- ✅ **Categorías de licencia mecánico**: EASA B1 (mecánica) + B2 (avionics). Realista.
- ✅ **Aerolíneas iniciales**: 4 ficticias ya con logos.
- ✅ **Idiomas**: ES + EN. Locale ya está traducido.
- ✅ **Lógica de fases de WO**: 5 fases con probs (40% direct dispatch, 10% rework). Conservar tal cual.
- ✅ **Estética UI**: emojis Unicode en lugar de iconos custom (mantener simplicidad).
- ✅ **Movimiento mecánico**: timer abstracto, NO visualización.
- ✅ **Drag&drop**: cortado. Selector UI con botón Asignar.

---

## Próximo paso: cerrar Fase 0, abrir Fase 1

Con este brief cerramos Fase 0. **El siguiente hilo (Fase 1) entrará al GDD** apoyándose en este documento:

- Definir loop principal en 4 escalas (15s, 1min, 10min, 1h, partida completa).
- Decidir condición de victoria/derrota (sandbox infinito o campaña de N semanas).
- Decidir USP comercial (qué tiene MRO Tycoon que Project Hospital/Software Inc. no).
- Cerrar hangares, inventario, herramientas, progresión (las dudas listadas arriba).
- Wireframe de las 4-5 pantallas core.

---

**Generado**: 2026-05-13 · **Source legacy**: `D:\Documents\MRO_Tycoon\` · **Output**: este fichero, ~600 líneas que valen como input directo de Fase 1.
