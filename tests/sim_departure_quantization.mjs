// Fase C #3 (brief maestro): el retraso de salida ya NO refleja la cuantización del tick.
// El sim solo observa salidas en límites de tick (cada stepMinutes). Un avión cuya hora de
// salida programada cae ENTRE dos ticks se detecta en el primer tick posterior y, ANTES de
// este fix, recibía un retraso fantasma de hasta ~1 tick aunque nada lo retuviera. Ese era el
// síntoma "todas las salidas 2m tarde".
//
// IMPORTANTE: el reloj de createGame NO arranca en 0 (≈360, 6:00). Por eso TODOS los minutos
// de este test son RELATIVOS a base = g.clock.minute (como sim_departure_delay). El grid de
// ticks queda anclado en base (primer `next` = base+step), así un offset IMPAR respecto a base
// es "off-grid" con step=2.
//
// Fix: delay real solo si el avión YA era elegible en el tick anterior (estuvo retenido).

import { createGame, advanceGame } from "../src/lib/game.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

function freshGame() {
  const g = createGame(balance, airlines, templates, 42);
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1;
  return g;
}
function pushPlane(g, reg, depOffset, standId = "H1-S1") {
  const base = g.clock.minute;
  g.airplanes.push({
    instanceId: `ALI-${reg}`, registration: reg, model: "A320", engineVariant: "CFM56",
    contractId: g.contracts[0].id, standId,
    arrivalMinute: base, scheduledDepartureMinute: base + depOffset,
    status: "Idle", flightHoursThisLeg: 2,
  });
  return base;
}
function findP(g, reg) {
  return [...g.airplanes, ...(g.archive?.airplanes ?? [])].find(a => a.registration === reg);
}

console.log("\n=== síntoma fantasma: salida OFF-GRID (offset impar) y LIBRE → delay 0 ===");
{
  // base+3 con step 2: ticks base+2 (no alcanza), base+4 (pasa). rawDelay=1, pero nada retiene.
  const g = freshGame();
  pushPlane(g, "EC-OFF", 3);
  for (let i = 0; i < 6; i++) advanceGame(g, 2); // base+12 > base+3
  const p = findP(g, "EC-OFF");
  expect(p && p.status === "Departed", `salió (${p?.status})`);
  expect(p.delayMinutes === 0, `delay 0, no +1..2 fantasma (got ${p?.delayMinutes})`);
}

console.log("\n=== otro offset off-grid (base+5, libre) → delay 0 ===");
{
  const g = freshGame();
  pushPlane(g, "EC-O5", 5);
  for (let i = 0; i < 6; i++) advanceGame(g, 2);
  const p = findP(g, "EC-O5");
  expect(p && p.status === "Departed" && p.delayMinutes === 0, `base+5 libre → delay 0 (got ${p?.delayMinutes})`);
}

console.log("\n=== control: ON-GRID puntual (base+4) → delay 0 (sin regresión) ===");
{
  const g = freshGame();
  pushPlane(g, "EC-ON", 4);
  for (let i = 0; i < 6; i++) advanceGame(g, 2);
  const p = findP(g, "EC-ON");
  expect(p && p.delayMinutes === 0, `on-grid puntual delay 0 (got ${p?.delayMinutes})`);
}

console.log("\n=== retraso REAL preservado: avión retenido por WO bloqueante y liberado tarde ===");
{
  const g = freshGame();
  const base = pushPlane(g, "EC-HELD", 4);
  g.workOrders.push({
    instanceId: "WO-block", templateId: templates[0].id, airplaneInstanceId: "ALI-EC-HELD",
    airplaneRegistration: "EC-HELD", phase: "MainTask", phaseElapsedMinutes: 0,
    emissionMinute: base, slaMinute: base + 99999, assignedMechanicIds: [], scopeRevealed: true,
  });
  for (let i = 0; i < 30; i++) advanceGame(g, 2); // base+60, bloqueado y past-due desde base+4
  const mid = findP(g, "EC-HELD");
  expect(mid && mid.status !== "Departed", `sigue retenido (${mid?.status})`);
  g.workOrders = g.workOrders.filter(w => w.instanceId !== "WO-block"); // liberar
  advanceGame(g, 2);
  const p = findP(g, "EC-HELD");
  expect(p && p.status === "Departed", `salió tras liberar (${p?.status})`);
  expect(p.delayMinutes >= 50, `retraso REAL preservado >= 50 (got ${p?.delayMinutes})`);
  expect(p.delayMinutes >= 2, `retraso real >= step (no aplastado a 0)`);
}

console.log("\n=== invariante en simulación natural (lineMode): ningún delay en (0, step) ===");
{
  // Con el schedule real, comprobamos que no aparecen retrasos fantasma sub-tick.
  const g = createGame(balance, airlines, templates, 42, [], [], { lineMode: true });
  g.autoPauseEnabled = false;
  g.autoAssignEnabled = true;
  const STEP = 2;
  const seen = new Set(); const delays = [];
  let steps = 0;
  while (g.clock.minute < 2 * 24 * 60 && steps < 200000) {
    advanceGame(g, STEP); steps++;
    for (const a of [...g.airplanes, ...(g.archive?.airplanes ?? [])]) {
      if (a.status === "Departed" && !seen.has(a.instanceId)) {
        seen.add(a.instanceId);
        if (typeof a.delayMinutes === "number") delays.push(a.delayMinutes);
      }
    }
  }
  expect(delays.length > 5, `hubo salidas en lineMode (${delays.length})`);
  const phantom = delays.filter(d => d > 0 && d < STEP);
  expect(phantom.length === 0, `cero retrasos en (0,${STEP}) [artefacto] — había ${phantom.length}`);
  const onTime = delays.filter(d => d === 0).length;
  expect(onTime >= delays.length * 0.5, `≥50% on-time (${onTime}/${delays.length}) — antes el grueso tenía +tick fantasma`);
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
