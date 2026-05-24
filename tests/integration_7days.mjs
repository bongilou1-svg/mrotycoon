// INTEGRATION TEST: simula 7 días completos.
// 1. Carga datos
// 2. Crea state inicial (contratos, mecánicos, economía, reputación)
// 3. Loop diario: genera arrivals → al llegar genera WOs → auto-asigna → tick state machine
// 4. Cierre semanal al final del día 7
// 5. Snapshot HTML con stats

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createRng } from "../src/lib/sim/rng.ts";
import { createClock, tick, advance, DAY_MINUTES, WEEK_MINUTES, formatClock, getDay } from "../src/lib/sim/time.ts";
import { generateInitialContracts, activeContracts, expireOffers } from "../src/lib/sim/contracts.ts";
import { generateDailyArrivals, assignStand, updateAirplaneStatuses, airplanesOnStand } from "../src/lib/sim/airplanes.ts";
import { generateInitialFleet, resetAirplaneInstanceCounter } from "../src/lib/sim/fleet.ts";
import { rollWoOnLanding, _resetInstanceCounter, countByPhase, activeWorkOrders } from "../src/lib/sim/workorders.ts";
import { generateInitialMechanics, eligibleCertifiers } from "../src/lib/sim/mechanics.ts";
import { assignMechanicsToWo, tickMechanicTravel } from "../src/lib/sim/assignment.ts";
import { tickWorkOrders } from "../src/lib/sim/wo_state_machine.ts";
import {
  createEconomy, addTransaction, applyWeeklyClose, payForCompletedWo,
  recentIncome, recentExpenses, _resetTxCounter,
} from "../src/lib/sim/economy.ts";
import { createReputation, applyDelta, reputationDeltaForWo } from "../src/lib/sim/reputation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const balance = JSON.parse(readFileSync(join(root, "src/lib/data/balance.json")));
const airlines = JSON.parse(readFileSync(join(root, "src/lib/data/airlines.json")));
const templates = JSON.parse(readFileSync(join(root, "src/lib/data/workorders.json")));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== INTEGRATION: 7 días con sim completo ===");
_resetInstanceCounter();
_resetTxCounter();
resetAirplaneInstanceCounter(0);

const rng = createRng(42);
const machineRng = createRng(99);
const woRng = createRng(7);

let clock = createClock(0, 1);
let fleet = generateInitialFleet(rng, airlines);
let contracts = generateInitialContracts(rng, airlines);
let mechanics = generateInitialMechanics(rng, balance);
let airplanes = [];
let workOrders = [];
let economy = createEconomy(balance.startingBalance);
let reputation = createReputation(balance.startingReputation, airlines);

// Generate arrivals for 7 days for active contracts
const DAY_M = 24 * 60;
for (let day = 1; day <= 7; day++) {
  const dayStart = (day - 1) * DAY_M;
  const dayEnd = day * DAY_M;
  const busyToday = new Set(
    airplanes.filter(a => a.arrivalMinute < dayEnd && a.scheduledDepartureMinute > dayStart).map(a => a.registration),
  );
  for (const c of activeContracts(contracts)) {
    const al = airlines.find(a => a.id === c.airlineId);
    if (!al) continue;
    const { arrivals, updatedFleet } = generateDailyArrivals(rng, c, al, balance, day, fleet, busyToday);
    fleet = updatedFleet;
    for (const arr of arrivals) {
      const stand = assignStand(arr, airplanes);
      airplanes.push({ ...arr, standId: stand });
      busyToday.add(arr.registration);
    }
  }
}
console.log(`  · Aviones generados en 7 días: ${airplanes.length}`);

// Simulation loop — tick por minuto. Resolución 1 min, demasiado fino para 7 días (10080 ticks).
// Optimizamos: tick por 5 min cada paso. 7 días = 2016 ticks.
const STEP_MIN = 5;
let stats = {
  arrivedAirplanes: 0,
  wosGenerated: 0,
  wosCompleted: 0,
  wosFailed: 0,
  wosCompletedOnTime: 0,
  wosCompletedLate: 0,
  unassignedAtTickEnd: 0,
  weeklyCloseApplied: false,
};

