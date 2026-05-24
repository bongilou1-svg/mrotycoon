// MRO Tycoon — Rust shell para Tauri.
// Toda la lógica del juego vive en el frontend (Svelte/TS). Aquí solo:
//   - bootstrap de la ventana
//   - plugins (sql para save/load)
//   - comandos puente si en algún momento hace falta tocar el sistema operativo
//
// Para Fase 2 (MVP) basta con esto. Fase 5 puede mover hot-paths del simulador
// a Rust si en playtest la performance no llega.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                // En dev abrimos devtools por defecto para facilitar iteración.
                use tauri::Manager;
                if let Some(window) = _app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al arrancar la aplicación Tauri");
}
