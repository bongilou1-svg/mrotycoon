# MRO Tycoon

Tycoon de Maintenance, Repair, Overhaul aeronáutico. Vertical slice en construcción (Fase 2).

> Proyecto comercial standalone (target: Steam). Texto + paneles + mapa esquemático. Cero 3D.

Lectura previa: [`CLAUDE.md`](./CLAUDE.md) (working memory), [`STATUS.md`](./STATUS.md) (estado vivo), [`TASKS.md`](./TASKS.md) (sprint actual), [`docs/GDD.md`](./docs/GDD.md) (game design).

---

## Stack

- **Tauri 2** + **Rust** (shell nativo Windows/Mac/Linux, build a `.exe`)
- **Svelte 5** (con runes) + **Vite** + **TypeScript** (frontend)
- **SQLite** vía `tauri-plugin-sql` (saves)
- **Inter** + **JetBrains Mono** (tipografía, vía system stack en MVP)

---

## Prerequisitos en Windows

1. **Node.js ≥ 20** — [nodejs.org](https://nodejs.org/) (LTS).
2. **Rust toolchain** — `rustup` desde [rustup.rs](https://rustup.rs/). Necesita reiniciar terminal.
3. **Microsoft C++ Build Tools** — descargar [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) y marcar "Desktop development with C++". Requerido para compilar Rust en Windows.
4. **WebView2** — ya viene con Windows 11 y Windows 10 reciente. Si falla, instalar runtime desde [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

Verificar:
```powershell
node --version    # debería ser v20+
rustc --version   # debería resolver
cargo --version   # debería resolver
```

---

## Primera arrancada

Desde la raíz del repo:

```powershell
npm install
npm run tauri dev
```

La primera vez `tauri dev` tarda **5-15 minutos** porque Cargo compila todas las deps de Tauri. Luego cada arranque son segundos. Se abre una ventana con título "MRO Tycoon" + un HUD oscuro placeholder + devtools abierto en modo debug.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala deps de Node. Cargo descarga las suyas en el primer `tauri dev`. |
| `npm run tauri dev` | Arranca app en modo dev con hot-reload del frontend. |
| `npm run dev` | Solo Vite (sin Tauri) — sirve UI en `http://localhost:1420`. Útil para iterar UI rápido. |
| `npm run check` | Type-check Svelte+TS. |
| `npm run lint` | ESLint. |
| `npm run format` | Prettier write. |
| `npm run tauri build` | Genera `.exe` instalable en `src-tauri/target/release/bundle/`. **Requiere iconos** (ver abajo). |

---

## Iconos del bundle

`tauri.conf.json` referencia iconos que **aún no existen**. `tauri dev` funciona sin ellos. Para hacer `tauri build`:

```powershell
npx @tauri-apps/cli icon path/al/source-512x512.png
```

Esto genera todo el set a `src-tauri/icons/`. Pendiente para Fase 5 polish.

---

## Estructura

```
MRO tycoon/
├── package.json           # Node deps + scripts
├── vite.config.ts         # Vite + Svelte
├── svelte.config.js
├── tsconfig.json
├── eslint.config.js
├── .prettierrc.json
├── index.html             # entry HTML
├── src/                   # frontend Svelte
│   ├── main.ts
│   ├── App.svelte
│   ├── app.css            # tema oscuro base, paleta, tipografía
│   └── lib/
│       ├── sim/           # motor de simulación (Bloque C)
│       ├── ui/            # componentes reutilizables (Bloque D)
│       ├── data/          # workorders.json, airlines.json, balance.json (Bloque B)
│       ├── i18n/          # ES + EN (Bloque B)
│       ├── stores/        # estado vivo Svelte (Bloque C)
│       ├── types/         # tipos TS del dominio
│       └── assets/        # logos aerolíneas, avatars mecánicos
├── src-tauri/             # shell Rust
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── capabilities/
│   │   └── default.json
│   └── src/
│       ├── main.rs
│       └── lib.rs
├── docs/                  # GDD + briefs + cierre por fase
├── unity_legacy/          # BRIEF_recovery.md (Fase 0)
└── builds/                # binarios estables por hito
```

---

## Estado de la Fase 2

Ver [`TASKS.md`](./TASKS.md). Sprint actual: días 1-2 (Bloque A — Setup). Cierre Fase 2 dejará vertical slice jugable end-to-end.
