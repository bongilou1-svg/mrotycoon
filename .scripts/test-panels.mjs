// Runtime smoke de los paneles rediseñados (CIC). smoke-render solo PARSEA APP_JS;
// esto lo EJECUTA con un mock DOM y llama a renderOperations/renderOffice/renderSchedule
// + el cajón de vuelo, con un game lineMode seedeado. Caza ReferenceErrors y typos de
// propiedad que el parse no ve. Uso: node .scripts/test-panels.mjs [builds/_scratch.html]
import { readFileSync } from "node:fs";

const path = process.argv[2] || "builds/_scratch.html";
const html = readFileSync(path, "utf-8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

// ---- mocks ----
const mkEl = () => ({
  innerHTML: "", textContent: "", value: "", className: "", id: "",
  style: new Proxy({}, { get: () => "", set: () => true }),
  classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  dataset: {},
  appendChild(){}, removeChild(){}, setAttribute(){}, removeAttribute(){},
  addEventListener(){}, removeEventListener(){},
  querySelector(){ return mkEl(); }, querySelectorAll(){ return []; },
  getContext(){ return null; }, getBoundingClientRect(){ return { width: 800, height: 600, top: 0, left: 0 }; },
  offsetWidth: 800, offsetHeight: 600, focus(){}, closest(){ return null; }, remove(){},
});
const elCache = {};
const document = {
  getElementById(id){ return elCache[id] || (elCache[id] = mkEl()); },
  querySelector(){ return mkEl(); }, querySelectorAll(){ return []; },
  createElement(){ return mkEl(); },
  body: { ...mkEl(), addEventListener(){}, appendChild(){} },
  documentElement: mkEl(), addEventListener(){}, removeEventListener(){},
};
const noopTimer = () => 0;
const win = {
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  addEventListener(){}, removeEventListener(){},
  matchMedia(){ return { matches: false, addEventListener(){}, removeEventListener(){} }; },
  ResizeObserver: class { observe(){} unobserve(){} disconnect(){} },
  location: { href: "http://local/" }, navigator: { userAgent: "node" },
};
const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){}, clear(){} };
const performance = { now(){ return 0; } };

function fail(msg, e){ console.error("✗ " + msg + ": " + (e?.message || e)); if (e?.stack) console.error(e.stack.split("\n").slice(1,4).join("\n")); process.exit(1); }

// ---- Sim + Render ----
let Sim, Render;
try { Sim = new Function("window", "localStorage", `${scripts[0]}; return window.Sim;`)(win, localStorage); }
catch (e) { fail("Sim eval", e); }
try { Render = new Function("window", "localStorage", `${scripts[1]}; return window.Render;`)(win, localStorage); }
catch (e) { fail("Render eval", e); }
win.Sim = Sim; win.Render = Render;
console.log(`✓ Sim (${Object.keys(Sim).length} exports) + Render OK`);

// ---- APP_JS con exposición de funciones internas ----
const expose = `
;globalThis.__t = {
  ops(){ return renderOperations(); },
  off(){ return renderOffice(); },
  sch(){ return renderSchedule(); },
  feed(){ return buildEventFeed(); },
  flight(k){ detailFlightId = k; return renderFlightDrawer(); },
  reseed(){ game = S.createGame(S.DATA.balance, S.DATA.airlines, S.DATA.workOrders, 42, [], S.DATA.dailyChecks, { lineMode: true }); },
  tick(total, step){ const s = step || 30; for (let i = 0; i < total; i += s) S.advanceGame(game, s); },
  injectWO(opts){
    const o = opts || {};
    const tpl = game.templates.find(t => !t.isDailyCheck && (o.aog ? t.isAOG : true)) || game.templates.find(t => !t.isDailyCheck) || game.templates[0];
    const apId = "ALI-TEST" + game.workOrders.length;
    game.airplanes.push({ instanceId: apId, registration: o.reg || "EC-TST", model: "A320", engineVariant: "CFM56", contractId: (game.contracts[0] && game.contracts[0].id) || "c0", standId: "351", arrivalMinute: game.clock.minute, scheduledDepartureMinute: game.clock.minute + 120, status: "InMaintenance", flightHoursThisLeg: 2, arrivalCallsign: "TST100", nextDepartureCallsign: "TST101" });
    const woId = "WO-TEST" + game.workOrders.length;
    game.workOrders.push({ instanceId: woId, templateId: tpl.id, airplaneRegistration: o.reg || "EC-TST", airplaneInstanceId: apId, emissionMinute: game.clock.minute, assignedMechanicIds: o.team || [], phase: o.phase || "ToPlane", phaseElapsedMinutes: 0, slaMinute: game.clock.minute + (o.sla != null ? o.sla : 40) });
    return woId;
  },
  setTab(t){ activeTab = t; },
  setVariant(v){ variant = v; },
  setOfficeSub(s){ officeSubtab = s; },
  setSit(f){ sitFilter = f; },
  modalWith(state){ selectedWoId = state.wo || null; detailMechId = state.mech || null; detailFlightId = state.flight || null; lastModalHtml = ""; renderModal(); return document.getElementById("modal-content").innerHTML; },
  game(){ return game; },
};`;
try {
  new Function("window", "document", "localStorage", "performance", "navigator",
    "requestAnimationFrame", "cancelAnimationFrame", "setInterval", "clearInterval", "setTimeout", "clearTimeout", "console", "alert", "confirm",
    scripts[2] + expose)
    (win, document, localStorage, performance, win.navigator, noopTimer, noopTimer, noopTimer, noopTimer, noopTimer, noopTimer, console, () => {}, () => true);
} catch (e) { fail("APP_JS eval/bootstrap", e); }
console.log("✓ APP_JS bootstrap OK (sin throw al cargar)");

