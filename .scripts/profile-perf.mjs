// Perf profiling fast: print cada N ticks
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { setActiveAirportData } from "../src/lib/sim/schedule.ts";
import { buildRenderState } from "../src/lib/render/sync.ts";

const AIRPORT = (process.argv[2] || "alc").toLowerCase();
const DAYS = parseFloat(process.argv[3] || "2");
const SPEED = parseInt(process.argv[4] || "5", 10);
const PRINT_EVERY = parseInt(process.argv[5] || "50", 10);

const balance = JSON.parse(readFileSync("src/lib/data/balance.json", "utf8"));
const airlines = JSON.parse(readFileSync("src/lib/data/airlines.json", "utf8"));
const workorders = JSON.parse(readFileSync("src/lib/data/workorders.json", "utf8"));
const dailyChecks = JSON.parse(readFileSync("src/lib/data/daily_checks.json", "utf8"));
const woClassification = JSON.parse(readFileSync("src/lib/data/wo_classification.json", "utf8"));
const airportSchedule = JSON.parse(readFileSync(`src/assets/airports/${AIRPORT}.schedule.json`, "utf8"));
const airportFleet = JSON.parse(readFileSync(`src/assets/airports/${AIRPORT}.fleet.json`, "utf8"));

const presetFiles = {
  alc: "src/lib/data/airports/LEAL_vueling.preset.json",
  bio: "src/lib/data/airports/LEBB_volotea.preset.json",
  ovd: "src/lib/data/airports/LEAS_volotea.preset.json",
};
const preset = JSON.parse(readFileSync(presetFiles[AIRPORT], "utf8"));

console.log(`PROFILE ${AIRPORT.toUpperCase()} · ${DAYS}d · ${SPEED}x · print/${PRINT_EVERY} ticks`);

const kindMap = new Map();
for (const e of woClassification.classifications || []) {
  if (e?.id && (e.kind === "callout" || e.kind === "mpd")) kindMap.set(e.id, e.kind);
}
const woEnriched = workorders.map(w => ({ ...w, kind: kindMap.get(w.id) ?? "callout" }));
const dcEnriched = dailyChecks.map(d => ({ ...d, kind: "mpd" }));

setActiveAirportData(airportSchedule, airportFleet);
const game = createGame(balance, airlines, woEnriched, 42, [], dcEnriched, { lineMode: true, airportPreset: preset });
// HALLAZGO: createGame deja clock.speed=0 (pausado). En el juego real el botón 1×/2×/5×
// lo setea. Aquí lo forzamos a SPEED para que advanceGame no retorne early.
game.clock = { ...game.clock, speed: SPEED };
game.autoPauseEnabled = false; // sin pausa por AOG — mantener avance constante
console.log(`Setup OK. Airplanes=${game.airplanes.length} WOs=${game.workOrders.length} clock.speed=${game.clock.speed}`);

const TARGET_MIN = DAYS * 1440;
const STEP = SPEED;
let totalTicks = 0;
const t0 = performance.now();

console.log(`\nTick  Day  Hr  Airpl(A/Arc)  WOs(A/Arc)  Ledger  advance  buildRS  cumulativeS`);

while (game.clock.minute < TARGET_MIN && !game.gameOver.isOver) {
  const ta = performance.now();
  advanceGame(game, STEP);
  const tb = performance.now();
  buildRenderState(game);
  const tc = performance.now();
  totalTicks++;

  if (totalTicks % PRINT_EVERY === 0 || totalTicks === 1) {
    const cumS = ((performance.now() - t0) / 1000).toFixed(1);
    const day = Math.floor(game.clock.minute / 1440) + 1;
    const hr = Math.floor((game.clock.minute % 1440) / 60);
    const aA = game.airplanes.length;
    const aArc = game.archive?.airplanes?.length ?? 0;
    const wA = game.workOrders.length;
    const wArc = game.archive?.workOrders?.length ?? 0;
    const lg = game.economy.ledger.length;
    const advMs = (tb - ta).toFixed(1);
    const brMs = (tc - tb).toFixed(1);
    console.log(`${String(totalTicks).padStart(4)}  D${day}  ${String(hr).padStart(2,"0")}  ${String(aA).padStart(4)}/${String(aArc).padStart(4)}      ${String(wA).padStart(3)}/${String(wArc).padStart(3)}      ${String(lg).padStart(5)}    ${advMs.padStart(5)}ms  ${brMs.padStart(5)}ms    ${cumS}s`);
  }
}
const totalMs = performance.now() - t0;
console.log(`\nDONE ${totalTicks} ticks · ${(totalMs/1000).toFixed(1)}s real · avg ${(totalMs/totalTicks).toFixed(1)}ms/tick`);
console.log(`Final: Airplanes A=${game.airplanes.length} Arc=${game.archive?.airplanes?.length ?? 0} | WOs A=${game.workOrders.length} Arc=${game.archive?.workOrders?.length ?? 0} | Ledger=${game.economy.ledger.length}`);
