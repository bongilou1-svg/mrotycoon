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

const CSS = `:root{--bg:#090d15;--bg-grid:rgba(120,150,200,.035);--panel:#161b22;--panel-h:#1f2733;--panel-solid:#111925;--panel-2:#151f2d;--raised:#1a2536;--border:#2a3142;--border-s:#3a4256;--line:#212c3e;--line-2:#2e3a4f;--text:#e9edf4;--muted:#8b97ab;--subtle:#5d6677;--dim:#586477;--accent:#4da3ff;--accent-2:#86c5ff;--accent-d:#2a5a8f;--accent-deep:#10314f;--accent-bg:rgba(77,163,255,.12);--cyan:#3ad6c5;--success:#3fb950;--warning:#d29922;--danger:#f85149;--ok:#3fb950;--warn:#e6a93a;--bad:#f85149;--aog:#ff4242;--base:#a78bfa;--base-d:#5b3fbe;--ok-bg:rgba(63,185,80,.13);--warn-bg:rgba(230,169,58,.13);--bad-bg:rgba(248,81,73,.13);--modal:#0f1722;--mono:"JetBrains Mono","Fira Code",Consolas,monospace;--sans:"Space Grotesk","Inter","Segoe UI",system-ui,sans-serif;--disp:"Space Grotesk","Inter","Segoe UI",system-ui,sans-serif;--rad:8px;--rad-s:5px;}
*{box-sizing:border-box}html,body{margin:0;padding:0;height:100vh;width:100vw;overflow:hidden;color:var(--text);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
body{background:radial-gradient(1200px 700px at 78% -8%,rgba(77,163,255,.07),transparent 60%),linear-gradient(var(--bg-grid) 1px,transparent 1px),linear-gradient(90deg,var(--bg-grid) 1px,transparent 1px),var(--bg);background-size:auto,34px 34px,34px 34px,auto}
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
/* Pivot línea pura · iteración 2026-05-24: stepper de fases WO */
.phase-stepper{display:flex;gap:3px;margin:.5rem 0 1.1rem 0;align-items:center}
.phase-step{flex:1;height:5px;background:var(--bg);border-radius:3px;position:relative;border:1px solid var(--border)}
.phase-step.done{background:var(--success);border-color:var(--success)}
.phase-step.active{background:linear-gradient(90deg,var(--accent) var(--pct,50%),var(--bg) var(--pct,50%));border-color:var(--accent);box-shadow:0 0 6px rgba(77,163,255,.4)}
.phase-step.pending{background:var(--bg);border-color:var(--border-s)}
.phase-step.failed{background:var(--danger);border-color:var(--danger)}
.phase-step .lbl{position:absolute;top:8px;left:0;right:0;text-align:center;font-size:.65rem;color:var(--muted);white-space:nowrap}
.phase-step.done .lbl{color:var(--success)}
.phase-step.active .lbl{color:var(--accent);font-weight:600}
.phase-step.failed .lbl{color:var(--danger)}
/* Pivot iteración 2026-05-24: chips clickables dentro de daily-card (matrícula + tipo)
   con hover claro para distinguirlos de la zona neutra que abre el modal daily. */
.clickable-chip{cursor:pointer;padding:.05rem .35rem;border-radius:4px;border:1px solid transparent;transition:background .12s,border-color .12s;position:relative;z-index:2}
.clickable-chip:hover{background:rgba(77,163,255,.18);border-color:rgba(77,163,255,.45)}
.daily-card:hover{outline:1px dashed rgba(140,150,200,.4);outline-offset:2px}
/* Pivot iteración 2026-05-25 — Panel info overlay sobre el mapa */
.map-info-panel{position:absolute;top:12px;left:12px;z-index:10;background:rgba(7,13,24,.82);backdrop-filter:blur(8px);border:1px solid rgba(77,163,255,.25);border-radius:6px;padding:.55rem .75rem;font-family:var(--mono);font-size:.72rem;line-height:1.45;min-width:220px;max-width:260px;color:var(--text);box-shadow:0 4px 16px rgba(0,0,0,.4);pointer-events:auto}
.map-info-panel h3{margin:.1rem 0 .25rem 0;font-size:.66rem;color:#7fb3e8;text-transform:uppercase;letter-spacing:.06em;font-weight:600;font-family:var(--sans)}
.map-info-panel .mip-row{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;padding:.08rem 0;font-size:.72rem}
.map-info-panel .mip-time{color:#7fb3e8;font-weight:600;min-width:46px}
.map-info-panel .mip-callsign{color:var(--text);flex:1}
.map-info-panel .mip-route{color:var(--muted);font-size:.68rem;text-align:right}
.map-info-panel .mip-empty{color:var(--muted);font-style:italic;padding:.15rem 0;font-size:.7rem}
.map-info-panel .mip-more{color:var(--muted);font-size:.65rem;text-align:center;padding:.15rem 0;font-style:italic}
.map-info-panel .mip-sep{border-top:1px dashed rgba(120,140,180,.18);margin:.4rem 0 .25rem 0}

/* Pivot iteración 2026-05-25 — New Game wizard overlay */
.newgame-overlay{position:fixed;inset:0;background:rgba(7,13,24,.97);backdrop-filter:blur(10px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:2rem;overflow-y:auto}
.newgame-intro{text-align:center;max-width:560px;padding:1rem}
.ng-intro-logo{font-size:5rem;margin-bottom:.5rem;line-height:1;filter:drop-shadow(0 4px 12px rgba(77,163,255,.4))}
.ng-intro-title{font-size:3rem;margin:.3rem 0 .2rem 0;font-weight:700;letter-spacing:-.02em;background:linear-gradient(135deg,#4da3ff,#7fb3e8);-webkit-background-clip:text;background-clip:text;color:transparent}
.ng-intro-sub{font-size:1rem;color:var(--muted);margin:0 0 2.5rem 0;font-weight:300}
.ng-intro-actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:.5rem}
.ng-intro-foot{font-size:.72rem;color:var(--muted);margin:3rem 0 0 0;opacity:.5}
.newgame-panel{max-width:1200px;width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:2rem;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.newgame-header{margin-bottom:1.5rem;text-align:center}
.newgame-cards{display:grid;gap:1rem;margin-bottom:1rem}
.newgame-cards-3{grid-template-columns:repeat(3,1fr)}
.newgame-cards-airports{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));max-width:1100px;margin:0 auto}
.newgame-card{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:8px;padding:1rem 1.2rem;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:.5rem}
.newgame-card:hover:not(.ng-disabled){border-color:var(--accent);background:rgba(77,163,255,.08);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.4)}
.newgame-card.ng-disabled{opacity:.4;cursor:not-allowed}
.ng-card-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem}
.ng-card-head h2{margin:0;font-size:1.2rem;font-weight:600}
.ng-stars{font-size:.85rem;letter-spacing:.05em}
.ng-shortline{font-size:.82rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.ng-desc{font-style:italic;color:var(--text);font-size:.88rem;margin:.3rem 0;line-height:1.4}
.ng-metrics{display:grid;grid-template-columns:1fr 1fr;gap:.3rem .6rem;font-size:.78rem;padding:.5rem;background:rgba(0,0,0,.2);border-radius:5px;margin-top:.5rem}
.ng-metrics > div{display:flex;justify-content:space-between;gap:.4rem}
.ng-meta{font-size:.85rem;color:var(--muted);margin:.3rem 0}
.ng-select-btn{margin-top:auto;padding:.5rem 1rem;background:rgba(77,163,255,.15);color:var(--accent);border:1px solid var(--accent);border-radius:5px;cursor:pointer;font-size:.9rem;transition:background .15s}
.ng-select-btn:hover{background:var(--accent);color:#fff}
.ng-select-btn.primary{background:var(--accent);color:#fff;font-weight:600}
.ng-select-btn.primary:hover{background:#3a8edb}
.ng-coming-soon{margin-top:auto;padding:.5rem;background:rgba(245,185,69,.1);color:var(--warning);border:1px dashed var(--warning);border-radius:5px;font-size:.78rem;text-align:center}
.ng-back-btn{padding:.4rem .8rem;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:.85rem}
.ng-back-btn:hover{color:var(--text);border-color:var(--accent)}
.newgame-footer{text-align:center;margin-top:1.5rem;display:flex;justify-content:space-between;align-items:center}
.fleet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem;gap:.4rem}
.fleet-reg{font-family:var(--mono);font-weight:600;color:var(--text);font-size:.85rem}
.fleet-meta{display:flex;flex-wrap:wrap;gap:.4rem;color:var(--muted)}
.game-over{text-align:center;padding:4rem 2rem}.game-over h1{font-size:3rem;color:var(--danger);margin-bottom:1rem}
.empty{color:var(--muted);font-size:.9rem;padding:2rem 1rem;text-align:center}
/* ===== Tutorial Rookie guiado (2026-05-30) ===== */
/* Capa de bloqueo: intercepta TODOS los clicks salvo el target resaltado. El target se
   "perfora" elevándolo por z-index con position:relative + outline brillante. */
#tut-block{position:fixed;inset:0;z-index:900;background:transparent;cursor:not-allowed}
#tut-block.dim{background:rgba(7,13,24,.55);backdrop-filter:saturate(.7) brightness(.9)}
/* El elemento objetivo se eleva por encima de la capa de bloqueo para ser clicable. */
.tut-spotlight{position:relative;z-index:910!important;outline:3px solid var(--accent);outline-offset:3px;border-radius:6px;box-shadow:0 0 0 3px rgba(77,163,255,.35),0 0 22px 6px rgba(77,163,255,.45);animation:tut-pulse 1.6s ease-in-out infinite}
@keyframes tut-pulse{0%,100%{box-shadow:0 0 0 3px rgba(77,163,255,.30),0 0 18px 4px rgba(77,163,255,.35)}50%{box-shadow:0 0 0 4px rgba(77,163,255,.5),0 0 28px 10px rgba(77,163,255,.6)}}
/* Bocadillo del tutorial. Posicionado por JS (data-pos) o centrado si es contexto. */
#tut-pop{position:fixed;z-index:930;max-width:380px;background:linear-gradient(160deg,#16243a,#101a2c);border:1px solid var(--accent);border-radius:10px;padding:1rem 1.15rem;box-shadow:0 12px 40px rgba(0,0,0,.55);color:var(--text);font-size:.9rem;line-height:1.5}
#tut-pop.center{top:50%;left:50%;transform:translate(-50%,-50%);max-width:520px;padding:1.6rem 1.8rem}
#tut-pop .tut-step{font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);font-weight:600;margin-bottom:.4rem}
#tut-pop h3{margin:0 0 .5rem;font-size:1.05rem;color:#fff}
#tut-pop.center h3{font-size:1.5rem}
#tut-pop p{margin:0 0 .6rem;color:var(--text)}
#tut-pop .tut-why{background:rgba(77,163,255,.1);border-left:3px solid var(--accent);padding:.4rem .6rem;border-radius:0 5px 5px 0;font-size:.82rem;color:#bcd;margin:.5rem 0}
#tut-pop .tut-cta{display:inline-block;margin-top:.4rem;font-size:.8rem;color:var(--accent);font-weight:600}
#tut-pop .tut-actions{display:flex;gap:.6rem;justify-content:flex-end;align-items:center;margin-top:.9rem}
#tut-pop .tut-next{background:var(--accent);color:#fff;border:none;border-radius:6px;padding:.55rem 1.1rem;font-weight:600;cursor:pointer;font-size:.9rem}
#tut-pop .tut-next:hover{background:#3a8edb}
#tut-pop .tut-skip{background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:.76rem;text-decoration:underline}
#tut-pop .tut-arrow{position:absolute;width:0;height:0}
#tut-progress{display:flex;gap:3px;margin-top:.8rem}
#tut-progress .pip{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.15)}
#tut-progress .pip.done{background:var(--accent)}
#tut-progress .pip.cur{background:var(--accent);box-shadow:0 0 6px var(--accent)}
/* ============================================================================
   REDISEÑO CIC (handoff Design Claude · port 2026-05-30). Componentes nuevos que
   conviven con el CSS legacy: los tokens success/warning/danger siguen intactos;
   estos componentes usan --ok/--warn/--bad/--cyan/--disp/--line/--line-2. El cajón
   lateral es un RESKIN de .modal-back/.modal (no un elemento nuevo). El .kpi del
   cajón va scoped a .dw-kpis para no chocar con el .kpi del HUD.
   ========================================================================== */
/* -- cabecera de panel CIC -- */
.eyebrow{display:flex;align-items:center;gap:.5rem;font:600 .64rem var(--disp);text-transform:uppercase;letter-spacing:.16em;color:var(--accent);margin-bottom:.15rem}
.eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 9px var(--accent)}
.title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.6rem;flex-wrap:wrap}
.title-row h1{margin:0;font:600 1.5rem/1 var(--disp);letter-spacing:-.01em;color:var(--text)}
.title-row .sub{font:.74rem var(--mono);color:var(--dim);margin-top:.3rem}
/* -- segmented switch -- */
.vswitch{display:flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:9px;background:#0c1421}
.vswitch button{padding:.34rem .7rem;border-radius:6px;font:600 .73rem var(--disp);color:var(--muted);display:flex;align-items:center;gap:.4rem;background:transparent;border:none;transition:.13s}
.vswitch button .vk{font:700 .62rem var(--mono);opacity:.6}
.vswitch button:hover{color:var(--text);background:transparent}
.vswitch button.active{background:var(--raised);color:#fff;box-shadow:0 0 0 1px var(--line-2) inset}
.vswitch button.active .vk{color:var(--accent);opacity:1}
/* -- barra de situación -- */
.sitbar{border:1px solid var(--line);border-radius:var(--rad);background:linear-gradient(180deg,#121b28,#0e1620);overflow:hidden;margin-bottom:.7rem}
.sit-tiles{display:grid;grid-template-columns:repeat(6,1fr)}
.tile{position:relative;padding:.6rem .8rem;border-right:1px solid var(--line);cursor:pointer;transition:.14s;display:flex;flex-direction:column;gap:.15rem}
.tile:last-child{border-right:none}
.tile:hover{background:#ffffff05}
.tile.sel{background:#14243a}
.tile.sel::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--accent)}
.tile .tnum{font:700 1.5rem/1 var(--mono);letter-spacing:-.02em;color:var(--text)}
.tile .tlbl{display:flex;align-items:center;gap:.32rem;font:.6rem/1.1 var(--disp);text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
.tile.c-aog .tnum{color:var(--aog)}
.tile.c-unassigned .tnum{color:var(--warn)}
.tile.c-risk .tnum{color:var(--bad)}
.tile.c-progress .tnum{color:var(--accent)}
.tile.c-closed .tnum{color:var(--ok)}
.led{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 8px currentColor}
.led.pulse{animation:cic-pulse 1.25s ease-in-out infinite}
@keyframes cic-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.sit-summary{display:flex;align-items:center;gap:.6rem;padding:.5rem .85rem;border-top:1px solid var(--line);background:#0d1622;font-size:.82rem;color:var(--muted);flex-wrap:wrap}
.sit-summary .sig{font:700 .6rem var(--mono);color:var(--bad);border:1px solid var(--bad);border-radius:4px;padding:1px 5px;letter-spacing:.08em;flex:none;background:var(--bad-bg)}
.sit-summary .sig.acc{color:var(--accent);border-color:var(--accent);background:var(--accent-bg)}
.sit-summary b{color:var(--text);font-weight:600}
.sit-summary .reg{font-family:var(--mono);color:var(--accent-2)}
/* -- group headers (triage) -- */
.grp-head{display:flex;align-items:center;gap:.55rem;margin:1rem 0 .5rem;font:600 .66rem var(--disp);text-transform:uppercase;letter-spacing:.13em}
.grp-head .gline{flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}
.grp-head .gcount{font:700 .64rem var(--mono);color:var(--dim)}
.grp-head.g-aog{color:var(--aog)}
.grp-head.g-risk{color:var(--warn)}
.grp-head.g-progress{color:var(--accent)}
.grp-head.g-scheduled{color:var(--muted)}
.grp-head.g-closed{color:var(--dim)}
.grp-head .gdot{width:8px;height:8px;border-radius:2px;background:currentColor;box-shadow:0 0 8px currentColor}
/* -- event card (variante A · triaje) -- */
.feed{display:flex;flex-direction:column;gap:.5rem}
.evt{position:relative;display:grid;grid-template-columns:4px 1fr auto;background:var(--panel-solid);border:1px solid var(--line);border-radius:var(--rad);overflow:hidden;cursor:pointer;transition:.14s}
.evt:hover{border-color:var(--line-2);background:var(--panel-2);transform:translateY(-1px)}
.evt .rail{background:var(--line-2)}
.evt.sev-aog .rail,.evt.sev-Critical .rail{background:var(--bad);box-shadow:0 0 14px var(--bad)}
.evt.sev-Major .rail{background:var(--warn)}
.evt.sev-Minor .rail{background:var(--accent)}
.evt.st-closed{opacity:.62}
.evt.st-closed .rail{background:var(--ok)}
.evt.st-deferred .rail{background:var(--base)}
.evt-main{padding:.6rem .8rem;min-width:0}
.evt-top{display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;flex-wrap:wrap}
.evt-led{width:9px;height:9px;border-radius:50%;flex:none}
.evt-reg{font:700 .98rem var(--mono);letter-spacing:.02em;color:var(--text)}
.evt-type{font:.66rem var(--mono);color:var(--muted);background:#0d1622;border:1px solid var(--line);padding:1px 6px;border-radius:4px}
.al-tab{display:inline-flex;align-items:center;gap:.3rem;font:.66rem var(--disp);color:var(--muted)}
.al-dot{width:9px;height:9px;border-radius:2px;flex:none}
.evt-time{margin-left:auto;font:.68rem var(--mono);color:var(--dim)}
.evt-kind{font-size:.92rem}
.evt-desc{font-size:.85rem;color:#d6dce6;line-height:1.4;margin-bottom:.45rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.evt-desc .wo-ref{font-family:var(--mono);color:var(--accent-2);font-size:.78rem}
.evt-tags{display:flex;flex-wrap:wrap;gap:.32rem;align-items:center}
.tag{font:.64rem var(--mono);padding:1px 6px;border-radius:4px;border:1px solid var(--line);color:var(--muted)}
.tag.ata{color:var(--accent-2);border-color:#244966}
.tag.cat{color:var(--cyan);border-color:#1f5650}
.tag.sev-Major{color:var(--warn);border-color:#5c4a1c;background:var(--warn-bg)}
.tag.sev-Critical,.tag.sev-aog{color:var(--bad);border-color:#5e2723;background:var(--bad-bg);font-weight:600}
.tag.stand{color:var(--muted)}
.tag.stand b{color:var(--text)}
.tag.mel{color:var(--base);border-color:#42367a}
/* assignment pill */
.asg{display:inline-flex;align-items:center;gap:.34rem;font:600 .66rem var(--disp);padding:2px 8px;border-radius:20px;border:1px solid}
.asg .led{width:7px;height:7px}
.asg.unassigned{color:var(--warn);border-color:#5c4a1c;background:var(--warn-bg)}
.asg.unassigned.crit{color:var(--bad);border-color:#5e2723;background:var(--bad-bg)}
.asg.working{color:var(--accent);border-color:#244966;background:var(--accent-bg)}
.asg.travel{color:var(--cyan);border-color:#1f5650;background:rgba(58,214,197,.1)}
.asg.done{color:var(--ok);border-color:#27512f;background:var(--ok-bg)}
.asg.deferred{color:var(--base);border-color:#42367a;background:rgba(167,139,250,.12)}
/* SLA ring */
.evt-side{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;padding:.6rem .85rem;border-left:1px solid var(--line);background:#0d1521;min-width:96px}
.ring{--p:60;--c:var(--warn);width:46px;height:46px;border-radius:50%;position:relative;background:conic-gradient(var(--c) calc(var(--p)*1%),rgba(255,255,255,.07) 0)}
.ring::before{content:"";position:absolute;inset:4px;border-radius:50%;background:#0d1521}
.ring .rv{position:absolute;inset:0;display:grid;place-content:center;text-align:center}
.ring .rv b{font:700 .82rem var(--mono);color:var(--c);line-height:1}
.ring .rv s{font:.5rem var(--disp);text-transform:uppercase;letter-spacing:.06em;color:var(--dim);text-decoration:none}
.sla-lbl{font:.54rem var(--disp);text-transform:uppercase;letter-spacing:.08em;color:var(--dim)}
.evt-side.overdue .ring .rv b{color:var(--bad)}
.evt-side.no-sla{color:var(--dim);font:.62rem var(--mono);text-align:center}
/* -- variante B · telemetría -- */
.tele{display:flex;flex-direction:column;gap:3px}
.trow{display:grid;grid-template-columns:10px 50px 92px 1fr 150px 138px 64px;gap:.6rem;align-items:center;padding:.5rem .7rem;background:var(--panel-solid);border:1px solid var(--line);border-radius:6px;cursor:pointer;font-size:.78rem;transition:.13s;border-left:3px solid var(--line-2)}
.trow:hover{background:var(--panel-2);border-color:var(--line-2)}
.trow.sev-aog,.trow.sev-Critical{border-left-color:var(--bad)}
.trow.sev-Major{border-left-color:var(--warn)}
.trow.sev-Minor{border-left-color:var(--accent)}
.trow.st-closed{opacity:.6;border-left-color:var(--ok)}
.trow .tled{width:9px;height:9px;border-radius:50%}
.trow .ttime{font:.7rem var(--mono);color:var(--dim)}
.trow .treg{font:700 .82rem var(--mono);color:var(--text)}
.trow .treg small{display:block;font:.6rem var(--mono);color:var(--muted);font-weight:400}
.trow .tdesc{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#cfd6e1}
.trow .tdesc .wo-ref{font-family:var(--mono);color:var(--accent-2);margin-right:.4rem}
.slabar{display:flex;flex-direction:column;gap:3px}
.slabar .sl-top{display:flex;justify-content:space-between;font:.6rem var(--mono);color:var(--muted)}
.slabar .sl-track{height:6px;border-radius:4px;background:#1a2433;overflow:hidden}
.slabar .sl-fill{height:100%;border-radius:4px}
.tdots{display:flex;gap:2px}
.tdots i{width:6px;height:6px;border-radius:50%;background:#26344a}
.tdots i.done{background:var(--ok)}
.tdots i.active{background:var(--accent);box-shadow:0 0 6px var(--accent)}
/* -- variante C · tablero -- */
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;align-items:start}
.board .col{background:#0d1420;border:1px solid var(--line);border-radius:var(--rad);min-height:120px}
.col-head{display:flex;align-items:center;gap:.45rem;padding:.55rem .75rem;border-bottom:1px solid var(--line);font:600 .66rem var(--disp);text-transform:uppercase;letter-spacing:.1em}
.col-head .cdot{width:8px;height:8px;border-radius:2px;box-shadow:0 0 7px currentColor}
.col-head .cn{margin-left:auto;font:700 .66rem var(--mono);color:var(--dim)}
.board .col.unassigned .col-head{color:var(--warn)}
.board .col.progress .col-head{color:var(--accent)}
.board .col.closed .col-head{color:var(--ok)}
.col-body{padding:.55rem;display:flex;flex-direction:column;gap:.5rem}
.bcard{background:var(--panel-solid);border:1px solid var(--line);border-radius:6px;padding:.55rem .65rem;cursor:pointer;border-top:2px solid var(--line-2);transition:.13s}
.bcard:hover{background:var(--panel-2);border-color:var(--line-2)}
.bcard.sev-aog,.bcard.sev-Critical{border-top-color:var(--bad)}
.bcard.sev-Major{border-top-color:var(--warn)}
.bcard.sev-Minor{border-top-color:var(--accent)}
.bc-top{display:flex;align-items:center;gap:.4rem;margin-bottom:.3rem}
.bc-reg{font:700 .84rem var(--mono);color:var(--text)}
.bc-time{margin-left:auto;font:.62rem var(--mono);color:var(--dim)}
.bc-desc{font-size:.74rem;color:#c8d0db;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:.4rem}
.bc-foot{display:flex;align-items:center;gap:.4rem;justify-content:space-between;flex-wrap:wrap}
/* -- Oficina · mecánicos como tarjetas -- */
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.6rem}
.mcard{background:var(--panel-solid);border:1px solid var(--line);border-radius:var(--rad);padding:.7rem .8rem;cursor:pointer;transition:.14s}
.mcard:hover{border-color:var(--line-2);background:var(--panel-2);transform:translateY(-1px)}
.mcard-top{display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem}
.mc-av{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;flex:none;font:700 .76rem var(--mono);background:linear-gradient(135deg,#1d4f7e,#0d2236);color:var(--accent-2);border:1px solid #2c5e8e}
.mc-id{min-width:0;flex:1}
.mc-name{font:600 .92rem var(--disp);letter-spacing:.01em;color:var(--text)}
.mc-base{font:.66rem var(--mono);color:var(--dim)}
.mc-state{display:inline-flex;align-items:center;gap:.35rem;font:600 .62rem var(--disp);padding:2px 8px;border-radius:20px;border:1px solid;white-space:nowrap}
.mc-state .led{width:7px;height:7px}
.mc-task{font-size:.78rem;color:#cbd3df;margin-bottom:.55rem;min-height:1.1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mc-bars{display:flex;align-items:center;gap:1rem;margin-bottom:.5rem}
.mc-metric{display:flex;align-items:center;gap:.4rem}
.mc-metric .mk{font:.6rem var(--disp);text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
.mc-metric .mv{font:600 .76rem var(--mono)}
.mc-bar{width:74px;height:6px;border-radius:4px;background:#1a2433;overflow:hidden}
.mc-fill{height:100%;border-radius:4px}
.mc-fill.ok{background:var(--ok)}
.mc-fill.warn{background:var(--warn)}
.mc-fill.bad{background:var(--bad)}
.mc-foot{display:flex;align-items:center;justify-content:space-between;gap:.5rem;border-top:1px solid var(--line);padding-top:.5rem}
.tag.shift-morning{color:var(--warn);border-color:#5c4a1c}
.tag.shift-afternoon{color:var(--accent);border-color:#244966}
.tag.shift-night{color:var(--base);border-color:#42367a}
.tag.shift-off{color:var(--dim)}
/* coverage 24h en bandas */
.cov{margin-top:.3rem;border:1px solid var(--line);border-radius:var(--rad);background:#0d1521;padding:.7rem .8rem}
.cov-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem}
.cov-head .ck{font:600 .64rem var(--disp);text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
.cov-now-lbl{font-size:.64rem;color:var(--accent)}
.cov-track{position:relative;display:flex;gap:3px;height:46px}
.cov-band{position:relative;border-radius:6px;overflow:hidden;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex:1}
.cb-fill{position:absolute;inset:0}
.cb-l{position:relative;font:600 .72rem var(--disp);color:var(--text);display:flex;align-items:center;gap:.4rem}
.cb-l b{font:700 .9rem var(--mono);color:var(--text)}
.cb-l b.zero{color:var(--dim)}
.cov-now{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--accent);box-shadow:0 0 8px var(--accent);z-index:2}
.cov-now::before{content:"▾";position:absolute;top:-13px;left:-5px;color:var(--accent);font-size:.7rem}
.cov-legend{margin-top:.5rem;display:flex;gap:.5rem;align-items:center;font:.66rem var(--disp);color:var(--muted);flex-wrap:wrap}
.cov-legend b.zero{color:var(--dim);font-family:var(--mono)}
.cov-legend .dim{color:var(--dim)}
/* -- Schedule · timeline de filas -- */
.ftable{display:flex;flex-direction:column;gap:2px}
.frow{display:grid;grid-template-columns:74px 56px 1fr 188px 148px;gap:.6rem;align-items:center;padding:.5rem .7rem;background:var(--panel-solid);border:1px solid var(--line);border-radius:6px;cursor:pointer;transition:.13s;border-left:3px solid transparent}
.frow:hover{background:var(--panel-2);border-color:var(--line-2)}
.frow.handled{border-left-color:var(--accent)}
.frow.lead{border-left-color:var(--line-2);opacity:.78}
.frow.past{opacity:.5}
.frow.next{background:#13243a;border-color:#27557f;border-left-color:var(--accent)}
.frow.fhead{background:transparent;border:none;cursor:default;padding:.2rem .7rem;font:600 .58rem var(--disp);text-transform:uppercase;letter-spacing:.1em;color:var(--dim)}
.frow.fhead:hover{background:transparent}
.ftime{font:600 .82rem var(--mono);display:flex;align-items:center;gap:.3rem;color:var(--text)}
.fchk{color:var(--ok)}
.ftype{font:700 .64rem var(--mono);text-align:center;padding:2px 0;border-radius:4px;letter-spacing:.06em}
.ftype.arr{color:var(--ok);background:var(--ok-bg);border:1px solid #27512f}
.ftype.dep{color:var(--warn);background:var(--warn-bg);border:1px solid #5c4a1c}
.fmain{display:flex;align-items:center;gap:.55rem;min-width:0;flex-wrap:wrap}
.fcs{font:700 .84rem var(--mono);color:var(--text)}
.froute{font:.74rem var(--mono);color:var(--muted)}
.fmodel{font:.7rem var(--mono);color:var(--dim)}
.fov{font:.62rem var(--disp);color:var(--base);border:1px solid #42367a;border-radius:4px;padding:0 5px}
.fop{display:flex;align-items:center;gap:.4rem;min-width:0}
.fop .op-h{font:.78rem var(--disp);color:var(--text)}
.fop .op-l{font:.78rem var(--disp);color:var(--muted)}
.fop .op-code{font:.66rem var(--mono);color:var(--dim);margin-left:auto}
.fstatus{text-align:right}
.st-pill{font:600 .64rem var(--disp);padding:2px 8px;border-radius:20px;border:1px solid;white-space:nowrap}
.st-pill.ok{color:var(--accent);border-color:#244966;background:var(--accent-bg)}
.st-pill.lead{color:var(--dim);border-color:var(--line-2)}
@media(max-width:1180px){.frow{grid-template-columns:60px 48px 1fr 120px}.frow .fstatus{display:none}}
/* -- Log de actividad (reskin de .notifs) -- */
.notifs h3{font:600 .66rem var(--disp);text-transform:uppercase;letter-spacing:.13em;color:var(--muted)}
.log-live{display:inline-flex;align-items:center;gap:.3rem;font:600 .56rem var(--mono);color:var(--ok);float:right}
.notif{position:relative;padding-left:.7rem}
.notif::before{content:"";position:absolute;left:0;top:.4rem;bottom:.4rem;width:3px;border-radius:3px;background:var(--line-2)}
.notif.success::before{background:var(--ok)}
.notif.warning::before{background:var(--warn)}
.notif.danger::before{background:var(--bad)}
.notif.info::before{background:var(--muted)}
.notif .reg{font-family:var(--mono);color:var(--accent-2)}
/* -- Cajón lateral: reskin de .modal-back/.modal -- */
.modal-back{position:fixed;inset:0;background:rgba(5,8,13,.6);backdrop-filter:blur(3px);display:none;align-items:stretch;justify-content:flex-end;z-index:100}
.modal-back.open{display:flex}
.modal{background:linear-gradient(180deg,#0f1722,#0c121c);border:none;border-left:1px solid var(--line-2);border-radius:0;width:min(540px,96vw);max-width:none;height:100vh;max-height:100vh;box-shadow:-24px 0 60px rgba(0,0,0,.5);display:flex;flex-direction:column;animation:drawer-in .26s cubic-bezier(.2,.7,.2,1)}
@keyframes drawer-in{from{transform:translateX(40px);opacity:.4}to{transform:translateX(0);opacity:1}}
/* dw-* (fichas reskinneadas a cajón) */
.dw-head{padding:1rem 1.1rem .8rem;border-bottom:1px solid var(--line);position:relative}
.dw-head .dw-rail{position:absolute;left:0;top:0;bottom:0;width:4px}
.dw-eyebrow{display:flex;align-items:center;gap:.5rem;font:600 .62rem var(--disp);text-transform:uppercase;letter-spacing:.13em;color:var(--accent)}
.dw-close{position:absolute;top:.85rem;right:.9rem;width:30px;height:30px;border-radius:7px;border:1px solid var(--line);background:#0e1722;color:var(--muted);font-size:1.1rem;cursor:pointer;z-index:2}
.dw-close:hover{color:var(--text);border-color:var(--line-2)}
.dw-title{display:flex;align-items:baseline;gap:.7rem;margin-top:.5rem;flex-wrap:wrap}
.dw-title .reg{font:700 1.4rem var(--mono);letter-spacing:.01em;color:var(--text)}
.dw-title .type{font:.74rem var(--mono);color:var(--muted)}
.dw-sub{margin-top:.45rem;font-size:.86rem;color:#d3dae5;line-height:1.45}
.dw-body{overflow-y:auto;padding:1rem 1.1rem 2.5rem;flex:1}
.dw-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1rem}
.dw-kpis .kpi{background:#0e1622;border:1px solid var(--line);border-radius:7px;padding:.5rem .55rem;text-align:center}
.dw-kpis .kpi .kl{font:.52rem var(--disp);text-transform:uppercase;letter-spacing:.07em;color:var(--dim)}
.dw-kpis .kpi .kv{font:700 .98rem var(--mono);margin-top:.18rem;color:var(--text)}
.dw-kpis .kpi.bad .kv{color:var(--bad)}
.dw-kpis .kpi.warn .kv{color:var(--warn)}
.dw-kpis .kpi.ok .kv{color:var(--ok)}
.dw-kpis .kpi.acc .kv{color:var(--accent)}
.dw-sec{margin:1.1rem 0 .4rem;font:600 .62rem var(--disp);text-transform:uppercase;letter-spacing:.12em;color:var(--muted);display:flex;align-items:center;gap:.5rem}
.dw-sec::after{content:"";flex:1;height:1px;background:var(--line)}
.dw-amm{background:#0c1420;border:1px solid var(--line);border-radius:7px;padding:.7rem .8rem;font-size:.84rem;line-height:1.55;color:#cdd5e0}
.dw-amm .ammref{font:.7rem var(--mono);color:var(--accent-2);display:inline-block;background:var(--accent-bg);border:1px solid #244966;border-radius:4px;padding:0 5px;margin-top:.3rem}
.dw-list{list-style:none;margin:.3rem 0 0;padding:0;display:flex;flex-direction:column;gap:.3rem}
.dw-list li{display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:#cdd5e0;padding:.34rem .5rem;background:#0d1520;border:1px solid var(--line);border-radius:6px}
.dw-list li .ico{color:var(--dim)}
.tl{display:flex;flex-direction:column;gap:0;margin-top:.3rem}
.tl-step{display:grid;grid-template-columns:24px 1fr auto;gap:.6rem;align-items:center;padding:.4rem 0;position:relative}
.tl-step::before{content:"";position:absolute;left:11px;top:0;bottom:0;width:2px;background:var(--line)}
.tl-step:first-child::before{top:50%}
.tl-step:last-child::before{bottom:50%}
.tl-node{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;z-index:1;background:#0e1622;border:2px solid var(--line);font:.7rem var(--mono);color:var(--dim)}
.tl-step.done .tl-node{border-color:var(--ok);color:var(--ok);background:#0e1c14}
.tl-step.active .tl-node{border-color:var(--accent);color:var(--accent);box-shadow:0 0 10px rgba(77,163,255,.4)}
.tl-step .tl-name{font-size:.82rem;color:var(--text)}
.tl-step.pending .tl-name{color:var(--dim)}
.tl-step .tl-meta{font:.66rem var(--mono);color:var(--dim)}
.team{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.3rem}
.mchip{display:flex;align-items:center;gap:.45rem;padding:.32rem .55rem;border:1px solid var(--line);border-radius:20px;background:#0e1622;font-size:.78rem;cursor:pointer;transition:.13s}
.mchip:hover{border-color:var(--accent);background:var(--accent-bg)}
.mchip .av{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:700 .6rem var(--mono);background:linear-gradient(135deg,#1d4f7e,#0d2236);color:var(--accent-2)}
.mchip .cat{font:.6rem var(--mono);color:var(--cyan)}
.dw-actions{display:flex;gap:.5rem;margin-top:1.2rem;flex-wrap:wrap}
.dw-body .btn{flex:1;min-width:120px;padding:.6rem;border-radius:8px;font:600 .82rem var(--disp);border:1px solid var(--line-2);background:#0e1722;color:var(--text);transition:.13s;cursor:pointer}
.dw-body .btn:hover{border-color:var(--accent);color:#fff;background:#0e1722}
.dw-body .btn.primary{background:linear-gradient(180deg,#2f6fb0,#234f80);border-color:var(--accent);color:#fff}
.dw-body .btn.primary:hover{box-shadow:0 0 18px rgba(77,163,255,.3)}
.dw-body .btn.warn{border-color:#5c4a1c;color:var(--warn)}
.linkrow{display:flex;gap:.5rem;margin-top:.6rem;flex-wrap:wrap}
.linkcard{flex:1;min-width:130px;display:flex;align-items:center;gap:.55rem;padding:.55rem .65rem;border:1px solid var(--line);border-radius:8px;background:#0d1520;cursor:pointer;transition:.13s}
.linkcard:hover{border-color:var(--line-2);background:var(--panel-2)}
.linkcard .lk-ic{width:30px;height:30px;border-radius:7px;display:grid;place-items:center;flex:none}
.linkcard .lk-t{font:.6rem var(--disp);text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
.linkcard .lk-v{font:600 .82rem var(--mono);color:var(--text)}
.linkcard .lk-go{margin-left:auto;color:var(--dim)}`;

