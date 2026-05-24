// Build script del bundle vanilla single-file.
//
// Toma `src/lib/sim-all.ts` → esbuild IIFE (global `Sim`) → concatena con shell HTML+CSS y
// UI handlers (template literal) → escribe `builds/<output>.html`.
//
// Uso: `node .scripts/build-vanilla.mjs [output-name]`
// Default output: builds/v0.2-fase3-h.html

import { build } from "esbuild";
import { writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const outputName = process.argv[2] || "v0.2-fase3-m.html";
// Si el outputName empieza con "dist/" o es absoluto, lo respeta tal cual (relativo a root).
// Si no, lo mete en builds/ por convención.
import { isAbsolute } from "node:path";
const outputPath = isAbsolute(outputName)
  ? outputName
  : outputName.startsWith("dist/") || outputName.startsWith("dist\\")
    ? join(root, outputName)
    : join(root, "builds", outputName);

async function main() {
  console.log("[build] esbuild bundling src/lib/sim-all.ts → IIFE Sim global...");
  const t0 = Date.now();
  const result = await build({
    entryPoints: [join(root, "src/lib/sim-all.ts")],
    bundle: true,
    format: "iife",
    globalName: "Sim",
    platform: "browser",
    target: "es2020",
    loader: { ".json": "json" },
    write: false,
    minify: false,
    sourcemap: false,
  });
  if (result.errors.length > 0) {
    console.error("[build] errores esbuild:", result.errors);
    process.exit(1);
  }
  const simBundleJs = result.outputFiles[0].text;
  console.log(`[build] bundle OK (${(simBundleJs.length / 1024).toFixed(1)} KB) en ${Date.now() - t0} ms`);

  // El IIFE de esbuild deja el global asignado como `var Sim = (() => {...})();`. Aseguramos
  // que `window.Sim` exista para el UI driver.
  const simBundlePlusGlobal = `${simBundleJs}\nwindow.Sim = Sim;`;

  // Fase 5D · P-α: segundo bundle render-all (Pixi v8 + sync + driver). Aislado del bundle
  // Sim para que los 803 tests sim sigan ejecutándose en Node sin depender de Pixi/DOM.
  // Minify=true porque Pixi v8 pesa ~600 KB sin minify; con minify queda ~250 KB.
  console.log("[build] esbuild bundling src/lib/render/render-all.ts → IIFE Render global...");
  const t1 = Date.now();
  const renderResult = await build({
    entryPoints: [join(root, "src/lib/render/render-all.ts")],
    bundle: true,
    format: "iife",
    globalName: "Render",
    platform: "browser",
    target: "es2020",
    loader: { ".json": "json" },
    write: false,
    minify: true,
    sourcemap: false,
  });
  if (renderResult.errors.length > 0) {
    console.error("[build] errores esbuild render:", renderResult.errors);
    process.exit(1);
  }
  const renderBundleJs = renderResult.outputFiles[0].text;
  console.log(`[build] render bundle OK (${(renderBundleJs.length / 1024).toFixed(1)} KB) en ${Date.now() - t1} ms`);
  const renderBundlePlusGlobal = `${renderBundleJs}\nwindow.Render = Render;`;

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderHtml(simBundlePlusGlobal, renderBundlePlusGlobal), "utf-8");
  const totalKB = ((simBundlePlusGlobal.length + renderBundlePlusGlobal.length) / 1024).toFixed(1);
  console.log(`[build] escrito ${outputPath} (${totalKB} KB JS total)`);

  // Fase 5D · skin ceopng: copiar src/lib/assets/textures → builds/assets/textures
  // para que Pixi.Assets.load() los resuelva con paths relativos al HTML.
  const srcAssets = join(root, "src/lib/assets/textures");
  const dstAssets = join(dirname(outputPath), "assets/textures");
  if (existsSync(srcAssets)) {
    cpSync(srcAssets, dstAssets, { recursive: true });
    console.log(`[build] assets copiados ${srcAssets} → ${dstAssets}`);
  } else {
    console.log(`[build] (sin carpeta assets/textures — skin ceopng usará solo sprites baked)`);
  }
}

// ============================================================================
// HTML + CSS shell + UI handlers
// ============================================================================

