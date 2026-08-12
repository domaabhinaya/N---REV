const XLSX = require("C:/Users/Abhinaya Doma/OneDrive/Desktop/N-REV-main/node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx");
const fields = ["protein_g","iron_mg","calcium_mg","vitamin_d_ug","magnesium_mg","vitamin_a_ug","vitamin_c_mg","vitamin_b7_ug","vitamin_e_mg","vitamin_k_ug","vitamin_b1_mg","vitamin_b2_mg","vitamin_b3_mg","vitamin_b6_mg","vitamin_b12_ug","vitamin_d2_ug","vitamin_d3_ug"];
for (const f of ["NREV_Refined_Dataset.xlsx", "NREV_Extended_Dataset.xlsx"]) {
  const wb = XLSX.readFile(f);
  const sn = wb.SheetNames.find(n => /clean|final/i.test(n)) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: null });
  console.log("=== " + f + " (" + rows.length + " rows) ===");
  const headerKeys = Object.keys(rows[0] || {});
  for (const field of fields) {
    const key = headerKeys.find(k => k === field);
    if (!key) { console.log(field.padEnd(16) + " NOT PRESENT"); continue; }
    let nonNull = 0, gt0 = 0, sum = 0, min = Infinity, max = -Infinity;
    for (const r of rows) { const v = r[key]; if (v != null && !isNaN(Number(v))) { nonNull++; const n = Number(v); if (n > 0) gt0++; sum += n; if (n < min) min = n; if (n > max) max = n; } }
    console.log(field.padEnd(16) + " nonNull=" + String(nonNull).padStart(5) + "  >0=" + String(gt0).padStart(5) + "  mean=" + (nonNull ? (sum/nonNull).toFixed(2) : "-") + "  min=" + (nonNull ? min : "-") + "  max=" + (nonNull ? max : "-"));
  }
}