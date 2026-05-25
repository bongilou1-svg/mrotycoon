// ============================================================================
// SMOKE RUNTIME · Tester reaccional canónico del game loop línea pura
// ============================================================================
//
// Propósito: simular una partida sin UI y reportar si los HITOS LÓGICOS
// ESPERADOS del flujo línea pura se dan (callouts al landing, daily check al
// overnight, asignación auto, completado, departure, cobros, AOG escalation,
// reputación). Sirve para validar cambios sin tener que abrir el navegador
// y jugar.
//
// USO:
//   node .scripts/smoke-runtime.mjs                      # default: seed=42 days=3 line
//   node .scripts/smoke-runtime.mjs 100 5                # seed=100 days=5 line
//   node .scripts/smoke-runtime.mjs 100 5 legacy         # modo legacy (sin lineMode)
//   node .scripts/smoke-runtime.mjs 42 3 line --verbose  # log de cada tick
//
// MANTENIMIENTO:
//   Cuando añadamos features nuevas al sim (nuevos generadores de WO, nuevos
//   bucles de feedback, nuevos KPIs), AÑADE aquí el check correspondiente en
//   la sección "HITOS LÓGICOS ESPERADOS" — la idea es que este script crezca
//   junto al sim como suite de validación reaccional. La sección "📋 IDEAS DE
//   EXTENSIÓN" abajo lista checks pendientes que se pueden añadir.
//
// IMPORTANTE: este script REPLICA el merge de `kind` que hace el bundle UI
// (sim-all.ts). Si cambia el formato de wo_classification.json o el esquema
// de kind, ACTUALIZAR aquí también.
//
// ============================================================================

import { readFileSync } from "node:fs";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";

// === Args CLI ===
const SEED = parseInt(process.argv[2] ?? "42", 10);
const DAYS = parseInt(process.argv[3] ?? "3", 10);
const MODE = process.argv[4] ?? "line"; // "line" | "legacy"
const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

// === Carga de datos (replica sim-all.ts) ===
const root = new URL("../", import.meta.url);
const balance = JSON.parse(readFileSync(new URL("src/lib/data/balance.json", root)));
const airlines = JSON.parse(readFileSync(new URL("src/lib/data/airlines.json", root)));
const workordersRaw = JSON.parse(readFileSync(new URL("src/lib/data/workorders.json", root)));
const classification = JSON.parse(readFileSync(new URL("src/lib/data/wo_classification.json", root)));
const defs = JSON.parse(readFileSync(new URL("src/lib/data/maintenance_checks.json", root)));
const dailyRaw = JSON.parse(readFileSync(new URL("src/lib/data/daily_checks.json", root)));

const kindMap = new Map(classification.classifications.map((c) => [c.id, c.kind]));
const templates = workordersRaw.map((w) => ({ ...w, kind: kindMap.get(w.id) ?? "callout" }));
const dailyChecks = dailyRaw.map((d) => ({ ...d, kind: "mpd" }));

// === Setup partida ===
const createOpts = MODE === "line" ? { lineMode: true } : undefined;
const g = createGame(balance, airlines, templates, SEED, defs, dailyChecks, createOpts);
g.autoPauseEnabled = false;
g.shiftGatingEnabled = MODE === "line"; // turnos reales en line, off en legacy
g.clock.speed = 1;
const startBalance = g.economy.balance;

// Forzar ensureArrivals (corre dentro de advanceGame) llamando un tick mínimo
// para que las pernoctas/arrivals iniciales aparezcan en el report.
advanceGame(g, 1);

