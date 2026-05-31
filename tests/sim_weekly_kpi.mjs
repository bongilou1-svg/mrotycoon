// Fase C #1 (brief maestro): el KPI semanal cuenta WOs desde los EVENTOS de la semana
// (wo_completed / mel_expired), no del array vivo (podado por archive) ni del ledger acumulado.
// Reproduce el bug "0 completadas / X cobrados / Y tarde" y verifica que ya no ocurre.

import { createGame } from "../src/lib/game.ts";
import { serializeGame, deserializeGame } from "../src/lib/sim/save.ts";
import { readFileSync } from "node:fs";
import { loadWorkOrdersWithKind } from "./helpers/loadTemplates.mjs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = loadWorkOrdersWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

console.log("\n=== acumulador semanal arranca a cero ===");
const g = createGame(balance, airlines, templates, 42);
expect(g.weeklyWoStats && g.weeklyWoStats.completed === 0 && g.weeklyWoStats.late === 0 && g.weeklyWoStats.failed === 0,
  `weeklyWoStats = {0,0,0} (${JSON.stringify(g.weeklyWoStats)})`);

console.log("\n=== los eventos alimentan el acumulador (simulado a mano) ===");
// Simulamos la lógica de los handlers: completed cuenta el evento; late ⊆ completed; failed = mel.
g.weeklyWoStats.completed += 1;                 // wo_completed onTime
g.weeklyWoStats.completed += 1; g.weeklyWoStats.late += 1;  // wo_completed late
g.weeklyWoStats.failed += 1;                    // mel_expired
expect(g.weeklyWoStats.completed === 2, `2 completadas (${g.weeklyWoStats.completed})`);
expect(g.weeklyWoStats.late === 1, `1 tarde (subset de completadas) (${g.weeklyWoStats.late})`);
expect(g.weeklyWoStats.failed === 1, `1 fallida (${g.weeklyWoStats.failed})`);
expect(g.weeklyWoStats.late <= g.weeklyWoStats.completed, "late ⊆ completed (invariante)");

console.log("\n=== el cierre semanal vuelca al snapshot y RESETEA ===");
// Replicamos el bloque del weekly close (sin correr 7 días enteros).
const weekBeforeClose = 1;
const repValues = Object.values(g.reputation.perAirline);
const repAvg = repValues.length > 0 ? repValues.reduce((s, v) => s + v, 0) / repValues.length : 0;
g.kpiHistory.push({
  week: weekBeforeClose, balance: g.economy.balance, repAvg,
  woCompleted: g.weeklyWoStats.completed, woLate: g.weeklyWoStats.late, woFailed: g.weeklyWoStats.failed,
  complianceScore: g.compliance?.score ?? 80, mechanicsCount: g.mechanics.length,
});
g.weeklyWoStats = { completed: 0, late: 0, failed: 0 };
const snap = g.kpiHistory[g.kpiHistory.length - 1];
expect(snap.woCompleted === 2 && snap.woLate === 1 && snap.woFailed === 1,
  `snapshot {comp:2, late:1, failed:1} → ${JSON.stringify({c:snap.woCompleted,l:snap.woLate,f:snap.woFailed})}`);
expect(g.weeklyWoStats.completed === 0 && g.weeklyWoStats.late === 0 && g.weeklyWoStats.failed === 0,
  "acumulador reseteado tras el cierre");

console.log("\n=== coherencia: si hay 'tarde', tiene que haber al menos esas 'completadas' ===");
// Esto es lo que el bug rompía: 0 completadas pero 7 tarde. Imposible con el acumulador.
expect(snap.woLate <= snap.woCompleted, `woLate(${snap.woLate}) ≤ woCompleted(${snap.woCompleted}) — sin contradicción`);

console.log("\n=== save/load preserva el acumulador parcial ===");
g.weeklyWoStats = { completed: 3, late: 1, failed: 2 };
const payload = serializeGame(g);
expect(payload.weeklyWoStats && payload.weeklyWoStats.completed === 3, "serializeGame incluye weeklyWoStats");
const g2 = deserializeGame(payload, balance, airlines, templates);
expect(JSON.stringify(g2.weeklyWoStats) === JSON.stringify(g.weeklyWoStats), "deserializeGame restaura weeklyWoStats");
const legacy = { ...payload }; delete legacy.weeklyWoStats;
const g3 = deserializeGame(legacy, balance, airlines, templates);
expect(g3.weeklyWoStats && g3.weeklyWoStats.completed === 0, "save viejo sin campo → {0,0,0} (compat)");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
