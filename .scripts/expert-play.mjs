// expert-play.mjs — "echa tú una partida, pero hazme experto y juega a tope" (Dani 2026-06-11)
//
// Partida REAL automatizada con juicio de jugador experto, sobre el MISMO arranque que la UI:
// preset LEAS_oviedo (Rookie · 200k · 1 dual B1/B2 · contrato Vueling line), lineMode, shift
// gating ON, autoAssignTrivial default. El bot NO toca el sim: juega solo con las APIs públicas
// que usa la UI (assignCrewToWo, hireCandidate, acceptContractOffer, deferWoManually,
// setMechanicShift) + recomposición de cuadrillas como en la Oficina.
//
// Estrategia experta:
//  1. Día 1: fichar los 2 duales precargados del mercado (cap 5) y repartir turnos M/T.
//  2. Asignación: para cada WO sin asignar, elegir la cuadrilla ELEGIBLE (regla real del sim)
//     con mejor cierre proyectado (viaje + fases/eficiencia) vs SLA — la lógica del cajón nuevo.
//  3. Si nadie llega a tiempo y es MEL-diferible con SLA en riesgo → diferir (mejor un defer
//     limpio que un late + penalty).
//  4. Ofertas de contrato: aceptar si el late-ratio reciente lo permite (objetivo: Volotea base).
//  5. Pernoctas a la vista (contrato withOvernight) → mover un dual a turno de noche.
//
// Uso: node .scripts/expert-play.mjs [seed] [días]

import { readFileSync } from "node:fs";
import {
  createGame, advanceGame, assignCrewToWo, acceptContractOffer, hireCandidate,
  deferWoManually, setMechanicShift, canUnlockHangars,
} from "../src/lib/game.ts";
import { buildDefaultCrews } from "../src/lib/sim/crews.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { getTdrPct } from "../src/lib/types/departureKPI.ts";

const SEED = parseInt(process.argv[2] ?? "7", 10);
const DAYS = parseInt(process.argv[3] ?? "28", 10);
const STEP = 5; // lección auto_playtest: pasos grandes saltan ventanas de generación

// === Datos (réplica sim-all/smoke-runtime) ===
const root = new URL("../", import.meta.url);
const J = (p) => JSON.parse(readFileSync(new URL(p, root)));
const balance = J("src/lib/data/balance.json");
const airlines = J("src/lib/data/airlines.json");
const classification = J("src/lib/data/wo_classification.json");
const kindMap = new Map(classification.classifications.map((c) => [c.id, c.kind]));
const templates = J("src/lib/data/workorders.json").map((w) => ({ ...w, kind: kindMap.get(w.id) ?? "callout" }));
const defs = J("src/lib/data/maintenance_checks.json");
const dailyChecks = J("src/lib/data/daily_checks.json").map((d) => ({ ...d, kind: "mpd" }));
const preset = J("src/lib/data/airports/LEAS_oviedo.preset.json");

// === Partida (mismo arranque que startGameFromPreset de la UI) ===
const g = createGame(balance, airlines, templates, SEED, defs, dailyChecks, { lineMode: true, airportPreset: preset });
g.autoPauseEnabled = false;
g.shiftGatingEnabled = true;
g.clock.speed = 1;

const log = [];
const note = (msg) => { const m = g.clock.minute; const d = Math.floor(m / DAY_MINUTES) + 1; const hh = String(Math.floor((m % DAY_MINUTES) / 60)).padStart(2, "0"); const mm = String(m % 60).padStart(2, "0"); log.push(`D${d} ${hh}:${mm}  ${msg}`); };

// === Helpers de juicio experto (la MISMA lógica del cajón Asignar WO) ===
const ratios = balance.phaseDurationRatios;
const releaseMin = balance.releaseMinutes ?? 3;
const effOf = (m) => (m.efficiency || 1) * (0.5 + Math.max(0, Math.min(100, m.moral ?? 70)) / 100 * 0.7);
const mById = (id) => g.mechanics.find((m) => m.id === id);