const recentEvents = []; // últimas 20 events

while (clock.minute < 7 * DAY_MINUTES) {
  const now = clock.minute;

  // 1. Detectar aviones que aterrizan en este intervalo
  const justArrived = airplanes.filter(p => p.arrivalMinute > now - STEP_MIN && p.arrivalMinute <= now);
  for (const p of justArrived) {
    stats.arrivedAirplanes++;
    // Generar WO?
    const wo = rollWoOnLanding(woRng, p, templates, balance);
    if (wo) {
      workOrders.push(wo);
      stats.wosGenerated++;
      recentEvents.push({ minute: now, type: "wo_created", text: `${p.registration}: ${templates.find(t => t.id === wo.templateId).description.slice(0, 50)}` });
    }
  }

  // 2. Auto-asignar WOs no asignadas — primer certifier eligible
  const unassigned = workOrders.filter(w => w.assignedMechanicIds.length === 0 && w.phase === "ToPlane");
  for (const wo of unassigned) {
    const template = templates.find(t => t.id === wo.templateId);
    const ap = airplanes.find(a => a.instanceId === wo.airplaneInstanceId);
    if (!template || !ap) continue;
    const certs = eligibleCertifiers(mechanics, template, ap.model, ap.engineVariant);
    if (certs.length === 0) continue;
    const res = assignMechanicsToWo(mechanics, workOrders, wo.instanceId, certs[0].id, [], balance);
    if (!res.error) {
      mechanics = res.mechanics;
      workOrders = res.workOrders;
    }
  }

  // 3. Tick travel
  const travelRes = tickMechanicTravel(mechanics, workOrders, STEP_MIN);
  mechanics = travelRes.mechanics;
  workOrders = travelRes.workOrders;

  // 4. Tick state machine
  const machineRes = tickWorkOrders(workOrders, mechanics, templates, balance, STEP_MIN, machineRng, now + STEP_MIN);
  mechanics = machineRes.mechanics;
  workOrders = machineRes.workOrders;
  for (const ev of machineRes.events) {
    if (ev.type === "wo_completed") {
      stats.wosCompleted++;
      const wo = workOrders.find(w => w.instanceId === ev.woInstanceId);
      const template = templates.find(t => t.id === ev.templateId);
      const ap = airplanes.find(a => a.instanceId === wo?.airplaneInstanceId);
      const c = contracts.find(cc => cc.id === ap?.contractId);
      if (wo && template && c) {
        const txs = payForCompletedWo(template, wo, c, balance, ev.onTime, now);
        for (const tx of txs) economy = addTransaction(economy, tx);
      }
      const repDelta = reputationDeltaForWo(balance, ev.onTime ? "completedOnTime" : "completedLate");
      if (c) reputation = applyDelta(reputation, c.airlineId, repDelta);
      if (ev.onTime) stats.wosCompletedOnTime++;
      else stats.wosCompletedLate++;
      recentEvents.push({ minute: now, type: "wo_completed", text: `${ev.woInstanceId} ${ev.onTime ? "on-time" : "LATE"}${ev.isAOG ? " (AOG)" : ""}` });
    }
  }

  // 5. Tick clock
  clock = advance(clock, STEP_MIN);

  // 6. Si cruzamos semana, aplicar cierre semanal
  if (Math.floor((now + STEP_MIN) / WEEK_MINUTES) > Math.floor(now / WEEK_MINUTES)) {
    const closeRes = applyWeeklyClose(economy, contracts, mechanics, balance, now + STEP_MIN);
    economy = closeRes.eco;
    stats.weeklyCloseApplied = true;
    recentEvents.push({ minute: now + STEP_MIN, type: "weekly_close", text: `Cierre semanal aplicado` });
  }

  // Contractos: expirar ofertas
  contracts = expireOffers(contracts, clock.minute);
}

