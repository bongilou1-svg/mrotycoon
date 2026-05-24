// Smoke-test del HTML built: extrae los <script> y verifica que parsean.
import { readFileSync } from "node:fs";

const target = process.argv[2] || "v0.2-fase3-i.html";
const html = readFileSync(`C:/Users/bongi/mrotycoon/builds/${target}`, "utf-8");
console.log("Validating:", target);
const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
console.log("Scripts found:", scriptMatches.length);
for (const [i, m] of scriptMatches.entries()) {
  const code = m[1];
  console.log(`Script ${i}: ${code.length} bytes`);
  try {
    new Function(code);
    console.log(`  ✓ parses OK`);
  } catch (e) {
    console.log(`  ✗ SYNTAX ERROR: ${e.message}`);
    // Print first 200 chars around the location
    if (e.lineNumber) {
      const lines = code.split("\n");
      const start = Math.max(0, e.lineNumber - 2);
      const end = Math.min(lines.length, e.lineNumber + 2);
      for (let l = start; l < end; l++) console.log(`    ${l+1}: ${lines[l].slice(0, 200)}`);
    }
  }
}
