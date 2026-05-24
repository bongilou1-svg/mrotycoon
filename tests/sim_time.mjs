// Tests del motor de tiempo. Sin framework, asserts manuales.

import {
  createClock,
  tick,
  setSpeed,
  advance,
  getDay,
  getWeek,
  getHour,
  getMinuteOfHour,
  getMinuteOfDay,
  isWeekStart,
  formatClock,
  formatClockShort,
  DAY_MINUTES,
  WEEK_MINUTES,
} from "../src/lib/sim/time.ts";

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/time ===");

const c0 = createClock();
expect(c0.minute === 360 && c0.speed === 1, "createClock default minute=360 (06:00) speed=1 — Fase 4 audit");

const c1 = tick(c0);
expect(c1.minute === 361, `tick @1x -> +1 (got ${c1.minute})`);
expect(c0.minute === 360, "tick es inmutable (estado original sin cambio)");

const c2 = setSpeed(c1, 5);
const c3 = tick(c2);
expect(c3.minute === 366 && c3.speed === 5, `tick @5x -> +5 (got minute=${c3.minute})`);

const paused = setSpeed(c0, 0);
const stillPaused = tick(paused);
expect(stillPaused.minute === 360, "tick en pause no avanza");

const c4 = advance(c0, 1500);
expect(c4.minute === 1860, "advance(+1500) desde 360");
expect(getDay(0) === 1, "minute 0 -> día 1");
expect(getDay(DAY_MINUTES - 1) === 1, "minute 1439 -> aún día 1");
expect(getDay(DAY_MINUTES) === 2, "minute 1440 -> día 2");
expect(getDay(DAY_MINUTES * 5) === 6, "minute 7200 -> día 6");

expect(getWeek(0) === 1, "semana 1 al inicio");
expect(getWeek(WEEK_MINUTES - 1) === 1, "última hora de semana 1");
expect(getWeek(WEEK_MINUTES) === 2, "minute 10080 -> semana 2");

expect(getHour(0) === 0, "hour 0 al inicio");
expect(getHour(120) === 2, "120 min -> 02h");
expect(getMinuteOfHour(125) === 5, "125 min -> :05");
expect(getMinuteOfDay(DAY_MINUTES + 30) === 30, "minute 1470 -> 00:30 del día 2");

expect(!isWeekStart(0, 1), "no week start dentro de semana 1");
expect(isWeekStart(WEEK_MINUTES - 1, WEEK_MINUTES), "week start al cruzar 10080");

expect(formatClock(0) === "Día 1 · 00:00", `formatClock(0) = "${formatClock(0)}"`);
expect(formatClock(125) === "Día 1 · 02:05", `formatClock(125) = "${formatClock(125)}"`);
expect(formatClock(DAY_MINUTES + 60) === "Día 2 · 01:00", `formatClock(D2+1h) = "${formatClock(DAY_MINUTES + 60)}"`);
expect(formatClockShort(DAY_MINUTES * 3 + 720) === "D4 12:00", `formatClockShort(D4 12:00) = "${formatClockShort(DAY_MINUTES * 3 + 720)}"`);

// Loop simulando 1 día a 5x: 1440/5 = 288 ticks
let c = createClock(0, 5);
for (let i = 0; i < 288; i++) c = tick(c);
expect(c.minute === 1440, `tras 288 ticks @5x = 1 día (got ${c.minute})`);
expect(getDay(c.minute) === 2, "y estamos en día 2");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
