// Tests Bloque L — shifts (informativos en MVP), moral, training activo.

import {
  shiftForMinuteOfDay,
  inShift,
  moralMultiplier,
  effectiveWeeklySalary,
  effectiveEfficiencyNow,
  tickMoral,
  applyMoralDelta,
  startActiveTraining,
  tickActiveTraining,
  NIGHT_SHIFT_SALARY_MULT,
  ACTIVE_TRAINING_COST_EUR,
  ACTIVE_TRAINING_DAYS,
  DEFAULT_MORAL,
} from "../src/lib/sim/shifts.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { DAY_MINUTES } from "../src/lib/sim/time.ts";
import { createGame, advanceGame, setMechanicShift, startTrainingFor } from "../src/lib/game.ts";
import { readFileSync } from "node:fs";

const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));
const defs = JSON.parse(readFileSync(new URL("../src/lib/data/maintenance_checks.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== shiftForMinuteOfDay ===");
expect(shiftForMinuteOfDay(7 * 60) === "morning", "07:00 → morning");
expect(shiftForMinuteOfDay(13 * 60 + 59) === "morning", "13:59 → morning (límite)");
expect(shiftForMinuteOfDay(14 * 60) === "afternoon", "14:00 → afternoon");
expect(shiftForMinuteOfDay(21 * 60 + 59) === "afternoon", "21:59 → afternoon");
expect(shiftForMinuteOfDay(22 * 60) === "night", "22:00 → night");
expect(shiftForMinuteOfDay(3 * 60) === "night", "03:00 → night");
expect(shiftForMinuteOfDay(5 * 60 + 59) === "night", "05:59 → night");

console.log("\n=== inShift ===");
const mMorning = { shift: "morning" };
const mAfternoon = { shift: "afternoon" };
const mNight = { shift: "night" };
const mOff = { shift: "off" };
expect(inShift(mMorning, 8 * 60) === true, "morning mech a las 08:00 → in shift");
expect(inShift(mMorning, 20 * 60) === false, "morning mech a las 20:00 → fuera");
expect(inShift(mAfternoon, 18 * 60) === true, "afternoon mech a las 18:00 → in");
expect(inShift(mNight, 2 * 60) === true, "night mech a las 02:00 → in");
expect(inShift(mNight, 12 * 60) === false, "night mech a las 12:00 → fuera");
expect(inShift(mOff, 8 * 60) === false, "off mech → siempre fuera");
expect(inShift({ shift: "morning" }, 8 * 60 + 3 * DAY_MINUTES) === true, "shift es periódico (día 3 a las 08:00)");

console.log("\n=== moralMultiplier ===");
expect(moralMultiplier(0) === 0.5, "moral=0 → 0.5x");
expect(moralMultiplier(100) === 1.2, "moral=100 → 1.2x");
expect(Math.abs(moralMultiplier(50) - (0.5 + 0.35)) < 0.001, "moral=50 → 0.85x");
expect(Math.abs(moralMultiplier(70) - (0.5 + 0.49)) < 0.001, "moral=70 → 0.99x");
expect(moralMultiplier(-10) === 0.5, "moral negativo se clampa a 0");
expect(moralMultiplier(150) === 1.2, "moral >100 se clampa");

console.log("\n=== effectiveWeeklySalary ===");
const mDay = { weeklySalary: 1000, shift: "morning" };
const mNgt = { weeklySalary: 1000, shift: "night" };
expect(effectiveWeeklySalary(mDay) === 1000, "morning → salario base");
expect(effectiveWeeklySalary(mNgt) === Math.round(1000 * NIGHT_SHIFT_SALARY_MULT), `night → ×${NIGHT_SHIFT_SALARY_MULT}`);

console.log("\n=== effectiveEfficiencyNow ===");
const m1 = { efficiency: 1.0, shift: "morning", moral: 70, state: "Working" };
expect(Math.abs(effectiveEfficiencyNow(m1, 8 * 60) - 0.99) < 0.01, "in shift, moral=70 → 0.99");
expect(effectiveEfficiencyNow(m1, 20 * 60) === 0, "fuera de shift → 0");
expect(effectiveEfficiencyNow({ ...m1, state: "Training" }, 8 * 60) === 0, "en Training → 0");

console.log("\n=== tickMoral ===");
const m2 = { state: "Idle", moral: 50 };
const r1 = tickMoral([m2], DAY_MINUTES); // 1 día entero
expect(r1[0].moral > 50, `Idle 1d → moral sube (got ${r1[0].moral})`);
const m3 = { state: "Working", moral: 90 };
const r2 = tickMoral([m3], DAY_MINUTES);
expect(r2[0].moral < 90, `Working 1d → moral baja (got ${r2[0].moral})`);
const m4 = { state: "OffShift", moral: 60 };
const r3 = tickMoral([m4], DAY_MINUTES);
expect(r3[0].moral === 60, "OffShift → moral no cambia");
const m5 = { state: "Idle", moral: 100 };
const r4 = tickMoral([m5], DAY_MINUTES);
expect(r4[0].moral === 100, "moral=100 con +delta → clamp 100");

console.log("\n=== applyMoralDelta ===");
const m6 = { moral: 50 };
expect(applyMoralDelta(m6, 10).moral === 60, "+10");
expect(applyMoralDelta(m6, -100).moral === 0, "-100 clamp 0");
expect(applyMoralDelta({ moral: 95 }, 20).moral === 100, "+20 clamp 100");

console.log("\n=== training activo ===");
const m7 = { id: "M-001", name: "Test", state: "Idle", efficiency: 1, base: null, typeRatings: [], weeklySalary: 100, moral: 70 };
const startRes = startActiveTraining(m7, 1000);
expect(startRes.ok === true, "start training Idle ok");
expect(startRes.cost === ACTIVE_TRAINING_COST_EUR, `cost = ${ACTIVE_TRAINING_COST_EUR}`);
expect(startRes.endMinute === 1000 + ACTIVE_TRAINING_DAYS * DAY_MINUTES, `endMinute correct`);
expect(startRes.mechanic.state === "Training", "state Training");

const m8 = { id: "M-002", state: "Working" };
expect(startActiveTraining(m8, 0).ok === false, "no se puede entrenar Working");

console.log("\n=== tickActiveTraining ===");
// Helper en Training → al finalizar promociona a B1
const helper = {
  id: "M-100", name: "Helper", state: "Training", base: null, typeRatings: [],
  efficiency: 1, weeklySalary: 100, moral: 70, activeTrainingUntilMinute: 1000,
};
const tt1 = tickActiveTraining([helper], 999, createRng(1), 500, 800);
expect(tt1.events.length === 0, "antes del fin → 0 eventos");
expect(tt1.mechanics[0].state === "Training", "sigue Training");
const tt2 = tickActiveTraining([helper], 1001, createRng(1), 500, 800);
expect(tt2.events.length === 1, "tras endMinute → 1 evento");
expect(tt2.events[0].outcome === "promoted_b1", "helper → B1");
expect(tt2.mechanics[0].base === "B1", "base actualizada");
expect(tt2.mechanics[0].typeRatings.length === 1, "+1 rating");
expect(tt2.mechanics[0].weeklySalary === 500, "salario ajustado a b1Junior");
expect(tt2.mechanics[0].state === "Idle", "vuelve a Idle");

// B1 en Training → promociona a B2
const b1 = {
  id: "M-200", name: "B1mech", state: "Training", base: "B1",
  typeRatings: [{ model: "A320", engineVariant: "CFM56", category: "B1" }],
  efficiency: 1, weeklySalary: 500, moral: 70, activeTrainingUntilMinute: 1000,
};
const tt3 = tickActiveTraining([b1], 1001, createRng(2), 500, 800);
expect(tt3.events[0].outcome === "promoted_b2", "B1 → B2");
expect(tt3.mechanics[0].base === "B2", "base B2");

// B2 en Training → solo añade rating
const b2 = {
  id: "M-300", name: "B2mech", state: "Training", base: "B2",
  typeRatings: [{ model: "A320", engineVariant: "CFM56", category: "B2" }],
  efficiency: 1, weeklySalary: 800, moral: 70, activeTrainingUntilMinute: 1000,
};
const tt4 = tickActiveTraining([b2], 1001, createRng(3), 500, 800);
expect(tt4.events[0].outcome === "new_rating", "B2 → solo nuevo rating");
expect(tt4.mechanics[0].base === "B2", "sigue B2");

console.log("\n=== integración: setMechanicShift + startTrainingFor + weekly salary noche ===");
const g = createGame(balance, airlines, templates, 42, defs);
// Fase 4 Q4+Q6: distribución mixta 3 morning / 2 afternoon / 2 night.
const shiftCounts = g.mechanics.reduce((acc, m) => { acc[m.shift] = (acc[m.shift] ?? 0) + 1; return acc; }, {});
expect(shiftCounts.morning === 3 && shiftCounts.afternoon === 2 && shiftCounts.night === 2,
  `mix shifts default 3/2/2 (got ${JSON.stringify(shiftCounts)})`);
expect(g.mechanics.every(m => m.moral === 70), "todos arrancan con moral 70");

const target = g.mechanics[0];
const res = setMechanicShift(g, target.id, "night");
expect(res.ok === true, "setShift ok");
expect(g.mechanics.find(m => m.id === target.id).shift === "night", "shift cambiado a night");

const balBefore = g.economy.balance;
const trainRes = startTrainingFor(g, g.mechanics[1].id);
expect(trainRes.ok === true, "training iniciado");
expect(g.economy.balance === balBefore - ACTIVE_TRAINING_COST_EUR, "balance -= 5k €");
expect(g.mechanics[1].state === "Training", "state Training");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
