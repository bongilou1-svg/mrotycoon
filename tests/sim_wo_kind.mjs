// Tests del campo `kind` (callout|mpd) en WorkOrderTemplate.
// Verifica:
//   - coverage de wo_classification.json sobre workorders.json
//   - integridad del kind tras el merge runtime (loadWorkOrdersWithKind / loadDailyChecksWithKind)
//   - filtros en generadores: rollWoOnLanding solo callout, rollDailyChecksOnOvernight solo mpd
//   - smoke distribuciones 1000 rolls / 100 overnights
//
// Brief: src/lib/data/wo_classification.json (2026-05-24, modelo HH + Tiers).

import { readFileSync } from "node:fs";
import {
  rollWoOnLanding,
  rollDailyChecksOnOvernight,
  _resetInstanceCounter,
} from "../src/lib/sim/workorders.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { loadWorkOrdersWithKind, loadDailyChecksWithKind } from "./helpers/loadTemplates.mjs";

const classification = JSON.parse(
  readFileSync(new URL("../src/lib/data/wo_classification.json", import.meta.url)),
);
const workordersRaw = JSON.parse(
  readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)),
);
const balance = JSON.parse(
  readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)),
);

const templates = loadWorkOrdersWithKind(import.meta.url);
const dailyChecks = loadDailyChecksWithKind(import.meta.url);

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== wo_classification coverage ===");

// 1. classification cubre los 100 WO-*
const classIds = new Set(classification.classifications.map((c) => c.id));
const woIds = new Set(workordersRaw.map((w) => w.id));
const missingInClass = workordersRaw.filter((w) => !classIds.has(w.id)).map((w) => w.id);
expect(missingInClass.length === 0, `todos los WO-* en classification (${missingInClass.length} huérfanos)`, missingInClass.join(","));

// 2. classification no tiene IDs huérfanos extras
const extraInClass = [...classIds].filter((id) => !woIds.has(id));
expect(extraInClass.length === 0, `classification sin IDs extras (${extraInClass.length} sobrantes)`, extraInClass.join(","));

// 3. Cada classification.kind ∈ {callout, mpd}
const invalidKinds = classification.classifications.filter(
  (c) => c.kind !== "callout" && c.kind !== "mpd",
);
expect(invalidKinds.length === 0, `todas las entradas tienen kind válido (${invalidKinds.length} inválidas)`);

// 4. Distribución 51 callout + 49 mpd (la real del dataset)
const counts = classification.classifications.reduce(
  (acc, c) => ((acc[c.kind] = (acc[c.kind] ?? 0) + 1), acc),
  {},
);
expect(counts.callout === 51 && counts.mpd === 49, `distribución 51 callout + 49 mpd`, `got callout=${counts.callout} mpd=${counts.mpd}`);

console.log("\n=== loadWorkOrdersWithKind merge ===");

// 5. Todos los templates post-load tienen kind
const noKind = templates.filter((t) => t.kind === undefined);
expect(noKind.length === 0, `templates post-load con kind asignado (0 sin kind)`);

// 6. kind ∈ {callout, mpd} en todos
const badKind = templates.filter((t) => t.kind !== "callout" && t.kind !== "mpd");
expect(badKind.length === 0, `templates kind válido (0 inválidos)`);

console.log("\n=== loadDailyChecksWithKind force mpd ===");

// 7. Todos los daily_checks post-load tienen kind === 'mpd'
const dailyNonMpd = dailyChecks.filter((d) => d.kind !== "mpd");
expect(dailyNonMpd.length === 0 && dailyChecks.length > 0, `daily_checks todos kind=mpd (${dailyNonMpd.length} no-mpd, total ${dailyChecks.length})`);

console.log("\n=== rollWoOnLanding solo emite callout ===");

