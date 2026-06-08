// Build script del bundle vanilla single-file.
//
// Toma `src/lib/sim-all.ts` → esbuild IIFE (global `Sim`) → concatena con shell HTML+CSS y
// UI handlers (template literal) → escribe `builds/<output>.html`.
//
// Uso: `node .scripts/build-vanilla.mjs [output-name]`
// Default output: builds/v0.2-fase3-h.html

import { build } from "esbuild";
import { writeFileSync, mkdirSync, cpSync, existsSync, readFileSync } from "node:fs";
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

// Fuentes CIC embebidas en base64 (offline-first: el build no puede depender de Google
// Fonts en runtime). Generadas por .scripts/gen-fonts.mjs → .scripts/fonts-embedded.css.
// Si el fichero no existe (no se corrió gen-fonts), cae a los fallbacks del stack (--disp/--mono).
const FONTS_CSS = (() => {
  const p = join(root, ".scripts", "fonts-embedded.css");
  return existsSync(p) ? readFileSync(p, "utf-8") : "";
})();

function renderHtml(simBundle, renderBundle) {
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>MRO Tycoon — Fase 3 Bloque H</title>
<style>
${FONTS_CSS}${CSS}
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
/* Top-bar — portado del handoff CIC (ops.css .hud*, valores directos sin tokens) */
.hud{display:flex;justify-content:space-between;align-items:center;gap:.7rem;padding:0 .9rem;background:linear-gradient(180deg,#0e1620,#0b121b);border-bottom:1px solid #1f2a38;height:52px;flex-shrink:0;box-shadow:0 1px 0 rgba(255,255,255,.02) inset}
.hud-l{display:flex;gap:.55rem;align-items:center;flex:none}
.hud-c{display:flex;gap:.5rem;align-items:center;padding:.2rem .6rem;border:1px solid #1f2a38;border-radius:8px;background:#0c1420}
.hud-r{display:flex;gap:.45rem;align-items:center}
.brand{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:7px;color:#fff;font-size:.82rem;font-weight:400;background:linear-gradient(135deg,#1d4f7e,#0d2236);border:1.5px solid #4da3ff;box-shadow:0 0 12px rgba(77,163,255,.22)}
.hud-l .name{font:700 .96rem/1 var(--mono,monospace);letter-spacing:.04em;color:#e9edf4}
.hud-l .name b{color:#4da3ff}
.ver{font-family:var(--mono,monospace);font-size:.62rem;color:#586477;letter-spacing:.04em}
.clock{font-family:var(--mono,monospace);font-size:.92rem;font-weight:700;color:#e9edf4}
.daynight{color:#86c5ff;display:grid;place-items:center;font-size:.82rem}
.wk{font-family:var(--mono,monospace);font-size:.64rem;color:#586477;padding-left:.5rem;border-left:1px solid #1f2a38}
.kpi{display:flex;flex-direction:column;justify-content:center;gap:1px;padding:0 .55rem;font-size:inherit;color:inherit}
.kpi .klbl{font:.55rem/1 var(--mono,monospace);text-transform:uppercase;letter-spacing:.09em;color:#586477}
.kpi strong{font:700 .92rem var(--mono,monospace);color:#e9edf4;letter-spacing:.01em}
.kpi strong.neg{color:#f85149}
.kpi s{font:.62rem var(--mono,monospace);color:#586477;text-decoration:none;margin-left:1px}
#kpi-rep strong{color:#e6a93a}
.compliance-kpi{cursor:pointer;border-radius:6px;border:1px solid transparent}
.compliance-kpi:hover{background:#ffffff06}
.compliance-kpi.good strong{color:#3fb950}.compliance-kpi.warn strong{color:#e6a93a}.compliance-kpi.bad strong{color:#f85149}
.hud-tools{display:flex;gap:.25rem;align-items:center}
.icbtn{width:30px;height:30px;display:grid;place-items:center;padding:0;background:#131c28;border:1px solid #1f2a38;border-radius:7px;color:#8aa0b4;cursor:pointer}
.icbtn:hover{border-color:#4da3ff;color:#e9edf4;background:#0d2236}
.hud svg.tic,.speeds button svg{stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;display:block}
.icbtn svg.tic{width:16px;height:16px}
.speeds{display:flex;gap:.15rem;margin-left:.35rem;padding:.15rem;border:1px solid #1f2a38;border-radius:8px;background:#0c1420}
.speeds button{min-width:30px;height:24px;padding:0 .4rem;border:0;background:none;color:#8aa0b4;border-radius:6px;font:600 .72rem var(--mono,monospace);display:grid;place-items:center}
.speeds button svg{width:14px;height:14px}
.speeds button.active{background:#10314f;color:#86c5ff;box-shadow:0 0 0 1px #4da3ff inset}
.speeds button:hover:not(.active){color:#e9edf4}
button{font:inherit;color:var(--text);background:var(--panel);border:1px solid var(--border);border-radius:3px;padding:.4rem .75rem;cursor:pointer}
button:hover{background:var(--panel-h)}button.active{background:var(--accent-d);border-color:var(--accent)}
button.primary{background:var(--accent-d);border-color:var(--accent)}
.body{display:grid;grid-template-columns:180px 1fr 280px;flex:1;min-height:0}
/* Sidebar agrupado — portado del handoff CIC (ops.css .nav*, valores directos sin depender de tokens) */
.side{background:linear-gradient(180deg,#0d141d,#0b1019);border-right:1px solid #1f2a38;padding:.55rem .5rem;display:flex;flex-direction:column;gap:.06rem;overflow-y:auto}
.side::-webkit-scrollbar{width:0}
.side-grp{font:600 .58rem/1 var(--mono,monospace);text-transform:uppercase;letter-spacing:.14em;color:#5a6b7d;padding:.9rem .6rem .35rem}
.side button[data-tab],.side button.nav-dis{display:flex;align-items:center;gap:.62rem;width:100%;text-align:left;background:none;border:0;color:#8aa0b4;padding:.5rem .6rem;border-radius:8px;cursor:pointer;font-size:.83rem;font-weight:500;position:relative;transition:background .12s,color .12s}
.side button .ic{width:18px;height:18px;display:grid;place-items:center;opacity:.92;flex:none}
.side button .ic svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round}
.side button .nt{flex:1}
.side button .badge{float:none;margin-left:auto;font:600 .68rem var(--mono,monospace);padding:.05rem .42rem;border-radius:999px;background:#2a3848;color:#e6edf5;animation:none}
.side button .badge.alert{background:#e5534b;color:#fff}
.side button .badge.warn{background:#d29922;color:#1a1206}
.side button:hover{background:#ffffff08;color:#e6edf5}
.side button[data-tab].active{background:#16334f;color:#e6edf5}
.side button[data-tab].active .ic{color:#4da3ff;opacity:1}
.side button[data-tab].active::before{content:"";position:absolute;left:-.5rem;top:50%;transform:translateY(-50%);width:3px;height:60%;background:#4da3ff;border-radius:0 3px 3px 0}
.side button.nav-dis{opacity:.4;cursor:not-allowed}
/* ===== Contratos (cartera de clientes) — portado del handoff CIC (ops.css + ops-panels.css) ===== */
.cic-panel .main-head{padding:1rem 1.5rem .6rem;border-bottom:1px solid var(--line)}
.cic-panel .eyebrow{display:flex;align-items:center;gap:.5rem;font:600 .64rem var(--disp);text-transform:uppercase;letter-spacing:.16em;color:var(--accent)}
.cic-panel .eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 9px var(--accent)}
.cic-panel .title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-top:.25rem}
.cic-panel .title-row h1{margin:0;font:600 1.5rem/1 var(--disp);letter-spacing:-.01em;border:0;padding:0}
.cic-panel .title-row .sub{font:.74rem var(--mono);color:var(--dim);margin-top:.3rem}
.office-sit{padding:1rem 1.5rem 0}
.sitbar{border:1px solid var(--line);border-radius:var(--rad);background:linear-gradient(180deg,#121b28,#0e1620);overflow:hidden}
.sit-tiles{display:grid;grid-template-columns:repeat(4,1fr)}
.sit-tiles .tile{position:relative;padding:.7rem .9rem;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:.2rem}
.sit-tiles .tile:last-child{border-right:none}
.sit-tiles .tnum{font:700 1.5rem/1 var(--mono);letter-spacing:-.02em;color:var(--text)}
.sit-tiles .tlbl{display:flex;align-items:center;gap:.35rem;font:.6rem/1.1 var(--disp);text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
.sit-tiles .tile.c-progress .tnum{color:var(--accent)} .sit-tiles .tile.c-unassigned .tnum{color:var(--warn)} .sit-tiles .tile.c-aog .tnum{color:var(--warn)}
.sit-tiles .led{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 8px currentColor}
.feed-wrap{padding:1rem 1.5rem 1.5rem}
.grp-head{display:flex;align-items:center;gap:.6rem;margin:1.4rem 0 .7rem;font:600 .82rem var(--disp);color:var(--text)}
.grp-head .gdot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
.grp-head .gline{flex:1;height:1px;background:var(--line)}
.grp-head .gcount{font:600 .72rem var(--mono);color:var(--muted);background:var(--panel-2);padding:.1rem .5rem;border-radius:10px}
.g-risk .gdot{background:var(--warn)} .g-scheduled .gdot{background:var(--base)} .g-progress .gdot{background:var(--accent)}
.ccgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:.9rem}
.ccard{position:relative;border:1px solid var(--line);border-radius:var(--rad);background:linear-gradient(180deg,#121b28,#0d1520);overflow:hidden}
.ccard.offer{border-style:dashed;border-color:var(--line-2)}
.cc-bar{height:3px;background:var(--oc,var(--accent))}
.cc-head{display:flex;align-items:center;justify-content:space-between;padding:.7rem .8rem .4rem}
.cc-nm{display:flex;align-items:center;gap:.5rem}
.cc-nm h3{margin:0;font:600 1rem var(--disp);border:0;padding:0}
.cc-ia{font:.7rem var(--mono);color:var(--muted);border:1px solid var(--line);padding:.05rem .35rem;border-radius:4px}
.cc-pill{font:600 .66rem var(--disp);padding:.2rem .5rem;border-radius:20px}
.cc-pill.ok{background:var(--ok-bg);color:var(--ok)} .cc-pill.warn{background:var(--warn-bg);color:var(--warn)}
.cc-since{padding:0 .8rem .5rem;font:.68rem var(--mono);color:var(--dim)}
.cc-terms{display:grid;grid-template-columns:1fr 1fr;gap:.3rem .8rem;padding:.5rem .8rem .7rem}
.ct-row{display:flex;justify-content:space-between;gap:.5rem;font-size:.78rem;border-bottom:1px dotted var(--line);padding-bottom:.18rem}
.ct-k{color:var(--muted)} .ct-v{font-family:var(--mono);font-weight:600} .ct-v.ok{color:var(--ok)} .ct-v.warn{color:var(--warn)}
.cc-foot{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.6rem .8rem;border-top:1px solid var(--line);background:#0d1622}
.cc-rep{display:flex;align-items:center;gap:.4rem;font-size:.85rem}
.cc-actions{display:flex;gap:.4rem}
.cbtn{padding:.35rem .7rem;border:1px solid var(--line-2);border-radius:6px;font:600 .74rem var(--disp);color:var(--text);background:#101a28;cursor:pointer;transition:.13s}
.cbtn:hover{border-color:var(--accent);color:#fff} .cbtn.warn:hover{border-color:var(--warn);color:var(--warn)} .cbtn.primary{background:linear-gradient(180deg,#2f6fb0,#234f80);border-color:var(--accent);color:#fff}
.cc-note{font:.66rem var(--mono);color:var(--dim)}
.lead-row{display:flex;align-items:center;gap:.6rem;padding:.7rem .8rem;border:1px dashed var(--line-2);border-radius:var(--rad);background:#0e1622;flex-wrap:wrap;margin-bottom:.5rem}
.al-dot{width:10px;height:10px;border-radius:50%}
.lead-need{font-size:.78rem;color:var(--muted)}
/* Dashboard: reskin de header CIC sobre el dashboard REAL (datos reales preservados) */
.dash-wrap{padding:1rem 1.5rem 1.5rem}
.dash-wrap .dash-grid{margin-top:.2rem}
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
.wo-tl{margin:.4rem 0 .6rem;border-left:2px solid var(--border);padding-left:.7rem}
.wo-tl-row{display:flex;align-items:center;gap:.55rem;font-size:.78rem;padding:.18rem 0;position:relative}
.wo-tl-row .wo-tl-t{color:var(--muted);min-width:3.2rem}
.wo-tl-row .wo-tl-dot{width:7px;height:7px;border-radius:50%;background:var(--border-s);flex:none;margin-left:-1.05rem;box-shadow:0 0 0 2px var(--panel)}
.wo-tl-row.ok .wo-tl-dot{background:var(--success)}
.wo-tl-row.etd .wo-tl-dot{background:var(--accent)}
.wo-tl-row.etd .wo-tl-l{color:var(--accent);font-weight:600}
.wo-tl-row .wo-tl-l{color:var(--text)}
.wo-tl-gap{margin-top:.35rem;font-size:.76rem;font-weight:600;padding:.25rem .5rem;border-radius:4px;display:inline-block}
.wo-tl-gap.ok{color:var(--success);background:rgba(63,185,80,.12)}
.wo-tl-gap.bad{color:var(--danger);background:rgba(248,81,73,.12)}
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
.map-legend{position:absolute;left:12px;bottom:12px;z-index:10;display:flex;gap:.7rem;flex-wrap:wrap;max-width:58%;background:rgba(7,13,24,.82);backdrop-filter:blur(8px);border:1px solid rgba(77,163,255,.25);border-radius:6px;padding:.4rem .62rem;font-family:var(--sans);font-size:.62rem;color:var(--muted);box-shadow:0 4px 16px rgba(0,0,0,.4)}
.map-legend .lg{display:flex;align-items:center;gap:.32rem;white-space:nowrap;text-transform:uppercase;letter-spacing:.04em}
.map-legend .lg i{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor;flex:none}
.map-ctrl{position:absolute;top:12px;right:12px;z-index:10;display:flex;flex-direction:column;gap:.4rem;align-items:flex-end}
.map-ctrl .zoom{display:flex;flex-direction:column;border:1px solid rgba(77,163,255,.25);border-radius:6px;overflow:hidden;background:rgba(7,13,24,.82);backdrop-filter:blur(8px);box-shadow:0 4px 16px rgba(0,0,0,.4)}
.map-ctrl .zoom button{width:32px;height:30px;color:var(--text);font-size:1.05rem;line-height:1;background:transparent;border:none;border-bottom:1px solid rgba(77,163,255,.18);cursor:pointer;display:grid;place-items:center;font-family:var(--sans)}
.map-ctrl .zoom button:last-child{border-bottom:none}
.map-ctrl .zoom button:hover{background:rgba(77,163,255,.16)}
.map-ctrl .map-daynight{font-family:var(--sans);font-size:.62rem;font-weight:600;letter-spacing:.04em;color:var(--muted);background:rgba(7,13,24,.82);backdrop-filter:blur(8px);border:1px solid rgba(77,163,255,.25);border-radius:6px;padding:.28rem .5rem;box-shadow:0 4px 16px rgba(0,0,0,.4);white-space:nowrap}
/* Minimapa overlay (handoff design 6 · Pasada 3). Esquemático: estado de stands ocupados. */
.map-mini{position:absolute;right:12px;bottom:12px;z-index:10;width:148px;background:rgba(7,13,24,.82);backdrop-filter:blur(8px);border:1px solid rgba(77,163,255,.25);border-radius:6px;padding:.45rem .55rem;box-shadow:0 4px 16px rgba(0,0,0,.4)}
.map-mini .mm-head{font-family:var(--mono);font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:#7fb3e8;margin-bottom:.35rem;display:flex;justify-content:space-between;align-items:baseline}
.map-mini .mm-head b{color:var(--text);font-weight:600}
.map-mini .mm-dots{display:flex;flex-wrap:wrap;gap:5px}
.map-mini .mm-dot{width:13px;height:13px;border-radius:3px;display:grid;place-items:center;font-family:var(--mono);font-size:.5rem;color:#04070c;font-weight:700;box-shadow:0 0 5px currentColor}
.map-mini .mm-empty{font-size:.6rem;color:var(--muted);font-style:italic}

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
/* ===== Front-of-house (menú + nueva partida) — responsive, 2026-05-30 ===== */
.foh-root{position:fixed;inset:0;z-index:1000;overflow:hidden;color:var(--text);font-family:var(--sans);user-select:none;background:radial-gradient(120% 120% at 50% 50%,#0a0f17 0%,#04070c 100%);--bg-deep:#070b12;--border-strong:var(--border-s);--accent-hover:#6db5ff}
.foh-root *{box-sizing:border-box}
.foh-bg{position:absolute;inset:0;background:radial-gradient(900px 520px at 78% 8%,rgba(77,163,255,.10) 0%,transparent 62%),radial-gradient(700px 600px at 12% 100%,rgba(77,163,255,.06) 0%,transparent 60%),linear-gradient(180deg,#0e141d 0%,#0a0e16 100%)}
.foh-gridbg{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(58,66,86,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(58,66,86,.10) 1px,transparent 1px);background-size:46px 46px;-webkit-mask-image:radial-gradient(120% 100% at 70% 30%,#000 30%,transparent 85%);mask-image:radial-gradient(120% 100% at 70% 30%,#000 30%,transparent 85%)}
.foh-svg{position:absolute;left:0;bottom:6%;width:100%;height:42%;opacity:.55;pointer-events:none}
.foh-radar{position:absolute;width:min(46vw,560px);aspect-ratio:1;right:-6vw;top:-12vh;border-radius:50%;opacity:.5;-webkit-mask-image:radial-gradient(closest-side,#000 60%,transparent 100%);mask-image:radial-gradient(closest-side,#000 60%,transparent 100%);pointer-events:none}
.foh-radar .ring{position:absolute;inset:0;border:1px solid rgba(77,163,255,.10);border-radius:50%}
.foh-radar .r2{inset:13%}.foh-radar .r3{inset:28%}.foh-radar .r4{inset:42%}
.foh-radar .sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(77,163,255,.22) 0deg,rgba(77,163,255,.05) 26deg,transparent 60deg,transparent 360deg);animation:foh-sweep 7s linear infinite}
@keyframes foh-sweep{to{transform:rotate(360deg)}}
.foh-blip{position:absolute;width:7px;height:7px;border-radius:50%;background:var(--accent)}
.foh-blip::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(77,163,255,.5);animation:foh-ping 2.6s ease-out infinite}
.foh-blip.amber{background:var(--warning)}.foh-blip.amber::after{border-color:rgba(210,153,34,.5)}
.foh-blip.danger{background:var(--aog)}.foh-blip.danger::after{border-color:rgba(248,81,73,.55)}
@keyframes foh-ping{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.6);opacity:0}}
.foh-mover{position:absolute;bottom:21%;width:9px;height:9px;border-radius:50%;background:#cfe6ff;box-shadow:0 0 10px 2px rgba(77,163,255,.8);animation:foh-taxi 16s linear infinite}
.foh-mover .trail{position:absolute;right:6px;top:50%;width:60px;height:1.5px;background:linear-gradient(90deg,transparent,rgba(77,163,255,.55));transform:translateY(-50%)}
@keyframes foh-taxi{0%{left:12%;opacity:0}8%{opacity:1}92%{opacity:1}100%{left:88%;opacity:0}}
.foh-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,11,18,.92) 0%,rgba(7,11,18,.55) 42%,rgba(7,11,18,0) 72%),radial-gradient(140% 120% at 50% 50%,transparent 56%,rgba(4,7,12,.7) 100%)}
.foh-scrim.deep{background:linear-gradient(180deg,rgba(7,11,18,.84) 0%,rgba(7,11,18,.7) 40%,rgba(7,11,18,.86) 100%),radial-gradient(140% 120% at 50% 50%,transparent 50%,rgba(4,7,12,.8) 100%)}
.foh-scan{position:absolute;inset:0;pointer-events:none;opacity:.5;background:repeating-linear-gradient(180deg,rgba(255,255,255,.012) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
.foh-screen{position:absolute;inset:0;display:flex;flex-direction:column;padding:clamp(20px,3vw,42px) clamp(24px,4.5vw,64px);z-index:5;overflow-y:auto}
.foh-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-shrink:0}
.foh-id{display:flex;align-items:center;gap:11px;font-family:var(--mono);font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
.foh-mark{width:20px;height:20px;border:1.6px solid var(--accent);position:relative;flex-shrink:0}
.foh-mark::before,.foh-mark::after{content:"";position:absolute;background:var(--accent)}
.foh-mark::before{left:-4px;top:50%;width:7px;height:1.6px;transform:translateY(-50%)}
.foh-mark::after{right:-4px;top:50%;width:7px;height:1.6px;transform:translateY(-50%)}
.foh-livetag{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;letter-spacing:.18em;color:var(--subtle);text-transform:uppercase}
.foh-livetag .d{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 8px var(--success);animation:foh-pulse 1.7s infinite}
@keyframes foh-pulse{0%,100%{opacity:1}50%{opacity:.3}}
.foh-eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.4em;text-transform:uppercase;color:var(--accent);display:flex;align-items:center;gap:12px}
.foh-eyebrow::before{content:"";width:26px;height:1px;background:var(--accent)}
.foh-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font:600 14px var(--sans);letter-spacing:.01em;padding:11px 20px;border:1px solid var(--border-strong);background:var(--panel);color:var(--text);cursor:pointer;border-radius:3px;transition:all .14s;text-decoration:none}
.foh-btn:hover{border-color:var(--accent);color:var(--accent)}
.foh-btn.primary{background:var(--accent);border-color:var(--accent);color:#061018}
.foh-btn.primary:hover{background:var(--accent-hover);border-color:var(--accent-hover);box-shadow:0 0 22px rgba(77,163,255,.35)}
.foh-btn.ghost{background:transparent}
.foh-ar{width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid currentColor;display:inline-block}
.foh-btn.back .foh-ar{border-left:none;border-right:7px solid currentColor}
.foh-steprail{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--subtle)}
.foh-steprail .s{display:flex;align-items:center;gap:8px}
.foh-steprail .n{width:20px;height:20px;border:1px solid var(--border-strong);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px}
.foh-steprail .s.on{color:var(--accent)}.foh-steprail .s.on .n{border-color:var(--accent);color:var(--accent);box-shadow:0 0 10px rgba(77,163,255,.3)}
.foh-steprail .s.done .n{border-color:var(--success);color:var(--success)}
.foh-steprail .bar{width:34px;height:1px;background:var(--border-strong)}
.foh-foot{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--subtle);margin-top:auto;padding-top:1.4rem;flex-shrink:0}
.foh-foot .chip{display:flex;align-items:center;gap:8px}
.foh-foot .sq{width:7px;height:7px;border:1px solid var(--accent);transform:rotate(45deg)}
.foh-foot .right{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.foh-menubody{flex:1;display:flex;align-items:center;gap:clamp(24px,4vw,64px);flex-wrap:wrap;min-height:0;padding:clamp(12px,3vh,40px) 0}
.foh-hero{flex:1 1 460px;max-width:600px}
.foh-lockup{display:flex;align-items:center;gap:18px;margin-top:16px}
.foh-bigmark{width:clamp(40px,4vw,52px);aspect-ratio:1;border:2px solid var(--accent);position:relative;flex-shrink:0}
.foh-bigmark::before,.foh-bigmark::after{content:"";position:absolute;background:var(--accent)}
.foh-bigmark::before{left:-9px;top:50%;width:15px;height:2px;transform:translateY(-50%)}
.foh-bigmark::after{right:-9px;top:50%;width:15px;height:2px;transform:translateY(-50%)}
.foh-bigmark i{position:absolute;inset:13px;border:1px solid rgba(77,163,255,.5)}
.foh-wordmark{font-size:clamp(40px,6vw,62px);font-weight:800;letter-spacing:-.02em;line-height:.96;margin:0}
.foh-wordmark .t{color:var(--accent)}
.foh-subline{font-family:var(--mono);font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted);margin:16px 0 0}
.foh-nav{margin-top:34px;display:flex;flex-direction:column;gap:2px;max-width:400px}
.foh-mi{display:flex;align-items:center;gap:16px;padding:13px 16px;cursor:pointer;border-left:2px solid transparent;background:transparent;color:var(--text);transition:background .14s,border-color .14s,padding .14s;position:relative;text-decoration:none}
.foh-mi .idx{font-family:var(--mono);font-size:11px;color:var(--subtle);letter-spacing:.1em;width:22px;transition:color .14s}
.foh-mi .label{font-size:17px;font-weight:600}
.foh-mi .hint{margin-left:auto;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--subtle);text-transform:uppercase;opacity:0;transition:opacity .14s}
.foh-mi .arrow{width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid var(--accent);opacity:0;transition:opacity .14s}
.foh-mi:hover,.foh-mi.sel{background:linear-gradient(90deg,rgba(77,163,255,.12),transparent);border-left-color:var(--accent);padding-left:22px}
.foh-mi:hover .idx,.foh-mi.sel .idx{color:var(--accent)}
.foh-mi:hover .hint,.foh-mi.sel .hint,.foh-mi:hover .arrow,.foh-mi.sel .arrow{opacity:1}
.foh-mi.primary::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.foh-mi.disabled{opacity:.38;cursor:not-allowed}
.foh-mi.disabled:hover{background:transparent;border-left-color:transparent;padding-left:16px}
.foh-mi.danger:hover{border-left-color:var(--danger);background:linear-gradient(90deg,rgba(248,81,73,.10),transparent)}
.foh-mi.danger:hover .idx{color:var(--danger)}
.foh-savecard{flex:0 1 340px;align-self:center;background:linear-gradient(180deg,rgba(27,35,48,.92),rgba(18,23,32,.92));border:1px solid var(--border-strong);box-shadow:0 24px 60px rgba(0,0,0,.55);cursor:pointer;transition:border-color .15s,transform .15s;text-decoration:none;color:var(--text)}
.foh-savecard:hover{border-color:var(--accent);transform:translateY(-2px)}
.foh-sc-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.foh-sc-body{padding:18px 16px}
.foh-sc-icao{font-size:28px;font-weight:800}.foh-sc-icao .x{color:var(--accent)}
.foh-sc-name{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.foh-sc-cta{padding:12px 16px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;color:var(--accent)}
.foh-head{flex-shrink:0;margin-top:6px}
.foh-head h1{font-size:clamp(26px,3.4vw,36px);font-weight:800;letter-spacing:-.02em;margin:14px 0 0}
.foh-head h1 .t{color:var(--accent)}
.foh-head .sub{color:var(--muted);font-size:14px;margin-top:8px;max-width:760px;line-height:1.5}
/* ===== Game Over post-mortem (handoff entrega-menu 3, 2026-05-30) ===== */
.go-root{position:fixed;inset:0;z-index:1100;overflow:hidden;color:var(--text);font-family:var(--sans);user-select:none;background:radial-gradient(120% 120% at 50% 28%,#1a0d10 0%,#070406 100%)}
.go-bg{position:absolute;inset:0;background:radial-gradient(900px 520px at 50% 0%,rgba(248,81,73,.13) 0%,transparent 60%)}
.go-grid{position:absolute;inset:0;opacity:.4;background-image:linear-gradient(rgba(120,40,46,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(120,40,46,.12) 1px,transparent 1px);background-size:46px 46px;-webkit-mask-image:radial-gradient(120% 100% at 50% 30%,#000 30%,transparent 85%);mask-image:radial-gradient(120% 100% at 50% 30%,#000 30%,transparent 85%)}
.go-scan{position:absolute;inset:0;pointer-events:none;opacity:.4;background:repeating-linear-gradient(180deg,rgba(255,255,255,.012) 0 1px,transparent 1px 3px)}
.go-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:clamp(20px,4vw,56px);overflow-y:auto;z-index:5}
.go-eyebrow{font-family:var(--mono);font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--danger);margin-bottom:14px}
.go-title{font-size:clamp(34px,6vw,66px);font-weight:800;letter-spacing:-.03em;line-height:1;margin:0 0 18px}
.go-title span{color:var(--danger)}
.go-reason{max-width:560px;margin-bottom:26px}
.go-reason .rt{font-size:clamp(17px,2.3vw,23px);font-weight:700;color:var(--danger);margin-bottom:6px}
.go-reason .rs{font-size:clamp(13px,1.5vw,15px);color:var(--muted);line-height:1.5}
.go-stats{display:grid;grid-template-columns:repeat(4,minmax(96px,1fr));gap:12px;width:100%;max-width:620px;margin-bottom:22px}
.go-stat{background:rgba(22,27,34,.7);border:1px solid var(--border-s);border-radius:6px;padding:14px 10px}
.go-stat .k{font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--subtle);margin-bottom:8px}
.go-stat .v{font-family:var(--mono);font-size:clamp(17px,2.3vw,25px);font-weight:700}
.go-stat .v span{font-size:.58em;color:var(--muted)}
.go-chart{width:100%;max-width:560px;margin-bottom:18px}
.go-chart-h{font-family:var(--mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--subtle);margin-bottom:8px;text-align:left}
.go-spark{width:100%;height:120px;display:block;background:rgba(10,15,23,.6);border:1px solid var(--border);border-radius:4px}
.go-nospark{font-size:.82rem;color:var(--muted);padding:1rem;border:1px dashed var(--border-s);border-radius:4px}
.go-wo{font-size:.9rem;color:var(--muted);margin-bottom:26px}
.go-wo b{color:var(--text)}
.go-actions{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.go-btn{font-family:var(--sans);font-size:1rem;font-weight:600;padding:13px 26px;border:1px solid var(--border-s);background:var(--panel);color:var(--text);border-radius:4px;cursor:pointer;transition:all .14s}
.go-btn:hover{border-color:var(--accent);color:var(--accent)}
.go-btn.primary{background:var(--danger);border-color:var(--danger);color:#fff}
.go-btn.primary:hover{background:#ff6b63;border-color:#ff6b63;color:#fff}
/* ===== Ajustes (handoff entrega-menu 3, 2026-05-30) ===== */
.set-panel{flex:1;display:grid;grid-template-columns:clamp(180px,20vw,232px) 1fr;background:linear-gradient(180deg,rgba(22,27,34,.94),rgba(14,18,25,.94));border:1px solid var(--border-s);box-shadow:0 24px 60px rgba(0,0,0,.5);margin:clamp(14px,2.5vh,24px) 0;min-height:0;overflow:hidden}
.set-cats{border-right:1px solid var(--border);padding:14px 0;overflow-y:auto}
.set-catbtn{display:flex;align-items:center;gap:12px;width:100%;padding:13px 22px;cursor:pointer;background:transparent;border:none;border-left:2px solid transparent;color:var(--muted);font-family:var(--sans);font-size:14px;font-weight:600;text-align:left;transition:all .13s}
.set-catbtn .ci{width:8px;height:8px;border:1.5px solid currentColor;transform:rotate(45deg);flex-shrink:0}
.set-catbtn:hover{color:var(--text);background:rgba(77,163,255,.05)}
.set-catbtn.on{color:var(--accent);border-left-color:var(--accent);background:linear-gradient(90deg,rgba(77,163,255,.12),transparent)}
.set-content{padding:24px 28px;overflow-y:auto}
.set-cat{display:none}
.set-cat.on{display:block}
.set-ct{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--subtle);margin-bottom:8px}
.set-opt{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:15px 0;border-bottom:1px solid var(--border)}
.set-opt:last-child{border-bottom:none}
.set-opt .nm{font-size:15px;font-weight:600}
.set-opt .ds{font-size:12px;color:var(--muted);margin-top:3px;max-width:440px;line-height:1.45}
.set-opt .ctrl{flex-shrink:0}
.set-note{font-size:11px;color:var(--warning);margin-top:4px;font-style:italic}
.set-seg{display:inline-flex;border:1px solid var(--border-s);border-radius:3px;overflow:hidden}
.set-seg button{background:transparent;border:none;border-right:1px solid var(--border-s);color:var(--muted);font-family:var(--sans);font-size:12.5px;font-weight:600;padding:8px 14px;cursor:pointer;transition:all .12s}
.set-seg button:last-child{border-right:none}
.set-seg button:hover{color:var(--text);background:rgba(77,163,255,.06)}
.set-seg button.on{background:var(--accent);color:#061018}
.set-sw{width:46px;height:24px;border-radius:13px;background:var(--panel);border:1px solid var(--border-s);position:relative;cursor:pointer;transition:background .15s,border-color .15s}
.set-sw::after{content:"";position:absolute;left:3px;top:2px;width:18px;height:18px;border-radius:50%;background:var(--muted);transition:transform .16s,background .16s}
.set-sw.on{background:rgba(77,163,255,.25);border-color:var(--accent)}
.set-sw.on::after{transform:translateX(22px);background:var(--accent)}
.set-slide{display:flex;align-items:center;gap:14px}
.set-slide input[type=range]{-webkit-appearance:none;appearance:none;width:clamp(140px,16vw,220px);height:4px;border-radius:2px;background:var(--border-s);outline:none}
.set-slide input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);cursor:pointer;box-shadow:0 0 10px rgba(77,163,255,.5)}
.set-slide .val{font-family:var(--mono);font-size:13px;color:var(--accent);width:42px;text-align:right}
.set-sel{background:var(--panel);border:1px solid var(--border-s);color:var(--text);font-family:var(--sans);font-size:13px;padding:8px 12px;border-radius:3px;cursor:pointer}
/* ===== Cómo se juega (handoff entrega-menu 3, 2026-05-30) ===== */
.ht-panel{flex:1;display:grid;grid-template-columns:clamp(200px,22vw,268px) 1fr;background:linear-gradient(180deg,rgba(22,27,34,.94),rgba(14,18,25,.94));border:1px solid var(--border-s);box-shadow:0 24px 60px rgba(0,0,0,.5);margin:clamp(14px,2.5vh,24px) 0;min-height:0;overflow:hidden}
.ht-steps{border-right:1px solid var(--border);padding:16px 0;overflow-y:auto}
.ht-stepbtn{display:flex;align-items:center;gap:14px;width:100%;padding:15px 22px;cursor:pointer;background:transparent;border:none;border-left:2px solid transparent;text-align:left;transition:all .13s}
.ht-stepbtn .n{font-family:var(--mono);font-size:12px;color:var(--subtle);width:24px;transition:color .13s}
.ht-stepbtn .nm{font-size:14px;font-weight:600;color:var(--muted);transition:color .13s}
.ht-stepbtn:hover{background:rgba(77,163,255,.05)}.ht-stepbtn:hover .nm{color:var(--text)}
.ht-stepbtn.on{border-left-color:var(--accent);background:linear-gradient(90deg,rgba(77,163,255,.12),transparent)}
.ht-stepbtn.on .n,.ht-stepbtn.on .nm{color:var(--accent)}
.ht-content{padding:clamp(22px,3vw,34px);overflow-y:auto;display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(18px,3vw,30px);align-content:start}
.ht-kick{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
.ht-content h2{font-size:clamp(20px,2.6vw,27px);font-weight:800;letter-spacing:-.01em;margin:12px 0}
.ht-lead{font-size:clamp(13px,1.5vw,14.5px);color:var(--text);line-height:1.6}
.ht-content ul{list-style:none;margin:18px 0 0;padding:0}
.ht-content li{font-size:13.5px;color:var(--muted);line-height:1.5;padding:7px 0 7px 20px;position:relative}
.ht-content li::before{content:"";position:absolute;left:0;top:13px;width:7px;height:7px;border:1.4px solid var(--accent);transform:rotate(45deg)}
.ht-content li b{color:var(--text);font-weight:600}
.ht-art{background:#0a0f17;border:1px solid var(--border);border-radius:4px;padding:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:200px}
.ht-loop{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%}
.ht-node{border:1px solid var(--border-s);background:var(--panel);padding:12px;text-align:center}
.ht-node .ln{font-family:var(--mono);font-size:10px;color:var(--accent);letter-spacing:.1em}
.ht-node .lt{font-size:13px;font-weight:600;margin-top:5px}
.ht-node .lc{font-size:11px;color:var(--muted);margin-top:3px}
.ht-cyc{grid-column:1/-1;text-align:center;font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--success)}
.ht-phrow{display:flex;gap:4px;width:100%}
.ht-ph{flex:1;text-align:center}
.ht-ph .bar{height:6px;border-radius:3px;background:var(--border)}
.ht-ph.done .bar{background:var(--accent)}
.ht-ph.now .bar{background:var(--accent);box-shadow:0 0 10px var(--accent)}
.ht-ph .phn{font-family:var(--mono);font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-top:7px}
.ht-ph.now .phn{color:var(--accent)}
.ht-wo{border:1px solid var(--border-s);background:var(--panel);padding:12px 14px;width:100%}
.ht-wo .wt{display:flex;align-items:center;justify-content:space-between}
.ht-wo .reg{font-family:var(--mono);font-size:13px;font-weight:600}
.ht-wo .sla{font-family:var(--mono);font-size:11px;color:var(--warning)}
.ht-chips{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}
.ht-chip{font-family:var(--mono);font-size:10px;padding:3px 7px;border:1px solid var(--border-s);color:var(--muted);border-radius:2px}
.ht-chip.crit{color:var(--danger);border-color:var(--danger)}
.ht-gauge{width:100%}
.ht-gauge .gl{display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:5px}
.ht-gauge .gb{height:6px;border-radius:3px;background:var(--border);overflow:hidden}
.ht-gauge .gb i{display:block;height:100%}
.ht-aog{display:flex;align-items:center;gap:12px;border:1px solid var(--danger);background:rgba(248,81,73,.08);padding:13px;width:100%}
.ht-aog .d{width:12px;height:12px;border-radius:50%;background:var(--aog);box-shadow:0 0 12px var(--aog)}
.ht-aog .at{font-weight:700;font-size:14px}
.ht-aog .ad{font-size:11px;color:var(--muted);margin-top:2px}
.ht-dots{display:flex;gap:8px}
.ht-dot{width:8px;height:8px;border-radius:50%;background:var(--border-s);cursor:pointer;transition:all .14s}
.ht-dot.on{background:var(--accent);width:22px;border-radius:4px}
@media(max-width:820px){.ht-panel{grid-template-columns:1fr}.ht-steps{display:flex;overflow-x:auto;border-right:none;border-bottom:1px solid var(--border);padding:8px}.ht-content{grid-template-columns:1fr}.ht-art{display:none}}
/* Catálogo (pantalla menú) — enciclopedia dinámica de S.DATA */
.cat-screen .sub{max-width:none}
.cat-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:clamp(10px,2vh,18px) 0 0;flex:none}
.cat-tab{background:rgba(22,27,34,.6);border:1px solid var(--border-s);color:var(--muted);padding:.45rem .8rem;border-radius:7px;font:600 .8rem var(--disp);cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .13s}
.cat-tab:hover{color:var(--text);border-color:var(--accent)}
.cat-tab.on{background:var(--accent-deep);border-color:var(--accent);color:#fff}
.cat-n{font:600 .68rem var(--mono);background:rgba(0,0,0,.25);padding:.05rem .4rem;border-radius:10px}
.cat-body{flex:1;min-height:0;overflow-y:auto;margin-top:14px;padding-right:6px}
.cat-lead{font:.86rem var(--disp);color:var(--muted);margin:0 0 14px;max-width:760px}
.cat-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.cat-stat{background:linear-gradient(180deg,rgba(22,27,34,.9),rgba(14,18,25,.9));border:1px solid var(--border-s);border-radius:8px;padding:.5rem .9rem;text-align:center;min-width:78px}
.cat-stat b{display:block;font:700 1.3rem var(--mono);color:var(--text)}
.cat-stat b.ok{color:var(--ok)}.cat-stat b.warn{color:var(--warn)}.cat-stat b.bad{color:var(--bad)}
.cat-stat span{font:.6rem var(--disp);text-transform:uppercase;letter-spacing:.08em;color:var(--dim)}
.cat-tablewrap{border:1px solid var(--border-s);border-radius:8px;overflow:hidden;margin-bottom:16px}
.cat-table{width:100%;border-collapse:collapse;font-size:.8rem}
.cat-table thead th{position:sticky;top:0;background:#10161f;color:var(--dim);font:600 .64rem var(--disp);text-transform:uppercase;letter-spacing:.07em;text-align:left;padding:.55rem .7rem;border-bottom:1px solid var(--border-s);z-index:1}
.cat-table td{padding:.5rem .7rem;border-bottom:1px solid var(--line);color:var(--text);vertical-align:top}
.cat-table tbody tr:hover{background:rgba(77,163,255,.06)}
.cat-table .mono{font-family:var(--mono);color:var(--muted)}
.cat-badge{display:inline-block;font:600 .64rem var(--disp);padding:.1rem .5rem;border-radius:10px}
.cat-badge.minor{background:rgba(77,163,255,.14);color:var(--accent-2)}
.cat-badge.major{background:var(--warn-bg);color:var(--warn)}
.cat-badge.crit{background:var(--bad-bg);color:var(--bad)}
.cat-dot{display:inline-block;width:9px;height:9px;border-radius:50%}.cat-dot.bad{background:var(--bad);box-shadow:0 0 7px var(--bad)}
.cat-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:12px}
.cat-card{position:relative;background:linear-gradient(180deg,rgba(22,27,34,.92),rgba(14,18,25,.92));border:1px solid var(--border-s);border-radius:9px;padding:.9rem 1rem;overflow:hidden}
.cat-card-bar{position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c,var(--accent))}
.cat-card-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;gap:.5rem}
.cat-card-h h3{margin:0;font:700 1rem var(--disp);color:var(--text)}
.cat-tag{font:600 .62rem var(--disp);text-transform:uppercase;letter-spacing:.06em;color:var(--dim);border:1px solid var(--border-s);padding:.1rem .45rem;border-radius:6px;white-space:nowrap}
.cat-kv{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem;font-size:.8rem;padding:.25rem 0;border-bottom:1px dotted var(--line)}
.cat-kv span{color:var(--muted)}.cat-kv b{font-family:var(--mono);color:var(--text);text-align:right}
.cat-kv b.ok{color:var(--ok)}.cat-kv b.warn{color:var(--warn)}.cat-kv b.bad{color:var(--bad)}
.cat-sec{font:700 .9rem var(--disp);color:var(--accent-2);margin:6px 0 8px}
.cat-badge.eng{background:rgba(58,214,197,.15);color:var(--cyan)}
.cat-badge.call{background:rgba(77,163,255,.14);color:var(--accent-2)}
.cat-badge.prog{background:rgba(167,139,250,.16);color:var(--base)}
.cat-manual{display:flex;flex-direction:column;gap:6px}
.cat-ata{border:1px solid var(--border-s);border-radius:8px;overflow:hidden;background:rgba(16,22,31,.6)}
.cat-ata-h{display:flex;align-items:center;gap:.6rem;width:100%;text-align:left;background:none;border:0;color:var(--text);padding:.6rem .8rem;cursor:pointer;font:inherit}
.cat-ata-h:hover{background:rgba(77,163,255,.06)}
.cat-ata.open .cat-ata-h{border-bottom:1px solid var(--border-s);background:rgba(77,163,255,.05)}
.cat-ata-chev{color:var(--accent);width:14px;flex:none}
.cat-ata-n{font:600 .76rem var(--mono);color:var(--accent-2);flex:none}
.cat-ata-name{font:600 .9rem var(--disp);flex:1}
.cat-ata-cnt{font:600 .7rem var(--mono);color:var(--muted);background:var(--panel-2);padding:.1rem .5rem;border-radius:10px}
.cat-ata-body{padding:.4rem .8rem .7rem;display:flex;flex-direction:column;gap:.3rem}
.cat-task{padding:.5rem .2rem;border-bottom:1px dotted var(--line)}
.cat-task:last-child{border-bottom:none}
.cat-task-top{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}
.cat-task-name{font:600 .84rem var(--disp);color:var(--text)}
.cat-task-meta{display:flex;gap:.9rem;flex-wrap:wrap;margin-top:.25rem;font-size:.72rem;color:var(--dim)}
.cat-task-ref{color:var(--muted)}
.cat-apcards .cat-card{padding:0;overflow:hidden}
.cat-apcard .cat-card-h,.cat-apcard .cat-kv,.cat-apcard .cat-apdesc{padding-left:1rem;padding-right:1rem}
.cat-apcard .cat-card-h{margin-top:.7rem}
.cat-osm-wrap{position:relative;background:#0a1322;border-bottom:1px solid var(--border-s)}
.cat-osm{width:100%;height:auto;display:block}
.cat-osm-aero{fill:none;stroke:#1c2d4a;stroke-width:.5}
.cat-osm-apron{fill:#10233f;stroke:#1c2d4a;stroke-width:.3}
.cat-osm-taxi{fill:none;stroke:#2f6da3;stroke-width:.5;stroke-linecap:round;stroke-linejoin:round;opacity:.85}
.cat-osm-rwy{fill:none;stroke:#4da3ff;stroke-width:1.7;stroke-linecap:round}
.cat-osm-stand{fill:#86c5ff}
.cat-osm-none{display:flex;align-items:center;justify-content:center;height:88px;color:var(--dim);font:.72rem var(--mono);background:repeating-linear-gradient(45deg,#0a1322,#0a1322 8px,#0c1626 8px,#0c1626 16px)}
.cat-osm-soon{position:absolute;top:8px;right:8px;font:600 .6rem var(--disp);text-transform:uppercase;letter-spacing:.06em;color:var(--warn);background:var(--warn-bg);padding:.15rem .5rem;border-radius:6px}
.cat-apcard.dis{opacity:.6}
.cat-apdesc{font-size:.74rem;color:var(--dim);line-height:1.45;margin:.5rem 0 .9rem}
/* ===== Cierre Semanal (handoff entrega-menu 3, 2026-05-30) ===== */
.wc-root{position:fixed;inset:0;z-index:1080;overflow:hidden;color:var(--text);font-family:var(--sans);user-select:none;background:radial-gradient(120% 120% at 50% 30%,#0a121d 0%,#04070c 100%)}
.wc-scrim{position:absolute;inset:0;background:rgba(4,7,12,.72)}
.wc-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(960px,94vw);max-height:92vh;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(22,27,34,.98),rgba(13,17,24,.98));border:1px solid var(--border-s);box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden}
.wc-head{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid var(--border)}
.wc-head .wk{font-size:21px;font-weight:800;letter-spacing:-.01em}
.wc-head .wk .t{color:var(--accent)}
.wc-head .save{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--success)}
.wc-main{display:grid;grid-template-columns:1.32fr 1fr;min-height:0;overflow:auto}
.wc-left{padding:22px 28px;display:flex;flex-direction:column}
.wc-right{border-left:1px solid var(--border);padding:22px 26px}
.wc-hero{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--border)}
.wc-hero .k{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--subtle)}
.wc-hero .net .v{font-size:clamp(30px,4.5vw,44px);font-weight:800;letter-spacing:-.02em;line-height:1;margin-top:6px;color:var(--success)}
.wc-hero .net .v.neg{color:var(--danger)}
.wc-hero .bal{text-align:right}
.wc-hero .bal .v{font-family:var(--mono);font-size:22px;font-weight:600;margin-top:4px}
.wc-pl{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:16px}
.wc-pl .ct{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px}
.wc-pl .ct .dot{width:7px;height:7px;border-radius:50%}
.wc-pl .ing .ct{color:var(--success)}.wc-pl .ing .ct .dot{background:var(--success)}
.wc-pl .gas .ct{color:var(--danger)}.wc-pl .gas .ct .dot{background:var(--danger)}
.wc-pl .row{display:flex;align-items:baseline;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(42,49,66,.5)}
.wc-pl .row .lbl{font-size:13px;color:var(--muted)}
.wc-pl .row .amt{font-family:var(--mono);font-size:13px;color:var(--text)}
.wc-pl .sub{display:flex;align-items:baseline;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid var(--border-s)}
.wc-pl .sub .lbl{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.wc-pl .sub .amt{font-family:var(--mono);font-size:17px;font-weight:700}
.wc-pl .ing .sub .amt{color:var(--success)}.wc-pl .gas .sub .amt{color:var(--danger)}
.wc-rt-title{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--subtle);margin-bottom:14px}
.wc-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wc-kpi{background:var(--panel);border:1px solid var(--border);padding:10px 14px}
.wc-kpi .k{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--subtle)}
.wc-kpi .v{font-family:var(--mono);font-size:22px;font-weight:700;margin-top:4px}
.wc-kpi .d{font-family:var(--mono);font-size:10px;margin-top:2px}
.wc-kpi .d.up{color:var(--success)}.wc-kpi .d.down{color:var(--danger)}.wc-kpi .d.flat{color:var(--subtle)}
.wc-trend{margin-top:16px}
.wc-trend .tl{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
.wc-trend .tl .k{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--subtle)}
.wc-trend svg{width:100%;height:48px;display:block;background:rgba(10,15,23,.5);border:1px solid var(--border);border-radius:4px}
.wc-note{display:flex;align-items:flex-start;gap:10px;margin-top:16px;padding:11px 14px;background:rgba(77,163,255,.05);border:1px solid var(--border);border-left:2px solid var(--accent);font-size:12.5px;color:var(--muted);line-height:1.45}
.wc-foot{border-top:1px solid var(--border);padding:16px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.wc-foot .hint{font-family:var(--mono);font-size:10px;color:var(--subtle);letter-spacing:.06em}
.wc-btn{font-family:var(--sans);font-size:15px;font-weight:600;padding:13px 26px;border:1px solid var(--accent);background:var(--accent);color:#061018;border-radius:4px;cursor:pointer;transition:all .14s}
.wc-btn:hover{background:var(--accent-hover,#6db5ff);box-shadow:0 0 22px rgba(77,163,255,.35)}
@media(max-width:760px){.wc-main{grid-template-columns:1fr}.wc-right{border-left:none;border-top:1px solid var(--border)}.wc-pl{grid-template-columns:1fr}}
/* ===== Hito / Milestone (handoff entrega-menu 5, 2026-05-30) ===== */
.ms-root{position:fixed;inset:0;z-index:1090;overflow:hidden;color:var(--text);font-family:var(--sans);user-select:none;background:radial-gradient(120% 120% at 50% 16%,rgba(230,180,80,.10) 0%,#04070c 60%)}
.ms-scrim{position:absolute;inset:0;background:radial-gradient(720px 460px at 50% 16%,rgba(230,180,80,.16) 0%,transparent 60%),radial-gradient(140% 120% at 50% 40%,transparent 52%,rgba(6,9,14,.7) 100%)}
.ms-hero{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;z-index:5;overflow-y:auto}
.ms-badge{width:118px;height:118px;border-radius:50%;position:relative;margin-bottom:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:radial-gradient(circle at 50% 38%,rgba(230,180,80,.25),rgba(230,180,80,.04) 70%);border:1.5px solid rgba(230,180,80,.5);box-shadow:0 0 60px rgba(230,180,80,.3),inset 0 0 28px rgba(230,180,80,.12)}
.ms-badge::before{content:"";position:absolute;inset:-8px;border-radius:50%;border:1px solid rgba(230,180,80,.28);animation:ms-ring 2.8s ease-out infinite}
@keyframes ms-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.32);opacity:0}}
.ms-badge .ic{font-size:54px;filter:drop-shadow(0 4px 14px rgba(230,180,80,.5))}
.ms-kicker{font-family:var(--mono);font-size:12px;letter-spacing:.4em;text-transform:uppercase;color:#e6b450;margin-bottom:16px}
.ms-title{font-size:clamp(30px,5vw,46px);font-weight:800;letter-spacing:-.02em;line-height:1.05;max-width:800px;margin-bottom:16px;color:#f3f5f9}
.ms-title .hl{color:#e6b450}
.ms-desc{font-size:15px;line-height:1.6;color:var(--muted);max-width:540px;margin-bottom:34px}
.ms-rewards{display:flex;gap:16px;margin-bottom:38px;flex-wrap:wrap;justify-content:center}
.ms-reward{background:linear-gradient(180deg,rgba(22,27,34,.92),rgba(14,18,25,.92));border:1px solid var(--border-s);border-radius:4px;padding:16px 24px;min-width:140px;position:relative;overflow:hidden}
.ms-reward::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#e6b450,transparent)}
.ms-reward .rl{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--subtle);margin-bottom:8px}
.ms-reward .rv{font-size:24px;font-weight:800;color:#e6b450}
.ms-reward .rv .u{font-size:13px;color:var(--muted)}
.ms-btn{font-family:var(--sans);font-size:15px;font-weight:600;padding:13px 30px;border:1px solid #e6b450;background:#e6b450;color:#1a1206;border-radius:4px;cursor:pointer;transition:all .14s}
.ms-btn:hover{background:#f0c468;border-color:#f0c468;box-shadow:0 0 22px rgba(230,180,80,.4)}
/* Accesibilidad: clases en <html> aplicadas por applySettings() según mro_settings */
html.reduce-motion *{animation-duration:0s!important;animation-iteration-count:1!important;transition-duration:0s!important}
html.hi-contrast{--border:#4a5470;--border-s:#5a6480}
html.hi-contrast .panel,html.hi-contrast .wo-card,html.hi-contrast .dash-card{border-color:#5a6480}
.foh-cards{flex:1;display:grid;gap:18px;margin:clamp(16px,3vh,26px) 0;align-content:start;grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.foh-cards.ops{grid-template-columns:repeat(auto-fit,minmax(300px,1fr));max-width:1120px}
.foh-apcard{background:linear-gradient(180deg,rgba(27,35,48,.96),rgba(16,21,30,.96));border:1px solid var(--border-strong);position:relative;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s;text-decoration:none;color:var(--text)}
.foh-apcard:hover{transform:translateY(-3px);border-color:var(--accent);box-shadow:0 26px 60px rgba(0,0,0,.55),0 0 0 1px rgba(77,163,255,.25)}
.foh-apcard.feat{border-color:var(--accent);box-shadow:0 24px 60px rgba(0,0,0,.5),inset 0 0 60px rgba(77,163,255,.05);grid-row:span 2}
.foh-apcard .ribbon{position:absolute;top:14px;right:14px;font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);border:1px solid var(--accent);padding:4px 9px}
.foh-apcard .ah{padding:20px 22px 0}
.foh-apcard .ah h2{font-size:24px;font-weight:800;margin:0}
.foh-apcard .code{font-family:var(--mono);font-size:11px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;margin-top:6px}
.foh-apcard .stars{font-size:12px;margin-top:8px;display:inline-flex;gap:8px;align-items:center;color:var(--warning)}
.foh-apcard .stars .lbl{font-family:var(--mono);font-size:10px;color:var(--success);letter-spacing:.14em;text-transform:uppercase}
.foh-apcard .desc{padding:14px 22px 0;font-size:13px;line-height:1.55;color:var(--text)}
.foh-apcard .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:16px 0 0}
.foh-apcard .metrics .m{background:rgba(13,17,23,.6);padding:11px 14px}
.foh-apcard .metrics .k{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--subtle)}
.foh-apcard .metrics .v{font-size:15px;font-weight:700;margin-top:4px}
.foh-apcard .metrics .v .u{font-size:11px;color:var(--muted);font-weight:400}
.foh-apcard .acta{padding:15px 22px;display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:auto}
.foh-apcard .acta .note{font-family:var(--mono);font-size:10px;color:var(--subtle)}
.foh-lcard{background:var(--panel);border:1px solid var(--border);padding:16px;position:relative;opacity:.6;cursor:not-allowed;overflow:hidden}
.foh-lcard::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 9px,rgba(0,0,0,.16) 9px 11px);pointer-events:none}
.foh-lcard h3{font-size:18px;font-weight:700;margin:0}
.foh-lcard .code{font-family:var(--mono);font-size:10px;letter-spacing:.14em;color:var(--subtle);text-transform:uppercase;margin-top:5px}
.foh-lcard .lock{margin-top:14px;display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.foh-op{background:linear-gradient(180deg,rgba(27,35,48,.95),rgba(16,21,30,.95));border:1px solid var(--border-strong);position:relative;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}
.foh-op:hover{transform:translateY(-3px);border-color:var(--oc);box-shadow:0 26px 60px rgba(0,0,0,.55),0 0 0 1px var(--oc)}
.foh-op.dis{opacity:.5;cursor:not-allowed}
.foh-op .topbar{height:4px;background:var(--oc)}
.foh-op.rec::after{content:"Recomendado";position:absolute;top:14px;right:0;font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#061018;background:var(--accent);padding:4px 10px}
.foh-op .oh{padding:18px 20px 0}
.foh-op .oh .nm{display:flex;align-items:baseline;gap:9px}
.foh-op .oh .nm h2{font-size:22px;font-weight:800;color:var(--oc);margin:0}
.foh-op .oh .nm .iata{font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.12em}
.foh-op .oh .diff{display:flex;align-items:center;gap:9px;margin-top:8px}
.foh-op .oh .diff .lbl{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.foh-op .shortline{padding:13px 20px 0;font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--subtle)}
.foh-op .tagline{padding:8px 20px 0;font-size:13px;line-height:1.5;font-style:italic;color:var(--text)}
.foh-op .ometrics{margin:16px 0 0;border-top:1px solid var(--border)}
.foh-op .ometrics .row{display:flex;align-items:center;justify-content:space-between;padding:9px 20px;border-bottom:1px solid var(--border)}
.foh-op .ometrics .k{font-family:var(--mono);font-size:11px;color:var(--muted)}
.foh-op .ometrics .v{font-family:var(--mono);font-size:13px;font-weight:600}
.foh-op .octa{margin-top:auto;padding:16px 20px}
.foh-op .octa .foh-btn{width:100%;background:transparent;border-color:var(--oc);color:var(--oc)}
.foh-op:hover .octa .foh-btn{background:var(--oc);color:#07101a}
.foh-loader{position:absolute;inset:0;z-index:30;background:rgba(4,7,12,.86);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;flex-direction:column;gap:18px}
.foh-loader.on{display:flex}
.foh-loader .spin{width:38px;height:38px;border:2px solid var(--border-strong);border-top-color:var(--accent);border-radius:50%;animation:foh-spin .8s linear infinite}
@keyframes foh-spin{to{transform:rotate(360deg)}}
.foh-loader .txt{font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
@media(max-width:880px){.foh-menubody{flex-direction:column;align-items:stretch;justify-content:flex-start}.foh-savecard{align-self:stretch}.foh-radar{display:none}.foh-apcard.feat{grid-row:span 1}}
@media(prefers-reduced-motion:reduce){.foh-radar .sweep,.foh-mover,.foh-blip::after,.foh-livetag .d{animation:none}}
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
/* Fase B2: jerarquía del log por importancia. Ámbar reservado a avisos reales; ruido apagado+agrupado. */
.notif.t-crit{color:var(--bad);font-weight:600;background:var(--bad-bg)}
.notif.t-crit::before{background:var(--bad);box-shadow:0 0 8px var(--bad)}
.notif.t-callout{color:var(--accent);font-weight:600}
.notif.t-callout::before{background:var(--accent);box-shadow:0 0 8px var(--accent)}
.notif.t-positive{color:var(--ok)}
.notif.t-positive::before{background:var(--ok)}
.notif.t-warn{color:var(--warn)}
.notif.t-warn::before{background:var(--warn)}
.notif.t-info{color:var(--muted)}
.notif.t-info::before{background:var(--muted)}
.notif.t-noise{color:var(--subtle);font-size:.72rem;opacity:.65}
.notif.t-noise::before{background:var(--line-2)}
.notif.t-noise.grouped{font-style:italic;opacity:.8}
/* Fase B2: pop-out del callout (toast no bloqueante, esquina inf-derecha, apilado). */
#callout-toast-root{position:fixed;right:1rem;bottom:1rem;z-index:200;display:flex;flex-direction:column;gap:.55rem;max-width:22rem;pointer-events:none}
.callout-toast{position:relative;pointer-events:auto;cursor:pointer;background:var(--panel);border:1px solid var(--border-s);border-radius:10px;padding:.6rem .8rem .6rem 1rem;box-shadow:0 8px 28px rgba(0,0,0,.45);overflow:hidden;animation:ct-in .32s cubic-bezier(.2,.7,.2,1)}
.callout-toast.leaving{animation:ct-out .3s ease forwards}
.callout-toast .ct-rail{position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent)}
.callout-toast.sev-aog .ct-rail,.callout-toast.sev-Critical .ct-rail{background:var(--bad);box-shadow:0 0 12px var(--bad)}
.callout-toast.sev-Major .ct-rail{background:var(--warn)}
.callout-toast.big{border-color:var(--bad);box-shadow:0 10px 34px rgba(248,81,73,.32)}
.callout-toast .ct-x{position:absolute;right:.35rem;top:.3rem;background:none;border:none;color:var(--subtle);cursor:pointer;font-size:.85rem;line-height:1;padding:.15rem .3rem}
.callout-toast .ct-x:hover{color:var(--text)}
.callout-toast .ct-eyebrow{font:600 .58rem var(--disp,var(--mono));text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin-bottom:.18rem}
.callout-toast.big .ct-eyebrow{color:var(--bad)}
.callout-toast .ct-symptom{font-size:.86rem;font-weight:600;color:var(--text);margin-bottom:.15rem;padding-right:1rem}
.callout-toast .ct-meta{font-size:.72rem;color:var(--muted);font-family:var(--mono)}
.callout-toast .ct-cta{margin-top:.3rem;font-size:.72rem;color:var(--accent);font-weight:600}
@keyframes ct-in{from{opacity:0;transform:translateX(30px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ct-out{to{opacity:0;transform:translateX(30px) scale(.96)}}
:root.reduce-motion .callout-toast{animation:none}
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
    <div class="hud-l"><span class="brand">✈</span><span class="name">MRO <b>TYCOON</b></span><span class="ver">v0.7</span></div>
    <div class="hud-c"><span id="daynight" class="daynight" title="Día u Noche según hora ingame">☀️</span><span class="clock" id="clock">Día 1 · 00:00</span><span class="wk" id="week">Semana 1</span><span id="overnight-badge" class="kpi" style="display:none;cursor:pointer;margin-left:.5rem" title="Aviones que pernoctan esta noche · click para detalle"></span></div>
    <div class="hud-r">
      <div class="kpi"><span class="klbl">Balance</span><strong id="bal">250.000 €</strong></div>
      <div class="kpi compliance-kpi" id="kpi-rep" title="Reputación media — click para detalle por aerolínea"><span class="klbl">Reputación</span><span><strong id="rep">50</strong><s>/100</s></span></div>
      <div class="kpi compliance-kpi" id="kpi-compliance" title="Compliance Part-145 — click para detalle"><span class="klbl">Part-145</span><span><strong id="compliance-score">80</strong><s>/100</s></span></div>
      <div class="hud-tools">
        <button class="icbtn" id="btn-save" title="Guardar partida"><svg class="tic" viewBox="0 0 24 24"><path d="M5 4h11l3.2 3.2V20H5Z"/><path d="M8 4v5h6.5V4"/><rect x="8" y="13" width="8" height="6.5"/></svg></button>
        <button class="icbtn" id="btn-load" title="Cargar partida"><svg class="tic" viewBox="0 0 24 24"><path d="M3.6 7.2A1.6 1.6 0 0 1 5.2 5.6h3.4l2 2.4h7.2a1.6 1.6 0 0 1 1.6 1.6V18a1.6 1.6 0 0 1-1.6 1.6H5.2A1.6 1.6 0 0 1 3.6 18Z"/></svg></button>
        <button class="icbtn" id="btn-new" title="Nueva partida"><svg class="tic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><path d="M12 8.2v7.6M8.2 12h7.6"/></svg></button>
        <button class="icbtn" id="btn-menu" title="Menú (pausa · guardar · volver al menú)"><svg class="tic" viewBox="0 0 24 24"><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.6V19.5h13V9.6"/><path d="M10 19.5v-5h4v5"/></svg></button>
        <button class="icbtn" id="btn-age-fleet" title="DEBUG: envejecer flota cerca de triggers A/C"><svg class="tic" viewBox="0 0 24 24"><path d="M14.7 6.3a3.6 3.6 0 0 0-4.9 4.2l-5.4 5.4a1.5 1.5 0 0 0 0 2.1l1.6 1.6a1.5 1.5 0 0 0 2.1 0l5.4-5.4a3.6 3.6 0 0 0 4.2-4.9l-2.4 2.4-2.6-.6-.6-2.6Z"/></svg></button>
        <span id="save-indicator" style="font-size:.7rem;color:#3fb950;align-self:center;margin-left:.25rem"></span>
      </div>
      <div class="speeds">
        <button id="btn-autopause" title="Auto-pausa en eventos críticos (AOG / Critical)"><svg viewBox="0 0 24 24"><path d="M6 8.5a6 6 0 0 1 12 0c0 6 2.5 4.5 2.5 8.5H3.5c0-4 2.5-2.5 2.5-8.5"/><path d="M10.5 20a1.6 1.6 0 0 0 3 0"/></svg></button>
        <button data-speed="0" class="active" title="Pausa"><svg viewBox="0 0 24 24"><path d="M8.5 5.5v13M15.5 5.5v13"/></svg></button>
        <button data-speed="1" title="Velocidad normal (1 min = 1 s)">1×</button>
        <button data-speed="5" title="Rápido (5× · 1 hora = 12 s)">5×</button>
        <button data-speed="10" title="Muy rápido (10× · 1 hora = 6 s)">10×</button>
        <button data-speed="25" title="Ultrarrápido (25× · 1 hora ≈ 2,4 s)">25×</button>
        <button data-speed="500" title="TEST (500× · 1 día ≈ 3 s)" style="opacity:.85">500×</button>
        <button data-speed="5000" title="TEST máx (5000× · 1 día ≈ 0,3 s · si el PC lo aguanta)" style="opacity:.85">5000×</button>
      </div>
    </div>
  </header>
  <div class="body">
    <aside class="side">
      <div class="side-grp">Operación</div>
      <button data-tab="map" class="active"><span class="ic"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.3"/></svg></span><span class="nt">Mapa</span></button>
      <button data-tab="operations"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="3.9"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M12 12 18.2 5.8"/></svg></span><span class="nt">Operaciones</span><span class="badge" id="badge-wo">0</span></button>
      <button data-tab="schedule"><span class="ic"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v3.4M16 3v3.4"/><path d="M7 13h2.2M11 13h2.2M15 13h2.2M7 16.6h2.2M11 16.6h2.2"/></svg></span><span class="nt">Schedule</span><span class="badge" id="badge-schedule">0</span></button>
      <button data-tab="planning"><span class="ic"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="8.5" y="2.4" width="7" height="3.3" rx="1.2"/><path d="M9 11h6M9 14.5h6M9 18h3.5"/></svg></span><span class="nt">Production Planning</span><span class="badge" id="badge-planning">0</span></button>
      <div class="side-grp">Gestión</div>
      <button data-tab="office"><span class="ic"><svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17.5" rx="1.3"/><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2"/></svg></span><span class="nt">Oficina</span><span class="badge" id="badge-office">0</span></button>
      <button data-tab="contracts"><span class="ic"><svg viewBox="0 0 24 24"><path d="M7 3.2h6.5L17.5 7v13.8H7Z"/><path d="M13.5 3.2v3.9h4"/><path d="M9.5 12h5M9.5 15.5h5"/></svg></span><span class="nt">Contratos</span><span class="badge" id="badge-offers">2</span></button>
      <span style="display:none"><span class="badge" id="badge-candidates">5</span></span>
      <button class="nav-dis" disabled title="🏗️ Construcción de hangares — próximamente (sistema de permisos + obra civil en futura fase)"><span class="ic"><svg viewBox="0 0 24 24"><path d="M3.5 20.5V11a8.5 5.6 0 0 1 17 0v9.5"/><path d="M3 20.5h18M8 20.5V15h8v5.5"/></svg></span><span class="nt">Hangares</span><span class="badge" style="background:transparent;color:#5a6b7d">próx.</span></button>
      <div class="side-grp">Análisis</div>
      <button data-tab="dashboard"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 20h16"/><rect x="5.5" y="11.5" width="3.2" height="6.5"/><rect x="10.4" y="7.5" width="3.2" height="10.5"/><rect x="15.3" y="4.5" width="3.2" height="13.5"/></svg></span><span class="nt">Dashboard</span></button>
      <button data-tab="economy"><span class="ic"><svg viewBox="0 0 24 24"><rect x="3.5" y="6.5" width="17" height="12.5" rx="2.5"/><path d="M3.5 10h17"/><circle cx="16.5" cy="13.5" r="1.25" fill="currentColor" stroke="none"/></svg></span><span class="nt">Economía</span></button>
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
let detailStandId = null;    // Handoff mapa (2026-06-01): simId del stand para la ficha de stand
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
// Menú de pausa in-game (guardar / volver al menú principal), 2026-06-06. Estándar tipo
// "todos los juegos". pmPrevSpeed recuerda la velocidad para Reanudar tras pausar.
let pauseMenuOpen = false;
let pmPrevSpeed = 0;
// === Popups de evento (Dani 2026-06-06) ===
// Cada evento (callout, AOG, AOG evitable, release AOG, resolucion on-time/retraso) saca un modal
// con el detalle, PAUSA el reloj y centra+zoom el mapa en el stand del evento. "No mostrar este
// tipo" se recuerda (localStorage). Cola: un evento a la vez, "Entendido" pasa al siguiente.
let eventQueue = [];     // [{type,title,icon,color,lines:[],standId}]
let eventSkip = {};      // {tipo:true} persistido
let evPrevSpeed = -1;    // velocidad antes de pausar por evento (-1 = no pausado por evento)
let evCamDone = false;   // si ya enfoque el mapa para el evento actual
let evWoIds = null, evAog = null, evDeparted = null; // trackers diff (null = 1er tick init)
try { const _es = (typeof localStorage !== "undefined") ? localStorage.getItem("mro_event_skip") : null; if (_es) eventSkip = JSON.parse(_es) || {}; } catch (e) {}
function saveEventSkip(){ try { if (typeof localStorage !== "undefined") localStorage.setItem("mro_event_skip", JSON.stringify(eventSkip)); } catch (e) {} }
// Coords OSM normalizadas de los 7 stands del juego (para centrar el mapa en el evento).
const EV_STAND_NORM = { "H1-S1":[0.477,0.559], "H1-S2":[0.487,0.565], "H1-S3":[0.513,0.580], "H1-S4":[0.532,0.592], "H1-S5":[0.561,0.610], "R1":[0.584,0.621], "H2-S1":[0.607,0.637] };
// Centra + zoom el mapa en una coord normalizada (misma lógica verificada que __mroDebug.focusNorm).
function focusMapOnNorm(nx, ny, zoom){
  if (!mapDriver || mapDriver.theme !== "f5d" || !mapDriver.app) return;
  const z = Math.max(0.2, Math.min(8, zoom || 2.4));
  const W = mapDriver.app.screen.width, H = mapDriver.app.screen.height;
  const FW = 6000, FH = 4800, pad = 400;
  const wx = pad + nx * (FW - pad * 2), wy = pad + ny * (FH - pad * 2);
  mapDriver.camera.zoom = z;
  mapDriver.camera.x = (W / 2) / z - wx;
  mapDriver.camera.y = (H / 2) / z - wy;
  if (mapDriver.worldRoot) { mapDriver.worldRoot.scale.set(z); mapDriver.worldRoot.position.set(mapDriver.camera.x * z, mapDriver.camera.y * z); }
}
// === Tutorial Rookie guiado (2026-05-30) ===
// tutActive: el overlay de bloqueo + bocadillo están vivos. tutStep: índice en TUT_STEPS.
// El tutorial fuerza los primeros clicks (guiado absoluto) hasta graduarse el día 3.
// Por defecto ON en dificultad Rookie; "Saltar" siempre disponible.
let tutActive = false;
let tutStep = 0;
let tutGraduated = false; // true tras completar/saltar — no reaparece en la misma partida
// Ajustes (handoff entrega-menu 3, 2026-05-30). Persistidos en localStorage "mro_settings".
// Defaults alineados con el mockup. Solo algunos están CABLEADOS a sistemas reales hoy
// (pause_panels, confirm, fx, reduce_motion, lang); audio/vídeo quedan como preferencia
// guardada hasta que exista sonido/sistema de vídeo. settingsCat = categoría activa.
let settingsCat = "audio";
let howtoStep = 0; // Cómo se juega (handoff entrega-menu 3): paso activo 0..3
let catalogTab = "aircraft"; // Catálogo: pestaña activa (aircraft|tasks|daily|checks|airlines|airports|economy)
let catAtaOpen = {}; // Catálogo·Tareas: capítulos ATA desplegados (manual acordeón)
// Cierre Semanal (handoff entrega-menu 3): cuando el sim cierra una semana (kpiHistory
// crece dentro de S.advanceGame), pausamos el reloj y mostramos el modal. weeklyCloseData
// guarda el snapshot a mostrar (null = sin modal). lastKpiLen detecta el crecimiento.
let weeklyCloseData = null;
let lastKpiLen = 0;
// Hito / Milestone (handoff entrega-menu 5): cuando crece el nº de contratos ACTIVOS
// (nuevo cliente firmado), mostramos la pantalla de hito. milestoneData = datos a mostrar
// (null = sin modal). lastActiveContracts detecta el crecimiento sin tocar el sim.
let milestoneData = null;
let lastActiveContracts = 0;
const SETTINGS_DEFAULTS = {
  vol_music: 55, vol_sfx: 80, vol_alert: 90, mute_bg: true,
  fx: true, reduce_motion: false, contrast: false,
  pause_panels: false, confirm: true, autosave: true,
  lang: 0, avterms: true, textsize: 0,
  callout_popup: true, // Fase B2: pop-out automático del callout al aparecer (toggle "no abrir auto")
};
let gameSettings = { ...SETTINGS_DEFAULTS };
function loadSettings(){
  try {
    const raw = (typeof localStorage !== "undefined") ? localStorage.getItem("mro_settings") : null;
    if (raw) gameSettings = { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  } catch(e) { gameSettings = { ...SETTINGS_DEFAULTS }; }
  applySettings();
}
function saveSettings(){
  try { if (typeof localStorage !== "undefined") localStorage.setItem("mro_settings", JSON.stringify(gameSettings)); } catch(e){}
  applySettings();
}
// Aplica al runtime los ajustes que SÍ tienen efecto hoy.
function applySettings(){
  // "Reducir movimiento": clase global que apaga animaciones (las usa CSS via :root).
  try {
    const root = document.documentElement;
    if (root) root.classList.toggle("reduce-motion", !!gameSettings.reduce_motion);
    if (root) root.classList.toggle("hi-contrast", !!gameSettings.contrast);
  } catch(e){}
}
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
      onStandClick: (simId, _hasAirplane, _registration) => {
        // Handoff mapa (2026-06-01): click en stand → ficha de stand (ocupación + trabajo +
        // estado), tanto si está ocupado como libre. Antes: ocupado abría ficha de avión,
        // libre solo lanzaba una notif. La ficha enlaza al avión y a la WO con sus linkcards.
        if (simId) { detailStandId = simId; invalidateModalCache(); }
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
    <div class="map-ctrl">
      <div class="zoom">
        <button data-map-zoom="in" title="Acercar" aria-label="Acercar">+</button>
        <button data-map-zoom="out" title="Alejar" aria-label="Alejar">−</button>
        <button data-map-fit title="Encajar todo" aria-label="Encajar todo">⤢</button>
      </div>
      <div class="map-daynight" id="map-daynight">— · --:--</div>
    </div>
    <div class="map-legend">
      <span class="lg" style="color:#ff4757"><i></i>AOG</span>
      <span class="lg" style="color:#f5b945"><i></i>Demora</span>
      <span class="lg" style="color:#3fb950"><i></i>Trabajando</span>
      <span class="lg" style="color:#6dc7ff"><i></i>Daily</span>
      <span class="lg" style="color:#3aa9ff"><i></i>En tierra</span>
      <span class="lg" style="color:#3d6f9d"><i></i>Libre</span>
    </div>
    <div id="map-mini" class="map-mini"></div>
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
    // floor: el reloj es fraccionario a 1x (1 min = 1 s real, tick 100ms) → evitar "06:3.6".
    const mod = ((Math.floor(m) % 1440) + 1440) % 1440;
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

  // Pill día/noche del chrome del mapa: refleja el reloj del juego (mismo umbral que el
  // fondo Pixi: noche 22:00–05:59). Se actualiza cada tick junto al panel info.
  const dn = document.getElementById("map-daynight");
  if (dn) {
    const hour = Math.floor(dayMinute / 60);
    const night = hour >= 22 || hour < 6;
    dn.textContent = (night ? "🌙 Noche" : "☀️ Día") + " · " + hhmm(dayMinute);
  }

  el.innerHTML = html;
  updateMapMini();
}

/** Minimapa (handoff design 6 · Pasada 3): cuadrícula esquemática de stands ocupados,
 *  un chip por avión real en tierra coloreado por su displayState. Universal (no depende
 *  de la geometría OSM — es un resumen de ocupación, no un plano a escala). Idempotente.
 *  Las coords reales de cada stand viven en el canvas Pixi; aquí damos la lectura rápida
 *  "qué stands trabajan y en qué estado" sin tocar WebGL. */
function updateMapMini(){
  const el = document.getElementById("map-mini");
  if (!el) return;
  const now = game.clock.minute;
  // displayState por avión presente (mismo criterio cromático que la leyenda).
  const COLORS = { aog: "#ff4757", delayed: "#f5b945", working: "#3fb950", daily: "#6dc7ff", idle: "#3aa9ff" };
  const present = game.airplanes.filter(a => a.status !== "Departed" && a.arrivalMinute <= now
    && (a.actualDepartureMinute === undefined || a.actualDepartureMinute > now));
  // Estado por avión: replica la prioridad aog>delayed>working>daily>idle de sync.ts,
  // derivado de sus WOs activas (sin depender del render).
  function stateOf(a){
    const wos = game.workOrders.filter(w => w.airplaneInstanceId === a.instanceId
      && w.phase !== "Completed" && w.phase !== "Failed" && w.phase !== "Deferred");
    const tplAog = wos.some(w => { const t = game.templates.find(x => x.id === w.templateId); return t && t.isAOG; });
    if (tplAog) return "aog";
    if (a.scheduledDepartureMinute < now && wos.length > 0) return "delayed";
    const working = wos.some(w => (w.assignedMechanicIds && w.assignedMechanicIds.length > 0)
      && (w.phase === "MainTask" || w.phase === "Test" || w.phase === "Rework" || w.phase === "Inspection"));
    if (working) return "working";
    const daily = wos.some(w => w.templateId && w.templateId.indexOf && w.templateId.indexOf("DC-") === 0);
    if (daily) return "daily";
    return "idle";
  }
  let dots = "";
  for (const a of present) {
    const st = stateOf(a);
    const col = COLORS[st] || "#3aa9ff";
    const code = a.standId ? esc(String(a.standId).replace(/^H1-S?/, "")) : "";
    dots += '<span class="mm-dot" style="background:' + col + ';color:' + col + '" title="' + esc(a.registration) + ' · ' + st + '">' + code + '</span>';
  }
  const body = present.length === 0 ? '<div class="mm-empty">Apron despejado</div>' : '<div class="mm-dots">' + dots + '</div>';
  el.innerHTML = '<div class="mm-head"><span>OVD · apron</span><b>' + present.length + '</b></div>' + body;
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
    // Fase A#1 (reveal escalonado): un evento NO nace diagnosticado. Hasta que el T-shoot
    // (Inspection) revela el scope, el callout muestra solo el SÍNTOMA; ocultamos descripción
    // real, P/N, herramientas y AMM. scopeRevealed lo sella la máquina de estados al cerrar
    // Inspection (INC2). undefined (instancias legacy) = tratado como revelado (no oculta).
    e.scopeRevealed = wo.scopeRevealed !== false;
    if (!e.scopeRevealed) {
      e.descShort = tpl ? S.complaintForTemplate(tpl, S.DATA.ataChapters) : wo.templateId;
      e.parts = []; e.tools = []; e.amm = null;
    }
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
  let curIdx = PHASE_LABELS.findIndex(p => p[0] === e.phase); if (e.phase==="Completed") curIdx=5; if (e.phase==="Rework") curIdx=2;
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

function renderCrews(){
  var crews = game.crews || [];
  var mechs = game.mechanics;
  var mById = function(id){ return mechs.find(function(m){ return m.id===id; }); };
  var inCrew = {};
  crews.forEach(function(c){ c.officerIds.concat(c.helperIds).forEach(function(id){ inCrew[id]=true; }); });
  var freeOfficers = mechs.filter(function(m){ return (m.base==="B1"||m.base==="B2") && !m.isLeadForeman && !inCrew[m.id]; });
  var freeHelpers = mechs.filter(function(m){ return m.base===null && !m.isLeadForeman && !inCrew[m.id]; });
  var h = '<h3 style="margin-top:0">🚐 Cuadrillas</h3>';
  h += '<p class="muted" style="margin-bottom:.6rem;font-size:.88rem">Compón tus cuadrillas: cada una lleva uno o dos oficiales (B1/B2) y uno o dos helpers, y viaja en su propia furgoneta. Mandas la cuadrilla entera a un avión y se desplazan juntos.</p>';
  h += '<button class="primary" data-crew-new="1" style="margin-bottom:.8rem">＋ Nueva cuadrilla</button>';
  if (crews.length===0) h += '<div class="empty">Sin cuadrillas. Crea una y añádele un oficial + helpers.</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:.8rem">';
  for (var i=0;i<crews.length;i++){
    var c = crews[i];
    var colorHex = '#' + (c.color>>>0).toString(16).padStart(6,'0');
    var memberMechs = c.officerIds.concat(c.helperIds).map(mById).filter(Boolean);
    var busy = memberMechs.some(function(m){ return m.state==="Working"||m.state==="ToPlane"||m.state==="Returning"; });
    var salary = memberMechs.reduce(function(s,m){ return s + S.effectiveWeeklySalary(m); }, 0);
    var chip = function(id, role){
      var m = mById(id); if(!m) return '';
      var lbl = role==="officer" ? (m.base||"?") : "H";
      return '<span style="display:inline-flex;align-items:center;gap:.3rem;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:12px;padding:.15rem .5rem;margin:.15rem">'+esc(m.name)+' <span class="muted" style="font-size:.7rem">'+lbl+'</span> <button data-crew-remove="'+c.id+':'+m.id+'" title="Quitar" style="background:none;border:none;color:var(--bad);cursor:pointer;font-weight:700;padding:0 .1rem">×</button></span>';
    };
    var officersHtml = c.officerIds.map(function(id){ return chip(id,"officer"); }).join('') || '<span class="muted" style="font-size:.8rem">—</span>';
    var helpersHtml = c.helperIds.map(function(id){ return chip(id,"helper"); }).join('') || '<span class="muted" style="font-size:.8rem">—</span>';
    var warn = c.officerIds.length===0 ? '<div style="color:var(--warn);font-size:.78rem;margin-top:.3rem">⚠️ Sin oficial: no puede certificar trabajos.</div>' : '';
    var addOfficer = (c.officerIds.length<2 && freeOfficers.length>0) ? '<select data-crew-add="'+c.id+':officer" style="flex:1;min-width:120px"><option value="">＋ oficial…</option>'+freeOfficers.map(function(m){ return '<option value="'+m.id+'">'+esc(m.name)+' ('+m.base+')</option>'; }).join('')+'</select>' : '';
    var addHelper = (c.helperIds.length<2 && freeHelpers.length>0) ? '<select data-crew-add="'+c.id+':helper" style="flex:1;min-width:120px"><option value="">＋ helper…</option>'+freeHelpers.map(function(m){ return '<option value="'+m.id+'">'+esc(m.name)+'</option>'; }).join('')+'</select>' : '';
    h += '<div style="border:1px solid var(--border);border-left:4px solid '+colorHex+';border-radius:8px;padding:.7rem;background:var(--panel)">'
      + '<header style="display:flex;align-items:center;justify-content:space-between;gap:.4rem;margin-bottom:.4rem">'
      +   '<span style="display:flex;align-items:center;gap:.4rem"><span style="width:14px;height:14px;border-radius:3px;background:'+colorHex+';display:inline-block"></span><strong>'+esc(c.name)+'</strong></span>'
      +   '<span style="display:flex;align-items:center;gap:.5rem"><span class="'+(busy?'':'muted')+'" style="font-size:.75rem">'+(busy?'🚐 en ruta/trabajo':'en oficina')+'</span><button data-crew-delete="'+c.id+'" title="Eliminar cuadrilla" style="background:none;border:none;color:var(--bad);cursor:pointer">🗑</button></span>'
      + '</header>'
      + '<div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Oficiales</div><div style="min-height:1.7rem">'+officersHtml+'</div>'
      + '<div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:.3rem">Helpers</div><div style="min-height:1.7rem">'+helpersHtml+'</div>'
      + warn
      + '<div style="display:flex;gap:.4rem;margin-top:.5rem;flex-wrap:wrap">'+addOfficer+addHelper+'</div>'
      + '<div class="muted" style="font-size:.75rem;margin-top:.4rem">'+memberMechs.length+' pers · '+(salary/1000).toFixed(1)+'k €/sem</div>'
      + '</div>';
  }
  h += '</div>';
  if (freeOfficers.length || freeHelpers.length){
    h += '<div class="muted" style="margin-top:.8rem;font-size:.82rem">Sin asignar: '+freeOfficers.length+' oficial(es) · '+freeHelpers.length+' helper(s). Añádelos a una cuadrilla.</div>';
  }
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
    <button class="subtab\${officeSubtab === 'crews' ? ' active' : ''}" data-office-subtab="crews" style="padding:.3rem .8rem;background:\${officeSubtab === 'crews' ? 'var(--accent)' : 'transparent'};color:\${officeSubtab === 'crews' ? '#fff' : 'var(--text)'};border:1px solid var(--border);border-radius:4px;cursor:pointer">🚐 Cuadrillas <span class="badge" style="margin-left:.3rem">\${(game.crews||[]).length}</span></button>
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
  // Subseción "Cuadrillas" = composición manual de equipos (oficial + helpers, una furgo c/u)
  if (officeSubtab === "crews") {
    h += renderCrews();
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
  const airline = id => game.airlines.find(a => a.id === id) || {};
  const repOf = id => Math.round(game.reputation?.perAirline?.[id] ?? 50);
  const stars = n => { const f = Math.max(0, Math.min(5, Math.round(n/20))); return '<span style="color:var(--warn)">' + '★★★★★'.slice(0,f) + '</span><span style="color:var(--line-2)">' + '★★★★★'.slice(f) + '</span>'; };
  const term = (k,v,cls) => \`<div class="ct-row"><span class="ct-k">\${k}</span><span class="ct-v \${cls||''}">\${v}</span></div>\`;
  const actives = activeContracts();
  const offers = liveOffers();
  const feeSum = actives.reduce((s,c) => s + (c.baseFeePerWeek||0), 0);
  const repList = actives.map(c => repOf(c.airlineId));
  const repAvg = repList.length ? Math.round(repList.reduce((a,b)=>a+b,0)/repList.length) : 0;
  let h = '<div class="cic-panel">';
  h += '<div class="main-head"><div class="eyebrow">Gestión · Cartera de clientes</div><div class="title-row"><div><h1>Contratos</h1><div class="sub">Aerolíneas que sirves · acepta, gestiona o deja caer</div></div></div></div>';
  h += \`<div class="office-sit"><div class="sitbar"><div class="sit-tiles"><div class="tile c-progress"><div class="tnum">\${actives.length}</div><div class="tlbl"><span class="led" style="color:var(--accent)"></span>Activos</div></div><div class="tile c-unassigned"><div class="tnum">\${offers.length}</div><div class="tlbl"><span class="led" style="color:var(--warn)"></span>Ofertas</div></div><div class="tile c-ground"><div class="tnum" style="font-size:1.3rem">\${fmt(feeSum)} €</div><div class="tlbl">BaseFee/sem</div></div><div class="tile c-aog"><div class="tnum">\${repAvg||'—'}</div><div class="tlbl"><span class="led" style="color:var(--warn)"></span>Rep media</div></div></div></div></div>\`;
  h += '<div class="feed-wrap">';
  h += \`<div class="grp-head g-progress"><span class="gdot"></span>Contratos activos<span class="gline"></span><span class="gcount">\${actives.length}</span></div>\`;
  if (actives.length === 0) h += '<p class="muted">Sin contratos activos.</p>';
  else {
    h += '<div class="ccgrid">';
    for (const c of actives) {
      const a = airline(c.airlineId), col = a.color || 'var(--accent)', rep = repOf(c.airlineId);
      h += \`<article class="ccard" style="--oc:\${col}"><div class="cc-bar"></div><div class="cc-head"><div class="cc-nm"><h3 style="color:\${col}">\${esc(airlineName(c.airlineId))}</h3><span class="cc-ia mono">\${esc(a.iataCode||'')}</span></div><span class="cc-pill ok">● Activo</span></div><div class="cc-since mono">\${c.id} · \${tierBadge(c.tier)}</div><div class="cc-terms">\${term('BaseFee/sem', fmt(c.baseFeePerWeek)+' €','ok')}\${term('Pago/min', c.paymentPerWOMinute+' €')}\${term('Penalty', c.penaltyPerLateMinute+' €/min', c.penaltyPerLateMinute>0?'warn':'')}\${term('Aviones/día', c.expectedLandingsPerDay)}\${term('Rep. mínima', c.minReputation, rep<c.minReputation?'warn':'')}\${term('Rep. actual', rep,'ok')}</div><div class="cc-foot"><span class="cc-rep">\${stars(rep)} <b class="mono">\${rep}</b></span><span class="cc-actions"><button class="cbtn" data-contract-id="\${c.id}">Renegociar</button><button class="cbtn warn" disabled title="Rescindir contrato — disponible en futura versión">Rescindir</button></span></div></article>\`;
    }
    h += '</div>';
  }
  h += \`<div class="grp-head g-risk" style="margin-top:1.4rem"><span class="gdot"></span>Ofertas pendientes<span class="gline"></span><span class="gcount">\${offers.length}</span></div>\`;
  if (offers.length === 0) h += '<p class="muted">No hay ofertas pendientes.</p>';
  else {
    h += '<div class="ccgrid">';
    for (const c of offers) {
      const a = airline(c.airlineId), col = a.color || 'var(--warn)', rep = repOf(c.airlineId);
      const expIn = c.expiresAtMinute ? Math.max(0, c.expiresAtMinute - game.clock.minute) : 0;
      h += \`<article class="ccard offer" style="--oc:\${col}"><div class="cc-bar"></div><div class="cc-head"><div class="cc-nm"><h3 style="color:\${col}">\${esc(airlineName(c.airlineId))}</h3><span class="cc-ia mono">\${esc(a.iataCode||'')}</span></div><span class="cc-pill warn">◆ Oferta · \${expIn}m</span></div><div class="cc-since mono">Rep. mínima \${c.minReputation} · tienes \${rep} \${rep>=c.minReputation?'✓':'✗'}</div><div class="cc-terms">\${term('BaseFee/sem', fmt(c.baseFeePerWeek)+' €','ok')}\${term('Pago/min', c.paymentPerWOMinute+' €')}\${term('Penalty', c.penaltyPerLateMinute+' €/min','warn')}\${term('Rep. mínima', c.minReputation)}</div><div class="cc-foot"><span class="cc-note mono">\${tierBadge(c.tier)}</span><span class="cc-actions"><button class="cbtn" data-reject="\${c.id}">Rechazar</button><button class="cbtn primary" data-accept="\${c.id}">Aceptar</button></span></div></article>\`;
    }
    h += '</div>';
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

  h += '<div class="grp-head g-scheduled" style="margin-top:1.4rem"><span class="gdot"></span>Aerolíneas interesadas (pipeline)<span class="gline"></span></div>';
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
  h += '</div></div>';
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

  // KPI principal: TDR = Technical Dispatch Reliability (% de departures despachados sin
  // fallo técnico ≥15 min imputable). Refactor 2026-05-31. Benchmark real 98.5-99.5%.
  const kpi = game.departureKPI ?? S.createDepartureKPI();
  const tdrPct = S.getTdrPct(kpi);                          // % fiabilidad (principal)
  const tdrMin = S.getTdrGlobal(kpi);                       // min delay imputable medio (secundario)
  const fail15 = kpi.totalTechFail15 ?? 0;
  const fail60 = kpi.totalTechFail60 ?? 0;
  const aogPct = kpi.totalDepartures > 0 ? (kpi.totalAog / kpi.totalDepartures * 100) : 0;
  // Colores por benchmark de fiabilidad: ≥98.5% verde, ≥95% ámbar, <95% rojo.
  const tdrColor = tdrPct >= 98.5 ? "var(--success)" : tdrPct >= 95 ? "var(--warning)" : "var(--danger)";

  // Pivot línea pura · Fase A modelo HH
  const hkpi = game.hoursKPI ?? S.createHoursKPI();
  const eff = S.getHoursEfficiencyGlobal(hkpi);
  const effColor = eff >= 1.0 ? "var(--success)" : eff >= 0.85 ? "var(--warning)" : "var(--danger)";
  const billedEur = Math.round(hkpi.totalBookHoursBilled * 60 * 1.0); // ref aproximada (rate avg)

  // Tabla por aerolínea contratada (que aparezcan en kpi.perAirline al menos una vez)
  let perAirlineRows = '';
  const airlineEntries = Object.entries(kpi.perAirline).map(([id, b]) => {
    const al = game.airlines.find(a => a.id === id);
    const tdrA = S.getTdrPctForAirline(kpi, id);
    return { id, name: al?.name ?? id, color: al?.color ?? "#888", bucket: b, tdr: tdrA };
  });
  airlineEntries.sort((a, b) => b.bucket.departures - a.bucket.departures);
  if (airlineEntries.length === 0) {
    perAirlineRows = '<tr><td colspan="6" class="muted" style="text-align:center;padding:1rem">Sin departures registrados todavía.</td></tr>';
  } else {
    for (const e of airlineEntries) {
      const tdrCol = e.tdr >= 98.5 ? "var(--success)" : e.tdr >= 95 ? "var(--warning)" : "var(--danger)";
      const aogColAg = e.bucket.aog > 0 ? 'var(--danger)' : 'var(--muted)';
      const rel = e.bucket.reliable ?? e.bucket.departures;
      const f15 = e.bucket.techFail15 ?? 0;
      perAirlineRows += \`<tr>
        <td><span style="display:inline-block;width:8px;height:8px;background:\${e.color};border-radius:50%;margin-right:.4rem"></span>\${esc(e.name)}</td>
        <td class="mono">\${e.bucket.departures}</td>
        <td class="mono" style="color:var(--success)">\${rel}</td>
        <td class="mono" style="color:\${f15>0?'var(--warning)':'var(--muted)'}">\${f15}</td>
        <td class="mono" style="color:\${aogColAg};font-weight:600">\${e.bucket.aog}</td>
        <td class="mono" style="color:\${tdrCol}"><strong>\${e.tdr.toFixed(1)}%</strong></td>
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

  return \`<div class="cic-panel"><div class="main-head"><div class="eyebrow">Análisis · Rendimiento del MRO</div><div class="title-row"><div><h1>Dashboard</h1><div class="sub">KPIs reales · TDR · brand · horas-hombre</div></div></div></div><div class="dash-wrap">
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

  <h3 style="margin-top:1.5rem">📈 TDR — Technical Dispatch Reliability</h3>
  <p class="muted" style="margin-bottom:.5rem">Tu KPI principal: <strong>% de salidas despachadas sin fallo técnico imputable</strong>. Solo cuenta contra ti un retraso <strong>≥15 min causado por una avería que NO resolviste a tiempo</strong> (mecánico ocupado, sin técnico, sin habilitación). Si el avión no tenía avería, o el retraso es por causa externa, o fue &lt;15 min → dispatch fiable. Cotas: D-15 (fallo) · D-60 (serio) · ≥3h (AOG). Benchmark sector: 98,5-99,5%.</p>
  <div class="dash-grid">
    <div class="dash-card">
      <div class="dash-title">📊 TDR Global</div>
      <div class="dash-big" style="color:\${tdrColor}">\${tdrPct.toFixed(1)}<span style="font-size:.85rem;color:var(--muted)">%</span></div>
      <div class="muted" style="font-size:.75rem">\${kpi.totalReliable ?? kpi.totalDepartures}/\${kpi.totalDepartures} departures fiables · delay imputable medio \${tdrMin.toFixed(1)} min/dep</div>
    </div>
    <div class="dash-card">
      <div class="dash-title">⚠️ Fallos de dispatch (técnicos)</div>
      <div class="dash-big" style="color:\${fail15 > 0 ? 'var(--warning)' : 'var(--success)'}">\${fail15}</div>
      <div class="muted" style="font-size:.75rem">D-15 (≥15m imputable) · de ellos \${fail60} serios (D-60, ≥60m)</div>
    </div>
    <div class="dash-card">
      <div class="dash-title">🛑 AOG (delay ≥3h)</div>
      <div class="dash-big" style="color:\${aogPct > 5 ? 'var(--danger)' : 'var(--muted)'}">\${kpi.totalAog}</div>
      <div class="muted" style="font-size:.75rem">\${aogPct.toFixed(1)}% de departures · penalty €\${S.AOG_ESCALATION_PENALTY_EUR.toLocaleString("es-ES")} c/u</div>
    </div>
  </div>

  <h4 style="margin-top:1rem">TDR por aerolínea contratada</h4>
  <table>
    <thead><tr><th>Aerolínea</th><th>Departures</th><th>Fiables</th><th>Fallos D-15</th><th>AOG</th><th>TDR%</th></tr></thead>
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

// Handoff mapa (2026-06-01): ficha de stand. Click en un stand del mapa Pixi → este cajón
// con ocupación (→ avión), trabajo en curso (→ WO) y estado. Reusa el patrón del flight drawer
// y los datos REALES del game (no la foto de la maqueta). Portado de design-ref ops-map.js
// renderStandDrawer, conectado a onStandClick (que pasa el simId del stand).
function renderStandDetailModal(){
  const simId = detailStandId;
  if (!simId) return null;
  const ap = game.airplanes.find(a => a.standId === simId && a.status !== "Departed");
  const wo = ap ? game.workOrders.find(w => w.airplaneInstanceId === ap.instanceId && w.phase !== "Completed" && w.phase !== "Failed") : null;
  const tpl = wo ? game.templates.find(t => t.id === wo.templateId) : null;
  const tplAog = !!(tpl && tpl.isAOG);
  // Estado del stand por lo que ocurre encima (mismo vocabulario que el mapa/leyenda).
  let stateKey, stateLbl, c;
  if (!ap) { stateKey = "free"; stateLbl = "Libre"; c = "var(--dim)"; }
  else if (tplAog) { stateKey = "aog"; stateLbl = "AOG"; c = "var(--aog)"; }
  else if (wo && wo.assignedMechanicIds.length === 0) { stateKey = "unassigned"; stateLbl = "Sin asignar"; c = "var(--warn)"; }
  else if (wo) { stateKey = "working"; stateLbl = "Trabajando"; c = "var(--accent)"; }
  else { stateKey = "occupied"; stateLbl = "En tierra"; c = "var(--accent)"; }
  const al = ap ? game.airlines.find(a => a.iataCode === (ap.arrivalCallsign||"").slice(0,2)) : null;
  const alColor = al?.color || "var(--accent-2)";
  const occBlock = !ap
    ? \`<div class="dw-amm" style="color:var(--dim)">Stand <b>libre</b> — listo para recibir un avión o un A-check en plataforma (stage 2+).</div>\`
    : \`<div class="linkcard" data-fleet-reg="\${esc(ap.registration)}"><div class="lk-ic" style="background:var(--accent-bg);color:var(--accent)">✈</div><div><div class="lk-t">Ocupado por</div><div class="lk-v">\${esc(ap.registration)} · \${esc(ap.model)}/\${esc(ap.engineVariant)}</div></div><span class="lk-go">›</span></div>\`;
  const workBlock = wo
    ? \`<div class="dw-sec">Trabajo en curso</div><div class="linkcard" data-wo="\${esc(wo.instanceId)}"><div class="lk-ic" style="background:rgba(77,163,255,.12);color:var(--accent)">\${tplAog?'🛑':'🔧'}</div><div><div class="lk-t">\${esc(wo.instanceId)}</div><div class="lk-v">\${esc(tpl ? tpl.description.slice(0,42) : wo.templateId)}</div></div><span class="lk-go">›</span></div>\`
    : "";
  return \`<div class="dw-head"><div class="dw-rail" style="background:\${c};box-shadow:0 0 14px \${c}"></div>
      <button class="dw-close" id="modal-close">✕</button>
      <div class="dw-eyebrow">▣ Stand · plataforma OVD</div>
      <div class="dw-title"><span class="reg">\${esc(simId)}</span><span class="type">\${stateLbl}</span></div>
      <div class="dw-sub"><span class="mc-state" style="color:\${c};border-color:\${c}55;background:\${c}1a"><span class="led" style="background:\${c}"></span>\${stateLbl}</span></div>
    </div>
    <div class="dw-body">
      <div class="dw-sec">Ocupación</div>
      \${occBlock}
      \${workBlock}
    </div>\`;
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
  // Handoff mapa (2026-06-01): ficha de stand
  if (detailStandId) {
    const html = renderStandDetailModal();
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
      <h4 style="margin-top:.8rem">Cronología</h4>\${woTimelineHtml(wo)}<h4 style="margin-top:.8rem;font-size:.8rem;color:var(--muted)">Resumen</h4>
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
    <div class="dw-sub">\${wo.scopeRevealed === false ? '🗣️ ' + esc(S.complaintForTemplate(tpl, S.DATA.ataChapters)) + ' <span style="color:var(--muted);font-size:.85em;font-style:normal">🔒 diagnóstico pendiente · se revela tras T-shoot</span>' : esc(tpl.description)}</div>
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
    // Cuadrillas: mandar una cuadrilla ENTERA de un golpe (oficial + helpers viajan juntos en su
    // furgo). Cubre tanto Operaciones como el click en el avión del mapa (misma ficha de WO).
    var crewsAvail = (game.crews||[]).filter(function(cr){ return cr.officerIds.length>0; });
    if (crewsAvail.length){
      inner += '<h4 style="margin-bottom:.3rem">🚐 Mandar cuadrilla</h4><div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem">';
      for (var ci=0; ci<crewsAvail.length; ci++){
        var cr = crewsAvail[ci];
        var crHex = '#' + (cr.color>>>0).toString(16).padStart(6,'0');
        inner += '<button data-assign-crew="'+cr.id+'" style="display:flex;align-items:center;gap:.4rem;padding:.3rem .6rem;border:1px solid var(--border);border-left:3px solid '+crHex+';border-radius:6px;background:var(--panel);cursor:pointer"><span style="width:10px;height:10px;border-radius:2px;background:'+crHex+';display:inline-block"></span>'+esc(cr.name)+' <span class="muted" style="font-size:.7rem">('+(cr.officerIds.length+cr.helperIds.length)+' pers)</span></button>';
      }
      inner += '</div><div class="muted" style="font-size:.75rem;margin-bottom:.6rem">…o asigna a mano:</div>';
    }
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
    body: "Las aerolíneas te pagan por mantener sus aviones operativos. Cuando uno aterriza con una avería, te llaman: tu plazo es <strong>hasta la hora de salida de ese avión</strong>. Cada avión trae la suya — un turnaround rápido te deja poco margen; uno que pernocta, mucho más.",
    why: "Es mantenimiento de LÍNEA: trabajas contra el horario real de cada vuelo. Saber cuánto margen tienes en cada aviso es la mitad del juego.",
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
    target: null, place: "center", showNext: true,
    onEnter: () => { if (activeTab !== "map") { activeTab = "map"; invalidatePanelCache(); } } },
  { phase: "El tiempo", title: "Control del reloj",
    body: "Aquí controlas la velocidad del juego. Ahora está en <strong>pausa</strong> (⏸). Puedes ir a 1×, 2× o 5×.",
    why: "Pausar te deja pensar sin prisa. Acelerar hace avanzar la jornada cuando no hay nada urgente.",
    target: ".speeds", place: "bottom", showNext: true },
  // ── Fase 2 · El bucle central ──
  // NOTA DISENO (2026-05-30): los pasos guiados por evento NO tienen showNext. Esperan
  // la condicion REAL del sim (cond). Para que no se atasque, al arrancar el reloj
  // activamos game.forceCalloutOnNextLanding y el proximo Vueling real aterriza con aviso
  // garantizado. Mientras espera, el campo allow permite tocar velocidad/modal sin avanzar.
  { phase: "Tu primera jornada", title: "Pon el reloj en marcha",
    body: "Pulsa <strong>1×</strong> para que empiece la jornada. Vueling tiene vuelos hoy; en cuanto uno aterrice con una incidencia, te avisarán.",
    why: "El tiempo solo corre cuando tú quieres. Empieza despacio para no perderte el primer aviso.",
    target: ".speeds button[data-speed=\\"1\\"]", place: "bottom",
    gate: ".speeds button[data-speed=\\"1\\"]",
    onEnter: () => { game.forceCalloutOnNextLanding = true; } },
  { phase: "Esperando el aviso", title: "Observa: está aterrizando tráfico",
    body: "Deja correr el reloj — puedes <strong>acelerar a 2× o 5×</strong> mientras esperas. En cuanto un Vueling aterrice con avería, saltará el aviso y seguimos.",
    why: "Un MRO de línea reacciona: el trabajo llega cuando el avión llega, no lo programas tú. Esta espera ES el juego real.",
    target: ".speeds", place: "bottom",
    allow: ".speeds",
    cond: (g) => activeCalloutExists(g),
    // Cuando el aviso aparece, pausar el reloj AL INSTANTE (antes del delay cosmético de
    // avance) para que no siga corriendo a 2×/5× mientras el bocadillo transiciona. El
    // tutorial toma el mando en el momento exacto de la incidencia.
    onMet: () => { S.setGameSpeed(game, 0); } },
  { phase: "¡Primer aviso!", title: "Tienes una incidencia",
    body: "Un avión ha aterrizado con una avería. He <strong>pausado el reloj</strong> para que decidas con calma. Fíjate: el botón <strong>🏭 Operaciones</strong> se ha marcado. Haz click en él.",
    why: "Operaciones es tu centro de control: ahí están todos los avisos y trabajos activos. Con el reloj en pausa, el tiempo no corre en tu contra mientras aprendes.",
    target: ".side button[data-tab=\\"operations\\"]", place: "right",
    // Pausar el reloj al saltar la incidencia: el tutorial manda aquí, sin micro-presión de tiempo.
    onEnter: () => { S.setGameSpeed(game, 0); },
    gate: ".side button[data-tab=\\"operations\\"]" },
  { phase: "La orden de trabajo", title: "Abre el aviso",
    body: "Haz click en la <strong>tarjeta del aviso</strong>. Verás qué falla (capítulo ATA), qué cualificación necesita el técnico y cuánto tarda.",
    why: "Cada avión y cada avería son distintos. Leer la orden te dice a quién asignar.",
    target: "[data-wo]", place: "right",
    // Mantener pausa + asegurar tab Operaciones para que exista la wo-card.
    onEnter: () => { S.setGameSpeed(game, 0); if (activeTab !== "operations") { activeTab = "operations"; invalidatePanelCache(); } },
    gate: "[data-wo]", cond: (g) => selectedWoId !== null },
  { phase: "Asignar", title: "Pon a un mecánico",
    body: "En el detalle, asigna un <strong>mecánico cualificado</strong> al trabajo. Irá al avión y empezará la reparación.",
    why: "Sin mecánico, la avería no se toca. Sigue en pausa: tómate tu tiempo para asignar bien.",
    target: "#modal-content", place: "left",
    // Mantener pausa mientras el jugador elige mecánico en el modal.
    onEnter: () => { S.setGameSpeed(game, 0); },
    allow: "#modal-content",
    cond: (g) => anyWoAssigned(g) },
  { phase: "En marcha", title: "Reanuda y observa el progreso",
    body: "El mecánico ya trabaja. El reloj sigue en pausa — pulsa <strong>5×</strong> para reanudarlo y verás avanzar la barra de progreso del trabajo.",
    why: "Acelerar el tiempo muerto es clave, pero vigila que termine ANTES de la hora de salida del avión.",
    target: ".speeds button[data-speed=\\"5\\"]", place: "bottom",
    allow: ".speeds",
    gate: ".speeds button[data-speed=\\"5\\"]" },
  { phase: "¡Cobrado!", title: "Has cerrado tu primer trabajo",
    body: "Trabajo completado a tiempo: has <strong>cobrado</strong> y tu reputación con Vueling sube. Míralo en tu balance (💰, arriba).",
    why: "Ese es el bucle completo: llega → arregla → despega. Repetirlo bien, jornada tras jornada, es ganar la partida.",
    target: "#bal", place: "bottom",
    allow: ".speeds",
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
        // onMet: efecto inmediato al cumplirse la condición (p.ej. pausar el reloj en
        // cuanto salta el aviso), ANTES del breve delay cosmético antes de avanzar.
        if (st.onMet) { try { st.onMet(); } catch(e){} }
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

// Fase B2 (brief maestro): pop-out del callout. Cuando aparece una WO nueva (callout sin asignar)
// salta un toast NO bloqueante con sintoma + matricula + ATA + stand + severidad, clicable al
// detalle, auto-cierre escalado por severidad (AOG/Critical mas grande y persistente, Minor sutil).
// Es la entrada al timeline: callout salta -> abres -> ves como evoluciona. Toggle en Ajustes.
// Concatenacion pura (sin template literals) para no chocar con el escaping de APP_JS.
let popoutSeenWoIds = null; // Set; null = primera pasada (sembrar sin disparar, evita avalancha al cargar)
function popoutToastRoot(){
  let r = document.getElementById("callout-toast-root");
  if (!r) { r = document.createElement("div"); r.id = "callout-toast-root"; document.body.appendChild(r); }
  return r;
}
function dismissCalloutToast(el){
  if (!el) return;
  el.classList.add("leaving");
  setTimeout(function(){ if (el && el.parentNode) el.parentNode.removeChild(el); }, 320);
}
function spawnCalloutToast(wo, tpl, ap){
  const root = popoutToastRoot();
  const sev = tpl && tpl.isAOG ? "aog" : (tpl ? tpl.severity : "Minor");
  const sevBig = sev === "aog" || sev === "Critical";
  const symptom = tpl ? S.complaintForTemplate(tpl, S.DATA.ataChapters) : (wo.templateId || "Callout");
  const reg = wo.airplaneRegistration || (ap && ap.registration) || "?";
  const ata = tpl ? ("ATA " + tpl.ata) : "";
  const stand = (ap && ap.standId) ? ("stand " + ap.standId) : "";
  const sevLbl = sev === "aog" ? "🛑 AOG" : sev;
  const el = document.createElement("div");
  el.className = "callout-toast sev-" + (sev === "aog" ? "aog" : sev) + (sevBig ? " big" : "");
  el.setAttribute("data-wo", wo.instanceId);
  const meta = [reg, ata, stand].filter(Boolean).join(" · ");
  el.innerHTML =
    '<div class="ct-rail"></div>' +
    '<button class="ct-x" data-ct-close="1" title="Cerrar">✕</button>' +
    '<div class="ct-eyebrow">📣 Nuevo aviso · ' + esc(sevLbl) + '</div>' +
    '<div class="ct-symptom">🗣️ ' + esc(symptom) + '</div>' +
    '<div class="ct-meta">' + esc(meta) + '</div>' +
    '<div class="ct-cta">Abrir ›</div>';
  root.appendChild(el);
  // Auto-cierre: AOG/Critical persisten mas (12s); Minor/Major sutiles (6s). reduce-motion no afecta.
  const ttl = sevBig ? 12000 : 6000;
  const timer = setTimeout(function(){ dismissCalloutToast(el); }, ttl);
  el.addEventListener("click", function(ev){
    clearTimeout(timer);
    if (ev.target && ev.target.getAttribute && ev.target.getAttribute("data-ct-close")) { dismissCalloutToast(el); return; }
    selectedWoId = wo.instanceId; manualCertId = ""; manualHelperIds = []; detailFlightId = null;
    dismissCalloutToast(el);
    render();
  });
}
function maybePopoutCallouts(){
  try {
    if (!game || !game.workOrders) return;
    // WOs "callout vivo": sin asignar y en fase temprana (ToPlane/Inspection), no cerradas.
    const live = game.workOrders.filter(function(w){
      return w.assignedMechanicIds && w.assignedMechanicIds.length === 0 &&
             (w.phase === "ToPlane" || w.phase === "Inspection");
    });
    if (popoutSeenWoIds === null) { // primera pasada: sembrar lo existente sin disparar toasts
      popoutSeenWoIds = new Set(game.workOrders.map(function(w){ return w.instanceId; }));
      return;
    }
    if (!gameSettings.callout_popup) { // toggle off: marcar como vistos para no acumular
      for (const w of live) popoutSeenWoIds.add(w.instanceId);
      return;
    }
    let shown = 0;
    for (const w of live) {
      if (popoutSeenWoIds.has(w.instanceId)) continue;
      popoutSeenWoIds.add(w.instanceId);
      if (shown >= 3) continue; // no avalanchar: max 3 toasts por pasada (resto ya en el feed)
      const tpl = game.templates.find(function(t){ return t.id === w.templateId; })
        || (game.dailyCheckTemplates && game.dailyCheckTemplates.find && game.dailyCheckTemplates.find(function(t){ return t.id === w.templateId; }));
      const ap = airplaneByInstance(w.airplaneInstanceId);
      if (!tpl || !ap) continue;
      spawnCalloutToast(w, tpl, ap);
      shown++;
    }
    // Poda del set para que no crezca sin limite (mantener solo las vivas + un margen).
    if (popoutSeenWoIds.size > 400) {
      const keep = new Set(game.workOrders.map(function(w){ return w.instanceId; }));
      popoutSeenWoIds = keep;
    }
  } catch(e) { /* nunca romper el render por el toast */ }
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
  // Game Over post-mortem (2026-05-30): overlay full-screen por encima de todo. Solo si la
  // partida ha terminado Y no hay wizard activo (el wizard manda si el jugador fue al menú).
  let goOverlay = document.getElementById("gameover-overlay-root");
  if (!goOverlay) { goOverlay = document.createElement("div"); goOverlay.id = "gameover-overlay-root"; document.body.appendChild(goOverlay); }
  goOverlay.innerHTML = (game.gameOver && game.gameOver.isOver && newGameStep === null) ? renderGameOver() : "";
  // Cierre Semanal (2026-05-30): overlay modal si hay datos de cierre pendientes y no hay
  // wizard ni game over por encima.
  let wcOverlay = document.getElementById("weekly-close-overlay-root");
  if (!wcOverlay) { wcOverlay = document.createElement("div"); wcOverlay.id = "weekly-close-overlay-root"; document.body.appendChild(wcOverlay); }
  wcOverlay.innerHTML = (weeklyCloseData && newGameStep === null && !(game.gameOver && game.gameOver.isOver)) ? renderWeeklyClose() : "";
  // Hito (2026-05-30): overlay de milestone si hay datos y nada por encima.
  let msOverlay = document.getElementById("milestone-overlay-root");
  if (!msOverlay) { msOverlay = document.createElement("div"); msOverlay.id = "milestone-overlay-root"; document.body.appendChild(msOverlay); }
  msOverlay.innerHTML = (milestoneData && newGameStep === null && !(game.gameOver && game.gameOver.isOver) && !weeklyCloseData) ? renderMilestone() : "";
  // Menú de pausa in-game (guardar / volver al menú). Por encima del juego, por debajo del wizard.
  let pmOverlay = document.getElementById("pause-menu-overlay-root");
  if (!pmOverlay) { pmOverlay = document.createElement("div"); pmOverlay.id = "pause-menu-overlay-root"; document.body.appendChild(pmOverlay); }
  pmOverlay.innerHTML = (pauseMenuOpen && newGameStep === null && !(game.gameOver && game.gameOver.isOver)) ? renderPauseMenu() : "";
  // Popup de evento (callout/AOG/resolución…). Por encima del juego, debajo de wizard/pausa.
  let evOverlay = document.getElementById("event-overlay-root");
  if (!evOverlay) { evOverlay = document.createElement("div"); evOverlay.id = "event-overlay-root"; document.body.appendChild(evOverlay); }
  evOverlay.innerHTML = (eventQueue.length && newGameStep === null && !pauseMenuOpen && !(game.gameOver && game.gameOver.isOver) && !weeklyCloseData && !milestoneData) ? renderEventPopup(eventQueue[0]) : "";
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

  document.querySelectorAll(".side button[data-tab]").forEach(b => {
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
  // Fase B2 (brief maestro): jerarquía del log por importancia + agrupación de ruido.
  // El ámbar se RESERVA para avisos reales (late/penalty/riesgo); el ruido (salidas con retraso
  // leve, autosave) se agrupa en una línea apagada. Clasificación por type + patrón de texto.
  // Concatenación pura (sin template literals) para no chocar con el escaping de APP_JS.
  const classifyNotif = (n) => {
    const txt = n.text || "";
    if (txt.indexOf("Guardado autom") >= 0) return "noise";
    if (txt.indexOf("salió con") >= 0 && txt.indexOf("retraso") >= 0) return "noise";
    if (txt.indexOf("Stand libre") >= 0) return "noise";
    if (n.type === "danger") return "crit";
    if (txt.indexOf("quiere") >= 0 || txt.indexOf("oferta") >= 0 || txt.indexOf("contratar") >= 0) return "callout";
    if (n.type === "success") return "positive";
    if (n.type === "warning") return "warn";
    return "info";
  };
  let notifsHtml;
  if (notifs.length === 0) { notifsHtml = '<p class="muted">—</p>'; }
  else {
    const parts = [];
    let i = 0;
    while (i < notifs.length) {
      const tier = classifyNotif(notifs[i]);
      if (tier === "noise") {
        let j = i, cnt = 0;
        while (j < notifs.length && classifyNotif(notifs[j]) === "noise") { cnt++; j++; }
        if (cnt === 1) {
          parts.push('<div class="notif t-noise"><span class="t">' + fmtClock(notifs[i].minute) + '</span><span>' + esc(notifs[i].text) + '</span></div>');
        } else {
          parts.push('<div class="notif t-noise grouped"><span class="t">' + fmtClock(notifs[j - 1].minute) + '</span><span>▾ ' + cnt + ' eventos menores · retrasos leves / autosave</span></div>');
        }
        i = j;
      } else {
        parts.push('<div class="notif t-' + tier + '"><span class="t">' + fmtClock(notifs[i].minute) + '</span><span>' + esc(notifs[i].text) + '</span></div>');
        i++;
      }
    }
    notifsHtml = parts.join("");
  }
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
  // Fase B2: tras reconstruir paneles, evaluar si saltan pop-outs de callouts nuevos.
  maybePopoutCallouts();
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
    // Click correcto sobre el gate: dejar que el handler normal haga la acción.
    // Si el paso TAMBIÉN tiene cond (espera evento del sim), NO avanzamos por el click —
    // dejamos que la condición lo haga (p.ej. abrir el aviso → selectedWoId !== null).
    // Si NO tiene cond, el click ES el criterio de avance.
    if (!st.cond) setTimeout(() => { if (tutActive && tutCur() === st) tutAdvance(); }, 60);
    return;
  }
  // El campo allow lista elementos con los que el usuario PUEDE interactuar durante la
  // espera de un evento (p.ej. botones de velocidad, o el modal para asignar) sin que se
  // considere click prohibido ni avance el paso. El avance lo da cond cuando el sim cumple.
  const allowEl = st && st.allow ? (e.target.closest && e.target.closest(st.allow)) : null;
  if (allowEl) return; // permitir el click; el handler normal lo procesa
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
  // closest() (no e.target.id): al clicar el icono SVG el target es el <path>, no el <button>.
  if (e.target.closest("#btn-save")) { doSave(); return; }
  if (e.target.closest("#btn-load")) { doLoad(); return; }
  if (e.target.closest("#btn-new"))  { doNewGame(); return; }
  // Menú de pausa in-game
  if (e.target.closest("#btn-menu")) { pauseMenuOpen = true; pmPrevSpeed = game.clock.speed; S.setGameSpeed(game, 0); invalidatePanelCache(); render(); return; }
  // Popups de evento: Entendido pasa al siguiente; "No mostrar este tipo" lo silencia (persistido).
  if (e.target.closest("#ev-ok")) { eventQueue.shift(); evCamDone = false; pumpEvents(); render(); return; }
  if (e.target.closest("#ev-skip")) { var _evc = eventQueue[0]; if (_evc) { eventSkip[_evc.type] = true; saveEventSkip(); eventQueue = eventQueue.filter(function(x){ return x.type !== _evc.type; }); } evCamDone = false; pumpEvents(); render(); return; }
  if (e.target.closest("#pm-resume")) { pauseMenuOpen = false; if (pmPrevSpeed) S.setGameSpeed(game, pmPrevSpeed); render(); return; }
  if (e.target.closest("#pm-save"))   { doSave(); return; }
  if (e.target.closest("#pm-save-quit")) {
    (async () => {
      try { await S.getStorage().save(S.serializeGame(game)); hasSavedSlot = true; }
      catch (err) { alert("Error al guardar: " + err.message); return; }
      pauseMenuOpen = false; newGameStep = "intro"; saveIndicator = ""; render();
    })();
    return;
  }
  if (e.target.closest("#pm-quit")) {
    if (!confirm("¿Volver al menú principal sin guardar? Se perderá el progreso desde el último guardado.")) return;
    pauseMenuOpen = false; newGameStep = "intro"; render(); return;
  }
  // Pivot iteración 2026-05-25 — New Game wizard handlers
  // Intro step
  if (e.target.closest("#ng-start")) { newGameStep = "airport"; render(); return; }
  // Ajustes (handoff entrega-menu 3): abrir / volver / reset + categorías + controles.
  if (e.target.closest("#ng-settings")) { newGameStep = "settings"; settingsCat = "audio"; render(); return; }
  // Cómo se juega (handoff entrega-menu 3): abrir, navegar 4 pasos, volver / nueva partida.
  if (e.target.closest("#ng-howto")) { newGameStep = "howto"; howtoStep = 0; render(); return; }
  if (e.target.closest("#ng-howto-back")) { newGameStep = "intro"; render(); return; }
  if (e.target.closest("#ng-howto-prev")) { howtoStep = Math.max(0, howtoStep - 1); render(); return; }
  if (e.target.closest("#ng-howto-next")) { if (howtoStep >= 3) { newGameStep = "airport"; } else { howtoStep += 1; } render(); return; }
  const htStep = e.target.closest("[data-howto-step]");
  if (htStep) { howtoStep = parseInt(htStep.dataset.howtoStep, 10) || 0; render(); return; }
  if (e.target.closest("#ng-catalog")) { newGameStep = "catalog"; catalogTab = "aircraft"; render(); return; }
  if (e.target.closest("#ng-catalog-back")) { newGameStep = "intro"; render(); return; }
  var catTabBtn = e.target.closest("[data-cat-tab]");
  if (catTabBtn) { catalogTab = catTabBtn.dataset.catTab; render(); return; }
  var catAtaBtn = e.target.closest("[data-cat-ata]");
  if (catAtaBtn) { var aId = catAtaBtn.dataset.catAta; catAtaOpen[aId] = !catAtaOpen[aId]; render(); return; }
  if (e.target.closest("#ng-settings-back")) { newGameStep = "intro"; render(); return; }
  if (e.target.closest("#ng-settings-reset")) { gameSettings = { ...SETTINGS_DEFAULTS }; saveSettings(); render(); return; }
  const setCat = e.target.closest("[data-set-cat]");
  if (setCat) { settingsCat = setCat.dataset.setCat; render(); return; }
  const setToggle = e.target.closest("[data-set-toggle]");
  if (setToggle) { const k = setToggle.dataset.setToggle; gameSettings[k] = !gameSettings[k]; saveSettings(); render(); return; }
  const setSegBtn = e.target.closest("[data-set-seg] button");
  if (setSegBtn) { const seg = setSegBtn.closest("[data-set-seg]"); gameSettings[seg.dataset.setSeg] = parseInt(setSegBtn.dataset.i, 10); saveSettings(); render(); return; }
  // Game Over post-mortem (2026-05-30): Reintentar abre selección de aeropuerto; Menú vuelve
  // al menú principal. La partida nueva (startGameFromPreset) limpia game.gameOver.isOver.
  if (e.target.closest("#go-retry")) { newGameStep = "airport"; render(); return; }
  if (e.target.closest("#go-menu")) { newGameStep = "intro"; render(); return; }
  // Cierre Semanal: continuar cierra el modal y reanuda el reloj a 1×.
  if (e.target.closest("#wc-continue")) { weeklyCloseData = null; S.setGameSpeed(game, 1); render(); return; }
  // Hito: continuar cierra el modal y reanuda el reloj a 1×.
  if (e.target.closest("#ms-continue")) { milestoneData = null; S.setGameSpeed(game, 1); render(); return; }
  if (e.target.closest("#ng-continue, #ng-continue-card")) { doContinueFromIntro(); return; }
  if (e.target.closest("#ng-clear-save")) {
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
  if (ngPreset) { const L = document.getElementById("foh-loader"); if (L) L.classList.add("on"); startGameFromPreset(ngPreset.dataset.newgamePreset); return; }
  if (e.target.closest("#ng-back")) { newGameStep = "airport"; render(); return; }
  if (e.target.closest("#ng-back-menu")) { newGameStep = "intro"; render(); return; }
  if (e.target.closest("#ng-exit")) { try { const T = window.__TAURI__; if (T && T.window) { (T.window.getCurrentWindow ? T.window.getCurrentWindow() : T.window.appWindow).close(); } else if (T && T.process && T.process.exit) { T.process.exit(0); } } catch (err) {} return; }
  if (e.target.closest("#btn-age-fleet")) { ageFleet(); return; }
  if (e.target.closest("#btn-autopause")) { game.autoPauseEnabled = !game.autoPauseEnabled; render(); return; }
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
  // Controles de zoom del mapa F5D → delegan en la cámara Pixi (no re-render: la cámara
  // repinta su propio canvas; mapDriver vive en module scope y persiste entre renders).
  const mapZoomBtn = e.target.closest("[data-map-zoom]");
  if (mapZoomBtn) {
    if (mapDriver) { if (mapZoomBtn.dataset.mapZoom === "in") mapDriver.zoomIn(); else mapDriver.zoomOut(); }
    return;
  }
  if (e.target.closest("[data-map-fit]")) { if (mapDriver) mapDriver.fitAll(); return; }
  const speedBtn = e.target.closest(".speeds button");
  if (speedBtn) { S.setGameSpeed(game, parseInt(speedBtn.dataset.speed)); render(); return; }
  const tabBtn = e.target.closest(".side button[data-tab]");
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
    detailStandId = null;
    invalidateModalCache();
    render();
    return;
  }
  const crewBtn = e.target.closest && e.target.closest("[data-assign-crew]");
  if (crewBtn && selectedWoId) {
    const r = S.assignCrewToWo(game, selectedWoId, crewBtn.dataset.assignCrew);
    if (r.ok) { selectedWoId = null; invalidatePanelCache(); render(); }
    else alert("No se puede mandar la cuadrilla: " + (r.error ?? "razón desconocida"));
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
  if (e.target.dataset.crewNew) {
    const rc = S.createCrew(game.crews); game.crews = rc.crews;
    invalidatePanelCache(); render(); return;
  }
  if (e.target.dataset.crewDelete) {
    game.crews = S.deleteCrew(game.crews, e.target.dataset.crewDelete);
    invalidatePanelCache(); render(); return;
  }
  if (e.target.dataset.crewRemove) {
    const prt = e.target.dataset.crewRemove.split(":");
    game.crews = S.removeCrewMember(game.crews, prt[0], prt[1]);
    invalidatePanelCache(); render(); return;
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
  if (e.target.dataset.crewAdd) {
    const mid = e.target.value;
    if (mid) {
      const pa = e.target.dataset.crewAdd.split(":");
      const ra = S.addCrewMember(game.crews, game.mechanics, pa[0], mid, pa[1]);
      if (ra.error) alert(ra.error); else game.crews = ra.crews;
      invalidatePanelCache(); render();
    }
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

// === Detección de eventos para popups (Dani 2026-06-06) ===
function focusMapOnStand(standId, tries){
  var norm = EV_STAND_NORM[standId] || [0.52, 0.6];
  if (mapDriver && mapDriver.app) { focusMapOnNorm(norm[0], norm[1], 2.6); return; }
  if ((tries || 0) < 12) setTimeout(function(){ focusMapOnStand(standId, (tries || 0) + 1); }, 80);
}
function detectEvents(){
  var aps = game.airplanes;
  var apById = new Map(aps.map(function(a){ return [a.instanceId, a]; }));
  var woNonDC = game.workOrders.filter(function(w){ return !String(w.templateId || "").startsWith("DC-"); });
  if (evWoIds === null){ // primer tick: solo inicializa trackers (no dispara eventos retro)
    evWoIds = new Set(woNonDC.map(function(w){ return w.instanceId; }));
    evAog = new Set(aps.filter(function(a){ return a.aogEscalated; }).map(function(a){ return a.instanceId; }));
    evDeparted = new Set(aps.filter(function(a){ return a.actualDepartureMinute !== undefined; }).map(function(a){ return a.instanceId; }));
    return;
  }
  var enq = function(ev){ if (!eventSkip[ev.type]) eventQueue.push(ev); };
  var alName = function(cid){ var c = game.contracts.find(function(k){ return k.id === cid; }); var al = c && game.airlines.find(function(a){ return a.id === c.airlineId; }); return al ? al.name : "—"; };
  var hh = function(m){ var mod = ((Math.floor(m) % 1440) + 1440) % 1440; return String(Math.floor(mod / 60)).padStart(2, "0") + ":" + String(mod % 60).padStart(2, "0"); };
  var openWO = function(apId){ return woNonDC.some(function(w){ return w.airplaneInstanceId === apId && w.phase !== "Completed" && w.phase !== "Failed"; }); };
  for (var i = 0; i < woNonDC.length; i++){
    var w = woNonDC[i];
    if (evWoIds.has(w.instanceId)) continue;
    var ap = apById.get(w.airplaneInstanceId);
    var tpl = game.templates.find(function(t){ return t.id === w.templateId; });
    var reg = ap ? ap.registration : (w.airplaneRegistration || "?");
    var base = ["Matrícula: " + reg + (ap ? " · " + ap.model + "/" + ap.engineVariant : ""), "Aerolínea: " + (ap ? alName(ap.contractId) : "—"), "Stand: " + (ap && ap.standId ? ap.standId : "—"), "Síntoma: " + String((tpl && tpl.description) || w.templateId).slice(0, 140)];
    if (tpl && tpl.isAOG){
      enq({ type: "aog", icon: "🛑", color: "#ff4757", title: "AOG · avión en tierra", standId: ap && ap.standId, lines: base.concat(["Severidad: AOG (no diferible) — penaliza fuerte si se retrasa", "Acción: asigna una cuadrilla YA"]) });
    } else {
      enq({ type: "callout", icon: "🔧", color: "#f5b945", title: "Callout · nueva avería", standId: ap && ap.standId, lines: base.concat([tpl ? ("Severidad: " + (tpl.severity || "normal")) : "", w.slaMinute ? ("Límite (SLA): " + hh(w.slaMinute)) : ""].filter(Boolean)) });
    }
  }
  for (var j = 0; j < aps.length; j++){
    var a = aps[j];
    if (a.aogEscalated && !evAog.has(a.instanceId)){
      var evit = openWO(a.instanceId);
      enq({ type: evit ? "aog-evitable" : "aog", icon: evit ? "⛔" : "🛑", color: "#ff4757",
        title: evit ? "AOG EVITABLE · por tu gestión" : "AOG · escalado por retraso", standId: a.standId,
        lines: ["Matrícula: " + a.registration + " · " + a.model, "Aerolínea: " + alName(a.contractId), "Stand: " + (a.standId || "—"),
          "Retraso: " + (a.delayMinutes != null ? a.delayMinutes + " min" : "≥ " + (S.AOG_DELAY_THRESHOLD_MIN || 180) + " min"),
          evit ? "Causa: avería tuya sin resolver a tiempo → penalty agravado" : "Causa: externa (no imputable a tu MRO)",
          "Penalty AOG: -" + (S.AOG_ESCALATION_PENALTY_EUR || 90000).toLocaleString("es-ES") + " €"] });
    }
  }
  for (var k = 0; k < aps.length; k++){
    var d = aps[k];
    if (d.actualDepartureMinute !== undefined && !evDeparted.has(d.instanceId)){
      var delay = d.delayMinutes || 0;
      if (d.aogEscalated){
        enq({ type: "aog-release", icon: "✅", color: "#3fb950", title: "Release · AOG despachado", standId: d.standId, lines: ["Matrícula: " + d.registration + " · " + d.model, "Aerolínea: " + alName(d.contractId), "Salió con " + delay + " min de retraso", "El avión vuelve a volar."] });
      } else if (delay > 0){
        enq({ type: "resolve-late", icon: "🕒", color: "#d29922", title: "Despacho con retraso", standId: d.standId, lines: ["Matrícula: " + d.registration, "Aerolínea: " + alName(d.contractId), "Retraso: " + delay + " min" + (delay >= 15 ? " (cuenta contra tu KPI)" : " (<15 min, no penaliza)")] });
      } else {
        enq({ type: "resolve-ontime", icon: "🟢", color: "#3fb950", title: "Despacho puntual", standId: d.standId, lines: ["Matrícula: " + d.registration, "Aerolínea: " + alName(d.contractId), "A tiempo ✓ — dispatch fiable"] });
      }
    }
  }
  evWoIds = new Set(woNonDC.map(function(w){ return w.instanceId; }));
  evAog = new Set(aps.filter(function(a){ return a.aogEscalated; }).map(function(a){ return a.instanceId; }));
  evDeparted = new Set(aps.filter(function(a){ return a.actualDepartureMinute !== undefined; }).map(function(a){ return a.instanceId; }));
}
function pumpEvents(){
  if (!eventQueue.length){
    if (evPrevSpeed !== -1){ var sp = evPrevSpeed; evPrevSpeed = -1; if (sp > 0) S.setGameSpeed(game, sp); }
    return;
  }
  if (evPrevSpeed === -1){ evPrevSpeed = game.clock.speed; S.setGameSpeed(game, 0); }
  if (!evCamDone){
    evCamDone = true;
    if (activeTab !== "map"){ activeTab = "map"; invalidatePanelCache(); }
    focusMapOnStand(eventQueue[0] && eventQueue[0].standId);
  }
}
function renderEventPopup(ev){
  if (!ev) return "";
  var lines = ev.lines.map(function(l){ return '<li style="margin:.18rem 0">' + l + '</li>'; }).join("");
  var h = '<div style="position:fixed;inset:0;background:rgba(6,10,18,.42);z-index:1100;display:flex;align-items:flex-start;justify-content:center;pointer-events:none">';
  h += '<div style="margin-top:13vh;width:min(430px,92vw);background:linear-gradient(180deg,rgba(27,35,48,.98),rgba(18,23,32,.98));border:1px solid var(--border-strong);border-left:5px solid ' + ev.color + ';border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.6);padding:1rem 1.1rem;pointer-events:auto">';
  h += '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem"><span style="font-size:1.6rem">' + ev.icon + '</span><strong style="font-size:1.08rem;color:' + ev.color + '">' + ev.title + '</strong></div>';
  h += '<ul style="margin:.2rem 0 .85rem;padding-left:1.1rem;font-size:.88rem;line-height:1.4">' + lines + '</ul>';
  if (eventQueue.length > 1) h += '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.5rem">+' + (eventQueue.length - 1) + ' evento(s) en cola</div>';
  h += '<div style="display:flex;gap:.5rem;justify-content:space-between;align-items:center">';
  h += '<button id="ev-skip" style="padding:.4rem .7rem;border:1px solid var(--border);border-radius:7px;background:transparent;color:var(--muted);cursor:pointer;font-size:.78rem" title="No volver a mostrar este tipo de evento">🔕 No mostrar este tipo</button>';
  h += '<button id="ev-ok" class="primary" style="padding:.45rem 1.1rem;border-radius:7px;cursor:pointer">Entendido</button>';
  h += '</div></div></div>';
  return h;
}

/** Menú de pausa in-game (estándar): Reanudar · Guardar · Guardar y volver al menú · Volver sin
 *  guardar. Overlay modal. Escrito con concatenación (no template literals) para el APP_JS. */
function renderPauseMenu(){
  var pmBtn = function(id, icon, label, sub, accent){
    return '<button id="'+id+'" style="display:flex;align-items:center;gap:.7rem;width:100%;text-align:left;padding:.65rem .9rem;margin-bottom:.5rem;border:1px solid var(--border);border-radius:8px;background:'+(accent?'var(--accent)':'var(--panel)')+';color:'+(accent?'#fff':'var(--text)')+';cursor:pointer">'
      + '<span style="font-size:1.2rem;width:1.5rem;text-align:center">'+icon+'</span>'
      + '<span style="display:flex;flex-direction:column;line-height:1.2"><strong>'+label+'</strong>'+(sub?'<span style="font-size:.74rem;opacity:.75">'+sub+'</span>':'')+'</span></button>';
  };
  var h = '<div id="pm-backdrop" style="position:fixed;inset:0;background:rgba(6,10,18,.78);z-index:1000;display:flex;align-items:center;justify-content:center">';
  h += '<div style="width:min(380px,92vw);background:linear-gradient(180deg,rgba(27,35,48,.98),rgba(18,23,32,.98));border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);padding:1.2rem 1.2rem 1rem">';
  h += '<h2 style="margin:0 0 .15rem;font-size:1.25rem">⏸ Pausa</h2>';
  h += '<p style="margin:0 0 1rem;font-size:.8rem;opacity:.7">Día '+S.getDay(game.clock.minute)+' · '+S.formatClock(game.clock.minute).split("· ")[1]+' · '+game.economy.balance.toLocaleString("es-ES")+' €</p>';
  h += pmBtn('pm-resume','▶','Reanudar','Volver al juego', true);
  h += pmBtn('pm-save','💾','Guardar partida', saveIndicator==='saved'?'✓ Guardado':'Sobrescribe tu guardado', false);
  h += pmBtn('pm-save-quit','🏠','Guardar y volver al menú','Guarda y sale al menú principal', false);
  h += pmBtn('pm-quit','🚪','Volver al menú sin guardar','Descarta lo no guardado', false);
  h += '</div></div>';
  return h;
}

/** Renderiza overlay wizard New Game (full-screen, front-of-house responsive 2026-05-30). */
function renderNewGameWizard() {
  if (newGameStep === null) return "";
  const catalog = newGameCatalog ?? S.DATA.airportCatalog;
  // Fondo atmosférico compartido (CSS/SVG puro, sin assets). deep = scrim más opaco para
  // pantallas con cartas.
  const bg = (deep) => \`<div class="foh-bg"></div><div class="foh-gridbg"></div><svg class="foh-svg" viewBox="0 0 1280 300" preserveAspectRatio="none" aria-hidden="true"><g opacity="0.6"><rect x="120" y="60" width="1010" height="34" fill="none" stroke="#2f3a4f"/><line x1="140" y1="77" x2="1110" y2="77" stroke="#3d4a63" stroke-width="1.6" stroke-dasharray="20 16"/><line x1="124" y1="60" x2="124" y2="94" stroke="#46d08a" stroke-width="2" opacity="0.7"/><line x1="1126" y1="60" x2="1126" y2="94" stroke="#46d08a" stroke-width="2" opacity="0.7"/><text x="150" y="82" fill="#5d6677" font-family="JetBrains Mono,monospace" font-size="13">11</text><text x="1098" y="82" fill="#5d6677" font-family="JetBrains Mono,monospace" font-size="13" text-anchor="end">29</text></g><line x1="150" y1="150" x2="1108" y2="150" stroke="#283041" stroke-width="1" stroke-dasharray="14 12" opacity="0.6"/></svg><div class="foh-radar"><div class="ring"></div><div class="ring r2"></div><div class="ring r3"></div><div class="ring r4"></div><div class="sweep"></div></div><div class="foh-blip" style="left:64%;top:30%"></div><div class="foh-scrim\${deep ? " deep" : ""}"></div><div class="foh-scan"></div>\`;
  let body = "";
  if (newGameStep === "intro") {
    const isTauri = typeof window !== "undefined" && !!window.__TAURI__;
    const continueItem = hasSavedSlot
      ? \`<div class="foh-mi" id="ng-continue"><span class="idx">02</span><span class="label">Continuar partida</span><span class="hint">Reanudar</span><span class="arrow"></span></div>\`
      : \`<div class="foh-mi disabled"><span class="idx">02</span><span class="label">Continuar partida</span><span class="hint">Sin guardado</span></div>\`;
    const exitItem = isTauri ? \`<div class="foh-mi danger" id="ng-exit"><span class="idx">05</span><span class="label">Salir</span><span class="arrow"></span></div>\` : "";
    const clearItem = hasSavedSlot ? \`<div class="foh-mi danger" id="ng-clear-save"><span class="idx">\${isTauri ? "06" : "05"}</span><span class="label">Borrar guardado</span><span class="arrow"></span></div>\` : "";
    const saveCard = hasSavedSlot ? \`<a class="foh-savecard" id="ng-continue-card"><div class="foh-sc-head"><span>💾 Partida guardada</span></div><div class="foh-sc-body"><div class="foh-sc-icao">▶<span class="x"> reanudar</span></div><div class="foh-sc-name">Tu partida guardada</div></div><div class="foh-sc-cta"><span>Continuar partida</span><span class="foh-ar"></span></div></a>\` : "";
    body = \`<div class="foh-mover"><span class="trail"></span></div><div class="foh-screen"><div class="foh-top"><div class="foh-id"><span class="foh-mark"></span> MRO · Centro de control</div><div class="foh-livetag"><span class="d"></span> Sistema en línea · v0.6</div></div><div class="foh-menubody"><div class="foh-hero"><div class="foh-eyebrow">Aviation Maintenance · Repair · Overhaul</div><div class="foh-lockup"><div class="foh-bigmark"><i></i></div><h1 class="foh-wordmark">MRO<br><span class="t">TYCOON</span></h1></div><div class="foh-subline">Tú diriges el taller. Cada Work Order es real.</div><nav class="foh-nav" id="foh-menu"><div class="foh-mi primary sel" id="ng-start"><span class="idx">01</span><span class="label">Nueva partida</span><span class="hint">Elegir base</span><span class="arrow"></span></div>\${continueItem}<div class="foh-mi" id="ng-settings"><span class="idx">03</span><span class="label">Ajustes</span><span class="hint">Audio · juego · A11y</span><span class="arrow"></span></div><div class="foh-mi" id="ng-howto"><span class="idx">04</span><span class="label">Cómo se juega</span><span class="hint">Manual · 4 pasos</span><span class="arrow"></span></div><div class="foh-mi" id="ng-catalog"><span class="idx">05</span><span class="label">Catálogo</span><span class="hint">Todo el contenido del juego</span><span class="arrow"></span></div>\${exitItem}\${clearItem}</nav></div>\${saveCard}</div><div class="foh-foot"><div class="chip"><span class="sq"></span> v0.6 · línea pura · datos reales AeroDataBox · mayo 2026</div><div class="right"><span>SINGLE-PLAYER · OFFLINE</span></div></div></div>\`;
  } else if (newGameStep === "airport") {
    const avail = catalog.airports.filter(a => a.available !== false);
    const availCount = avail.length;
    const featIcao = avail.length ? avail.reduce((a, b) => (a.difficultyOverall <= b.difficultyOverall ? a : b)).icao : null;
    let cards = "";
    for (const ap of catalog.airports) {
      const isAvail = ap.available !== false;
      const stars = "★".repeat(ap.difficultyOverall) + "☆".repeat(Math.max(0, 5 - ap.difficultyOverall));
      if (!isAvail) {
        cards += \`<div class="foh-lcard" title="\${esc(ap.comingSoonReason ?? "Próximamente")}"><h3>\${esc(ap.name)}</h3><div class="code">\${ap.icao} / \${ap.iata} · \${ap.country}</div><div class="lock">⏳ \${esc(ap.comingSoonReason ?? "Próximamente")}</div></div>\`;
        continue;
      }
      const isFeat = ap.icao === featIcao;
      const opCount = ap.operators.filter(o => o.available).length;
      const model = ap.operators[0]?.metrics?.model ?? "A320";
      cards += \`<a class="foh-apcard\${isFeat ? " feat" : ""}" data-newgame-airport="\${ap.icao}">\${isFeat ? '<span class="ribbon">Recomendado</span>' : ""}<div class="ah"><h2>\${esc(ap.name)}</h2><div class="code">\${ap.icao} / \${ap.iata} · \${esc(ap.city)}</div><div class="stars">\${stars}</div></div><div class="desc">\${esc(ap.shortDesc)}</div><div class="metrics"><div class="m"><div class="k">Operadores</div><div class="v">\${opCount} <span class="u">contrat.</span></div></div><div class="m"><div class="k">Flota base</div><div class="v" style="font-size:13px">\${esc(model)}</div></div><div class="m"><div class="k">Dificultad</div><div class="v">\${ap.difficultyOverall}<span class="u">/5</span></div></div></div><div class="acta"><span class="note">LAYOUT OSM REAL · 2026</span><span class="foh-btn primary" style="pointer-events:none">Seleccionar <span class="foh-ar"></span></span></div></a>\`;
    }
    body = \`<div class="foh-screen"><div class="foh-top"><div class="foh-id"><span class="foh-mark"></span> Nueva partida</div><div class="foh-steprail"><span class="s on"><span class="n">1</span> Aeropuerto</span><span class="bar"></span><span class="s"><span class="n">2</span> Operador</span></div></div><div class="foh-head"><div class="foh-eyebrow">Paso 1 de 2 · Base de operaciones</div><h1>Elige tu <span class="t">base</span></h1><p class="sub">Cada aeropuerto trae layout OSM real, schedule de AeroDataBox y operadores físicos saneados. Empieza pequeño: el resto se irá activando.</p></div><div class="foh-cards">\${cards}</div><div class="foh-foot"><span class="foh-btn back ghost" id="ng-back-menu"><span class="foh-ar"></span> Menú principal</span><div class="right"><span>\${availCount} / \${catalog.airports.length} AEROPUERTOS DISPONIBLES</span></div></div></div>\`;
  } else if (newGameStep === "operator") {
    const ap = catalog.airports.find(a => a.icao === newGameSelectedIcao);
    if (!ap) { newGameStep = "airport"; return renderNewGameWizard(); }
    const availOps = ap.operators.filter(o => o.available);
    const recPreset = availOps.length ? availOps.reduce((a, b) => (a.difficulty <= b.difficulty ? a : b)).presetFile : null;
    let cards = "";
    for (const op of ap.operators) {
      const stars = "★".repeat(op.difficulty) + "☆".repeat(Math.max(0, 5 - op.difficulty));
      const dis = !op.available;
      const isRec = op.presetFile === recPreset;
      cards += \`<div class="foh-op\${dis ? " dis" : ""}\${isRec ? " rec" : ""}" style="--oc:\${op.color}" \${op.available ? \`data-newgame-preset="\${op.presetFile}"\` : ""} \${dis ? \`title="\${esc(op.comingSoonReason ?? "Próximamente")}"\` : ""}><div class="topbar"></div><div class="oh"><div class="nm"><h2>\${esc(op.operatorName)}</h2><span class="iata">\${esc(op.operatorIata)}</span></div><div class="diff"><span class="stars" style="color:\${op.color}">\${stars}</span><span class="lbl">\${esc(op.difficultyLabel)}</span></div></div><div class="shortline">\${esc(op.shortLine)}</div><div class="tagline">"\${esc(op.tagline)}"</div><div class="ometrics"><div class="row"><span class="k">Movimientos / sem</span><span class="v">\${op.metrics.movsPerWeek}</span></div><div class="row"><span class="k">Pernoctas / sem</span><span class="v">\${op.metrics.overnightsPerWeek}</span></div><div class="row"><span class="k">Modelo</span><span class="v">\${esc(op.metrics.model)}</span></div><div class="row"><span class="k">Balance inicial</span><span class="v" style="color:var(--success)">\${op.metrics.balance.toLocaleString("es-ES")} €</span></div><div class="row"><span class="k">Mecánicos</span><span class="v">\${esc(op.metrics.mechs)}</span></div></div><div class="octa">\${op.available ? \`<span class="foh-btn" style="pointer-events:none">Empezar con \${esc(op.operatorName)} <span class="foh-ar"></span></span>\` : \`<span class="foh-btn ghost" style="pointer-events:none;opacity:.75">⏳ \${esc(op.comingSoonReason ?? "Próximamente")}</span>\`}</div></div>\`;
    }
    body = \`<div class="foh-screen"><div class="foh-top"><div class="foh-id"><span class="foh-mark"></span> \${esc(ap.name)} · \${ap.icao} / \${ap.iata}</div><div class="foh-steprail"><span class="s done"><span class="n">✓</span> Aeropuerto</span><span class="bar"></span><span class="s on"><span class="n">2</span> Operador</span></div></div><div class="foh-head"><div class="foh-eyebrow">Paso 2 de 2 · Tu primer cliente</div><h1>Elige tu <span class="t">operador</span> de arranque</h1><p class="sub">El primer contrato define tu setup inicial — flota, fees y dificultad. Puedes captar a los demás más adelante subiendo reputación.</p></div><div class="foh-cards ops">\${cards}</div><div class="foh-foot"><button class="foh-btn back ghost" id="ng-back"><span class="foh-ar"></span> Cambiar aeropuerto</button><div class="right"><span>SETUP REVERSIBLE · CAPTA AL RESTO IN-GAME</span></div></div></div><div class="foh-loader" id="foh-loader"><div class="spin"></div><div class="txt">Inicializando MRO…</div></div>\`;
  }
  if (newGameStep === "settings") {
    body = renderSettingsBody();
  } else if (newGameStep === "howto") {
    body = renderHowtoBody();
  } else if (newGameStep === "catalog") {
    body = renderCatalogBody();
  }
  return \`<div class="foh-root" id="newgame-overlay">\${bg(newGameStep !== "intro")}\${body}</div>\`;
}

// Pantalla Ajustes (handoff entrega-menu 3). Concatenación de strings sin backticks ni
// interpolación: se inyecta en el template gigante APP_JS sin riesgo de romperlo.
function settingsCategories(){
  return [
    ["audio", "Audio"], ["video", "Vídeo"], ["play", "Jugabilidad"],
    ["lang", "Idioma"], ["a11y", "Accesibilidad"],
  ];
}
function sw(k){ return '<div class="set-sw' + (gameSettings[k] ? " on" : "") + '" data-set-toggle="' + k + '"></div>'; }
function seg(k, opts){
  var h = '<div class="set-seg" data-set-seg="' + k + '">';
  for (var i = 0; i < opts.length; i++) h += '<button class="' + (gameSettings[k] === i ? "on" : "") + '" data-i="' + i + '">' + opts[i] + '</button>';
  return h + '</div>';
}
function slide(k){
  return '<div class="set-slide"><input type="range" min="0" max="100" value="' + (gameSettings[k] ?? 50) + '" data-set-slide="' + k + '"><span class="val">' + (gameSettings[k] ?? 50) + '</span></div>';
}
function opt(nm, ds, ctrl, note){
  return '<div class="set-opt"><div class="lab"><div class="nm">' + nm + '</div>'
    + (ds ? '<div class="ds">' + ds + '</div>' : "")
    + (note ? '<div class="set-note">' + note + '</div>' : "")
    + '</div><div class="ctrl">' + ctrl + '</div></div>';
}
function renderSettingsBody(){
  var cats = "";
  settingsCategories().forEach(function(c){
    cats += '<button class="set-catbtn' + (settingsCat === c[0] ? " on" : "") + '" data-set-cat="' + c[0] + '"><span class="ci"></span> ' + c[1] + '</button>';
  });
  var audio = '<div class="set-cat' + (settingsCat==="audio"?" on":"") + '" data-cat="audio"><div class="set-ct">Audio · mezcla</div>'
    + opt("Música", "Banda sonora ambiente de la sala de control.", slide("vol_music"), "Sin efecto aún (sonido no implementado)")
    + opt("Efectos", "Confirmaciones, transiciones, ticks del reloj.", slide("vol_sfx"), "Sin efecto aún")
    + opt("Alertas", "Avisos de AOG, SLA en riesgo y auditorías.", slide("vol_alert"), "Sin efecto aún")
    + opt("Silenciar en segundo plano", "Corta el audio cuando la ventana pierde el foco.", sw("mute_bg"))
    + '</div>';
  var video = '<div class="set-cat' + (settingsCat==="video"?" on":"") + '" data-cat="video"><div class="set-ct">Vídeo · pantalla</div>'
    + opt("Efectos del mapa", "Halos, trails y bloom del mapa Pixi. Desactívalo en equipos justos.", sw("fx"))
    + opt("Escala de la interfaz", "Tamaño de paneles, tablas y HUD.", seg("textsize", ["Normal","Grande","Enorme"]))
    + '</div>';
  var play = '<div class="set-cat' + (settingsCat==="play"?" on":"") + '" data-cat="play"><div class="set-ct">Jugabilidad · partida</div>'
    + opt("Pausar al abrir paneles", "Detiene el reloj al abrir asignación o detalle de WO.", sw("pause_panels"))
    + opt("Confirmar acciones críticas", "Pide confirmación al diferir, cancelar contrato o forzar mec sin rating.", sw("confirm"))
    + opt("Autoguardado semanal", "Guarda automáticamente en cada cierre de semana.", sw("autosave"))
    + opt("Aviso emergente de callouts", "Salta un pop-out al aparecer un evento nuevo (síntoma + matrícula + stand). Desactívalo para verlos solo en el log.", sw("callout_popup"))
    + '</div>';
  var lang = '<div class="set-cat' + (settingsCat==="lang"?" on":"") + '" data-cat="lang"><div class="set-ct">Idioma · región</div>'
    + opt("Idioma del juego", "Español / English (English parcial por ahora).", seg("lang", ["Español","English"]))
    + opt("Terminología aeronáutica", "Mantén siglas reales (ATA, AOG, MEL) sin traducir.", sw("avterms"))
    + '</div>';
  var a11y = '<div class="set-cat' + (settingsCat==="a11y"?" on":"") + '" data-cat="a11y"><div class="set-ct">Accesibilidad</div>'
    + opt("Reducir movimiento", "Quita barridos, pulsos y animaciones del mapa.", sw("reduce_motion"))
    + opt("Alto contraste", "Bordes y texto más marcados en paneles densos.", sw("contrast"))
    + '</div>';
  return '<div class="foh-screen">'
    + '<div class="foh-top"><div class="foh-id"><span class="foh-mark"></span> MRO Tycoon · Configuración</div><div class="foh-livetag"><span class="d"></span> v0.6 · cambios en vivo</div></div>'
    + '<div class="foh-head"><div class="foh-eyebrow">Configuración</div><h1>Ajustes</h1></div>'
    + '<div class="set-panel"><div class="set-cats">' + cats + '</div><div class="set-content">' + audio + video + play + lang + a11y + '</div></div>'
    + '<div class="foh-foot"><button class="foh-btn back ghost" id="ng-settings-back"><span class="foh-ar"></span> Menú principal</button><div class="right"><button class="foh-btn ghost" id="ng-settings-reset">Restablecer valores</button></div></div>'
    + '</div>';
}
// Placeholder de "Cómo se juega" — se implementa en la siguiente ronda. Si se entra al
// step sin estar listo, mostramos el menú. (Evita pantalla en blanco.)
function renderHowtoBody(){
  var steps = [
    { n: "01", nm: "El bucle del MRO" },
    { n: "02", nm: "Operaciones en vivo" },
    { n: "03", nm: "Tu plantilla" },
    { n: "04", nm: "Riesgo y supervivencia" },
  ];
  var panes = [
    { kick: "Paso 01 / 04 · El loop", h: "Diriges el taller, no el avión",
      lead: "No pilotas ni ves aviones despegar. Gestionas el MRO que mantiene la flota. Todo gira en torno a un bucle simple que se vuelve profundo.",
      li: ["Aceptas <b>contratos</b> de aerolíneas según fee, penalty y reputación.","Cada llegada genera <b>Work Orders</b> que resolver en el turnaround.","Cobras por trabajo cerrado a tiempo. Fallar el SLA cuesta dinero y reputación."],
      art: '<div class="ht-loop"><div class="ht-node"><div class="ln">01</div><div class="lt">Contrato</div><div class="lc">aerolínea cliente</div></div><div class="ht-node"><div class="ln">02</div><div class="lt">Avión en tierra</div><div class="lc">genera WOs</div></div><div class="ht-node"><div class="ln">04</div><div class="lt">Cobrar</div><div class="lc">cierre semanal</div></div><div class="ht-node"><div class="ln">03</div><div class="lt">Asignar y cerrar</div><div class="lc">mecánicos certificados</div></div><div class="ht-cyc">se repite · crece o cierra</div></div>' },
    { kick: "Paso 02 / 04 · Operaciones", h: "Tu sala de control en vivo",
      lead: "El panel de Operaciones es el corazón del juego. Las Work Orders avanzan en tiempo real por sus fases, cada una con su SLA corriendo.",
      li: ["Controla el tiempo: <b>Pausa / 1× / 2× / 5×</b>. Planifica en pausa.","Cada WO trae su <b>capítulo ATA</b>, severidad y SLA.","Filtra por mecánico certificado y <b>asigna en pocos clicks</b>."],
      art: '<div class="ht-phrow"><div class="ht-ph done"><div class="bar"></div><div class="phn">Viaje</div></div><div class="ht-ph done"><div class="bar"></div><div class="phn">Diag</div></div><div class="ht-ph now"><div class="bar"></div><div class="phn">Fix</div></div><div class="ht-ph"><div class="bar"></div><div class="phn">Test</div></div><div class="ht-ph"><div class="bar"></div><div class="phn">Cierre</div></div></div><div class="ht-wo"><div class="wt"><span class="reg">EC-NQM · WO-057</span><span class="sla">SLA 24:18</span></div><div class="ht-chips"><span class="ht-chip">ATA 29</span><span class="ht-chip">B1</span><span class="ht-chip crit">Critical</span><span class="ht-chip">Stand 351</span></div></div>' },
    { kick: "Paso 03 / 04 · Plantilla", h: "Sin certifier, no hay cierre",
      lead: "Tus mecánicos son personas, no peones. Solo un certifier con type rating válido firma la WO; los demás suman como apoyo.",
      li: ["Asigna <b>1 certifier + 0-2 helpers</b> por Work Order.","Vigila <b>moral y turnos</b>: un mecánico quemado rinde menos.","Forma juniors o ficha senior para nuevos ratings (CFM56 / V2500)."],
      art: '<div class="ht-loop" style="grid-template-columns:1fr"><div class="ht-node" style="text-align:left"><div class="lt">Paula Moreno</div><div class="lc">M-001 · B1 · CFM56 · moral 70</div></div><div class="ht-node" style="text-align:left"><div class="lt">Diego Sáez</div><div class="lc">M-002 · B1 · CFM56 · moral 82</div></div><div class="ht-node" style="text-align:left"><div class="lt">Marta Iglesias</div><div class="lc">M-003 · B2 · aviónica · moral 64</div></div></div>' },
    { kick: "Paso 04 / 04 · Supervivencia", h: "No hay pantalla de victoria",
      lead: "Es un sandbox con derrota real: creces a tu ritmo… o cierras. La tensión la pone el dominio aeronáutico de verdad.",
      li: ["<b>AOG</b>: avión en tierra, penalty ×5, no diferible. El reloj corre.","Mantén tu <b>compliance Part-145</b>: auditoría periódica.","Game over por <b>bancarrota</b> o <b>reputación a cero</b>."],
      art: '<div class="ht-aog"><span class="d"></span><div><div class="at">AOG · EC-NQM</div><div class="ad">PTU contaminada · no diferible · SLA < 45 min</div></div></div><div class="ht-gauge"><div class="gl"><span>Balance</span><span style="color:#3fb950">342k €</span></div><div class="gb"><i style="width:68%;background:#3fb950"></i></div></div><div class="ht-gauge"><div class="gl"><span>Reputación</span><span style="color:#4da3ff">64/100</span></div><div class="gb"><i style="width:64%;background:#4da3ff"></i></div></div><div class="ht-gauge"><div class="gl"><span>Part-145</span><span style="color:#d29922">80/100</span></div><div class="gb"><i style="width:80%;background:#d29922"></i></div></div>' },
  ];
  var idx = Math.max(0, Math.min(howtoStep, panes.length - 1));
  var p = panes[idx];
  var sidebar = "";
  for (var i = 0; i < steps.length; i++) sidebar += '<button class="ht-stepbtn' + (idx === i ? " on" : "") + '" data-howto-step="' + i + '"><span class="n">' + steps[i].n + '</span><span class="nm">' + steps[i].nm + '</span></button>';
  var lis = "";
  for (var j = 0; j < p.li.length; j++) lis += '<li>' + p.li[j] + '</li>';
  var dots = "";
  for (var k = 0; k < panes.length; k++) dots += '<span class="ht-dot' + (idx === k ? " on" : "") + '" data-howto-step="' + k + '"></span>';
  var prevBtn = idx === 0
    ? '<button class="foh-btn back ghost" id="ng-howto-back"><span class="foh-ar"></span> Menú</button>'
    : '<button class="foh-btn back ghost" id="ng-howto-prev"><span class="foh-ar"></span> Anterior</button>';
  var nextLabel = idx === panes.length - 1 ? "Nueva partida" : "Siguiente";
  return '<div class="foh-screen">'
    + '<div class="foh-top"><div class="foh-id"><span class="foh-mark"></span> Manual · primeros pasos</div><div class="foh-livetag"><span class="d"></span> 4 min de lectura</div></div>'
    + '<div class="foh-head"><div class="foh-eyebrow">Onboarding</div><h1>Cómo se juega</h1></div>'
    + '<div class="ht-panel"><div class="ht-steps">' + sidebar + '</div>'
    + '<div class="ht-content"><div class="ht-txt"><div class="ht-kick">' + p.kick + '</div><h2>' + p.h + '</h2><p class="ht-lead">' + p.lead + '</p><ul>' + lis + '</ul></div><div class="ht-art">' + p.art + '</div></div>'
    + '</div>'
    + '<div class="foh-foot">' + prevBtn + '<div class="ht-dots">' + dots + '</div><button class="foh-btn primary" id="ng-howto-next">' + nextLabel + ' <span class="foh-ar"></span></button></div>'
    + '</div>';
}

// Mini-mapa OSM de un aeropuerto, generado EN VIVO de la geometría vectorial embebida
// (S.DATA.airportRuntime[icao].paths). Coords ya normalizadas 0..1; proyección idéntica al
// mapa Pixi (x*W, y*W/aspectRatio). SVG sin texto → sin esc. Si el OSM cambia, la foto cambia.
function airportThumbSvg(paths){
  if (!paths || !paths.paths) return '';
  var P = paths.paths;
  var ar = paths.aspectRatio || 1.6;
  var W = 100, H = Math.round((100 / ar) * 10) / 10;
  var px = function(c){ return (c[0] * W).toFixed(1); };
  var py = function(c){ return (c[1] * H).toFixed(1); };
  var line = function(w, cls, close){
    if (!w.coords || !w.coords.length) return '';
    var d = 'M' + px(w.coords[0]) + ',' + py(w.coords[0]);
    for (var i = 1; i < w.coords.length; i++) d += 'L' + px(w.coords[i]) + ',' + py(w.coords[i]);
    if (close) d += 'Z';
    return '<path class="' + cls + '" d="' + d + '"/>';
  };
  var s = '';
  var aero = P.aerodrome || []; for (var a = 0; a < aero.length; a++) s += line(aero[a], 'cat-osm-aero', true);
  var apr = P.apron || []; for (var p2 = 0; p2 < apr.length; p2++) s += line(apr[p2], 'cat-osm-apron', true);
  var tax = P.taxiways || []; for (var t = 0; t < tax.length; t++) s += line(tax[t], 'cat-osm-taxi', false);
  var rwy = P.runways || []; for (var r = 0; r < rwy.length; r++) s += line(rwy[r], 'cat-osm-rwy', false);
  var std = P.parkingPositions || [], dots = '';
  for (var k = 0; k < std.length; k++) { var cc = std[k].coords; var c0 = cc && cc.length ? cc[cc.length - 1] : null; if (c0) dots += '<circle class="cat-osm-stand" cx="' + px(c0) + '" cy="' + py(c0) + '" r="0.9"/>'; }
  return '<svg class="cat-osm" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + s + dots + '</svg>';
}

// Catálogo (pantalla menú) — enciclopedia DINÁMICA leída en vivo de S.DATA (la "ddbb" del
// juego). Concatenación de strings + esc()/fmt(), sin backticks ni interpolación, para
// inyectarse en el template gigante APP_JS sin romperlo. Si cambian los JSON, esto cambia solo.
function renderCatalogBody(){
  var D = S.DATA || {};
  var WO = D.workOrders || [];
  var DC = D.dailyChecks || [];
  var MC = D.maintenanceChecks || [];
  var AL = D.airlines || [];
  var AP = (D.airportCatalog && D.airportCatalog.airports) || [];
  var BAL = D.balance || {};
  var active = catalogTab || "aircraft";

  var tabs = [
    { k: "aircraft", lbl: "Aviones", n: 0 },
    { k: "tasks", lbl: "Tareas AMM", n: WO.length },
    { k: "daily", lbl: "Daily checks", n: DC.length },
    { k: "checks", lbl: "A/C/D checks", n: MC.length },
    { k: "airlines", lbl: "Aerolíneas", n: AL.length },
    { k: "airports", lbl: "Aeropuertos", n: AP.length },
    { k: "economy", lbl: "Economía", n: 0 },
  ];
  var tabNav = "";
  for (var t = 0; t < tabs.length; t++) {
    var cnt = tabs[t].n ? ' <span class="cat-n">' + tabs[t].n + '</span>' : '';
    tabNav += '<button class="cat-tab' + (active === tabs[t].k ? ' on' : '') + '" data-cat-tab="' + tabs[t].k + '">' + tabs[t].lbl + cnt + '</button>';
  }

  var sevBadge = function(s){
    var c = s === "Critical" ? "crit" : s === "Major" ? "major" : "minor";
    return '<span class="cat-badge ' + c + '">' + esc(s) + '</span>';
  };

  var body = "";

  if (active === "aircraft") {
    var modelSet = {};
    for (var a = 0; a < AL.length; a++) for (var f = 0; f < (AL[a].fleet || []).length; f++) modelSet[AL[a].fleet[f].model] = true;
    for (var w = 0; w < WO.length; w++) for (var m = 0; m < (WO[w].aircraftModelsCompatibles || []).length; m++) modelSet[WO[w].aircraftModelsCompatibles[m]] = true;
    var models = Object.keys(modelSet).sort();
    var cards = "";
    for (var mi = 0; mi < models.length; mi++) {
      var mdl = models[mi];
      var engSet = {}, opsCount = 0;
      for (var a2 = 0; a2 < AL.length; a2++) { var has = false; for (var f2 = 0; f2 < (AL[a2].fleet || []).length; f2++) if (AL[a2].fleet[f2].model === mdl) { engSet[AL[a2].fleet[f2].engineVariant] = true; has = true; } if (has) opsCount++; }
      var engines = Object.keys(engSet);
      var woCount = 0; for (var w2 = 0; w2 < WO.length; w2++) if ((WO[w2].aircraftModelsCompatibles || []).indexOf(mdl) >= 0) woCount++;
      var dcCount = 0; for (var d2 = 0; d2 < DC.length; d2++) if ((DC[d2].aircraftModelsCompatibles || []).indexOf(mdl) >= 0) dcCount++;
      var mcCount = 0; for (var c2 = 0; c2 < MC.length; c2++) if (MC[c2].model === mdl) mcCount++;
      cards += '<div class="cat-card">'
        + '<div class="cat-card-h"><h3>' + esc(mdl) + '</h3><span class="cat-tag">Airbus</span></div>'
        + '<div class="cat-kv"><span>Motores</span><b>' + esc(engines.join(" · ") || "—") + '</b></div>'
        + '<div class="cat-kv"><span>Aerolíneas que lo operan</span><b>' + opsCount + '</b></div>'
        + '<div class="cat-kv"><span>Tareas AMM aplicables</span><b>' + woCount + '</b></div>'
        + '<div class="cat-kv"><span>Daily checks</span><b>' + dcCount + '</b></div>'
        + '<div class="cat-kv"><span>Checks A/C/D</span><b>' + mcCount + '</b></div>'
        + '</div>';
    }
    body = '<p class="cat-lead">Universo cerrado: familia A320. Cada modelo deriva sus tareas y checks de los datasets reales.</p><div class="cat-cards">' + cards + '</div>';
  }

  else if (active === "airports") {
    var rtAll = D.airportRuntime || {};
    var apcards = "";
    for (var ap2 = 0; ap2 < AP.length; ap2++) {
      var apx = AP[ap2];
      var rt = rtAll[apx.icao];
      var hasGeo = !!(rt && rt.paths && rt.paths.paths);
      var avail = apx.available !== false;
      var ops = 0; for (var oo = 0; oo < (apx.operators || []).length; oo++) if (apx.operators[oo].available) ops++;
      var dif = apx.difficultyOverall || 0;
      var stars = "";
      for (var ds = 0; ds < 5; ds++) stars += ds < dif ? "★" : "☆";
      var thumb = hasGeo ? airportThumbSvg(rt.paths) : '<div class="cat-osm-none">' + (avail ? "Sin layout OSM" : "Próximamente") + '</div>';
      var geoLine = "";
      if (hasGeo) {
        var pp = rt.paths.paths;
        var nRwy = (pp.runways || []).length, nStd = (pp.parkingPositions || []).length, nTax = (pp.taxiways || []).length;
        geoLine = '<div class="cat-kv"><span>Layout OSM</span><b>' + nRwy + ' pista' + (nRwy === 1 ? '' : 's') + ' · ' + nTax + ' taxi · ' + nStd + ' stands</b></div>';
      }
      apcards += '<div class="cat-card cat-apcard' + (avail ? '' : ' dis') + '" style="--c:' + (avail ? 'var(--accent)' : 'var(--dim)') + '">'
        + '<div class="cat-osm-wrap">' + thumb + (avail ? '' : '<span class="cat-osm-soon">Próximamente</span>') + '</div>'
        + '<div class="cat-card-h"><h3>' + esc(apx.name) + '</h3><span class="cat-tag mono">' + esc(apx.icao) + ' / ' + esc(apx.iata) + '</span></div>'
        + '<div class="cat-kv"><span>Ciudad</span><b>' + esc(apx.city || "—") + '</b></div>'
        + '<div class="cat-kv"><span>Dificultad</span><b style="color:var(--warn)">' + stars + '</b></div>'
        + '<div class="cat-kv"><span>Operadores</span><b>' + (avail ? ops : "—") + '</b></div>'
        + geoLine
        + '<p class="cat-apdesc">' + esc(apx.shortDesc || apx.comingSoonReason || "") + '</p>'
        + '</div>';
    }
    body = '<p class="cat-lead">Aeropuertos del juego con su <b>layout OSM real</b> — el mismo dato vectorial que dibuja el mapa en partida. La miniatura se genera en vivo de la geometría; solo los disponibles la traen.</p><div class="cat-cards cat-apcards">' + apcards + '</div>';
  }

  else if (active === "tasks") {
    var sv = { Minor: 0, Major: 0, Critical: 0 }, b1 = 0, b2 = 0, aog = 0, nCall = 0, nCfm = 0, nV25 = 0;
    for (var w3 = 0; w3 < WO.length; w3++) {
      var wq = WO[w3];
      sv[wq.severity] = (sv[wq.severity] || 0) + 1;
      if (wq.requiredCategory === "B1") b1++; else b2++;
      if (wq.isAOG) aog++;
      if (wq.kind === "callout") nCall++;
      var ev = wq.engineVariantsCompatibles || [];
      if (ev.length === 1 && ev[0] === "CFM56") nCfm++;
      else if (ev.length === 1 && ev[0] === "V2500") nV25++;
    }
    var stat = '<div class="cat-stats">'
      + '<div class="cat-stat"><b>' + WO.length + '</b><span>Total</span></div>'
      + '<div class="cat-stat"><b class="ok">' + nCall + '</b><span>Callout</span></div>'
      + '<div class="cat-stat"><b>' + (WO.length - nCall) + '</b><span>Programadas</span></div>'
      + '<div class="cat-stat"><b class="ok">' + sv.Minor + '</b><span>Minor</span></div>'
      + '<div class="cat-stat"><b class="warn">' + sv.Major + '</b><span>Major</span></div>'
      + '<div class="cat-stat"><b class="bad">' + sv.Critical + '</b><span>Critical</span></div>'
      + '<div class="cat-stat"><b>' + b1 + ' / ' + b2 + '</b><span>B1 / B2</span></div>'
      + '<div class="cat-stat"><b>' + nCfm + ' / ' + nV25 + '</b><span>CFM / V2500</span></div>'
      + '</div>';
    // Manual desplegable por capítulo ATA (como el AMM real). Agrupa las tareas por su ATA.
    var ataMap = D.ataChapters || {};
    var byAta = {};
    for (var wi = 0; wi < WO.length; wi++) { var ak = String(WO[wi].ata); (byAta[ak] = byAta[ak] || []).push(WO[wi]); }
    var atas = Object.keys(byAta).sort(function(a, b){ return (+a) - (+b); });
    var engBadge = function(e){ if (!e || e.length !== 1) return ''; return '<span class="cat-badge eng">' + esc(e[0]) + '</span>'; };
    var kindBadge = function(k){ return k === "callout" ? '<span class="cat-badge call">callout</span>' : '<span class="cat-badge prog">programada</span>'; };
    var acc = "";
    for (var ai = 0; ai < atas.length; ai++) {
      var an = atas[ai], list = byAta[an], open = !!catAtaOpen[an];
      var cname = ataMap[an] || "Capítulo " + an;
      acc += '<div class="cat-ata' + (open ? ' open' : '') + '">'
        + '<button class="cat-ata-h" data-cat-ata="' + an + '"><span class="cat-ata-chev">' + (open ? '▾' : '▸') + '</span><span class="cat-ata-n mono">ATA ' + esc(an) + '</span><span class="cat-ata-name">' + esc(cname) + '</span><span class="cat-ata-cnt">' + list.length + '</span></button>';
      if (open) {
        var inner = "";
        for (var li = 0; li < list.length; li++) {
          var o = list[li];
          inner += '<div class="cat-task">'
            + '<div class="cat-task-top"><span class="cat-task-name">' + esc(o.name || o.id) + '</span>' + sevBadge(o.severity) + (o.isAOG ? '<span class="cat-badge crit">AOG</span>' : '') + engBadge(o.engineVariantsCompatibles) + kindBadge(o.kind) + '</div>'
            + '<div class="cat-task-meta"><span class="cat-task-ref mono">' + esc(o.ref || "— sin ref AMM") + '</span><span>' + esc(o.requiredCategory) + '</span><span>' + o.durationMinutes + ' min</span><span>' + (o.deferrable ? "diferible" : "no diferible") + '</span></div>'
            + '</div>';
        }
        acc += '<div class="cat-ata-body">' + inner + '</div>';
      }
      acc += '</div>';
    }
    body = stat + '<p class="cat-lead" style="margin-top:14px">Manual de tareas por capítulo <b>ATA</b> — como el AMM real. Despliega un capítulo para ver sus tareas, su ref, categoría, motor (si es específico) y si es callout o programada.</p><div class="cat-manual">' + acc + '</div>';
  }

  else if (active === "daily") {
    var rows2 = "";
    for (var d3 = 0; d3 < DC.length; d3++) {
      var dd = DC[d3];
      rows2 += '<tr>'
        + '<td class="mono">' + esc(String(dd.id)) + '</td>'
        + '<td class="mono">' + esc(String(dd.ata)) + '</td>'
        + '<td>' + esc(dd.description || "") + '</td>'
        + '<td class="mono">' + esc(dd.requiredCategory) + '</td>'
        + '<td class="mono">' + dd.durationMinutes + '′</td>'
        + '<td>' + (dd.deferrable ? '✓' : '—') + '</td>'
        + '</tr>';
    }
    body = '<p class="cat-lead">Inspecciones de tránsito y pernocta (MPD). Se auto-generan cuando un avión pernocta en tu base.</p><div class="cat-tablewrap"><table class="cat-table"><thead><tr><th>ID</th><th>ATA</th><th>Descripción</th><th>Cat</th><th>Dur</th><th>Difer</th></tr></thead><tbody>' + rows2 + '</tbody></table></div>';
  }

  else if (active === "checks") {
    var byType = { A: [], C: [], D: [] };
    for (var c3 = 0; c3 < MC.length; c3++) { var ty = MC[c3].type; if (!byType[ty]) byType[ty] = []; byType[ty].push(MC[c3]); }
    var typeLabels = { A: "A-check · overnight", C: "C-check · parada pesada", D: "D-check · gran parada" };
    var order = ["A", "C", "D"], sections = "";
    for (var oi = 0; oi < order.length; oi++) {
      var tk = order[oi], list = byType[tk] || [];
      if (!list.length) continue;
      var rows3 = "";
      for (var li2 = 0; li2 < list.length; li2++) {
        var ck = list[li2];
        rows3 += '<tr>'
          + '<td class="mono">' + esc(ck.model) + '</td>'
          + '<td class="mono">' + fmt(ck.triggerFH) + ' FH</td>'
          + '<td class="mono">' + fmt(ck.triggerCycles) + '</td>'
          + '<td class="mono">' + ck.manDays + ' md</td>'
          + '<td class="mono">' + ck.parkingDays + ' d</td>'
          + '<td class="mono ok">' + fmt(ck.baseFee) + ' €</td>'
          + '</tr>';
      }
      sections += '<h3 class="cat-sec">' + esc(typeLabels[tk] || tk) + '</h3>'
        + '<div class="cat-tablewrap"><table class="cat-table"><thead><tr><th>Modelo</th><th>Trigger FH</th><th>Ciclos</th><th>Man-days</th><th>Parking</th><th>Base fee</th></tr></thead><tbody>' + rows3 + '</tbody></table></div>';
    }
    body = '<p class="cat-lead">Mantenimiento base programado por horas de vuelo / ciclos. Triggers, man-days y fees salen de maintenance_checks.json.</p>' + sections;
  }

  else if (active === "airlines") {
    var cards2 = "";
    for (var al = 0; al < AL.length; al++) {
      var Lz = AL[al], mset = {};
      for (var ff = 0; ff < (Lz.fleet || []).length; ff++) mset[Lz.fleet[ff].model] = true;
      var mlist = Object.keys(mset).sort();
      cards2 += '<div class="cat-card" style="--c:' + esc(Lz.color || "#4da3ff") + '">'
        + '<div class="cat-card-bar"></div>'
        + '<div class="cat-card-h"><h3>' + esc(Lz.name) + '</h3><span class="cat-tag mono">' + esc(Lz.iataCode) + '</span></div>'
        + '<div class="cat-kv"><span>Flota base</span><b>' + (Lz.basedAircraftCount || 0) + ' aviones</b></div>'
        + '<div class="cat-kv"><span>Modelos</span><b>' + esc(mlist.join(" · ") || "—") + '</b></div>'
        + '<div class="cat-kv"><span>Umbral de marca</span><b>' + (Lz.brandThreshold || 0) + '</b></div>'
        + '</div>';
    }
    body = '<p class="cat-lead">Aerolíneas que pueden operar en tus aeropuertos. Tu reputación de marca desbloquea sus ofertas según el umbral.</p><div class="cat-cards">' + cards2 + '</div>';
  }

  else if (active === "economy") {
    var sal = BAL.salaries || {}, rep = BAL.reputation || {};
    var salRows = "", salKeys = [["helper", "Helper (sin licencia)"], ["b1Junior", "B1 Junior"], ["b1Senior", "B1 Senior"], ["b2Junior", "B2 Junior"], ["b2Senior", "B2 Senior"]];
    for (var sk = 0; sk < salKeys.length; sk++) if (sal[salKeys[sk][0]] != null) salRows += '<div class="cat-kv"><span>' + salKeys[sk][1] + '</span><b>' + fmt(sal[salKeys[sk][0]]) + ' €/sem</b></div>';
    body = '<p class="cat-lead">Parámetros económicos del juego (balance.json). Editar el JSON y reconstruir actualiza estos valores aquí automáticamente.</p>'
      + '<div class="cat-cards">'
      + '<div class="cat-card"><div class="cat-card-h"><h3>Arranque</h3></div>'
        + '<div class="cat-kv"><span>Balance inicial</span><b class="ok">' + fmt(BAL.startingBalance) + ' €</b></div>'
        + '<div class="cat-kv"><span>Reputación inicial</span><b>' + esc(String(BAL.startingReputation)) + '/100</b></div>'
        + '<div class="cat-kv"><span>Coste fijo semanal</span><b class="bad">' + fmt(BAL.weeklyFixedCost) + ' €</b></div>'
        + '</div>'
      + '<div class="cat-card"><div class="cat-card-h"><h3>Salarios</h3></div>' + salRows + '</div>'
      + '<div class="cat-card"><div class="cat-card-h"><h3>Penalizaciones</h3></div>'
        + '<div class="cat-kv"><span>Multiplicador SLA</span><b>×' + esc(String(BAL.slaMultiplier)) + '</b></div>'
        + '<div class="cat-kv"><span>Multiplicador AOG</span><b class="bad">×' + esc(String(BAL.aogPenaltyMultiplier)) + '</b></div>'
        + '</div>'
      + '<div class="cat-card"><div class="cat-card-h"><h3>Reputación (Δ por evento)</h3></div>'
        + '<div class="cat-kv"><span>WO a tiempo</span><b class="ok">+' + (rep.woCompletedOnTime || 0) + '</b></div>'
        + '<div class="cat-kv"><span>WO tarde</span><b class="warn">' + (rep.woCompletedLate || 0) + '</b></div>'
        + '<div class="cat-kv"><span>WO fallida</span><b class="bad">' + (rep.woFailed || 0) + '</b></div>'
        + '<div class="cat-kv"><span>AOG fallido</span><b class="bad">' + (rep.aogFailed || 0) + '</b></div>'
        + '</div>'
      + '</div>';
  }

  return '<div class="foh-screen cat-screen">'
    + '<div class="foh-top"><div class="foh-id"><span class="foh-mark"></span> Catálogo · base de datos del juego</div><div class="foh-livetag"><span class="d"></span> En vivo · S.DATA</div></div>'
    + '<div class="foh-head"><div class="foh-eyebrow">Enciclopedia</div><h1>Catálogo</h1><p class="sub">Todo el contenido del juego, leído en tiempo real de la base de datos. Si cambian los datos, esta pantalla cambia con ellos.</p></div>'
    + '<div class="cat-tabs">' + tabNav + '</div>'
    + '<div class="cat-body">' + body + '</div>'
    + '<div class="foh-foot"><button class="foh-btn back ghost" id="ng-catalog-back"><span class="foh-ar"></span> Menú</button><div class="right"><span>FUENTE: workorders · airlines · maintenance_checks · daily_checks · balance</span></div></div>'
    + '</div>';
}

// Game Over post-mortem (handoff entrega-menu 3). Escrito con concatenacion de strings
// (sin backticks ni interpolacion) para insertarse seguro en el template gigante APP_JS.
function renderGameOver(){
  var dayN = Math.floor(game.clock.minute / S.DAY_MINUTES) + 1;
  var wk = S.getWeek(game.clock.minute);
  var rep = Math.round(S.getAverageRep(game.reputation));
  var cash = Math.round(game.economy.balance);
  var reason = game.gameOver.reason;
  var reasonTxt = reason === "bankruptcy" ? "Bancarrota"
    : reason === "reputation" ? "Reputación por los suelos"
    : reason === "compliance" ? "Certificación Part-145 revocada"
    : "Fin de la partida";
  var reasonSub = reason === "bankruptcy" ? "Te quedaste sin caja. Los bancos no perdonan a un MRO en números rojos."
    : reason === "reputation" ? "Ninguna aerolínea confía ya en tu taller."
    : reason === "compliance" ? "La autoridad aeronáutica te retiró la licencia para firmar trabajos."
    : "La operación ha terminado.";
  var hist = game.kpiHistory || [];
  var woC = hist.reduce(function(s,h){ return s + (h.woCompleted||0); }, 0);
  var woL = hist.reduce(function(s,h){ return s + (h.woLate||0); }, 0);
  var woF = hist.reduce(function(s,h){ return s + (h.woFailed||0); }, 0);
  var spark = "";
  if (hist.length >= 2) {
    var vals = hist.map(function(h){ return h.balance||0; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var rng = (mx - mn) || 1, W = 520, H = 120;
    var pts = vals.map(function(v,i){
      var x = (i/(vals.length-1))*W;
      var y = H - ((v-mn)/rng)*H;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var zeroLine = (mx > 0 && mn < 0) ? '<line x1="0" y1="' + (H-((0-mn)/rng)*H).toFixed(1) + '" x2="520" y2="' + (H-((0-mn)/rng)*H).toFixed(1) + '" stroke="#3a4256" stroke-dasharray="4 4"/>' : "";
    spark = '<svg viewBox="0 0 520 120" preserveAspectRatio="none" class="go-spark">' + zeroLine + '<polyline points="' + pts + '" fill="none" stroke="#f85149" stroke-width="2"/></svg>';
  } else {
    spark = '<div class="go-nospark">Sin histórico semanal suficiente para el gráfico de balance.</div>';
  }
  var repColor = rep >= 50 ? "#3fb950" : rep >= 25 ? "#d29922" : "#f85149";
  var cashColor = cash >= 0 ? "#e6e9ef" : "#f85149";
  return '<div class="go-root">'
    + '<div class="go-bg"></div><div class="go-grid"></div><div class="go-scan"></div>'
    + '<div class="go-screen">'
    +   '<div class="go-eyebrow">Operación finalizada · Día ' + dayN + '</div>'
    +   '<h1 class="go-title">FIN DE LA <span>PARTIDA</span></h1>'
    +   '<div class="go-reason"><div class="rt">' + reasonTxt + '</div><div class="rs">' + reasonSub + '</div></div>'
    +   '<div class="go-stats">'
    +     '<div class="go-stat"><div class="k">Días operados</div><div class="v">' + dayN + '</div></div>'
    +     '<div class="go-stat"><div class="k">Semanas</div><div class="v">' + wk + '</div></div>'
    +     '<div class="go-stat"><div class="k">Reputación</div><div class="v" style="color:' + repColor + '">' + rep + '<span>/100</span></div></div>'
    +     '<div class="go-stat"><div class="k">Caja final</div><div class="v" style="color:' + cashColor + '">' + fmt(cash) + '<span> €</span></div></div>'
    +   '</div>'
    +   '<div class="go-chart"><div class="go-chart-h">Balance semanal · trayectoria hasta el cierre</div>' + spark + '</div>'
    +   '<div class="go-wo">Work Orders: <b>' + woC + '</b> completadas · <b style="color:#d29922">' + woL + '</b> tarde · <b style="color:#f85149">' + woF + '</b> falladas</div>'
    +   '<div class="go-actions"><button class="go-btn primary" id="go-retry">Reintentar</button><button class="go-btn" id="go-menu">Menú principal</button></div>'
    + '</div></div>';
}

// Cierre Semanal (handoff entrega-menu 3). Detecta que el sim cerró una semana (kpiHistory
// creció) y prepara weeklyCloseData con el snapshot + el anterior + el desglose del ledger
// de esa semana. Concatenación de strings (sin backticks ni interpolación).
function buildWeeklyCloseData(){
  const hist = game.kpiHistory || [];
  if (hist.length === 0) return null;
  const snap = hist[hist.length - 1];
  const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
  // Semana que cerró = snap.week. Su ventana de ledger es [(week-1)*WEEK, week*WEEK).
  const wkStart = (snap.week - 1) * S.WEEK_MINUTES;
  const wkEnd = snap.week * S.WEEK_MINUTES;
  const led = (game.economy.ledger || []).filter(t => t.minute >= wkStart && t.minute < wkEnd);
  let woPay = 0, penaltySla = 0, penaltyAog = 0, salary = 0, fixed = 0, other = 0;
  for (const t of led) {
    if (t.type === "workOrderPayment") woPay += t.amount;
    else if (t.type === "salary") salary += t.amount;
    else if (t.type === "weeklyFixedCost") fixed += t.amount;
    else if (t.type === "penalty") { if ((t.description || "").indexOf("AOG") >= 0) penaltyAog += t.amount; else penaltySla += t.amount; }
    else other += t.amount;
  }
  const ingresos = woPay + (other > 0 ? other : 0);
  const gastos = salary + fixed + penaltySla + penaltyAog + (other < 0 ? other : 0);
  const neto = ingresos + gastos; // gastos ya negativos
  return { snap, prev, woPay, penaltySla, penaltyAog, salary, fixed, ingresos, gastos, neto };
}
function fmtSigned(n){ return (n >= 0 ? "+" : "") + fmt(Math.round(n)) + " €"; }
function renderWeeklyClose(){
  const d = weeklyCloseData;
  if (!d) return "";
  const s = d.snap, p = d.prev;
  const wkNum = String(s.week).padStart(2, "0");
  const dayStart = (s.week - 1) * 7 + 1, dayEnd = s.week * 7;
  const netCls = d.neto < 0 ? " neg" : "";
  // deltas vs semana previa
  const dRep = p ? Math.round(s.repAvg - p.repAvg) : 0;
  const dComp = p ? (s.complianceScore - p.complianceScore) : 0;
  const dWo = p ? (s.woCompleted - p.woCompleted) : 0;
  const deltaTag = (n, suf) => {
    if (!p) return '<div class="d flat">— sem 1</div>';
    if (n > 0) return '<div class="d up">▲ +' + n + (suf || "") + '</div>';
    if (n < 0) return '<div class="d down">▼ ' + n + (suf || "") + '</div>';
    return '<div class="d flat">= igual</div>';
  };
  // sparkline balance (últimas 6 semanas)
  const hist = game.kpiHistory.slice(-6);
  let spark = "";
  if (hist.length >= 2) {
    const vals = hist.map(h => h.balance);
    const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    const rng = (mx - mn) || 1, W = 280, H = 48;
    const pts = vals.map((v, i) => ((i / (vals.length - 1)) * W).toFixed(1) + "," + (H - ((v - mn) / rng) * H).toFixed(1)).join(" ");
    spark = '<svg viewBox="0 0 280 48" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="#4da3ff" stroke-width="2"/></svg>';
  } else {
    spark = '<svg viewBox="0 0 280 48"><text x="8" y="28" fill="#5d6677" font-size="11" font-family="monospace">Sin histórico suficiente</text></svg>';
  }
  const row = (lbl, amt) => '<div class="row"><span class="lbl">' + lbl + '</span><span class="amt">' + fmt(Math.round(amt)) + ' €</span></div>';
  return '<div class="wc-root"><div class="wc-scrim"></div><div class="wc-panel">'
    + '<div class="wc-head"><div class="wk">Cierre · <span class="t">Semana ' + wkNum + '</span></div>'
    + '<div class="save"><span>✓</span> ' + (gameSettings.autosave ? "Autoguardado" : "Guardado manual") + '</div></div>'
    + '<div class="wc-main"><div class="wc-left">'
    +   '<div class="wc-hero"><div class="net"><div class="k">Resultado neto de la semana</div><div class="v' + netCls + '">' + fmtSigned(d.neto) + '</div></div>'
    +     '<div class="bal"><div class="k">Balance total</div><div class="v">' + fmt(Math.round(s.balance)) + ' €</div></div></div>'
    +   '<div class="wc-pl"><div class="col ing"><div class="ct"><span class="dot"></span> Ingresos</div>'
    +     row("Trabajo cerrado (WOs)", d.woPay)
    +     '<div class="sub"><span class="lbl">Total ingresos</span><span class="amt">' + fmt(Math.round(d.ingresos)) + ' €</span></div></div>'
    +   '<div class="col gas"><div class="ct"><span class="dot"></span> Gastos</div>'
    +     row("Salarios", d.salary)
    +     row("Coste fijo (upkeep)", d.fixed)
    +     row("Penalties SLA", d.penaltySla)
    +     (d.penaltyAog < 0 ? row("Penalties AOG", d.penaltyAog) : "")
    +     '<div class="sub"><span class="lbl">Total gastos</span><span class="amt">' + fmt(Math.round(d.gastos)) + ' €</span></div></div></div>'
    +   '<div class="wc-note"><span>Semana ' + wkNum + ' cerrada. ' + (d.neto >= 0 ? "En positivo: el margen aguanta crecer." : "En negativo: revisa cobertura y penalties.") + '</span></div>'
    + '</div>'
    + '<div class="wc-right"><div class="wc-rt-title">Rendimiento · Semana ' + wkNum + '</div>'
    +   '<div class="wc-kpis">'
    +     '<div class="wc-kpi"><div class="k">WOs completadas</div><div class="v">' + s.woCompleted + '</div>' + deltaTag(dWo) + '</div>'
    +     '<div class="wc-kpi"><div class="k">WOs tarde</div><div class="v" style="color:' + (s.woLate > 0 ? "#d29922" : "#3fb950") + '">' + s.woLate + '</div><div class="d flat">acum.</div></div>'
    +     '<div class="wc-kpi"><div class="k">Reputación</div><div class="v" style="color:#4da3ff">' + Math.round(s.repAvg) + '</div>' + deltaTag(dRep) + '</div>'
    +     '<div class="wc-kpi"><div class="k">Part-145</div><div class="v" style="color:#d29922">' + s.complianceScore + '</div>' + deltaTag(dComp) + '</div>'
    +   '</div>'
    +   '<div class="wc-trend"><div class="tl"><span class="k">Balance · últimas 6 semanas</span></div>' + spark + '</div>'
    + '</div></div>'
    + '<div class="wc-foot"><span class="hint">El reloj se reanuda al continuar</span>'
    +   '<button class="wc-btn" id="wc-continue">Continuar a Semana ' + String(s.week + 1).padStart(2, "0") + ' →</button></div>'
    + '</div></div>';
}

// Hito / Milestone (handoff entrega-menu 5). Datos del nuevo contrato firmado (reales del
// game state, sin recompensas inventadas). Concatenación de strings sin backticks ni interpolación.
function buildMilestoneData(){
  const active = (game.contracts || []).filter(c => c.status === "active");
  if (active.length === 0) return null;
  // El contrato más reciente = mayor offeredAtMinute (proxy de "recién firmado").
  const c = active.slice().sort((a, b) => (b.offeredAtMinute ?? 0) - (a.offeredAtMinute ?? 0))[0];
  const al = game.airlines.find(x => x.id === c.airlineId);
  const name = al ? al.name : c.airlineId;
  const rep = game.reputation?.perAirline?.[c.airlineId];
  return {
    icon: "🤝",
    kicker: "Hito alcanzado · Nuevo contrato",
    titlePre: "",
    titleHl: name,
    descPre: " confía en tu MRO y firma contrato. Más movimientos, más Work Orders y un flujo de ingresos recurrente.",
    rewards: [
      { l: "Fee base", v: fmt(c.baseFeePerWeek ?? 0), u: " €/sem" },
      { l: "Pago por trabajo", v: fmt(c.paymentPerWOMinute ?? 0), u: " €/min" },
    ].concat(rep != null ? [{ l: "Reputación", v: String(Math.round(rep)), u: "/100" }] : []),
  };
}
function renderMilestone(){
  const d = milestoneData;
  if (!d) return "";
  let rewards = "";
  for (const r of d.rewards) rewards += '<div class="ms-reward"><div class="rl">' + r.l + '</div><div class="rv">' + r.v + '<span class="u">' + (r.u || "") + '</span></div></div>';
  return '<div class="ms-root"><div class="ms-scrim"></div><div class="ms-hero">'
    + '<div class="ms-badge"><span class="ic">' + d.icon + '</span></div>'
    + '<div class="ms-kicker">' + esc(d.kicker) + '</div>'
    + '<h1 class="ms-title">' + esc(d.titlePre || "") + '<span class="hl">' + esc(d.titleHl) + '</span></h1>'
    + '<p class="ms-desc"><strong style="color:var(--text)">' + esc(d.titleHl) + '</strong>' + esc(d.descPre || "") + '</p>'
    + '<div class="ms-rewards">' + rewards + '</div>'
    + '<button class="ms-btn" id="ms-continue">Seguir construyendo →</button>'
    + '</div></div>';
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

// Nav por teclado del Menú Principal (front-of-house): ↑/↓ mueve selección, Enter activa.
// Ajustes: sliders (input range). Listener "input" aparte del "click" global. NO llama
// render() — destruiría el <input> mientras el usuario arrastra; solo actualiza el label
// y persiste en mro_settings.
document.body.addEventListener("input", (e) => {
  const sl = e.target.closest && e.target.closest("[data-set-slide]");
  if (sl && e.target.tagName === "INPUT") {
    const k = sl.dataset.setSlide;
    gameSettings[k] = parseInt(e.target.value, 10) || 0;
    const lab = sl.querySelector(".val");
    if (lab) lab.textContent = e.target.value;
    saveSettings();
  }
});
// Modo marcador del mapa (debug): M activa/sale · 1-9 cambian grupo · C limpia.
window.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (activeTab !== "map" || !window.__mroDebug) return;
  if (e.key === "m" || e.key === "M") { e.preventDefault(); window.__mroDebug.toggleMark(); return; }
  if (!window.__mroDebug._markOn) return; // las teclas de grupo solo en modo marcador
  if (e.key >= "1" && e.key <= "9") { e.preventDefault(); const nm = window.__mroDebug._markGroupNames[e.key]; if (nm) window.__mroDebug.setMarkGroup(nm); return; }
  if (e.key === "c" || e.key === "C") { e.preventDefault(); window.__mroDebug.markClear(); window.__mroDebug.toggleMark(); window.__mroDebug.toggleMark(); return; }
});
window.addEventListener("keydown", (e) => {
  if (newGameStep !== "intro") return;
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
  const items = Array.prototype.slice.call(document.querySelectorAll("#foh-menu .foh-mi:not(.disabled)"));
  if (!items.length) return;
  let sel = items.findIndex((x) => x.classList.contains("sel"));
  if (sel < 0) sel = 0;
  if (e.key === "Enter") { e.preventDefault(); if (items[sel]) items[sel].click(); return; }
  e.preventDefault();
  items.forEach((x) => x.classList.remove("sel"));
  sel = e.key === "ArrowDown" ? (sel + 1) % items.length : (sel - 1 + items.length) % items.length;
  items[sel].classList.add("sel");
});

(async () => { hasSavedSlot = await S.getStorage().hasSave(); render(); })();

// Pivot iteración 2026-05-25 — Performance tracing: agregamos tiempos por subsistema y los
// reportamos a console cada 5s real. Abrir DevTools (F12) > Console para ver [PERF] lines.
// Identifica cuál subsistema (advance / mapSync / panelRender / mapInfoPanel) consume más.
window.__perf = { advance: 0, mapSync: 0, panelRender: 0, mapInfo: 0, ticks: 0, slowest: 0, slowestWhat: "" };
let _lastPerfReport = performance.now();

// Velocidad real (Dani 2026-06-03): a 1x, 1 minuto de juego = 1 segundo real. El tick corre
// cada 100ms (10/s) → cada tick avanza speed*0.1 min: 1x=1min/s · 2x=2min/s · 5x=5min/s. Antes
// avanzaba speed*1 (10x más rápido), por eso aterrizajes/taxis pasaban en un parpadeo. El reloj
// queda fraccionario (formatClock lo redondea); todo el sim es delta-based sobre stepMinutes.
const MIN_PER_TICK_AT_1X = 0.1;
setInterval(() => {
  if (game.clock.speed === 0) return;
  const _tA = performance.now();
  S.advanceGame(game, game.clock.speed * MIN_PER_TICK_AT_1X);
  const _tB = performance.now();
  window.__perf.advance += (_tB - _tA);
  // Cierre Semanal (2026-05-30): si el sim cerró una semana (kpiHistory creció), pausar el
  // reloj y preparar el modal. Solo si no hay wizard ni game over por encima.
  // Auto-resync: si kpiHistory ENCOGIÓ (partida nueva o load), reajustar sin disparar.
  {
    const kpiLen = game.kpiHistory?.length ?? 0;
    if (kpiLen < lastKpiLen) {
      lastKpiLen = kpiLen;
    } else if (kpiLen > lastKpiLen) {
      lastKpiLen = kpiLen;
      if (newGameStep === null && !(game.gameOver && game.gameOver.isOver)) {
        weeklyCloseData = buildWeeklyCloseData();
        S.setGameSpeed(game, 0);
      }
    }
  }
  // Hito (2026-05-30): detectar nuevo contrato activo (nuevo cliente firmado).
  {
    const nActive = (game.contracts || []).filter(c => c.status === "active").length;
    if (nActive < lastActiveContracts) {
      lastActiveContracts = nActive; // resync (partida nueva / load)
    } else if (nActive > lastActiveContracts) {
      const wasInit = lastActiveContracts === 0; // el contrato inicial no dispara hito
      lastActiveContracts = nActive;
      if (!wasInit && newGameStep === null && !(game.gameOver && game.gameOver.isOver) && !weeklyCloseData) {
        milestoneData = buildMilestoneData();
        if (milestoneData) S.setGameSpeed(game, 0);
      }
    }
  }
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
  detectEvents();
  pumpEvents();
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
}, 100);

// ── Hook de debug para el plugin de captura (claude-render) ──────────────────
// Aislado, solo para herramientas de desarrollo/captura. Expone control mínimo del
// estado de UI para poder rasterizar vistas concretas en headless (saltar wizard, ir
// a una tab, sembrar un mecánico viajando para ver el furgo, leer coords del mapa).
// NO afecta a la jugabilidad: nadie lo llama salvo el screenshotter.
window.__mroDebug = {
  ready: true,
  skipWizard(){ newGameStep = null; invalidatePanelCache?.(); render(); return "wizard skipped"; },
  goView(tab){ newGameStep = null; activeTab = tab; invalidatePanelCache?.(); render(); return "view=" + tab; },
  state(){ return { activeTab, newGameStep, day: game?.clock?.minute, airplanes: game?.airplanes?.length, mechanics: game?.mechanics?.length, zoom: mapDriver?.camera?.zoom }; },
  // Control de cámara del mapa (para que el screenshotter acerque al apron y vea detalle).
  zoomIn(n){ for(let i=0;i<(n||1);i++) mapDriver?.zoomIn?.(); return mapDriver?.camera?.zoom; },
  zoomOut(n){ for(let i=0;i<(n||1);i++) mapDriver?.zoomOut?.(); return mapDriver?.camera?.zoom; },
  fitAll(){ mapDriver?.fitAll?.(); return mapDriver?.camera?.zoom; },
  // Inyecta un evento de prueba (callout/aog/...) para verificar el popup + enfoque del mapa.
  testEvent(type, standId){ eventQueue.push({ type: type || "callout", icon: type === "aog" ? "🛑" : "🔧", color: type === "aog" ? "#ff4757" : "#f5b945", title: (type || "callout") + " · prueba", standId: standId || "H1-S1", lines: ["Matrícula: EC-TEST · A320/CFM56", "Aerolínea: Volotea", "Stand: " + (standId || "H1-S1"), "Síntoma: evento de prueba para el popup"] }); newGameStep = null; activeTab = "map"; pumpEvents(); render(); return { queued: eventQueue.length }; },
  // Activa el tráfico de línea (schedule real OVD) para VER el passthrough en el mapa. El arg
  // minute (opcional) salta el reloj a una hora con tráfico (p.ej. 780 = 13:00). Devuelve cuántos.
  lineTraffic(minute){ try{ game.useScheduleArrivals=true; game.lineModeEnabled=true; if(typeof minute==="number" && game.clock) game.clock.minute=minute; if(game.clock) game.clock.speed=0; newGameStep=null; activeTab="map"; invalidatePanelCache?.(); render(); var ls=mapDriver&&mapDriver.lastState; return {line:true, min:game.clock&&game.clock.minute, passthrough:(ls&&ls.passthroughTraffic||[]).length, airplanes:(ls&&ls.airplanes||[]).length}; }catch(e){return {error:String(e)}} },
  // Centra la cámara en una coord normalizada [nx,ny] del OSM con zoom dado (inspección).
  // Usa la MISMA proyección que f5dProject (area = pad 400 sobre F5D_WORLD) y la convención de
  // cámara del driver (worldRoot.scale=zoom; pos = -camera*zoom). Centrar el punto = camera tal
  // que el punto caiga en el centro de pantalla.
  focusNorm(nx, ny, zoom){
    if (!mapDriver || mapDriver.theme !== "f5d" || !mapDriver.app) return "no f5d driver";
    const z = Math.max(0.2, Math.min(8, zoom || 3));
    const W = mapDriver.app.screen.width, H = mapDriver.app.screen.height;
    const FW = 6000, FH = 4800, pad = 400;
    const wx = pad + nx * (FW - pad*2), wy = pad + ny * (FH - pad*2);
    mapDriver.camera.zoom = z;
    // worldRoot.position = camera*zoom (ver línea ~651). Para centrar: camera = (screen/2)/zoom - world
    mapDriver.camera.x = (W / 2) / z - wx;
    mapDriver.camera.y = (H / 2) / z - wy;
    // Solo mover la transform de la cámara (NO re-aplicar lastState, que estaría obsoleto).
    if (mapDriver.worldRoot){ mapDriver.worldRoot.scale.set(z); mapDriver.worldRoot.position.set(mapDriver.camera.x*z, mapDriver.camera.y*z); }
    return { z, wx: Math.round(wx), wy: Math.round(wy) };
  },
  // Siembra un mecánico viajando a un stand ocupado para VER el furgo en el mapa.
  seedVan(simStandId, mode){
    try {
      // Pausa el reloj: si no, el tick (advanceGame) devuelve el mecánico a Idle y borra el
      // avión/WO sintéticos antes de la captura. Pausado, el furgo sembrado persiste.
      try { S.setGameSpeed(game, 0); } catch(e){}
      if (game.clock) game.clock.speed = 0;
      const sid = simStandId || "H1-S2";
      const vanMode = mode || "transit"; // "transit" (ToPlane) | "working" (pegado al stand)
      // sync.ts deriva destStandId del furgo desde m.assignedWoInstanceId → WO → airplane.standId
      // (NO de m.destStandId). Así que para VER el furgo hay que crear esa cadena real:
      // 1) un avión EN ese stand, 2) una WO sobre ese avión, 3) el mec asignado a la WO en ToPlane.
      let ap = game.airplanes.find(a=>a.standId===sid && a.status!=="Departed");
      if (!ap) { ap = game.airplanes.find(a=>a.status!=="Departed"); if (ap) ap.standId = sid; }
      if (!ap) {
        // No hay aviones (partida recién creada 06:00) → fabricamos uno sintético en el stand.
        ap = { instanceId: "DBG-AP-1", registration: "EC-DBG", model: "A320", engineVariant: "CFM56",
          contractId: (game.contracts[0] && game.contracts[0].id) || "C-1", standId: sid,
          arrivalMinute: game.clock.minute, scheduledDepartureMinute: game.clock.minute+600,
          status: "OnGround", flightHoursThisLeg: 2 };
        game.airplanes.push(ap);
      }
      // sync.ts marca taxiing si arrivalMinute cae dentro de TAXIING_DURATION_MIN (=4). Modo
      // "transit" → arrival hace 2 min → taxiing a mitad de ruta (ver el TRÁNSITO por los puntos
      // de Dani). Resto → arrival hace 120 min → ya aparcado (avioncito en el stand).
      ap.arrivalMinute = (vanMode === "transit") ? (game.clock.minute - 2) : (game.clock.minute - 120);
      ap.status = "OnGround";
      // WO sobre ese avión (reusa una existente o fabrica una mínima coherente)
      let wo = game.workOrders.find(w=>w.airplaneInstanceId===ap.instanceId && w.phase!=="Completed" && w.phase!=="Failed");
      if (!wo) {
        const tpl = game.templates[0];
        wo = { instanceId: "DBG-WO-1", templateId: tpl.id, airplaneInstanceId: ap.instanceId,
          airplaneRegistration: ap.registration, emissionMinute: game.clock.minute, slaMinute: game.clock.minute+9999,
          phase: "ToPlane", phaseElapsedMinutes: 0, assignedMechanicIds: [], scopeRevealed: true };
        game.workOrders.push(wo);
      }
      // En modo "working" la WO pasa a MainTask → sync deriva displayState=working (avión verde)
      // y hasMechWorking=true; así el avioncito sale con el color de estado correcto.
      if (vanMode === "working") wo.phase = "MainTask";
      // Mecánico asignado a esa WO, viajando a media (progress 0.5 → stateRemainingMinutes = travel/2).
      const m = game.mechanics.find(x=>!x.isLeadForeman) || game.mechanics[0];
      if (m){
        m.state = vanMode === "working" ? "Working" : "ToPlane";
        m.assignedWoInstanceId = wo.instanceId;
        m.assignedCheckInstanceId = null;
        const travel = (g => g && g[sid] ? g[sid] : (game.balance.officeToStandMinutes||2))(game.standTravelMinutes);
        m.stateRemainingMinutes = vanMode === "working" ? 0 : travel * 0.5;
        if (!wo.assignedMechanicIds.includes(m.id)) wo.assignedMechanicIds.push(m.id);
      }
      newGameStep = null; activeTab = "map"; invalidatePanelCache?.(); render();
      return { seeded: true, stand: sid, mech: m?.id, wo: wo.instanceId, apReg: ap.registration };
    } catch(e){ return { error: String(e) }; }
  },
  // Siembra una CUADRILLA entera (oficial + helpers) viajando/trabajando para VER la furgo por
  // cuadrilla en el mapa. mode "transit"|"working". crewId opcional (default: 1ª cuadrilla).
  seedCrew(crewId, simStandId, mode){
    try {
      try { S.setGameSpeed(game, 0); } catch(e){}
      if (game.clock) game.clock.speed = 0;
      var sid = simStandId || "H1-S1";
      var vanMode = mode || "transit";
      var crew = (game.crews||[]).find(function(c){ return c.id===crewId; }) || (game.crews||[])[0];
      if (!crew) return { error: "no crews" };
      var ap = game.airplanes.find(function(a){ return a.standId===sid && a.status!=="Departed"; });
      if (!ap) { ap = game.airplanes.find(function(a){ return a.status!=="Departed"; }); if (ap) ap.standId = sid; }
      if (!ap) {
        ap = { instanceId:"DBG-AP-1", registration:"EC-DBG", model:"A320", engineVariant:"CFM56", contractId:(game.contracts[0]&&game.contracts[0].id)||"C-1", standId:sid, arrivalMinute:game.clock.minute, scheduledDepartureMinute:game.clock.minute+600, status:"OnGround", flightHoursThisLeg:2 };
        game.airplanes.push(ap);
      }
      ap.arrivalMinute = game.clock.minute - 120; ap.status = "OnGround";
      var wo = game.workOrders.find(function(w){ return w.airplaneInstanceId===ap.instanceId && w.phase!=="Completed" && w.phase!=="Failed"; });
      if (!wo) {
        var tpl = game.templates[0];
        wo = { instanceId:"DBG-WO-1", templateId:tpl.id, airplaneInstanceId:ap.instanceId, airplaneRegistration:ap.registration, emissionMinute:game.clock.minute, slaMinute:game.clock.minute+9999, phase:"ToPlane", phaseElapsedMinutes:0, assignedMechanicIds:[], scopeRevealed:true };
        game.workOrders.push(wo);
      }
      if (vanMode === "working") wo.phase = "MainTask";
      var memberIds = crew.officerIds.concat(crew.helperIds).slice(0,3);
      wo.assignedMechanicIds = memberIds;
      var stm = game.standTravelMinutes; var travel = (stm && stm[sid]) ? stm[sid] : (game.balance.officeToStandMinutes||2);
      memberIds.forEach(function(id){
        var mm = game.mechanics.find(function(x){ return x.id===id; });
        if (mm){ mm.state = vanMode==="working" ? "Working" : "ToPlane"; mm.assignedWoInstanceId = wo.instanceId; mm.assignedCheckInstanceId=null; mm.stateRemainingMinutes = vanMode==="working"?0:travel*0.5; }
      });
      newGameStep=null; activeTab="map"; invalidatePanelCache?.(); render();
      return { seeded:true, crew:crew.id, members:memberIds.length, stand:sid };
    } catch(e){ return { error:String(e) }; }
  },
  // Abre la ficha de una WO SIN asignar (para ver/probar los botones de 'Mandar cuadrilla').
  dbgOpenWo(simStandId){
    try {
      if (game.clock) game.clock.speed = 0;
      var sid = simStandId || "H1-S1";
      var ap = game.airplanes.find(function(a){ return a.status!=="Departed"; });
      if (!ap) { ap = { instanceId:"DBG-AP-1", registration:"EC-DBG", model:"A320", engineVariant:"CFM56", contractId:(game.contracts[0]&&game.contracts[0].id)||"C-1", standId:sid, arrivalMinute:game.clock.minute-120, scheduledDepartureMinute:game.clock.minute+600, status:"OnGround", flightHoursThisLeg:2 }; game.airplanes.push(ap); }
      else { ap.standId = sid; ap.arrivalMinute = game.clock.minute-120; ap.status="OnGround"; }
      var wo = { instanceId:"DBG-WO-OPEN", templateId:game.templates[0].id, airplaneInstanceId:ap.instanceId, airplaneRegistration:ap.registration, emissionMinute:game.clock.minute, slaMinute:game.clock.minute+9999, phase:"ToPlane", phaseElapsedMinutes:0, assignedMechanicIds:[], scopeRevealed:true };
      game.workOrders.push(wo);
      selectedWoId = wo.instanceId; activeTab="operations"; newGameStep=null; invalidateModalCache?.(); invalidatePanelCache?.(); render();
      return { woId: wo.instanceId, reqCat: game.templates[0].requiredCategory };
    } catch(e){ return { error:String(e) }; }
  },
  // Lectura de depuración: mecánicos asignados a una WO (para verificar el dispatch de cuadrilla).
  woMechs(woId){
    var wo = game.workOrders.find(function(w){ return w.instanceId===woId; });
    if (!wo) return { error:"no wo" };
    var names = wo.assignedMechanicIds.map(function(id){ var m=game.mechanics.find(function(x){return x.id===id;}); return m?m.name:id; });
    return { assigned: wo.assignedMechanicIds.length, names: names, phase: wo.phase };
  },
  // Centra la cámara en la posición REAL del furgo (la que pintó renderF5DScaffold), con zoom
  // dado. Así no hay que adivinar coords: enfoca exactamente donde está el furgo.
  focusVan(zoom){
    const w = mapDriver && mapDriver._lastVanWorld;
    if (!w || !mapDriver.app) return "no van rendered";
    const z = Math.max(0.2, Math.min(8, zoom || 4));
    const W = mapDriver.app.screen.width, H = mapDriver.app.screen.height;
    mapDriver.camera.zoom = z;
    mapDriver.camera.x = (W / 2) / z - w.x;
    mapDriver.camera.y = (H / 2) / z - w.y;
    // NO re-aplicar lastState (estaría obsoleto y borraría el furgo recién sembrado). Solo
    // movemos la transform de la cámara; el contenido ya está dibujado por el render del seedVan.
    if (mapDriver.worldRoot){ mapDriver.worldRoot.scale.set(z); mapDriver.worldRoot.position.set(mapDriver.camera.x*z, mapDriver.camera.y*z); }
    return { z, van: { x: Math.round(w.x), y: Math.round(w.y) } };
  },
  // ── MODO MARCADOR con GRUPOS (2026-06-02): Dani pulsa M, elige grupo con teclas 1-9
  // (1=pista, 2=taxi, 3=oficina... el nombre lo decide la tabla _markGroupNames), y CLICA.
  // Cada click añade la coord OSM [0..1] al grupo activo, la copia al portapapeles y la muestra.
  _markGroups: {},          // { pista:[[x,y]...], taxi:[...] }
  _markGroup: "pista",      // grupo activo
  _markGroupNames: { "1":"pista", "2":"taxi", "3":"oficina", "4":"transito", "5":"g5", "6":"g6", "7":"g7", "8":"g8", "9":"g9" },
  _markOn: false,
  _markHud(){
    const h = document.getElementById("mark-hud"); if (!h) return;
    const g = this._markGroups; const keys = Object.keys(g);
    let txt = "📍 MARCADOR · grupo activo: [" + this._markGroup + "]  (teclas 1-9 cambian grupo)\\n";
    txt += "1=pista 2=taxi 3=oficina 4=transito\\n";
    for (const k of keys) txt += k + " (" + g[k].length + "): " + JSON.stringify(g[k]) + "\\n";
    txt += "(C=limpiar · M=salir · todo copiado al portapapeles)";
    h.textContent = txt;
  },
  _markCopy(){ try { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(this._markGroups)); } catch(e){} },
  setMarkGroup(name){ this._markGroup = name; if(!this._markGroups[name]) this._markGroups[name]=[]; this._markHud(); return "grupo: "+name; },
  toggleMark(){
    this._markOn = !this._markOn;
    let hud = document.getElementById("mark-hud");
    if (this._markOn) {
      if (!hud) {
        hud = document.createElement("div"); hud.id = "mark-hud";
        hud.style.cssText = "position:fixed;top:56px;left:50%;transform:translateX(-50%);z-index:99999;background:#0a1428;color:#f5b945;border:1px solid #f5b945;border-radius:8px;padding:.5rem .9rem;font:12px JetBrains Mono,monospace;white-space:pre;box-shadow:0 6px 24px rgba(0,0,0,.6);pointer-events:none;text-align:left;max-width:90vw";
        document.body.appendChild(hud);
      }
      if (!this._markGroups[this._markGroup]) this._markGroups[this._markGroup] = [];
      this._markHud();
      const host = document.getElementById("pixi-host");
      const canvas = host && host.querySelector("canvas");
      if (canvas && !this._markHandler) {
        this._markHandler = (ev) => {
          if (!this._markOn || !mapDriver || !mapDriver.app) return;
          const rect = mapDriver.app.canvas.getBoundingClientRect();
          const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
          const wx = mx / mapDriver.camera.zoom - mapDriver.camera.x;
          const wy = my / mapDriver.camera.zoom - mapDriver.camera.y;
          const FW = 6000, FH = 4800, pad = 400;
          const nx = (wx - pad) / (FW - pad*2), ny = (wy - pad) / (FH - pad*2);
          const pt = [Math.round(nx*1000)/1000, Math.round(ny*1000)/1000];
          if (!this._markGroups[this._markGroup]) this._markGroups[this._markGroup] = [];
          this._markGroups[this._markGroup].push(pt);
          this._markCopy(); this._markHud();
          console.log("[MARK " + this._markGroup + "]", pt, this._markGroups);
        };
        canvas.addEventListener("pointerdown", this._markHandler, true);
        this._markCanvas = canvas;
      }
      return "marcador ON · grupo [" + this._markGroup + "] · teclas 1-9 cambian grupo";
    } else {
      if (hud) hud.textContent = "📍 MARCADOR OFF · " + JSON.stringify(this._markGroups);
      return { off: true, groups: this._markGroups };
    }
  },
  markClear(){ this._markGroups = {}; this._markGroup = "pista"; const h=document.getElementById("mark-hud"); if(h)h.textContent="📍 limpiado"; return "limpio"; },
  markPoints(){ return this._markGroups; },
};`;

await main();
