// Helper para tests .mjs: carga workorders.json y daily_checks.json con `kind` inyectado,
// igual que hace el loader runtime (src/lib/data/index.ts).
//
// El campo `kind` (callout|mpd) NO está en los JSON crudos — viene de wo_classification.json.
// Los tests que cargan los JSON directamente sin pasar por el loader runtime deben usar
// este helper para mantener consistencia con producción.

import { readFileSync } from "node:fs";

// El callerUrl debe ser `import.meta.url` del archivo de test invocante. Paths se resuelven
// con un solo `../` porque el caller es un archivo (no un directorio): el primer `../` saca
// el archivo invocante y posiciona en su directorio (`tests/`), desde ahí subimos a `mrotycoon/`.

/** Carga workorders.json con `kind` mergeado desde wo_classification.json. */
export function loadWorkOrdersWithKind(callerUrl) {
  const workorders = JSON.parse(readFileSync(new URL("../src/lib/data/workorders.json", callerUrl)));
  const classification = JSON.parse(readFileSync(new URL("../src/lib/data/wo_classification.json", callerUrl)));
  const kindById = new Map(classification.classifications.map((c) => [c.id, c.kind]));
  return workorders.map((wo) => {
    const kind = kindById.get(wo.id);
    if (!kind) throw new Error(`WO ${wo.id} sin entrada en wo_classification.json`);
    return { ...wo, kind };
  });
}

/** Carga daily_checks.json forzando `kind:"mpd"` en todos los templates. */
export function loadDailyChecksWithKind(callerUrl) {
  const dailyChecks = JSON.parse(readFileSync(new URL("../src/lib/data/daily_checks.json", callerUrl)));
  return dailyChecks.map((dc) => ({ ...dc, kind: "mpd" }));
}
