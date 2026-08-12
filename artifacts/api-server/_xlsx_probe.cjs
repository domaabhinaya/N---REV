// Probe the xlsx datasets for B-vitamin source columns.
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.join(__dirname, "..", "..");
const files = ["NREV_Refined_Dataset.xlsx", "NREV_Extended_Dataset.xlsx"];
const keys = {
  vitamin_b1: "vitamin_b1_mg",
  vitamin_b2: "vitamin_b2_mg",
  vitamin_b3: "vitamin_b3_mg",
  vitamin_b6: "vitamin_b6_mg",
  vitamin_b12: "vitamin_b12_ug",
};

for (const f of files) {
  const p = path.join(root, f);
  console.log(`\n=== ${f} ===`);
  if (!fs.existsSync(p)) { console.log("MISSING"); continue; }
  const wb = XLSX.readFile(p);
  console.log("sheets: " + wb.SheetNames.join(", "));
  const name = wb.SheetNames.find((n) => n.toLowerCase().includes("cleaned") || n.toLowerCase().includes("final")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name]);
  console.log(`using sheet: ${name}  rows: ${rows.length}`);
  const headers = Object.keys(rows[0] || {});
  console.log("headers: " + headers.join(" | "));
  for (const [nut, col] of Object.entries(keys)) {
    const present = headers.includes(col);
    let nonNull = 0;
    if (present) nonNull = rows.filter((r) => r[col] != null && String(r[col]).trim() !== "").length;
    console.log(`  ${nut} via '${col}': ${present ? "present" : "MISSING"}, non-null=${nonNull}`);
  }
  if (rows.length) console.log("sample name: " + (rows[0]["food_name"] || rows[0]["Food Name"] || rows[0]["name"] || rows[0]["Food"]));
}