function renderHtml(simBundle, renderBundle) {
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>MRO Tycoon — Fase 3 Bloque H</title>
<style>
${CSS}
</style></head><body>
${BODY}
<script>
${simBundle}
</script>
<script>
${renderBundle}
</script>
<script>
${APP_JS}
</script>
</body></html>`;
}

const CSS = `:root{--bg:#0d1117;--panel:#161b22;--panel-h:#1f2733;--border:#2a3142;--border-s:#3a4256;--text:#e6e9ef;--muted:#8b95a8;--subtle:#5d6677;--accent:#4da3ff;--accent-d:#2a5a8f;--success:#3fb950;--warning:#d29922;--danger:#f85149;--aog:#ff3b3b;--base:#a78bfa;--base-d:#5b3fbe;--modal:#1a2030;--mono:"JetBrains Mono","Fira Code",Consolas,monospace;--sans:"Inter","Segoe UI",system-ui,sans-serif;--rad:6px;}
*{box-sizing:border-box}html,body{margin:0;padding:0;height:100vh;width:100vw;overflow:hidden;background:var(--bg);color:var(--text);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
.app{display:flex;flex-direction:column;height:100vh}
.hud{display:flex;justify-content:space-between;align-items:center;padding:.4rem 1rem;background:var(--panel);border-bottom:1px solid var(--border);height:48px;flex-shrink:0}
.hud-l,.hud-r{display:flex;gap:.5rem;align-items:center}.hud-c{display:flex;gap:1rem;align-items:center}
.brand{font-weight:600;color:var(--accent)}.ver{font-family:var(--mono);font-size:.75rem;color:var(--muted)}
.clock{font-family:var(--mono);font-size:1.05rem}.wk{font-family:var(--mono);font-size:.8rem;color:var(--muted)}
.kpi{font-size:.85rem;color:var(--muted)}.kpi strong{color:var(--text);font-family:var(--mono)}.kpi strong.neg{color:var(--danger)}
.compliance-kpi{cursor:pointer;padding:.15rem .4rem;border-radius:3px;border:1px solid transparent}
.compliance-kpi:hover{border-color:var(--border)}
.compliance-kpi.good strong{color:var(--success)}.compliance-kpi.warn strong{color:var(--warning)}.compliance-kpi.bad strong{color:var(--danger)}
.speeds{display:flex;gap:.2rem;margin-left:.5rem}
button{font:inherit;color:var(--text);background:var(--panel);border:1px solid var(--border);border-radius:3px;padding:.4rem .75rem;cursor:pointer}
button:hover{background:var(--panel-h)}button.active{background:var(--accent-d);border-color:var(--accent)}
button.primary{background:var(--accent-d);border-color:var(--accent)}.speeds button{padding:.2rem .5rem;font-size:.8rem}
.body{display:grid;grid-template-columns:180px 1fr 280px;flex:1;min-height:0}
.side{background:var(--panel);border-right:1px solid var(--border);padding:.5rem;display:flex;flex-direction:column;gap:.25rem}
.side button{text-align:left;background:transparent;border:1px solid transparent}.side button.active{background:var(--accent-d);border-color:var(--accent)}
.badge{float:right;background:var(--accent);color:#fff;padding:0 6px;border-radius:10px;font-size:.7rem}
.badge.base{background:var(--base)}.badge.warn{background:var(--warning)}.badge.alert{background:var(--danger);animation:pulse-alert 1.2s ease-in-out infinite}
@keyframes pulse-alert { 0%,100%{opacity:1} 50%{opacity:.55} }
#btn-autopause.off{opacity:.4;text-decoration:line-through}
.panel{overflow-y:auto;padding:1rem 1.5rem}h2{font-size:1rem;margin:0 0 1rem;font-weight:600}h3{font-size:.85rem;margin:1rem 0 .5rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.subtabs{display:flex;gap:.4rem;margin-bottom:1rem;border-bottom:1px solid var(--border)}
.subtabs button{border-radius:3px 3px 0 0;padding:.4rem .8rem;font-size:.85rem;border-bottom:none;background:transparent}
.subtabs button.active{background:var(--accent-d);border-color:var(--accent);color:#fff}
.subtabs button.base.active{background:var(--base-d);border-color:var(--base)}
.subtabs button .count{margin-left:.4rem;background:var(--bg);padding:0 6px;border-radius:10px;font-size:.7rem;color:var(--muted)}
.subtabs button.active .count{background:rgba(0,0,0,.3);color:#fff}
.wo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:.75rem}
.wo-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--rad);padding:.75rem 1rem;cursor:pointer}
.wo-card:hover{border-color:var(--accent)}.wo-card.aog{border-color:var(--aog);background:linear-gradient(to bottom,rgba(255,59,59,.08),var(--panel))}
.wo-card.base{cursor:default;border-color:var(--base-d);background:linear-gradient(to bottom,rgba(167,139,250,.06),var(--panel))}
.wo-card.base:hover{border-color:var(--base)}
.wo-head{display:flex;gap:.5rem;align-items:center;margin-bottom:.3rem}
.wo-id{font-family:var(--mono);font-size:.75rem;color:var(--muted)}
.wo-phase{font-size:.7rem;padding:1px 6px;border-radius:3px;background:var(--bg);border:1px solid var(--border)}
.phase-Inspection,.phase-Test{color:var(--accent);border-color:var(--accent-d)}.phase-MainTask,.phase-Rework{color:var(--warning);border-color:var(--warning)}.phase-ToPlane{color:var(--muted)}
.phase-Scheduled{color:var(--warning);border-color:var(--warning)}.phase-InProgress{color:var(--base);border-color:var(--base-d)}.phase-Completed{color:var(--success);border-color:var(--success)}
.aog-badge{font-size:.7rem;padding:1px 6px;background:var(--aog);color:#fff;border-radius:3px;font-weight:700}
.check-badge{font-size:.65rem;padding:1px 6px;background:var(--base);color:#fff;border-radius:3px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.mel-badge{font-size:.65rem;padding:1px 6px;border-radius:3px;font-weight:600;letter-spacing:.03em}
.mel-A{background:rgba(248,81,73,.18);color:#f88;border:1px solid rgba(248,81,73,.4)}
.mel-B{background:rgba(210,153,34,.18);color:#dc9;border:1px solid rgba(210,153,34,.4)}
.mel-C{background:rgba(77,163,255,.18);color:#9cf;border:1px solid rgba(77,163,255,.4)}
.mel-D{background:rgba(139,150,180,.18);color:#abc;border:1px solid rgba(139,150,180,.4)}
.mel-none{background:rgba(60,68,82,.3);color:var(--subtle);border:1px dashed var(--subtle)}
.tier-badge{font-size:.7rem;padding:2px 7px;border-radius:3px;font-weight:700;letter-spacing:.03em;margin-left:.4rem}
.tier-standard{background:rgba(139,150,180,.2);color:#bcd;border:1px solid rgba(139,150,180,.4)}
.tier-premium{background:rgba(77,163,255,.2);color:#9cf;border:1px solid rgba(77,163,255,.5)}
.tier-deluxe{background:linear-gradient(135deg,rgba(255,200,80,.25),rgba(212,140,40,.25));color:#fc6;border:1px solid rgba(255,200,80,.6);box-shadow:0 0 8px rgba(255,200,80,.15)}
.daynight{font-size:1.1rem;margin:0 .4rem;opacity:.85;transition:opacity .3s}
.daynight.night{opacity:1;filter:drop-shadow(0 0 4px rgba(80,140,200,.6))}
.gantt{margin:.5rem 0 1rem 0;padding:.5rem .75rem;background:var(--panel);border-radius:var(--rad)}
.gantt-title{font-size:.75rem;color:var(--muted);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em}
.gantt-grid{display:grid;grid-template-columns:repeat(24,1fr);gap:1px}
.gantt-cell{font-family:var(--mono);font-size:.7rem;text-align:center;padding:.3rem 0;border-radius:2px;font-weight:600}
.gantt-cell.shift-morning{background:rgba(255,200,80,.15);border-bottom:2px solid rgba(255,200,80,.5)}
.gantt-cell.shift-afternoon{background:rgba(120,180,255,.15);border-bottom:2px solid rgba(120,180,255,.5)}
.gantt-cell.shift-night{background:rgba(80,80,140,.18);border-bottom:2px solid rgba(140,150,200,.5)}
.gantt-cell.cov-empty{color:var(--danger);background:rgba(248,81,73,.15)!important}
.gantt-cell.cov-low{color:var(--warning)}
.gantt-cell.cov-mid{color:var(--success)}
.gantt-cell.cov-high{color:var(--success);font-weight:800}
.dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.75rem;margin-top:.5rem}
.dash-card{background:var(--panel);border-radius:var(--rad);padding:.75rem .9rem;border:1px solid var(--border)}
.dash-title{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem}
.dash-big{font-family:var(--mono);font-size:1.6rem;font-weight:700;margin-bottom:.4rem;color:var(--text)}
.sparkline svg{display:block;width:100%;height:auto;max-height:60px}
.spark-meta{display:flex;justify-content:space-between;font-size:.7rem;color:var(--muted);margin-top:.2rem}
/* Fase 5B-γ: animaciones */
@keyframes slide-in-right{from{opacity:0;transform:translateX(15px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse-flash{0%{background:rgba(77,163,255,.0)}30%{background:rgba(77,163,255,.18)}100%{background:rgba(77,163,255,.0)}}
.notif:first-child{animation:slide-in-right .28s cubic-bezier(.2,.6,.2,1)}
.kpi.flash{animation:pulse-flash .6s ease-out}
.bar .fill{transition:width .35s cubic-bezier(.2,.6,.2,1)}
.tab-panel{animation:slide-in-right .18s ease-out}
.def-card{background:var(--panel);border-left:3px solid var(--warning);border-radius:0 var(--rad) var(--rad) 0;padding:.6rem .8rem;margin-bottom:.5rem}
.def-card.urgent{border-left-color:var(--danger)}
.def-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.25rem}
.def-countdown{font-family:var(--mono);font-size:.85rem;color:var(--warning)}.def-countdown.urgent{color:var(--danger)}
.wo-desc{font-size:.88rem;margin-bottom:.4rem}.wo-meta{display:flex;gap:.6rem;font-size:.72rem;color:var(--muted);margin-bottom:.5rem;font-family:var(--mono);flex-wrap:wrap}
.bar-wrap{display:flex;align-items:center;gap:.5rem;margin:.2rem 0}
.bar-lbl{font-size:.72rem;color:var(--muted);width:7rem;flex-shrink:0}.bar-lbl.bad{color:var(--danger)}
.bar{flex:1;height:6px;background:var(--bg);border-radius:3px;overflow:hidden}.fill{height:100%;transition:width .4s}
.fill.primary{background:var(--accent)}.fill.good{background:var(--success)}.fill.warn{background:var(--warning)}.fill.bad{background:var(--danger)}
.fill.base{background:var(--base)}
.wo-team{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.4rem}
.chip{font-size:.7rem;padding:1px 6px;background:var(--bg);border:1px solid var(--border);border-radius:999px}
.chip.warn{background:rgba(210,153,34,.15);border-color:var(--warning);color:var(--warning)}
.muted{color:var(--muted);font-size:.85rem}
table{width:100%;border-collapse:collapse;font-size:.82rem}th{text-align:left;padding:.4rem .5rem;border-bottom:1px solid var(--border);color:var(--muted);font-size:.7rem;text-transform:uppercase;font-weight:500;letter-spacing:.05em}
td{padding:.35rem .5rem;border-bottom:1px solid var(--border)}tr:hover{background:rgba(255,255,255,.02)}
.mono{font-family:var(--mono);color:var(--muted)}.mono.pos{color:var(--success)}.mono.neg{color:var(--danger)}
.state{display:inline-block;padding:1px 6px;border-radius:3px;font-size:.7rem}
.state-Idle{background:rgba(63,185,80,.15);color:var(--success)}.state-Working{background:rgba(77,163,255,.15);color:var(--accent)}.state-ToPlane,.state-Returning{background:rgba(210,153,34,.15);color:var(--warning)}
.contract-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--rad);padding:.75rem 1rem;margin-bottom:.5rem}.contract-card.offer{border-color:var(--accent-d)}
.contract-card header{font-size:.9rem;margin-bottom:.5rem;color:var(--muted)}.contract-card header strong{color:var(--text)}
.kvs{display:flex;flex-wrap:wrap;gap:1rem;font-size:.85rem;color:var(--muted)}.kvs strong{color:var(--text);font-family:var(--mono)}
.actions{display:flex;gap:.5rem;margin-top:.5rem}
.econ-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.5rem;margin-bottom:1rem}
.card-mini{background:var(--panel);border:1px solid var(--border);border-radius:var(--rad);padding:.75rem 1rem}
.card-mini .lbl{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.card-mini .big{font-family:var(--mono);font-size:1.4rem;color:var(--accent)}.card-mini .big.neg{color:var(--danger)}
.pixi-host{width:100%;height:calc(100vh - 260px);min-height:340px;background:#05101c;border:1px solid var(--border);border-radius:var(--rad);overflow:hidden;position:relative}
.pixi-host canvas{display:block;width:100%;height:100%}
.skin-bar{display:flex;gap:.4rem;align-items:center;margin-bottom:.5rem;flex-wrap:wrap}
.skin-bar .skin-label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-right:.25rem}
.skin-btn{font-size:.78rem;padding:.3rem .65rem;background:var(--panel);border:1px solid var(--border);border-radius:3px;color:var(--text);cursor:pointer}
.skin-btn:hover{background:var(--panel-h)}
.skin-btn.active{background:var(--accent-d);border-color:var(--accent)}
.notifs{background:var(--panel);border-left:1px solid var(--border);padding:.75rem 1rem;overflow-y:auto}
.notif{display:grid;grid-template-columns:5.5rem 1fr;gap:.5rem;padding:.3rem 0;font-size:.78rem;border-bottom:1px solid var(--border)}
.notif .t{font-family:var(--mono);color:var(--subtle);font-size:.7rem}
.notif.info{color:var(--muted)}.notif.success{color:var(--success)}.notif.warning{color:var(--warning)}.notif.danger{color:var(--danger)}
.modal-back{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:100}
.modal-back.open{display:flex}.modal{background:var(--modal);border:1px solid var(--border-s);border-radius:10px;max-width:600px;width:90%;max-height:80vh;overflow:hidden;display:flex;flex-direction:column}
.modal-head{display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-bottom:1px solid var(--border)}
.modal-head h3{margin:0;font-size:.95rem;color:var(--text)}
.close{background:transparent;border:none;color:var(--muted);font-size:1.5rem;cursor:pointer;padding:0 .5rem}.close:hover{color:var(--text)}
.modal-body{padding:1rem;overflow-y:auto}.modal-body h4{font-size:.85rem;margin:1rem 0 .5rem}
.modal-body label{display:block;font-size:.8rem;color:var(--muted);margin:.5rem 0 .25rem}
.modal-body select,.modal-body input[type=text]{width:100%;padding:.4rem;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:3px}
.helper-list{display:flex;flex-direction:column;gap:.25rem;margin-top:.25rem}.helper-item{display:flex;align-items:center;gap:.5rem;font-size:.85rem;cursor:pointer}
.alert{padding:.5rem .75rem;border-radius:3px;margin:.5rem 0;font-size:.85rem}.aog-alert{background:rgba(255,59,59,.15);border:1px solid var(--aog);color:var(--aog)}
.warn-banner{background:rgba(210,153,34,.1);border-left:3px solid var(--warning);padding:.5rem .75rem;margin:0 0 1rem;font-size:.85rem;color:var(--warning)}
.fleet-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.5rem}
.fleet-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--rad);padding:.5rem .75rem;font-size:.78rem}
.cand-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.75rem}
.cand-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--rad);padding:.75rem 1rem;font-size:.82rem}
.cand-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;gap:.5rem}
.cand-name{font-weight:600;font-size:.95rem}
.cand-base{font-size:.7rem;padding:1px 8px;border-radius:3px;background:var(--accent-d);color:#fff;letter-spacing:.05em}
.cand-base.helper{background:var(--subtle)}
.cand-base.b2{background:var(--base-d)}
.cand-meta{display:flex;flex-wrap:wrap;gap:.4rem;color:var(--muted);margin-bottom:.3rem;font-size:.75rem}
.cand-meta strong{color:var(--text);font-family:var(--mono)}
.cand-traits{display:flex;gap:.25rem;flex-wrap:wrap;margin:.3rem 0}
.cand-traits .chip{background:rgba(167,139,250,.1);border-color:var(--base-d);color:var(--base)}
.cand-actions{display:flex;justify-content:flex-end;margin-top:.4rem;gap:.4rem}
.cand-ratings{font-size:.7rem;color:var(--muted);font-family:var(--mono);margin-bottom:.3rem}
.moral-bar{display:inline-block;width:60px;height:6px;background:var(--bg);border:1px solid var(--border);border-radius:3px;vertical-align:middle;overflow:hidden}
.moral-fill{height:100%;transition:width .4s}
.moral-fill.good{background:var(--success)}.moral-fill.warn{background:var(--warning)}.moral-fill.bad{background:var(--danger)}
.shift-select{font:inherit;font-size:.7rem;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:3px;padding:1px 4px}
.state-Training{background:rgba(167,139,250,.18);color:var(--base)}
.fleet-card.warn{border-color:var(--warning)}.fleet-card.active{border-color:var(--base)}
.fleet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem;gap:.4rem}
.fleet-reg{font-family:var(--mono);font-weight:600;color:var(--text);font-size:.85rem}
.fleet-meta{display:flex;flex-wrap:wrap;gap:.4rem;color:var(--muted)}
.game-over{text-align:center;padding:4rem 2rem}.game-over h1{font-size:3rem;color:var(--danger);margin-bottom:1rem}
.empty{color:var(--muted);font-size:.9rem;padding:2rem 1rem;text-align:center}`;

const BODY = `<div class="app">
  <header class="hud">
    <div class="hud-l"><span class="brand">MRO Tycoon</span><span class="ver">v0.2-alpha · Fase 3 H+I+J+K+L+M</span></div>
    <div class="hud-c"><span class="clock" id="clock">Día 1 · 00:00</span><span id="daynight" class="daynight" title="Día u Noche según hora ingame">☀️</span><span class="wk" id="week">Semana 1</span><span id="overnight-badge" class="kpi" style="display:none;cursor:pointer;margin-left:.5rem" title="Aviones que pernoctan esta noche · click para detalle"></span></div>
    <div class="hud-r">
      <div class="kpi">💰 <strong id="bal">250.000 €</strong></div>
      <div class="kpi compliance-kpi" id="kpi-rep" title="Reputación media — click para detalle por aerolínea">⭐ <strong id="rep">50</strong>/100</div>
      <div class="kpi compliance-kpi" id="kpi-compliance" title="Compliance Part-145 — click para detalle">🛡️ <strong id="compliance-score">80</strong>/100</div>
      <div style="display:flex;gap:.25rem;margin-right:.5rem">
        <button id="btn-save" title="Guardar partida" style="padding:.25rem .55rem;font-size:.85rem">💾</button>
        <button id="btn-load" title="Cargar partida" style="padding:.25rem .55rem;font-size:.85rem">📂</button>
        <button id="btn-new" title="Nueva partida" style="padding:.25rem .55rem;font-size:.85rem">🆕</button>
        <button id="btn-age-fleet" title="DEBUG: envejecer flota cerca de triggers A/C" style="padding:.25rem .55rem;font-size:.85rem">🛠️</button>
        <span id="save-indicator" style="font-size:.7rem;color:var(--success);align-self:center;margin-left:.25rem"></span>
      </div>
      <div class="speeds">
        <button id="btn-autopause" title="Auto-pausa en eventos críticos (AOG / Critical)" style="padding:.2rem .45rem;font-size:.85rem;margin-right:.25rem">🔔</button>
        <button data-speed="0" class="active" title="Pausa">⏸</button>
        <button data-speed="1">1×</button>
        <button data-speed="2">2×</button>
        <button data-speed="5">5×</button>
      </div>
    </div>
  </header>
  <div class="body">
    <aside class="side">
      <button data-tab="map" class="active">🗺️ Mapa</button>
      <button data-tab="operations">🏭 Operaciones <span class="badge" id="badge-wo">0</span></button>
      <button data-tab="schedule">📅 Schedule <span class="badge" id="badge-schedule">0</span></button>
      <button data-tab="mechanics">⚙️ Mecánicos</button>
      <button data-tab="contracts">📋 Contratos <span class="badge" id="badge-offers">2</span></button>
      <button data-tab="market">🤝 Mercado <span class="badge" id="badge-candidates">5</span></button>
      <button data-tab="construction">🏗️ Construcción</button>
      <button data-tab="dashboard">📊 Dashboard</button>
      <button data-tab="economy">💼 Economía</button>
    </aside>
    <main class="panel" id="panel-content"></main>
    <aside class="notifs"><h3>Notificaciones</h3><div id="notif-list"></div></aside>
  </div>
  <div class="modal-back" id="modal-back"><div class="modal" id="modal-content"></div></div>
</div>`;

const APP_JS = `// === MRO Tycoon vanilla UI driver — pivot MRO línea pura ===
const S = window.Sim;
// Pivot MRO línea pura (2026-05-24): UI activa lineMode=true por default. Modo legacy
// solo lo usan los tests automáticos.
let game = S.createGame(S.DATA.balance, S.DATA.airlines, S.DATA.workOrders, 42, S.DATA.maintenanceChecks, S.DATA.dailyChecks, { lineMode: true });
let activeTab = "map"; // pivot línea pura: arrancamos en mapa (wow factor) y operaciones aparte
let opsSubTab = "events"; // "events" | "base" | "fleet" | "deferrals"
let selectedWoId = null;
let complianceModalOpen = false;
let repModalOpen = false;
let detailFleetReg = null;   // F5B-ε: matrícula seleccionada para modal de avión
let detailMechId = null;     // F5B-ε: id mecánico seleccionado para modal
let detailCheckId = null;    // F5C extra: instanceId de check A/C/D para modal
let detailContractId = null; // F5C extra: id de contrato para modal
let overnightModalOpen = false; // Pivot línea pura · P4: modal vista pernocta
let scheduleFilter = "all";  // Pivot línea pura · P3: filtro panel schedule "all"|"arrival"|"departure"
let eventFilter = "open";    // Pivot línea pura · Event Tracking: "open" (activos) | "all"
let manualCertId = "";
let manualHelperIds = [];
let hasSavedSlot = false;
let saveIndicator = "";
// Render-loop optimizations: evita destruir DOM mientras el usuario clica.
let lastPanelHtml = "";
let lastNotifsHtml = "";
let lastModalHtml = "";
let lastPanelRenderMs = 0;
function invalidatePanelCache(){ lastPanelHtml = ""; lastPanelRenderMs = 0; }
function invalidateModalCache(){ lastModalHtml = ""; }

// Fase 5D · P-α / pivot línea pura: driver Pixi del mapa. Se monta cuando activeTab === "map".
// Vive fuera del cache de panel para que el canvas no se destruya entre ticks.
let mapDriver = null;
let mapMounting = false; // evita carreras durante el await mount()
// Pivot línea pura: skin hardcoded a "f5d" (OSM real OVD con paleta CIC north-star).
// El selector de variantes está eliminado del UI para no distraer.
const mapSkin = "f5d";
function destroyMapDriver(){
  if (mapDriver) { try { mapDriver.destroy(); } catch(e){} mapDriver = null; }
  mapMounting = false;
}
function syncMapRender(){
  const inMap = activeTab === "map" && !game.gameOver.isOver;
  if (!inMap) { destroyMapDriver(); return; }
  const host = document.getElementById("pixi-host");
  if (!host) { destroyMapDriver(); return; } // el HTML todavía no se ha inyectado
  // Si el driver montado no es del kind correcto para el skin, destruir y rebuild
  const wantKind = mapSkin === "three" ? "three" : "pixi";
  if (mapDriver && mapDriver.kind !== wantKind) {
    destroyMapDriver();
  }
  if (!mapDriver && !mapMounting && window.Render) {
    mapMounting = true;
    const driver = wantKind === "three"
      ? new window.Render.ThreeDriver()
      : new window.Render.PixiDriver();
    driver.setCallbacks({
      onBuildClick: () => {
        const res = S.startBuild(game);
        if (!res.ok && res.error) {
          game.notifCounter += 1;
          game.notifications.push({ id: game.notifCounter, minute: game.clock.minute, text: \`🏗️ \${res.error}\`, type: "warning" });
        }
        invalidatePanelCache();
        render();
      },
      // F5D P-ε: click sobre avión → abre modal detalle del avión por matrícula
      onAirplaneClick: (reg) => {
        detailFleetReg = reg;
        invalidateModalCache();
        render();
      },
      // F5D P-ε: click sobre stand → si tiene avión, abrir modal del avión;
      // si está libre, push notif informativa.
      onStandClick: (_simId, hasAirplane, registration) => {
        if (hasAirplane && registration) {
          detailFleetReg = registration;
          invalidateModalCache();
        } else {
          game.notifCounter += 1;
          game.notifications.push({ id: game.notifCounter, minute: game.clock.minute, text: \`Stand libre\`, type: "info" });
        }
        render();
      },
    });
    driver.mount(host).then(() => {
      if (!mapMounting) { try { driver.destroy(); } catch(e){} return; }
      mapDriver = driver;
      mapMounting = false;
      try { mapDriver.setTheme(mapSkin); } catch(e){}
      try { mapDriver.apply(window.Render.buildRenderState(game)); } catch(e){ console.error("[pixi] apply error", e); }
    }).catch((e) => { mapMounting = false; console.error("[pixi] mount error", e); });
    return;
  }
  if (mapDriver) {
    try { mapDriver.apply(window.Render.buildRenderState(game)); } catch(e){ console.error("[pixi] apply error", e); }
  }
}

// --- Helpers ---
function fmtClock(min){ return S.formatClock(min); }
function fmt(n){ return Number(n).toLocaleString("es-ES"); }
function airlineName(id){ const a = game.airlines.find(x => x.id === id); return a ? a.name : id; }
function airplaneByInstance(id){ return game.airplanes.find(a => a.instanceId === id); }
function activeWos(){ return game.workOrders.filter(w => w.phase !== "Completed" && w.phase !== "Failed" && w.phase !== "Deferred"); }
function deferredWos(){ return game.workOrders.filter(w => w.phase === "Deferred").sort((a,b) => (a.deferralExpiryMinute??0) - (b.deferralExpiryMinute??0)); }
function melCat(tpl){ return tpl ? S.getMelCategory(tpl) : null; }
function liveOffers(){ return game.contracts.filter(c => c.status === "offered"); }
function activeContracts(){ return game.contracts.filter(c => c.status === "active"); }
function slaPct(wo){ const m = wo.slaMinute - game.clock.minute; const w = wo.slaMinute - wo.emissionMinute; return Math.max(0, Math.min(100, (m/Math.max(1,w))*100)); }
function phasePct(wo){ const tpl = game.templates.find(t => t.id === wo.templateId); if (!tpl) return 0; const r = game.balance.phaseDurationRatios; const d = {ToPlane:0,Inspection:tpl.durationMinutes*r.inspection,MainTask:tpl.durationMinutes*r.mainTask,Test:tpl.durationMinutes*r.test,Rework:tpl.durationMinutes*r.rework,Completed:0,Failed:0}[wo.phase]||1; return Math.min(100, (wo.phaseElapsedMinutes/d)*100); }
function activeBaseChecks(){ return game.maintenanceChecks.filter(c => c.phase === "Scheduled" || c.phase === "InProgress"); }
function upcomingWarnings(){ return S.detectChecksUpcoming(game.fleet, game.checkDefinitions, game.maintenanceChecks); }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

// --- Hangar sub-tab: Line WOs (line maintenance, igual que Fase 2) ---
function renderHangarLine(){
  const wos = activeWos();
  if (wos.length === 0) return '<div class="empty">No hay WOs activas todavía. Pulsa 1× / 2× / 5× arriba para que el reloj avance.</div>';
  let h = '<div class="wo-grid">';
  for (const wo of wos) {
    const tpl = game.templates.find(t => t.id === wo.templateId);
    const ap = airplaneByInstance(wo.airplaneInstanceId);
    const margin = wo.slaMinute - game.clock.minute;
    const fillCls = margin > 10 ? "good" : margin > 0 ? "warn" : "bad";
    const team = wo.assignedMechanicIds.length === 0
      ? '<span class="muted">⚠️ sin asignar (click)</span>'
      : wo.assignedMechanicIds.map((mid, i) => {
          const m = game.mechanics.find(mm => mm.id === mid);
          return \`<span class="chip">\${i===0?"🪪":"🤝"} \${esc(m?.name ?? mid)}</span>\`;
        }).join("");
    const mc = melCat(tpl);
    const melBadge = mc ? \`<span class="mel-badge mel-\${mc}">MEL \${mc}</span>\` : (tpl?.isAOG ? '' : '<span class="mel-badge mel-none">NO-MEL</span>');
    h += \`<article class="wo-card\${tpl?.isAOG ? ' aog':''}" data-wo="\${wo.instanceId}">
      <header class="wo-head"><span class="wo-id">\${wo.instanceId}</span>\${tpl?.isAOG?'<span class="aog-badge">🛑 AOG</span>':''}\${melBadge}<span class="wo-phase phase-\${wo.phase}">\${wo.phase}</span></header>
      <div class="wo-desc">\${esc(tpl?.description ?? "?")}</div>
      <div class="wo-meta"><span>✈️ \${esc(ap?.registration ?? "?")} (\${ap?.model??"?"})</span><span>ATA \${tpl?.ata??"?"}</span><span>\${tpl?.requiredCategory??"?"}</span><span>\${tpl?.durationMinutes??"?"}min</span></div>
      <div class="bar-wrap"><span class="bar-lbl">Progreso fase</span><div class="bar"><div class="fill primary" style="width:\${phasePct(wo)}%"></div></div></div>
      <div class="bar-wrap"><span class="bar-lbl\${margin<0?' bad':''}">SLA \${margin >= 0 ? '+'+margin+'m' : margin+'m ¡tarde!'}</span><div class="bar"><div class="fill \${fillCls}" style="width:\${slaPct(wo)}%"></div></div></div>
      <div class="wo-team">\${team}</div>
    </article>\`;
  }
  return h + '</div>';
}

// --- Hangar sub-tab: Base Checks (A/C/D) ---
function renderHangarBase(){
  const checks = activeBaseChecks();
  if (checks.length === 0 && game.maintenanceChecks.length === 0) {
    return '<div class="empty">Ningún check programado. Los A/C/D checks se disparan cuando un avión cruza umbral de FH o cycles.</div>';
  }
  let h = '';
  const completedCount = game.maintenanceChecks.filter(c => c.phase === "Completed").length;
  if (completedCount > 0) h += \`<p class="muted" style="margin-bottom:.75rem">\${completedCount} check\${completedCount===1?'':'s'} completado\${completedCount===1?'':'s'} (histórico abajo).</p>\`;

  if (checks.length === 0) {
    h += '<div class="empty">Sin checks activos ahora mismo. Histórico:</div>';
  } else {
    h += '<div class="wo-grid">';
    for (const c of checks) {
      const fa = game.fleet.find(f => f.registration === c.registration);
      const workPct = Math.min(100, (c.manMinutesAccumulated / (c.manDaysIdeal * S.DAY_MINUTES)) * 100);
      const startedAt = c.startedMinute ?? game.clock.minute;
      const elapsed = c.phase === "Scheduled" ? 0 : Math.max(0, game.clock.minute - startedAt);
      const parkingPct = Math.min(100, (elapsed / (c.parkingDays * S.DAY_MINUTES)) * 100);
      const overrun = c.overrunDaysPenalized;
      const team = c.assignedMechanicIds.length === 0
        ? '<span class="muted">(sin asignar — esperando stand+mecánicos)</span>'
        : c.assignedMechanicIds.map(mid => {
            const m = game.mechanics.find(mm => mm.id === mid);
            return \`<span class="chip">🪪 \${esc(m?.name ?? mid)}</span>\`;
          }).join("");
      h += \`<article class="wo-card base" data-check-id="\${c.instanceId}" style="cursor:pointer" title="Click para detalle">
        <header class="wo-head"><span class="wo-id">\${c.instanceId}</span><span class="check-badge">\${c.type}-CHECK</span>\${c.nightStarted?'<span class="check-badge" style="background:rgba(80,80,140,.3);color:#cdf">🌙</span>':''}\${c.onPlatform?'<span class="check-badge" style="background:rgba(255,180,77,.3);color:#fc9" title="A-check al aire libre, eff 0.7×">⛅</span>':''}<span class="wo-phase phase-\${c.phase}">\${c.phase}</span></header>
        <div class="wo-desc">✈️ <strong>\${esc(c.registration)}</strong> (\${fa?.model??"?"}/\${fa?.engineVariant??"?"})</div>
        <div class="wo-meta">
          <span>Stand: \${c.standId || "—"}</span>
          <span>Team: \${c.assignedMechanicIds.length}/\${Math.max(1, Math.ceil(c.manDaysIdeal/c.parkingDays))}</span>
          <span>Fee: \${fmt(c.baseFee)} €</span>
          \${overrun > 0 ? \`<span style="color:var(--danger)">Overrun \${overrun}d (-\${fmt(overrun*5000)} €)</span>\` : ''}
        </div>
        <div class="bar-wrap"><span class="bar-lbl">Trabajo</span><div class="bar"><div class="fill base" style="width:\${workPct}%"></div></div><span class="mono" style="font-size:.7rem">\${workPct.toFixed(0)}%</span></div>
        <div class="bar-wrap"><span class="bar-lbl\${overrun>0?' bad':''}">Parking \${c.parkingDays}d</span><div class="bar"><div class="fill \${overrun>0?'bad':'warn'}" style="width:\${parkingPct}%"></div></div><span class="mono" style="font-size:.7rem">\${parkingPct.toFixed(0)}%</span></div>
        <div class="wo-team">\${team}</div>
      </article>\`;
    }
    h += '</div>';
  }

  // Histórico breve de completados (últimos 5)
  const completed = game.maintenanceChecks.filter(c => c.phase === "Completed").slice(-5).reverse();
  if (completed.length > 0) {
    h += '<h3>Histórico (últimos 5)</h3><table><thead><tr><th>ID</th><th>Matrícula</th><th>Tipo</th><th>Iniciado</th><th>Cerrado</th><th>Overrun</th><th>Fee</th></tr></thead><tbody>';
    for (const c of completed) {
      h += \`<tr data-check-id="\${c.instanceId}" style="cursor:pointer" title="Click para detalle"><td class="mono">\${c.instanceId}</td><td>\${esc(c.registration)}</td><td>\${c.type}\${c.nightStarted?' 🌙':''}</td><td class="mono">\${fmtClock(c.startedMinute ?? 0)}</td><td class="mono">\${fmtClock(c.completedMinute ?? 0)}</td><td class="mono \${c.overrunDaysPenalized>0?'neg':''}">\${c.overrunDaysPenalized}d</td><td class="mono pos">+\${fmt(c.baseFee)} €</td></tr>\`;
    }
    h += '</tbody></table>';
  }
  return h;
}

// --- Hangar sub-tab: Fleet (matrículas persistentes con FH/cycles) ---
function renderHangarFleet(){
  const fleetByAl = new Map();
  for (const f of game.fleet) {
    if (!fleetByAl.has(f.airlineId)) fleetByAl.set(f.airlineId, []);
    fleetByAl.get(f.airlineId).push(f);
  }
  let h = '';
  const upcoming = upcomingWarnings();
  if (upcoming.length > 0) {
    h += '<div class="warn-banner">⚠️ ' + upcoming.length + ' aviones a ≤50 FH de un check: ' + upcoming.map(u => esc(u.registration) + ' (' + u.type + '@' + Math.ceil(u.remainingFH) + 'h)').join(', ') + '</div>';
  }
  for (const [alId, fleet] of fleetByAl) {
    const al = game.airlines.find(a => a.id === alId);
    h += \`<h3>\${esc(al?.name ?? alId)} · \${fleet.length} aviones</h3><div class="fleet-grid">\`;
    for (const f of fleet) {
      const aCheckDef = game.checkDefinitions.find(d => d.type === "A" && d.model === f.model);
      const cCheckDef = game.checkDefinitions.find(d => d.type === "C" && d.model === f.model);
      const aRemain = aCheckDef ? aCheckDef.triggerFH - f.fhSinceLastA : 0;
      const cRemain = cCheckDef ? cCheckDef.triggerFH - f.fhSinceLastC : 0;
      const hasActive = game.maintenanceChecks.some(c => c.registration === f.registration && (c.phase === "Scheduled" || c.phase === "InProgress"));
      const cls = hasActive ? "active" : (f.warnedA || f.warnedC || f.warnedD) ? "warn" : "";
      h += \`<article class="fleet-card \${cls}" data-fleet-reg="\${esc(f.registration)}" title="Click para detalle">
        <div class="fleet-head"><span class="fleet-reg">\${esc(f.registration)}</span><span class="mono" style="font-size:.7rem">\${f.model}/\${f.engineVariant}</span></div>
        <div class="fleet-meta">
          <span>FH total: <strong>\${f.totalFH.toFixed(0)}</strong></span>
          <span>Cycles: <strong>\${f.totalCycles}</strong></span>
        </div>
        <div class="bar-wrap" style="margin-top:.3rem"><span class="bar-lbl" style="width:5rem;font-size:.65rem">A-check</span><div class="bar"><div class="fill \${aRemain<=50?'warn':'primary'}" style="width:\${Math.min(100,(f.fhSinceLastA/Math.max(1,aCheckDef?.triggerFH ?? 600))*100)}%"></div></div><span class="mono" style="font-size:.65rem;min-width:3rem;text-align:right">\${aRemain>0?aRemain.toFixed(0)+'h':'¡!'}</span></div>
        <div class="bar-wrap"><span class="bar-lbl" style="width:5rem;font-size:.65rem">C-check</span><div class="bar"><div class="fill \${cRemain<=200?'warn':'primary'}" style="width:\${Math.min(100,(f.fhSinceLastC/Math.max(1,cCheckDef?.triggerFH ?? 7500))*100)}%"></div></div><span class="mono" style="font-size:.65rem;min-width:3rem;text-align:right">\${cRemain>0?cRemain.toFixed(0)+'h':'¡!'}</span></div>
        \${hasActive ? '<div style="margin-top:.3rem"><span class="chip" style="background:var(--base);color:#fff;border-color:var(--base)">🛠️ check activo</span></div>' : (f.warnedA||f.warnedC||f.warnedD) ? '<div style="margin-top:.3rem"><span class="chip warn">⚠️ próximo</span></div>' : ''}
      </article>\`;
    }
    h += '</div>';
  }
  return h;
}

function renderHangarDeferrals(){
  const defs = deferredWos();
  if (defs.length === 0) return '<div class="empty">Sin WOs diferidas. Cuando difieras una WO desde su modal, aparecerá aquí con cuenta atrás.</div>';
  let h = '<p class="muted" style="margin-bottom:.75rem">' + defs.length + ' WO\\u0073 diferida\\u0073. Vencimiento → penalty -10.000 \\u20ac + -5 reputaci\\u00f3n.</p>';
  for (const wo of defs) {
    const tpl = game.templates.find(t => t.id === wo.templateId);
    const mc = melCat(tpl);
    const remaining = (wo.deferralExpiryMinute ?? 0) - game.clock.minute;
    const remDays = Math.max(0, Math.floor(remaining / S.DAY_MINUTES));
    const remHrs = Math.max(0, Math.floor((remaining % S.DAY_MINUTES) / 60));
    const urgent = remaining < S.DAY_MINUTES; // < 24h
    h += \`<article class="def-card \${urgent?'urgent':''}">
      <div class="def-head">
        <div><span class="wo-id">\${wo.instanceId}</span> · <strong>\${esc(wo.airplaneRegistration)}</strong>\${mc?\` <span class="mel-badge mel-\${mc}">MEL \${mc}</span>\`:''}</div>
        <div class="def-countdown \${urgent?'urgent':''}">\${remDays}d \${remHrs}h</div>
      </div>
      <div class="wo-desc">\${esc(tpl?.description ?? "?")}</div>
      <div class="wo-meta"><span>ATA \${tpl?.ata??"?"}</span><span>\${tpl?.requiredCategory??"?"}</span><span>Severity: \${tpl?.severity??"?"}</span></div>
      <div style="margin-top:.5rem"><button class="btn-undefer" data-undefer-wo="\${wo.instanceId}" title="Cancela el deferral y devuelve la WO al flujo normal (sin coste extra)">🔧 Reparar ya</button></div>
    </article>\`;
  }
  return h;
}

// Pivot línea pura: tab Mapa = solo el canvas Pixi en skin F5D, sin selector de variantes.
// El canvas se monta vía syncMapRender() — aquí solo damos el host.
function renderMap(){
  return \`<div class="pixi-host" id="pixi-host" style="height:calc(100vh - 96px);min-height:480px"></div>\`;
}

// ===========================================================================
// Event Tracking (pivot línea pura, 2026-05-24) — vista unificada Lite
// ===========================================================================
// Reconstruye un feed cronológico desde el state actual: WOs line, A/C/D checks,
// MEL deferrals, random events (runway closure, SB), audits Part-145. Por default
// muestra solo eventos OPEN (activos). Toggle "All" añade los cerrados.
// Click en cada card abre el modal de detalle existente (WO/check/contract).
function buildEventFeed(){
  const events = [];
  // WOs line + diferidas + completadas/failed
  for (const wo of game.workOrders) {
    const tpl = game.templates.find(t => t.id === wo.templateId);
    const isDeferred = wo.phase === "Deferred";
    const isClosed = wo.phase === "Completed" || wo.phase === "Failed";
    const isDaily = tpl?.id?.startsWith?.("DC-");
    events.push({
      kind: isDaily ? "daily" : "wo",
      id: wo.instanceId,
      sortMinute: wo.emissionMinute,
      open: !isClosed,  // deferred cuenta como open (hay decisión pendiente: reparar o dejar vencer)
      icon: tpl?.isAOG ? "🛑" : isDaily ? "🌙" : isDeferred ? "📋" : "🔧",
      title: \`\${esc(wo.airplaneRegistration)} · \${esc(tpl?.description?.slice(0,55) ?? wo.templateId)}\`,
      phase: wo.phase,
      meta: [
        \`ATA \${tpl?.ata ?? "?"}\`,
        \`\${tpl?.requiredCategory ?? "?"}\`,
        \`SLA \${wo.slaMinute - game.clock.minute}m\`,
        wo.assignedMechanicIds.length === 0 ? "⚠️ sin asignar" : \`team \${wo.assignedMechanicIds.length}\`,
      ],
      clickWoId: wo.instanceId,
    });
  }
  // A/C/D checks
  for (const c of game.maintenanceChecks) {
    const isOpen = c.phase === "Scheduled" || c.phase === "InProgress";
    events.push({
      kind: "check",
      id: c.instanceId,
      sortMinute: c.scheduledMinute,
      open: isOpen,
      icon: "🛠️",
      title: \`\${esc(c.registration)} · \${c.type}-check\${c.nightStarted ? " 🌙" : ""}\${c.onPlatform ? " ⛅" : ""}\`,
      phase: c.phase,
      meta: [
        \`Stand \${c.standId || "—"}\`,
        \`Team \${c.assignedMechanicIds.length}/\${Math.max(1, Math.ceil(c.manDaysIdeal / c.parkingDays))}\`,
        \`Fee +\${(c.baseFee).toLocaleString("es-ES")} €\`,
        c.overrunDaysPenalized > 0 ? \`Overrun \${c.overrunDaysPenalized}d\` : null,
      ].filter(Boolean),
      clickCheckId: c.instanceId,
    });
  }
  // Random events
  for (const ev of (game.randomEvents ?? [])) {
    const isOpen = ev.type === "runway_closure"
      ? ev.endMinute > game.clock.minute
      : (game.clock.minute - ev.startMinute) < 7 * S.DAY_MINUTES;
    const icon = ev.type === "runway_closure" ? "🚧" : "📢";
    const title = ev.type === "runway_closure"
      ? \`Pista \${isOpen ? "CERRADA" : "normalizada"} · \${esc(ev.reason)}\`
      : \`SB Airbus · \${esc(ev.description ?? "")} (\${esc((ev.affectedRegistrations ?? []).join(", "))})\`;
    events.push({
      kind: "randomEvent",
      id: ev.id,
      sortMinute: ev.startMinute,
      open: isOpen,
      icon,
      title,
      phase: isOpen ? "ACTIVE" : "ENDED",
      meta: ev.type === "runway_closure"
        ? [\`\${fmtClock(ev.startMinute)} → \${fmtClock(ev.endMinute)}\`]
        : [\`Modelo \${ev.model}\`, \`Motor \${ev.engineVariant}\`],
    });
  }
  // Audits Part-145 (de compliance state)
  if (game.compliance && game.compliance.lastAuditMinute !== null) {
    events.push({
      kind: "audit",
      id: \`audit-\${game.compliance.totalAudits}\`,
      sortMinute: game.compliance.lastAuditMinute,
      open: false,
      icon: "🛡️",
      title: \`Auditoría Part-145 #\${game.compliance.totalAudits} · score \${game.compliance.score}/100\`,
      phase: "DONE",
      meta: [
        \`Findings: \${(game.compliance.openFindings ?? []).length}\`,
        \`Próxima en \${Math.max(0, Math.ceil((game.compliance.nextAuditMinute - game.clock.minute) / S.DAY_MINUTES))}d\`,
      ],
    });
  }
  // Pre-aviso audit pendiente (si existe en notificaciones recientes y aún no auditada)
  // Lite: skip — el detalle ya está en el badge HUD Compliance.

  // Orden cronológico inverso (más reciente primero).
  events.sort((a, b) => b.sortMinute - a.sortMinute);
  return events;
}

function renderHangarEventTracking(){
  const feed = buildEventFeed();
  const filtered = eventFilter === "open" ? feed.filter(e => e.open) : feed;
  const openCount = feed.filter(e => e.open).length;
  const closedCount = feed.length - openCount;

  let h = \`<div class="skin-bar" style="margin-bottom:.75rem">
    <span class="skin-label">Vista:</span>
    <button class="\${eventFilter==='open'?'active':''}" data-event-filter="open" style="padding:.25rem .6rem;font-size:.8rem">Activos (\${openCount})</button>
    <button class="\${eventFilter==='all'?'active':''}" data-event-filter="all" style="padding:.25rem .6rem;font-size:.8rem">Todos (\${feed.length})</button>
    <span class="skin-label" style="margin-left:1rem;color:var(--muted)">cerrados: \${closedCount}</span>
  </div>\`;

  if (filtered.length === 0) {
    h += eventFilter === "open"
      ? '<div class="empty">No hay eventos activos. Pulsa 1× / 2× / 5× para que el reloj avance.</div>'
      : '<div class="empty">Sin eventos todavía.</div>';
    return h;
  }

  h += '<div style="display:flex;flex-direction:column;gap:.5rem">';
  for (const e of filtered) {
    const stateBadge = e.open
      ? \`<span class="wo-phase phase-\${e.phase}" style="background:rgba(63,185,80,.15);color:var(--success);border-color:rgba(63,185,80,.4)">OPEN · \${esc(e.phase)}</span>\`
      : \`<span class="wo-phase" style="background:rgba(139,150,180,.15);color:var(--muted);border-color:rgba(139,150,180,.3)">CLOSED · \${esc(e.phase)}</span>\`;
    const dataAttr = e.clickWoId ? \`data-wo="\${e.clickWoId}"\`
      : e.clickCheckId ? \`data-check-id="\${e.clickCheckId}"\` : "";
    const clickable = dataAttr ? 'style="cursor:pointer"' : '';
    h += \`<article class="wo-card\${e.open ? '' : ' base'}" \${dataAttr} \${clickable}>
      <header class="wo-head">
        <span class="event-kind" style="font-size:1.1rem">\${e.icon}</span>
        <span class="wo-id mono">\${fmtClock(e.sortMinute)}</span>
        <span class="wo-id">\${e.id}</span>
        \${stateBadge}
      </header>
      <div class="wo-desc">\${e.title}</div>
      <div class="wo-meta">\${e.meta.map(m => \`<span>\${esc(String(m))}</span>\`).join("")}</div>
    </article>\`;
  }
  h += '</div>';
  return h;
}

// Pivot línea pura: tab Operaciones reune lo que antes eran subtabs del Hangar.
// Subtab principal "Event Tracking" (unificada). Resto = vistas filtradas.
function renderOperations(){
  const openEvents = buildEventFeed().filter(e => e.open).length;
  const baseCheckCount = activeBaseChecks().length;
  const warnCount = upcomingWarnings().length;
  const defCount = deferredWos().length;
  let h = '<h2>Operaciones</h2>';
  h += \`<div class="subtabs">
    <button data-subtab="events" class="\${opsSubTab==='events' || opsSubTab==='line' ?'active':''}">📡 Event Tracking <span class="count">\${openEvents}</span></button>
    <button data-subtab="base" class="base \${opsSubTab==='base'?'active':''}">Base Checks <span class="count">\${baseCheckCount}</span></button>
    <button data-subtab="deferrals" class="\${opsSubTab==='deferrals'?'active':''}">Deferrals \${defCount>0?\`<span class="count" style="background:var(--warning);color:#fff">\${defCount}</span>\`:\`<span class="count">0</span>\`}</button>
    <button data-subtab="fleet" class="\${opsSubTab==='fleet'?'active':''}">Flota \${warnCount>0?\`<span class="count" style="background:var(--warning);color:#fff">⚠ \${warnCount}</span>\`:''}</button>
  </div>\`;
  // "line" legacy → "events" (backward compat con saves o estado en memoria viejo)
  if (opsSubTab === "events" || opsSubTab === "line") h += renderHangarEventTracking();
  else if (opsSubTab === "base") h += renderHangarBase();
  else if (opsSubTab === "deferrals") h += renderHangarDeferrals();
  else h += renderHangarFleet();
  return h;
}

function renderCoverageGantt(){
  // Fase 5B Y3: mini-gantt 24h × 3 shifts mostrando cuántos mecs cubren cada hora.
  const byShift = { morning: 0, afternoon: 0, night: 0 };
  for (const m of game.mechanics) {
    if (m.isLeadForeman) continue; // TMA no cuenta (no asignable a WOs)
    const s = m.shift ?? "morning";
    if (s in byShift) byShift[s]++;
  }
  let h = '<div class="gantt"><div class="gantt-title">Cobertura 24h (sin TMA)</div><div class="gantt-grid">';
  for (let hour = 0; hour < 24; hour++) {
    let shift, count;
    if (hour >= 6 && hour < 14) { shift = "morning"; count = byShift.morning; }
    else if (hour >= 14 && hour < 22) { shift = "afternoon"; count = byShift.afternoon; }
    else { shift = "night"; count = byShift.night; }
    const cls = count === 0 ? "empty" : count <= 2 ? "low" : count <= 4 ? "mid" : "high";
    h += \`<div class="gantt-cell shift-\${shift} cov-\${cls}" title="\${String(hour).padStart(2,"0")}:00 · \${shift} · \${count} mec\${count!==1?"s":""}">\${count}</div>\`;
  }
  h += '</div></div>';
  return h;
}

function renderMechanics(){
  let h = \`<h2>Mecánicos (\${game.mechanics.length})</h2>
  <p class="muted" style="margin-bottom:.5rem">Turno: morning 06-14h · afternoon 14-22h · night 22-06h (+50% salario). Moral 0-100 ajusta eficiencia (0.5x–1.2x).</p>
  \${renderCoverageGantt()}
  <table><thead><tr><th>ID</th><th>Nombre</th><th>Base</th><th>Eff</th><th>Moral</th><th>Turno</th><th>Estado</th><th>Asignado</th><th>Salario</th><th>Train</th><th></th></tr></thead><tbody>\`;
  for (const m of game.mechanics) {
    const ratings = m.typeRatings.map(r => \`\${r.model}/\${r.engineVariant}/\${r.category}\`).join(", ") || "—";
    const assigned = m.assignedCheckInstanceId
      ? \`<span style="color:var(--base)">\${m.assignedCheckInstanceId}</span>\`
      : m.activeTrainingUntilMinute && m.activeTrainingUntilMinute > game.clock.minute
        ? \`<span style="color:var(--base)">Training \${Math.max(0, Math.ceil((m.activeTrainingUntilMinute - game.clock.minute) / S.DAY_MINUTES))}d</span>\`
        : (m.assignedWoInstanceId ?? "—");
    const passive = m.trainingMinutes ?? 0;
    const passiveDays = (passive / S.DAY_MINUTES).toFixed(1);
    const passiveCol = m.base === null ? \`\${passiveDays}/90d\` : "—";
    const canFire = m.state === "Idle" || m.state === "OffShift";
    const canTrain = m.state === "Idle" && game.economy.balance >= S.ACTIVE_TRAINING_COST_EUR;
    const sev = S.severanceFor(m);
    const fireBtn = canFire
      ? \`<button data-fire="\${m.id}" title="Despedir (severance \${fmt(sev)} €)" style="padding:.15rem .4rem;font-size:.7rem">👋</button>\`
      : '<span class="mono" title="Ocupado, no se puede despedir">—</span>';
    const trainBtn = canTrain
      ? \`<button data-train="\${m.id}" title="Training activo (5k € · 7d)" style="padding:.15rem .4rem;font-size:.7rem;margin-right:.2rem">🎓</button>\`
      : '';
    const moral = m.moral ?? 70;
    const moralCls = moral >= 70 ? "good" : moral >= 40 ? "warn" : "bad";
    const canChangeShift = m.state === "Idle" || m.state === "OffShift";
    const shiftHtml = canChangeShift
      ? \`<select class="shift-select" data-shift-mech="\${m.id}">
          <option value="morning"\${m.shift==="morning"?" selected":""}>morning</option>
          <option value="afternoon"\${m.shift==="afternoon"?" selected":""}>afternoon</option>
          <option value="night"\${m.shift==="night"?" selected":""}>night</option>
          <option value="off"\${m.shift==="off"?" selected":""}>off</option>
        </select>\`
      : \`<span class="mono">\${m.shift ?? "morning"}</span>\`;
    h += \`<tr data-mech-id="\${m.id}" title="Click para detalle (\${ratings})" style="cursor:pointer">
      <td class="mono">\${m.id}</td>
      <td>\${esc(m.name)}</td>
      <td>\${m.base ?? "Helper"}</td>
      <td class="mono">\${m.efficiency}</td>
      <td><div class="moral-bar"><div class="moral-fill \${moralCls}" style="width:\${moral}%"></div></div> <span class="mono" style="font-size:.7rem">\${Math.round(moral)}</span></td>
      <td>\${shiftHtml}</td>
      <td><span class="state state-\${m.state}">\${m.state}</span></td>
      <td class="mono">\${assigned}</td>
      <td class="mono">\${fmt(S.effectiveWeeklySalary(m))} €/sem\${m.shift==="night"?' <span class="mono" style="color:var(--warning)">×1.5</span>':''}</td>
      <td class="mono">\${passiveCol}</td>
      <td>\${trainBtn}\${fireBtn}</td>
    </tr>\`;
  }
  return h + '</tbody></table>';
}

function renderMarket(){
  const candidates = game.candidates || [];
  if (candidates.length === 0) return '<h2>Mercado laboral</h2><div class="empty">Pool vacío. Refresca tras unos días ingame.</div>';
  let h = \`<h2>Mercado laboral · \${candidates.length} candidato\${candidates.length===1?'':'s'}</h2>\`;
  h += '<p class="muted" style="margin-bottom:.75rem">Pool se refresca cada 7 días ingame. Signing bonus = 4 semanas de salario esperado.</p>';
  h += '<div class="cand-grid">';
  for (const c of candidates) {
    const baseLabel = c.base === null ? "Helper" : c.base;
    const baseCls = c.base === null ? "helper" : c.base === "B2" ? "b2" : "";
    const remainingDays = Math.max(0, Math.ceil((c.expiresAtMinute - game.clock.minute) / S.DAY_MINUTES));
    const bonus = S.signingBonusFor(c);
    const canAfford = game.economy.balance >= bonus;
    const ratings = c.typeRatings.map(r => \`\${r.model}/\${r.engineVariant}/\${r.category}\`).join(", ") || "—";
    h += \`<article class="cand-card">
      <div class="cand-head">
        <span class="cand-name">\${esc(c.name)}</span>
        <span class="cand-base \${baseCls}">\${baseLabel}</span>
      </div>
      <div class="cand-meta">
        <span>\${c.age} años</span>
        <span>\${c.experienceYears}y exp.</span>
        <span>Eff: <strong>\${c.efficiency}</strong></span>
        <span>Salario: <strong>\${fmt(c.expectedWeeklySalary)} €/sem</strong></span>
      </div>
      <div class="cand-ratings">Ratings: \${ratings}</div>
      <div class="cand-traits">\${c.personality.map(p => \`<span class="chip">\${esc(p)}</span>\`).join("")}</div>
      <div class="cand-meta"><span>Caduca en <strong>\${remainingDays}d</strong></span><span>Signing bonus: <strong>\${fmt(bonus)} €</strong></span></div>
      <div class="cand-actions"><button class="primary" data-hire="\${c.id}"\${!canAfford?' disabled title="Balance insuficiente"':''}>🤝 Contratar</button></div>
    </article>\`;
  }
  return h + '</div>';
}

function tierBadge(tier){
  const t = tier || "standard";
  const labels = { standard: "Standard", premium: "Premium ⭐", deluxe: "Deluxe ⭐⭐" };
  return \`<span class="tier-badge tier-\${t}">\${labels[t]}</span>\`;
}

function renderContracts(){
  let h = '<h2>Contratos</h2><h3>Activos</h3>';
  const actives = activeContracts();
  if (actives.length === 0) h += '<p class="muted">Sin contratos activos.</p>';
  for (const c of actives) {
    h += \`<article class="contract-card" data-contract-id="\${c.id}" style="cursor:pointer" title="Click para detalle"><header><strong>\${esc(airlineName(c.airlineId))}</strong> · \${c.id} \${tierBadge(c.tier)}</header><div class="kvs"><span>Cuota semanal: <strong>\${fmt(c.baseFeePerWeek)} €</strong></span><span>€/min WO: <strong>\${c.paymentPerWOMinute}</strong></span><span>Penalty: <strong>\${c.penaltyPerLateMinute} €/min</strong></span><span>Rep. min.: <strong>\${c.minReputation}</strong></span><span>Aviones/día: <strong>\${c.expectedLandingsPerDay}</strong></span></div></article>\`;
  }
  h += '<h3>Ofertas</h3>';
  const offers = liveOffers();
  if (offers.length === 0) h += '<p class="muted">No hay ofertas pendientes.</p>';
  for (const c of offers) {
    const expIn = c.expiresAtMinute ? Math.max(0, c.expiresAtMinute - game.clock.minute) : 0;
    h += \`<article class="contract-card offer" data-contract-id="\${c.id}" style="cursor:pointer" title="Click para detalle"><header><strong>\${esc(airlineName(c.airlineId))}</strong> · \${c.id} \${tierBadge(c.tier)} · expira en \${expIn}m</header><div class="kvs"><span>Cuota semanal: <strong>\${fmt(c.baseFeePerWeek)} €</strong></span><span>€/min WO: <strong>\${c.paymentPerWOMinute}</strong></span><span>Penalty: <strong>\${c.penaltyPerLateMinute} €/min</strong></span><span>Rep. min.: <strong>\${c.minReputation}</strong></span></div><div class="actions"><button class="primary" data-accept="\${c.id}">Aceptar</button><button data-reject="\${c.id}">Rechazar</button></div></article>\`;
  }
  return h;
}

/** Sparkline SVG simple. data = array de números. width/height en px. color = stroke. */
function sparkline(data, opts = {}){
  const { width = 280, height = 60, color = "var(--primary)", showRange = true } = opts;
  if (!data || data.length === 0) return '<div class="muted" style="font-size:.85rem;padding:1rem">Sin datos aún. Llega un cierre semanal para empezar.</div>';
  if (data.length === 1) {
    return \`<div class="muted" style="font-size:.85rem;padding:.5rem">Solo 1 punto (\${data[0].toFixed(0)}). Esperando próximas semanas...</div>\`;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return \`\${x.toFixed(1)},\${y.toFixed(1)}\`;
  }).join(" ");
  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const delta = lastVal - firstVal;
  const deltaColor = delta > 0 ? "var(--success)" : delta < 0 ? "var(--danger)" : "var(--muted)";
  const deltaSign = delta > 0 ? "+" : "";
  return \`<div class="sparkline">
    <svg width="\${width}" height="\${height}" viewBox="0 0 \${width} \${height}" preserveAspectRatio="none">
      <polyline points="\${points}" fill="none" stroke="\${color}" stroke-width="1.5" />
      <circle cx="\${(data.length - 1) * stepX}" cy="\${height - ((lastVal - min) / range) * height}" r="2.5" fill="\${color}" />
    </svg>
    \${showRange ? \`<div class="spark-meta"><span class="mono">min \${min.toFixed(0)}</span> <span class="mono" style="color:\${deltaColor}">\${deltaSign}\${delta.toFixed(0)}</span> <span class="mono">max \${max.toFixed(0)}</span></div>\` : ''}
  </div>\`;
}

function renderActiveEvents(){
  const events = (game.randomEvents ?? []).filter(e => e.endMinute >= game.clock.minute || (e.type === "service_bulletin" && !e.cleanedUp));
  // SBs son puntuales; los mantenemos visibles solo 7 días tras emisión.
  const fresh = events.filter(e => game.clock.minute - e.startMinute < 7 * S.DAY_MINUTES);
  if (fresh.length === 0) return '';
  let h = '<h3 style="margin-top:1.5rem">📢 Eventos activos</h3><div style="display:flex;flex-direction:column;gap:.4rem">';
  for (const e of fresh) {
    if (e.type === "runway_closure") {
      const remaining = Math.max(0, e.endMinute - game.clock.minute);
      const remH = Math.floor(remaining / 60);
      const remM = remaining % 60;
      const active = game.clock.minute >= e.startMinute && game.clock.minute < e.endMinute;
      h += \`<article class="contract-card\${active ? '' : ' offer'}" style="border-left:3px solid \${active ? 'var(--danger)' : 'var(--muted)'}">
        <header><strong>\${active ? '🚧 Pista CERRADA' : '✅ Pista normalizada'}</strong> · <span class="muted">\${esc(e.reason)}</span></header>
        <div class="kvs"><span>Inicio: <strong>\${fmtClock(e.startMinute)}</strong></span><span>Fin: <strong>\${fmtClock(e.endMinute)}</strong></span>\${active ? \`<span>Tiempo restante: <strong>\${remH}h \${remM}m</strong></span>\` : ''}</div>
      </article>\`;
    } else if (e.type === "service_bulletin") {
      h += \`<article class="contract-card offer" style="border-left:3px solid var(--primary)">
        <header><strong>📋 Service Bulletin Airbus</strong> · <span class="muted">\${esc(e.description)}</span></header>
        <div class="kvs"><span>Modelo: <strong>\${e.model}</strong></span><span>Motor: <strong>\${e.engineVariant}</strong></span><span>Aviones afectados: <strong>\${esc(e.affectedRegistrations.join(", "))}</strong></span><span>Emitido: <strong>\${fmtClock(e.startMinute)}</strong></span></div>
      </article>\`;
    }
  }
  h += '</div>';
  return h;
}

function renderDashboard(){
  const h = game.kpiHistory ?? [];
  const balances = h.map(s => s.balance);
  const reps = h.map(s => s.repAvg);
  const woComp = h.map(s => s.woCompleted);
  const woLate = h.map(s => s.woLate);
  const compliance = h.map(s => s.complianceScore);
  const mechs = h.map(s => s.mechanicsCount);

  // Pivot línea pura · KPI departures + TDR
  const kpi = game.departureKPI ?? S.createDepartureKPI();
  const tdr = S.getTdrGlobal(kpi);
  const onTimePct = kpi.totalDepartures > 0 ? (kpi.totalOnTime / kpi.totalDepartures * 100) : 0;
  const aogPct = kpi.totalDepartures > 0 ? (kpi.totalAog / kpi.totalDepartures * 100) : 0;
  const tdrColor = tdr < 5 ? "var(--success)" : tdr < 20 ? "var(--warning)" : "var(--danger)";

  // Tabla por aerolínea contratada (que aparezcan en kpi.perAirline al menos una vez)
  let perAirlineRows = '';
  const airlineEntries = Object.entries(kpi.perAirline).map(([id, b]) => {
    const al = game.airlines.find(a => a.id === id);
    const tdrA = b.departures > 0 ? b.sumDelayMinutes / b.departures : 0;
    return { id, name: al?.name ?? id, color: al?.color ?? "#888", bucket: b, tdr: tdrA };
  });
  airlineEntries.sort((a, b) => b.bucket.departures - a.bucket.departures);
  if (airlineEntries.length === 0) {
    perAirlineRows = '<tr><td colspan="6" class="muted" style="text-align:center;padding:1rem">Sin departures registrados todavía.</td></tr>';
  } else {
    for (const e of airlineEntries) {
      const tdrCol = e.tdr < 5 ? "var(--success)" : e.tdr < 20 ? "var(--warning)" : "var(--danger)";
      const aogColAg = e.bucket.aog > 0 ? 'var(--danger)' : 'var(--muted)';
      perAirlineRows += \`<tr>
        <td><span style="display:inline-block;width:8px;height:8px;background:\${e.color};border-radius:50%;margin-right:.4rem"></span>\${esc(e.name)}</td>
        <td class="mono">\${e.bucket.departures}</td>
        <td class="mono">\${e.bucket.onTime}</td>
        <td class="mono">\${e.bucket.late}</td>
        <td class="mono" style="color:\${aogColAg};font-weight:600">\${e.bucket.aog}</td>
        <td class="mono" style="color:\${tdrCol}"><strong>\${e.tdr.toFixed(1)} min/dep</strong></td>
      </tr>\`;
    }
  }

  return \`<h2>📊 Dashboard KPI</h2>
  <p class="muted" style="margin-bottom:.75rem">Series semanales (último año ingame, max 52 semanas). Cada punto = cierre de semana.</p>

  <h3 style="margin-top:1rem">📈 TDR — Total Delay Ratio</h3>
  <p class="muted" style="margin-bottom:.5rem">Minutos medios de retraso por departure. Si una WO bloquea al avión más allá de su hora prevista, acumula delay. Departure con delay ≥ 3h escala a AOG (penalty extra + rep delta).</p>
  <div class="dash-grid">
    <div class="dash-card">
      <div class="dash-title">📊 TDR Global</div>
      <div class="dash-big" style="color:\${tdrColor}">\${tdr.toFixed(1)} <span style="font-size:.85rem;color:var(--muted)">min/dep</span></div>
      <div class="muted" style="font-size:.75rem">Sobre \${kpi.totalDepartures} departures totales · Σ delay \${fmt(kpi.sumDelayMinutes)} min</div>
    </div>
    <div class="dash-card">
      <div class="dash-title">✓ On-time ratio</div>
      <div class="dash-big" style="color:var(--success)">\${onTimePct.toFixed(1)}%</div>
      <div class="muted" style="font-size:.75rem">\${kpi.totalOnTime} on-time / \${kpi.totalLate} late / \${kpi.totalAog} AOG</div>
    </div>
    <div class="dash-card">
      <div class="dash-title">🛑 AOG ratio (delay ≥3h)</div>
      <div class="dash-big" style="color:\${aogPct > 5 ? 'var(--danger)' : 'var(--muted)'}">\${aogPct.toFixed(1)}%</div>
      <div class="muted" style="font-size:.75rem">\${kpi.totalAog} AOG escalados · penalty €\${S.AOG_ESCALATION_PENALTY_EUR.toLocaleString("es-ES")} c/u</div>
    </div>
  </div>

  <h4 style="margin-top:1rem">TDR por aerolínea contratada</h4>
  <table>
    <thead><tr><th>Aerolínea</th><th>Departures</th><th>On-time</th><th>Late</th><th>AOG</th><th>TDR</th></tr></thead>
    <tbody>\${perAirlineRows}</tbody>
  </table>

  <h3 style="margin-top:1.5rem">📊 Series semanales</h3>
  <div class="dash-grid">
    <div class="dash-card">
      <div class="dash-title">💰 Balance</div>
      <div class="dash-big">\${fmt(game.economy.balance)} €</div>
      \${sparkline(balances, { color: "var(--primary)" })}
    </div>
    <div class="dash-card">
      <div class="dash-title">⭐ Reputación media</div>
      <div class="dash-big">\${Math.round(S.getAverageRep(game.reputation))}/100</div>
      \${sparkline(reps, { color: "var(--success)" })}
    </div>
    <div class="dash-card">
      <div class="dash-title">✅ WOs completadas (acumuladas)</div>
      <div class="dash-big">\${game.workOrders.filter(w => w.phase === "Completed").length}</div>
      \${sparkline(woComp, { color: "var(--success)" })}
    </div>
    <div class="dash-card">
      <div class="dash-title">⏰ WOs late (acumuladas)</div>
      <div class="dash-big">\${woLate.length > 0 ? woLate[woLate.length - 1] : 0}</div>
      \${sparkline(woLate, { color: "var(--warning)" })}
    </div>
    <div class="dash-card">
      <div class="dash-title">🛡️ Compliance Part-145</div>
      <div class="dash-big">\${game.compliance?.score ?? 80}/100</div>
      \${sparkline(compliance, { color: "var(--warning)" })}
    </div>
    <div class="dash-card">
      <div class="dash-title">⚙️ Mecánicos contratados</div>
      <div class="dash-big">\${game.mechanics.length}</div>
      \${sparkline(mechs, { color: "var(--muted)" })}
    </div>
  </div>
  \${renderActiveEvents()}\`;
}

function renderConstruction(){
  const stage = game.mroStage ?? 1;
  const cfgs = S.STAGE_CONFIG;
  const cur = cfgs[stage];
  let h = '<h2>🏗️ Construcción del MRO</h2>';
  h += \`<p class="muted">Etapa actual: <strong>Etapa \${stage} — \${esc(cur.label)}</strong></p>\`;
  h += \`<div class="kvs" style="margin-bottom:1rem"><span>Line stands: <strong>\${cur.lineStands}</strong></span><span>Base stands: <strong>\${cur.baseStands}</strong></span><span>Hangares extra (escala fixed cost): <strong>\${cur.extraHangars}</strong></span></div>\`;

  // Build activo
  if (game.activeBuild) {
    const remaining = Math.max(0, game.activeBuild.completionMinute - game.clock.minute);
    const total = game.activeBuild.completionMinute - game.activeBuild.startedAtMinute;
    const pct = total > 0 ? Math.max(0, Math.min(100, ((total - remaining) / total) * 100)) : 0;
    const remDays = Math.floor(remaining / S.DAY_MINUTES);
    const remHrs = Math.floor((remaining % S.DAY_MINUTES) / 60);
    h += \`<article class="contract-card" style="border-left:3px solid var(--warning)">
      <header><strong>🚧 Construcción en curso → Etapa \${game.activeBuild.targetStage}</strong></header>
      <div class="bar-wrap"><div class="bar-lbl">Progreso</div><div class="bar"><div class="fill" style="width:\${pct.toFixed(1)}%;background:var(--warning)"></div></div><div class="bar-pct">\${pct.toFixed(0)}%</div></div>
      <div class="muted" style="font-size:.85rem">Tiempo restante: \${remDays}d \${remHrs}h · Completa en minuto \${game.activeBuild.completionMinute}</div>
    </article>\`;
  }

  // Próxima etapa
  if (stage < 4 && !game.activeBuild) {
    const target = stage + 1;
    const next = cfgs[target];
    const canAfford = game.economy.balance >= next.costEur;
    const newLine = next.lineStands - cur.lineStands;
    const newBase = next.baseStands - cur.baseStands;
    const newFixed = (next.extraHangars - cur.extraHangars) * 5000;
    h += \`<article class="contract-card offer">
      <header><strong>📈 Etapa \${target} — \${esc(next.label)}</strong></header>
      <div class="kvs">
        <span>Coste: <strong>\${fmt(next.costEur)} €</strong></span>
        <span>Construcción: <strong>\${next.buildDays === 0 ? "instantánea" : next.buildDays + " días"}</strong></span>
        <span>+\${newLine > 0 ? newLine + " line stand" + (newLine>1?"s":"") : "0 line"}</span>
        <span>+\${newBase > 0 ? newBase + " base stand" + (newBase>1?"s":"") : "0 base"}</span>
        <span>+\${fmt(newFixed)} €/sem fixed cost</span>
      </div>
      <div class="actions"><button class="primary" id="btn-build"\${canAfford ? "" : " disabled"} title="\${canAfford ? "Iniciar construcción" : "Balance insuficiente"}">🏗️ Iniciar construcción</button></div>
    </article>\`;
  }

  if (stage === 4) {
    h += '<p class="muted">Has alcanzado la etapa máxima del MRO. 🎖️</p>';
  }
  return h;
}

// ===========================================================================
// Pivot MRO línea pura (2026-05-24) — P3: Panel Schedule del día
// ===========================================================================
function currentGameDay(){ return Math.floor(game.clock.minute / S.DAY_MINUTES) + 1; }
function currentMinOfDay(){ return game.clock.minute % S.DAY_MINUTES; }
function dayName(gd){
  const idx = ((gd - 1) % 7 + 7) % 7;
  return ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][idx];
}

function flightStatusFor(f, contractsActive){
  // Pivot línea pura: vuelos no habilitados (Embraer, CRJ, ATR, B737, A321neo) ven en
  // panel pero no son trabajo MRO hasta desbloquear type rating.
  if (f.notHandled) return { label: "🚫 Sin habilitación", cls: "muted" };
  // arrival sin contrato → "Sin contrato"
  if (f.type === "arrival" && !contractsActive.has(f.airlineCode)) return { label: "Sin contrato", cls: "muted" };
  const now = game.clock.minute;
  const dayStart = (currentGameDay() - 1) * S.DAY_MINUTES;
  const scheduledAbs = dayStart + f.scheduledMinute;
  if (f.type === "arrival") {
    // Buscar el avión real en g.airplanes cuyo registration coincida y arrivalMinute igual
    const ap = game.airplanes.find(a => a.registration === f.callsign && Math.abs(a.arrivalMinute - scheduledAbs) < 5);
    if (!ap) {
      if (now < scheduledAbs - 5) return { label: "Esperado", cls: "" };
      return { label: "—", cls: "muted" };
    }
    if (ap.status === "Departed") return { label: "Departed", cls: "muted" };
    if (now >= ap.arrivalMinute && now < ap.scheduledDepartureMinute) return { label: ap.overnight ? "Pernocta 🌙" : "En stand", cls: "" };
    if (now < ap.arrivalMinute) return { label: "Esperado", cls: "" };
    return { label: "Departed", cls: "muted" };
  } else {
    // departure
    if (now < scheduledAbs) return { label: "Pendiente salida", cls: "" };
    if (now < scheduledAbs + 15) return { label: "Saliendo", cls: "" };
    return { label: "Departed", cls: "muted" };
  }
}

function renderSchedule(){
  const gd = currentGameDay();
  const flights = S.getFlightsForGameDay(gd);
  const minOfDay = currentMinOfDay();
  const contractsActive = new Set();
  for (const c of game.contracts) {
    if (c.status !== "active") continue;
    const al = game.airlines.find(a => a.id === c.airlineId);
    if (al?.iataCode) contractsActive.add(al.iataCode);
  }
  // Filtro
  const filtered = scheduleFilter === "all" ? flights : flights.filter(f => f.type === scheduleFilter);
  // Próximos 3 movimientos en la siguiente hora
  const upcoming = flights
    .filter(f => f.scheduledMinute >= minOfDay && f.scheduledMinute < minOfDay + 60)
    .sort((a,b) => a.scheduledMinute - b.scheduledMinute)
    .slice(0, 3);
  const upcomingIds = new Set(upcoming.map(f => \`\${f.callsign}-\${f.type}-\${f.scheduledMinute}\`));

  const arr = flights.filter(f => f.type === "arrival").length;
  const dep = flights.filter(f => f.type === "departure").length;
  const notHandled = flights.filter(f => f.notHandled).length;
  const handled = flights.length - notHandled;

  let h = \`<h2>📅 Schedule — Día \${gd} (\${dayName(gd)})</h2>
  <p class="muted" style="margin-bottom:.5rem">Aeropuerto LEAS (OVD) · \${flights.length} movimientos (\${arr} ARR / \${dep} DEP) · <strong style="color:var(--success)">\${handled} handled</strong> + <strong style="color:var(--muted)">\${notHandled} sin habilitación</strong> · \${contractsActive.size} aerolínea(s) contratada(s)</p>\`;

  // Filtros + leyenda contratos activos
  const fBtn = (id, label) => \`<button class="\${scheduleFilter===id?'active':''}" data-schedule-filter="\${id}" style="padding:.25rem .6rem;font-size:.8rem">\${label}</button>\`;
  h += \`<div class="skin-bar" style="margin-bottom:.5rem">
    <span class="skin-label">Filtro:</span>
    \${fBtn('all','Todos')} \${fBtn('arrival','ARR')} \${fBtn('departure','DEP')}
    <span class="skin-label" style="margin-left:1rem">Contratados:</span>
    \${[...contractsActive].map(code => \`<span class="chip" style="background:rgba(63,185,80,.2);color:var(--success);border-color:var(--success)">\${code}</span>\`).join('') || '<span class="muted">ninguno</span>'}
  </div>\`;

  if (upcoming.length > 0) {
    h += '<div class="warn-banner" style="background:rgba(77,163,255,.08);border-left-color:var(--accent);color:var(--text);margin-bottom:.75rem">📡 Próximos: ' +
      upcoming.map(f => \`<strong>\${S.formatClock((gd-1)*S.DAY_MINUTES + f.scheduledMinute)} \${f.callsign}</strong> \${f.type==='arrival'?'ARR':'DEP'} \${f.remote}\`).join(' · ') + '</div>';
  }

  h += '<table><thead><tr><th>Hora</th><th>Callsign</th><th>Tipo</th><th>Ruta</th><th>Modelo</th><th>Operador</th><th>Estado</th></tr></thead><tbody>';
  for (const f of filtered.sort((a,b) => a.scheduledMinute - b.scheduledMinute)) {
    const time = String(Math.floor(f.scheduledMinute / 60)).padStart(2,'0') + ':' + String(f.scheduledMinute % 60).padStart(2,'0');
    const st = flightStatusFor(f, contractsActive);
    const isUpcoming = upcomingIds.has(\`\${f.callsign}-\${f.type}-\${f.scheduledMinute}\`);
    let rowStyle = isUpcoming ? 'background:rgba(77,163,255,.08)' : '';
    if (f.notHandled) rowStyle += ';opacity:0.55';
    const typeBadge = f.type === "arrival"
      ? '<span class="chip" style="background:rgba(63,185,80,.15);color:var(--success);border-color:rgba(63,185,80,.4)">ARR</span>'
      : '<span class="chip" style="background:rgba(210,153,34,.15);color:var(--warning);border-color:rgba(210,153,34,.4)">DEP</span>';
    const operatorBadge = contractsActive.has(f.airlineCode)
      ? \`<span style="color:var(--success)">\${esc(f.airlineName)} (\${f.airlineCode})</span>\`
      : \`<span class="muted">\${esc(f.airlineName)} (\${f.airlineCode})</span>\`;
    const modelCell = f.notHandled
      ? \`<span class="muted" title="Type rating no habilitado todavía">\${esc(f.model)}/\${esc(f.engineVariant)}</span>\`
      : \`\${esc(f.model)}/\${esc(f.engineVariant)}\`;
    h += \`<tr style="\${rowStyle}"><td class="mono">\${time}</td><td class="mono">\${esc(f.callsign)}</td><td>\${typeBadge}</td><td class="mono">\${f.type==='arrival'?'← ':'→ '}\${esc(f.remote)}</td><td>\${modelCell}</td><td>\${operatorBadge}</td><td class="\${st.cls}">\${st.label}</td></tr>\`;
  }
  h += '</tbody></table>';
  return h;
}

// ===========================================================================
// Pivot MRO línea pura (2026-05-24) — P4: Vista Pernocta nocturna
// ===========================================================================
/** Aviones que pernoctarán esta noche (flag overnight=true en g.airplanes,
 *  scheduledDeparture en el día siguiente). */
function overnightAirplanes(){
  return game.airplanes.filter(a =>
    a.overnight === true &&
    a.scheduledDepartureMinute > game.clock.minute &&
    a.status !== "Departed"
  );
}
/** Solo mostramos el badge a partir de las 20:00 (informativo: la noche se acerca). */
function shouldShowOvernightBadge(){
  const hour = S.getHour(game.clock.minute);
  return hour >= 20 || hour < 6;
}

function renderOvernightModal(){
  if (!overnightModalOpen) return null;
  const overnights = overnightAirplanes();
  let inner = \`<header class="modal-head"><h3>🌙 Pernocta esta noche (\${overnights.length})</h3><button class="close" id="overnight-modal-close">×</button></header>
  <div class="modal-body">\`;
  if (overnights.length === 0) {
    inner += '<p class="muted">Ningún avión pernocta esta noche. Los daily checks se programan automáticamente al detectar overnight (≥19:00).</p>';
  } else {
    inner += '<p class="muted" style="margin-bottom:.5rem">A las pernoctas se les emiten 2-4 daily checks automáticos (ruedas, frenos, fluidos, pre-flight). Los completa el equipo de mañana al arrancar a las 06:00.</p>';
    inner += '<table><thead><tr><th>Matrícula</th><th>Modelo</th><th>Llegada</th><th>Salida prevista</th><th>Daily checks</th></tr></thead><tbody>';
    for (const ap of overnights.sort((a,b) => a.arrivalMinute - b.arrivalMinute)) {
      const dcs = game.workOrders.filter(w =>
        w.airplaneInstanceId === ap.instanceId &&
        w.templateId?.startsWith?.("DC-")
      );
      const dcStatus = dcs.length === 0 ? '<span class="muted">— (sin emitir aún)</span>'
        : dcs.map(d => {
            const tpl = game.dailyCheckTemplates?.find?.(t => t.id === d.templateId) || game.templates.find(t => t.id === d.templateId);
            const lbl = tpl?.description?.slice?.(0, 24) ?? d.templateId;
            const phase = d.phase === "Completed" ? "✓" : d.phase === "Failed" ? "✗" : "…";
            return \`<span class="chip" title="\${esc(tpl?.description ?? d.templateId)}">\${phase} \${esc(lbl)}</span>\`;
          }).join(" ");
      inner += \`<tr><td class="mono"><strong>\${esc(ap.registration)}</strong></td><td>\${ap.model}/\${ap.engineVariant}</td><td class="mono">\${fmtClock(ap.arrivalMinute)}</td><td class="mono">\${fmtClock(ap.scheduledDepartureMinute)}</td><td>\${dcStatus}</td></tr>\`;
    }
    inner += '</tbody></table>';
  }
  inner += '</div>';
  return inner;
}

function renderEconomy(){
  const startBal = game.balance.startingBalance;
  const delta = game.economy.balance - startBal;
  const recent = game.economy.ledger.slice(-25).reverse();
  // Base check totals
  const checkIncome = game.economy.ledger.filter(t => t.type === "maintenanceCheckFee").reduce((s,t)=>s+t.amount, 0);
  const checkPenalty = game.economy.ledger.filter(t => t.type === "maintenanceCheckPenalty").reduce((s,t)=>s+t.amount, 0);
  let h = \`<h2>Economía</h2><div class="econ-grid">
    <div class="card-mini"><div class="lbl">Balance</div><div class="big\${game.economy.balance<0?' neg':''}">\${fmt(game.economy.balance)} €</div></div>
    <div class="card-mini"><div class="lbl">Δ desde inicio</div><div class="big\${delta<0?' neg':''}">\${fmt(delta)} €</div></div>
    <div class="card-mini"><div class="lbl">Base checks (ingresos)</div><div class="big">\${fmt(checkIncome)} €</div></div>
    <div class="card-mini"><div class="lbl">Overrun penalties</div><div class="big\${checkPenalty<0?' neg':''}">\${fmt(checkPenalty)} €</div></div>
    <div class="card-mini"><div class="lbl">Semanas neg.</div><div class="big\${game.economy.negativeStreakWeeks>0?' neg':''}">\${game.economy.negativeStreakWeeks}/2</div></div></div>
    <h3>Últimas 25 transacciones</h3><table><thead><tr><th>Tiempo</th><th>Tipo</th><th>Descripción</th><th>Cantidad</th></tr></thead><tbody>\`;
  for (const t of recent) {
    h += \`<tr><td class="mono">\${fmtClock(t.minute)}</td><td>\${esc(t.type)}</td><td>\${esc(t.description)}</td><td class="mono \${t.amount>0?'pos':'neg'}">\${t.amount>0?'+':''}\${fmt(t.amount)} €</td></tr>\`;
  }
  return h + '</tbody></table>';
}

function renderRepModal(){
  if (!repModalOpen) return null;
  const entries = Object.entries(game.reputation.perAirline).map(([id, val]) => {
    const al = game.airlines.find(a => a.id === id);
    return { id, name: al?.name ?? id, color: al?.color ?? "#888", val };
  });
  entries.sort((a, b) => b.val - a.val);
  const avg = S.getAverageRep(game.reputation);
  let inner = \`<header class="modal-head"><h3>⭐ Reputación por aerolínea</h3><button class="close" id="rep-modal-close">×</button></header>
  <div class="modal-body">
    <div class="big" style="font-family:var(--mono);font-size:2rem;text-align:center;margin:.5rem 0">Media: \${Math.round(avg)}/100</div>
    <p class="muted" style="margin-bottom:.75rem">Las acciones afectan SOLO a la aerolínea del avión implicado. Aerolínea con rep&lt;20 deja de ofrecer contratos. Game over si TODAS las aerolíneas tienen rep ≤ 10.</p>\`;
  for (const e of entries) {
    const tier = e.val >= 70 ? "good" : e.val >= 30 ? "warn" : "bad";
    const fillCls = tier === "good" ? "good" : tier === "warn" ? "warn" : "bad";
    const cls = e.val < S.AIRLINE_OFFER_REP_THRESHOLD ? " style=\\"color:var(--danger)\\"" : "";
    inner += \`<div style="margin:.5rem 0;display:grid;grid-template-columns:8rem 1fr 3rem;gap:.5rem;align-items:center">
      <span\${cls}><span style="display:inline-block;width:8px;height:8px;background:\${e.color};border-radius:50%;margin-right:.4rem"></span>\${esc(e.name)}</span>
      <div class="bar"><div class="fill \${fillCls}" style="width:\${e.val}%"></div></div>
      <span class="mono" style="text-align:right">\${Math.round(e.val)}</span>
    </div>\`;
    if (e.val < S.AIRLINE_OFFER_REP_THRESHOLD) {
      inner += \`<div class="muted" style="margin-left:8.5rem;font-size:.7rem;margin-bottom:.5rem">⚠️ Rep &lt; \${S.AIRLINE_OFFER_REP_THRESHOLD}: no ofrecerá nuevos contratos</div>\`;
    }
  }
  inner += '</div>';
  return inner;
}

function renderFleetDetailModal(){
  if (!detailFleetReg) return null;
  const f = game.fleet.find(x => x.registration === detailFleetReg);
  if (!f) return null;
  const al = game.airlines.find(a => a.id === f.airlineId);
  const aDef = game.checkDefinitions.find(d => d.type === "A" && d.model === f.model);
  const cDef = game.checkDefinitions.find(d => d.type === "C" && d.model === f.model);
  const dDef = game.checkDefinitions.find(d => d.type === "D" && d.model === f.model);

  // Checks histórico/activos
  const checks = game.maintenanceChecks.filter(c => c.registration === f.registration);
  const activeCheck = checks.find(c => c.phase === "Scheduled" || c.phase === "InProgress");
  const completedChecks = checks.filter(c => c.phase === "Completed").sort((a,b) => (b.completedMinute??0) - (a.completedMinute??0));

  // WOs históricas/activas sobre esta matrícula
  const wos = game.workOrders.filter(w => w.airplaneRegistration === f.registration);
  const woActive = wos.filter(w => w.phase !== "Completed" && w.phase !== "Failed");
  const woCompleted = wos.filter(w => w.phase === "Completed").length;
  const woFailed = wos.filter(w => w.phase === "Failed").length;
  const woDeferred = wos.filter(w => w.phase === "Deferred").length;

  // Landings recientes
  const landings = game.airplanes.filter(a => a.registration === f.registration).sort((a,b) => b.arrivalMinute - a.arrivalMinute).slice(0, 5);

  let inner = \`<header class="modal-head"><h3>✈️ \${esc(f.registration)} · \${f.model} / \${f.engineVariant}</h3><button class="close" id="modal-close">×</button></header>
  <div class="modal-body">
    <div class="kvs"><span>Aerolínea: <strong>\${esc(al?.name ?? f.airlineId)}</strong></span><span>Total FH: <strong>\${f.totalFH.toFixed(0)}</strong></span><span>Total cycles: <strong>\${f.totalCycles}</strong></span></div>

    <h4>Estado A/C/D checks</h4>
    <div class="bar-wrap"><span class="bar-lbl" style="width:5rem">A-check</span><div class="bar"><div class="fill \${(aDef?.triggerFH ?? 600) - f.fhSinceLastA <= 50?'warn':'primary'}" style="width:\${Math.min(100,(f.fhSinceLastA/(aDef?.triggerFH ?? 600))*100)}%"></div></div><span class="mono" style="min-width:5rem;text-align:right">\${f.fhSinceLastA.toFixed(0)} / \${aDef?.triggerFH ?? "?"} FH</span></div>
    <div class="bar-wrap"><span class="bar-lbl" style="width:5rem">C-check</span><div class="bar"><div class="fill \${(cDef?.triggerFH ?? 7500) - f.fhSinceLastC <= 200?'warn':'primary'}" style="width:\${Math.min(100,(f.fhSinceLastC/(cDef?.triggerFH ?? 7500))*100)}%"></div></div><span class="mono" style="min-width:5rem;text-align:right">\${f.fhSinceLastC.toFixed(0)} / \${cDef?.triggerFH ?? "?"} FH</span></div>
    <div class="bar-wrap"><span class="bar-lbl" style="width:5rem">D-check</span><div class="bar"><div class="fill primary" style="width:\${Math.min(100,(f.fhSinceLastD/(dDef?.triggerFH ?? 25000))*100)}%"></div></div><span class="mono" style="min-width:5rem;text-align:right">\${f.fhSinceLastD.toFixed(0)} / \${dDef?.triggerFH ?? "?"} FH</span></div>

    \${activeCheck ? \`<div style="margin-top:.5rem"><span class="chip" style="background:var(--warning);color:#fff;border-color:var(--warning)">🛠️ \${activeCheck.type}-check \${activeCheck.phase}\${activeCheck.nightStarted?' 🌙':''}</span></div>\` : ''}

    <h4>Histórico de checks</h4>
    \${completedChecks.length === 0 ? '<p class="muted">Sin checks completados todavía.</p>' :
      '<ul style="margin:.3rem 0 .5rem 1.2rem;font-size:.85rem">' + completedChecks.slice(0, 5).map(c =>
        \`<li>\${c.type}-check · día \${Math.floor((c.completedMinute??0)/S.DAY_MINUTES)+1}\${c.overrunDaysPenalized>0?\` · overrun \${c.overrunDaysPenalized}d\`:''}\${c.nightStarted?' 🌙 night':''}</li>\`
      ).join("") + '</ul>'}

    <h4>Work orders</h4>
    <div class="kvs"><span>Activas: <strong>\${woActive.length}</strong></span><span>Completadas: <strong>\${woCompleted}</strong></span><span>Diferidas: <strong>\${woDeferred}</strong></span><span>Failed: <strong style="\${woFailed>0?'color:var(--danger)':''}">\${woFailed}</strong></span></div>

    <h4>Últimos landings</h4>
    \${landings.length === 0 ? '<p class="muted">Sin aterrizajes recientes.</p>' :
      '<ul style="margin:.3rem 0 .5rem 1.2rem;font-size:.85rem">' + landings.map(a =>
        \`<li>\${fmtClock(a.arrivalMinute)} · stand \${a.standId || 'ramp'}\${a.overnight?' 🌙 overnight':''} · \${a.flightHoursThisLeg.toFixed(1)}h leg</li>\`
      ).join("") + '</ul>'}
  </div>\`;
  return inner;
}

function renderMechanicDetailModal(){
  if (!detailMechId) return null;
  const m = game.mechanics.find(x => x.id === detailMechId);
  if (!m) return null;
  const ratings = m.typeRatings.map(r => \`\${r.model}/\${r.engineVariant}/\${r.category}\`).join(", ") || "—";
  const moralColor = (m.moral ?? 70) >= 70 ? "var(--success)" : (m.moral ?? 70) >= 40 ? "var(--warning)" : "var(--danger)";
  const effSalary = S.effectiveWeeklySalary(m);
  const yearsWorked = ((game.clock.minute - (m.hiredAtMinute ?? 0)) / (52 * 7 * S.DAY_MINUTES)).toFixed(2);
  const severance = S.severanceFor(m, game.clock.minute);

  // WOs activas asignadas
  const woActive = m.assignedWoInstanceId
    ? game.workOrders.find(w => w.instanceId === m.assignedWoInstanceId)
    : null;

  let inner = \`<header class="modal-head"><h3>⚙️ \${esc(m.name)} · \${m.id}\${m.isLeadForeman?' · 🎯 TMA jefe':''}</h3><button class="close" id="modal-close">×</button></header>
  <div class="modal-body">
    <div class="kvs">
      <span>Base: <strong>\${m.base ?? "Helper"}</strong></span>
      <span>Eficiencia: <strong>\${m.efficiency.toFixed(2)}</strong></span>
      <span>Turno: <strong>\${m.shift ?? "morning"}</strong></span>
      <span>Estado: <strong>\${m.state}</strong></span>
    </div>
    <div class="kvs">
      <span>Moral: <strong style="color:\${moralColor}">\${Math.round(m.moral ?? 70)}/100</strong></span>
      <span>Salario semanal: <strong>\${fmt(effSalary)} €\${m.shift==="night"?' [night]':''}</strong></span>
      <span>Antigüedad: <strong>\${yearsWorked} años</strong></span>
      <span>Severance: <strong>\${fmt(severance)} €</strong></span>
    </div>

    <h4>Type ratings</h4>
    <p class="mono" style="font-size:.85rem">\${esc(ratings)}</p>

    \${woActive ? \`<h4>Asignación actual</h4><p>WO \${woActive.instanceId} · \${esc(woActive.airplaneRegistration)} · phase \${woActive.phase}</p>\` : ''}
    \${m.assignedCheckInstanceId ? \`<h4>Asignación actual</h4><p>Check \${m.assignedCheckInstanceId}</p>\` : ''}

    \${m.trainingMinutes !== undefined && m.base === null ? \`<h4>Training pasivo</h4><p>\${(m.trainingMinutes / S.DAY_MINUTES).toFixed(1)} / 90 días-Working hacia B1 junior</p>\` : ''}
    \${m.activeTrainingUntilMinute && m.activeTrainingUntilMinute > game.clock.minute ? \`<h4>Training activo</h4><p>Termina en \${Math.ceil((m.activeTrainingUntilMinute - game.clock.minute) / S.DAY_MINUTES)} días</p>\` : ''}
  </div>\`;
  return inner;
}

function renderCheckDetailModal(){
  if (!detailCheckId) return null;
  const c = game.maintenanceChecks.find(x => x.instanceId === detailCheckId);
  if (!c) return null;
  const fa = game.fleet.find(f => f.registration === c.registration);
  const ap = game.airplanes.find(a => a.registration === c.registration);
  const team = c.assignedMechanicIds.map(mid => {
    const m = game.mechanics.find(mm => mm.id === mid);
    return m ? \`\${esc(m.name)} (\${m.id})\` : mid;
  }).join(", ") || "—";
  const workMin = c.manMinutesAccumulated ?? 0;
  const workTarget = c.manDaysIdeal * S.DAY_MINUTES;
  const workPct = workTarget > 0 ? Math.min(100, (workMin / workTarget) * 100) : 0;
  const elapsed = c.startedMinute !== undefined ? (c.completedMinute ?? game.clock.minute) - c.startedMinute : 0;
  const parkingTarget = c.parkingDays * S.DAY_MINUTES;
  const parkingPct = parkingTarget > 0 ? Math.min(100, (elapsed / parkingTarget) * 100) : 0;
  const overrunDays = c.overrunDaysPenalized ?? 0;
  const penalty = overrunDays * (c.type === "A" ? 1500 : c.type === "C" ? 5000 : 15000);
  const netFee = c.baseFee - penalty;

  let inner = \`<header class="modal-head"><h3>🛠️ \${c.type}-check · \${esc(c.registration)} \${c.nightStarted?'🌙':''}</h3><button class="close" id="modal-close">×</button></header>
  <div class="modal-body">
    <div class="kvs">
      <span>ID: <strong class="mono">\${c.instanceId}</strong></span>
      <span>Modelo: <strong>\${fa?.model ?? "?"}/\${fa?.engineVariant ?? "?"}</strong></span>
      <span>Phase: <strong>\${c.phase}</strong></span>
      \${c.nightStarted ? '<span>Inicio nocturno: <strong>🌙 sí</strong></span>' : ''}
      \${c.onPlatform ? '<span style="color:var(--warning)">En plataforma: <strong>⚠️ sí · eff 0.7×</strong></span>' : ''}
    </div>

    <h4>Económico</h4>
    <div class="kvs">
      <span>Fee base: <strong>+\${fmt(c.baseFee)} €</strong></span>
      \${overrunDays > 0 ? \`<span style="color:var(--danger)">Overrun \${overrunDays}d: <strong>-\${fmt(penalty)} €</strong></span>\` : ''}
      <span>Neto: <strong style="color:\${netFee>0?'var(--success)':'var(--danger)'}">\${netFee>0?'+':''}\${fmt(netFee)} €</strong></span>
      <span>Penalty/día: <strong>\${c.type==='A'?'1.5k':c.type==='C'?'5k':'15k'} €/día</strong></span>
    </div>

    <h4>Trabajo</h4>
    <div class="bar-wrap"><span class="bar-lbl">Man-minutes</span><div class="bar"><div class="fill base" style="width:\${workPct}%"></div></div><span class="mono" style="min-width:8rem;text-align:right">\${Math.round(workMin)} / \${workTarget} (\${workPct.toFixed(0)}%)</span></div>
    <div class="bar-wrap"><span class="bar-lbl\${overrunDays>0?' bad':''}">Parking \${c.parkingDays}d</span><div class="bar"><div class="fill \${overrunDays>0?'bad':'warn'}" style="width:\${parkingPct}%"></div></div><span class="mono" style="min-width:8rem;text-align:right">\${Math.round(elapsed/S.DAY_MINUTES*10)/10}d / \${c.parkingDays}d (\${parkingPct.toFixed(0)}%)</span></div>

    <h4>Equipo asignado (\${c.assignedMechanicIds.length})</h4>
    <p>\${team}</p>

    <h4>Tiempos</h4>
    <div class="kvs">
      <span>Programado: <strong class="mono">\${fmtClock(c.scheduledMinute)}</strong></span>
      \${c.startedMinute !== undefined ? \`<span>Iniciado: <strong class="mono">\${fmtClock(c.startedMinute)}</strong></span>\` : ''}
      \${c.completedMinute !== undefined ? \`<span>Completado: <strong class="mono">\${fmtClock(c.completedMinute)}</strong></span>\` : ''}
      <span>Stand: <strong>\${c.standId || "—"}</strong></span>
    </div>
  </div>\`;
  return inner;
}

function renderContractDetailModal(){
  if (!detailContractId) return null;
  const c = game.contracts.find(x => x.id === detailContractId);
  if (!c) return null;
  const al = game.airlines.find(a => a.id === c.airlineId);
  const repAirline = game.reputation.perAirline[c.airlineId] ?? 0;
  // WOs sobre aviones de esta aerolínea
  const fleetAl = game.fleet.filter(f => f.airlineId === c.airlineId);
  const regs = new Set(fleetAl.map(f => f.registration));
  const allWos = game.workOrders.filter(w => regs.has(w.airplaneRegistration));
  const woStats = {
    active: allWos.filter(w => w.phase !== "Completed" && w.phase !== "Failed").length,
    completed: allWos.filter(w => w.phase === "Completed").length,
    deferred: allWos.filter(w => w.phase === "Deferred").length,
    failed: allWos.filter(w => w.phase === "Failed").length,
  };
  // Ingresos por WO de este contrato (aproximado: WO completadas × payment medio)
  const completedHere = allWos.filter(w => w.phase === "Completed").length;
  const estIncomePerWo = c.paymentPerWOMinute * 35; // 35min avg
  const estTotal = completedHere * estIncomePerWo + (c.status === "active" ? c.baseFeePerWeek : 0);

  const tierBadge = c.tier === "deluxe" ? '<span class="tier-badge tier-deluxe">Deluxe ⭐⭐</span>'
    : c.tier === "premium" ? '<span class="tier-badge tier-premium">Premium ⭐</span>'
    : '<span class="tier-badge tier-standard">Standard</span>';

  const statusBadge = c.status === "active" ? '<span style="color:var(--success)">✓ Activo</span>'
    : c.status === "offered" ? '<span style="color:var(--warning)">📨 Ofrecido</span>'
    : c.status === "cancelled" ? '<span style="color:var(--danger)">🚫 Cancelado</span>'
    : '<span class="muted">⏱️ Expirado</span>';

  let inner = \`<header class="modal-head"><h3>📋 \${esc(al?.name ?? c.airlineId)} · \${c.id}</h3><button class="close" id="modal-close">×</button></header>
  <div class="modal-body">
    <div class="kvs">
      <span>Tier: \${tierBadge}</span>
      <span>Estado: <strong>\${statusBadge}</strong></span>
      <span>Reputación con \${esc(al?.name ?? "—")}: <strong style="color:\${repAirline>=70?'var(--success)':repAirline>=40?'var(--warning)':'var(--danger)'}">\${Math.round(repAirline)}/100</strong></span>
    </div>

    <h4>Términos económicos</h4>
    <div class="kvs">
      <span>Cuota base semanal: <strong>+\${fmt(c.baseFeePerWeek)} €</strong></span>
      <span>€/min WO: <strong>\${c.paymentPerWOMinute}</strong></span>
      <span>Penalty SLA: <strong>\${c.penaltyPerLateMinute} €/min</strong> \${c.tier==='deluxe'?'<span class="muted">(×1.5 deluxe)</span>':''}</span>
      <span>Rep. mín. requerida: <strong>\${c.minReputation}</strong></span>
      <span>Aviones/día esperados: <strong>\${c.expectedLandingsPerDay}</strong></span>
    </div>

    <h4>Flota basada en este aeropuerto (\${fleetAl.length})</h4>
    <p class="muted" style="font-size:.85rem">\${fleetAl.map(f => esc(f.registration) + " (" + f.model + ")").join(" · ") || "Sin flota sembrada"}</p>

    <h4>WOs históricas de esta flota</h4>
    <div class="kvs">
      <span>Activas: <strong>\${woStats.active}</strong></span>
      <span>Completadas: <strong style="color:var(--success)">\${woStats.completed}</strong></span>
      <span>Diferidas: <strong style="color:var(--warning)">\${woStats.deferred}</strong></span>
      <span>Failed: <strong style="\${woStats.failed>0?'color:var(--danger)':''}">\${woStats.failed}</strong></span>
    </div>

    \${c.status === "active" ? \`<h4>Estimación ingresos hasta ahora</h4>
    <p class="mono">~\${fmt(Math.round(estTotal))} €</p>
    <p class="muted" style="font-size:.75rem">Aproximado: \${completedHere} WOs × \${estIncomePerWo} €/WO (avg) + baseFee semanal. No incluye penalties.</p>\` : ''}

    \${c.expiresAtMinute !== undefined && c.status === "offered" ? \`<p class="muted">Expira en: \${Math.max(0, Math.ceil((c.expiresAtMinute - game.clock.minute) / 60))}h</p>\` : ''}
  </div>\`;
  return inner;
}

function renderComplianceModal(){
  if (!complianceModalOpen || !game.compliance) return null;
  const c = game.compliance;
  const tier = S.complianceTier(c.score);
  const nextDays = Math.max(0, Math.ceil((c.nextAuditMinute - game.clock.minute) / S.DAY_MINUTES));
  const lastTxt = c.lastAuditMinute !== null
    ? \`día \${Math.floor(c.lastAuditMinute / S.DAY_MINUTES) + 1}\`
    : "ninguna todavía";
  let findings = c.openFindings.length === 0
    ? '<p class="muted">Sin findings de la última auditoría.</p>'
    : '<ul style="margin:.5rem 0 .5rem 1.2rem">' + c.openFindings.map(f => \`<li>\${esc(f)}</li>\`).join("") + '</ul>';
  return \`<header class="modal-head"><h3>🛡️ Compliance Part-145</h3><button class="close" id="compliance-modal-close">×</button></header>
  <div class="modal-body">
    <div class="big \${tier==='good'?'pos':tier==='bad'?'neg':''}" style="font-family:var(--mono);font-size:2.5rem;text-align:center;margin:.5rem 0">\${c.score}/100</div>
    <div class="kvs" style="justify-content:center;margin-bottom:1rem">
      <span>Última auditoría: <strong>\${lastTxt}</strong></span>
      <span>Próxima en: <strong>\${nextDays} días</strong></span>
      <span>Total auditorías: <strong>\${c.totalAudits}</strong></span>
    </div>
    <h4>Findings de la última auditoría</h4>
    \${findings}
    <h4>Tramos</h4>
    <ul style="margin:.5rem 0 .5rem 1.2rem;font-size:.85rem">
      <li><strong style="color:var(--success)">≥70</strong>: operación limpia, sin consecuencias</li>
      <li><strong style="color:var(--warning)">30-69</strong>: warning sin multa</li>
      <li><strong style="color:var(--danger)">&lt;30</strong>: multa 50.000 € + suspensión de 1 contrato</li>
      <li><strong style="color:var(--danger)">&lt;10</strong>: GAME OVER — certificación Part-145 revocada</li>
    </ul>
  </div>\`;
}

function renderModal(){
  const back = document.getElementById("modal-back");
  if (repModalOpen) {
    const html = renderRepModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // Compliance modal (Bloque J) — tiene prioridad si abierto
  if (complianceModalOpen) {
    const html = renderComplianceModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // F5B-ε: modal detalle avión
  if (detailFleetReg) {
    const html = renderFleetDetailModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // F5B-ε: modal detalle mecánico
  if (detailMechId) {
    const html = renderMechanicDetailModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // F5C: modal detalle check A/C/D
  if (detailCheckId) {
    const html = renderCheckDetailModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // F5C: modal detalle contrato
  if (detailContractId) {
    const html = renderContractDetailModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // Pivot línea pura · P4: modal pernocta
  if (overnightModalOpen) {
    const html = renderOvernightModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  if (!selectedWoId) { back.classList.remove("open"); lastModalHtml = ""; return; }
  const wo = game.workOrders.find(w => w.instanceId === selectedWoId);
  if (!wo) { back.classList.remove("open"); return; }
  const tpl = game.templates.find(t => t.id === wo.templateId);
  const ap = airplaneByInstance(wo.airplaneInstanceId);
  if (!tpl || !ap) { back.classList.remove("open"); return; }

  // F5C fix: mostrar TODOS los mecánicos con rating válido (no solo Idle). Los no-Idle aparecen
  // con su estado para que el jugador entienda por qué no son asignables. assignMechanicsToWo
  // rechazará el assign si el state no es Idle — feedback claro.
  const certCandidates = (wo.assignedMechanicIds.length === 0) ? game.mechanics.filter(m =>
    !m.isLeadForeman &&
    m.base === tpl.requiredCategory &&
    m.typeRatings.some(r => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === tpl.requiredCategory)
  ) : [];
  // Ordenar: Idle primero, luego OffShift, luego Working/ToPlane/Returning/Training.
  const stateOrder = { "Idle": 0, "OffShift": 1, "ToPlane": 2, "Working": 2, "Returning": 3, "Training": 4 };
  certCandidates.sort((a, b) => (stateOrder[a.state] ?? 9) - (stateOrder[b.state] ?? 9));
  const certs = certCandidates;
  const helps = (wo.assignedMechanicIds.length === 0)
    ? game.mechanics.filter(m => !m.isLeadForeman && m.state === "Idle" && m.id !== manualCertId)
    : [];

  const mc = melCat(tpl);
  const melLabel = mc ? \`MEL \${mc} (\${S.MEL_DEFERRAL_DAYS[mc]}d)\` : 'NO diferible';
  let inner = \`<header class="modal-head"><h3>\${wo.instanceId} — \${esc(tpl.description)}</h3><button class="close" id="modal-close">×</button></header><div class="modal-body">
    <div class="kvs"><span>ATA: <strong>\${tpl.ata}</strong></span><span>Categoría requerida: <strong>\${tpl.requiredCategory}</strong></span><span>Duración: <strong>\${tpl.durationMinutes} min</strong></span><span>Severidad: <strong>\${tpl.severity}</strong></span><span>SLA: <strong>\${wo.slaMinute - game.clock.minute}m restantes</strong></span><span>Avión: <strong>\${esc(ap.registration)} (\${ap.model}/\${ap.engineVariant})</strong></span><span>MEL: <strong>\${melLabel}</strong></span></div>\`;
  if (tpl.isAOG) inner += '<div class="alert aog-alert">🛑 AOG · penalty ×5 · no diferible</div>';

  if (wo.assignedMechanicIds.length > 0) {
    inner += '<h4>Ya asignados:</h4><ul>';
    wo.assignedMechanicIds.forEach((id, i) => {
      const m = game.mechanics.find(mm => mm.id === id);
      inner += \`<li>\${i===0?"🪪 Certifier":"🤝 Helper"}: \${esc(m?.name??id)}</li>\`;
    });
    inner += '</ul>';
    // Permitir diferir aunque ya esté asignada (libera mecánicos a Idle).
    const deferTitle = mc ? \`Difiere la WO \${S.MEL_DEFERRAL_DAYS[mc]} días (libera mecánicos · vence con -10k € + -5 rep)\` : 'No diferible: AOG / Critical / sin MEL';
    inner += \`<div style="margin-top:1rem"><button id="btn-defer"\${!mc?' disabled':''} title="\${deferTitle}">📋 Diferir (MEL \${mc ?? '—'})</button></div>\`;
  } else {
    inner += '<h4>Asignar mecánicos</h4><label>Certifier (con type rating válido):</label><select id="sel-cert"><option value="">— elegir —</option>';
    for (const m of certs) {
      const available = m.state === "Idle";
      const stateLabel = available ? "Idle ✓" : \`\${m.state}\${m.shift && m.state === "OffShift" ? \` (turno \${m.shift})\` : ''}\`;
      // F5C fix: NO disabled — el jugador puede elegir cualquiera. Si no es Idle, la UI ofrece acción contextual debajo (cambiar turno + asignar).
      inner += \`<option value="\${m.id}"\${manualCertId===m.id?' selected':''}>\${esc(m.name)} · \${m.base} · eff \${m.efficiency} · \${stateLabel}</option>\`;
    }
    inner += '</select>';
    const certsIdle = certs.filter(m => m.state === "Idle").length;
    if (certs.length === 0) {
      inner += '<p class="muted" style="color:var(--danger)">Ningún mecánico tiene rating compatible. Contrata B1/B2 con type rating de este modelo.</p>';
    } else if (certsIdle === 0) {
      inner += \`<p class="muted" style="color:var(--warning)">\${certs.length} mecánico\${certs.length>1?'s':''} con rating válido, pero todos ocupados u off-shift. Espera al cambio de turno o difiere si es MEL.</p>\`;
    }
    inner += '<label>Helpers (máx 2):</label><div class="helper-list">';
    for (const h of helps) {
      const checked = manualHelperIds.includes(h.id);
      const disabled = !checked && manualHelperIds.length >= 2;
      inner += \`<label class="helper-item"><input type="checkbox" data-helper="\${h.id}"\${checked?' checked':''}\${disabled?' disabled':''}> \${esc(h.name)} · \${h.base ?? "Helper"} · eff \${h.efficiency}</label>\`;
    }
    const deferTitle = mc ? \`Difiere la WO \${S.MEL_DEFERRAL_DAYS[mc]} días (vence con penalty -10k € + -5 rep)\` : 'No diferible: AOG / Critical / sin categoría MEL';
    // F5C fix: lógica contextual según state del certifier seleccionado.
    const selectedCert = manualCertId ? game.mechanics.find(m => m.id === manualCertId) : null;
    inner += '</div>';
    // Detectar turno actual ingame
    const minOfDay = game.clock.minute % S.DAY_MINUTES;
    const hour = Math.floor(minOfDay / 60);
    const currentShift = (hour >= 6 && hour < 14) ? "morning" : (hour >= 14 && hour < 22) ? "afternoon" : "night";

    let primaryButton = '';
    let hintMsg = '';
    if (!selectedCert) {
      hintMsg = '⚠️ Elige un <strong>certifier</strong> del dropdown de arriba (los helpers son opcionales)';
      primaryButton = \`<button class="primary" id="btn-assign" disabled>Asignar</button>\`;
    } else if (selectedCert.state === "Idle") {
      primaryButton = \`<button class="primary" id="btn-assign">Asignar</button>\`;
    } else if (selectedCert.state === "OffShift") {
      hintMsg = \`💡 <strong>\${esc(selectedCert.name)}</strong> está OffShift (turno <strong>\${selectedCert.shift}</strong>, ahora <strong>\${currentShift}</strong>). Puedes pedirle <strong>hora extra</strong>: cobra overtime al terminar (~½ día extra), moral -5 inmediata, vuelve a su turno original. Para cambio permanente usa el dropdown en panel Mecánicos.\`;
      primaryButton = \`<button class="primary" id="btn-shift-and-assign">⏱️ Hora extra y asignar</button>\`;
    } else if (selectedCert.state === "Working" || selectedCert.state === "ToPlane") {
      hintMsg = \`⚠️ <strong>\${esc(selectedCert.name)}</strong> está ocupado en otra WO/check. Espera a que termine o elige otro.\`;
      primaryButton = \`<button class="primary" id="btn-assign" disabled>Asignar</button>\`;
    } else if (selectedCert.state === "Returning") {
      hintMsg = \`⏳ <strong>\${esc(selectedCert.name)}</strong> está volviendo de un trabajo. Estará Idle en breve.\`;
      primaryButton = \`<button class="primary" id="btn-assign" disabled>Asignar</button>\`;
    } else if (selectedCert.state === "Training") {
      hintMsg = \`📚 <strong>\${esc(selectedCert.name)}</strong> está en training activo. No disponible hasta que termine.\`;
      primaryButton = \`<button class="primary" id="btn-assign" disabled>Asignar</button>\`;
    } else {
      hintMsg = \`⚠️ <strong>\${esc(selectedCert.name)}</strong> está en estado \${selectedCert.state}, no asignable.\`;
      primaryButton = \`<button class="primary" id="btn-assign" disabled>Asignar</button>\`;
    }

    if (hintMsg) inner += \`<p class="muted" style="margin:.5rem 0;color:var(--warning);font-size:.85rem">\${hintMsg}</p>\`;
    inner += \`<div style="margin-top:.5rem;display:flex;gap:.5rem">\${primaryButton}<button id="btn-defer"\${!mc?' disabled':''} title="\${deferTitle}">📋 Diferir (MEL \${mc ?? '—'})</button></div>\`;
  }
  inner += '</div>';
  if (inner !== lastModalHtml) {
    document.getElementById("modal-content").innerHTML = inner;
    lastModalHtml = inner;
  }
  back.classList.add("open");
}

// Fase 5B-γ: anima un elemento mostrando un número entre origen y destino en N ms.
// Ease-out cubic. Si la diferencia es menos de 2 unidades, asigna directo (evita jitter).
const _activeTweens = new WeakMap();
function tweenNumber(el, target, duration = 400, formatter = (v) => v.toLocaleString("es-ES")) {
  const current = parseInt((el.dataset.tweenVal ?? "").replace(/[^0-9-]/g, ""), 10);
  const from = Number.isFinite(current) ? current : target;
  if (Math.abs(target - from) < 2) {
    el.textContent = formatter(target);
    el.dataset.tweenVal = String(target);
    return;
  }
  // Cancelar tween previo si hubo
  const prev = _activeTweens.get(el);
  if (prev) cancelAnimationFrame(prev);
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = Math.round(from + (target - from) * eased);
    el.textContent = formatter(v);
    if (t < 1) {
      const id = requestAnimationFrame(step);
      _activeTweens.set(el, id);
    } else {
      el.textContent = formatter(target);
      el.dataset.tweenVal = String(target);
      _activeTweens.delete(el);
    }
  }
  el.dataset.tweenVal = String(from);
  _activeTweens.set(el, requestAnimationFrame(step));
}

function render(){
  document.getElementById("clock").textContent = fmtClock(game.clock.minute);
  document.getElementById("week").textContent = "Semana " + S.getWeek(game.clock.minute);
  const balEl = document.getElementById("bal");
  // Animación de balance: tween si cambia. Flash en KPI parent si cambia grande.
  tweenNumber(balEl, game.economy.balance, 400, (v) => v.toLocaleString("es-ES") + " €");
  balEl.className = game.economy.balance < 0 ? "neg" : "";
  tweenNumber(document.getElementById("rep"), Math.round(S.getAverageRep(game.reputation)), 350);
  // Fase 5A V6: day/night badge según hora ingame.
  const hour = S.getHour(game.clock.minute);
  const isNight = hour < 6 || hour >= 22;
  const dnEl = document.getElementById("daynight");
  if (dnEl) {
    dnEl.textContent = isNight ? "🌙" : "☀️";
    dnEl.classList.toggle("night", isNight);
  }
  // Compliance badge (Bloque J)
  if (game.compliance) {
    document.getElementById("compliance-score").textContent = game.compliance.score;
    const tier = S.complianceTier(game.compliance.score);
    const kpi = document.getElementById("kpi-compliance");
    kpi.classList.remove("good", "warn", "bad");
    kpi.classList.add(tier);
  }

  document.querySelectorAll(".speeds button").forEach(b => {
    b.classList.toggle("active", parseInt(b.dataset.speed) === game.clock.speed);
  });

  // Badge tab Hangar: muestra WOs SIN ASIGNAR (necesitan atención). En rojo pulsante si > 0.
  const unassignedWos = activeWos().filter(w => w.assignedMechanicIds.length === 0 && w.phase === "ToPlane");
  const badgeWo = document.getElementById("badge-wo");
  badgeWo.textContent = unassignedWos.length;
  badgeWo.classList.toggle("alert", unassignedWos.length > 0);
  // Botón auto-pausa refleja estado
  const btnAP = document.getElementById("btn-autopause");
  if (btnAP) {
    btnAP.classList.toggle("off", !game.autoPauseEnabled);
    btnAP.title = game.autoPauseEnabled
      ? "Auto-pausa: ON (eventos AOG/Critical pausan el reloj). Click para desactivar."
      : "Auto-pausa: OFF. Click para activar.";
  }
  document.getElementById("badge-offers").textContent = liveOffers().length;
  document.getElementById("badge-candidates").textContent = (game.candidates ?? []).length;
  // Pivot línea pura · P3: badge schedule = movimientos restantes del día actual.
  {
    const minOfDay = currentMinOfDay();
    const remainingFlights = S.getFlightsForGameDay(currentGameDay()).filter(f => f.scheduledMinute >= minOfDay).length;
    const badgeSched = document.getElementById("badge-schedule");
    if (badgeSched) badgeSched.textContent = remainingFlights;
  }
  // Pivot línea pura · P4: HUD overnight badge a partir de las 20:00.
  {
    const obadge = document.getElementById("overnight-badge");
    if (obadge) {
      if (shouldShowOvernightBadge()) {
        const n = overnightAirplanes().length;
        obadge.innerHTML = \`🌙 Pernocta: <strong>\${n}</strong>\`;
        obadge.style.display = "";
      } else {
        obadge.style.display = "none";
      }
    }
  }

  document.querySelectorAll(".side > button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === activeTab);
  });

  // Panel: solo re-renderiza si (a) está pausado, (b) el modal está abierto (entonces
  // mantenemos el panel estable mientras el jugador interactúa), o (c) el HTML cambia respecto
  // a la última vez. Esto evita destruir DOM entre mousedown y mouseup del usuario.
  // Además, lo throttleamos a una vez cada 250 ms cuando el reloj corre, para dar margen al click.
  const nowMs = Date.now();
  const panelLocked = selectedWoId !== null; // modal abierto = no tocar panel debajo
  const throttleOk = game.clock.speed === 0 || (nowMs - lastPanelRenderMs) >= 250;
  // Fase 5D · P-α / pivot línea pura: si estamos en tab Mapa Y ya hay canvas montado, NO
  // regeneramos el HTML del panel — el canvas vive dentro de #pixi-host y un innerHTML lo
  // destruiría. Las actualizaciones del mapa se hacen vía syncMapRender() al final del tick.
  const inMapWithCanvas =
    activeTab === "map" &&
    !game.gameOver.isOver && document.getElementById("pixi-host") !== null;
  if (!panelLocked && throttleOk && !inMapWithCanvas) {
    let html;
    if (game.gameOver.isOver) {
      const reasonTxt = game.gameOver.reason === "bankruptcy" ? "Bancarrota"
        : game.gameOver.reason === "reputation" ? "Reputación cero"
        : game.gameOver.reason === "compliance" ? "Certificación Part-145 revocada"
        : "Fin de partida";
      html = \`<div class="game-over"><h1>🛑 GAME OVER</h1><p>\${reasonTxt}</p></div>\`;
    } else if (activeTab === "map")       html = renderMap();
    else if (activeTab === "operations")  html = renderOperations();
    else if (activeTab === "schedule")    html = renderSchedule();
    else if (activeTab === "mechanics")  html = renderMechanics();
    else if (activeTab === "contracts")  html = renderContracts();
    else if (activeTab === "market")     html = renderMarket();
    else if (activeTab === "construction") html = renderConstruction();
    else if (activeTab === "dashboard")  html = renderDashboard();
    else                                 html = renderEconomy();
    if (html !== lastPanelHtml) {
      document.getElementById("panel-content").innerHTML = html;
      lastPanelHtml = html;
    }
    lastPanelRenderMs = nowMs;
  }
  syncMapRender();

  // Notifs: misma estrategia (memoization + throttle ligero).
  const notifs = game.notifications.slice(-12).reverse();
  const notifsHtml = notifs.length === 0
    ? '<p class="muted">—</p>'
    : notifs.map(n => \`<div class="notif \${n.type}"><span class="t">\${fmtClock(n.minute)}</span><span>\${esc(n.text)}</span></div>\`).join("");
  if (notifsHtml !== lastNotifsHtml) {
    document.getElementById("notif-list").innerHTML = notifsHtml;
    lastNotifsHtml = notifsHtml;
  }

  renderModal();

  const si = document.getElementById("save-indicator");
  if (si) {
    if (saveIndicator === "saved")       si.textContent = "✓ Guardado";
    else if (saveIndicator === "loaded") si.textContent = "✓ Cargado";
    else                                  si.textContent = "";
  }
  const btnLoad = document.getElementById("btn-load");
  if (btnLoad) btnLoad.disabled = !hasSavedSlot;
}

document.body.addEventListener("click", (e) => {
  if (e.target.id === "btn-save") { doSave(); return; }
  if (e.target.id === "btn-load") { doLoad(); return; }
  if (e.target.id === "btn-new")  { doNewGame(); return; }
  if (e.target.id === "btn-age-fleet") { ageFleet(); return; }
  if (e.target.id === "btn-autopause") { game.autoPauseEnabled = !game.autoPauseEnabled; render(); return; }
  if (e.target.closest("#kpi-compliance")) { complianceModalOpen = true; invalidateModalCache(); render(); return; }
  if (e.target.id === "compliance-modal-close") { complianceModalOpen = false; invalidateModalCache(); render(); return; }
  if (e.target.closest("#kpi-rep")) { repModalOpen = true; invalidateModalCache(); render(); return; }
  if (e.target.id === "rep-modal-close") { repModalOpen = false; invalidateModalCache(); render(); return; }
  // Pivot línea pura · P4: badge pernocta abre modal
  if (e.target.closest("#overnight-badge")) { overnightModalOpen = true; invalidateModalCache(); render(); return; }
  if (e.target.id === "overnight-modal-close") { overnightModalOpen = false; invalidateModalCache(); render(); return; }
  // Pivot línea pura · P3: filtro panel schedule
  const schedFilter = e.target.closest("[data-schedule-filter]");
  if (schedFilter) { scheduleFilter = schedFilter.dataset.scheduleFilter; invalidatePanelCache(); render(); return; }
  // Event Tracking · filtro Open / All
  const evFilter = e.target.closest("[data-event-filter]");
  if (evFilter) { eventFilter = evFilter.dataset.eventFilter; invalidatePanelCache(); render(); return; }
  const speedBtn = e.target.closest(".speeds button");
  if (speedBtn) { S.setGameSpeed(game, parseInt(speedBtn.dataset.speed)); render(); return; }
  const subBtn = e.target.closest(".subtabs button");
  if (subBtn) { opsSubTab = subBtn.dataset.subtab; invalidatePanelCache(); render(); return; }
  const tabBtn = e.target.closest(".side > button");
  if (tabBtn) { activeTab = tabBtn.dataset.tab; invalidatePanelCache(); render(); return; }
  const woCard = e.target.closest(".wo-card:not(.base)");
  if (woCard && woCard.dataset.wo) { selectedWoId = woCard.dataset.wo; manualCertId = ""; manualHelperIds = []; render(); return; }
  // F5B-ε: click en fleet-card abre detalle avión
  const fleetCard = e.target.closest("[data-fleet-reg]");
  if (fleetCard) { detailFleetReg = fleetCard.dataset.fleetReg; invalidateModalCache(); render(); return; }
  // F5B-ε: click en row de mecánico (data-mech-row) abre detalle
  const mechRow = e.target.closest("[data-mech-id]");
  if (mechRow && !e.target.closest("button") && !e.target.closest("select")) {
    detailMechId = mechRow.dataset.mechId;
    invalidateModalCache();
    render();
    return;
  }
  // F5C: click en check card o row del histórico
  const checkEl = e.target.closest("[data-check-id]");
  if (checkEl && !e.target.closest("button")) {
    detailCheckId = checkEl.dataset.checkId;
    invalidateModalCache();
    render();
    return;
  }
  // F5C: click en contract-card (debe ir DESPUÉS de los handlers de botones Accept/Reject)
  const contractCard = e.target.closest("[data-contract-id]");
  if (contractCard && !e.target.closest("button") && !e.target.dataset.accept && !e.target.dataset.reject) {
    detailContractId = contractCard.dataset.contractId;
    invalidateModalCache();
    render();
    return;
  }
  if (e.target.id === "modal-close" || (e.target.classList && e.target.classList.contains("modal-back"))) {
    selectedWoId = null;
    complianceModalOpen = false;
    repModalOpen = false;
    detailFleetReg = null;
    detailMechId = null;
    detailCheckId = null;
    detailContractId = null;
    overnightModalOpen = false;
    invalidateModalCache();
    render();
    return;
  }
  if (e.target.id === "btn-assign" && selectedWoId && manualCertId) {
    const r = S.assignMechanicsManually(game, selectedWoId, manualCertId, manualHelperIds);
    if (r.ok) { selectedWoId = null; render(); }
    else alert("No se puede asignar: " + (r.error ?? "razón desconocida"));
    return;
  }
  // F5C pulido: hora extra. El cert hace este trabajo fuera de su turno; cobra overtime al volver
  // a Idle y se le restaura el turno original. Moral -5 inmediata por el cambio forzado.
  if (e.target.id === "btn-shift-and-assign" && selectedWoId && manualCertId) {
    const minOfDay = game.clock.minute % S.DAY_MINUTES;
    const hour = Math.floor(minOfDay / 60);
    const targetShift = (hour >= 6 && hour < 14) ? "morning" : (hour >= 14 && hour < 22) ? "afternoon" : "night";
    const mech = game.mechanics.find(m => m.id === manualCertId);
    if (!mech) return;
    // Guardar shift original para restaurar al volver a Idle. No machacar si ya hay overtime previo.
    if (!mech.overtimeOriginalShift) {
      mech.overtimeOriginalShift = mech.shift ?? "morning";
    }
    mech.shift = targetShift;
    // Forzar a Idle (estaba OffShift fuera de su turno)
    if (mech.state === "OffShift") mech.state = "Idle";
    // Moral -5 inmediata
    mech.moral = Math.max(0, (mech.moral ?? 70) - 5);
    const r = S.assignMechanicsManually(game, selectedWoId, manualCertId, manualHelperIds);
    if (r.ok) { selectedWoId = null; render(); }
    else alert("No se pudo asignar tras hora extra: " + (r.error ?? ""));
    return;
  }
  if (e.target.id === "btn-build") {
    const r = S.startBuild(game);
    if (!r.ok) alert("No se puede construir: " + (r.error ?? ""));
    invalidatePanelCache();
    render();
    return;
  }
  if (e.target.id === "btn-defer" && selectedWoId) {
    const r = S.deferWoManually(game, selectedWoId);
    if (r.ok) { selectedWoId = null; render(); }
    else alert("No se puede diferir: " + (r.error ?? "razón desconocida"));
    return;
  }
  if (e.target.dataset.undeferWo) {
    // Bloque R: "Reparar ya" sobre deferral activo. Vuelve a ToPlane sin equipo, jugador re-asigna.
    const r = S.unDeferWoManually(game, e.target.dataset.undeferWo);
    if (r.ok) { invalidatePanelCache(); render(); }
    else alert("No se puede reactivar: " + (r.error ?? "razón desconocida"));
    return;
  }
  if (e.target.dataset.accept) { S.acceptContractOffer(game, e.target.dataset.accept); render(); return; }
  if (e.target.dataset.reject) { S.rejectContractOffer(game, e.target.dataset.reject); render(); return; }
  if (e.target.dataset.hire) {
    const r = S.hireCandidate(game, e.target.dataset.hire);
    if (!r.ok) alert("No se puede contratar: " + (r.error ?? ""));
    invalidatePanelCache();
    render();
    return;
  }
  if (e.target.dataset.fire) {
    const m = game.mechanics.find(mm => mm.id === e.target.dataset.fire);
    if (!m) return;
    if (!confirm(\`¿Despedir \${m.name}? Severance: \${S.severanceFor(m).toLocaleString("es-ES")} €.\`)) return;
    const r = S.fireMechanic(game, e.target.dataset.fire);
    if (!r.ok) alert("No se puede despedir: " + (r.error ?? ""));
    invalidatePanelCache();
    render();
    return;
  }
  if (e.target.dataset.train) {
    const r = S.startTrainingFor(game, e.target.dataset.train);
    if (!r.ok) alert("No se puede entrenar: " + (r.error ?? ""));
    invalidatePanelCache();
    render();
    return;
  }
});

document.body.addEventListener("change", (e) => {
  if (e.target.dataset.shiftMech) {
    const r = S.setMechanicShift(game, e.target.dataset.shiftMech, e.target.value);
    if (!r.ok) alert("No se puede cambiar turno: " + (r.error ?? ""));
    invalidatePanelCache();
    render();
    return;
  }
  if (e.target.id === "sel-cert") { manualCertId = e.target.value; invalidateModalCache(); render(); }
  if (e.target.dataset.helper) {
    const id = e.target.dataset.helper;
    if (e.target.checked) {
      if (!manualHelperIds.includes(id) && manualHelperIds.length < 2) manualHelperIds.push(id);
    } else manualHelperIds = manualHelperIds.filter(h => h !== id);
    invalidateModalCache();
    render();
  }
});

async function doSave() {
  try {
    await S.getStorage().save(S.serializeGame(game));
    hasSavedSlot = true;
    saveIndicator = "saved";
    render();
    setTimeout(() => { saveIndicator = ""; render(); }, 2000);
  } catch (e) {
    alert("Error al guardar: " + e.message);
  }
}
async function doLoad() {
  try {
    const payload = await S.getStorage().load();
    if (!payload) { alert("No hay partida guardada."); return; }
    const loaded = S.deserializeGame(payload, S.DATA.balance, S.DATA.airlines, S.DATA.workOrders, S.DATA.maintenanceChecks, S.DATA.dailyChecks);
    Object.assign(game, loaded);
    saveIndicator = "loaded";
    render();
    setTimeout(() => { saveIndicator = ""; render(); }, 2000);
  } catch (e) {
    alert("Error al cargar: " + e.message);
  }
}
async function doNewGame() {
  if (!confirm("¿Empezar nueva partida? Se perderá el progreso actual.")) return;
  await S.getStorage().clear();
  const fresh = S.createGame(S.DATA.balance, S.DATA.airlines, S.DATA.workOrders, Math.floor(Math.random() * 1e9), S.DATA.maintenanceChecks, S.DATA.dailyChecks, { lineMode: true });
  Object.assign(game, fresh);
  hasSavedSlot = false;
  selectedWoId = null;
  opsSubTab = "events";
  render();
}

function ageFleet() {
  // DEBUG: bumpea la flota cerca de triggers A/C para poder validar los flujos sin esperar
  // 30 días de juego. Mitad de cada flota a 580 FH (a 20 del A=600).
  // 4 aviones por aerolínea (la primera mitad de su flota de 8) a 580/195. Uno por aerolínea
  // queda directamente cruzado (610/210) para disparar inmediato.
  const byAl = new Map();
  for (const f of game.fleet) {
    if (!byAl.has(f.airlineId)) byAl.set(f.airlineId, []);
    byAl.get(f.airlineId).push(f);
  }
  let bumped = 0;
  for (const [, fleet] of byAl) {
    for (let i = 0; i < 4 && i < fleet.length; i++) {
      const isFirst = i === 0;
      const target = fleet[i];
      const idx = game.fleet.findIndex(f => f.registration === target.registration);
      if (idx >= 0) {
        game.fleet[idx] = {
          ...game.fleet[idx],
          fhSinceLastA: isFirst ? 610 : 580,
          cyclesSinceLastA: isFirst ? 210 : 190,
          totalFH: game.fleet[idx].totalFH + (isFirst ? 610 : 580),
          totalCycles: game.fleet[idx].totalCycles + (isFirst ? 210 : 190),
        };
        bumped++;
      }
    }
  }
  alert("🛠️ Envejecidos " + bumped + " aviones (debug). Pulsa 5× para ver checks dispararse.");
  render();
}

(async () => { hasSavedSlot = await S.getStorage().hasSave(); render(); })();

setInterval(() => {
  if (game.clock.speed === 0) return;
  S.advanceGame(game, game.clock.speed);
  render();
}, 100);`;

await main();
