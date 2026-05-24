// H9: aviso anticipado de check (≤ 50 FH del trigger). Una vez por ventana,
// se baja el flag al completar.

import {
  detectChecksUpcoming,
  CHECK_WARNING_FH_MARGIN,
  scheduleCheck,
  tickMaintenanceChecks,
  resetMaintenanceCheckCounter,
} from "../src/lib/sim/maintenance.ts";
import { generateInitialFleet, resetAirplaneInstanceCounter, setFleetWarnedFlag } from "../src/lib/sim/fleet.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== H9: detectChecksUpcoming ===");

// 1. Flota fresca → no avisos
resetAirplaneInstanceCounter(0);
const rng = createRng(42);
const fleet0 = generateInitialFleet(rng, airlines);
const up0 = detectChecksUpcoming(fleet0, defs, []);
expect(up0.length === 0, `flota fresca no avisa (got ${up0.length})`);

// 2. Avión a 30 FH del trigger A (600) → avisa
const fleet1 = fleet0.map((f, i) => i === 0 ? { ...f, fhSinceLastA: 570 } : f);
const up1 = detectChecksUpcoming(fleet1, defs, []);
expect(up1.length === 1 && up1[0].type === "A" && up1[0].remainingFH === 30,
  `A-check upcoming: 30 FH restantes (got ${up1[0]?.remainingFH})`);

// 3. Avión a 100 FH del trigger (margen 50) → NO avisa
const fleet2 = fleet0.map((f, i) => i === 0 ? { ...f, fhSinceLastA: 500 } : f);
const up2 = detectChecksUpcoming(fleet2, defs, []);
expect(up2.length === 0, `100 FH > margen ${CHECK_WARNING_FH_MARGIN}, no avisa`);

// 4. Si ya hay un Scheduled del mismo type, no avisa redundante
const sched = [{
  instanceId: "MC-000001", registration: fleet0[0].registration, type: "A",
  scheduledMinute: 0, standId: "", phase: "Scheduled", assignedMechanicIds: [],
  manMinutesAccumulated: 0, manDaysIdeal: 2, baseFee: 12000, parkingDays: 1, overrunDaysPenalized: 0,
}];
const up3 = detectChecksUpcoming(fleet1, defs, sched);
expect(up3.length === 0, "no avisa si ya hay Scheduled del mismo type");

// 5. Si el Scheduled es de tipo distinto, sí avisa
const up4 = detectChecksUpcoming(fleet1, defs, [{ ...sched[0], type: "C" }]);
expect(up4.length === 1 && up4[0].type === "A", "Scheduled C no bloquea aviso A");

// === H9 integración: avisos no spam (1 por ventana) y reset al completar ===
console.log("\n=== H9: integración no-spam + reset al completar ===");
resetAirplaneInstanceCounter(0);
resetMaintenanceCheckCounter(0);
const g = createGame(balance, airlines, templates, 42, defs);
// Reset fleet a FH=0 (createGame aplica aging que pone varios cerca del trigger). Solo
// bumpeamos manualmente UN avión para verificar la emisión one-shot.
g.fleet = g.fleet.map(f => ({ ...f, fhSinceLastA: 0, cyclesSinceLastA: 0, fhSinceLastC: 0, cyclesSinceLastC: 0, fhSinceLastD: 0, cyclesSinceLastD: 0, warnedA: false, warnedC: false, warnedD: false }));
// Forzar avión 0 a 580 FH (a 20 del trigger A=600)
const reg = g.fleet[0].registration;
g.fleet[0] = { ...g.fleet[0], fhSinceLastA: 580, cyclesSinceLastA: 190 };
g.clock.speed = 1;
g.autoPauseEnabled = false;

// 1 tick: el aviso debe emitirse y la flag warnedA quedar a true
advanceGame(g, 5);
let fa = g.fleet.find(f => f.registration === reg);
expect(fa.warnedA === true, "tras 1 tick: warnedA=true");
const warnNotifs = g.notifications.filter(n => /vence A-check/.test(n.text));
expect(warnNotifs.length === 1, `1 notificación de aviso (got ${warnNotifs.length})`);

// Avanzar 5 ticks más: no debe emitir más avisos del mismo tipo
const notifCountBefore = g.notifications.filter(n => /vence A-check/.test(n.text)).length;
for (let i = 0; i < 5; i++) advanceGame(g, 5);
const notifCountAfter = g.notifications.filter(n => /vence A-check/.test(n.text)).length;
expect(notifCountAfter === notifCountBefore, `no spam: notifs (${notifCountAfter}) === before (${notifCountBefore})`);

// Forzar la finalización rápida: schedular un A check y completarlo. Tras Complete el flag baja.
resetMaintenanceCheckCounter(100);
const reg2 = g.fleet[1].registration;
g.fleet[1] = { ...g.fleet[1], fhSinceLastA: 580, warnedA: true };
g.maintenanceChecks.push(scheduleCheck(reg2, "A", g.fleet[1].model, defs, g.clock.minute));
// Simular completar: forzamos directamente a Completed via resetCheckCountersOnFleet vía un tick suficiente.
// Más fácil: invocar resetCheckCountersOnFleet via tick que ya hace el job; pero hace falta team disponible.
// Avanzo días hasta que el check de fleet[1] complete.
const targetMin = g.clock.minute + 6 * DAY_MINUTES;
while (g.clock.minute < targetMin) advanceGame(g, 60);
const fa2After = g.fleet.find(f => f.registration === reg2);
expect(fa2After.warnedA === false, `tras Completed: warnedA reseteado a false (got ${fa2After.warnedA})`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
