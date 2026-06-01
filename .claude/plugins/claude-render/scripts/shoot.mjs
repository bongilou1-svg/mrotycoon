#!/usr/bin/env node
// claude-render · shoot.mjs
// Rasteriza una vista del juego MRO Tycoon a PNG usando Chrome headless, para que el
// agente PUEDA VER el render real (canvas Pixi incluido) y iterar visualmente.
//
// Uso:
//   node shoot.mjs <htmlPath> <outPng> [--view map|operations|office|schedule] [--seed-van H1-S1]
//                  [--w 1600] [--h 1000] [--wait 6000] [--eval "<js>"]
//
// Cómo funciona: copia el HTML a un temp inyectando un <script> que, tras cargar, llama a
// window.__mroDebug (hook del bundle) para saltar el wizard / ir a la vista / sembrar furgo,
// y luego Chrome headless --screenshot lo rasteriza. NO modifica el build original.

import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const htmlPath = resolve(process.argv[2] || "builds/v0.6-line-mro.html");
const outPng = resolve(process.argv[3] || "_render.png");
const view = arg("--view", "map");
const seedVan = arg("--seed-van", null);
const W = parseInt(arg("--w", "1600"), 10);
const H = parseInt(arg("--h", "1000"), 10);
const wait = parseInt(arg("--wait", "6000"), 10);
const evalJs = arg("--eval", null);

if (!existsSync(htmlPath)) { console.error("ERR: no existe " + htmlPath); process.exit(1); }

// Localiza Chrome (Windows / mac / linux comunes).
const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium",
];
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) { console.error("ERR: Chrome no encontrado. Candidatos:\n" + CHROME_CANDIDATES.join("\n")); process.exit(1); }

// Inyecta el script de control del hook __mroDebug justo antes de </body>.
const html = readFileSync(htmlPath, "utf8");
const inject = `
<script>
(function(){
  function applyDebug(tries){
    if (window.__mroDebug && window.__mroDebug.ready) {
      try {
        ${seedVan ? `window.__mroDebug.seedVan(${JSON.stringify(seedVan)});` : `window.__mroDebug.goView(${JSON.stringify(view)});`}
        ${evalJs ? `try{ ${evalJs} }catch(e){ console.error("evalJs", e); }` : ""}
      } catch(e){ console.error("__mroDebug", e); }
      window.__renderReady = true;
      return;
    }
    if (tries > 0) setTimeout(function(){ applyDebug(tries-1); }, 120);
    else window.__renderReady = true; // no hook: capturamos lo que haya
  }
  if (document.readyState === "complete") applyDebug(60);
  else window.addEventListener("load", function(){ applyDebug(60); });
})();
</script>
`;
const tmpHtml = join(dirname(outPng), "_shoot_tmp.html");
const patched = html.includes("</body>") ? html.replace("</body>", inject + "</body>") : html + inject;
writeFileSync(tmpHtml, patched);

const fileUrl = "file:///" + tmpHtml.replace(/\\/g, "/");
const args = [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--window-size=" + W + "," + H,
  "--virtual-time-budget=" + wait,
  "--screenshot=" + outPng.replace(/\\/g, "/"),
  fileUrl,
];

try {
  execFileSync(chrome, args, { stdio: "pipe", timeout: wait + 20000 });
} catch (e) {
  // Chrome a veces devuelve exit != 0 aunque escriba el PNG; comprobamos el fichero.
}
rmSync(tmpHtml, { force: true });

if (existsSync(outPng)) {
  const sz = readFileSync(outPng).length;
  console.log("OK " + outPng + " (" + sz + " bytes) view=" + (seedVan ? "map+van@" + seedVan : view));
  process.exit(0);
} else {
  console.error("ERR: no se generó el PNG");
  process.exit(1);
}
