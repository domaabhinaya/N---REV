import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, "dist", "index.mjs");

const content = readFileSync(distPath, "utf-8");

// Search for database/pool related code
const poolIdx = content.indexOf("new Pool3");
if (poolIdx >= 0) {
  console.log("=== Pool creation context ===");
  console.log(content.substring(Math.max(0, poolIdx - 300), poolIdx + 200));
}

// Search for any literal "base" usage near pool/database code
console.log("\n=== Lines containing 'base' near database/pool ===");
const lines = content.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase().includes("base") && lines[i].toLowerCase().includes("database") ||
      (lines[i].toLowerCase().includes("base") && (lines[i].includes("Pool") || lines[i].includes("pool") || lines[i].includes("connection")))) {
    console.log(`Line ${i + 1}: ${lines[i].substring(0, 200)}`);
  }
}

// Check if process.env.DATABASE_URL is used literally
console.log("\n=== DATABASE_URL references ===");
let idx = 0;
while ((idx = content.indexOf("DATABASE_URL", idx)) !== -1) {
  console.log(`Found at offset ${idx}: ${content.substring(Math.max(0, idx - 50), idx + 80)}`);
  idx++;
}