function bestCrewFor(wo) {
  const ap = g.airplanes.find((a) => a.instanceId === wo.airplaneInstanceId);
  const tpl = g.templates.find((t) => t.id === wo.templateId);
  if (!ap || !tpl) return null;
  const travel = (g.standTravelMinutes && ap.standId && g.standTravelMinutes[ap.standId] != null)
    ? g.standTravelMinutes[ap.standId] : (balance.officeToStandMinutes ?? 2);
  const phasesMin = Math.round(tpl.durationMinutes * ratios.inspection)
    + Math.round(tpl.durationMinutes * ratios.mainTask)
    + Math.round(tpl.durationMinutes * ratios.test) + releaseMin;
  let best = null;
  for (const c of g.crews) {
    const officers = c.officerIds.map(mById).filter(Boolean);
    const cert = officers.find((m) => m.state === "Idle" && (m.typeRatings || []).some(
      (r) => r.model === ap.model && r.engineVariant === ap.engineVariant && r.category === tpl.requiredCategory));
    if (!cert) continue;
    const rest = [...c.officerIds, ...c.helperIds].filter((id) => id !== cert.id)
      .map(mById).filter((m) => m && m.state === "Idle").slice(0, 2);
    const certEff = effOf(cert);
    let team = certEff;
    for (const h of rest) team += Math.min(effOf(h) * 0.5, certEff * 0.5);
    const close = g.clock.minute + travel + phasesMin / Math.max(team, 0.1);
    const margin = wo.slaMinute - close;
    if (!best || margin > best.margin) best = { crew: c, margin, close };
  }
  return best;
}

function rebuildCrews(reason) {
  const allIdle = g.mechanics.every((m) => m.state === "Idle" || m.state === "OffShift");
  if (!allIdle) return false;
  g.crews = buildDefaultCrews(g.mechanics);
  note(`🔧 cuadrillas recompuestas (${g.crews.length}) — ${reason}`);
  return true;
}

// === Contadores de la partida ===
let hires = 0, accepts = 0, defers = 0, assigns = 0, lates = 0, aogs = 0, nightMoved = false;
let melRescued = 0, melExpired = 0, lastNotifId = 0; // deep pass 2026-07-01: telemetría de MEL diferidas
const deferredIds = new Set(); // instanceIds que el bot difirió (para clasificar desenlace al final)
const hitoDay = { volotea: null, caja: null, rep: null, hangares: null }; // 1er día en que cae cada gate
const seenAog = new Set(); const seenDeparted = new Set();
let lateRecent = []; // ventana de despachos para el juicio de aceptar contratos

// === Bucle principal ===
const totalMin = DAYS * DAY_MINUTES;
const dayRows = [];
let lastDay = 0;

