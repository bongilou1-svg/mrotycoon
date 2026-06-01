// Fase A#1 (brief maestro): reveal escalonado. El callout muestra solo el SÍNTOMA (complaint);
// el scope completo (description/AMM/P-N) se revela al cerrar T-shoot (scopeRevealed=true).
// Aquí testeamos:
//  - complaintForTemplate: usa template.complaint si existe; si no, deriva del ATA; fallback genérico.
//  - el flag scopeRevealed nace en false (instanciar) y NO se revela hasta el sellado de T-shoot.

import { complaintForTemplate, instantiateWorkOrder } from "../src/lib/sim/workorders.ts";
import { readFileSync } from "node:fs";

const balance = JSON.parse(readFileSync(new URL("../src/lib/data/balance.json", import.meta.url)));
const ataChapters = JSON.parse(readFileSync(new URL("../src/lib/data/ata_chapters.json", import.meta.url)));

let pass = 0, fail = 0;
function expect(cond, msg) { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } }

console.log("\n=== complaintForTemplate: usa el complaint explícito si está ===");
expect(complaintForTemplate({ complaint: "Cabina no enfría", ataChapter: "21" }, ataChapters) === "Cabina no enfría",
  "devuelve el complaint definido tal cual");
expect(complaintForTemplate({ complaint: "  Olor a quemado en cabina  ", ataChapter: "26" }, ataChapters) === "Olor a quemado en cabina",
  "trima espacios del complaint");

console.log("\n=== fallback derivado del nombre del capítulo ATA (ata_chapters.json está en ESPAÑOL) ===");
const c21 = complaintForTemplate({ ataChapter: "21" }, ataChapters);
expect(c21.includes("Aire acondicionado") && c21.includes("ATA 21"), `ATA 21 → menciona Aire acondicionado + código (${c21})`);
const c32 = complaintForTemplate({ ataChapter: "32" }, ataChapters);
expect(c32.includes("Tren de aterrizaje") && c32.includes("ATA 32"), `ATA 32 → Tren de aterrizaje (${c32})`);

console.log("\n=== complaint vacío/whitespace → trata como ausente y deriva del ATA ===");
const cEmpty = complaintForTemplate({ complaint: "   ", ataChapter: "32" }, ataChapters);
expect(cEmpty.includes("Tren de aterrizaje"), `complaint en blanco → fallback ATA (${cEmpty})`);

console.log("\n=== capítulo NO presente en el mapa → genérico con código, sin nombre ===");
// 58 no está en ata_chapters.json → el helper cae al genérico 'anomalía ATA 58'.
const cReserved = complaintForTemplate({ ataChapter: "58" }, ataChapters);
expect(cReserved.includes("anomalía ATA 58") && cReserved.includes("ATA 58"),
  `capítulo ausente → genérico 'anomalía ATA 58' (${cReserved})`);
const cUnknown = complaintForTemplate({ ataChapter: "ZZ" }, ataChapters);
expect(cUnknown.includes("ATA ZZ"), `capítulo desconocido → genérico con código (${cUnknown})`);
const cNoMap = complaintForTemplate({ ataChapter: "21" }); // sin mapa
expect(cNoMap.includes("ATA 21"), `sin mapa de capítulos → genérico (${cNoMap})`);

console.log("\n=== integración: instancia nace con scope OCULTO (scopeRevealed=false) ===");
const tpl = {
  id: "WO-T", ataChapter: "21", complaint: "Cabina no enfría",
  description: "Cabin temperature control erratic - pack valve suspect",
  requiredCategory: "B1", aircraftModelsCompatibles: ["A320"], engineVariantsCompatibles: [],
  durationMinutes: 90, severity: "Major", probability: 0.6, isAOG: false, kind: "callout",
  ammReference: "21-51-00", partNumber: "PACK-VLV-A320",
};
const ap = { registration: "EC-R", model: "A320", engineVariant: "CFM56", contractId: "C-1",
  standId: "H1-S1", arrivalMinute: 0, scheduledDepartureMinute: 999999, status: "Idle", instanceId: "ALI-R", flightHoursThisLeg: 2 };
const wo = instantiateWorkOrder(tpl, ap, balance);
expect(wo.scopeRevealed === false, "scopeRevealed=false al nacer (scope oculto)");
expect(wo.tshootCompleteMinute === undefined, "sin T-shoot completado todavía");
// El callout debe poder mostrar el síntoma sin revelar el scope:
expect(complaintForTemplate(tpl, ataChapters) === "Cabina no enfría", "el callout muestra el síntoma del template");

console.log(`\n=== Total: ${pass} OK, ${fail} FAIL`);
if (fail > 0) process.exit(1);
