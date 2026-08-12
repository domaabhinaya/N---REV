// Read-only inspection of N-REV datasets for 15-nutrient coverage
import { createRequire } from "module";
import { join } from "path";
const require = createRequire("C:\\Users\\Abhinaya Doma\\OneDrive\\Desktop\\N-REV-main\\artifacts\\api-server\\package.json");
const XLSX = require("xlsx");

const ROOT = "C:\\Users\\Abhinaya Doma\\OneDrive\\Desktop\\N-REV-main";
const FILES = [
  join(ROOT, "NREV_Refined_Dataset.xlsx"),
  join(ROOT, "NREV_Extended_Dataset.xlsx"),
];

const NEW_COLS = ["vitamin_b12_ug","folate_ug","vitamin_b9_ug","zinc_mg","iodine_ug","potassium_mg"];
const CUR_COLS = ["protein_g","iron_mg","calcium_mg","magnesium_mg","vitamin_a_ug","vitamin_c_mg","vitamin_b7_ug","vitamin_d_ug","vitamin_e_mg","vitamin_k_ug"];

function usable(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  if (s === "" || s === "nan" || s === "na" || s === "n/a" || s === "none" || s === "-" || s === "t" || s === "trace" || s === "tr")
    return false;
  const num = Number.parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(num) && num > 0;
}

for (const f of FILES) {
  console.log("\n==============================================");
  console.log("FILE:", f.split("\\").pop());
  const wb = XLSX.readFile(f);
  console.log("SHEETS:", wb.SheetNames.join(", "));
  const sheet = wb.SheetNames.find((n) => n.toLowerCase().includes("cleaned") || n.toLowerCase().includes("final")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
  console.log("ROWS:", rows.length);
  const keys = Object.keys(rows[0] || {});
  console.log("COLUMN COUNT:", keys.length);
  console.log("COLUMNS:", keys.join(", "));

  const nameCol = keys.find((k) => /food_name|Food Name|name/i.test(k)) || keys[0];
  const all = [...NEW_COLS, ...CUR_COLS];
  console.log("\n--- Coverage (usable = finite & > 0) ---");
  console.log("nutrient_col\tusable\tmissing\tpct_usable");
  for (const c of all) {
    if (!keys.includes(c)) { console.log(`${c}\tN/A (no column)`); continue; }
    let usableCount = 0, missing = 0;
    for (const r of rows) {
      if (usable(r[c])) usableCount++;
      else missing++;
    }
    console.log(`${c}\t${usableCount}\t${missing}\t${(usableCount / rows.length * 100).toFixed(2)}%`);
  }
}