for (let t = 0; t < totalMin; t += STEP) {
  advanceGame(g, STEP);
  if (g.gameOver.isOver) { note(`💀 GAME OVER: ${g.gameOver.reason}`); break; }
  const now = g.clock.minute;

  // 1) Día 1, 06:05 — fichar MIRANDO RATINGS (error de novato no hacerlo) y cubrir los
  //    3 turnos desde el día 1: el schedule real de OVD trae olas de callouts a ~08:15,
  //    ~12:30, ~16-17:30 y ~22:15 (la rotación que sale 23:10). Sin turno de noche, la ola
  //    de las 22:15 escala a AOG a las ~02:10 CADA noche → rep -60 en 5 días → rescisión.
  if (hires === 0 && now >= 365) {
    const score = (c) => {
      let s = 0;
      for (const r of (c.typeRatings || [])) if (r.model === "A320") s += (r.engineVariant === "CFM56" ? 2 : 1) * (r.category === "B1" ? 1.2 : 1);
      return s + (c.efficiency || 0);
    };
    const rated = g.candidates.filter((c) => (c.typeRatings || []).some((r) => r.model === "A320" && r.engineVariant === "CFM56"))
      .sort((a, b) => score(b) - score(a));
    note(`🧐 mercado: ${g.candidates.length} candidatos, ${rated.length} con rating A320/CFM56 → ${rated.slice(0, 3).map((c) => c.name + "(" + (c.base ?? "H") + "·" + (c.typeRatings || []).map((r) => r.category).join("+") + ")").join(", ")}`);
    for (const cand of rated.slice(0, 2)) {
      const r = hireCandidate(g, cand.id);
      if (r.ok) { hires++; note(`🤝 fichado ${cand.name} (${cand.base}) ratings ${(cand.typeRatings || []).map((r2) => r2.category + "/" + r2.engineVariant).join(",")}`); }
      else note(`✗ no pude fichar ${cand.name}: ${r.error}`);
    }
    // Helpers (cap 5): +50% de velocidad por helper en la cuadrilla — clave para las olas
    // de 2-3 callouts seguidos en el mismo turno. Uno a mañana y otro a tarde (las olas dobles).
    const helperCands = g.candidates.filter((c) => c.base === null).sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0));
    for (const hc of helperCands.slice(0, 2)) {
      const r = hireCandidate(g, hc.id);
      if (r.ok) { hires++; note(`🤝 helper fichado: ${hc.name} (eff ${hc.efficiency})`); }
    }
    // Turnos: un oficial por turno — el killer es la noche (rotación 22:15→23:10).
    const officers = g.mechanics.filter((m) => (m.base === "B1" || m.base === "B2") && !m.isLeadForeman);
    if (officers[1]) { const r = setMechanicShift(g, officers[1].id, "night"); if (r.ok) note(`🌙 ${officers[1].name} → turno de NOCHE (cubre la ola de las 22:15)`); else note(`✗ shift noche: ${r.error}`); }
    if (officers[2]) { const r = setMechanicShift(g, officers[2].id, "afternoon"); if (r.ok) note(`⏰ ${officers[2].name} → turno de tarde`); else note(`✗ shift tarde: ${r.error}`); }
    const helpersAll = g.mechanics.filter((m) => m.base === null && !m.isLeadForeman);
    if (helpersAll[0]) setMechanicShift(g, helpersAll[0].id, "morning");
    if (helpersAll[1]) setMechanicShift(g, helpersAll[1].id, "afternoon");
    rebuildCrews("plantilla nueva con cobertura 24h");
  }

  // 2) Pernoctas firmadas y sin cuadrilla de noche → mover el oficial más nuevo a noche.
  if (!nightMoved && g.contracts.some((c) => c.status === "active" && c.withOvernight)) {
    const officers = g.mechanics.filter((m) => (m.base === "B1" || m.base === "B2") && !m.isLeadForeman);
    const hasNight = officers.some((m) => m.shift === "night");
    const mov = officers.filter((m) => m.state === "Idle" || m.state === "OffShift").pop();
    if (!hasNight && mov) {
      const r = setMechanicShift(g, mov.id, "night");
      if (r.ok) { nightMoved = true; note(`🌙 pernoctas firmadas → ${mov.name} pasa a turno de NOCHE`); rebuildCrews("cobertura nocturna"); }
    }
  }

  // 3) Asignación experta de WOs sin equipo (callouts + findings + dailies rezagadas).
  for (const wo of g.workOrders) {
    if (wo.phase !== "ToPlane" || wo.assignedMechanicIds.length > 0) continue;
    const pick = bestCrewFor(wo);
    if (pick) {
      const r = assignCrewToWo(g, wo.instanceId, pick.crew.id);
      if (r.ok) { assigns++; if (pick.margin < 0) note(`⚠️ asignada ${wo.instanceId} a ${pick.crew.name} con SLA ya imposible (margen ${Math.round(pick.margin)}m)`); }
      else note(`✗ asignar ${wo.instanceId} a ${pick.crew.name} FALLÓ: ${r.error}`);
    } else {
      // nadie elegible AHORA: ¿diferir antes de comerse el late? Solo MEL y con SLA a <2h.
      const slaLeft = wo.slaMinute - now;
      const tpl = g.templates.find((t) => t.id === wo.templateId);
      if (tpl && !tpl.isAOG && slaLeft < 120 && slaLeft > 0) {
        const r = deferWoManually(g, wo.instanceId);
        if (r && r.ok) { defers++; deferredIds.add(wo.instanceId); note(`📋 diferida ${wo.instanceId} (${tpl.id} MEL) — nadie llegaba al SLA`); }
      }
    }
  }

  // 4) Ofertas de contrato — el objetivo Rookie es la base de Volotea.
  for (const c of g.contracts) {
    if (c.status !== "offered") continue;
    const lateRatio = lateRecent.length >= 6 ? lateRecent.filter(Boolean).length / lateRecent.length : 0;
    const al = g.airlines.find((a) => a.id === c.airlineId);
    if (lateRatio <= 0.25) {
      acceptOfferSafe(c, al);
    } else {
      note(`🚫 oferta de ${al?.name ?? c.airlineId} rechazada de momento (late-ratio ${(lateRatio * 100).toFixed(0)}%)`);
    }
  }

  // 5) Telemetría de despachos (para late-ratio) + AOGs.
  for (const a of g.airplanes) {
    if (a.actualDepartureMinute !== undefined && !seenDeparted.has(a.instanceId)) {
      seenDeparted.add(a.instanceId);
      const late = (a.delayMinutes || 0) >= 15;
      lateRecent.push(late); if (lateRecent.length > 12) lateRecent.shift();
      if (late) lates++;
    }
    if (a.aogEscalated && !seenAog.has(a.instanceId)) { seenAog.add(a.instanceId); aogs++; note(`🛑 AOG escalado: ${a.registration}`); }
  }

  // 5b) Telemetría de MEL diferidas (rescatadas vs vencidas) desde las notificaciones nuevas.
  for (const n of g.notifications) {
    if (n.id <= lastNotifId) continue;
    if (n.text.includes("MEL rectificada")) melRescued++;
    else if (n.text.includes("MEL expirada")) melExpired++;
  }
  if (g.notifications.length) lastNotifId = g.notifications[g.notifications.length - 1].id;

  // 6) Snapshot diario + tracking de PROGRESIÓN (deep pass 2026-07-01): día en que cae cada
  // hito de carrera (media de rep sobre CONTRATADAS, como la UI) y el gate de hangares.
  const day = Math.floor(now / DAY_MINUTES) + 1;
  if (day !== lastDay) {
    lastDay = day;
    const reps = Object.values(g.reputation.perAirline ?? {});
    const repAvg = reps.length ? Math.round(reps.reduce((s, v) => s + v, 0) / reps.length) : 0;
    const activeIds = g.contracts.filter((c) => c.status === "active").map((c) => c.airlineId);
    const ctrReps = activeIds.map((id) => g.reputation.perAirline[id] ?? 50);
    const ctrRepAvg = ctrReps.length ? Math.round(ctrReps.reduce((s, v) => s + v, 0) / ctrReps.length) : 0;
    dayRows.push({ day: day - 1, bal: Math.round(g.economy.balance), rep: repAvg, ctrRep: ctrRepAvg, contracts: activeIds.length, mechs: g.mechanics.length });
    const v7 = g.airlines.find((a) => a.iataCode === "V7");
    if (!hitoDay.volotea && v7 && g.contracts.some((c) => c.status === "active" && c.airlineId === v7.id)) hitoDay.volotea = day - 1;
    if (!hitoDay.caja && g.economy.balance >= 400000) hitoDay.caja = day - 1;
    if (!hitoDay.rep && ctrRepAvg >= 60 && now >= 2 * 7 * DAY_MINUTES) hitoDay.rep = day - 1;
    if (!hitoDay.hangares && canUnlockHangars(g)) hitoDay.hangares = day - 1;
  }
}