const t = globalThis.__t;
// Seed lineMode para tener mecánicos/contratos/flights reales.
try { t.reseed(); } catch (e) { fail("reseed lineMode", e); }
// Avanzar ~20h en pasos de 30 min para que lleguen aviones y se generen WOs/callouts.
try { t.tick(20 * 60, 30); } catch (e) { fail("tick (advanceGame)", e); }
const g = t.game();
const feed = t.feed();
console.log(`✓ game lineMode tras 20h: ${g.mechanics.length} mecs · ${g.contracts.length} contratos · ${g.workOrders.length} WOs · feed ${feed.length} eventos`);

function checkPanel(name, fn, mustInclude){
  let html;
  try { html = fn(); } catch (e) { fail(name + " render", e); }
  if (typeof html !== "string") fail(name, "no devolvió string");
  for (const cls of mustInclude) {
    if (!html.includes(cls)) { console.error(`✗ ${name}: falta "${cls}" en el HTML`); process.exit(1); }
  }
  console.log(`✓ ${name} (${html.length} chars)`);
}

t.setTab("operations");
t.setVariant("triage"); checkPanel("Ops · Triaje", t.ops, ["sitbar", "vswitch", feed.length ? "evt" : "sitbar"]);
t.setVariant("tele");   checkPanel("Ops · Telemetría", t.ops, ["sitbar", feed.length ? "trow" : "sitbar"]);
t.setVariant("board");  checkPanel("Ops · Tablero", t.ops, ["board", "col-head"]);
t.setVariant("triage");
// filtro de tile
t.setSit("unassigned"); checkPanel("Ops · filtro sit", t.ops, ["sitbar"]); t.setSit(null);

t.setTab("office");
t.setOfficeSub("team");       checkPanel("Oficina · Equipo", t.off, ["sitbar", "cov", "mgrid"]);
t.setOfficeSub("hiring");     checkPanel("Oficina · Contratación", t.off, ["subtab"]);
t.setOfficeSub("management"); checkPanel("Oficina · Management", t.off, ["mgmt-toggle"]);
t.setOfficeSub("team");

t.setTab("schedule");
checkPanel("Schedule", t.sch, ["ftable", "frow", "st-pill"]);

// cajón de vuelo
const flights = Sim.getFlightsForGameDay(1);
if (flights.length) { const f = flights[0]; checkPanel("Cajón vuelo", () => t.flight(`${f.callsign}|${f.type}|${f.scheduledMinute}`), ["dw-head", "dw-body"]); }

// modales dentro del cajón (renderModal escribe en #modal-content)
if (g.workOrders.length) checkPanel("Modal WO", () => t.modalWith({ wo: g.workOrders[0].instanceId }), ["modal"]);
if (g.mechanics.length)  checkPanel("Modal mecánico", () => t.modalWith({ mech: g.mechanics[0].id }), ["modal"]);

// sanity: el feed con eventos debe traer campos estructurados del enrich
if (feed.length) {
  const woEv = feed.find(e => e.kind === "wo");
  if (woEv && !("assignState" in woEv)) { console.error("✗ enrichEvent no añadió assignState a evento wo"); process.exit(1); }
  console.log(`✓ enrichEvent OK (ej: ${woEv ? woEv.reg + " · " + woEv.assignState + " · sla " + woEv.slaMin : "sin wo"})`);
}
// ---- forzar el camino con datos: inyectar WOs (unassigned, en curso, AOG) ----
const woUnassigned = t.injectWO({ reg: "EC-NQM", sla: 24, aog: true });
const woWorking = t.injectWO({ reg: "EC-OKG", team: [g.mechanics[0] && g.mechanics[0].id].filter(Boolean), phase: "MainTask", sla: 80 });
const feed2 = t.feed();
console.log(`✓ inyectados WOs · feed ahora ${feed2.length} eventos`);
const woEv = feed2.find(e => e.kind === "wo");
if (!woEv) { console.error("✗ el WO inyectado no aparece en buildEventFeed"); process.exit(1); }
for (const k of ["reg","model","sev","aog","slaMin","assignState","alColor"]) {
  if (!(k in woEv)) { console.error(`✗ enrichEvent: falta campo "${k}" en evento wo`); process.exit(1); }
}
console.log(`✓ enrichEvent wo: reg=${woEv.reg} sev=${woEv.sev} aog=${woEv.aog} sla=${woEv.slaMin} asg=${woEv.assignState} al=${woEv.alName||"—"}`);
t.setTab("operations");
t.setVariant("triage"); checkPanel("Ops · Triaje (con WOs)", t.ops, ["evt", "rail", "asg", "ring"]);
t.setVariant("tele");   checkPanel("Ops · Telemetría (con WOs)", t.ops, ["trow", "slabar"]);
t.setVariant("board");  checkPanel("Ops · Tablero (con WOs)", t.ops, ["bcard"]);
t.setVariant("triage");
checkPanel("Modal WO (cajón dw-*)", () => t.modalWith({ wo: woUnassigned }), ["dw-head", "dw-kpis", "dw-rail"]);
console.log("\n✓✓ TODOS LOS PANELES + VARIANTES + CAJONES + WOs REALES RENDERIZAN SIN ERROR");
