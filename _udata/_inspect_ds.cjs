const XLSX = require("C:/Users/Abhinaya Doma/OneDrive/Desktop/N-REV-main/node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx");
for (const f of ["NREV_Refined_Dataset.xlsx", "NREV_Extended_Dataset.xlsx"]) {
  const wb = XLSX.readFile(f, { sheetRows: 3 });
  console.log("=== " + f + " sheets: " + wb.SheetNames.join(",") + " ===");
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, blankrows: false });
    console.log("--- sheet " + sn + " ---");
    console.log((rows[0] || []).join(" | "));
    if (rows[2]) console.log("sample2: " + rows[2].slice(0, 25).join(" | "));
  }
}