// 8. 1000 rolls de rollWoOnLanding → ninguna instance proviene de template mpd
const airplane = {
  instanceId: "ALI-000001",
  registration: "EC-KIND",
  model: "A320",
  engineVariant: "CFM56",
  contractId: "C-001",
  standId: "H1-S1",
  arrivalMinute: 600,
  scheduledDepartureMinute: 660,
  status: "Idle",
  flightHoursThisLeg: 3.5,
};
const templatesById = new Map(templates.map((t) => [t.id, t]));

_resetInstanceCounter();
const rng = createRng(2026);
let landingRolls = 0;
let mpdEmitted = 0;
let calloutEmitted = 0;
for (let i = 0; i < 1000; i++) {
  const wo = rollWoOnLanding(rng, airplane, templates, balance);
  if (wo) {
    landingRolls++;
    const tpl = templatesById.get(wo.templateId);
    if (tpl?.kind === "mpd") mpdEmitted++;
    if (tpl?.kind === "callout") calloutEmitted++;
  }
}
expect(mpdEmitted === 0, `rollWoOnLanding × 1000: jamás kind=mpd (0)`, `got mpd=${mpdEmitted}`);
expect(calloutEmitted === landingRolls && landingRolls > 0, `rollWoOnLanding × 1000: 100% callout (${calloutEmitted}/${landingRolls})`);

console.log("\n=== rollDailyChecksOnOvernight solo emite mpd ===");

// 9. 100 overnights → cada WO devuelta tiene kind mpd
_resetInstanceCounter();
const rng2 = createRng(2026);
const dailyById = new Map(dailyChecks.map((d) => [d.id, d]));
let overnightWos = 0;
let overnightMpd = 0;
let overnightCallout = 0;
for (let i = 0; i < 100; i++) {
  const wos = rollDailyChecksOnOvernight(rng2, airplane, dailyChecks, balance);
  for (const wo of wos) {
    overnightWos++;
    const tpl = dailyById.get(wo.templateId);
    if (tpl?.kind === "mpd") overnightMpd++;
    if (tpl?.kind === "callout") overnightCallout++;
  }
}
expect(overnightCallout === 0, `rollDailyChecksOnOvernight × 100: jamás kind=callout (0)`, `got callout=${overnightCallout}`);
expect(overnightMpd === overnightWos && overnightWos > 0, `rollDailyChecksOnOvernight × 100: 100% mpd (${overnightMpd}/${overnightWos})`);

console.log("\n=== filtros defensivos en generadores ===");

// 10. rollWoOnLanding con pool SOLO mpd → siempre null (ningún callout disponible)
const onlyMpd = templates.filter((t) => t.kind === "mpd");
expect(onlyMpd.length > 0, `pool solo-mpd no vacío (${onlyMpd.length})`);
const rng3 = createRng(2026);
let mpdPoolRolls = 0;
for (let i = 0; i < 200; i++) {
  if (rollWoOnLanding(rng3, airplane, onlyMpd, balance) !== null) mpdPoolRolls++;
}
expect(mpdPoolRolls === 0, `rollWoOnLanding con pool sólo-mpd × 200 → siempre null (0)`, `got ${mpdPoolRolls}`);

// 11. rollDailyChecksOnOvernight con pool MEZCLADO (callout+mpd) → solo emite mpd
const mixedPool = [...dailyChecks, ...templates.filter((t) => t.kind === "callout").slice(0, 3)];
const rng4 = createRng(2026);
let mixedCallout = 0;
let mixedMpd = 0;
const mixedById = new Map(mixedPool.map((d) => [d.id, d]));
for (let i = 0; i < 50; i++) {
  const wos = rollDailyChecksOnOvernight(rng4, airplane, mixedPool, balance);
  for (const wo of wos) {
    const tpl = mixedById.get(wo.templateId);
    if (tpl?.kind === "callout") mixedCallout++;
    if (tpl?.kind === "mpd") mixedMpd++;
  }
}
expect(mixedCallout === 0 && mixedMpd > 0, `rollDailyChecksOnOvernight con pool mezclado × 50: filtra callouts (callout=${mixedCallout}, mpd=${mixedMpd})`);

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
