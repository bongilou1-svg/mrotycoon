// Tests del shift gating productivo — Fase 4 Q1+Q2+Q3.
//   Q1: teamEffectiveEfficiency filtra mecánicos fuera de su shift (cert off-shift → 0).
//   Q2/Q3: tickShiftTransitions transiciona Idle↔OffShift y libera WOs cuando cert sale.
//   Q4: distribución inicial mixta 4 morning / 2 afternoon / 1 night.

import { teamEffectiveEfficiency, assignMechanicsToWo } from "../src/lib/sim/assignment.ts";
import { tickShiftTransitions, inShift, shiftForMinuteOfDay } from "../src/lib/sim/shifts.ts";
import { generateInitialMechanics } from "../src/lib/sim/mechanics.ts";
import { createGame, advanceGame } from "../src/lib/game.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); }
}

// ---- Q1: teamEffectiveEfficiency filtra por shift ----
console.log("\n=== Q1: teamEffectiveEfficiency filtra por shift ===");
{
  const mech = {
    id: "M-001", name: "Test", base: "B1", typeRatings: [],
    efficiency: 1.0, weeklySalary: 1000, state: "Working",
    assignedWoInstanceId: "W1", assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "morning", moral: 70,
  };
  const wo = { instanceId: "W1", assignedMechanicIds: ["M-001"] };

  // Sin nowMinute → no filtra (comportamiento legacy)
  const effLegacy = teamEffectiveEfficiency(wo, [mech]);
  expect(effLegacy > 0, `sin nowMinute, eff > 0 (got ${effLegacy.toFixed(2)})`);

  // nowMinute en franja morning (10:00 = 600 min) → eff > 0
  const effMorning = teamEffectiveEfficiency(wo, [mech], 600);
  expect(effMorning > 0, `morning shift + nowMinute morning → eff > 0 (got ${effMorning.toFixed(2)})`);

  // nowMinute en franja afternoon (16:00 = 960 min) → cert off-shift, eff = 0
  const effAfternoon = teamEffectiveEfficiency(wo, [mech], 960);
  expect(effAfternoon === 0, `morning shift + nowMinute afternoon → eff = 0 (got ${effAfternoon})`);

  // nowMinute en franja night (02:00 = 120 min) → off-shift, eff = 0
  const effNight = teamEffectiveEfficiency(wo, [mech], 120);
  expect(effNight === 0, `morning shift + nowMinute night → eff = 0 (got ${effNight})`);
}

// ---- Q1: helper off-shift contribuye 0 pero certifier on-shift mantiene eff ----
console.log("\n=== Q1: helper off-shift contribuye 0, cert on-shift sigue ===");
{
  const cert = {
    id: "C-001", name: "Cert", base: "B1", typeRatings: [],
    efficiency: 1.0, weeklySalary: 1000, state: "Working",
    assignedWoInstanceId: "W2", assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "morning", moral: 70,
  };
  const helperInShift = { ...cert, id: "H-001", name: "HelperIn", efficiency: 0.8, shift: "morning" };
  const helperOff = { ...cert, id: "H-002", name: "HelperOff", efficiency: 0.8, shift: "night" };
  const wo = { instanceId: "W2", assignedMechanicIds: ["C-001", "H-001", "H-002"] };
  const noFilter = teamEffectiveEfficiency(wo, [cert, helperInShift, helperOff]);
  const filterMorning = teamEffectiveEfficiency(wo, [cert, helperInShift, helperOff], 600);
  expect(filterMorning < noFilter, `con filtro morning: helper night NO contribuye (filter=${filterMorning.toFixed(2)} < noFilter=${noFilter.toFixed(2)})`);
  expect(filterMorning > 0, `cert + helper en morning siguen produciendo (got ${filterMorning.toFixed(2)})`);
}

// ---- Q2: tickShiftTransitions — Idle off-shift → OffShift, OffShift in-shift → Idle ----
console.log("\n=== Q2: Idle ↔ OffShift transitions ===");
{
  const mechs = [
    { id: "M-1", name: "MornIdle", base: "B1", typeRatings: [], efficiency: 1, weeklySalary: 1000,
      state: "Idle", assignedWoInstanceId: null, assignedCheckInstanceId: null,
      stateRemainingMinutes: 0, shift: "morning", moral: 70 },
    { id: "M-2", name: "NightOffShift", base: "B1", typeRatings: [], efficiency: 1, weeklySalary: 1000,
      state: "OffShift", assignedWoInstanceId: null, assignedCheckInstanceId: null,
      stateRemainingMinutes: 0, shift: "night", moral: 70 },
  ];
  // En minuto 120 (02:00) → M-1 morning está OFF, M-2 night está ON.
  const r1 = tickShiftTransitions(mechs, [], 120);
  expect(r1.mechanics[0].state === "OffShift", "Idle morning a 02:00 → OffShift");
  expect(r1.mechanics[1].state === "Idle", "OffShift night a 02:00 → Idle (entra al shift)");
  expect(r1.events.some(e => e.type === "mech_entered_shift" && e.mechanicId === "M-2"), "evento mech_entered_shift para M-2");

  // En minuto 600 (10:00) → M-1 morning está ON, M-2 night está OFF.
  const r2 = tickShiftTransitions(mechs, [], 600);
  expect(r2.mechanics[0].state === "Idle", "Idle morning a 10:00 → Idle (sin cambio)");
  expect(r2.mechanics[1].state === "OffShift", "OffShift night a 10:00 → OffShift (sin cambio)");
}