stats.unassignedAtTickEnd = workOrders.filter(w => w.assignedMechanicIds.length === 0 && w.phase === "ToPlane").length;

// Validar coherencia
expect(stats.arrivedAirplanes >= 5, `≥ 5 aviones llegaron en 7 días (got ${stats.arrivedAirplanes})`);
expect(stats.wosGenerated >= 3, `≥ 3 WOs generadas (got ${stats.wosGenerated})`);
expect(stats.wosCompleted >= 1, `≥ 1 WO completada (got ${stats.wosCompleted})`);
expect(stats.weeklyCloseApplied, "cierre semanal aplicado");
expect(economy.ledger.length > 0, "ledger tiene transacciones");
expect((Object.values(reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(reputation.perAirline).length)) >= 0 && (Object.values(reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(reputation.perAirline).length)) <= 100, `reputación ${(Object.values(reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(reputation.perAirline).length))} en rango`);

const woRatio = stats.wosGenerated / stats.arrivedAirplanes;
expect(woRatio >= 0.3 && woRatio <= 0.7, `WO ratio ≈ 50% Fase 4 audit (got ${(woRatio * 100).toFixed(0)}%)`);

console.log(`\n--- STATS FINALES ---`);
console.log(`  Día final: ${getDay(clock.minute)}`);
console.log(`  Aviones llegados: ${stats.arrivedAirplanes}`);
console.log(`  WOs generadas: ${stats.wosGenerated}`);
console.log(`  WOs completadas: ${stats.wosCompleted} (${stats.wosCompletedOnTime} on-time, ${stats.wosCompletedLate} late)`);
console.log(`  Balance final: ${economy.balance.toLocaleString()} EUR`);
console.log(`  Reputación: ${(Object.values(reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(reputation.perAirline).length))}/100`);
console.log(`  Transacciones: ${economy.ledger.length}`);
const ingresos = recentIncome(economy, 0);
const gastos = recentExpenses(economy, 0);
console.log(`  Ingresos: ${ingresos.toLocaleString()} EUR · Gastos: ${gastos.toLocaleString()} EUR`);

// === SNAPSHOT HTML ===
const snapshotPath = join(root, "builds/bloque-c-snapshot.html");
const html = renderSnapshot();
writeFileSync(snapshotPath, html, "utf-8");
console.log(`\n  Snapshot HTML: ${snapshotPath}`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);