const BODY = `<div class="app">
  <header class="hud">
    <div class="hud-l"><span class="brand">MRO Tycoon</span><span class="ver">v0.7 · CIC UI</span></div>
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
      <button data-tab="planning">📋 Production Planning <span class="badge" id="badge-planning">0</span></button>
      <button data-tab="office">🏢 Oficina <span class="badge" id="badge-office">0</span></button>
      <button data-tab="contracts">📋 Contratos <span class="badge" id="badge-offers">2</span></button>
      <!-- Pivot iteración 2026-05-25: Mercado renombrado a "Contratación" y movido como
           subsección dentro de Oficina (el reclutamiento es competencia de RRHH del MRO,
           no una tab top-level). El badge de candidatos se muestra ahora en la sub-tab. -->
      <!-- <button data-tab="market">🤝 Mercado <span class="badge" id="badge-candidates">5</span></button> -->
      <span style="display:none"><span class="badge" id="badge-candidates">5</span></span>
      <button disabled title="🏗️ Construcción de hangares — próximamente (sistema de permisos + obra civil en futura fase)" style="opacity:0.4;cursor:not-allowed">🏗️ Hangares <span style="font-size:.7rem">próx.</span></button>
      <button data-tab="dashboard">📊 Dashboard</button>
      <button data-tab="economy">💼 Economía</button>
    </aside>
    <main class="panel" id="panel-content"></main>
    <aside class="notifs"><h3>Log de actividad <span class="log-live"><span class="led pulse" style="color:var(--ok);background:var(--ok)"></span>LIVE</span></h3><div id="notif-list"></div></aside>
  </div>
  <div class="modal-back" id="modal-back"><div class="modal" id="modal-content"></div></div>
</div>`;

