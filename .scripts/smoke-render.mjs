// Smoke test del bundle Render: carga el HTML, ejecuta los scripts en un mock window,
// verifica que window.Render se exporta sin errores de runtime.

import { readFileSync } from "node:fs";

const path = process.argv[2] || "builds/v0.5d-pixi-map.html";
const html = readFileSync(path, "utf-8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
console.log(`Scripts encontrados: ${scripts.length}`);

const win = { devicePixelRatio: 1, addEventListener: () => {}, removeEventListener: () => {}, ResizeObserver: class { observe(){} unobserve(){} disconnect(){} } };
const localStorage = { getItem: () => null, setItem: () => {} };

// Eval Sim
try {
  const simFn = new Function("window", "localStorage", `${scripts[0][1]}; return window.Sim;`);
  const Sim = simFn(win, localStorage);
  console.log(`✓ Sim cargado: ${Object.keys(Sim).filter(k => !k.startsWith("__")).length} exports`);
} catch (e) {
  console.error(`✗ Sim ERROR: ${e.message}`);
  console.error(e.stack?.split("\n").slice(0, 5).join("\n"));
  process.exit(1);
}

// Eval Render
try {
  const renderFn = new Function("window", "localStorage", `${scripts[1][1]}; return window.Render;`);
  const Render = renderFn(win, localStorage);
  console.log(`✓ Render cargado: ${Object.keys(Render).join(", ")}`);
} catch (e) {
  console.error(`✗ Render ERROR: ${e.message}`);
  console.error(e.stack?.split("\n").slice(0, 8).join("\n"));
  process.exit(1);
}

// Eval APP_JS — verifica sintaxis del UI driver (no ejecuta, solo parsea)
if (scripts[2]) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(scripts[2][1]);
    console.log("✓ APP_JS sintaxis OK");
  } catch (e) {
    console.error(`✗ APP_JS SYNTAX ERROR: ${e.message}`);
    process.exit(1);
  }
}

console.log("✓ Bundle OK");