function renderSnapshot() {
  const phaseCounts = countByPhase(workOrders);
  const phasesHtml = Object.entries(phaseCounts).map(([p, n]) =>
    `<span class="chip">${p}: ${n}</span>`).join("");

  const mechRows = mechanics.map(m => `
    <tr>
      <td class="mono">${m.id}</td>
      <td>${m.name}</td>
      <td>${m.base ?? "Helper"}</td>
      <td class="mono">${m.efficiency}</td>
      <td><span class="state state-${m.state}">${m.state}</span></td>
      <td class="mono">${m.weeklySalary.toLocaleString()} €/sem</td>
    </tr>`).join("");

  const last20Events = recentEvents.slice(-20).reverse().map(e => `
    <li class="event event-${e.type}">
      <span class="mono">${formatClock(e.minute)}</span>
      <span>${e.text}</span>
    </li>`).join("");

  const last30Txs = economy.ledger.slice(-30).reverse().map(t => `
    <tr>
      <td class="mono">${formatClock(t.minute)}</td>
      <td>${t.type}</td>
      <td>${t.description}</td>
      <td class="mono ${t.amount < 0 ? "neg" : "pos"}">${t.amount > 0 ? "+" : ""}${t.amount.toLocaleString()} €</td>
    </tr>`).join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="UTF-8">
<title>MRO Tycoon — Snapshot Bloque C (7 días simulados)</title>
<style>
:root { --bg:#0d1117; --panel:#161b22; --border:#2a3142; --text:#e6e9ef; --muted:#8b95a8; --accent:#4da3ff; --success:#3fb950; --warning:#d29922; --danger:#f85149; --mono:"JetBrains Mono",monospace; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:14px/1.5 "Inter",system-ui,sans-serif; }
.hud { display:flex; justify-content:space-between; align-items:center; padding:.5rem 1rem; background:var(--panel); border-bottom:1px solid var(--border); }
.brand { font-weight:600; color:var(--accent); }
.ver { font-family:var(--mono); font-size:.8rem; color:var(--muted); margin-left:.75rem; }
.content { padding:1.5rem; max-width:1400px; margin:0 auto; }
h1 { font-size:1.3rem; margin:0 0 .5rem; }
.subtitle { color:var(--muted); margin-bottom:1.5rem; }
.banner { background:rgba(63,185,80,.1); border:1px solid var(--success); border-radius:4px; padding:.5rem 1rem; margin-bottom:1.5rem; color:var(--success); font-size:.85rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:1rem; margin-bottom:1.5rem; }
.card { background:var(--panel); border:1px solid var(--border); border-radius:6px; padding:1rem 1.25rem; }
.card h2 { font-size:.95rem; margin:0 0 .75rem; border-bottom:1px solid var(--border); padding-bottom:.5rem; font-weight:600; }
.big { font-family:var(--mono); font-size:2rem; color:var(--accent); line-height:1; margin-bottom:.5rem; }
.big.neg { color:var(--danger); }
.big.pos { color:var(--success); }
.kv-row { display:flex; justify-content:space-between; padding:.3rem 0; border-bottom:1px solid var(--border); font-size:.85rem; }
.kv-row:last-child { border:none; }
.kv-row span:first-child { color:var(--muted); }
.kv-row span:last-child { font-family:var(--mono); }
.chip { display:inline-block; margin:.1rem; padding:.1rem .5rem; background:var(--bg); border:1px solid var(--border); border-radius:999px; font-size:.75rem; }
table { width:100%; border-collapse:collapse; font-size:.82rem; }
th { text-align:left; color:var(--muted); padding:.4rem .5rem; border-bottom:1px solid var(--border); font-size:.7rem; text-transform:uppercase; font-weight:500; letter-spacing:.05em; }
td { padding:.35rem .5rem; border-bottom:1px solid var(--border); }
tr:hover { background:rgba(255,255,255,.02); }
.mono { font-family:var(--mono); color:var(--muted); }
.mono.pos { color:var(--success); }
.mono.neg { color:var(--danger); }
.state { display:inline-block; padding:1px 6px; border-radius:3px; font-size:.7rem; }
.state-Idle { background:rgba(63,185,80,.15); color:var(--success); }
.state-Working { background:rgba(77,163,255,.15); color:var(--accent); }
.state-ToPlane,.state-Returning { background:rgba(210,153,34,.15); color:var(--warning); }
.events { list-style:none; padding:0; margin:0; max-height:300px; overflow-y:auto; }
.event { display:grid; grid-template-columns:6.5rem 1fr; gap:.5rem; padding:.3rem .5rem; border-bottom:1px solid var(--border); font-size:.82rem; }
.event:last-child { border:none; }
.event-wo_completed { color:var(--success); }
.event-wo_failed { color:var(--danger); }
.event-weekly_close { color:var(--accent); font-weight:500; }
footer { padding:.5rem 1rem; border-top:1px solid var(--border); color:var(--muted); font-size:.75rem; font-family:var(--mono); text-align:center; }
</style>
</head><body>
<div class="hud">
  <div><span class="brand">MRO Tycoon</span><span class="ver">Snapshot Bloque C · 7 días simulados</span></div>
  <div class="mono">${formatClock(clock.minute)}</div>
</div>
<main class="content">
  <h1>🎮 Snapshot del simulador — 7 días</h1>
  <p class="subtitle">Resultado de correr el motor end-to-end: tick → arrivals → WOs → asignación → fases → economía. Auto-asignación naive (primer certifier disponible).</p>

  <div class="banner">✓ ${pass}/${pass + fail} tests pasados · Motor sim funcional</div>

  <div class="grid">
    <div class="card">
      <h2>💰 Balance</h2>
      <div class="big ${economy.balance < balance.startingBalance ? "neg" : "pos"}">${economy.balance.toLocaleString()} €</div>
      <div class="kv-row"><span>Inicial</span><span>${balance.startingBalance.toLocaleString()} €</span></div>
      <div class="kv-row"><span>Δ semana</span><span class="${economy.balance - balance.startingBalance < 0 ? "neg" : "pos"}">${(economy.balance - balance.startingBalance).toLocaleString()} €</span></div>
      <div class="kv-row"><span>Ingresos totales</span><span>${ingresos.toLocaleString()} €</span></div>
      <div class="kv-row"><span>Gastos totales</span><span>${gastos.toLocaleString()} €</span></div>
    </div>

    <div class="card">
      <h2>⭐ Reputación</h2>
      <div class="big">${(Object.values(reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(reputation.perAirline).length))} / 100</div>
      <div class="kv-row"><span>Inicial</span><span>${balance.startingReputation}</span></div>
      <div class="kv-row"><span>Δ</span><span>${(Object.values(reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(reputation.perAirline).length)) - balance.startingReputation > 0 ? "+" : ""}${(Object.values(reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(reputation.perAirline).length)) - balance.startingReputation}</span></div>
    </div>

    <div class="card">
      <h2>✈️ Aviones</h2>
      <div class="big">${stats.arrivedAirplanes}</div>
      <div class="kv-row"><span>Total generados (7 días)</span><span>${airplanes.length}</span></div>
      <div class="kv-row"><span>Aterrizados</span><span>${stats.arrivedAirplanes}</span></div>
      <div class="kv-row"><span>Aviones/día prom.</span><span>${(stats.arrivedAirplanes / 7).toFixed(1)}</span></div>
    </div>

    <div class="card">
      <h2>📋 Work Orders</h2>
      <div class="big">${stats.wosGenerated}</div>
      <div class="kv-row"><span>Generadas</span><span>${stats.wosGenerated}</span></div>
      <div class="kv-row"><span>Completadas</span><span>${stats.wosCompleted}</span></div>
      <div class="kv-row"><span>On-time</span><span class="pos">${stats.wosCompletedOnTime}</span></div>
      <div class="kv-row"><span>Late</span><span class="neg">${stats.wosCompletedLate}</span></div>
      <div class="kv-row"><span>WO/avión ratio</span><span>${(stats.wosGenerated / stats.arrivedAirplanes * 100).toFixed(0)}%</span></div>
      <div style="margin-top:.5rem">${phasesHtml}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>⚙️ Pool mecánicos (${mechanics.length})</h2>
      <table>
        <thead><tr><th>ID</th><th>Nombre</th><th>Base</th><th>Eff</th><th>Estado</th><th>Salario</th></tr></thead>
        <tbody>${mechRows}</tbody>
      </table>
    </div>

    <div class="card">
      <h2>📅 Últimos 20 eventos</h2>
      <ul class="events">${last20Events}</ul>
    </div>
  </div>

  <div class="card">
    <h2>💼 Últimas 30 transacciones (ledger ${economy.ledger.length} total)</h2>
    <table>
      <thead><tr><th>Tiempo</th><th>Tipo</th><th>Descripción</th><th>Cantidad</th></tr></thead>
      <tbody>${last30Txs}</tbody>
    </table>
  </div>
</main>
<footer>Bloque C — sim core · simulación determinista (seed=42) · próximo: Bloque D (paneles UI interactivos)</footer>
</body></html>`;
}