// ---- Q3: Working/ToPlane fuera de shift → libera WO, OffShift ----
console.log("\n=== Q3: Working off-shift libera WO ===");
{
  const cert = { id: "C-1", name: "Cert", base: "B1", typeRatings: [], efficiency: 1, weeklySalary: 1000,
    state: "Working", assignedWoInstanceId: "W1", assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "morning", moral: 70 };
  const helper = { id: "H-1", name: "Helper", base: null, typeRatings: [], efficiency: 0.8, weeklySalary: 600,
    state: "Working", assignedWoInstanceId: "W1", assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "afternoon", moral: 70 };
  const wo = { instanceId: "W1", templateId: "T1", airplaneRegistration: "EC-ABC", airplaneInstanceId: "AI-1",
    emissionMinute: 0, slaMinute: 100, phase: "MainTask", phaseElapsedMinutes: 30,
    assignedMechanicIds: ["C-1", "H-1"] };
  // A las 22:00 ambos están fuera de shift
  const r = tickShiftTransitions([cert, helper], [wo], 22 * 60);
  expect(r.mechanics[0].state === "OffShift", "Cert pasa a OffShift");
  expect(r.mechanics[0].assignedWoInstanceId === null, "Cert pierde assignedWoInstanceId");
  expect(r.mechanics[1].state === "OffShift", "Helper pasa a OffShift");
  expect(r.workOrders[0].assignedMechanicIds.length === 0, "WO sin mecánicos");
  expect(r.workOrders[0].phase === "ToPlane", "WO vuelve a ToPlane phase (sin progreso por trabajo)");
  expect(r.events.some(e => e.type === "wo_paused_no_certifier" && e.woInstanceId === "W1"), "evento wo_paused_no_certifier emitido");
  expect(r.events.filter(e => e.type === "mech_left_shift").length === 2, "2 eventos mech_left_shift (cert + helper)");
}

// ---- Q3: solo helper sale, cert sigue → WO mantiene cert ----
console.log("\n=== Q3: helper sale, cert sigue → WO no pausa ===");
{
  const cert = { id: "C-1", name: "Cert", base: "B1", typeRatings: [], efficiency: 1, weeklySalary: 1000,
    state: "Working", assignedWoInstanceId: "W1", assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "morning", moral: 70 };
  const helper = { id: "H-1", name: "Helper", base: null, typeRatings: [], efficiency: 0.8, weeklySalary: 600,
    state: "Working", assignedWoInstanceId: "W1", assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "afternoon", moral: 70 };
  const wo = { instanceId: "W1", templateId: "T1", airplaneRegistration: "EC-ABC", airplaneInstanceId: "AI-1",
    emissionMinute: 0, slaMinute: 100, phase: "MainTask", phaseElapsedMinutes: 30,
    assignedMechanicIds: ["C-1", "H-1"] };
  // A las 10:00 cert morning ON, helper afternoon OFF
  const r = tickShiftTransitions([cert, helper], [wo], 10 * 60);
  expect(r.mechanics[0].state === "Working", "Cert sigue Working");
  expect(r.mechanics[1].state === "OffShift", "Helper pasa a OffShift");
  expect(r.workOrders[0].assignedMechanicIds.length === 1, "WO con 1 mecánico (cert)");
  expect(r.workOrders[0].assignedMechanicIds[0] === "C-1", "Cert sigue asignado");
  expect(r.workOrders[0].phase === "MainTask", "WO sigue en MainTask");
}

// ---- Q3: mecánico en check NO se ve afectado por gating ----
console.log("\n=== Q3: mecánico en check NO se ve afectado por gating ===");
{
  const mech = { id: "M-1", name: "M", base: "B1", typeRatings: [], efficiency: 1, weeklySalary: 1000,
    state: "Working", assignedWoInstanceId: null, assignedCheckInstanceId: "MC-001",
    stateRemainingMinutes: 0, shift: "morning", moral: 70 };
  // Hora 02:00 — fuera de morning, pero en check
  const r = tickShiftTransitions([mech], [], 120);
  expect(r.mechanics[0].state === "Working", "Mecánico en check sigue Working aunque off-shift");
  expect(r.mechanics[0].assignedCheckInstanceId === "MC-001", "Sigue asignado al check");
  expect(r.events.length === 0, "No eventos emitidos por mec en check");
}

