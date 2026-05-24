# Textures — packs Kenney + sprites baked

Aquí van los PNG de sprites usados por el driver Pixi (skin `ceopng`).

## Origen

- **Packs Kenney.nl** (CC0): vehículos, edificios, personas, props
- **Aviones**: NO existe pack Kenney de aviones top-down — los genera Pixi al
  arrancar via `sprite-bakery.ts` (estilo Kenney baked desde Graphics +
  RenderTexture, ~128×128 PNG en memoria, no requiere archivo)

## Estructura esperada

```
textures/
  vehicles/        — coches, furgos, camiones, escalera. Kenney "Vehicle Pack" + "Top-Down Tanks"
    car_blue.png
    car_red.png
    car_white.png
    van_purple.png      # furgo mec (color override en runtime)
    truck_fuel.png      # cisterna de fuel
    pushback.png        # tractor pushback
  buildings/       — hangares, terminal, oficina, ATC, fuel station
    hangar.png
    terminal.png
    office.png
    atc_tower.png
    fuel_tank.png
  people/          — mecs caminando top-down. Kenney "Top-Down Shooter"
    mechanic_idle.png
    mechanic_walk.png
  props/           — escaleras, conos, banderas, antenas, equipaje
    cone.png
    luggage.png
    gpu.png             # ground power unit
```

## Naming convention

- Snake_case
- PNG con transparencia alfa
- Top-down view (nariz arriba, cero perspectiva)
- Tamaño coherente entre sprites de la misma categoría (~64-128 px)

## Cómo se cargan

`src/lib/render/assets.ts` define el manifest. Al hacer `mount()` del driver
Pixi (skin `ceopng`), llama a `Assets.load()` para todos los manifests. Si
un archivo no existe, el sprite cae al fallback vectorial (lo que ya tenemos).

## Licencias

- Todo Kenney es **CC0** — dominio público, sin atribución requerida.
- Los aviones baked se generan en runtime (no son assets externos).
- Si añadimos packs de otros origenes (itch.io, OpenGameArt), comprobar
  licencia. Anotar en `LICENSES.md` la fuente y la licencia exacta.