function acceptOfferSafe(c, al) {
  try {
    acceptContractOffer(g, c.id);
    accepts++;
    note(`🖋️ CONTRATO aceptado: ${al?.name ?? c.airlineId} (${c.tier ?? "line"}${c.withOvernight ? " · con pernoctas" : ""}) — fee ${(c.baseFeePerWeek ?? 0).toLocaleString("es-ES")} €/sem`);
  } catch (e) { note(`✗ aceptar oferta falló: ${e.message}`); }
}

// === Informe final ===
const woAll = [...g.workOrders, ...(g.archive?.workOrders ?? [])];
const woNonDc = woAll.filter((w) => !String(w.templateId).startsWith("DC-"));
const done = woAll.filter((w) => w.phase === "Completed").length;
const failed = woAll.filter((w) => w.phase === "Failed").length;
const deferredOpen = g.workOrders.filter((w) => w.phase === "Deferred").length;
const tdr = (() => { try { return getTdrPct(g.departureKPI).toFixed(1); } catch { return "n/a"; } })();
const reps = Object.entries(g.reputation.perAirline ?? {}).map(([id, v]) => `${(g.airlines.find((a) => a.id === id)?.iataCode) ?? id}:${Math.round(v)}`).join("  ");
const tx = {};
for (const t of g.economy.ledger ?? []) tx[t.type] = (tx[t.type] ?? 0) + t.amount;

