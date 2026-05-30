// Genera .scripts/fonts-embedded.css con las fuentes CIC embebidas en base64 (offline-first:
// el build de Steam no puede depender de Google Fonts en runtime). Space Grotesk (OFL) +
// JetBrains Mono (OFL), subset latin, pesos 400/500/600/700. Fuente: fontsource vía jsDelivr.
// Uso: node .scripts/gen-fonts.mjs   (requiere red — solo en dev, no en runtime del juego)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://cdn.jsdelivr.net/npm/@fontsource";
const FONTS = [
  ["Space Grotesk", "space-grotesk", [400, 500, 600, 700]],
  ["JetBrains Mono", "jetbrains-mono", [400, 500, 600, 700]],
];

let css = "/* Fuentes CIC embebidas (offline-first) — generado por gen-fonts.mjs. NO editar a mano. */\n";
let totalRaw = 0;
for (const [family, slug, weights] of FONTS) {
  for (const w of weights) {
    const url = `${BASE}/${slug}/files/${slug}-latin-${w}-normal.woff2`;
    const res = await fetch(url);
    if (!res.ok) { console.error(`✗ FAIL ${url} → HTTP ${res.status}`); process.exit(1); }
    const buf = Buffer.from(await res.arrayBuffer());
    totalRaw += buf.length;
    css += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2")}\n`;
    console.log(`✓ ${family} ${w} — ${(buf.length / 1024).toFixed(1)} KB`);
  }
}
const out = join(__dirname, "fonts-embedded.css");
writeFileSync(out, css, "utf-8");
console.log(`\n✓ ${out}\n  raw ${(totalRaw / 1024).toFixed(0)} KB → css ${(css.length / 1024).toFixed(0)} KB (base64)`);
