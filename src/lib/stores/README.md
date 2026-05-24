# stores/

Estado vivo del juego en stores Svelte: `gameTime`, `balance`, `reputation`, `mechanics`, `airplanes`, `workorders`, `contracts`, `notifications`.

Cada store es la fuente de verdad de su dominio. El sim/ los muta vía funciones puras y los componentes ui/ los leen.