console.log("\n══════════════ PARTIDA EXPERTA · LEAS Rookie · seed " + SEED + " · " + DAYS + " días ══════════════");
console.log("Balance final: " + Math.round(g.economy.balance).toLocaleString("es-ES") + " € (arranque 200.000) · Δ " + Math.round(g.economy.balance - 200000).toLocaleString("es-ES") + " €");
console.log("Game over: " + (g.gameOver.isOver ? "SÍ — " + g.gameOver.reason : "no") + " · TDR " + tdr + "% · AOGs " + aogs);
console.log("WOs: " + done + " completadas · " + failed + " failed · " + deferredOpen + " deferred vivas · " + lates + " despachos late(≥15m)");
console.log("Acciones bot: " + assigns + " asignaciones · " + hires + " fichajes · " + accepts + " contratos aceptados · " + defers + " defers");
// Desenlace REAL de cada WO que el bot difirió (busca en workOrders + archive por instanceId).
const woIndex = new Map();
for (const w of woAll) woIndex.set(w.instanceId, w);
let defDone = 0, defFailed = 0, defStillDeferred = 0, defOther = 0;
for (const id of deferredIds) {
  const w = woIndex.get(id);
  if (!w) { defOther++; continue; }
  if (w.phase === "Completed") defDone++;
  else if (w.phase === "Failed") defFailed++;
  else if (w.phase === "Deferred") defStillDeferred++;
  else defOther++;
}
console.log("MEL diferidas (" + deferredIds.size + " únicas): " + defDone + " RECTIFICADAS (avión volvió+rescate) · " + defFailed + " vencidas (-10k) · " + defStillDeferred + " vivas · " + defOther + " en curso/archivadas");
console.log("  (eventos: " + melRescued + " rescates · " + melExpired + " expiraciones notificadas)");
console.log("Rep por aerolínea: " + reps);
console.log("Contratos activos: " + g.contracts.filter((c) => c.status === "active").map((c) => (g.airlines.find((a) => a.id === c.airlineId)?.iataCode) + (c.withOvernight ? "(noche)" : "")).join(", "));
console.log("Plantilla: " + g.mechanics.map((m) => `${m.name.split(" ")[0]}[${m.base ?? "H"}·${m.shift ?? "?"}]`).join(" "));
const hd = (v) => (v ? "D" + v : "NO en " + DAYS + "d");
console.log("Progresión: Volotea " + hd(hitoDay.volotea) + " · caja400k " + hd(hitoDay.caja) + " · repClientes≥60 " + hd(hitoDay.rep) + " · GATE HANGARES " + hd(hitoDay.hangares));
console.log("\n— Ledger por tipo —");
for (const [k, v] of Object.entries(tx).sort((a, b) => a[1] - b[1])) console.log("  " + k.padEnd(26) + Math.round(v).toLocaleString("es-ES").padStart(12) + " €");
console.log("\n— Evolución diaria (día: balance · repAvg · contratos · mecs) —");
for (const r of dayRows.filter((_, i) => i % 2 === 0 || i === dayRows.length - 1)) console.log(`  D${String(r.day).padStart(2)}  ${String(r.bal.toLocaleString("es-ES")).padStart(10)} €   rep ${r.rep} (clientes ${r.ctrRep ?? "—"})   ctr ${r.contracts}   mecs ${r.mechs}`);
console.log("\n— Diario de a bordo (acciones del bot) —");
for (const l of log.slice(0, 60)) console.log("  " + l);
if (log.length > 60) console.log("  … (+" + (log.length - 60) + " entradas más)");