const APP_JS = `// === MRO Tycoon vanilla UI driver — pivot MRO línea pura ===
const S = window.Sim;
// Pivot MRO línea pura (2026-05-24): UI activa lineMode=true por default. Modo legacy
// solo lo usan los tests automáticos.
// Pivot · iteración 2026-05-24: A/C/D checks DESHABILITADOS — no se carga maintenance_checks.json
// para que el sim no auto-dispare A-checks al cruzar trigger. Daily checks (pernoctas) siguen
// activos vía dailyChecks. Re-habilitar cuando exista sistema de "trabajos planificados
// avanzados" y permisos de hangar (ahora mismo el juego es solo callouts + pernoctas).
// Pivot iteración 2026-05-25: placeholder game vacío al cargar el bundle. Sin lineMode
// para SKIPEAR seedPreOvernighters (evita phantom aviones OVD por debajo del wizard intro).
// El game REAL se construye cuando el usuario elige preset en startGameFromPreset() o
// restaura su save en doContinueFromIntro(). Hasta entonces, el wizard intro cubre todo.
let game = S.createGame(S.DATA.balance, S.DATA.airlines, S.DATA.workOrders, 42, [], S.DATA.dailyChecks, { lineMode: false });
let activeTab = "map"; // pivot línea pura: arrancamos en mapa (wow factor) y operaciones aparte
let officeSubtab = "team"; // Pivot iteración 2026-05-25: "team" | "hiring" | "management"
// Pivot iteración 2026-05-25 — Wizard de arranque: SIEMPRE empezamos en "intro" para que
// el usuario decida explícitamente (Continuar / Nueva partida / Borrar guardado). Sin esto
// el HTML aterrizaba mostrando un game default OVD pre-seedeado por debajo del wizard, que
// confundía al jugador. Pasa a "airport" → "operator" → null (juego visible).
// null | "intro" | "airport" | "operator"
let newGameStep = "intro";
let newGameSelectedIcao = null;
let newGameCatalog = null; // cargado lazy desde catalog.json bundled
let lastProductionPackageDay = 0; // notif diaria del paquete de trabajo nocturno (12:00)
let selectedWoId = null;
let complianceModalOpen = false;
let repModalOpen = false;
let detailFleetReg = null;   // F5B-ε: matrícula seleccionada para modal de avión
let detailMechId = null;     // F5B-ε: id mecánico seleccionado para modal
let detailCheckId = null;    // F5C extra: instanceId de check A/C/D para modal
let detailContractId = null; // F5C extra: id de contrato para modal
let detailFlightId = null;   // Rediseño CIC (2026-05-30): "callsign|type|min" del vuelo para el cajón
let overnightModalOpen = false; // Pivot línea pura · P4: modal vista pernocta
let detailDailyAirplaneId = null; // Pivot 2026-05-24: instanceId avión para modal daily check detallado
let detailAirplaneType = null;    // Pivot 2026-05-24: "MODEL/ENGINE" para modal tipo avión
let scheduleFilter = "all";  // Pivot línea pura · P3: filtro panel schedule "all"|"arrival"|"departure"
let eventFilter = "open";    // Pivot línea pura · Event Tracking: "open" (activos) | "all"
let variant = "triage";      // Rediseño CIC (2026-05-30): variante Operaciones "triage"|"tele"|"board"
let sitFilter = null;        // Rediseño CIC: filtro activo de la barra de situación (null = sin filtro)
let manualCertId = "";
let manualHelperIds = [];
let hasSavedSlot = false;
let saveIndicator = "";
// === Tutorial Rookie guiado (2026-05-30) ===
// tutActive: el overlay de bloqueo + bocadillo están vivos. tutStep: índice en TUT_STEPS.
// El tutorial fuerza los primeros clicks (guiado absoluto) hasta graduarse el día 3.
// Por defecto ON en dificultad Rookie; "Saltar" siempre disponible.
let tutActive = false;
let tutStep = 0;
let tutGraduated = false; // true tras completar/saltar — no reaparece en la misma partida
// Render-loop optimizations: evita destruir DOM mientras el usuario clica.
let lastPanelHtml = "";
let lastNotifsHtml = "";
let lastMapInfoRenderMs = 0; // throttle 500ms del panel info del mapa
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
      // Pivot iteración 2026-05-24: click sobre avión del mapa con prioridad contextual
      // para "jugar desde el mapa". Si el avión tiene tarea activa, el click va directo a
      // ella. Si no, abre el modal de la matrícula (info general del avión).
      //   1. check A/C/D InProgress → modal check
      //   2. callout WO abierta → modal WO
      //   3. daily check abierto → modal daily detallado por avión (instanceId)
      //   4. nada activo → modal flota (registration)
      onAirplaneClick: (reg, ctx) => {
        if (ctx?.activeCheckInstanceId) detailCheckId = ctx.activeCheckInstanceId;
        else if (ctx?.activeWoInstanceId) selectedWoId = ctx.activeWoInstanceId;
        else if (ctx?.hasOpenDaily && ctx.instanceId) detailDailyAirplaneId = ctx.instanceId;
        else detailFleetReg = reg;
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
// Pivot iteración 2026-05-25 — Performance archive: helpers que consultan también el
// archivo (Departed antiguos + WOs cerradas movidas a g.archive). El hot path del tick
// itera SOLO g.airplanes/g.workOrders activos. La UI que muestra histórico (Event Tracking
// "Todos", modal flota, dashboard counters) usa estos helpers para tener visibilidad
// completa de los 90 días sim retenidos.
function allAirplanes(){ return [...(game.airplanes || []), ...(game.archive?.airplanes || [])]; }
function allWorkOrders(){ return [...(game.workOrders || []), ...(game.archive?.workOrders || [])]; }
function airplaneByInstance(id){
  // Buscar primero en activos (más probable), luego en archive
  return game.airplanes.find(a => a.instanceId === id)
      ?? game.archive?.airplanes?.find(a => a.instanceId === id);
}
function workOrderByInstance(id){
  return game.workOrders.find(w => w.instanceId === id)
      ?? game.archive?.workOrders?.find(w => w.instanceId === id);
}
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
  // Pivot iteración 2026-05-25: overlay panel discreto top-left con
  // aviones en tierra + próx 3 salidas + próx 3 llegadas. Se actualiza
  // cada tick vía updateMapInfoPanel() — NO regenera el HTML del wrapper
  // para no destruir el canvas Pixi montado dentro.
  return \`<div class="map-wrapper" style="position:relative;height:calc(100vh - 96px);min-height:480px">
    <div class="pixi-host" id="pixi-host" style="width:100%;height:100%"></div>
    <div id="map-info-panel" class="map-info-panel"></div>
  </div>\`;
}

/** Actualiza el panel info overlay sobre el mapa. Idempotente: se llama cada tick
 *  cuando activeTab === "map" y el panel está montado. NO toca el canvas Pixi. */
function updateMapInfoPanel(){
  const el = document.getElementById("map-info-panel");
  if (!el) return;
  const now = game.clock.minute;
  const dayMinute = now % 1440;
  const currentDay = S.getDay(now);

  // Pivot iteración 2026-05-30 — "aeropuerto vivo, visión general": el panel muestra
  // TODO el tráfico real en tierra (tus aviones + passthrough del schedule), no solo los
  // contratados. Fuente única: S.getGroundTraffic (universal, lee el schedule activo).
  const onGround = (S.getGroundTraffic?.(game) ?? game.airplanes
    .filter(a => a.status !== "Departed")
    .map(a => ({ registration: a.registration, standId: a.standId, overnight: a.overnight,
      departureMinute: a.scheduledDepartureMinute, contracted: true, isReal: true, notHandled: false,
      airlineCode: "", callsign: a.arrivalCallsign ?? a.registration })));

  // Próx 3 salidas: en tierra ahora con salida futura, orden cronológico.
  const nextDeps = (S.getUpcomingDepartures?.(game, 3) ?? [...onGround]
    .filter(a => (a.departureMinute ?? 0) >= now)
    .sort((a, b) => (a.departureMinute ?? 0) - (b.departureMinute ?? 0))
    .slice(0, 3));

  // Próx 3 llegadas: schedule del día filtrado por scheduledMinute > dayMinute y handleable
  const flights = (S.getFlightsForGameDay?.(currentDay) ?? []);
  const nextArrs = flights
    .filter(f => f.type === "arrival" && f.scheduledMinute > dayMinute && !f.notHandled)
    .sort((a, b) => a.scheduledMinute - b.scheduledMinute)
    .slice(0, 3);

  // Helper: HH:MM a partir de minuto de día (0-1439).
  const hhmm = (m) => {
    const mod = ((m % 1440) + 1440) % 1440;
    return String(Math.floor(mod / 60)).padStart(2, "0") + ":" + String(mod % 60).padStart(2, "0");
  };
  // Helper: HH:MM con "+1" si es mañana.
  const hhmmRel = (absMin) => {
    const dDelta = S.getDay(absMin) - currentDay;
    return hhmm(absMin) + (dDelta > 0 ? \` <span class="muted">+\${dDelta}d</span>\` : "");
  };

  let html = '';

  // ── En tierra ──
  // Pivot 2026-05-30: cuenta TODO el tráfico (tuyo + aeropuerto). Coloreado:
  //   • contratado (tu cliente) → punto cyan + matrícula brillante
  //   • operador sin contrato    → punto violeta (pista "podrías firmarlo")
  //   • modelo no mantenible      → punto gris (informativo)
  // Los tuyos primero, luego por salida. La lista es la fuente de verdad del conteo
  // (el mapa Pixi puede mostrar menos por límite de stands físicos OSM).
  const contractedCount = onGround.filter(a => a.contracted).length;
  html += \`<h3>🅿️ En tierra · \${onGround.length}\${contractedCount > 0 && contractedCount < onGround.length ? \` <span class="muted" style="font-weight:400">(\${contractedCount} tuyos)</span>\` : ""}</h3>\`;
  if (onGround.length === 0) {
    html += \`<div class="mip-empty">Sin aviones en stand</div>\`;
  } else {
    // Orden: primero los tuyos (isReal/contratado), luego por salida más próxima.
    const sortedOnGround = [...onGround].sort((a, b) => {
      if (!!b.contracted !== !!a.contracted) return b.contracted ? 1 : -1;
      return (a.departureMinute ?? Infinity) - (b.departureMinute ?? Infinity);
    });
    const dotColor = (a) => a.notHandled ? "#94a4be" : a.contracted ? "#3aa9ff" : "#a78bfa";
    for (const a of sortedOnGround.slice(0, 6)) {
      const dot = \`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:\${dotColor(a)};margin-right:5px;vertical-align:middle"></span>\`;
      const right = a.standId ? esc(a.standId) : (a.notHandled ? esc(a.airlineCode) : "—");
      html += \`<div class="mip-row">
        <span class="mip-callsign mono" style="\${a.contracted ? "" : "opacity:.72"}">\${dot}\${esc(a.registration)}</span>
        <span class="mip-route">\${right} \${a.overnight ? "🌙" : ""}</span>
      </div>\`;
    }
    if (sortedOnGround.length > 6) {
      html += \`<div class="mip-more">+\${sortedOnGround.length - 6} más</div>\`;
    }
  }

  // ── Próx salidas ──
  html += \`<div class="mip-sep"></div><h3>🛫 Próximas salidas</h3>\`;
  if (nextDeps.length === 0) {
    html += \`<div class="mip-empty">Sin salidas programadas</div>\`;
  } else {
    for (const a of nextDeps) {
      const cs = a.callsign ?? a.registration;
      html += \`<div class="mip-row">
        <span class="mip-time">\${hhmmRel(a.departureMinute ?? now)}</span>
        <span class="mip-callsign mono" style="\${a.contracted ? "" : "opacity:.72"}">\${esc(cs)}</span>
      </div>\`;
    }
  }

  // ── Próx llegadas ──
  html += \`<div class="mip-sep"></div><h3>🛬 Próximas llegadas</h3>\`;
  if (nextArrs.length === 0) {
    html += \`<div class="mip-empty">Sin llegadas hoy</div>\`;
  } else {
    for (const f of nextArrs) {
      html += \`<div class="mip-row">
        <span class="mip-time">\${hhmm(f.scheduledMinute)}</span>
        <span class="mip-callsign mono">\${esc(f.callsign)}</span>
        <span class="mip-route">← \${esc(f.remote ?? "?")}</span>
      </div>\`;
    }
  }

  el.innerHTML = html;
}

// ===========================================================================
// Event Tracking (pivot línea pura, 2026-05-24) — vista unificada Lite
// ===========================================================================
// Reconstruye un feed cronológico desde el state actual: WOs line, A/C/D checks,
// MEL deferrals, random events (runway closure, SB), audits Part-145. Por default
// muestra solo eventos OPEN (activos). Toggle "All" añade los cerrados.
// Click en cada card abre el modal de detalle existente (WO/check/contract).
// Pivot línea pura · iteración 2026-05-24: explica por qué un callout sigue sin asignar
// en lugar del genérico "⚠️ sin asignar". Casos:
//  - Sin mec con type rating válido → "contrata o entrena"
//  - Mec Idle disponible → "X B1 idle" (raro: auto-assign debería haberlo cogido)
//  - Mecs OffShift → "X OffShift · hora extra +2h"
//  - Mecs Working → "todos ocupados"
function inferAssignmentStatus(wo, tpl, ap) {
  if (wo.assignedMechanicIds.length > 0) return \`team \${wo.assignedMechanicIds.length}\`;
  if (!tpl || !ap) return "⚠️ sin asignar";
  const elig = game.mechanics.filter(m =>
    !m.isLeadForeman &&
    m.base === tpl.requiredCategory &&
    m.typeRatings.some(r => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === tpl.requiredCategory)
  );
  if (elig.length === 0) return \`⚠️ sin \${tpl.requiredCategory}/\${ap.model}-\${ap.engineVariant} habilitado · contrata o entrena\`;
  const idle = elig.filter(m => m.state === "Idle");
  if (idle.length > 0) return \`⚠️ \${idle.length} \${tpl.requiredCategory} idle disponible (click)\`;
  const offshift = elig.filter(m => m.state === "OffShift");
  if (offshift.length > 0) {
    const next = offshift[0].shift; // first one's shift
    return \`⚠️ requiere \${tpl.requiredCategory} · \${offshift.length} OffShift (turno \${next} · hora extra +2h)\`;
  }
  return \`⚠️ \${tpl.requiredCategory} todos ocupados\`;
}

function buildEventFeed(){
  const events = [];
  // WOs callout + diferidas + completadas/failed (NO daily checks — esos van agrupados).
  // Pivot iteración 2026-05-25 — Performance archive: itera ambas listas (g.workOrders
  // activas + g.archive.workOrders cerradas archivadas). El filtro "Activos" del Event
  // Tracking sigue filtrando por e.open (que es !isClosed) → archive (todo cerrado) no
  // aparece en Activos. "Todos" sí ve el histórico completo de 90 días sim retenidos.
  const allWos = [...game.workOrders, ...(game.archive?.workOrders || [])];
  for (const wo of allWos) {
    const tpl = game.templates.find(t => t.id === wo.templateId) || game.dailyCheckTemplates?.find?.(t => t.id === wo.templateId);
    const isDaily = wo.templateId?.startsWith?.("DC-");
    if (isDaily) continue; // agrupados abajo, no entries sueltas
    const isDeferred = wo.phase === "Deferred";
    const isClosed = wo.phase === "Completed" || wo.phase === "Failed";
    const isFinding = wo.parentWoInstanceId !== undefined;
    const ap = airplaneByInstance(wo.airplaneInstanceId); // lookup también en archive
    events.push({
      kind: "wo",
      id: wo.instanceId,
      sortMinute: wo.emissionMinute,
      open: !isClosed,
      icon: tpl?.isAOG ? "🛑" : isFinding ? "🔍" : isDeferred ? "📋" : "🔧",
      // Pivot iteración 2026-05-24: title con chips clickables. La matrícula abre modal
      // flota, el tipo abre modal tipo. La card en sí abre modal WO (data-wo).
      title: \`<span class="clickable-chip mono" data-fleet-reg="\${esc(wo.airplaneRegistration)}" title="Detalle \${esc(wo.airplaneRegistration)}"><strong>\${esc(wo.airplaneRegistration)}</strong></span>\${ap ? \` <span class="clickable-chip muted" data-airplane-type="\${ap.model}/\${ap.engineVariant}" title="Detalle \${ap.model}/\${ap.engineVariant}">\${ap.model}/\${ap.engineVariant}</span>\` : ''} · \${esc(tpl?.description?.slice(0,55) ?? wo.templateId)}\${isFinding ? ' (finding)' : ''}\`,
      phase: wo.phase,
      meta: [
        \`ATA \${tpl?.ata ?? "?"}\`,
        \`\${tpl?.requiredCategory ?? "?"}\`,
        \`SLA \${wo.slaMinute - game.clock.minute}m\`,
        inferAssignmentStatus(wo, tpl, ap),
      ],
      clickWoId: wo.instanceId,
    });
  }
  // Daily check: AGRUPADO por avión (un solo entry con subtareas X/Y, no N cards sueltas).
  // Una pernocta → un daily check → N subtareas internas (las DC-* del sim).
  // Pivot 2026-05-25 — Archive: itera ambas listas para conservar histórico de dailies cerrados.
  const dailyByAirplane = new Map();
  for (const wo of allWos) {
    if (!wo.templateId?.startsWith?.("DC-")) continue;
    const ap = airplaneByInstance(wo.airplaneInstanceId); // lookup activos + archive
    if (!ap) continue;
    const key = ap.instanceId;
    if (!dailyByAirplane.has(key)) dailyByAirplane.set(key, { ap, wos: [] });
    dailyByAirplane.get(key).wos.push(wo);
  }
  for (const { ap, wos } of dailyByAirplane.values()) {
    // Ordenar subtareas por templateId (DC-001, DC-002, ...) para visualizar consistente
    wos.sort((a, b) => (a.templateId || "").localeCompare(b.templateId || ""));
    const completed = wos.filter(w => w.phase === "Completed").length;
    const failed = wos.filter(w => w.phase === "Failed").length;
    const total = wos.length;
    const isClosed = completed + failed === total;
    const sortMin = Math.min(...wos.map(w => w.emissionMinute));
    const assignedSet = new Set();
    for (const w of wos) for (const id of w.assignedMechanicIds) assignedSet.add(id);
    const bookHours = wos.reduce((s, w) => {
      const tpl = game.dailyCheckTemplates?.find?.(t => t.id === w.templateId) || game.templates.find(t => t.id === w.templateId);
      return s + (tpl?.durationMinutes ?? 0) / 60;
    }, 0);
    // Phase agregado del daily — mira fases reales de las subtareas
    const anyActive = wos.some(w => w.phase === "MainTask" || w.phase === "Test" || w.phase === "Rework" || w.phase === "Inspection");
    const anyAssigned = assignedSet.size > 0;
    const aggPhase = isClosed ? (failed > 0 ? "Failed" : "Completed")
      : anyActive ? "InProgress"
      : anyAssigned ? "ToPlane"
      : "Pending";
    // Nombres de mecs asignados (no solo count)
    const assignedNames = [...assignedSet]
      .map(id => game.mechanics.find(m => m.id === id)?.name)
      .filter(Boolean);
    events.push({
      kind: "daily",
      id: \`DC-\${ap.registration}\`,
      sortMinute: sortMin,
      open: !isClosed,
      icon: "🌙",
      // Pivot iteración 2026-05-24: title con chips clickables (matrícula → modal flota,
      // tipo → modal tipo). El title se interpola sin esc() en el render, permitiendo HTML.
      // El click neutro sobre la card abre el modal daily detallado (vía clickDailyAirplaneId).
      title: \`<span class="clickable-chip mono" data-fleet-reg="\${esc(ap.registration)}" title="Detalle \${esc(ap.registration)}"><strong>\${esc(ap.registration)}</strong></span> <span class="clickable-chip muted" data-airplane-type="\${ap.model}/\${ap.engineVariant}" title="Detalle \${ap.model}/\${ap.engineVariant}">\${ap.model}/\${ap.engineVariant}</span> · Daily check · \${completed}/\${total} subtareas\`,
      phase: aggPhase,
      meta: [
        \`book \${bookHours.toFixed(1)}h\`,
        assignedNames.length === 0 ? "⚠️ sin B1 idle" : \`👤 \${esc(assignedNames.join(", "))}\`,
        failed > 0 ? \`\${failed} subtarea\${failed>1?'s':''} failed\` : null,
      ].filter(Boolean),
      clickDailyAirplaneId: ap.instanceId, // click neutro → modal daily detallado
      // Pivot iteración 2026-05-24: stepper de subtareas (no de fases) — cada step
      // = una DC-* WO. Visual: done verde · active azul con % · pending gris · failed rojo.
      subtaskBar: wos,
    });
  }
  // A/C/D checks
  for (const c of game.maintenanceChecks) {
    const isOpen = c.phase === "Scheduled" || c.phase === "InProgress";
    // Modelo para el chip de tipo: lo derivamos del FleetAircraft (matrícula → model+engine)
    const fa = game.fleet.find(f => f.registration === c.registration);
    events.push({
      kind: "check",
      id: c.instanceId,
      sortMinute: c.scheduledMinute,
      open: isOpen,
      icon: "🛠️",
      // Pivot iteración 2026-05-24: matrícula y tipo clickables. La card abre modal check.
      title: \`<span class="clickable-chip mono" data-fleet-reg="\${esc(c.registration)}" title="Detalle \${esc(c.registration)}"><strong>\${esc(c.registration)}</strong></span>\${fa ? \` <span class="clickable-chip muted" data-airplane-type="\${fa.model}/\${fa.engineVariant}" title="Detalle \${fa.model}/\${fa.engineVariant}">\${fa.model}/\${fa.engineVariant}</span>\` : ''} · \${c.type}-check\${c.nightStarted ? " 🌙" : ""}\${c.onPlatform ? " ⛅" : ""}\`,
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
  events.forEach(enrichEvent);
  events.sort((a, b) => b.sortMinute - a.sortMinute);
  return events;
}

// ── Rediseño CIC (2026-05-30): enriquecimiento estructurado para sitbar + evCard.
// No rompe title/meta (se conservan como fallback). Deriva los campos que el feed
// nuevo necesita (handoff §2: conservar buildEventFeed como fuente y mapear a evCard).
function airlineForAirplane(ap){
  if (!ap) return null;
  const c = game.contracts.find(cc => cc.id === ap.contractId);
  if (!c) return null;
  const a = game.airlines.find(x => x.id === c.airlineId);
  return a ? { code: a.iataCode, name: a.name, color: a.color || "#5a6577" } : null;
}
function airlineByReg(reg){
  const ap = (game.airplanes || []).find(a => a.registration === reg)
        || (game.archive?.airplanes || []).find(a => a.registration === reg);
  return airlineForAirplane(ap);
}
function enrichEvent(e){
  const now = game.clock.minute;
  if (e.kind === "wo"){
    const wo = workOrderByInstance(e.clickWoId);
    if (!wo) return;
    const tpl = game.templates.find(t => t.id === wo.templateId);
    const ap = airplaneByInstance(wo.airplaneInstanceId);
    const al = airlineForAirplane(ap);
    const closed = wo.phase === "Completed" || wo.phase === "Failed";
    const deferred = wo.phase === "Deferred";
    e.reg = wo.airplaneRegistration;
    e.model = ap?.model; e.eng = ap?.engineVariant;
    e.alCode = al?.code; e.alName = al?.name; e.alColor = al?.color;
    e.stand = ap?.standId; e.flight = ap?.nextDepartureCallsign || ap?.arrivalCallsign || null;
    e.ata = tpl?.ata; e.cat = tpl?.requiredCategory; e.sev = tpl?.severity || "Minor";
    e.aog = !!tpl?.isAOG;
    e.slaMin = (closed || deferred) ? null : (wo.slaMinute - now);
    e.melCategory = melCat(tpl);
    e.melDays = (deferred && wo.deferralExpiryMinute != null) ? Math.max(0, Math.ceil((wo.deferralExpiryMinute - now)/S.DAY_MINUTES)) : null;
    e.parts = tpl?.partsRequired || []; e.tools = tpl?.toolsRequired || [];
    e.descShort = tpl?.description || wo.templateId; e.amm = tpl?.notes || null;
    e.phasePctVal = phasePct(wo);
    e.team = wo.assignedMechanicIds.slice();
    e.assignState = deferred ? "deferred"
      : closed ? "done"
      : e.team.length > 0 ? (wo.phase === "ToPlane" ? "travel" : "working")
      : "unassigned";
    if (e.assignState === "unassigned") e.hint = inferAssignmentStatus(wo, tpl, ap).replace(/^⚠️\\s*/, "");
  } else if (e.kind === "daily"){
    const ap = airplaneByInstance(e.clickDailyAirplaneId);
    const wos = e.subtaskBar || [];
    const al = airlineForAirplane(ap);
    const team = [...new Set(wos.flatMap(w => w.assignedMechanicIds))];
    const anyActive = wos.some(w => ["MainTask","Test","Rework","Inspection"].includes(w.phase));
    const closed = e.open === false;
    e.reg = ap?.registration; e.model = ap?.model; e.eng = ap?.engineVariant;
    e.alCode = al?.code; e.alName = al?.name; e.alColor = al?.color;
    e.stand = ap?.standId; e.flight = ap?.arrivalCallsign || null;
    e.ata = 5; e.cat = "B1"; e.sev = "Minor"; e.aog = false;
    e.slaMin = null; e.team = team;
    e.assignState = closed ? "done" : anyActive ? "working" : team.length > 0 ? "travel" : "unassigned";
    if (e.assignState === "unassigned") e.hint = "sin B1 idle";
    e.descShort = "Daily check pernocta";
  } else if (e.kind === "check"){
    const c = game.maintenanceChecks.find(x => x.instanceId === e.clickCheckId);
    if (!c) return;
    const al = airlineByReg(c.registration);
    e.reg = c.registration; e.alCode = al?.code; e.alName = al?.name; e.alColor = al?.color;
    e.stand = c.standId; e.sev = "base"; e.aog = false; e.cat = "B1/B2";
    e.team = c.assignedMechanicIds.slice();
    const closed = !(c.phase === "Scheduled" || c.phase === "InProgress");
    e.assignState = closed ? "done" : e.team.length > 0 ? "working" : "unassigned";
    e.slaMin = null; e.descShort = c.type + "-check";
  } else {
    // randomEvent / audit: cards de evento (sin SLA, sin asignación)
    e.sev = e.kind === "randomEvent" ? "Major" : "Minor";
    e.aog = false; e.slaMin = null; e.assignState = null;
  }
}

// Pivot iteración 2026-05-24: stepper de subtareas para daily check (WP que agrupa WOs).
// Cada step = una DC-* WO. Done verde, active azul con %, pending gris, failed rojo.
function renderSubtaskStepper(wos) {
  let html = '<div class="phase-stepper">';
  for (const w of wos) {
    let cls = "pending";
    let pct = 0;
    if (w.phase === "Completed") cls = "done";
    else if (w.phase === "Failed") cls = "failed";
    else if (w.phase === "MainTask" || w.phase === "Test" || w.phase === "Rework" || w.phase === "Inspection") {
      cls = "active";
      const tpl = game.dailyCheckTemplates?.find?.(t => t.id === w.templateId) || game.templates.find(t => t.id === w.templateId);
      if (tpl) {
        const r = game.balance.phaseDurationRatios;
        const d = tpl.durationMinutes;
        const phaseDur = w.phase === "Inspection" ? d * r.inspection
          : w.phase === "MainTask" ? d * r.mainTask
          : w.phase === "Test" ? d * r.test
          : w.phase === "Rework" ? d * r.rework
          : d;
        pct = phaseDur > 0 ? Math.min(100, (w.phaseElapsedMinutes / phaseDur) * 100) : 0;
      }
    } else if (w.phase === "ToPlane") {
      cls = w.assignedMechanicIds.length > 0 ? "active" : "pending";
      pct = 0;
    }
    const label = (w.templateId || "").replace("DC-", "");
    html += \`<div class="phase-step \${cls}" style="--pct:\${pct.toFixed(0)}%"><span class="lbl">\${label}</span></div>\`;
  }
  html += '</div>';
  return html;
}

// Pivot línea pura · iteración 2026-05-24: stepper visual de fases del WO.
// Mapeo del state machine sim → labels operacionales del MRO real:
//  ToPlane → Travel · Inspection → T-shoot · MainTask → Fix · Test → Test · Completed → Release.
// Daily checks (DC-*) y check A/C/D no usan este stepper (lo skipean).
function renderPhaseStepper(wo, tpl){
  if (tpl?.id?.startsWith?.("DC-")) return ""; // daily check subtask: no stepper
  const phases = [
    { key: "ToPlane",    label: "Travel" },
    { key: "Inspection", label: "T-shoot" },
    { key: "MainTask",   label: "Fix" },
    { key: "Test",       label: "Test" },
    { key: "Completed",  label: "Release" },
  ];
  const cur = wo.phase;
  const isFailed = cur === "Failed";
  const isDeferred = cur === "Deferred";
  if (isDeferred) {
    return '<div class="phase-stepper"><div class="phase-step done" style="background:var(--warning);border-color:var(--warning)"><span class="lbl" style="color:var(--warning)">📋 Diferido (MEL)</span></div></div>';
  }
  // Index de la fase actual
  let curIdx = phases.findIndex(p => p.key === cur);
  if (cur === "Rework") curIdx = phases.findIndex(p => p.key === "MainTask"); // rework = re-fix
  // Progreso de la fase actual (0..1) — calculado con phaseElapsedMinutes vs duración esperada
  const phaseDuration = (() => {
    if (!tpl) return 1;
    const r = game.balance.phaseDurationRatios;
    const d = tpl.durationMinutes;
    return cur === "Inspection" ? d * r.inspection
      : cur === "MainTask" ? d * r.mainTask
      : cur === "Test" ? d * r.test
      : cur === "Rework" ? d * r.rework
      : cur === "ToPlane" ? (game.balance.officeToStandMinutes ?? 2)
      : d;
  })();
  const pct = phaseDuration > 0 ? Math.min(100, (wo.phaseElapsedMinutes / phaseDuration) * 100) : 0;
  let html = '<div class="phase-stepper">';
  phases.forEach((p, i) => {
    let cls = "pending";
    if (isFailed && i <= curIdx) cls = "failed";
    else if (i < curIdx) cls = "done";
    else if (i === curIdx && cur === "Completed") cls = "done";
    else if (i === curIdx) cls = "active";
    html += \`<div class="phase-step \${cls}" style="--pct:\${pct.toFixed(0)}%"><span class="lbl">\${p.label}</span></div>\`;
  });
  html += '</div>';
  return html;
}

// Rediseño CIC (2026-05-30): el nombre legacy renderHangarEventTracking se conserva
// (lo llamaba renderOperations) pero ahora delega al feed CIC con sitbar + variantes.
function renderHangarEventTracking(){ return renderEventFeed(); }

// ── helpers de presentación del feed CIC ──
const PHASE_LABELS = [["ToPlane","Travel"],["Inspection","T-shoot"],["MainTask","Fix"],["Test","Test"],["Completed","Release"]];
function groupOf(e){
  if (!e.open) return "closed";
  if (e.aog) return "aog";
  if (e.kind === "randomEvent" || e.kind === "audit" || e.assignState === "deferred") return "scheduled";
  if (e.assignState === "unassigned") return "risk";
  return "progress";
}
function slaInfo(e){
  const m = e.slaMin;
  if (m == null) return { none: true };
  const pct = Math.max(4, Math.min(100, (m / 120) * 100));
  let c = "var(--ok)";
  if (m <= 30) c = "var(--bad)"; else if (m <= 60) c = "var(--warn)"; else if (m <= 90) c = "var(--accent)";
  return { pct, color: c, mins: m, overdue: m <= 0 };
}
function sevClassOf(e){ return e.aog ? "sev-aog" : ("sev-" + (e.sev || "Minor")); }
function ledColorOf(e){
  const g = groupOf(e);
  return g==="aog"?"var(--aog)":g==="risk"?"var(--warn)":g==="progress"?"var(--accent)":g==="closed"?"var(--ok)":"var(--base)";
}
function evDataAttr(e){
  return e.clickWoId ? \`data-wo="\${esc(e.clickWoId)}"\`
    : e.clickCheckId ? \`data-check-id="\${esc(e.clickCheckId)}"\`
    : e.clickDailyAirplaneId ? \`data-daily-airplane="\${esc(e.clickDailyAirplaneId)}"\`
    : "";
}
function asgPill(e){
  const a = e.assignState;
  if (!a) return "";
  const names = (e.team || []).map(id => { const m = game.mechanics.find(x => x.id === id); return m ? m.name.split(" ")[0] : id; }).join(", ");
  if (a === "unassigned"){
    const crit = e.aog || e.sev === "Critical" || (e.slaMin != null && e.slaMin <= 45);
    return \`<span class="asg unassigned \${crit?'crit':''}"><span class="led" style="background:currentColor"></span>SIN ASIGNAR\${e.hint?\` · \${esc(e.hint)}\`:""}</span>\`;
  }
  if (a === "working") return \`<span class="asg working"><span class="led" style="background:currentColor"></span>EQUIPO · \${esc(names)}</span>\`;
  if (a === "travel")  return \`<span class="asg travel"><span class="led" style="background:currentColor"></span>EN TRÁNSITO · \${esc(names)}</span>\`;
  if (a === "done")    return \`<span class="asg done"><span class="led" style="background:currentColor"></span>CERRADO\${names?\` · \${esc(names)}\`:""}</span>\`;
  if (a === "deferred")return \`<span class="asg deferred"><span class="led" style="background:currentColor"></span>DIFERIDO\${e.melCategory?\` · MEL \${esc(e.melCategory)}\`:""}\${e.melDays!=null?\` (\${e.melDays}d)\`:""}</span>\`;
  return "";
}
function evStepper(e){
  if (e.kind === "wo" && e.clickWoId){
    const w = workOrderByInstance(e.clickWoId);
    const tpl = w ? game.templates.find(t => t.id === w.templateId) : null;
    if (w && tpl) return renderPhaseStepper(w, tpl);
  } else if (e.kind === "daily" && e.subtaskBar){
    return renderSubtaskStepper(e.subtaskBar);
  }
  return "";
}
function evRing(e){
  const sla = slaInfo(e);
  if (sla.none) return \`<div class="evt-side no-sla">SIN<br>SLA</div>\`;
  return \`<div class="evt-side \${sla.overdue?'overdue':''}"><div class="ring" style="--p:\${sla.pct};--c:\${sla.color}"><div class="rv"><b>\${sla.overdue?'+':''}\${Math.abs(sla.mins)}m</b><s>SLA</s></div></div><div class="sla-lbl">\${e.flight?esc(e.flight):"&nbsp;"}</div></div>\`;
}
function evDesc(e){ return esc(e.descShort || (e.title || "").replace(/<[^>]*>/g, "")); }
function evCard(e){
  const head = e.reg
    ? \`<span class="evt-reg">\${esc(e.reg)}</span>\${e.model?\`<span class="evt-type">\${esc(e.model)}/\${esc(e.eng)}</span>\`:""}\${e.alName?\`<span class="al-tab"><span class="al-dot" style="background:\${e.alColor||'#5a6577'}"></span>\${esc(e.alName)}</span>\`:""}\`
    : \`<span class="evt-reg" style="font-family:var(--disp);font-size:.86rem">\${evDesc(e).split("—")[0]}</span>\`;
  const tags = [
    e.ata!=null?\`<span class="tag ata">ATA \${e.ata}</span>\`:"",
    e.cat?\`<span class="tag cat">\${esc(e.cat)}</span>\`:"",
    (e.sev&&e.sev!=="Minor"&&e.sev!=="base")?\`<span class="tag sev-\${e.sev}">\${esc(e.sev)}</span>\`:"",
    e.stand?\`<span class="tag stand">Stand <b>\${esc(e.stand)}</b></span>\`:"",
    (e.assignState==="deferred"&&e.melCategory)?\`<span class="tag mel">MEL \${esc(e.melCategory)}</span>\`:"",
  ].join("");
  const led = ledColorOf(e);
  return \`<article class="evt \${sevClassOf(e)} st-\${groupOf(e)}\${e.assignState==='deferred'?' st-deferred':''}" \${evDataAttr(e)}>
    <div class="rail"></div>
    <div class="evt-main">
      <div class="evt-top"><span class="evt-led" style="background:\${led};box-shadow:0 0 8px \${led}"></span><span class="evt-kind">\${e.icon}</span>\${head}<span class="evt-time mono">\${fmtClock(e.sortMinute)}</span></div>
      <div class="evt-desc">\${evDesc(e)}</div>
      <div class="evt-tags">\${tags}\${asgPill(e)}</div>
      \${evStepper(e)}
    </div>
    \${evRing(e)}
  </article>\`;
}
const FEED_GROUPS = [
  {k:"aog", lbl:"AOG · Atención inmediata", cls:"g-aog"},
  {k:"risk", lbl:"En riesgo · Sin asignar", cls:"g-risk"},
  {k:"progress", lbl:"En curso", cls:"g-progress"},
  {k:"scheduled", lbl:"Programado / diferido", cls:"g-scheduled"},
  {k:"closed", lbl:"Cerrado hoy", cls:"g-closed"},
];
function scopedFeed(){
  const feed = buildEventFeed();
  const todayStart = (currentGameDay() - 1) * S.DAY_MINUTES;
  return eventFilter === "all" ? feed : feed.filter(e => e.open || e.sortMinute >= todayStart);
}
function applySitFilter(list){
  if (!sitFilter) return list;
  if (sitFilter === "ground") return list.filter(e => e.open && e.stand);
  if (sitFilter === "aog") return list.filter(e => e.aog && e.open);
  if (sitFilter === "unassigned") return list.filter(e => e.assignState === "unassigned");
  if (sitFilter === "risk") return list.filter(e => e.open && e.slaMin != null && e.slaMin <= 45);
  if (sitFilter === "progress") return list.filter(e => ["working","travel"].includes(e.assignState));
  if (sitFilter === "closed") return list.filter(e => !e.open);
  return list;
}
function feedTriage(list){
  let h = "";
  for (const g of FEED_GROUPS){
    const items = list.filter(e => groupOf(e) === g.k);
    if (!items.length) continue;
    h += \`<div class="grp-head \${g.cls}"><span class="gdot"></span>\${g.lbl}<span class="gline"></span><span class="gcount">\${items.length}</span></div>\`;
    h += \`<div class="feed">\${items.map(evCard).join("")}</div>\`;
  }
  return h || '<div class="empty">Sin eventos en este filtro.</div>';
}
function teleRow(e){
  const sla = slaInfo(e);
  const slaCell = sla.none
    ? \`<div class="slabar"><div class="sl-top"><span>—</span></div></div>\`
    : \`<div class="slabar"><div class="sl-top"><span>SLA</span><span style="color:\${sla.color}">\${sla.overdue?'+':''}\${Math.abs(sla.mins)}m</span></div><div class="sl-track"><div class="sl-fill" style="width:\${sla.pct}%;background:\${sla.color}"></div></div></div>\`;
  let curIdx = PHASE_LABELS.findIndex(p => p[0] === e.phase); if (e.phase==="Completed") curIdx=4; if (e.phase==="Rework") curIdx=2;
  const dots = (e.kind==="randomEvent"||e.kind==="audit"||e.assignState==="deferred") ? "" : \`<div class="tdots">\${PHASE_LABELS.map((p,i)=>\`<i class="\${i<curIdx?'done':i===curIdx?'active':''}"></i>\`).join("")}</div>\`;
  const led = ledColorOf(e);
  return \`<div class="trow \${sevClassOf(e)} st-\${groupOf(e)}" \${evDataAttr(e)}>
    <span class="tled" style="background:\${led};box-shadow:0 0 8px \${led}"></span>
    <span class="ttime">\${fmtClock(e.sortMinute)}</span>
    <span class="treg">\${esc(e.reg||"—")}<small>\${esc(e.model||e.alCode||"")}</small></span>
    <span class="tdesc">\${evDesc(e)}</span>
    \${slaCell}
    <span>\${asgPill(e)}</span>
    \${dots}
  </div>\`;
}
function feedTele(list){
  const ord = {aog:0,risk:1,progress:2,scheduled:3,closed:4};
  const sorted = list.slice().sort((a,b)=> (ord[groupOf(a)]-ord[groupOf(b)]) || ((a.slaMin??9999)-(b.slaMin??9999)));
  return sorted.length ? \`<div class="tele">\${sorted.map(teleRow).join("")}</div>\` : '<div class="empty">Sin eventos en este filtro.</div>';
}
function bCard(e){
  const led = ledColorOf(e);
  return \`<div class="bcard \${sevClassOf(e)}" \${evDataAttr(e)}>
    <div class="bc-top"><span class="evt-led" style="background:\${led};box-shadow:0 0 7px \${led}"></span><span class="bc-reg">\${esc(e.reg||"—")}</span>\${e.alColor?\`<span class="al-dot" style="background:\${e.alColor}"></span>\`:""}<span class="bc-time">\${fmtClock(e.sortMinute)}</span></div>
    <div class="bc-desc">\${evDesc(e)}</div>
    <div class="bc-foot">\${(e.sev&&e.sev!=="Minor"&&e.sev!=="base")?\`<span class="tag sev-\${e.sev}">\${esc(e.sev)}</span>\`:\`<span class="tag ata">ATA \${e.ata??"—"}</span>\`}\${asgPill(e)}</div>
  </div>\`;
}
function feedBoard(list){
  const cols = [
    {cls:"unassigned", lbl:"Sin asignar", color:"var(--warn)", items:list.filter(e=>e.open && e.assignState==="unassigned")},
    {cls:"progress", lbl:"En curso", color:"var(--accent)", items:list.filter(e=>e.open && ["working","travel","deferred"].includes(e.assignState))},
    {cls:"closed", lbl:"Cerrado / evento", color:"var(--ok)", items:list.filter(e=>!e.open || e.kind==="randomEvent")},
  ];
  return \`<div class="board">\${cols.map(c=>\`<div class="col \${c.cls}"><div class="col-head"><span class="cdot" style="background:\${c.color};color:\${c.color}"></span>\${c.lbl}<span class="cn">\${c.items.length}</span></div><div class="col-body">\${c.items.map(bCard).join("")||'<div class="empty" style="padding:1rem">—</div>'}</div></div>\`).join("")}</div>\`;
}
function renderSitbar(feed){
  const open = feed.filter(e => e.open);
  const todayStart = (currentGameDay()-1)*S.DAY_MINUTES;
  const ground = new Set(open.filter(e => e.stand).map(e => e.reg).filter(Boolean)).size;
  const aog = open.filter(e => e.aog).length;
  const unassigned = feed.filter(e => e.assignState === "unassigned").length;
  const risk = open.filter(e => e.slaMin != null && e.slaMin <= 45).length;
  const progress = open.filter(e => ["working","travel"].includes(e.assignState)).length;
  const closed = feed.filter(e => !e.open && e.sortMinute >= todayStart && e.kind!=="randomEvent" && e.kind!=="audit").length;
  const tiles = [
    {k:"ground", cls:"c-ground", num:ground, lbl:"🅿️ En tierra"},
    {k:"aog", cls:"c-aog", num:aog, lbl:"AOG", led:"var(--aog)", pulse:aog>0},
    {k:"unassigned", cls:"c-unassigned", num:unassigned, lbl:"Sin asignar", led:"var(--warn)"},
    {k:"risk", cls:"c-risk", num:risk, lbl:"SLA en riesgo", led:"var(--bad)", pulse:risk>0},
    {k:"progress", cls:"c-progress", num:progress, lbl:"En curso", led:"var(--accent)"},
    {k:"closed", cls:"c-closed", num:closed, lbl:"Cerradas hoy", led:"var(--ok)"},
  ];
  const tilesHtml = tiles.map(t => \`<div class="tile \${t.cls} \${sitFilter===t.k?'sel':''}" data-sit-filter="\${t.k}"><div class="tnum">\${t.num}</div><div class="tlbl">\${t.led?\`<span class="led \${t.pulse?'pulse':''}" style="color:\${t.led};background:\${t.led}"></span>\`:""}\${t.lbl}</div></div>\`).join("");
  const aogE = feed.find(e => e.aog && e.open);
  const crit = feed.filter(e => e.assignState==="unassigned" && (e.sev==="Critical"||e.sev==="Major") && e.slaMin!=null && e.slaMin<=45);
  let sum = "";
  if (aogE) sum += \`<span class="sig">PRIORIDAD</span> <b>AOG</b> en <span class="reg">\${esc(aogE.reg||"—")}</span> bloquea <b>\${esc(aogE.flight||aogE.descShort||"")}</b>\`;
  if (crit.length) sum += \` \${aogE?'· ':''}<b>\${crit.length} callout\${crit.length>1?'s':''}</b> sin técnico con SLA &lt;45 min\`;
  return \`<div class="sitbar"><div class="sit-tiles">\${tilesHtml}</div><div class="sit-summary">\${sum||"Operación estable — sin alertas activas."}</div></div>\`;
}
function renderEventFeed(){
  const scoped = scopedFeed();
  const list = applySitFilter(scoped);
  let h = renderSitbar(scoped);
  h += \`<div class="vswitch" style="margin:.2rem 0 .7rem;width:max-content">
    <button class="\${eventFilter==='open'?'active':''}" data-event-filter="open">Activos</button>
    <button class="\${eventFilter==='all'?'active':''}" data-event-filter="all">Histórico</button>
    \${sitFilter?\`<button data-sit-filter="\${sitFilter}" style="color:var(--warn)">✕ filtro: \${sitFilter}</button>\`:""}
  </div>\`;
  h += variant==="tele" ? feedTele(list) : variant==="board" ? feedBoard(list) : feedTriage(list);
  return h;
}

// Pivot línea pura · iteración 2026-05-24: tab Operaciones = SOLO Event Tracking
// (vista unificada de TODO lo que pasa en tiempo real). Las subtabs Flota / Deferrals
// / Base Checks se eliminan:
//  - Flota: un MRO no tiene flota propia. La info de avión (FH/FC, modelo,
//    type rating, histórico checks) es accesible clicando una matrícula en el
//    Event Tracking → abre modal con todos los datos técnicos.
//  - Deferrals: las WO diferidas ya viven en Event Tracking marcadas como open.
//  - Base Checks: los A/C/D están deshabilitados por ahora (callouts only).
//    Cuando se reactiven, vivirán como eventos en Event Tracking.
function renderOperations(){
  let h = \`<div class="eyebrow">Centro de control · Tiempo real</div>
    <div class="title-row"><div><h1>Operaciones</h1><div class="sub">EVENT TRACKING · feed cronológico unificado — OVD/LEAS</div></div>
    <div class="vswitch">
      <button data-variant="triage" class="\${variant==='triage'?'active':''}"><span class="vk">A</span>Triaje</button>
      <button data-variant="tele" class="\${variant==='tele'?'active':''}"><span class="vk">B</span>Telemetría</button>
      <button data-variant="board" class="\${variant==='board'?'active':''}"><span class="vk">C</span>Tablero</button>
    </div></div>\`;
  h += renderEventFeed();
  return h;
}

function renderCoverageGantt(){
  // Rediseño CIC (2026-05-30): cobertura 24h como 3 bandas legibles (no "mar de rojo"
  // de celdas 0/1) con conteo grande, marcador "ahora" y leyenda que explica que la
  // noche a 0 es normal sin contrato de pernocta. Nominal = plantilla por turno (incl.
  // OffShift como capacidad del turno, sin TMA).
  const nominal = { morning: 0, afternoon: 0, night: 0 };
  for (const m of game.mechanics) {
    if (m.isLeadForeman) continue; // TMA no cuenta (no asignable a WOs)
    const s = m.shift ?? "morning";
    if (s in nominal) nominal[s]++;
  }
  const C = { morning: "var(--warn)", afternoon: "var(--accent)", night: "var(--base)" };
  const minOfDay = game.clock.minute % S.DAY_MINUTES;
  const nowPct = (minOfDay / 1440) * 100;
  const band = (k, emoji, lbl) => \`<div class="cov-band"><div class="cb-fill" style="background:linear-gradient(180deg,\${C[k]}33,\${C[k]}11)"></div><span class="cb-l">\${emoji} \${lbl} <b class="\${nominal[k]===0?'zero':''}">\${nominal[k]}</b></span></div>\`;
  return \`<div class="cov">
    <div class="cov-head"><span class="ck">Cobertura 24h</span><span class="cov-now-lbl mono">▾ ahora \${fmtClock(game.clock.minute)}</span></div>
    <div class="cov-track">\${band('morning','☀️','Mañana')}\${band('afternoon','🌅','Tarde')}\${band('night','🌙','Noche')}<div class="cov-now" style="left:\${nowPct}%"></div></div>
    <div class="cov-legend"><span><b class="zero">0</b> sin cobertura</span><span class="dim">·</span><span>Sin contrato de pernocta nocturna, la noche puede ir a 0 sin penalización</span></div>
  </div>\`;
}

// ===========================================================================
// Pivot iteración 2026-05-24 — Oficina (antes "Mecánicos")
// ===========================================================================
// La oficina del MRO es la sede física donde están los mecs entre WOs (van/vuelven
// del avión vía Travel). En lineMode tiene cap MECHANIC_CAP_INITIAL (5) hasta que
// se desbloqueen hangares en endgame. Esta vista agrupa: detalle de la oficina
// (capacidad, salarios totales, cobertura, moral media) + lista de mecánicos.
// ===========================================================================
// Pivot iteración 2026-05-25 — Management (políticas operativas de la oficina)
// ===========================================================================
// Toggles + selects que el jugador configura una vez como "normas de la casa".
// El sim las consulta cada tick. Defaults sensatos para que la partida funcione
// sin tocar nada, pero el jugador puede afinar para reducir micromanagement
// (auto-assign, MEL auto-defer) o pagar más por agilidad (overtime auto).
function renderOfficeManagement(){
  const m = game.management ?? { autoAssignTrivial: true, melAutoDefer: "never", overtimeAutoCall: false };
  // Auto-pausa también lo exponemos aquí aunque el toggle del HUD siga funcionando
  const ap = !!game.autoPauseEnabled;

  let h = '<h3 style="margin-top:0">⚙️ Management · Normas operativas</h3>';
  h += '<p class="muted" style="margin-bottom:1rem;font-size:.88rem">Configura cómo el equipo de la oficina actúa <strong>sin tu intervención</strong>. Cada política es una regla del MRO que el sim aplica cada tick. Defaults: el juego es jugable sin tocar nada, pero puedes afinar para reducir micromanagement o pagar más por agilidad operativa.</p>';

  // Card: auto-pause
  h += \`<div style="border:1px solid var(--border);border-radius:6px;padding:.7rem 1rem;margin-bottom:.6rem">
    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
      <input type="checkbox" data-mgmt-toggle="autoPause" \${ap ? "checked" : ""} style="width:18px;height:18px">
      <span>🚨 Auto-pausa en eventos críticos</span>
    </label>
    <p class="muted" style="margin:.3rem 0 0 1.7rem;font-size:.82rem">Cuando aparece una WO <strong>AOG</strong> o <strong>Critical</strong>, el reloj se pone automáticamente en pausa para que decidas. Útil al inicio; desactivable cuando ya juegas a 5x sin susto.</p>
  </div>\`;

  // Card: auto-assign trivial
  h += \`<div style="border:1px solid var(--border);border-radius:6px;padding:.7rem 1rem;margin-bottom:.6rem">
    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
      <input type="checkbox" data-mgmt-toggle="autoAssignTrivial" \${m.autoAssignTrivial ? "checked" : ""} style="width:18px;height:18px">
      <span>🤖 Auto-asignar WO al primer mec elegible</span>
    </label>
    <p class="muted" style="margin:.3rem 0 0 1.7rem;font-size:.82rem">Cuando una WO entra sin equipo y hay un B1/B2 Idle con type rating válido, el sim lo asigna automáticamente (greedy: primer match). Desactiva si quieres asignar manualmente cada caso (control total, más micro-management).</p>
  </div>\`;

  // Card: overtime auto-call
  h += \`<div style="border:1px solid var(--border);border-radius:6px;padding:.7rem 1rem;margin-bottom:.6rem">
    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
      <input type="checkbox" data-mgmt-toggle="overtimeAutoCall" \${m.overtimeAutoCall ? "checked" : ""} style="width:18px;height:18px">
      <span>⏱️ Hora extra automática si no hay mec disponible</span>
    </label>
    <p class="muted" style="margin:.3rem 0 0 1.7rem;font-size:.82rem">Cuando una WO necesita un certifier y todos los Idle están sin rating válido pero hay un OffShift con rating, llamarlo a hora extra automáticamente. <strong>Cuesta ~½ día de salario al terminar + moral -5</strong>. Salva aviones pero come margen.</p>
  </div>\`;

  // Card: MEL auto-defer policy
  h += \`<div style="border:1px solid var(--border);border-radius:6px;padding:.7rem 1rem;margin-bottom:.6rem">
    <div style="font-weight:600;margin-bottom:.4rem">📋 Política de MEL auto-defer</div>
    <p class="muted" style="margin:.2rem 0 .6rem 0;font-size:.82rem">El sim puede diferir WO automáticamente (firmando MEL) para liberar aviones que iban a entrar en retraso. Solo aplica a WO no-AOG, no-Critical, diferibles. Diferir siempre requiere un B1 idle con rating (firma el MEL); si no hay, la WO espera al siguiente B1 idle.</p>
    <div style="display:flex;flex-direction:column;gap:.3rem">
      \${[
        { val: "never", label: "Nunca", desc: "Solo tú decides desde el modal WO. Control total, más micromanagement." },
        { val: "ifWouldDelay", label: "Si el fix no cabe antes del departure ⭐ recomendado", desc: "Compara tiempo estimado de reparación con margen al despegue. Si va a retrasar igual → mejor diferir y liberar el avión. Si hay margen → intenta fix normal." },
        { val: "always", label: "Siempre que sea diferible", desc: "Agresivo: cualquier WO diferible se firma como MEL al instante. Aviones siempre libres, pero acumulas backlog de MEL pendientes." },
      ].map(opt => \`<label style="display:flex;align-items:flex-start;gap:.5rem;cursor:pointer;padding:.3rem .5rem;border:1px solid \${m.melAutoDefer === opt.val ? 'var(--accent)' : 'var(--border-s)'};border-radius:4px;background:\${m.melAutoDefer === opt.val ? 'rgba(77,163,255,.08)' : 'transparent'}">
        <input type="radio" name="mgmt-meldefer" value="\${opt.val}" \${m.melAutoDefer === opt.val ? "checked" : ""} data-mgmt-meldefer="\${opt.val}" style="margin-top:.15rem">
        <span><strong>\${opt.label}</strong><br><span class="muted" style="font-size:.78rem">\${opt.desc}</span></span>
      </label>\`).join("")}
    </div>
  </div>\`;

  h += '<p class="muted" style="margin-top:1rem;font-size:.78rem">💡 Estas decisiones forman parte del estilo de juego: minimal (todo manual, control total, slow), eficiente (auto-assign + auto-defer = el sim navega solo, tú solo intervienes en críticos), o agresivo (overtime + defer always = sales caro pero pierdes pocos aviones).</p>';
  return h;
}

function renderOffice(){
  const mechs = game.mechanics;
  const cap = S.MECHANIC_CAP_INITIAL ?? 5;
  const unlocked = typeof S.canUnlockHangars === "function" ? S.canUnlockHangars(game) : false;
  const capLabel = unlocked ? \`\${mechs.length} mecs (cap ampliado en endgame)\` : \`\${mechs.length}/\${cap}\`;
  const capPct = unlocked ? 100 : Math.min(100, (mechs.length / cap) * 100);
  const capCls = mechs.length >= cap && !unlocked ? "warn" : "primary";
  const totalSalary = mechs.reduce((s, m) => s + S.effectiveWeeklySalary(m), 0);
  const byShift = { morning: 0, afternoon: 0, night: 0, off: 0 };
  for (const m of mechs) {
    const s = m.shift ?? "morning";
    if (s in byShift) byShift[s]++;
  }
  const byBase = { B1: 0, B2: 0, Helper: 0, TMA: 0 };
  for (const m of mechs) {
    if (m.isLeadForeman) byBase.TMA++;
    else if (m.base === "B1") byBase.B1++;
    else if (m.base === "B2") byBase.B2++;
    else byBase.Helper++;
  }
  const avgMoral = mechs.length === 0 ? 0 : Math.round(mechs.reduce((s, m) => s + (m.moral ?? 70), 0) / mechs.length);
  const moralCls = avgMoral >= 70 ? "good" : avgMoral >= 40 ? "warn" : "bad";
  const inTraining = mechs.filter(m => m.activeTrainingUntilMinute && m.activeTrainingUntilMinute > game.clock.minute).length;
  const idleCount = mechs.filter(m => m.state === "Idle").length;
  const workingCount = mechs.filter(m => m.state === "Working" || m.state === "ToPlane" || m.state === "Returning").length;
  const offshiftCount = mechs.filter(m => m.state === "OffShift").length;

  let h = '<h2>🏢 Oficina</h2>';
  // Pivot iteración 2026-05-25: sub-tabs para no saturar la vista. "Equipo" = panel
  // operacional (capacidad + mecs + cobertura horaria). "Contratación" = pool de
  // candidatos (antes tab "Mercado" top-level). Conceptualmente todo es RRHH del MRO,
  // tiene sentido bajo un solo paraguas.
  const candCount = (game.candidates ?? []).length;
  h += \`<div class="subtabs" style="display:flex;gap:.5rem;margin-bottom:.75rem;border-bottom:1px solid var(--border);padding-bottom:.4rem">
    <button class="subtab\${officeSubtab === 'team' ? ' active' : ''}" data-office-subtab="team" style="padding:.3rem .8rem;background:\${officeSubtab === 'team' ? 'var(--accent)' : 'transparent'};color:\${officeSubtab === 'team' ? '#fff' : 'var(--text)'};border:1px solid var(--border);border-radius:4px;cursor:pointer">👷 Equipo</button>
    <button class="subtab\${officeSubtab === 'hiring' ? ' active' : ''}" data-office-subtab="hiring" style="padding:.3rem .8rem;background:\${officeSubtab === 'hiring' ? 'var(--accent)' : 'transparent'};color:\${officeSubtab === 'hiring' ? '#fff' : 'var(--text)'};border:1px solid var(--border);border-radius:4px;cursor:pointer">🤝 Contratación <span class="badge" style="margin-left:.3rem">\${candCount}</span></button>
    <button class="subtab\${officeSubtab === 'management' ? ' active' : ''}" data-office-subtab="management" style="padding:.3rem .8rem;background:\${officeSubtab === 'management' ? 'var(--accent)' : 'transparent'};color:\${officeSubtab === 'management' ? '#fff' : 'var(--text)'};border:1px solid var(--border);border-radius:4px;cursor:pointer">⚙️ Management</button>
  </div>\`;
  // Subseción "Contratación" delega a renderMarket (pool de candidatos)
  if (officeSubtab === "hiring") {
    h += renderMarket();
    return h;
  }
  // Subseción "Management" = normas operativas de la oficina
  if (officeSubtab === "management") {
    h += renderOfficeManagement();
    return h;
  }
  // === Resto = subseción "Equipo" === (rediseño CIC 2026-05-30: tiles + bandas + mcards)
  h += '<p class="muted" style="margin-bottom:.6rem">Sede física del MRO · OVD/LEAS · los técnicos esperan aquí y viajan al stand (~2 min). Click en una tarjeta para detalle, ratings y acciones (formar, turno, despedir).</p>';
  const transitCount = mechs.filter(m => m.state === "ToPlane" || m.state === "Returning").length;
  const workingOnly = mechs.filter(m => m.state === "Working").length;
  const moralLed = avgMoral >= 70 ? "var(--ok)" : avgMoral >= 40 ? "var(--warn)" : "var(--bad)";
  const offTiles = [
    {cls:"c-ground", num:capLabel, lbl:"👥 Plantilla"},
    {cls:"c-progress", num:workingOnly, lbl:"⚙️ En trabajo", led:"var(--accent)"},
    {cls:"c-unassigned", num:transitCount, lbl:"🚐 En tránsito", led:"var(--cyan)"},
    {cls:"c-closed", num:idleCount, lbl:"✅ Disponibles", led:"var(--ok)"},
    {cls:"c-aog", num:avgMoral, lbl:"🙂 Moral media", led:moralLed},
    {cls:"c-progress", num:\`\${(totalSalary/1000).toFixed(1)}k\`, lbl:"💼 €/sem"},
  ];
  h += \`<div class="sitbar" style="margin-bottom:.7rem"><div class="sit-tiles">\${offTiles.map(t=>\`<div class="tile \${t.cls}" style="cursor:default"><div class="tnum" style="\${typeof t.num==='string'&&t.num.length>4?'font-size:1.15rem':''}">\${t.num}</div><div class="tlbl">\${t.led?\`<span class="led" style="color:\${t.led};background:\${t.led}"></span>\`:""}\${t.lbl}</div></div>\`).join("")}</div></div>\`;
  h += renderCoverageGantt();
  // ===== mecánicos como tarjetas =====
  const SM = { Idle:{c:"#3fb950",l:"Disponible"}, Working:{c:"#4da3ff",l:"En trabajo"}, ToPlane:{c:"#3ad6c5",l:"En tránsito"}, Returning:{c:"#3ad6c5",l:"Regresando"}, OffShift:{c:"#586477",l:"Fuera de turno"}, Training:{c:"#a78bfa",l:"Formación"} };
  h += \`<div class="grp-head g-progress" style="margin-top:1.1rem"><span class="gdot"></span>Técnicos<span class="gline"></span><span class="gcount">\${capLabel}</span></div>\`;
  h += '<div class="mgrid">';
  for (const m of mechs) {
    const sm = SM[m.state] || { c:"#8b97ab", l:m.state };
    const ini = m.name.split(/\\s+/).map(w => w[0]).join("").slice(0,2).toUpperCase();
    const moral = m.moral ?? 70;
    const mcls = moral >= 70 ? "ok" : moral >= 40 ? "warn" : "bad";
    const effColor = m.efficiency >= 1.1 ? "var(--ok)" : m.efficiency < 1 ? "var(--warn)" : "var(--text)";
    let task;
    if (m.activeTrainingUntilMinute && m.activeTrainingUntilMinute > game.clock.minute)
      task = \`🎓 Formación · \${Math.max(0, Math.ceil((m.activeTrainingUntilMinute - game.clock.minute)/S.DAY_MINUTES))}d restantes\`;
    else if (m.assignedWoInstanceId){ const w = workOrderByInstance(m.assignedWoInstanceId); const tpl = w ? game.templates.find(t=>t.id===w.templateId) : null; task = \`<span class="mono" style="color:var(--accent-2)">\${esc(m.assignedWoInstanceId)}</span> · \${esc(tpl ? tpl.description.slice(0,38) : (w?w.airplaneRegistration:""))}\`; }
    else if (m.assignedCheckInstanceId) task = \`<span class="mono" style="color:var(--base)">\${esc(m.assignedCheckInstanceId)}</span> · check\`;
    else task = \`<span style="color:var(--dim)">Sin asignación · \${m.shift ?? "morning"}</span>\`;
    const canChangeShift = m.state === "Idle" || m.state === "OffShift";
    const shLbl = s => s==="morning"?"☀️ mañana":s==="afternoon"?"🌅 tarde":s==="night"?"🌙 noche":"💤 libre";
    const shiftHtml = canChangeShift
      ? \`<select class="shift-select" data-shift-mech="\${m.id}"><option value="morning"\${m.shift==="morning"?" selected":""}>☀️ mañana</option><option value="afternoon"\${m.shift==="afternoon"?" selected":""}>🌅 tarde</option><option value="night"\${m.shift==="night"?" selected":""}>🌙 noche</option><option value="off"\${m.shift==="off"?" selected":""}>💤 libre</option></select>\`
      : \`<span class="tag shift-\${m.shift==="afternoon"?"afternoon":m.shift==="night"?"night":m.shift==="off"?"off":"morning"}">\${shLbl(m.shift ?? "morning")}</span>\`;
    h += \`<article class="mcard" data-mech-id="\${m.id}" title="Click para detalle">
      <div class="mcard-top">
        <span class="mc-av">\${ini}</span>
        <div class="mc-id"><div class="mc-name">\${esc(m.name)}</div><div class="mc-base">\${m.id} · \${m.base ?? "Helper"}\${m.isLeadForeman?" · TMA":""}</div></div>
        <span class="mc-state" style="color:\${sm.c};border-color:\${sm.c}55;background:\${sm.c}1a"><span class="led" style="background:\${sm.c}"></span>\${sm.l}</span>
      </div>
      <div class="mc-task">\${task}</div>
      <div class="mc-bars">
        <div class="mc-metric"><span class="mk">Moral</span><div class="mc-bar"><div class="mc-fill \${mcls}" style="width:\${moral}%"></div></div><span class="mv mono">\${Math.round(moral)}</span></div>
        <div class="mc-metric"><span class="mk">Eff</span><span class="mv mono" style="color:\${effColor}">\${Number(m.efficiency).toFixed(2)}×</span></div>
      </div>
      <div class="mc-foot">\${shiftHtml}<span class="mono" style="color:var(--muted);font-size:.72rem">\${fmt(S.effectiveWeeklySalary(m))} €/sem\${m.shift==="night"?" ×1.5":""}</span></div>
    </article>\`;
  }
  return h + '</div>';
}

function renderMarket(){
  const candidates = game.candidates || [];
  // Pivot iteración 2026-05-25: renombrado a "Contratación" — vive como subseción de
  // Oficina. El h2 ya no se renderiza top-level (la cabecera la pone renderOffice).
  if (candidates.length === 0) return '<h3 style="margin-top:0">🤝 Contratación</h3><div class="empty">Pool vacío. Refresca tras unos días ingame.</div>';
  let h = \`<h3 style="margin-top:0">🤝 Contratación · \${candidates.length} candidato\${candidates.length===1?'':'s'}</h3>\`;
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
  // Pivot iteración 2026-05-25: usar S.tierLabel canónico para conocer todos los tiers
  // (incluido "line" del preset, que antes daba "undefined" en el badge). Fallback a
  // "Standard" si el tier es vacío/desconocido.
  const t = tier || "standard";
  const label = (typeof S.tierLabel === "function") ? S.tierLabel(t) : t;
  return \`<span class="tier-badge tier-\${t}">\${label}</span>\`;
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

  // Pivot iteración 2026-05-25 — Sección "Aerolíneas interesadas" (movida del Dashboard).
  // Aquí tiene más sentido conceptualmente: contratos activos + ofertas vivas + pipeline
  // de aerolíneas que potencialmente firmarán cuando subas el brand. Muestra el próximo
  // tick de competencia (cada 7 días) y, por aerolínea, distancia al umbral + condiciones
  // operativas (overnight → daily checks · sin overnight → solo callouts).
  const kpi = game.departureKPI ?? S.createDepartureKPI();
  const contractedRepsForBrand = game.contracts
    .filter(c => c.status === "active")
    .map(c => game.reputation.perAirline[c.airlineId] ?? 50);
  const brand = (typeof S.brandReputation === "function") ? S.brandReputation({
    totalDepartures: kpi.totalDepartures,
    totalOnTime: kpi.totalOnTime,
    totalAog: kpi.totalAog,
    contractedReps: contractedRepsForBrand,
  }) : 0;
  // Próximo tick = lineCompetitionLastTickMinute + 7d.
  const tickInterval = (S.LINE_COMPETITION_TICK_DAYS ?? 7) * S.DAY_MINUTES;
  const nextTickMinute = (game.lineCompetitionLastTickMinute ?? 0) + tickInterval;
  const minsToNextTick = Math.max(0, nextTickMinute - game.clock.minute);
  const daysToNext = Math.floor(minsToNextTick / S.DAY_MINUTES);
  const hoursToNext = Math.floor((minsToNextTick % S.DAY_MINUTES) / 60);
  const tickLabel = daysToNext > 0 ? \`\${daysToNext}d \${hoursToNext}h\` : \`\${hoursToNext}h\`;

  h += '<h3 style="margin-top:1.5rem">🌟 Aerolíneas interesadas (pipeline)</h3>';
  h += \`<p class="muted" style="margin-bottom:.5rem;font-size:.85rem">Tu <strong>brand del MRO</strong> = <strong style="color:\${brand >= 70 ? 'var(--success)' : brand >= 40 ? 'var(--warning)' : 'var(--muted)'}">\${brand}/100</strong> (50% rep media contratadas · 30% on-time · 20% (1-AOG)). El mercado se evalúa cada <strong>\${S.LINE_COMPETITION_TICK_DAYS ?? 7} días</strong> ingame. <strong>Próxima evaluación en \${tickLabel}</strong>. Si tu brand cruza el umbral de una aerolínea, ese tick puede ofertarte. Las condiciones (fee/payment/penalty) escalan con cuánto excedas su umbral. <strong>Aerolíneas sin overnight</strong> mandan solo callouts cuando un avión aterriza con problema (sin paquete daily).</p>\`;
  h += '<table style="font-size:.85rem">';
  h += '<thead><tr><th>Aerolínea</th><th>Arrivals/sem</th><th>🔄 Escalas</th><th>🌙 Pernoctas</th><th>Umbral brand</th><th>Estado</th></tr></thead><tbody>';
  // Tabla ordenada por threshold asc.
  const sorted = game.airlines.filter(a => a.iataCode).slice().sort((a,b) => (a.brandThreshold ?? 70) - (b.brandThreshold ?? 70));
  for (const a of sorted) {
    const t = a.brandThreshold ?? 70;
    const hasContract = game.contracts.some(c => c.airlineId === a.id && (c.status === "active" || c.status === "offered"));
    const meets = brand >= t;
    const status = hasContract ? '<span style="color:var(--success)">✓ ya contratada / oferta viva</span>' :
                   meets ? \`<span style="color:var(--success)">✅ puede ofertar (brand +\${brand - t} sobre umbral)</span>\` :
                   \`<span class="muted">⏳ faltan \${t - brand} pts brand</span>\`;
    // Pivot iteración 2026-05-25 — Pernoctas REALES desde overnightStats pre-calculadas
    // por process-airport-schedule.mjs (cuenta TODAS las matrículas que duermen y salen
    // mañana, no solo "última del día" como la heurística vieja que daba bug — feedback
    // Dani: VY BIO real son 4-6 aviones/noche, no 1).
    // El total de arrivals/sem viene del schedule. Pernoctas-aviones = overnightStats.
    // Escalas = arr - pernoctas (todo lo que no duerme es escala/turnaround).
    let totalArr = 0, pernoctas = 0, distinctOvnRegs = 0;
    try {
      for (let d = 1; d <= 7; d++) {
        const flights = (S.getFlightsForGameDay?.(d) ?? []).filter(f => f.airlineCode === a.iataCode);
        totalArr += flights.filter(f => f.type === "arrival").length;
      }
      // overnightStats está embebido en el schedule del aeropuerto activo
      const icao = game.airportIcao;
      const runtime = icao && S.DATA.airportRuntime?.[icao];
      const ovnStats = runtime?.schedule?.overnightStats?.[a.iataCode];
      if (ovnStats) {
        pernoctas = ovnStats.totalPerWeek;
        distinctOvnRegs = ovnStats.distinctRegs;
      }
    } catch (e) {}
    const escalas = Math.max(0, totalArr - pernoctas);
    h += \`<tr>
      <td><span style="display:inline-block;width:8px;height:8px;background:\${a.color};border-radius:50%;margin-right:.4rem"></span>\${esc(a.name)} <span class="mono muted">\${a.iataCode}</span></td>
      <td class="mono">\${totalArr}</td>
      <td class="mono">\${escalas}</td>
      <td class="mono"\${pernoctas > 0 ? ' style="color:var(--accent);font-weight:600"' : ''} title="\${pernoctas > 0 ? distinctOvnRegs + ' matrículas distintas rotando' : ''}">\${pernoctas}\${pernoctas > 0 ? ' 🌙' : ''}\${distinctOvnRegs > 1 ? ' <span class="muted" style="font-size:.7em">('+distinctOvnRegs+' regs)</span>' : ''}</td>
      <td class="mono"><strong>\${t}</strong></td>
      <td>\${status}</td>
    </tr>\`;
  }
  h += '</tbody></table>';
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

  // Pivot línea pura · Fase A modelo HH
  const hkpi = game.hoursKPI ?? S.createHoursKPI();
  const eff = S.getHoursEfficiencyGlobal(hkpi);
  const effColor = eff >= 1.0 ? "var(--success)" : eff >= 0.85 ? "var(--warning)" : "var(--danger)";
  const billedEur = Math.round(hkpi.totalBookHoursBilled * 60 * 1.0); // ref aproximada (rate avg)

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

  // Pivot iteración 2026-05-25 — Brand reputation del MRO (lo que las aerolíneas
  // SIN contrato observan). Score 0-100; ≥70 desbloquea ofertas de nuevas aerolíneas.
  const contractedRepsForBrand = game.contracts
    .filter(c => c.status === "active")
    .map(c => game.reputation.perAirline[c.airlineId] ?? 50);
  const brand = (typeof S.brandReputation === "function") ? S.brandReputation({
    totalDepartures: kpi.totalDepartures,
    totalOnTime: kpi.totalOnTime,
    totalAog: kpi.totalAog,
    contractedReps: contractedRepsForBrand,
  }) : 0;
  const brandThreshold = 70;
  const brandColor = brand >= brandThreshold ? "var(--success)" : brand >= 40 ? "var(--warning)" : "var(--muted)";
  const brandHint = brand >= brandThreshold
    ? "✅ Aerolíneas sin contrato YA pueden ofrecerte trabajo."
    : brand >= 40
      ? \`Faltan \${brandThreshold - brand} pts de brand para desbloquear ofertas externas.\`
      : kpi.totalDepartures < 10
        ? \`Necesitas ≥10 departures gestionados para tener fama (\${kpi.totalDepartures}/10).\`
        : "Mejora rep media + on-time + reduce AOG para subir el brand.";

  return \`<h2>📊 Dashboard KPI</h2>
  <p class="muted" style="margin-bottom:.75rem">Series semanales (último año ingame, max 52 semanas). Cada punto = cierre de semana.</p>

  <h3 style="margin-top:1rem">🌟 Brand Reputation del MRO</h3>
  <p class="muted" style="margin-bottom:.5rem">Score objetivo que las aerolíneas SIN contrato observan. Deriva de tus KPIs (50% rep media de contratadas · 30% on-time · 20% (1-AOG)). Cada aerolínea tiene su propio umbral — ver <strong>Contratos</strong> para el pipeline completo de aerolíneas interesadas + próxima evaluación.</p>
  <div class="dash-grid">
    <div class="dash-card">
      <div class="dash-title">🌟 Brand del MRO</div>
      <div class="dash-big" style="color:\${brandColor}">\${brand}<span style="font-size:.85rem;color:var(--muted)"> /100</span></div>
      <div class="bar" style="height:6px;margin-top:.4rem"><div class="fill" style="width:\${brand}%;background:\${brandColor}"></div><div style="position:relative;width:\${brandThreshold}%;border-right:2px dashed var(--text);height:6px;margin-top:-6px"></div></div>
      <div class="muted" style="font-size:.72rem;margin-top:.3rem">\${brandHint}</div>
    </div>
  </div>

  <h3 style="margin-top:1.5rem">📈 TDR — Total Delay Ratio</h3>
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

  <h3 style="margin-top:1.5rem">💼 Horas-hombre (modelo MRO real)</h3>
  <p class="muted" style="margin-bottom:.5rem">Cada tarea se factura por <strong>HH-book</strong> (referencia AMM/MPD del fabricante). El mecánico tarda más o menos según skill/moral/rating → <strong>HH-actual</strong>. Ratio book/actual mide tu eficiencia operativa (&gt;1 mecs rápidos, margen alto · &lt;1 lentos, margen comido).</p>
  <div class="dash-grid">
    <div class="dash-card">
      <div class="dash-title">📘 HH-book facturadas</div>
      <div class="dash-big">\${hkpi.totalBookHoursBilled.toFixed(1)} <span style="font-size:.85rem;color:var(--muted)">h</span></div>
      <div class="muted" style="font-size:.75rem">Sobre \${kpi.totalDepartures} departures · cobro = HH-book × tarifa €/HH</div>
    </div>
    <div class="dash-card">
      <div class="dash-title">⏱️ HH-actual dedicadas</div>
      <div class="dash-big">\${hkpi.totalActualHoursWorked.toFixed(1)} <span style="font-size:.85rem;color:var(--muted)">h</span></div>
      <div class="muted" style="font-size:.75rem">Tiempo real entre emisión y completion de cada WO</div>
    </div>
    <div class="dash-card">
      <div class="dash-title">📊 Eficiencia HH (book/actual)</div>
      <div class="dash-big" style="color:\${effColor}">\${eff.toFixed(2)}×</div>
      <div class="muted" style="font-size:.75rem">\${eff >= 1.0 ? "Mecs rápidos · margen alto" : eff >= 0.85 ? "Cerca del book · OK" : "Mecs lentos · margen comido"}</div>
    </div>
  </div>

  <h4 style="margin-top:1rem">HH por aerolínea contratada</h4>
  <table>
    <thead><tr><th>Aerolínea</th><th>HH-book</th><th>HH-actual</th><th>Eficiencia</th></tr></thead>
    <tbody>\${(() => {
      const rows = Object.entries(hkpi.perAirline).map(([id, b]) => {
        const al = game.airlines.find(a => a.id === id);
        const effA = b.actualHoursWorked > 0 ? b.bookHoursBilled / b.actualHoursWorked : 1;
        return { id, name: al?.name ?? id, color: al?.color ?? "#888", bucket: b, eff: effA };
      });
      rows.sort((a, b) => b.bucket.bookHoursBilled - a.bucket.bookHoursBilled);
      if (rows.length === 0) return '<tr><td colspan="4" class="muted" style="text-align:center;padding:1rem">Sin WOs cerradas todavía.</td></tr>';
      return rows.map(r => {
        const c = r.eff >= 1.0 ? "var(--success)" : r.eff >= 0.85 ? "var(--warning)" : "var(--danger)";
        return \`<tr>
          <td><span style="display:inline-block;width:8px;height:8px;background:\${r.color};border-radius:50%;margin-right:.4rem"></span>\${esc(r.name)}</td>
          <td class="mono">\${r.bucket.bookHoursBilled.toFixed(1)} h</td>
          <td class="mono">\${r.bucket.actualHoursWorked.toFixed(1)} h</td>
          <td class="mono" style="color:\${c}"><strong>\${r.eff.toFixed(2)}×</strong></td>
        </tr>\`;
      }).join("");
    })()}</tbody>
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
      <div class="dash-big">\${allWorkOrders().filter(w => w.phase === "Completed").length}</div>
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
  const filtered = scheduleFilter === "all" ? flights : flights.filter(f => f.type === scheduleFilter);
  const nextMov = flights.filter(f => f.scheduledMinute >= minOfDay).sort((a,b) => a.scheduledMinute - b.scheduledMinute)[0] || null;
  const arr = flights.filter(f => f.type === "arrival").length;
  const dep = flights.filter(f => f.type === "departure").length;
  const notHandled = flights.filter(f => f.notHandled).length;
  const handled = flights.length - notHandled;
  const leads = flights.filter(f => !contractsActive.has(f.airlineCode)).length;

  let h = \`<div class="eyebrow">Operación · Programación del día</div>
    <div class="title-row"><div><h1>Schedule</h1><div class="sub">Asturias (OVD/LEAS) · Día \${gd} · \${dayName(gd)}</div></div>
    <div class="vswitch">
      <button data-schedule-filter="all" class="\${scheduleFilter==='all'?'active':''}">Todos</button>
      <button data-schedule-filter="arrival" class="\${scheduleFilter==='arrival'?'active':''}">🛬 ARR</button>
      <button data-schedule-filter="departure" class="\${scheduleFilter==='departure'?'active':''}">🛫 DEP</button>
    </div></div>\`;
  const schTiles = [
    {cls:"c-ground", num:flights.length, lbl:"✈ Movimientos"},
    {cls:"c-closed", num:arr, lbl:"🛬 Llegadas", led:"var(--ok)"},
    {cls:"c-unassigned", num:dep, lbl:"🛫 Salidas", led:"var(--warn)"},
    {cls:"c-progress", num:handled, lbl:"🟢 Contratados", led:"var(--accent)"},
    {cls:"c-aog", num:leads, lbl:"○ Leads (sin contrato)", led:"var(--dim)"},
    {cls:"c-progress", num:nextMov?fmtHHMM(nextMov.scheduledMinute):"—", lbl:"📡 Próximo mov."},
  ];
  const schTilesHtml = schTiles.map(t => \`<div class="tile \${t.cls}" style="cursor:default"><div class="tnum" style="\${typeof t.num==='string'&&t.num.includes(':')?'font-size:1.2rem':''}">\${t.num}</div><div class="tlbl">\${t.led?\`<span class="led" style="color:\${t.led};background:\${t.led}"></span>\`:""}\${t.lbl}</div></div>\`).join("");
  const contractChips = [...contractsActive].map(c => \`<span class="reg">\${esc(c)}</span>\`).join(" y ") || "<span class='muted'>ninguno</span>";
  h += \`<div class="sitbar"><div class="sit-tiles">\${schTilesHtml}</div><div class="sit-summary"><span class="sig acc">CONTRATADOS</span> \${contractChips} generan trabajo MRO · el resto son <b>leads</b> comerciales (rep para captarlos)</div></div>\`;

  // Timeline de filas CIC (reemplaza la <table>).
  h += '<div class="ftable"><div class="frow fhead"><div>Hora</div><div>Tipo</div><div>Vuelo · Ruta · Modelo</div><div>Operador</div><div>Estado</div></div>';
  for (const f of filtered.slice().sort((a,b) => a.scheduledMinute - b.scheduledMinute)) {
    const time = fmtHHMM(f.scheduledMinute);
    const st = flightStatusFor(f, contractsActive);
    const key = \`\${f.callsign}|\${f.type}|\${f.scheduledMinute}\`;
    const isNext = nextMov && key === \`\${nextMov.callsign}|\${nextMov.type}|\${nextMov.scheduledMinute}\`;
    const past = f.scheduledMinute < minOfDay && !isNext;
    const fhandled = !f.notHandled && contractsActive.has(f.airlineCode);
    const isArr = f.type === "arrival";
    const al = game.airlines.find(a => a.iataCode === f.airlineCode);
    const dot = al?.color || "#5a6577";
    const pernocta = /Pernocta/.test(st.label);
    const done = /Departed|Cerrado/.test(st.label);
    const stPill = f.notHandled
      ? '<span class="st-pill lead">Lead · sin habilitación</span>'
      : \`<span class="st-pill \${fhandled?'ok':'lead'}">\${esc(st.label)}</span>\`;
    h += \`<div class="frow \${past?'past':''} \${isNext?'next':''} \${fhandled?'handled':'lead'}" data-flight="\${esc(key)}">
      <div class="ftime mono">\${time}\${done?' <span class="fchk">✓</span>':''}</div>
      <div class="ftype \${isArr?'arr':'dep'}">\${isArr?'ARR':'DEP'}</div>
      <div class="fmain"><span class="fcs mono">\${esc(f.callsign)}</span><span class="froute mono">\${isArr?'←':'→'} \${esc(f.remote)}</span><span class="fmodel mono">\${esc(f.model)}</span>\${pernocta?'<span class="fov">🌙 pernocta</span>':''}</div>
      <div class="fop"><span class="al-dot" style="background:\${dot}"></span><span class="\${fhandled?'op-h':'op-l'}">\${esc(f.airlineName)}</span><span class="op-code mono">\${esc(f.airlineCode)}</span></div>
      <div class="fstatus">\${stPill}</div>
    </div>\`;
  }
  h += '</div>';
  return h;
}

// Rediseño CIC (2026-05-30): cajón de vuelo (nuevo — no existía modal de vuelo).
function fmtHHMM(m){ return String(Math.floor(m / 60)).padStart(2,"0") + ":" + String(m % 60).padStart(2,"0"); }
function findFlightByKey(key){
  if (!key) return null;
  const parts = String(key).split("|");
  const cs = parts[0], type = parts[1], min = parseInt(parts[2], 10);
  const flights = S.getFlightsForGameDay(currentGameDay());
  return flights.find(f => f.callsign === cs && f.type === type && f.scheduledMinute === min) || null;
}
function renderFlightDrawer(){
  const f = findFlightByKey(detailFlightId);
  if (!f) return '<div class="dw-head"><button class="dw-close" id="modal-close">✕</button><div class="dw-title"><span class="reg">—</span></div></div><div class="dw-body"><div class="empty">Vuelo no encontrado en el día actual.</div></div>';
  const isArr = f.type === "arrival";
  const contractsActive = new Set();
  for (const c of game.contracts){ if (c.status !== "active") continue; const al = game.airlines.find(a => a.id === c.airlineId); if (al?.iataCode) contractsActive.add(al.iataCode); }
  const handled = !f.notHandled && contractsActive.has(f.airlineCode);
  const al = game.airlines.find(a => a.iataCode === f.airlineCode);
  const dot = al?.color || "#5a6577";
  const st = flightStatusFor(f, contractsActive);
  const time = fmtHHMM(f.scheduledMinute);
  const dayStart = (currentGameDay() - 1) * S.DAY_MINUTES;
  const ap = game.airplanes.find(a => a.registration === f.callsign && Math.abs(a.arrivalMinute - (dayStart + f.scheduledMinute)) < 60)
        || game.airplanes.find(a => a.arrivalCallsign === f.callsign || a.nextDepartureCallsign === f.callsign);
  const wo = ap ? game.workOrders.find(w => w.airplaneInstanceId === ap.instanceId && w.phase !== "Completed" && w.phase !== "Failed") : null;
  const railColor = handled ? "var(--accent)" : "var(--dim)";
  let body = \`<div class="dw-kpis">
    <div class="kpi acc"><div class="kl">Hora</div><div class="kv">\${time}</div></div>
    <div class="kpi"><div class="kl">Tipo</div><div class="kv" style="font-size:.82rem">\${isArr?'ARR':'DEP'}</div></div>
    <div class="kpi \${handled?'ok':''}"><div class="kl">Operador</div><div class="kv" style="font-size:.82rem">\${esc(f.airlineCode)}</div></div>
    <div class="kpi"><div class="kl">Estado</div><div class="kv" style="font-size:.72rem">\${esc(st.label)}</div></div>
  </div>\`;
  body += \`<div class="dw-sec">Estado comercial</div><div class="dw-amm">\${handled
    ? \`Operador <b>contratado</b> (\${esc(f.airlineName)}). Este movimiento genera trabajo MRO: callouts en el turnaround y, si pernocta, daily check nocturno.\`
    : \`<span style="color:var(--warn)">Lead comercial</span> — \${esc(f.airlineName)} opera en OVD pero <b>no tienes contrato\${f.notHandled?' / type rating habilitado':''}</b>. Sube reputación para recibir una oferta.\`}</div>\`;
  if (ap){
    body += \`<div class="dw-sec">Aeronave</div><div class="linkcard" data-fleet-reg="\${esc(ap.registration)}"><div class="lk-ic" style="background:var(--accent-bg);color:var(--accent)">✈</div><div><div class="lk-t">Matrícula</div><div class="lk-v">\${esc(ap.registration)} · \${esc(ap.model)}/\${esc(ap.engineVariant)}</div></div><span class="lk-go">›</span></div>\`;
  }
  if (wo){
    const tpl = game.templates.find(t => t.id === wo.templateId);
    body += \`<div class="dw-sec">Trabajo asociado</div><div class="linkcard" data-wo="\${esc(wo.instanceId)}"><div class="lk-ic" style="background:rgba(77,163,255,.12);color:var(--accent)">🔧</div><div><div class="lk-t">\${esc(wo.instanceId)}</div><div class="lk-v">\${esc(tpl ? tpl.description.slice(0,42) : wo.templateId)}</div></div><span class="lk-go">›</span></div>\`;
  }
  return \`<div class="dw-head"><div class="dw-rail" style="background:\${railColor}"></div>
      <button class="dw-close" id="modal-close">✕</button>
      <div class="dw-eyebrow">\${isArr?'🛬 Llegada':'🛫 Salida'} · \${esc(f.callsign)}</div>
      <div class="dw-title"><span class="reg">\${esc(f.callsign)}</span><span class="type">\${esc(f.model)}/\${esc(f.engineVariant)} · \${esc(f.airlineName)}</span></div>
      <div class="dw-sub">\${isArr?'Procedente de':'Con destino'} <b>\${esc(f.remote)}</b> · \${time} · OVD <span class="al-dot" style="display:inline-block;background:\${dot}"></span></div>
    </div>
    <div class="dw-body">\${body}</div>\`;
}

// ===========================================================================
// Pivot línea pura · iteración 2026-05-24 — Production Planning nocturno
// ===========================================================================
// Paquete de trabajo que las aerolíneas contratadas envían al MRO a las 12:00 del día N
// para la pernocta DE ESA MISMA NOCHE N. Antes de las 12:00 no se sabe oficialmente qué
// vuelve. EXCEPCIÓN día 1 (primer día de partida): paquete considerado ya recibido al iniciar
// — el inicio de partida cae a las 06:00 del día 1 (turno mañana del MRO) y la suposición
// in-game es que la aerolínea envió el paquete el día anterior, antes de que tú abrieras
// la persiana del hangar.
function pendingNightOvernighters(){
  const now = game.clock.minute;
  return game.airplanes.filter(a => {
    if (a.overnight !== true) return false;
    if (a.actualDepartureMinute !== undefined && a.actualDepartureMinute <= now) return false;
    const arrivalDayIdx = Math.floor(a.arrivalMinute / S.DAY_MINUTES); // 0-indexed
    if (arrivalDayIdx === 0) return true; // primer día: paquete ya recibido al iniciar
    const publishMinute = arrivalDayIdx * S.DAY_MINUTES + 12 * 60; // 12:00 del día de arrival
    return now >= publishMinute;
  });
}

/** Próxima hora de publicación de paquete (para mostrar "Próximo: día X · 12:00"). */
function nextPlanningPublishMinute(){
  const now = game.clock.minute;
  // Busca futuras pernoctas y devuelve el publishMinute mínimo > now.
  const futurePublishes = game.airplanes
    .filter(a => a.overnight === true && a.arrivalMinute > now &&
      (a.actualDepartureMinute === undefined || a.actualDepartureMinute > now))
    .map(a => {
      const idx = Math.floor(a.arrivalMinute / S.DAY_MINUTES);
      return idx === 0 ? 0 : idx * S.DAY_MINUTES + 12 * 60;
    })
    .filter(m => m > now);
  if (futurePublishes.length === 0) return null;
  return Math.min(...futurePublishes);
}

function renderProductionPlanning(){
  const overnights = pendingNightOvernighters();
  let h = '<h2>📋 Production Planning · Noche</h2>';
  h += '<p class="muted" style="margin-bottom:.5rem">Paquete de trabajo nocturno PLANIFICADO que las aerolíneas contratadas envían al MRO a las <strong>12:00 del día</strong>. Incluye <strong>1 daily check</strong> por avión (con sus subtareas), cierre opcional de WO diferidas vivas y (futuro) ítems MPD facilitados. Click en la tarjeta para detalle del daily, en la matrícula para detalle del avión, en el tipo para detalle del modelo. Los callouts NO planificados viven en Operaciones · Event Tracking.</p>';
  if (overnights.length === 0) {
    const next = nextPlanningPublishMinute();
    if (next !== null) {
      const dayN = Math.floor(next / S.DAY_MINUTES) + 1;
      h += \`<div class="empty">📬 Paquete de pernoctas no recibido todavía. La aerolínea lo enviará el <strong>día \${dayN} a las 12:00</strong>.</div>\`;
    } else {
      h += '<div class="empty">Sin pernoctas planificadas en horizonte. Los aviones que aterricen ≥19:00 y sean último arrival de su aerolínea pernoctarán — recibirás aquí su paquete a las 12:00 del día.</div>';
    }
    return h;
  }
  // Agrupar por aerolínea
  const byAirline = new Map();
  for (const ap of overnights) {
    const c = game.contracts.find(cc => cc.id === ap.contractId);
    if (!c) continue;
    const al = game.airlines.find(a => a.id === c.airlineId);
    if (!al) continue;
    if (!byAirline.has(al.id)) byAirline.set(al.id, { airline: al, planes: [] });
    byAirline.get(al.id).planes.push(ap);
  }
  for (const { airline, planes } of byAirline.values()) {
    h += \`<h3 style="margin-top:1rem"><span style="display:inline-block;width:10px;height:10px;background:\${airline.color};border-radius:50%;margin-right:.4rem;vertical-align:middle"></span>\${esc(airline.name)} · \${planes.length} avión\${planes.length>1?'es':''}</h3>\`;
    for (const ap of planes) {
      const wos = game.workOrders.filter(w => w.airplaneInstanceId === ap.instanceId);
      // Las DC-* del sim son SUBTAREAS del daily check (no daily checks separadas).
      // Visualmente agrupamos como UN solo "Daily check" con counter X/Y subtareas.
      const dcSubtasks = wos.filter(w => w.templateId && w.templateId.startsWith("DC-"));
      const dcCompleted = dcSubtasks.filter(d => d.phase === "Completed").length;
      const dcTotal = dcSubtasks.length;
      const dcBookHours = dcSubtasks.reduce((s, d) => {
        const tpl = game.dailyCheckTemplates?.find?.(t => t.id === d.templateId) || game.templates.find(t => t.id === d.templateId);
        return s + (tpl?.durationMinutes ?? 0) / 60;
      }, 0);
      const deferred = wos.filter(w => w.phase === "Deferred");
      const deferredBookHours = deferred.reduce((s, d) => {
        const tpl = game.templates.find(t => t.id === d.templateId);
        return s + (tpl?.durationMinutes ?? 0) / 60;
      }, 0);
      // Pivot iteración 2026-05-24: tarjeta con 3 zonas clickables distintas:
      //  • article (zona neutra: header bg, meta general) → modal daily check.
      //  • <span data-fleet-reg=...> (matrícula) → modal avión.
      //  • <span data-airplane-type="MODEL/ENGINE"> (tipo) → modal tipo avión.
      // El handler global comprueba el más específico primero (closest data-* gana).
      // Para evitar superposición visual, cada zona clickable tiene hover propio y title.
      h += \`<article class="wo-card daily-card" data-daily-airplane="\${ap.instanceId}" style="cursor:pointer" title="Click para detalle del daily check">
        <header class="wo-head">
          <span class="mono clickable-chip" data-fleet-reg="\${esc(ap.registration)}" title="Detalle del avión \${esc(ap.registration)}"><strong style="font-size:1rem">\${esc(ap.registration)}</strong></span>
          <span class="muted clickable-chip" data-airplane-type="\${ap.model}/\${ap.engineVariant}" title="Detalle tipo \${ap.model}/\${ap.engineVariant}">\${ap.model}/\${ap.engineVariant}</span>
          <span class="wo-phase" style="background:rgba(80,80,140,.18);color:#cdf;border-color:rgba(140,150,200,.5)">🌙 Pernocta</span>
        </header>
        <div class="wo-meta">
          <span>Última llegada: <strong class="mono">\${esc(ap.arrivalCallsign ?? "?")}</strong> @ <strong>\${fmtClock(ap.arrivalMinute)}</strong></span>
          <span>Próx. salida: <strong class="mono">\${esc(ap.nextDepartureCallsign ?? "—")}</strong> @ <strong>\${fmtClock(ap.scheduledDepartureMinute)}</strong></span>
        </div>
        <div style="margin-top:.5rem;display:flex;flex-direction:column;gap:.25rem;font-size:.85rem">
          \${dcTotal > 0 ? \`<div>🌙 <strong>Daily check</strong> · <strong>\${dcCompleted}/\${dcTotal}</strong> subtareas \${dcCompleted === dcTotal ? '<span style="color:var(--success)">✓</span>' : '<span style="color:var(--warning)">pendiente</span>'} · book <strong>\${dcBookHours.toFixed(1)}h</strong></div>\` : (ap.arrivalMinute > game.clock.minute ? \`<div class="muted">🌙 Daily check se emitirá al aterrizar a las <strong>\${fmtClock(ap.arrivalMinute)}</strong></div>\` : '<div class="muted">🌙 Daily check pendiente de emisión</div>')}
          \${deferred.length > 0 ? \`<div>📋 <strong>\${deferred.length}</strong> WO diferida\${deferred.length>1?'s':''} (cierre opcional) · book <strong>\${deferredBookHours.toFixed(1)}h</strong></div>\` : ''}
          <div class="muted">📄 MPD ítems facilitados por la aerolínea: <strong>—</strong> (próximamente)</div>
        </div>
      </article>\`;
    }
  }
  return h;
}

// ===========================================================================
// Pivot iteración 2026-05-24 — Modal detalle Daily Check (work package nocturno)
// ===========================================================================
// Lista TODAS las subtareas del daily check de un avión: descripción, ATA, categoría
// requerida, duración book, herramientas, partes, fase actual, % progreso, mec
// asignado. Click sobre la card de Production Planning lo abre. Cerrar con × o
// fondo. La info viene de g.workOrders (DC-* sub-WOs) + g.dailyCheckTemplates.
function renderDailyDetailModal(){
  if (!detailDailyAirplaneId) return null;
  const ap = game.airplanes.find(a => a.instanceId === detailDailyAirplaneId);
  if (!ap) return null;
  const c = game.contracts.find(cc => cc.id === ap.contractId);
  const al = c ? game.airlines.find(a => a.id === c.airlineId) : null;
  const allWos = game.workOrders.filter(w => w.airplaneInstanceId === ap.instanceId);
  const dcs = allWos
    .filter(w => w.templateId && w.templateId.startsWith("DC-"))
    .sort((a, b) => (a.templateId || "").localeCompare(b.templateId || ""));
  const deferred = allWos.filter(w => w.phase === "Deferred");
  const callouts = allWos.filter(w => w.templateId && !w.templateId.startsWith("DC-") && w.phase !== "Completed" && w.phase !== "Failed" && w.phase !== "Deferred");

  const dcCompleted = dcs.filter(d => d.phase === "Completed").length;
  const dcFailed = dcs.filter(d => d.phase === "Failed").length;
  const dcBookHours = dcs.reduce((s, d) => {
    const tpl = game.dailyCheckTemplates?.find?.(t => t.id === d.templateId) || game.templates.find(t => t.id === d.templateId);
    return s + (tpl?.durationMinutes ?? 0) / 60;
  }, 0);

  let inner = \`<header class="modal-head"><h3>🌙 Daily check · \${esc(ap.registration)} <span class="muted" style="font-weight:normal;font-size:.85rem">\${ap.model}/\${ap.engineVariant}</span></h3><button class="close" id="modal-close">×</button></header>
  <div class="modal-body">
    <div class="kvs">
      <span>Aerolínea: <strong>\${esc(al?.name ?? "—")}</strong></span>
      <span>Llegada: <strong class="mono">\${esc(ap.arrivalCallsign ?? "?")} @ \${fmtClock(ap.arrivalMinute)}</strong></span>
      <span>Próx. salida: <strong class="mono">\${esc(ap.nextDepartureCallsign ?? "—")} @ \${fmtClock(ap.scheduledDepartureMinute)}</strong></span>
      <span>Stand: <strong>\${esc(ap.standId || "ramp")}</strong></span>
    </div>
    <div class="kvs" style="margin-top:.3rem">
      <span>Subtareas: <strong>\${dcCompleted}/\${dcs.length}</strong>\${dcFailed > 0 ? \` · <strong style="color:var(--danger)">\${dcFailed} failed</strong>\` : ''}</span>
      <span>Book HH total: <strong>\${dcBookHours.toFixed(1)}h</strong></span>
    </div>

    <h4>Subtareas del daily check</h4>\`;

  if (dcs.length === 0) {
    inner += '<p class="muted">Daily check aún no emitido (se emite al aterrizar). El paquete del avión está confirmado pero las sub-WOs se crean cuando llega a stand.</p>';
  } else {
    inner += '<div style="display:flex;flex-direction:column;gap:.4rem">';
    for (const w of dcs) {
      const tpl = game.dailyCheckTemplates?.find?.(t => t.id === w.templateId) || game.templates.find(t => t.id === w.templateId);
      if (!tpl) continue;
      let phaseBadge, phaseClr;
      if (w.phase === "Completed") { phaseBadge = "✓ Completado"; phaseClr = "var(--success)"; }
      else if (w.phase === "Failed") { phaseBadge = "✗ Failed"; phaseClr = "var(--danger)"; }
      else if (w.phase === "Deferred") { phaseBadge = "📋 Diferido"; phaseClr = "var(--warning)"; }
      else if (w.phase === "ToPlane") { phaseBadge = w.assignedMechanicIds.length > 0 ? "→ En camino" : "⏳ Sin asignar"; phaseClr = w.assignedMechanicIds.length > 0 ? "var(--accent)" : "var(--muted)"; }
      else { phaseBadge = \`⚙️ \${w.phase}\`; phaseClr = "var(--accent)"; }
      // Progreso global del WO en su fase actual
      let pct = 0;
      if (w.phase === "Completed" || w.phase === "Failed") pct = 100;
      else if (tpl && (w.phase === "Inspection" || w.phase === "MainTask" || w.phase === "Test" || w.phase === "Rework")) {
        const r = game.balance.phaseDurationRatios;
        const d = tpl.durationMinutes;
        const phaseDur = w.phase === "Inspection" ? d * r.inspection
          : w.phase === "MainTask" ? d * r.mainTask
          : w.phase === "Test" ? d * r.test
          : w.phase === "Rework" ? d * r.rework
          : d;
        pct = phaseDur > 0 ? Math.min(100, (w.phaseElapsedMinutes / phaseDur) * 100) : 0;
      }
      const mechs = w.assignedMechanicIds
        .map(id => game.mechanics.find(m => m.id === id))
        .filter(Boolean);
      const mechLabels = mechs.length === 0 ? '<span class="muted">— sin asignar</span>'
        : mechs.map(m => \`<span class="chip">👤 \${esc(m.name)} <span class="muted">(\${m.typeRatings[0]?.category ?? "—"})</span></span>\`).join(" ");
      inner += \`<div style="border:1px solid var(--border);border-radius:6px;padding:.55rem .7rem;background:rgba(255,255,255,.02)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.3rem">
          <div><strong class="mono">\${esc(tpl.id)}</strong> · ATA \${tpl.ata} · <span class="muted">\${esc(tpl.requiredCategory)} req</span> · <span class="muted">\${tpl.durationMinutes}min book</span>\${tpl.deferrable?' · <span class="muted">deferrable</span>':''}</div>
          <span class="wo-phase" style="background:rgba(0,0,0,.3);color:\${phaseClr};border-color:\${phaseClr}">\${phaseBadge}</span>
        </div>
        <div style="margin-bottom:.4rem">\${esc(tpl.description)}</div>
        \${w.phase !== "Completed" && w.phase !== "Failed" && w.phase !== "ToPlane" && w.phase !== "Deferred" ? \`<div class="bar" style="height:6px"><div class="fill primary" style="width:\${pct.toFixed(0)}%"></div></div><div class="muted" style="font-size:.7rem;margin-top:.1rem">Fase \${w.phase}: \${pct.toFixed(0)}%</div>\` : ''}
        <div style="margin-top:.3rem;display:flex;flex-wrap:wrap;gap:.3rem;font-size:.78rem">\${mechLabels}</div>
        \${tpl.toolsRequired && tpl.toolsRequired.length > 0 ? \`<div class="muted" style="font-size:.72rem;margin-top:.25rem">🔧 \${tpl.toolsRequired.map(t => esc(t)).join(" · ")}</div>\` : ''}
        \${tpl.partsRequired && tpl.partsRequired.length > 0 ? \`<div class="muted" style="font-size:.72rem;margin-top:.1rem">📦 \${tpl.partsRequired.map(p => esc(p)).join(" · ")}</div>\` : ''}
      </div>\`;
    }
    inner += '</div>';
  }

  if (deferred.length > 0) {
    inner += '<h4>WO diferidas vivas en este avión (cierre opcional)</h4><ul style="margin:.3rem 0 .5rem 1.2rem;font-size:.85rem">';
    for (const w of deferred) {
      const tpl = game.templates.find(t => t.id === w.templateId);
      inner += \`<li><strong class="mono">\${esc(w.instanceId)}</strong> · \${esc(tpl?.description ?? w.templateId)}</li>\`;
    }
    inner += '</ul>';
  }
  if (callouts.length > 0) {
    inner += '<h4>Callouts activos en este avión</h4><ul style="margin:.3rem 0 .5rem 1.2rem;font-size:.85rem">';
    for (const w of callouts) {
      const tpl = game.templates.find(t => t.id === w.templateId);
      inner += \`<li><strong class="mono">\${esc(w.instanceId)}</strong> · \${esc(tpl?.description ?? w.templateId)} · fase \${w.phase}</li>\`;
    }
    inner += '</ul>';
  }
  inner += '<p class="muted" style="font-size:.75rem;margin-top:.6rem">📄 MPD ítems facilitados por la aerolínea: — (próximamente)</p>';
  inner += '</div>';
  return inner;
}

// ===========================================================================
// Pivot iteración 2026-05-24 — Modal detalle Tipo de Avión
// ===========================================================================
// Muestra info técnica del modelo+motor: ATAs típicos, type ratings requeridos,
// mecs del MRO con rating para este tipo, aviones de la flota con este tipo,
// contratos activos que lo operan. Click sobre el chip "A320/CFM56" lo abre.
function renderAirplaneTypeModal(){
  if (!detailAirplaneType) return null;
  const [model, engineVariant] = detailAirplaneType.split("/");
  if (!model || !engineVariant) return null;

  // Mecs con rating para este tipo (cualquier categoría)
  const ratedMechs = game.mechanics.filter(m =>
    m.typeRatings.some(r => r.model === model && r.engineVariant === engineVariant)
  );
  const b1s = ratedMechs.filter(m => m.typeRatings.some(r => r.model === model && r.engineVariant === engineVariant && r.category === "B1"));
  const b2s = ratedMechs.filter(m => m.typeRatings.some(r => r.model === model && r.engineVariant === engineVariant && r.category === "B2"));

  // Aviones (landings) de este tipo en pista
  const landingsHere = game.airplanes.filter(a => a.model === model && a.engineVariant === engineVariant && a.status !== "Departed");
  // Flota con este tipo
  const fleetHere = game.fleet.filter(f => f.model === model && f.engineVariant === engineVariant);
  // Aerolíneas que lo operan (vía contratos activos)
  const activeContractIds = new Set(game.contracts.filter(c => c.status === "active").map(c => c.id));
  const operatingAirlineIds = new Set();
  for (const ap of game.airplanes) {
    if (ap.model === model && ap.engineVariant === engineVariant && activeContractIds.has(ap.contractId)) {
      const c = game.contracts.find(cc => cc.id === ap.contractId);
      if (c) operatingAirlineIds.add(c.airlineId);
    }
  }
  const operatingAirlines = game.airlines.filter(a => operatingAirlineIds.has(a.id));

  // Datos técnicos del A320 family (universo cerrado del juego)
  const techData = {
    A320: { mtow: "78 t", capacity: "150-180 pax", length: "37.6m", typicalFH: "8-12h/día" },
    A321: { mtow: "93 t", capacity: "185-220 pax", length: "44.5m", typicalFH: "8-12h/día" },
  };
  const engineData = {
    CFM56: { mfg: "CFM International (GE+Safran)", thrust: "27,000 lbf", inLineMaint: "Sí" },
    V2500: { mfg: "IAE (Pratt+Whitney+RR+MTU)", thrust: "27,000 lbf", inLineMaint: "Sí" },
  };
  const td = techData[model] || {};
  const ed = engineData[engineVariant] || {};

  let inner = \`<header class="modal-head"><h3>✈️ Tipo de avión · \${esc(model)} / \${esc(engineVariant)}</h3><button class="close" id="modal-close">×</button></header>
  <div class="modal-body">
    <h4>Especificaciones del modelo</h4>
    <div class="kvs">
      <span>MTOW: <strong>\${td.mtow ?? "—"}</strong></span>
      <span>Capacidad: <strong>\${td.capacity ?? "—"}</strong></span>
      <span>Longitud: <strong>\${td.length ?? "—"}</strong></span>
      <span>Utilización típica: <strong>\${td.typicalFH ?? "—"}</strong></span>
    </div>
    <h4>Motor</h4>
    <div class="kvs">
      <span>Fabricante: <strong>\${ed.mfg ?? "—"}</strong></span>
      <span>Empuje: <strong>\${ed.thrust ?? "—"}</strong></span>
      <span>Línea (MRO support): <strong>\${ed.inLineMaint ?? "—"}</strong></span>
    </div>

    <h4>Mecánicos del MRO con type rating</h4>
    <div class="kvs">
      <span>B1 rated: <strong>\${b1s.length}</strong></span>
      <span>B2 rated: <strong>\${b2s.length}</strong></span>
      <span>Total: <strong>\${ratedMechs.length} / \${game.mechanics.length}</strong></span>
    </div>
    \${ratedMechs.length === 0 ? '<p class="muted">⚠️ Ningún mecánico tiene rating para este tipo. WO sobre este avión quedan sin asignar — considera enviar a alguien a curso.</p>' :
      '<ul style="margin:.3rem 0 .5rem 1.2rem;font-size:.85rem">' + ratedMechs.map(m => {
        const cats = m.typeRatings.filter(r => r.model === model && r.engineVariant === engineVariant).map(r => r.category).join("+");
        return \`<li>\${esc(m.name)} · <strong>\${cats}</strong> · turno \${m.shift ?? "—"} · \${esc(m.state)}</li>\`;
      }).join("") + '</ul>'}

    <h4>Aerolíneas que lo operan (contratos activos)</h4>
    \${operatingAirlines.length === 0 ? '<p class="muted">Ninguna aerolínea contratada opera este tipo actualmente.</p>' :
      '<ul style="margin:.3rem 0 .5rem 1.2rem;font-size:.85rem">' + operatingAirlines.map(a =>
        \`<li><span style="display:inline-block;width:8px;height:8px;background:\${a.color};border-radius:50%;margin-right:.3rem"></span>\${esc(a.name)} (\${esc(a.iataCode ?? "—")})</li>\`
      ).join("") + '</ul>'}

    <h4>Presencia en pista</h4>
    <div class="kvs">
      <span>Aviones AHORA: <strong>\${landingsHere.length}</strong></span>
      <span>Matrículas únicas: <strong>\${new Set(landingsHere.map(a=>a.registration)).size}</strong></span>
      <span>Flota visible: <strong>\${fleetHere.length}</strong></span>
    </div>
  </div>\`;
  return inner;
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

  // Pivot iteración 2026-05-25 · banner "Próx. salida" prominente:
  // Buscar el landing activo (en stand ahora) de esta matrícula para mostrar countdown
  // hasta el departure. Color: rojo <30min, ámbar <2h, verde >2h.
  const now = game.clock.minute;
  const activeLanding = game.airplanes.find(a =>
    a.registration === f.registration &&
    a.arrivalMinute <= now &&
    (a.actualDepartureMinute === undefined || a.actualDepartureMinute > now)
  );
  let nextDepartureBanner = '';
  if (activeLanding) {
    const depMin = activeLanding.scheduledDepartureMinute;
    const minsLeft = depMin - now;
    const depCallsign = activeLanding.nextDepartureCallsign ?? "—";
    let bgColor, txtColor, urgencyTag;
    if (minsLeft < 0) {
      bgColor = "rgba(255,71,87,.2)"; txtColor = "var(--danger)"; urgencyTag = \`🛑 RETRASADO \${-minsLeft}m\`;
    } else if (minsLeft < 30) {
      bgColor = "rgba(255,71,87,.15)"; txtColor = "var(--danger)"; urgencyTag = "⏰ inminente";
    } else if (minsLeft < 120) {
      bgColor = "rgba(245,185,69,.15)"; txtColor = "var(--warning)"; urgencyTag = "⏱️ pronto";
    } else {
      bgColor = "rgba(63,185,80,.12)"; txtColor = "var(--success)"; urgencyTag = "🛫 programado";
    }
    const h = Math.floor(Math.abs(minsLeft)/60), mm = Math.abs(minsLeft)%60;
    const countdown = minsLeft < 0 ? \`-\${h>0?h+'h ':''}\${mm}min\` : \`\${h>0?h+'h ':''}\${mm}min\`;
    nextDepartureBanner = \`<div style="background:\${bgColor};border:1px solid \${txtColor};border-radius:6px;padding:.7rem 1rem;margin-bottom:.8rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Próx. salida \${urgencyTag}</div>
          <div style="font-size:1.2rem;font-weight:600;color:\${txtColor};margin-top:.1rem">\${esc(depCallsign)} @ \${fmtClock(depMin)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.78rem;color:var(--muted)">En</div>
          <div style="font-family:var(--mono);font-size:1.3rem;font-weight:600;color:\${txtColor}">\${countdown}</div>
        </div>
      </div>
      <div class="muted" style="font-size:.75rem;margin-top:.3rem">Llegó \${activeLanding.arrivalCallsign ? '<strong class="mono">' + esc(activeLanding.arrivalCallsign) + '</strong> ' : ''}@ \${fmtClock(activeLanding.arrivalMinute)} · stand <strong>\${esc(activeLanding.standId || "—")}</strong>\${activeLanding.overnight ? ' · 🌙 pernocta' : ''}</div>
    </div>\`;
  }

  // WOs activas detalladas (no solo count)
  const woActiveOnLanding = activeLanding
    ? woActive.filter(w => w.airplaneInstanceId === activeLanding.instanceId)
    : woActive;
  let activeWosBlock = '';
  if (woActiveOnLanding.length > 0) {
    activeWosBlock = '<h4>WOs activas ahora</h4><div style="display:flex;flex-direction:column;gap:.3rem">';
    for (const w of woActiveOnLanding) {
      const tpl = game.templates.find(t => t.id === w.templateId) || game.dailyCheckTemplates?.find?.(t => t.id === w.templateId);
      const mechs = w.assignedMechanicIds.map(id => game.mechanics.find(m => m.id === id)?.name).filter(Boolean);
      const isDaily = w.templateId?.startsWith?.("DC-");
      const icon = isDaily ? "🌙" : tpl?.isAOG ? "🛑" : "🔧";
      const phaseColor = w.phase === "Deferred" ? "var(--warning)"
        : (w.phase === "MainTask" || w.phase === "Test" || w.phase === "Rework" || w.phase === "Inspection") ? "var(--accent)"
        : "var(--muted)";
      activeWosBlock += \`<article class="wo-card" data-wo="\${w.instanceId}" style="cursor:pointer;padding:.4rem .7rem;border:1px solid var(--border);border-radius:5px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
          <div><span style="font-size:1rem">\${icon}</span> <strong class="mono">\${w.instanceId}</strong> · \${esc(tpl?.description?.slice(0,45) ?? w.templateId)}</div>
          <span class="wo-phase" style="color:\${phaseColor};border-color:\${phaseColor}">\${w.phase}</span>
        </div>
        <div class="muted" style="font-size:.75rem;margin-top:.2rem">ATA \${tpl?.ata ?? "?"} · \${tpl?.requiredCategory ?? "?"} · \${mechs.length > 0 ? '👤 ' + mechs.map(esc).join(", ") : '<span style="color:var(--warning)">⚠️ sin asignar</span>'}</div>
      </article>\`;
    }
    activeWosBlock += '</div>';
  }

  let inner = \`<header class="modal-head"><h3>✈️ \${esc(f.registration)} · \${f.model} / \${f.engineVariant}</h3><button class="close" id="modal-close">×</button></header>
  <div class="modal-body">
    \${nextDepartureBanner}
    \${activeWosBlock}
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
    \${(() => {
      if (fleetAl.length === 0) return '<p class="muted" style="font-size:.85rem">Sin flota sembrada</p>';
      // Agrupar por modelo+motor para saber qué type ratings necesitas
      const byType = {};
      for (const f of fleetAl) {
        const k = f.model + " / " + f.engineVariant;
        if (!byType[k]) byType[k] = [];
        byType[k].push(f.registration);
      }
      const summary = Object.entries(byType)
        .map(([k, regs]) => \`<span class="chip" title="\${regs.join(', ')}"><strong>\${k}</strong> · \${regs.length}</span>\`)
        .join(" ");
      const detail = Object.entries(byType)
        .map(([k, regs]) => \`<div style="margin:.25rem 0;font-size:.78rem"><strong class="mono">\${k}</strong> (\${regs.length}): <span class="muted">\${regs.join(", ")}</span></div>\`)
        .join("");
      return \`<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.5rem">\${summary}</div>\${detail}<p class="muted" style="font-size:.75rem;margin-top:.3rem">Necesitas mecánicos B1 + B2 con type rating para CADA combo modelo/motor para certificar trabajos.</p>\`;
    })()}

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
  // Pivot iteración 2026-05-24: modal daily check detallado (Production Planning click neutro)
  if (detailDailyAirplaneId) {
    const html = renderDailyDetailModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // Pivot iteración 2026-05-24: modal tipo de avión (click en chip "A320/CFM56")
  if (detailAirplaneType) {
    const html = renderAirplaneTypeModal();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  // Rediseño CIC (2026-05-30): cajón de vuelo (Schedule). Antes del guard de selectedWoId.
  if (detailFlightId) {
    const html = renderFlightDrawer();
    if (html !== null && html !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = html;
      lastModalHtml = html;
    }
    back.classList.add("open");
    return;
  }
  if (!selectedWoId) { back.classList.remove("open"); lastModalHtml = ""; return; }
  const wo = workOrderByInstance(selectedWoId); // busca también en archive (histórico WO)
  if (!wo) { back.classList.remove("open"); return; }
  // Pivot iteración 2026-05-25: las DC-* (subtareas daily) y los findings viven en
  // dailyCheckTemplates / templates respectivamente. Buscar en ambos catálogos.
  const tpl = game.templates.find(t => t.id === wo.templateId)
    || game.dailyCheckTemplates?.find?.(t => t.id === wo.templateId);
  const ap = airplaneByInstance(wo.airplaneInstanceId);
  if (!tpl || !ap) { back.classList.remove("open"); return; }

  // Pivot iteración 2026-05-25: short-circuit para WO CERRADAS (Completed/Failed/Deferred)
  // — el modal normal está pensado para WO activa con asignación/defer. Para cerradas
  // mostramos historial: cuándo terminó, on-time o late, fee/penalty cobrada, mecs.
  if (wo.phase === "Completed" || wo.phase === "Failed" || wo.phase === "Deferred") {
    // Recuperar info histórica del ledger (no la guardamos en wo directamente)
    const feeTx = game.economy.ledger.find(t => t.type === "workOrderPayment" && t.description?.includes(wo.instanceId));
    const penaltyTx = game.economy.ledger.find(t => t.type === "penalty" && t.description?.includes(wo.instanceId));
    const completionMin = feeTx?.minute ?? penaltyTx?.minute;
    const totalDuration = completionMin ? completionMin - wo.emissionMinute : null;
    const wasOnTime = completionMin !== undefined ? completionMin <= wo.slaMinute : null;
    const lateMins = (completionMin !== undefined && completionMin > wo.slaMinute) ? completionMin - wo.slaMinute : 0;
    const phaseColor = wo.phase === "Completed" ? "var(--success)" : wo.phase === "Failed" ? "var(--danger)" : "var(--warning)";
    const phaseIcon = wo.phase === "Completed" ? "✓" : wo.phase === "Failed" ? "✗" : "📋";
    const isFinding = wo.parentWoInstanceId !== undefined;
    let inner = \`<header class="modal-head"><h3>\${phaseIcon} \${wo.instanceId} — \${esc(tpl.description)}</h3><button class="close" id="modal-close">×</button></header>
    <div class="modal-body">
      <div style="margin-bottom:.5rem"><span class="wo-phase" style="background:rgba(0,0,0,.3);color:\${phaseColor};border-color:\${phaseColor}">\${wo.phase.toUpperCase()}</span>\${isFinding ? ' <span class="muted">🔍 finding (derivado de daily check previo)</span>' : ''}</div>
      <div class="kvs">
        <span>Template: <strong class="mono">\${esc(tpl.id)}</strong></span>
        <span>ATA: <strong>\${tpl.ata}</strong></span>
        <span>Categoría requerida: <strong>\${tpl.requiredCategory}</strong></span>
        <span>Avión: <strong>\${esc(ap.registration)}</strong> (\${ap.model}/\${ap.engineVariant})\${ap.arrivalCallsign ? ' · vuelo <strong class="mono">' + esc(ap.arrivalCallsign) + '</strong>' : ''}</span>
        <span>Severidad: <strong>\${tpl.severity}</strong>\${tpl.isAOG ? ' 🛑 AOG' : ''}</span>
        <span>Book HH: <strong>\${(tpl.durationMinutes/60).toFixed(1)}h</strong></span>
      </div>
      <h4 style="margin-top:.8rem">Línea de tiempo</h4>
      <div class="kvs">
        <span>Emitida: <strong class="mono">\${fmtClock(wo.emissionMinute)}</strong></span>
        <span>SLA (departure): <strong class="mono">\${fmtClock(wo.slaMinute)}</strong></span>
        \${completionMin ? \`<span>\${wo.phase === "Failed" ? "Marcada Failed" : "Completada"}: <strong class="mono">\${fmtClock(completionMin)}</strong></span>\` : ''}
        \${totalDuration !== null ? \`<span>Duración total: <strong>\${Math.floor(totalDuration/60)}h \${totalDuration%60}min</strong></span>\` : ''}
      </div>\`;
    if (wo.phase === "Deferred") {
      const expiryMin = wo.deferralExpiryMinute;
      const expiryRemaining = expiryMin ? Math.max(0, expiryMin - game.clock.minute) : 0;
      const expiryDays = Math.ceil(expiryRemaining / S.DAY_MINUTES);
      inner += \`<h4 style="margin-top:.5rem">📋 MEL en curso</h4>
        <div class="kvs">
          <span>Categoría MEL: <strong>\${wo.melCategory ?? "—"}</strong></span>
          <span>Expira: <strong class="mono">\${expiryMin ? fmtClock(expiryMin) : "—"}</strong> (en \${expiryDays}d)</span>
        </div>
        <p class="muted" style="margin-top:.4rem;font-size:.8rem">Si expira sin cerrarse: -\${S.MEL_EXPIRY_PENALTY_EUR ?? 10000} € + delta rep negativo. Puedes "Reparar ya" para volver a activa.</p>
        <div style="margin-top:.5rem"><button data-undefer-wo="\${wo.instanceId}">🔧 Reparar ya (vuelve a ToPlane)</button></div>\`;
    } else if (wasOnTime !== null) {
      inner += \`<h4 style="margin-top:.5rem">💰 Resultado económico</h4>
        <div class="kvs">
          <span>On-time: <strong style="color:\${wasOnTime ? 'var(--success)' : 'var(--danger)'}">\${wasOnTime ? "✓ Sí (cerró antes del departure)" : "✗ No (causó delay " + lateMins + "m)"}</strong></span>
          \${feeTx ? \`<span>Fee cobrada: <strong style="color:var(--success)">+\${feeTx.amount.toLocaleString("es-ES")} €</strong></span>\` : ''}
          \${penaltyTx ? \`<span>Penalty: <strong style="color:var(--danger)">\${penaltyTx.amount.toLocaleString("es-ES")} €</strong></span>\` : ''}
        </div>\`;
    }
    inner += '</div>';
    if (inner !== lastModalHtml) {
      document.getElementById("modal-content").innerHTML = inner;
      lastModalHtml = inner;
    }
    back.classList.add("open");
    return;
  }

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
  const bookHrsModal = (tpl.durationMinutes / 60).toFixed(1);
  // Rediseño CIC (2026-05-30): cabecera del cajón WO en dw-* (rail por severidad + KPIs).
  // El cuerpo conserva class modal-body para que el form de asignación (select/labels/helpers)
  // mantenga su estilo legacy intacto — cero cambios en la lógica de asignar/diferir.
  const sevColor = tpl.isAOG ? "var(--aog)" : tpl.severity === "Critical" ? "var(--bad)" : tpl.severity === "Major" ? "var(--warn)" : "var(--accent)";
  const slaLeft = wo.slaMinute - game.clock.minute;
  let inner = \`<div class="dw-head"><div class="dw-rail" style="background:\${sevColor};box-shadow:0 0 14px \${sevColor}"></div>
    <button class="dw-close" id="modal-close">✕</button>
    <div class="dw-eyebrow">\${tpl.isAOG?"🛑 AOG · ":""}Work Order · \${esc(wo.instanceId)}</div>
    <div class="dw-title"><span class="reg">\${esc(ap.registration)}</span><span class="type">\${esc(ap.model)}/\${esc(ap.engineVariant)}\${ap.arrivalCallsign?" · "+esc(ap.arrivalCallsign):""}</span></div>
    <div class="dw-sub">\${esc(tpl.description)}</div>
  </div>
  <div class="dw-body modal-body">
    <div class="dw-kpis">
      <div class="kpi \${slaLeft<=30?'bad':slaLeft<=60?'warn':'ok'}"><div class="kl">SLA</div><div class="kv">\${slaLeft}m</div></div>
      <div class="kpi \${tpl.severity==='Critical'?'bad':tpl.severity==='Major'?'warn':''}"><div class="kl">Severidad</div><div class="kv" style="font-size:.76rem">\${tpl.severity}\${tpl.isAOG?' · AOG':''}</div></div>
      <div class="kpi acc"><div class="kl">Cat</div><div class="kv">\${tpl.requiredCategory}</div></div>
      <div class="kpi"><div class="kl">MEL</div><div class="kv" style="font-size:.78rem">\${mc ?? "—"}</div></div>
    </div>
    <div class="dw-sec">ATA \${tpl.ata} · Book \${bookHrsModal}h · stand \${esc(ap.standId || "—")}</div>
    \${renderPhaseStepper(wo, tpl)}\`;
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
//
// Pivot iteración 2026-05-24 fix: BUG de parpadeo + valores irreales en HUD de balance.
// Causa: String(target) con target flotante (ej. 259181.32) almacenaba "259181.32" en
// dataset.tweenVal. Al re-parsear con replace(/[^0-9-]/g, "") se borraba el punto
// decimal → "25918132" → parseInt = 25918132. El siguiente tick veía from=25M, target=259k
// → tweeneaba hacia abajo cada 100ms, mostrando cifras absurdas en pleno tween.
// Fix: redondear target a entero ANTES de almacenar/comparar. El balance se redondea
// al euro entero (más legible y consistente con UI tycoon).
const _activeTweens = new WeakMap();
function tweenNumber(el, target, duration = 400, formatter = (v) => v.toLocaleString("es-ES")) {
  const intTarget = Math.round(target);
  const current = parseInt((el.dataset.tweenVal ?? "").replace(/[^0-9-]/g, ""), 10);
  const from = Number.isFinite(current) ? current : intTarget;
  if (Math.abs(intTarget - from) < 2) {
    el.textContent = formatter(intTarget);
    el.dataset.tweenVal = String(intTarget);
    return;
  }
  // Cancelar tween previo si hubo
  const prev = _activeTweens.get(el);
  if (prev) cancelAnimationFrame(prev);
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = Math.round(from + (intTarget - from) * eased);
    el.textContent = formatter(v);
    if (t < 1) {
      const id = requestAnimationFrame(step);
      _activeTweens.set(el, id);
    } else {
      el.textContent = formatter(intTarget);
      el.dataset.tweenVal = String(intTarget);
      _activeTweens.delete(el);
    }
  }
  el.dataset.tweenVal = String(from);
  _activeTweens.set(el, requestAnimationFrame(step));
}

// ===========================================================================
// Tutorial Rookie guiado (2026-05-30)
// ===========================================================================
// Guía paso a paso con bloqueo total de clicks (spotlight). El usuario solo puede
// interactuar con el elemento resaltado o pulsar Continuar. Cubre: contexto del juego →
// orientación del mapa → el bucle central (avanzar tiempo, abrir aviso, asignar, cobrar) →
// sistemas de apoyo → graduación. Cada paso explica el PORQUÉ.
//
// Cada paso: { phase, title, body, why?, target?, place?, gate?, cond?, onEnter?, showNext? }
//   target  = selector CSS a resaltar (null = bocadillo centrado, contexto).
//   place   = 'center'|'top'|'bottom'|'left'|'right' posición del bocadillo respecto al target.
//   gate    = selector que el usuario DEBE clicar para avanzar (acción guiada).
//   cond    = fn(game)->bool: si true, auto-avanza (eventos del sim, p.ej. WO asignada).
//   onEnter = fn(): efecto al entrar (p.ej. cambiar de tab para que exista el target).
//   showNext= muestra botón Continuar (siempre en pasos de contexto; fallback anti-softlock).
const TUT_STEPS = [
  // ── Fase 0 · Contexto ──
  { phase: "Bienvenida", title: "Bienvenido a tu MRO",
    body: "Acabas de fundar una empresa de <strong>mantenimiento aeronáutico</strong> (MRO) en el aeropuerto de Asturias. Tú eres el técnico-jefe y dueño.",
    why: "Un MRO no vuela aviones: los mantiene en condiciones de volar. Las aerolíneas son tus clientes.",
    target: null, place: "center", showNext: true },
  { phase: "El negocio", title: "Cómo ganas dinero",
    body: "Las aerolíneas te pagan por mantener sus aviones operativos. Cuando uno aterriza con una avería, te llaman: tienes hasta su próxima salida (~55 min) para resolverla.",
    why: "Es mantenimiento de LÍNEA: turnaround rápido, bajo presión de tiempo. No hangares, no grandes revisiones todavía.",
    target: null, place: "center", showNext: true },
  { phase: "El bucle", title: "Llega · Arregla · Despega",
    body: "Si arreglas a tiempo: <strong>cobras</strong> y tu <strong>reputación sube</strong>. Si no llegas: penalización y la reputación baja.",
    why: "Toda la partida es este bucle. Domínalo y el negocio crece; descuídalo y quiebras.",
    target: null, place: "center", showNext: true },
  { phase: "Tus recursos", title: "Con qué empiezas",
    body: "💰 200.000 € de caja · 📋 un contrato con <strong>Vueling</strong> · 👤 tu equipo de mecánicos. Suficiente para arrancar.",
    why: "Vueling hace turnaround corto (sin pernoctas): perfecto para aprender a reaccionar rápido.",
    target: null, place: "center", showNext: true },
  // ── Fase 1 · Orientación ──
  { phase: "El mapa", title: "Tu aeropuerto",
    body: "Esto es Asturias en tiempo real. Cada avión en tierra aparece aquí. Los puntos <span style=\\"color:#3aa9ff\\">cyan</span> son de tu cliente; los <span style=\\"color:#a78bfa\\">violeta</span> son tráfico que aún no gestionas.",
    why: "Ver TODO el aeropuerto te ayuda a decidir a qué aerolíneas querrás ofrecer contrato más adelante.",
    target: "#map-info-panel", place: "right", showNext: true,
    onEnter: () => { if (activeTab !== "map") { activeTab = "map"; invalidatePanelCache(); } } },
  { phase: "El tiempo", title: "Control del reloj",
    body: "Aquí controlas la velocidad del juego. Ahora está en <strong>pausa</strong> (⏸). Puedes ir a 1×, 2× o 5×.",
    why: "Pausar te deja pensar sin prisa. Acelerar hace avanzar la jornada cuando no hay nada urgente.",
    target: ".speeds", place: "bottom", showNext: true },
  // ── Fase 2 · El bucle central ──
  { phase: "Tu primera jornada", title: "Pon el reloj en marcha",
    body: "Pulsa <strong>1×</strong> para que empiece la jornada. Los aviones comenzarán a llegar.",
    why: "El tiempo solo corre cuando tú quieres. Empieza despacio para no perderte nada.",
    target: ".speeds button[data-speed=\\"1\\"]", place: "bottom", gate: ".speeds button[data-speed=\\"1\\"]" },
  { phase: "Atento", title: "Observa el aeropuerto",
    body: "Deja correr el tiempo. Cuando un avión aterrice con una avería, aparecerá un <strong>aviso</strong> y el botón 🏭 Operaciones se marcará en rojo.",
    why: "Los avisos (callouts) son el corazón del juego: cada uno es trabajo y dinero con cuenta atrás.",
    target: ".side button[data-tab=\\"operations\\"]", place: "right",
    cond: (g) => activeCalloutExists(g), showNext: true },
  { phase: "Operaciones", title: "Abre Operaciones",
    body: "Haz click en <strong>🏭 Operaciones</strong>. Es tu centro de control: todos los avisos y trabajos activos.",
    why: "Desde aquí gestionas cada orden de trabajo: ver el detalle y asignar mecánicos.",
    target: ".side button[data-tab=\\"operations\\"]", place: "right",
    gate: ".side button[data-tab=\\"operations\\"]" },
  { phase: "La orden de trabajo", title: "Abre el aviso",
    body: "Haz click en una <strong>tarjeta de aviso</strong>. Verás qué falla (capítulo ATA), qué cualificación necesita y cuánto tarda.",
    why: "Cada avión y cada avería son distintos. Leer la orden te dice a quién asignar.",
    target: ".wo-card[data-wo]", place: "right",
    onEnter: () => { if (activeTab !== "operations") { activeTab = "operations"; invalidatePanelCache(); } },
    gate: ".wo-card[data-wo]", cond: (g) => selectedWoId !== null, showNext: true },
  { phase: "Asignar", title: "Pon a un mecánico",
    body: "Asigna un mecánico cualificado a este trabajo (botón en el detalle). El mecánico irá al avión y empezará.",
    why: "Sin mecánico asignado, la avería no se toca y el reloj sigue corriendo hacia la salida.",
    target: "#modal-content", place: "left",
    cond: (g) => anyWoAssigned(g), showNext: true },
  { phase: "En marcha", title: "Acelera y observa",
    body: "El mecánico está trabajando. Pulsa <strong>2×</strong> y mira cómo avanza la barra de progreso del trabajo.",
    why: "Acelerar el tiempo muerto es clave: vigila que termine ANTES de la hora de salida.",
    target: ".speeds button[data-speed=\\"2\\"]", place: "bottom",
    gate: ".speeds button[data-speed=\\"2\\"]", showNext: true },
  { phase: "¡Cobrado!", title: "Has cerrado tu primer trabajo",
    body: "Cuando la orden se completa a tiempo, <strong>cobras</strong> y tu reputación con Vueling sube. Mira tu balance arriba (💰).",
    why: "Ese es el bucle completo. Repetirlo bien, jornada tras jornada, es ganar la partida.",
    target: "#bal", place: "bottom",
    cond: (g) => anyWoCompleted(g), showNext: true },
  // ── Fase 3 · Sistemas de apoyo ──
  { phase: "Sistemas", title: "Equipo",
    body: "En <strong>🏢 Oficina</strong> gestionas a tus mecánicos: turnos, moral y contratación de nuevos.",
    why: "Tu equipo es tu capacidad. Pocos mecánicos = avisos sin atender = penalizaciones.",
    target: ".side button[data-tab=\\"office\\"]", place: "right", showNext: true },
  { phase: "Sistemas", title: "Economía",
    body: "En <strong>💼 Economía</strong> ves tus finanzas: cobros, salarios y penalizaciones, semana a semana.",
    why: "Si gastas más de lo que ingresas, quiebras. Vigila el balance al cerrar cada semana.",
    target: ".side button[data-tab=\\"economy\\"]", place: "right", showNext: true },
  // ── Fase 4 · Graduación ──
  { phase: "Listo", title: "A partir de aquí, mandas tú",
    body: "Ya conoces el bucle: <strong>llega → arregla → despega</strong>. Sigue gestionando avisos, cuida tu equipo y haz crecer tu reputación para firmar más contratos.",
    why: "Los próximos días son tuyos. Si te atascas, todo lo aprendido sigue aquí. ¡Suerte, jefe!",
    target: null, place: "center", showNext: true, isLast: true },
];

function tutCur(){ return TUT_STEPS[tutStep] || null; }
// ¿Existe un aviso (callout) activo? = WO no-daily abierta.
function activeCalloutExists(g){
  return (g.workOrders || []).some(w => !w.templateId?.startsWith?.("DC-") && w.phase !== "Completed" && w.phase !== "Failed" && w.phase !== "Deferred");
}
function anyWoAssigned(g){
  return (g.workOrders || []).some(w => !w.templateId?.startsWith?.("DC-") && (w.assignedMechanicIds?.length || 0) > 0);
}
function anyWoCompleted(g){
  return (g.workOrders || []).some(w => !w.templateId?.startsWith?.("DC-") && w.phase === "Completed");
}

function startTutorial(){
  tutActive = true; tutStep = 0; tutGraduated = false;
  const st = tutCur(); if (st && st.onEnter) { try { st.onEnter(); } catch(e){} }
  render();
}
function tutSkip(){
  tutActive = false; tutGraduated = true;
  document.querySelectorAll(".tut-spotlight").forEach(el => el.classList.remove("tut-spotlight"));
  render();
}
function tutAdvance(){
  if (!tutActive) return;
  const cur = tutCur();
  if (cur && cur.isLast) { tutSkip(); return; }
  tutStep += 1;
  const st = tutCur();
  if (!st) { tutSkip(); return; }
  if (st.onEnter) { try { st.onEnter(); } catch(e){} }
  render();
}
// Auto-avance por condición del sim (llamado desde render cuando el tutorial está vivo).
// Diferido con setTimeout para no re-entrar en render() de forma recursiva.
let tutCondPending = false;
function tutCheckCond(){
  if (!tutActive || tutCondPending) return;
  const st = tutCur();
  if (st && st.cond) {
    try {
      if (st.cond(game)) {
        tutCondPending = true;
        setTimeout(() => { tutCondPending = false; tutAdvance(); }, 600);
      }
    } catch(e){}
  }
}

let lastTutRenderedStep = -1;
function renderTutorial(){
  let root = document.getElementById("tutorial-root");
  if (!root) { root = document.createElement("div"); root.id = "tutorial-root"; document.body.appendChild(root); }
  if (!tutActive) {
    if (root.innerHTML) root.innerHTML = "";
    document.querySelectorAll(".tut-spotlight").forEach(el => el.classList.remove("tut-spotlight"));
    lastTutRenderedStep = -1;
    return;
  }
  const st = tutCur();
  if (!st) { tutSkip(); return; }
  const centered = !st.target || st.place === "center";
  // Reconstruir el bocadillo SOLO al cambiar de paso (evita parpadeo a 2×/5× donde
  // render() corre cada tick). El spotlight sí se re-aplica siempre (targets dentro de
  // paneles dinámicos se recrean en cada innerHTML).
  if (tutStep !== lastTutRenderedStep) {
    const total = TUT_STEPS.length;
    let pips = "";
    for (let i = 0; i < total; i++) pips += \`<span class="pip \${i < tutStep ? "done" : i === tutStep ? "cur" : ""}"></span>\`;
    const nextLabel = st.isLast ? "Empezar a jugar ✈️" : "Continuar →";
    const nextBtn = (st.showNext || st.isLast) ? \`<button class="tut-next" id="tut-next">\${nextLabel}</button>\` : "";
    const cta = st.gate && !st.isLast ? \`<div class="tut-cta">👆 Haz click donde se indica para continuar</div>\` : "";
    root.innerHTML =
      \`<div id="tut-block" class="dim"></div>\` +
      \`<div id="tut-pop" class="\${centered ? "center" : ""}">\` +
        \`<div class="tut-step">📘 Tutorial · \${esc(st.phase)}</div>\` +
        \`<h3>\${st.title}</h3>\` +
        \`<p>\${st.body}</p>\` +
        (st.why ? \`<div class="tut-why">💡 \${st.why}</div>\` : "") +
        cta +
        \`<div class="tut-actions"><button class="tut-skip" id="tut-skip">Saltar tutorial</button>\${nextBtn}</div>\` +
        \`<div id="tut-progress">\${pips}</div>\` +
      \`</div>\`;
    lastTutRenderedStep = tutStep;
  }
  // Spotlight: mover al target actual sin reiniciar la animación si ya lo tiene.
  let targetEl = null;
  if (st.target) { try { targetEl = document.querySelector(st.target); } catch(e){} }
  document.querySelectorAll(".tut-spotlight").forEach(el => { if (el !== targetEl) el.classList.remove("tut-spotlight"); });
  if (targetEl && !targetEl.classList.contains("tut-spotlight")) targetEl.classList.add("tut-spotlight");
  tutPositionPop(targetEl, st.place);
}

// Coloca el bocadillo cerca del target (o centrado). Robusto: si no cabe, recae a centrado.
function tutPositionPop(targetEl, place){
  const pop = document.getElementById("tut-pop");
  if (!pop) return;
  if (!targetEl || place === "center") { pop.classList.add("center"); pop.style.top = ""; pop.style.left = ""; return; }
  pop.classList.remove("center");
  const r = targetEl.getBoundingClientRect();
  const pw = pop.offsetWidth || 360, ph = pop.offsetHeight || 160;
  const gap = 14, vw = window.innerWidth, vh = window.innerHeight;
  let top, left;
  if (place === "right")      { left = r.right + gap; top = r.top + r.height/2 - ph/2; }
  else if (place === "left")  { left = r.left - gap - pw; top = r.top + r.height/2 - ph/2; }
  else if (place === "top")   { left = r.left + r.width/2 - pw/2; top = r.top - gap - ph; }
  else                        { left = r.left + r.width/2 - pw/2; top = r.bottom + gap; } // bottom
  // Clamp a viewport.
  left = Math.max(12, Math.min(left, vw - pw - 12));
  top  = Math.max(12, Math.min(top,  vh - ph - 12));
  pop.style.left = left + "px";
  pop.style.top  = top + "px";
}

function render(){
  // Pivot iteración 2026-05-25: New Game wizard overlay. Si está activo, mostrarlo
  // como overlay full-screen y no renderizar el resto. Se inyecta en un div dedicado.
  let ngOverlay = document.getElementById("newgame-overlay-root");
  if (!ngOverlay) {
    ngOverlay = document.createElement("div");
    ngOverlay.id = "newgame-overlay-root";
    document.body.appendChild(ngOverlay);
  }
  ngOverlay.innerHTML = renderNewGameWizard();
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
  // Pivot iteración 2026-05-24: badge Oficina = mecs idle ahora (disponibles para asignar).
  // 0 idle → alerta (todos ocupados o off-shift), señal de bottleneck de personal.
  {
    const badgeOffice = document.getElementById("badge-office");
    if (badgeOffice) {
      const idle = game.mechanics.filter(m => m.state === "Idle").length;
      badgeOffice.textContent = idle;
      badgeOffice.classList.toggle("alert", idle === 0);
    }
  }
  // Pivot línea pura · Production Planning: badge = nº de pernoctas pendientes
  {
    const badgePlan = document.getElementById("badge-planning");
    if (badgePlan) badgePlan.textContent = pendingNightOvernighters().length;
  }
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
    else if (activeTab === "planning")    html = renderProductionPlanning();
    else if (activeTab === "office")  html = renderOffice();
    else if (activeTab === "contracts")  html = renderContracts();
    else if (activeTab === "market")     { activeTab = "office"; officeSubtab = "hiring"; html = renderOffice(); } // backward compat saves antiguos
    else if (activeTab === "construction") html = renderConstruction();
    else if (activeTab === "dashboard")  html = renderDashboard();
    else                                 html = renderEconomy();
    if (html !== lastPanelHtml) {
      const _tPa = performance.now();
      document.getElementById("panel-content").innerHTML = html;
      const _tPb = performance.now();
      window.__perf && (window.__perf.panelRender += (_tPb - _tPa));
      lastPanelHtml = html;
    }
    lastPanelRenderMs = nowMs;
  }
  const _tMa = performance.now();
  syncMapRender();
  const _tMb = performance.now();
  window.__perf && (window.__perf.mapSync += (_tMb - _tMa));
  // Pivot iteración 2026-05-25: actualizar panel info overlay sobre el mapa.
  // Throttle 500ms: el panel no necesita 10 actualizaciones/seg, basta con 2. Esto
  // evita filter/sort sobre flights[] (157 BIO, 403 ALC) cada tick a 5x — feedback
  // Dani: el juego se trababa a 5x con bottlenecks acumulados.
  if (activeTab === "map" && !game.gameOver.isOver && (nowMs - lastMapInfoRenderMs) >= 500) {
    const _tIa = performance.now();
    updateMapInfoPanel();
    const _tIb = performance.now();
    window.__perf && (window.__perf.mapInfo += (_tIb - _tIa));
    lastMapInfoRenderMs = nowMs;
  }

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

  // Tutorial guiado: aplicar overlay/spotlight al final (tras reconstruir paneles) y
  // comprobar condiciones de auto-avance del sim.
  renderTutorial();
  tutCheckCond();
}

// === Tutorial: gating de clicks (capture phase, antes que el handler normal) ===
// Si el tutorial está activo, solo se permite: (a) clicks dentro del bocadillo #tut-pop,
// (b) el elemento "gate" del paso actual. Todo lo demás se traga. Cuando el usuario clica
// el gate correcto, dejamos pasar el click (para que el handler normal ejecute la acción)
// y avanzamos el tutorial justo después.
document.addEventListener("click", (e) => {
  if (!tutActive) return;
  // Clicks en el bocadillo (Continuar / Saltar) siempre permitidos — los gestiona el
  // handler de burbuja de abajo.
  if (e.target.closest && e.target.closest("#tut-pop")) return;
  const st = tutCur();
  const gateEl = st && st.gate ? (e.target.closest && e.target.closest(st.gate)) : null;
  if (gateEl) {
    // Click correcto: dejar que el handler normal haga la acción, luego avanzar.
    setTimeout(() => { if (tutActive && tutCur() === st) tutAdvance(); }, 60);
    return;
  }
  // Cualquier otro click: bloquear (guiado absoluto).
  e.stopPropagation();
  e.preventDefault();
  // Feedback: parpadeo del bocadillo para indicar "aquí no".
  const pop = document.getElementById("tut-pop");
  if (pop) { pop.style.transition = "transform .08s"; pop.style.transform = (pop.classList.contains("center") ? "translate(-50%,-50%) " : "") + "scale(1.03)"; setTimeout(() => { pop.style.transform = pop.classList.contains("center") ? "translate(-50%,-50%)" : ""; }, 120); }
}, true);

document.body.addEventListener("click", (e) => {
  // Tutorial: botones del bocadillo (se evalúan primero; van por encima del bloqueo).
  if (e.target.id === "tut-next") { tutAdvance(); return; }
  if (e.target.id === "tut-skip") { tutSkip(); return; }
  if (e.target.id === "btn-save") { doSave(); return; }
  if (e.target.id === "btn-load") { doLoad(); return; }
  if (e.target.id === "btn-new")  { doNewGame(); return; }
  // Pivot iteración 2026-05-25 — New Game wizard handlers
  // Intro step
  if (e.target.id === "ng-start") { newGameStep = "airport"; render(); return; }
  if (e.target.id === "ng-continue") { doContinueFromIntro(); return; }
  if (e.target.id === "ng-clear-save") {
    if (!confirm("¿Borrar partida guardada definitivamente? No se puede deshacer.")) return;
    (async () => {
      await S.getStorage().clear();
      hasSavedSlot = false;
      render();
    })();
    return;
  }
  // Airport/operator steps
  const ngAirport = e.target.closest("[data-newgame-airport]");
  if (ngAirport) { newGameSelectedIcao = ngAirport.dataset.newgameAirport; newGameStep = "operator"; render(); return; }
  const ngPreset = e.target.closest("[data-newgame-preset]");
  if (ngPreset) { startGameFromPreset(ngPreset.dataset.newgamePreset); return; }
  if (e.target.id === "ng-back") { newGameStep = "airport"; render(); return; }
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
  // Rediseño CIC: variante de Operaciones (A·Triaje / B·Telemetría / C·Tablero)
  const variantBtn = e.target.closest("[data-variant]");
  if (variantBtn) { variant = variantBtn.dataset.variant; invalidatePanelCache(); render(); return; }
  // Rediseño CIC: tile de la barra de situación → filtra el feed (toggle)
  const sitTile = e.target.closest("[data-sit-filter]");
  if (sitTile) { const k = sitTile.dataset.sitFilter; sitFilter = (sitFilter === k) ? null : k; invalidatePanelCache(); render(); return; }
  // Rediseño CIC: click en fila de Schedule → cajón de vuelo
  const flightRow = e.target.closest("[data-flight]");
  if (flightRow) { detailFlightId = flightRow.dataset.flight; invalidateModalCache(); render(); return; }
  const speedBtn = e.target.closest(".speeds button");
  if (speedBtn) { S.setGameSpeed(game, parseInt(speedBtn.dataset.speed)); render(); return; }
  const tabBtn = e.target.closest(".side > button");
  if (tabBtn && tabBtn.dataset.tab) { activeTab = tabBtn.dataset.tab; invalidatePanelCache(); render(); return; }
  // Pivot iteración 2026-05-25: sub-tabs de Oficina (Equipo / Contratación / Management).
  const officeSubBtn = e.target.closest("[data-office-subtab]");
  if (officeSubBtn) { officeSubtab = officeSubBtn.dataset.officeSubtab; invalidatePanelCache(); render(); return; }
  // Pivot iteración 2026-05-25: toggles de Management (checkboxes).
  const mgmtToggle = e.target.closest("[data-mgmt-toggle]");
  if (mgmtToggle && e.target.tagName === "INPUT") {
    const key = mgmtToggle.dataset.mgmtToggle;
    if (!game.management) game.management = { autoAssignTrivial: true, melAutoDefer: "never", overtimeAutoCall: false };
    if (key === "autoPause") game.autoPauseEnabled = e.target.checked;
    else if (key === "autoAssignTrivial") game.management.autoAssignTrivial = e.target.checked;
    else if (key === "overtimeAutoCall") game.management.overtimeAutoCall = e.target.checked;
    invalidatePanelCache();
    render();
    return;
  }
  // Pivot iteración 2026-05-25: radio buttons de MEL auto-defer policy.
  const melRadio = e.target.closest("[data-mgmt-meldefer]");
  if (melRadio && e.target.tagName === "INPUT") {
    if (!game.management) game.management = { autoAssignTrivial: true, melAutoDefer: "never", overtimeAutoCall: false };
    game.management.melAutoDefer = melRadio.dataset.mgmtMeldefer;
    invalidatePanelCache();
    render();
    return;
  }
  // === Pivot iteración 2026-05-24: chips clickables específicos ===
  // Estos handlers se evalúan ANTES de los handlers de card genéricas (wo-card, check-card,
  // daily-card) para que un click sobre un chip dentro de una card abra el modal del chip
  // (más específico) en lugar del de la card. Aplica a Event Tracking, Production Planning,
  // Schedule, Mecánicos — cualquier vista que use .clickable-chip data-*.
  const typeChip = e.target.closest("[data-airplane-type]");
  if (typeChip) { detailAirplaneType = typeChip.dataset.airplaneType; invalidateModalCache(); render(); return; }
  const fleetCard = e.target.closest("[data-fleet-reg]");
  if (fleetCard) { detailFleetReg = fleetCard.dataset.fleetReg; invalidateModalCache(); render(); return; }
  const dailyCard = e.target.closest("[data-daily-airplane]");
  if (dailyCard) { detailDailyAirplaneId = dailyCard.dataset.dailyAirplane; invalidateModalCache(); render(); return; }
  // === Cards genéricas (WO, check, mech, contract) — se evalúan DESPUÉS ===
  // Pivot iteración 2026-05-25: aceptar cards de WO aunque sean .base (Closed) — el
  // modal detecta phase Completed/Failed y muestra info histórica (sin botones de
  // asignar/defer). data-wo es la condición real, no la clase visual.
  const woCard = e.target.closest("[data-wo]");
  if (woCard) { selectedWoId = woCard.dataset.wo; manualCertId = ""; manualHelperIds = []; detailFlightId = null; render(); return; }
  const mechRow = e.target.closest("[data-mech-id]");
  if (mechRow && !e.target.closest("button") && !e.target.closest("select")) {
    detailMechId = mechRow.dataset.mechId;
    invalidateModalCache();
    render();
    return;
  }
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
    detailDailyAirplaneId = null;
    detailAirplaneType = null;
    detailFlightId = null;
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
  // Pivot línea pura · iteración 2026-05-24: el mec en overtime viene DE CASA, no de la
  // oficina → +120min al stateRemainingMinutes inicial del trayecto ToPlane.
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
    if (r.ok) {
      // +120min de tránsito al cert (viene de casa, no de la oficina). Si llevó helpers
      // que también estaban OffShift, asumimos lo mismo (en realidad solo el cert podría
      // estar OffShift en este flujo, pero curamos por seguridad).
      const assignedIds = [manualCertId, ...manualHelperIds];
      for (const id of assignedIds) {
        const m = game.mechanics.find(mm => mm.id === id);
        if (m && m.state === "ToPlane") {
          m.stateRemainingMinutes += 120;
        }
      }
      game.notifCounter += 1;
      game.notifications.push({
        id: game.notifCounter, minute: game.clock.minute,
        text: \`⏱️ \${mech.name} viene de casa (+2h tránsito a stand)\`,
        type: "info",
      });
      selectedWoId = null; render();
    }
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
    swapRuntimeForGame(loaded);
    Object.assign(game, loaded);
    saveIndicator = "loaded";
    render();
    setTimeout(() => { saveIndicator = ""; render(); }, 2000);
  } catch (e) {
    alert("Error al cargar: " + e.message);
  }
}

/** Continuar partida desde la pantalla intro: misma lógica que doLoad() pero cierra
 *  el wizard al terminar (newGameStep = null) en lugar de mantenerlo abierto. */
async function doContinueFromIntro() {
  try {
    const payload = await S.getStorage().load();
    if (!payload) { alert("No hay partida guardada."); return; }
    const loaded = S.deserializeGame(payload, S.DATA.balance, S.DATA.airlines, S.DATA.workOrders, S.DATA.maintenanceChecks, S.DATA.dailyChecks);
    // Swap runtime al aeropuerto del save antes de sobrescribir game (para que el
    // pixi-driver y schedule.ts arranquen con los assets correctos del aeropuerto).
    swapRuntimeForGame(loaded);
    Object.assign(game, loaded);
    newGameStep = null;
    saveIndicator = "loaded";
    render();
    setTimeout(() => { saveIndicator = ""; render(); }, 2000);
  } catch (e) {
    alert("Error al cargar: " + e.message);
  }
}

/** Helper: dado un game state, swap del runtime (schedule+fleet+paths) al aeropuerto
 *  correspondiente. Idempotente: si airportIcao no está en airportRuntime, no hace nada
 *  (asume default OVD ya cargado). */
function swapRuntimeForGame(gameState) {
  const icao = gameState.airportIcao;
  if (!icao) return; // legacy save sin airportIcao → asumir OVD default
  const runtime = S.DATA.airportRuntime[icao];
  if (!runtime) return;
  S.setActiveAirportData(runtime.schedule, runtime.fleet);
  if (window.Render && Render.setActiveAirportPaths) {
    Render.setActiveAirportPaths(runtime.paths);
  }
}
async function doNewGame() {
  // Pivot iteración 2026-05-25: abrir wizard New Game en lugar de crear directo.
  // Si ya hay save, confirmar antes de descartarlo.
  if (hasSavedSlot && !confirm("¿Empezar nueva partida? Se perderá el progreso actual.")) return;
  newGameStep = "airport";
  newGameSelectedIcao = null;
  newGameCatalog = S.DATA.airportCatalog;
  render();
}

/** Procesa elección final: aeropuerto + operador → carga preset → crea game.
 *  Pivot 2026-05-25 multi-airport: ANTES de createGame, swap del runtime
 *  (schedule+fleet+paths) al aeropuerto elegido. Si el ICAO no tiene runtime
 *  registrado en DATA.airportRuntime, falla limpiamente. */
async function startGameFromPreset(presetFile) {
  const presetKey = presetFile.replace(".preset.json", "");
  const preset = S.DATA.presets[presetKey];
  if (!preset) { alert("Preset no encontrado: " + presetFile); return; }
  const icao = preset.icao;
  const runtime = S.DATA.airportRuntime[icao];
  if (!runtime) {
    alert("Aeropuerto " + icao + " no tiene runtime (schedule/fleet/paths) bundleado todavía. Próximamente.");
    return;
  }
  // Swap data antes de crear game (idempotente: si ya estaba OVD y eliges OVD, no rompe).
  S.setActiveAirportData(runtime.schedule, runtime.fleet);
  if (window.Render && Render.setActiveAirportPaths) {
    Render.setActiveAirportPaths(runtime.paths);
  }
  await S.getStorage().clear();
  const fresh = S.createGame(S.DATA.balance, S.DATA.airlines, S.DATA.workOrders,
    Math.floor(Math.random() * 1e9), [], S.DATA.dailyChecks,
    { lineMode: true, airportPreset: preset });
  lastProductionPackageDay = 0;
  Object.assign(game, fresh);
  hasSavedSlot = false;
  selectedWoId = null;
  newGameStep = null;
  newGameSelectedIcao = null;
  // Tutorial Rookie (2026-05-30): ON por defecto en dificultad 1 (Rookie). El primer paso
  // ofrece "Saltar tutorial" para quien ya tiene experiencia. activeTab arranca en mapa
  // para que la orientación tenga el contexto visual delante.
  tutActive = false; tutGraduated = false; tutStep = 0;
  activeTab = "map";
  render();
  if ((preset.difficulty ?? 1) === 1) {
    // pequeño defer para asegurar que el DOM base está montado antes del overlay.
    setTimeout(() => startTutorial(), 50);
  }
}

/** Renderiza overlay wizard New Game (full-screen). */
function renderNewGameWizard() {
  if (newGameStep === null) return "";
  const catalog = newGameCatalog ?? S.DATA.airportCatalog;
  let inner = "";
  if (newGameStep === "intro") {
    // Pantalla intro de arranque: title big, subtítulo, 2-3 botones según haya save.
    const continueBtn = hasSavedSlot
      ? \`<button id="ng-continue" class="ng-select-btn primary" style="font-size:1rem;padding:.85rem 1.6rem">⏩ Continuar partida</button>\`
      : \`<button class="ng-select-btn primary" style="font-size:1rem;padding:.85rem 1.6rem;opacity:.4;cursor:not-allowed" disabled>⏩ Continuar partida (sin guardado)</button>\`;
    const clearBtn = hasSavedSlot
      ? \`<button id="ng-clear-save" class="ng-back-btn" style="margin-top:1.5rem;font-size:.78rem">🗑 Borrar partida guardada</button>\`
      : "";
    inner = \`<div class="newgame-intro">
      <div class="ng-intro-logo">🛬</div>
      <h1 class="ng-intro-title">MRO Tycoon</h1>
      <p class="ng-intro-sub">Gestión de mantenimiento aeronáutico</p>
      <div class="ng-intro-actions">
        <button id="ng-start" class="ng-select-btn primary" style="font-size:1rem;padding:.85rem 1.6rem">▶ Nueva partida</button>
        \${continueBtn}
      </div>
      \${clearBtn}
      <p class="ng-intro-foot">v0.6 · línea pura · datos reales AeroDataBox mayo 2026</p>
    </div>\`;
  } else if (newGameStep === "airport") {
    const availCount = catalog.airports.filter(a => a.available !== false).length;
    inner = \`<div class="newgame-header">
      <h1 style="margin:0 0 .3rem 0;font-size:1.8rem">🛬 MRO Tycoon · Nueva Partida</h1>
      <p class="muted" style="margin:0">Paso 1 de 2 · Elige tu aeropuerto base · \${availCount}/\${catalog.airports.length} disponibles</p>
    </div>
    <div class="newgame-cards newgame-cards-airports">\`;
    for (const ap of catalog.airports) {
      const stars = "⭐".repeat(ap.difficultyOverall);
      const isAvailable = ap.available !== false;
      const disabledCls = isAvailable ? "" : " ng-disabled";
      const tooltip = isAvailable ? "" : \` title="\${esc(ap.comingSoonReason ?? 'Próximamente')}"\`;
      const dataAttr = isAvailable ? \`data-newgame-airport="\${ap.icao}"\` : "";
      const footer = isAvailable
        ? \`<button class="ng-select-btn">Seleccionar →</button>\`
        : \`<div class="ng-coming-soon">⏳ \${esc(ap.comingSoonReason ?? "Próximamente")}</div>\`;
      const meta = isAvailable && ap.operators.length > 0
        ? \`<span><strong>\${ap.operators.length}</strong> operador\${ap.operators.length === 1 ? "" : "es"} contratable\${ap.operators.length === 1 ? "" : "s"}</span>\`
        : \`<span class="muted">Próximamente</span>\`;
      inner += \`<article class="newgame-card\${disabledCls}" \${dataAttr}\${tooltip}>
        <div class="ng-card-head">
          <h2>✈️ \${esc(ap.name)} <span class="muted" style="font-size:.7rem">(\${ap.iata}/\${ap.icao} · \${ap.country})</span></h2>
          <span class="ng-stars">\${stars}</span>
        </div>
        <p class="ng-desc">\${esc(ap.shortDesc)}</p>
        <div class="ng-meta">\${meta}</div>
        \${footer}
      </article>\`;
    }
    inner += \`</div>
    <div class="newgame-footer">
      <p class="muted" style="font-size:.78rem;margin:0">Cada aeropuerto trae layout OSM real + schedule AeroDataBox mayo 2026 + operadores físicos saneados. Los grises se irán activando en próximos sprints.</p>
    </div>\`;
  } else if (newGameStep === "operator") {
    const ap = catalog.airports.find(a => a.icao === newGameSelectedIcao);
    if (!ap) { newGameStep = "airport"; return renderNewGameWizard(); }
    inner = \`<div class="newgame-header">
      <h1 style="margin:0 0 .3rem 0;font-size:1.8rem">🛬 \${esc(ap.name)} · Elige tu primer cliente</h1>
      <p class="muted" style="margin:0">Paso 2 de 2 · El operador define tu setup inicial (flota, fees, dificultad)</p>
    </div>
    <div class="newgame-cards newgame-cards-3">\`;
    for (const op of ap.operators) {
      const stars = "⭐".repeat(op.difficulty);
      const disabledCls = op.available ? "" : " ng-disabled";
      const tooltip = op.available ? "" : \` title="\${esc(op.comingSoonReason ?? 'Próximamente')}"\`;
      inner += \`<article class="newgame-card\${disabledCls}" \${op.available ? \`data-newgame-preset="\${op.presetFile}"\` : ""} \${tooltip}>
        <div class="ng-card-head">
          <h2 style="color:\${op.color}">\${esc(op.operatorName)} <span class="muted" style="font-size:.7rem">\${op.operatorIata}</span></h2>
          <span class="ng-stars">\${stars} <span class="muted" style="font-size:.7rem">\${esc(op.difficultyLabel)}</span></span>
        </div>
        <div class="ng-shortline">\${esc(op.shortLine)}</div>
        <p class="ng-desc">"\${esc(op.tagline)}"</p>
        <div class="ng-metrics">
          <div><span class="muted">Movs/sem</span> <strong>\${op.metrics.movsPerWeek}</strong></div>
          <div><span class="muted">🌙 Pernoctas/sem</span> <strong>\${op.metrics.overnightsPerWeek}</strong></div>
          <div><span class="muted">Modelo</span> <strong>\${esc(op.metrics.model)}</strong></div>
          <div><span class="muted">💰 Balance</span> <strong>\${op.metrics.balance.toLocaleString("es-ES")} €</strong></div>
          <div><span class="muted">👤 Mecs</span> <strong>\${esc(op.metrics.mechs)}</strong></div>
        </div>
        \${op.available
          ? \`<button class="ng-select-btn primary">🚀 Empezar con \${esc(op.operatorName)}</button>\`
          : \`<div class="ng-coming-soon">⏳ Próximamente: \${esc(op.comingSoonReason ?? "")}</div>\`}
      </article>\`;
    }
    inner += \`</div>
    <div class="newgame-footer">
      <button id="ng-back" class="ng-back-btn">← Cambiar aeropuerto</button>
    </div>\`;
  }
  return \`<div id="newgame-overlay" class="newgame-overlay">
    <div class="newgame-panel">\${inner}</div>
  </div>\`;
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

// Pivot iteración 2026-05-25 — Performance tracing: agregamos tiempos por subsistema y los
// reportamos a console cada 5s real. Abrir DevTools (F12) > Console para ver [PERF] lines.
// Identifica cuál subsistema (advance / mapSync / panelRender / mapInfoPanel) consume más.
window.__perf = { advance: 0, mapSync: 0, panelRender: 0, mapInfo: 0, ticks: 0, slowest: 0, slowestWhat: "" };
let _lastPerfReport = performance.now();

setInterval(() => {
  if (game.clock.speed === 0) return;
  const _tA = performance.now();
  S.advanceGame(game, game.clock.speed);
  const _tB = performance.now();
  window.__perf.advance += (_tB - _tA);
  // Pivot línea pura: notif diaria del paquete de trabajo nocturno (~12:00).
  // Una vez por día, si hay overnighters confirmados en pernocta hoy.
  const gd = Math.floor(game.clock.minute / S.DAY_MINUTES) + 1;
  const minOfDay = game.clock.minute % S.DAY_MINUTES;
  if (minOfDay >= 12 * 60 && gd !== lastProductionPackageDay) {
    const overnights = pendingNightOvernighters();
    if (overnights.length > 0) {
      // Agrupar por aerolínea
      const byAirline = {};
      for (const ap of overnights) {
        const c = game.contracts.find(cc => cc.id === ap.contractId);
        const al = c ? game.airlines.find(a => a.id === c.airlineId) : null;
        if (!al) continue;
        if (!byAirline[al.id]) byAirline[al.id] = { name: al.name, regs: [] };
        byAirline[al.id].regs.push(ap.registration);
      }
      for (const a of Object.values(byAirline)) {
        game.notifCounter += 1;
        game.notifications.push({
          id: game.notifCounter, minute: game.clock.minute,
          text: \`📋 \${a.name}: paquete trabajo noche → \${a.regs.join(", ")}\`,
          type: "info",
        });
      }
    }
    lastProductionPackageDay = gd;
  }
  const _tC = performance.now();
  render();
  const _tD = performance.now();
  window.__perf.ticks++;
  // El tiempo de render() incluye panelRender + mapSync + mapInfo (medidos internamente).
  // Su delta total nos da el "render time" del tick.
  const renderTotal = _tD - _tC;
  const tickTotal = _tD - _tA; // advance + render = tick completo
  if (tickTotal > window.__perf.slowest) {
    window.__perf.slowest = tickTotal;
    // Desglose del slowest tick para detectar dónde se va el tiempo cuando spike
    const advanceMs = _tB - _tA;
    const renderMs = _tD - _tC;
    // Si renderMs >> mapSync+panelRender+mapInfo medidos → resto es HUD + GC + notifs (no medido)
    window.__perf.slowestWhat = \`@\${S.formatClock(game.clock.minute)} (adv \${advanceMs.toFixed(0)}ms · render \${renderMs.toFixed(0)}ms)\`;
  }
  // Report cada 5s real
  if (_tD - _lastPerfReport >= 5000) {
    const p = window.__perf;
    const t = Math.max(1, p.ticks);
    const apActive = game.airplanes.length;
    const apArc = game.archive?.airplanes?.length ?? 0;
    const woActive = game.workOrders.length;
    const woArc = game.archive?.workOrders?.length ?? 0;
    console.log(\`[PERF] \${p.ticks}t/5s · adv \${(p.advance/t).toFixed(2)} · mapSync \${(p.mapSync/t).toFixed(2)} · panel \${(p.panelRender/t).toFixed(2)} · mapInfo \${(p.mapInfo/t).toFixed(2)} · SLOWEST \${p.slowest.toFixed(0)}ms \${p.slowestWhat} · airpl \${apActive}A+\${apArc}arc · WO \${woActive}A+\${woArc}arc · ledger \${game.economy.ledger.length}\`);
    // Si el slowest fue > 100ms, mostrar detalle del estado en ese momento
    if (p.slowest > 100) {
      console.warn(\`[PERF spike] \${p.slowest.toFixed(0)}ms — el render fue mucho mayor que la suma de subsistemas medidos. Sospechosos: (1) GC pause del browser, (2) Pixi creando muchos sprites, (3) HUD/notif updates no instrumentados. Memory heap actual: ~\${performance.memory ? (performance.memory.usedJSHeapSize/1048576).toFixed(0)+'MB' : 'n/a'}\`);
    }
    window.__perf = { advance: 0, mapSync: 0, panelRender: 0, mapInfo: 0, ticks: 0, slowest: 0, slowestWhat: "" };
    _lastPerfReport = _tD;
  }
}, 100);`;

await main();
