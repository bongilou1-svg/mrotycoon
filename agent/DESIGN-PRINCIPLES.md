# DESIGN-PRINCIPLES.md — Criterio de diseño del agente

> Este fichero es la **brújula** del agente autónomo de MRO Tycoon. Antes de proponer o
> aplicar cualquier cambio de jugabilidad, el agente contrasta la idea contra estos
> principios. Si un cambio no mejora ninguno de ellos —o empeora alguno sin compensar—
> no entra. Cuando dos principios chocan, se anota el tradeoff en `DECISIONS.md` y se
> elige explícitamente.

## Qué hace divertido a un tycoon / management sim

### 1. Decisiones con tradeoffs reales
Cada decisión relevante debe tener un coste de oportunidad legible. Si existe una opción
que es mejor en todos los ejes (estrategia dominante), la decisión deja de serlo y el
jugador entra en piloto automático. Buscamos que "depende": contratar otro mecánico sube
capacidad pero quema caja y baja margen; aceptar un contrato jugoso obliga a rechazar otro;
priorizar un AOG hunde el turnaround de los demás. **Regla de diseño:** ninguna palanca
debe ser siempre la respuesta correcta.

### 2. Bucle central tight: actuar → ver consecuencia legible → ajustar
El núcleo del juego es un lazo corto y rápido. El jugador hace algo, ve en segundos qué
provocó, y reacciona. Si la consecuencia tarda demasiado o llega difusa, el aprendizaje se
rompe y el juego se siente como rellenar hojas de cálculo. **Regla de diseño:** toda acción
del jugador produce un feedback observable dentro del horizonte que el jugador aún recuerda
haber tomado la decisión.

### 3. Onboarding suave y complejidad que escala
El primer cuarto de hora enseña UNA cosa a la vez. Los sistemas se desbloquean por capas, no
todos de golpe. El MRO de línea pura (1 aerolínea, oficina mínima) es el tutorial natural; los
hangares, certificaciones y vendors entran cuando el jugador ya domina lo anterior.
**Regla de diseño:** nunca presentar un sistema nuevo mientras el jugador aún lucha con el
anterior. La curva sube, no salta.

### 4. Economía con tensión pero sin death-spirals ni snowball runaway
La caja debe apretar lo justo para que las decisiones importen, pero un mal turno no debe
condenar la partida sin remedio (death-spiral), ni un buen arranque debe garantizar la
victoria pasiva (snowball runaway). Buscamos mean-reversion suave: ir bien abre oportunidades
más caras y arriesgadas; ir mal deja siempre un camino de vuelta, aunque doloroso.
**Regla de diseño:** existe siempre una jugada de recuperación legible desde casi cualquier
estado, y el éxito temprano no se autoamplifica sin nuevas decisiones.

### 5. Objetivos a corto / medio / largo y sensación de progresión
El jugador siempre tiene un "ahora mismo" (cerrar este check a tiempo), un "esta semana"
(no quedarme sin caja, subir reputación con Iberia Express) y un "horizonte" (abrir el primer
hangar, diversificar aerolíneas, llegar a endgame). La progresión se siente: desbloqueos,
crecimiento del MRO en etapas, números que suben de forma ganada. **Regla de diseño:** en
todo momento el jugador puede nombrar su próximo objetivo en cada una de las tres escalas.

### 6. Juice y feedback: que las acciones se sientan
Los números que cambian, un sonido al cerrar un check, una animación al recibir piezas, un
toast cuando un contrato entra o una SLA se rompe. El juice no es decoración: es lo que
convierte un cambio de estado abstracto en una recompensa sentida. **Regla de diseño:** los
eventos con peso emocional (cobro, penalización, AOG, contrato nuevo) tienen feedback
audiovisual proporcional a su importancia.

### 7. Estado siempre legible de un vistazo
El jugador debe poder mirar la pantalla durante dos segundos y saber: ¿voy bien o mal?,
¿qué arde?, ¿qué decisión me espera? Dashboards densos pero jerarquizados (estética control
room), con lo crítico arriba y lo de detalle a un clic. **Regla de diseño:** ninguna decisión
urgente queda escondida tras navegación; lo importante grita, lo secundario espera.

### 8. Fallar enseña y es recuperable, no arbitrario
Cuando el jugador pierde un contrato o rompe una SLA, debe entender por qué y qué habría hecho
distinto. Los fallos vienen de decisiones, no de dados ocultos. Y casi siempre hay una salida:
renegociar, recortar, pivotar. **Regla de diseño:** todo game-over o pérdida grave es
trazable a decisiones del jugador y telegrafiado con antelación; nada mata por sorpresa.

## Mecánicas que aprovechan el dominio MRO real

El USP del juego es la **autenticidad del nicho**. Las mejores mecánicas no son genéricas de
tycoon repintadas de aviones: nacen de tensiones reales del mantenimiento aeronáutico.

- **AOG (Aircraft On Ground):** el avión parado no vuela y no factura — ni para la aerolínea
  ni, indirectamente, para tu reputación. El AOG es la urgencia máxima: rompe tu planificación,
  fuerza priorización, justifica pagar de más por una pieza o un mecánico extra. Es el evento
  que mejor encarna el principio 1 (tradeoff) y el 6 (juice).
- **Stockouts y decisiones de reorder:** no tener la pieza cuando la necesitas convierte un
  check rutinario en un AOG. Reordenar a tiempo cuesta caja inmovilizada; reordenar tarde
  cuesta el turnaround. El punto de reorder es una decisión recurrente con tensión real.
- **Contratos con vendors:** lead times, mínimos de pedido, descuentos por volumen, fiabilidad
  del proveedor. Elegir vendor barato-pero-lento vs caro-pero-rápido es un tradeoff de manual.
- **Turnaround time (TAT):** el reloj del MRO. Cada check tiene una ventana; cumplirla sube
  reputación y libera el stand, pasarte la hunde y encadena retrasos. El TAT conecta capacidad,
  inventario y personal en una sola métrica legible.
- **Certificados y garantías:** habilitaciones de tipo, vigencias, alcance de trabajo
  autorizado. Determinan qué trabajos puedes aceptar; invertir en certificación abre mercado
  pero cuesta y caduca. Palanca clásica de progresión a medio/largo plazo.
- **Reputación segmentada por aerolínea:** ya existe en el juego; cumplir genera ofertas
  automáticas, fallar repetido genera rescisión. Es el motor de objetivos a medio plazo.

## Cómo usa el agente este fichero

1. Toda hipótesis del `BACKLOG.md` cita qué principio(s) busca reforzar.
2. Antes de implementar, el agente escribe en `DESIGN-LOG.md` qué espera que pase y cómo lo
   evaluará (métrica de playtest, sensación, test automático).
3. Si un cambio mejora un principio a costa de otro, el tradeoff se registra en `DECISIONS.md`.
4. Tras cada run, el agente revisa si el cambio movió la aguja en el principio objetivo;
   si no, lo revierte o lo marca como hipótesis fallida (y eso también se aprende).