// ---- Q3: mecánicos Training y Returning NO se ven afectados ----
console.log("\n=== Q3: Training/Returning NO se ven afectados ===");
{
  const training = { id: "T-1", name: "T", base: "B1", typeRatings: [], efficiency: 1, weeklySalary: 1000,
    state: "Training", assignedWoInstanceId: null, assignedCheckInstanceId: null,
    stateRemainingMinutes: 0, shift: "morning", moral: 70 };
  const returning = { ...training, id: "R-1", name: "R", state: "Returning", stateRemainingMinutes: 1 };
  const r = tickShiftTransitions([training, returning], [], 120);
  expect(r.mechanics[0].state === "Training", "Training intacto");
  expect(r.mechanics[1].state === "Returning", "Returning intacto");
}

// ---- Q4+Q6: distribución inicial mixta 3/2/2 ----
console.log("\n=== Q4: distribución inicial mixta 3 morning / 2 afternoon / 2 night ===");
{
  const rng = createRng(42);
  const mechs = generateInitialMechanics(rng, balance);
  const counts = mechs.reduce((acc, m) => { acc[m.shift] = (acc[m.shift] ?? 0) + 1; return acc; }, {});
  expect(counts.morning === 3, `3 morning (got ${counts.morning})`);
  expect(counts.afternoon === 2, `2 afternoon (got ${counts.afternoon})`);
  expect(counts.night === 2, `2 night (got ${counts.night})`);
}

// ---- Integración: createGame con shiftGatingEnabled default true ----
console.log("\n=== Integración: createGame shiftGatingEnabled default true ===");
{
  const g = createGame(balance, airlines, templates, 42, defs);
  expect(g.shiftGatingEnabled === true, "shiftGatingEnabled default true");
  expect(g.mechanics.length === 7, "7 mecánicos iniciales");
}

// ---- Integración: advanceGame en franja off-shift no progresa WOs ----
console.log("\n=== Integración: WO en franja off-shift no progresa ===");
{
  const g = createGame(balance, airlines, templates, 42, defs);
  g.autoPauseEnabled = false;
  g.clock.speed = 1;
  // Forzar reloj a 02:00 (madrugada) — solo el night mech está in-shift, los morning están off.
  g.clock.minute = 120;
  // Avanzar 60 min — los morning Idle deberían pasar a OffShift
  advanceGame(g, 60);
  const morningMechs = g.mechanics.filter(m => m.shift === "morning");
  const allOff = morningMechs.every(m => m.state === "OffShift" || m.state === "Returning");
  expect(allOff, `morning mechs en OffShift a las 03:00 (state: ${morningMechs.map(m => m.state).join(",")})`);
  const nightMechs = g.mechanics.filter(m => m.shift === "night");
  // night mechs Idle pueden seguir Idle (in-shift) o Working si auto-asignaron
  expect(nightMechs.every(m => m.state !== "OffShift"), `night mechs NO OffShift en 03:00`);
}

// ---- Integración: shift gating disabled => mecánicos siempre Idle/Working ----
console.log("\n=== Integración: shiftGatingEnabled=false respeta comportamiento legacy ===");
{
  const g = createGame(balance, airlines, templates, 42, defs);
  g.autoPauseEnabled = false;
  g.shiftGatingEnabled = false;
  g.clock.speed = 1;
  g.clock.minute = 120; // 02:00 — todos morning estarían off normalmente
  advanceGame(g, 60);
  const anyOff = g.mechanics.some(m => m.state === "OffShift");
  expect(!anyOff, `con gating disabled, NINGUNO en OffShift (anyOff=${anyOff})`);
}

// ---- shiftForMinuteOfDay edge cases ----
console.log("\n=== shiftForMinuteOfDay edges ===");
{
  expect(shiftForMinuteOfDay(0) === "night", "00:00 → night");
  expect(shiftForMinuteOfDay(6 * 60 - 1) === "night", "05:59 → night");
  expect(shiftForMinuteOfDay(6 * 60) === "morning", "06:00 → morning");
  expect(shiftForMinuteOfDay(14 * 60 - 1) === "morning", "13:59 → morning");
  expect(shiftForMinuteOfDay(14 * 60) === "afternoon", "14:00 → afternoon");
  expect(shiftForMinuteOfDay(22 * 60) === "night", "22:00 → night");
  expect(shiftForMinuteOfDay(23 * 60 + 59) === "night", "23:59 → night");
}

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
