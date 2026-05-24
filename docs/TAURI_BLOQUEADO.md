# Tauri + SqliteBackend — BLOQUEADO

**Fecha**: 2026-05-15
**Intento**: 2º (1º en Fase 2 — bugs lld/MinGW resueltos; 2º en F5B-β — bug ecosistema Rust).
**Estado**: parking definitivo hasta cambio de toolchain.

---

## Síntoma

`cargo check` (y por tanto `cargo build`) en `src-tauri/` falla con:

```
error[E0463]: can't find crate for `yoke_derive`: can't find crate
error: could not compile `yoke` (lib) due to 2 previous errors

error[E0463]: can't find crate for `phf_macros`: can't find crate
error: could not compile `phf` (lib) due to 1 previous error
```

Ambos errores son sobre **proc-macros transitive de Tauri** (yoke_derive y phf_macros vienen como deps de tauri-plugin-sql y windows-rs).

## Análisis técnico

El error `can't find crate for proc-macro` significa que el toolchain de Rust no encuentra el binario compilado del proc-macro al usarlo. Es un bug conocido de Rust **GNU toolchain en Windows** con proc-macros recientes (yoke 0.8.x, phf 0.13.x).

**Cadena del problema**:
1. Fase 2 (2026-05-13) eligió `stable-x86_64-pc-windows-gnu` porque MSVC requiere Visual Studio Build Tools (descarga ~7 GB + admin).
2. Workaround lld para "export ordinal too large": ✅ resuelto.
3. Workaround spaces in paths: ✅ resuelto (junction `~/mrotycoon`).
4. F5B-β (2026-05-15) intentó Tauri otra vez: proc-macros yoke_derive/phf_macros fallan compilación contra target gnu.

El bug **NO es del proyecto MRO Tycoon**. Es de la combinación Rust 1.95 + windows-gnu + yoke 0.8 + phf 0.13.

## Workarounds posibles (todos requieren intervención fuera de sesión)

### Opción A — Cambiar a MSVC toolchain (recomendado)
- Instalar Visual Studio Build Tools (`vs_BuildTools.exe`) con workload "Desktop development with C++".
- `rustup default stable-x86_64-pc-windows-msvc`.
- ~7 GB descarga + admin probablemente requerido.
- Después: `cargo build` debería funcionar limpio. MSVC es la combinación oficial de Tauri en Windows.

### Opción B — Downgrade Rust + lock crates
- `rustup install 1.81.0-x86_64-pc-windows-gnu`.
- `rustup override set 1.81.0` en `src-tauri/`.
- Verificar que yoke ≤0.7 y phf ≤0.12 (cargo.lock pin).
- Esperanza de que proc-macros viejos funcionen con gnu.

### Opción C — Cambiar arquitectura: el juego es web-first
- Aceptar que el bundle vanilla file:// es suficiente.
- Para Steam: usar **Electron** (no Tauri) o **NW.js**, que compilan con Node sin Rust.
- Pérdida: 30 MB extra de binario (Electron) vs 5 MB (Tauri).
- Ganancia: cero toolchain Rust headaches.

## Recomendación

**Diferir Tauri** hasta:
- Dani tenga tiempo para Opción A (instalar MSVC). Es lo más sano a medio plazo.
- O hasta Fase 6 donde decidamos packaging (Electron vs esperar Tauri).

**Mientras tanto**: el bundle vanilla single-file (`builds/v0.5d-save-v7.html`) es 100% jugable, se distribuye como ZIP, funciona vía file:// en Chrome. Para demo Itch.io / Steam Next Fest es válido.

## Archivos preparados (no se revierten)

- `src-tauri/tauri.conf.json` — ya adaptado para servir bundle vanilla (`frontendDist: "../dist"`, `beforeDevCommand` llama al build script).
- `.scripts/build-vanilla.mjs` — acepta `dist/index.html` y lo escribe correctamente fuera de `builds/`.
- `dist/index.html` — generado con `node .scripts/build-vanilla.mjs dist/index.html`.
- `.scripts/cargo-check.ps1` — diagnóstico Rust + check.

Cuando el toolchain esté arreglado, basta con `cd src-tauri && cargo run` para arrancar Tauri.

---

**Acción inmediata**: pasar a **Fase 6 — Pre-Steam page + demo** (no requiere Tauri).
