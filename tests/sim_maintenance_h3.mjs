// H3: tests del auto-generador. Forzamos FH/cycles por encima de umbrales y verificamos
// que detectChecksDue + scheduleDueChecks producen los Scheduled correctos.

import {
  detectChecksDue,
  scheduleDueChecks,
  resetMaintenanceCheckCounter,
} from "../src/lib/sim/maintenance.ts";
import { generateInitialFleet, resetAirplaneInstanceCounter } from "../src/lib/sim/fleet.ts";
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

console.log("\n=== sim/maintenance (H3 detect + schedule) ===");

// 1. Flota fresca → ningún check debido
resetAirplaneInstanceCounter(0);
const rng = createRng(42);
const fleet0 = generateInitialFleet(rng, airlines);
const due0 = detectChecksDue(fleet0, defs, []);
expect(due0.length === 0, `flota fresca no dispara checks (got ${due0.length})`);

// 2. Bumpear UN avión por encima del trigger A (600 FH) → detecta A debido
const fleet1 = fleet0.map((f, i) => i === 0 ? { ...f, fhSinceLastA: 650, cyclesSinceLastA: 50 } : f);
const due1 = detectChecksDue(fleet1, defs, []);
expect(due1.length === 1 && due1[0].type === "A" && due1[0].registration === fleet0[0].registration,
  `1 A-check debido sobre ${fleet0[0].registration} (got ${due1.length})`);

// 3. Bumpear por cycles aunque FH bajo (umbral cumplido por OR)
const fleet2 = fleet0.map((f, i) => i === 1 ? { ...f, fhSinceLastA: 100, cyclesSinceLastA: 220 } : f);
const due2 = detectChecksDue(fleet2, defs, []);
expect(due2.length === 1 && due2[0].type === "A", `dispara por cycles aunque FH < trigger`);

// 4. Si ya hay un Scheduled del mismo type, no se duplica
const fleet3 = fleet0.map((f, i) => i === 0 ? { ...f, fhSinceLastA: 1000, cyclesSinceLastA: 400 } : f);
const existing = [{
  instanceId: "MC-000001",
  registration: fleet0[0].registration,
  type: "A",
  scheduledMinute: 0,
  standId: "",
  phase: "Scheduled",
  assignedMechanicIds: [],
  manMinutesAccumulated: 0,
  manDaysIdeal: 2,
  baseFee: 12000,
  parkingDays: 1,
}];
const due3 = detectChecksDue(fleet3, defs, existing);
expect(due3.length === 0, "no duplica si ya hay Scheduled");

// 5. Un Completed sí permite re-detectar (avión vuelve a acumular y supera trigger otra vez)
const existingDone = [{ ...existing[0], phase: "Completed" }];
const due4 = detectChecksDue(fleet3, defs, existingDone);
expect(due4.length === 1, "Completed no bloquea futuras detecciones");

// 6. Un mismo avión puede tener A y C simultáneos (independientes)
const fleet5 = fleet0.map((f, i) => i === 0 ? {
  ...f, fhSinceLastA: 700, cyclesSinceLastA: 250, fhSinceLastC: 8000, cyclesSinceLastC: 100,
} : f);
const due5 = detectChecksDue(fleet5, defs, []);
const typesOnFirstAircraft = new Set(due5.filter(d => d.registration === fleet0[0].registration).map(d => d.type));
expect(typesOnFirstAircraft.has("A") && typesOnFirstAircraft.has("C"),
  `mismo avión dispara A y C (got types ${[...typesOnFirstAircraft].join(",")})`);

// 7. scheduleDueChecks devuelve newlyScheduled con phase=Scheduled
resetMaintenanceCheckCounter(0);
const res = scheduleDueChecks(fleet1, defs, [], 12345);
expect(res.newlyScheduled.length === 1, "1 newly scheduled");
expect(res.newlyScheduled[0].phase === "Scheduled", "phase = Scheduled");
expect(res.newlyScheduled[0].scheduledMinute === 12345, "scheduledMinute = nowMinute");
expect(res.checks.length === 1, "checks combinados = existentes + nuevos");

// 8. Integración end-to-end: jugar 14 días con fleet inicializada con FH cerca del trigger A
//    y verificar que el ciclo de tick genera al menos 1 check Scheduled
console.log("\n=== integración 14d con flota envejecida ===");
resetAirplaneInstanceCounter(0);
resetMaintenanceCheckCounter(0);
const g = createGame(balance, airlines, templates, 42, defs);
// Envejecer parte de la flota: los primeros 4 aviones con A check inminente
for (let i = 0; i < 4; i++) {
  g.fleet[i] = { ...g.fleet[i], fhSinceLastA: 580, cyclesSinceLastA: 195 };
}
g.clock.speed = 1;
g.autoPauseEnabled = false;
while (g.clock.minute < 14 * DAY_MINUTES && !g.gameOver.isOver) {
  advanceGame(g, 5);
}
// Con H6 activo los Scheduled pasan inmediatamente a InProgress (o ya cerrados). Contamos los A
// en cualquier phase no-cancelled como evidencia de que H3 los detectó y schedular.
const aTouched = g.maintenanceChecks.filter(c => c.type === "A" && c.phase !== "Cancelled");
expect(aTouched.length >= 1, `al menos 1 A-check tras 14d (Scheduled/InProgress/Completed) (got ${aTouched.length})`);
expect(g.maintenanceChecks.every(c => /^MC-\d{6}$/.test(c.instanceId)), "todos los IDs MC-NNNNNN");
expect(g.maintenanceChecks.every(c => c.manDaysIdeal > 0 && c.baseFee > 0 && c.parkingDays > 0),
  "snapshots de definition válidos en cada check");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