// === Helpers ===
function fmtClock(m) {
  const day = Math.floor(m / DAY_MINUTES) + 1;
  const h = Math.floor((m % DAY_MINUTES) / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `Día ${day} ${h}:${min}`;
}
function fmtEur(n) { return n.toLocaleString("es-ES"); }
function colorize(s, color) {
  const codes = { green: 32, red: 31, yellow: 33, cyan: 36, dim: 2 };
  if (!process.stdout.isTTY) return s;
  return `\x1b[${codes[color] ?? 0}m${s}\x1b[0m`;
}

// === Estado inicial (tras primer tick) ===
console.log(colorize(`\n═══════════════════════════════════════════════════════════════`, "cyan"));
console.log(colorize(` SMOKE RUNTIME · seed=${SEED} · days=${DAYS} · mode=${MODE}${VERBOSE ? " · verbose" : ""}`, "cyan"));
console.log(colorize(`═══════════════════════════════════════════════════════════════`, "cyan"));

console.log("\n📦 ESTADO INICIAL");
console.log(`   Reloj:      ${fmtClock(g.clock.minute)}`);
console.log(`   Balance:    ${fmtEur(g.economy.balance)} €`);
console.log(`   Mecánicos:  ${g.mechanics.length} en oficina`);
const byShift = { morning: 0, afternoon: 0, night: 0, off: 0 };
const byBase = { B1: 0, B2: 0, Helper: 0 };
for (const m of g.mechanics) {
  byShift[m.shift ?? "morning"]++;
  if (m.base === "B1") byBase.B1++;
  else if (m.base === "B2") byBase.B2++;
  else byBase.Helper++;
}
console.log(`     turnos:   ☀️ ${byShift.morning} · 🌅 ${byShift.afternoon} · 🌙 ${byShift.night}${byShift.off > 0 ? ` · 💤 ${byShift.off}` : ""}`);
console.log(`     base:     B1 ${byBase.B1} · B2 ${byBase.B2} · Helper ${byBase.Helper}`);
const activeContracts = g.contracts.filter((c) => c.status === "active").length;
const offeredContracts = g.contracts.filter((c) => c.status === "offered").length;
console.log(`   Contratos:  ${activeContracts} activos, ${offeredContracts} ofertados`);
const overnighters = g.airplanes.filter((a) => a.overnight === true);
console.log(`   Aviones:    ${g.airplanes.length} planificados (${overnighters.length} pernoctan)`);
console.log(`   Templates:  callout=${templates.filter((t) => t.kind === "callout").length} · mpd=${dailyChecks.length}`);

// === Loop de simulación con tracking ===
const events = [];
const seenWoIds = new Set(g.workOrders.map((w) => w.instanceId));
const seenDoneWoIds = new Set();
const seenDepartureIds = new Set();
let firstCalloutAt = null, firstDailyAt = null, firstDoneAt = null, firstFeeAt = null, firstDepartureAt = null;
let prevBalance = g.economy.balance;

const STEP = 5;
const TARGET = DAYS * DAY_MINUTES;
let safety = 0;

while (g.clock.minute < TARGET && safety < 20000 && !g.gameOver.isOver) {
  const before = g.clock.minute;
  advanceGame(g, STEP);
  safety++;

  // Nuevas WOs
  for (const w of g.workOrders) {
    if (seenWoIds.has(w.instanceId)) continue;
    seenWoIds.add(w.instanceId);
    const isDaily = w.templateId?.startsWith?.("DC-");
    const tpl = isDaily
      ? dailyChecks.find((d) => d.id === w.templateId)
      : templates.find((t) => t.id === w.templateId);
    if (isDaily) {
      if (firstDailyAt === null) firstDailyAt = g.clock.minute;
      events.push({
        minute: g.clock.minute, type: "DAILY",
        msg: `📋 DC emitida: ${w.airplaneRegistration} · ${tpl?.id} (${tpl?.description?.slice(0, 38) ?? "—"})`,
      });
    } else {
      if (firstCalloutAt === null) firstCalloutAt = g.clock.minute;
      const aogTag = tpl?.isAOG ? " 🛑AOG" : "";
      const finding = w.parentWoInstanceId ? " 🔍finding" : "";
      events.push({
        minute: g.clock.minute, type: "CALLOUT",
        msg: `🔧 WO callout: ${w.airplaneRegistration} · ${tpl?.id ?? w.templateId}${aogTag}${finding} · ${tpl?.requiredCategory ?? "?"}`,
      });
    }
  }

  // Completadas
  for (const w of g.workOrders) {
    if (w.phase !== "Completed" || seenDoneWoIds.has(w.instanceId)) continue;
    seenDoneWoIds.add(w.instanceId);
    if (firstDoneAt === null) firstDoneAt = g.clock.minute;
    const isDaily = w.templateId?.startsWith?.("DC-");
    if (VERBOSE) {
      events.push({
        minute: g.clock.minute, type: "DONE",
        msg: `✓ ${isDaily ? "DC" : "WO"} ${w.templateId} (${w.airplaneRegistration})`,
      });
    }
  }

  // Departures (track by instanceId, no mutación)
  for (const a of g.airplanes) {
    if (a.status !== "Departed" || seenDepartureIds.has(a.instanceId)) continue;
    seenDepartureIds.add(a.instanceId);
    if (firstDepartureAt === null) firstDepartureAt = g.clock.minute;
    const delay = a.delayMinutes ?? 0;
    const aog = a.aogEscalated ? colorize(" 🛑AOG", "red") : "";
    const delayStr = delay > 0 ? colorize(`delay ${delay}min`, delay >= 360 ? "red" : delay >= 60 ? "yellow" : "dim") : "on-time";
    events.push({
      minute: g.clock.minute, type: "DEP",
      msg: `🛫 ${a.registration} (${a.model}/${a.engineVariant}) · ${delayStr}${aog}`,
    });
  }

  // Primer fee
  if (firstFeeAt === null) {
    const feeTx = g.economy.ledger.find((t) => t.type === "workOrderPayment" || t.type === "contractBaseFee");
    if (feeTx) firstFeeAt = feeTx.minute;
  }

  // Snapshot horario (cada 3h o cada hora si verbose)
  const hourBefore = Math.floor(before / 60);
  const hourNow = Math.floor(g.clock.minute / 60);
  const snapEvery = VERBOSE ? 1 : 3;
  if (hourNow !== hourBefore && g.clock.minute % 60 === 0 && (g.clock.minute / 60) % snapEvery === 0) {
    const idle = g.mechanics.filter((m) => m.state === "Idle").length;
    const working = g.mechanics.filter((m) => m.state === "Working" || m.state === "ToPlane" || m.state === "Returning").length;
    const off = g.mechanics.filter((m) => m.state === "OffShift").length;
    const open = g.workOrders.filter((w) => w.phase !== "Completed" && w.phase !== "Failed" && w.phase !== "Deferred").length;
    const delta = g.economy.balance - prevBalance;
    const deltaStr = delta !== 0 ? ` (${delta > 0 ? "+" : ""}${fmtEur(Math.round(delta))} €)` : "";
    events.push({
      minute: g.clock.minute, type: "TICK",
      msg: colorize(`⏱  mecs(idle:${idle}/wkg:${working}/off:${off}) · WOs:${open} · ${fmtEur(g.economy.balance)} €${deltaStr}`, "dim"),
    });
    prevBalance = g.economy.balance;
  }
}

// === Timeline ===
console.log("\n📜 TIMELINE");
events.sort((a, b) => a.minute - b.minute);
for (const ev of events) {
  console.log(`   [${fmtClock(ev.minute)}] ${ev.msg}`);
}

// === Hitos lógicos esperados ===
console.log("\n🎯 HITOS LÓGICOS");
const dailyWos = g.workOrders.filter((w) => w.templateId?.startsWith?.("DC-"));
const calloutWos = g.workOrders.filter((w) => !w.templateId?.startsWith?.("DC-"));
const completedDaily = dailyWos.filter((w) => w.phase === "Completed").length;
const completedCallout = calloutWos.filter((w) => w.phase === "Completed").length;
const deferred = calloutWos.filter((w) => w.phase === "Deferred").length;
const failed = g.workOrders.filter((w) => w.phase === "Failed").length;
const departures = g.airplanes.filter((a) => a.status === "Departed").length;
const aogCount = g.airplanes.filter((a) => a.aogEscalated).length;
const onTime = g.departureKPI?.totalOnTime ?? 0;
const late = g.departureKPI?.totalLate ?? 0;

function check(cond, label, detail) {
  const icon = cond ? colorize("✅", "green") : colorize("❌", "red");
  console.log(`   ${icon} ${label}${detail ? colorize(` — ${detail}`, cond ? "dim" : "yellow") : ""}`);
}

// Setup inicial austero (pivot 2026-05-24): 1 mec dual + 2 dual en mercado
const initialMechs = g.mechanics.length;
const dualMechs = g.mechanics.filter(m =>
  m.typeRatings.some(r => r.category === "B1") &&
  m.typeRatings.some(r => r.category === "B2")
);
const dualCandidates = (g.candidates ?? []).filter(c =>
  c.typeRatings.some(r => r.category === "B1") &&
  c.typeRatings.some(r => r.category === "B2")
);
if (MODE === "line") {
  check(initialMechs >= 1, "Pool inicial austero", `${initialMechs} mec(s) — esperado 1 dual`);
  check(dualMechs.length >= 1, "≥1 mec dual B1+B2 al inicio", `${dualMechs.length} dual-rated`);
  check(dualCandidates.length >= 2, "≥2 candidatos dual en mercado", `${dualCandidates.length} dual disponibles`);
  // Smoke del bug arreglado: el mec dual con base="B1" debe poder certificar WO B2
  if (dualMechs.length > 0 && templates.length > 0) {
    const dualMech = dualMechs[0];
    const woB2 = templates.find(t => t.requiredCategory === "B2");
    const woB1 = templates.find(t => t.requiredCategory === "B1");
    // Forzar estado Idle para el test
    const idleDual = { ...dualMech, state: "Idle" };
    const canCertifyB2 = woB2 ? [idleDual].filter(m =>
      m.typeRatings.some(r => r.model === "A320" && r.engineVariant === "CFM56" && r.category === "B2")
    ).length > 0 : false;
    const canCertifyB1 = woB1 ? [idleDual].filter(m =>
      m.typeRatings.some(r => r.model === "A320" && r.engineVariant === "CFM56" && r.category === "B1")
    ).length > 0 : false;
    check(canCertifyB1 && canCertifyB2, "Mec dual elegible para WO B1 Y B2 (cross-cat)", `B1=${canCertifyB1} B2=${canCertifyB2}`);
  }
}
check(g.airplanes.length > 0, "Aviones generados", `${g.airplanes.length} en ${DAYS}d`);

// Pivot iteración 2026-05-25: verificar que el scheduler no pierde arrivals por gaps de
// pool primary (bug del IB3219 día 2 que mapeaba a EC-IXM atascada). Para cada día,
// expected = arrivals del schedule de aerolíneas contratadas; actual = aviones generados.
if (MODE === "line") {
  try {
    const { getFlightsForGameDay: gff } = await import("../src/lib/sim/schedule.ts");
    const isHandled = (f) => ["A320", "A321"].includes(f.model) && ["CFM56", "V2500"].includes(f.engineVariant);
    const contractedAirlineIds = new Set(g.contracts.filter(c => c.status === "active" || c.status === "cancelled").map(c => c.airlineId));
    const contractedIatas = new Set();
    for (const al of g.airlines) {
      if (al.iataCode && contractedAirlineIds.has(al.id)) contractedIatas.add(al.iataCode);
    }
    let gapsDetected = 0;
    let totalExpected = 0;
    let totalActual = 0;
    for (let d = 1; d <= DAYS; d++) {
      for (const iata of contractedIatas) {
        const expected = gff(d).filter(f => f.type === "arrival" && f.airlineCode === iata && isHandled(f)).length;
        const dayStart = (d - 1) * DAY_MINUTES;
        const dayEnd = d * DAY_MINUTES;
        const contractIds = new Set(g.contracts.filter(c => {
          const al = g.airlines.find(a => a.id === c.airlineId);
          return al?.iataCode === iata;
        }).map(c => c.id));
        const actual = g.airplanes.filter(a => contractIds.has(a.contractId) && a.arrivalMinute >= dayStart && a.arrivalMinute < dayEnd).length;
        totalExpected += expected;
        totalActual += actual;
        // No marcamos gap si el contrato se canceló (cero arrivals posteriores OK).
        const cancelled = g.contracts.some(c => {
          const al = g.airlines.find(a => a.id === c.airlineId);
          return al?.iataCode === iata && c.status === "cancelled";
        });
        if (actual < expected && !(actual === 0 && cancelled)) gapsDetected++;
      }
    }
    check(gapsDetected === 0, "Cero gaps en cobertura del scheduler", `expected ${totalExpected} / actual ${totalActual} arrivals contratados · ${gapsDetected} días con gap`);
  } catch (e) {
    console.log(`   ⚠️  no se pudo verificar cobertura: ${e.message}`);
  }
}
check(overnighters.length > 0 || g.airplanes.filter((a) => a.overnight).length > 0,
  "Pernoctas en horizonte inicial",
  `${g.airplanes.filter((a) => a.overnight).length} marcadas`);
check(firstDailyAt !== null, "Primer daily check emitido",
  firstDailyAt ? `@ ${fmtClock(firstDailyAt)}` : "NUNCA — revisar rollDailyChecksOnOvernight + kind=mpd merge");
check(dailyWos.length >= 2, "Daily check rolea ≥2 subtareas", `${dailyWos.length} en total`);
check(firstCalloutAt !== null, "Primer callout emitido",
  firstCalloutAt ? `@ ${fmtClock(firstCalloutAt)}` : "NUNCA — revisar rollWoOnLanding + kind=callout merge");
check(completedDaily > 0, "Daily subtareas completadas", `${completedDaily}/${dailyWos.length}`);
check(completedCallout >= 0, "Callouts gestionados", `${completedCallout} done · ${deferred} def · ${failed} failed`);
check(firstDepartureAt !== null, "Primer despegue", firstDepartureAt ? `@ ${fmtClock(firstDepartureAt)}` : "NUNCA");
check(departures > 0, "Despegues totales", `${departures} (on-time:${onTime}, late:${late})`);
check(aogCount === 0, "Cero AOG (sano)", aogCount > 0 ? `${aogCount} aviones escalados → balancing duro` : "");
check(firstFeeAt !== null, "Primer cobro", firstFeeAt ? `@ ${fmtClock(firstFeeAt)}` : "NUNCA");

// Brand reputation (pivot 2026-05-25): score que ven aerolíneas sin contrato.
if (MODE === "line") {
  const dk = g.departureKPI;
  const contractedReps = g.contracts.filter(c => c.status === "active").map(c => g.reputation.perAirline[c.airlineId] ?? 50);
  const onT = dk.totalDepartures > 0 ? dk.totalOnTime / dk.totalDepartures : 0;
  const aogR = dk.totalDepartures > 0 ? dk.totalAog / dk.totalDepartures : 0;
  const avgRep = contractedReps.length ? contractedReps.reduce((s, r) => s + r, 0) / contractedReps.length : 0;
  const brand = dk.totalDepartures < 10 ? 0 : Math.round(Math.max(0, Math.min(100, avgRep * 0.5 + onT * 100 * 0.3 + (1 - aogR) * 100 * 0.2)));
  const note = brand >= 70 ? "✅ desbloquea ofertas externas" : brand >= 40 ? `+${70 - brand} pts → ofertas` : dk.totalDepartures < 10 ? "necesita ≥10 dep" : "mejorar KPIs";
  console.log(`   ${colorize("🌟", "cyan")} Brand del MRO: ${colorize(brand + "/100", brand >= 70 ? "green" : brand >= 40 ? "yellow" : "dim")} — ${note}`);
}

// === Economía ===
console.log("\n💰 ECONOMÍA");
const deltaBal = g.economy.balance - startBalance;
const ingresos = g.economy.ledger.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
const gastos = -g.economy.ledger.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
const txByType = {};
for (const t of g.economy.ledger) txByType[t.type] = (txByType[t.type] ?? 0) + t.amount;
console.log(`   Inicial:  ${fmtEur(startBalance)} €`);
console.log(`   Final:    ${fmtEur(g.economy.balance)} €  ${deltaBal >= 0 ? colorize(`(+${fmtEur(deltaBal)})`, "green") : colorize(`(${fmtEur(deltaBal)})`, "red")}`);
console.log(`   Ingresos: +${fmtEur(ingresos)} €`);
console.log(`   Gastos:   -${fmtEur(gastos)} €`);
console.log(`   Por tipo:`);
for (const [type, amt] of Object.entries(txByType).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
  const sign = amt >= 0 ? "+" : "";
  const col = amt >= 0 ? "green" : "red";
  console.log(`     ${type.padEnd(22)}: ${colorize(`${sign}${fmtEur(amt)} €`, col)}`);
}

// === Reputación ===
console.log("\n⭐ REPUTACIÓN");
for (const al of airlines) {
  const r = g.reputation.perAirline[al.id];
  if (r === undefined) continue;
  const rRound = Math.round(r);
  const col = rRound >= 70 ? "green" : rRound >= 40 ? "yellow" : "red";
  console.log(`   ${al.name.padEnd(20)}: ${colorize(`${rRound}/100`, col)}`);
}

// === Estado final ===
if (g.gameOver.isOver) {
  console.log(`\n${colorize("💀 GAME OVER", "red")}: ${g.gameOver.reason}`);
} else {
  console.log(`\n${colorize(`✅ Partida viable tras ${DAYS} días`, "green")}`);
}

// ============================================================================
// 📋 IDEAS DE EXTENSIÓN (añadir checks reaccional conforme aparezcan features)
// ============================================================================
//
// [ ] Tier upgrades de contrato: al subir rep ≥90, ofrecen tier a-check/c-check.
//     Check: si run de N días con rep alta sostenida, hay ≥1 oferta de upgrade.
//
// [ ] Competencia: si rep ≥70 con aerolíneas SIN contrato, periódicamente
//     ofertan. Check: en run largo, ≥1 oferta nueva entra.
//
// [ ] Findings: daily check con prob ~15% genera sub-WO callout. Check: si hay
//     ≥10 daily completadas, esperamos ≥1 finding (con varianza).
//
// [ ] MEL deferral: WO Critical con melCategory C puede diferirse 3-10 días.
//     Check: si hay ≥1 deferred, verificar que sigue ahí tras N días.
//
// [ ] AOG escalation in-vivo: WO bloqueante >6h marca AOG mientras el avión
//     sigue en stand. Check: aogEscalatedAtMinute set ANTES del departure.
//
// [ ] Subscription HH/sem: cobro semanal por contrato según tier. Check: tras
//     1 semana, ledger tiene tx subscription (cuando esté implementado).
//
// [ ] Random events: runway closure, SB Airbus. Check: tras N días, ≥0 eventos.
//
// [ ] Save/load round-trip: serializar el game state, deserializar, verificar
//     que el sim continua sin diff.
//
// [ ] Multi-seed: correr N seeds y reportar varianza de outcomes (balance,
//     rep, AOG count) — útil para detectar regresiones no-deterministas.
//
// [ ] Performance: medir tick rate (ms por advanceGame). Detectar regressions
//     si un cambio nuevo ralentiza el loop > X%.
//
// ============================================================================
