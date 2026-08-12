// Build normalized-name -> B-vitamin values map from the source xlsx datasets.
// Placed under api-server so `require('xlsx')` resolves via its node_modules.
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.join(__dirname, "..", "..");
const files = ["NREV_Refined_Dataset.xlsx", "NREV_Extended_Dataset.xlsx"];

function norm(name) {
  return String(name == null ? "" : name)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const map = {}; // normName -> {b1,b2,b3,b6,b12}
const seenPrimary = new Set();

const val = (row, col) => { const v = row[col]; return v == null || String(v).trim() === "" ? null : Number(v); };

for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { console.log(`SKIP ${f} (missing)`); continue; }
  const wb = XLSX.readFile(p);
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("cleaned") || n.toLowerCase().includes("final")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
  let added = 0, skipped = 0;
  for (const r of rows) {
    const foodName = r["food_name"] || r["Food Name"] || r["name"] || r["Food"];
    const key = norm(foodName);
    if (!key) continue;
    if (f.includes("Extended") && seenPrimary.has(key)) { skipped++; continue; }
    const rec = {
      b1: val(r, "vitamin_b1_mg"),
      b2: val(r, "vitamin_b2_mg"),
      b3: val(r, "vitamin_b3_mg"),
      b6: val(r, "vitamin_b6_mg"),
      b12: val(r, "vitamin_b12_ug"),
    };
    // Only record foods that have at least one B value (skip rows with none)
    if (Object.values(rec).some((v) => v != null)) {
      if (!map[key]) { map[key] = rec; added++; }
    }
    if (f.includes("Refined")) seenPrimary.add(key);
  }
  console.log(`=== ${f} sheet='${sheetName}' rows=${rows.length} added=${added} dupSkip=${skipped}`);
}

const outPath = path.join(root, "_udata", "_bmap.json");
fs.writeFileSync(outPath, JSON.stringify(map));
console.log(`WROTE ${outPath} entries=${Object.keys(map).length}`);
// sample
const s = Object.entries(map).slice(0, 3);
for (const [k, v] of s) console.log(`sample: ${k} -> ${JSON.stringify(v)}`);
