import {
  createEconomy, createTransaction, addTransaction,
  applyWeeklyClose, payForCompletedWo,
  recentIncome, recentExpenses, isBankrupt,
  _resetTxCounter,
} from "../src/lib/sim/economy.ts";
import {
  createReputation, applyDelta, reputationDeltaForWo, allAirlinesBelowThreshold, getAverageRep,
} from "../src/lib/sim/reputation.ts";
import { generateInitialMechanics } from "../src/lib/sim/mechanics.ts";
import { generateInitialContracts } from "../src/lib/sim/contracts.ts";
import { effectiveWeeklySalary } from "../src/lib/sim/shifts.ts";
import { createRng } from "../src/lib/sim/rng.ts";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const airlines = JSON.parse(readFileSync(new URL("../src/lib/data/airlines.json", import.meta.url)));
const templates = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg, detail) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}`); if (detail) console.log(`    ${detail}`); }
}

console.log("\n=== sim/economy ===");
_resetTxCounter();

const eco0 = createEconomy(250000);
expect(eco0.balance === 250000, "balance inicial 250k");
expect(eco0.ledger.length === 0, "ledger vacío");

const tx = createTransaction("workOrderPayment", 1500, 100, "test");
const eco1 = addTransaction(eco0, tx);
expect(eco1.balance === 251500, "tx +1500");
expect(eco1.ledger.length === 1, "1 entry en ledger");

// pay for WO completed on-time, no AOG, no penalty
const tplB1 = templates.find(t => t.requiredCategory === "B1" && !t.isAOG && t.durationMinutes === 30);
const woMock = { instanceId: "WI-001", templateId: tplB1.id, slaMinute: 200, emissionMinute: 100 };
const contract = { id: "C-001", paymentPerWOMinute: 30, penaltyPerLateMinute: 100 };
const onTimeTxs = payForCompletedWo(tplB1, woMock, contract, balance, true, 180);
expect(onTimeTxs.length === 1 && onTimeTxs[0].amount === 30 * 30, `pago on-time = 30 × 30 = 900 (got ${onTimeTxs[0].amount})`);

// pay late
const lateTxs = payForCompletedWo(tplB1, woMock, contract, balance, false, 220);
expect(lateTxs.length === 2, "late: payment + penalty");
expect(lateTxs[0].amount > 0 && lateTxs[1].amount < 0, "primero pago + luego penalty");
expect(lateTxs[1].amount === -(20 * 100), `penalty = 20 × 100 = -2000 (got ${lateTxs[1].amount})`);

// AOG late: penalty x5
const tplAog = templates.find(t => t.isAOG) || { ...tplB1, isAOG: true };
const aogTxs = payForCompletedWo(tplAog, woMock, contract, balance, false, 220);
expect(aogTxs[1].amount === -(20 * 100 * 5), `AOG late penalty x5 = -10000 (got ${aogTxs[1].amount})`);

// Weekly close
const rng = createRng(42);
const mechanics = generateInitialMechanics(rng, balance);
const contracts = generateInitialContracts(rng, airlines);
const closeRes = applyWeeklyClose(eco1, contracts, mechanics, balance, 10080);
// Fase 4 Q4: shifts mixtos por defecto (1 night ×1.5), usar effectiveWeeklySalary.
const expectedSalaries = mechanics.reduce((s, m) => s + effectiveWeeklySalary(m), 0);
const expectedBaseFees = contracts.filter(c => c.status === "active").reduce((s, c) => s + c.baseFeePerWeek, 0);
const expectedDelta = expectedBaseFees - expectedSalaries - balance.weeklyFixedCost;
expect(Math.abs(closeRes.eco.balance - (eco1.balance + expectedDelta)) < 1, `weekly delta correcto (got ${closeRes.eco.balance - eco1.balance}, expected ${expectedDelta})`);

// recentIncome / expenses
const income = recentIncome(closeRes.eco, 0);
const expenses = recentExpenses(closeRes.eco, 0);
expect(income >= expectedBaseFees + 1500, "income incluye base fees + tx anterior");
expect(expenses >= expectedSalaries, "expenses incluye salarios");

// Bancarrota
const ecoNegative = { ...closeRes.eco, balance: -1000, negativeStreakWeeks: 2 };
expect(isBankrupt(ecoNegative), "isBankrupt tras 2 semanas en rojo");

console.log("\n=== sim/reputation (Bloque M: segmentada por aerolínea) ===");
const rep0 = createReputation(50, airlines);
expect(getAverageRep(rep0) === 50, "media inicial 50");
expect(rep0.perAirline[airlines[0].id] === 50, "primera aerolínea = 50");
const repPlus = applyDelta(rep0, airlines[0].id, 5);
expect(repPlus.perAirline[airlines[0].id] === 55, "delta +5 a una aerolínea");
expect(repPlus.perAirline[airlines[1].id] === 50, "delta no afecta a otras aerolíneas");
const repClamp = applyDelta(rep0, airlines[0].id, 200);
expect(repClamp.perAirline[airlines[0].id] === 100, "clamp a 100");
const repFloor = applyDelta(rep0, airlines[0].id, -200);
expect(repFloor.perAirline[airlines[0].id] === 0, "clamp a 0");
expect(reputationDeltaForWo(balance, "completedOnTime") === 1, "delta on-time +1");
expect(reputationDeltaForWo(balance, "aogFailed") === -10, "delta AOG fail -10");
// Game over por todas <10: forzamos todas a 5
let repAllLow = rep0;
for (const al of airlines) repAllLow = applyDelta(repAllLow, al.id, -45);
expect(allAirlinesBelowThreshold(repAllLow, 10), "todas ≤10 → true");
expect(!allAirlinesBelowThreshold(rep0, 10), "rep media 50 → false");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
