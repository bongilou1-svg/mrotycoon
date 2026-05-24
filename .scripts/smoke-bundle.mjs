// Smoke-test del bundle vanilla: simula `<script>...</script>` cargado en navegador,
// crea un "window" mock, ejecuta el sim-bundle, y prueba 1-2 funciones clave.

import { readFileSync } from "node:fs";

const html = readFileSync("C:/Users/bongi/mrotycoon/builds/v0.2-fase3-h.html", "utf-8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

// Mock window
const win = {};
// Eval del primer script (sim bundle) en el contexto del mock
const simCode = scripts[0][1];
const simFn = new Function("window", `${simCode}; return window.Sim;`);
const Sim = simFn(win);

console.log("Sim exports:", Object.keys(Sim).filter(k => !k.startsWith("__")).length);
console.log("DATA keys:", Object.keys(Sim.DATA));
console.log("DATA.maintenanceChecks.length:", Sim.DATA.maintenanceChecks.length);

// Create game con maintenanceChecks
const g = Sim.createGame(Sim.DATA.balance, Sim.DATA.airlines, Sim.DATA.workOrders, 42, Sim.DATA.maintenanceChecks);
console.log("createGame OK. checkDefinitions:", g.checkDefinitions.length, " fleet:", g.fleet.length);

// Bump primer avión cerca de trigger A y avanzar
g.fleet[0] = { ...g.fleet[0], fhSinceLastA: 580, cyclesSinceLastA: 195 };
g.clock.speed = 1;
for (let i = 0; i < 200; i++) Sim.advanceGame(g, 30);
console.log("Después 200 ticks: maintenanceChecks=", g.maintenanceChecks.length);
console.log("  - Scheduled:", g.maintenanceChecks.filter(c => c.phase === "Scheduled").length);
console.log("  - InProgress:", g.maintenanceChecks.filter(c => c.phase === "InProgress").length);
console.log("  - Completed:", g.maintenanceChecks.filter(c => c.phase === "Completed").length);

const upcoming = Sim.detectChecksUpcoming(g.fleet, g.checkDefinitions, g.maintenanceChecks);
console.log("upcoming warnings:", upcoming.length);

// Verifica serializeGame v3
const payload = Sim.serializeGame(g);
console.log("save version:", payload.version, " fleet entries:", payload.fleet.length, " checks:", payload.maintenanceChecks.length);

console.log("\n✓ Bundle smoke OK");
