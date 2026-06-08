# BACKLOG.md — Hipótesis de mejora de jugabilidad

> Ideas de **diseño** para explorar, no bugs. Cada entrada es una hipótesis: un cambio que
> *creemos* mejora la diversión, con el principio que lo justifica y cómo sabríamos si funciona.
> El agente las toma de aquí, las prueba en `autonomous`, y registra el resultado en
> `DESIGN-LOG.md`. Estado: 🔵 sin empezar · 🟡 en prueba · 🟢 validada · 🔴 descartada.

---

## H1 — Punto de reorder dinámico con tensión de caja 🔵
**Principios:** 1 (tradeoffs), 4 (economía sin death-spiral), dominio MRO (stockouts/reorder).
**Hipótesis:** hoy el inventario es demasiado pasivo. Si el reorder fuerza una decisión real
—inmovilizar caja comprando stock de seguridad vs arriesgar un stockout que dispare un AOG—
el bucle de inventario pasa de tarea administrativa a decisión con tensión.
**Diseño a explorar:** punto de reorder configurable por pieza, con lead time del vendor visible
y coste de capital por stock parado. Stockout en pieza crítica → AOG inmediato.
**Cómo evaluar:** en auto-playtest, ¿el jugador óptimo varía su política de reorder según
caja? Si una sola política gana siempre, la hipótesis falla (sería estrategia dominante).

## H2 — AOG como evento-decisión, no como castigo aleatorio 🔵
**Principios:** 1, 2 (consecuencia legible), 6 (juice), 8 (fallar enseña), dominio (AOG).
**Hipótesis:** un AOG bien diseñado es el momento más memorable de una sesión. Si llega
telegrafiado y ofrece opciones reales (pagar pieza premium con lead time exprés, robar pieza
de otro check, aceptar el retraso y comerse la penalización SLA), se convierte en el pico de
tensión del bucle en vez de un golpe arbitrario.
**Diseño a explorar:** panel de AOG con 2-3 respuestas, cada una con su tradeoff de
caja/tiempo/reputación, y feedback fuerte (sonido + toast + contador).
**Cómo evaluar:** ¿los jugadores eligen respuestas distintas según su estado? ¿el game-over
por AOG es siempre trazable a una decisión previa (no a un dado)?

## H3 — Vendors con personalidad (rápido-caro vs lento-barato vs fiable) 🔵
**Principios:** 1, 3 (complejidad que escala), dominio (contratos con vendors, lead time).
**Hipótesis:** un único proveedor genérico no genera decisión. 2-3 vendors con perfiles
claros (lead time, precio, fiabilidad, mínimos de pedido) convierten cada reorder en una
elección estratégica que además escala bien: al principio compras al fiable, luego optimizas.
**Diseño a explorar:** tabla de vendors desbloqueable, con fiabilidad que puede fallar
(entrega tardía aleatoria pero acotada), descuentos por volumen.
**Cómo evaluar:** ¿se usa más de un vendor a lo largo de la partida? Si uno domina siempre,
rebalancear o descartar.

## H4 — Objetivos escalonados visibles (corto/medio/largo en HUD) 🔵
**Principios:** 5 (objetivos en tres escalas), 7 (estado legible), 3 (onboarding).
**Hipótesis:** el jugador a veces no sabe "a por qué voy ahora". Un panel ligero con el
objetivo inmediato (cerrar check X), el de la semana (caja/reputación) y el hito de horizonte
(abrir hangar / nueva aerolínea) da dirección sin dirigismo y refuerza la progresión.
**Diseño a explorar:** widget de 3 líneas siempre visible, que se actualiza solo según estado;
cumplir un hito dispara juice (toast + sonido) — enlaza con H5.
**Cómo evaluar:** ¿reduce la parálisis de decisión en los primeros minutos? ¿los nuevos
jugadores en playtest nombran su próximo objetivo sin dudar?

## H5 — Capa de juice en eventos económicos clave 🔵
**Principios:** 6 (juice), 2 (consecuencia legible), 7 (legibilidad).
**Hipótesis:** cobros, penalizaciones SLA, contratos nuevos y cierres de check son los momentos
con más peso emocional, y hoy pasan demasiado callados. Añadir feedback proporcional (contador
que tickea, toast, sonido, micro-animación) hace que el progreso se *sienta* ganado y mejora
la retención sin tocar balance.
**Diseño a explorar:** sistema de feedback centralizado que escala intensidad con la magnitud
del evento (un cobro pequeño susurra, un AOG resuelto celebra).
**Cómo evaluar:** subjetivo (playtest Dani) + objetivo: que no introduzca ruido que tape
información crítica (principio 7 no debe empeorar).

---

## Notas de priorización
- **Orden sugerido para el agente:** H4 y H5 son de bajo riesgo y alto retorno de sensación
  (no tocan balance) → buen primer run para calibrar el harness. H1/H2/H3 tocan economía y
  conviene probarlas con auto-playtest detrás para vigilar death-spirals/dominancia.
- Toda hipótesis que toque balance pasa por la batería de tests existente (940/940 verde es la
  línea base) antes de considerarse válida.
