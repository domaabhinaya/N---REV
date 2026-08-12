import fs from "fs";

const base = "C:\\Users\\Abhinaya Doma\\OneDrive\\Desktop\\N-REV-main\\artifacts\\nutrirecover\\src\\pages\\";

const LABELS =
  '  vitamin_k: "Vitamin K",\n' +
  '  vitamin_b12: "Vitamin B12",\n' +
  '  folate: "Folate (B9)",\n' +
  '  zinc: "Zinc",\n' +
  '  iodine: "Iodine",\n' +
  '  potassium: "Potassium",';

const UNITS =
  '  vitamin_k: "mcg",\n' +
  '  vitamin_b12: "mcg",\n' +
  '  folate: "mcg",\n' +
  '  zinc: "mg",\n' +
  '  iodine: "mcg",\n' +
  '  potassium: "mg",';

const patchFile = (file, pairs) => {
  const p = base + file;
  let s = fs.readFileSync(p, "utf8");
  let total = 0;
  for (const [oldText, newText] of pairs) {
    const n = s.split(oldText).length - 1;
    if (n === 0) { console.log(file, "NOT FOUND:", JSON.stringify(oldText.slice(0, 40))); continue; }
    s = s.split(oldText).join(newText);
    total += n;
  }
  fs.writeFileSync(p, s);
  console.log(file, "->", total, "inserts");
};

// Dashboard: multi-line maps ending with };  (COLORS #84cc16, LABELS, UNITS)
patchFile("Dashboard.tsx", [
  ['  vitamin_k: "#84cc16",\n};',
   '  vitamin_k: "#84cc16",\n  vitamin_b12: "#0ea5e9",\n  folate: "#22c55e",\n  zinc: "#eab308",\n  iodine: "#a855f7",\n  potassium: "#ef4444",\n};'],
  ['  vitamin_k: "Vitamin K",\n};', LABELS + "\n};"],
  ['  vitamin_k: "mcg",\n};', UNITS + "\n};"],
]);

// Tracking: single LABELS map
patchFile("Tracking.tsx", [
  ['  vitamin_k: "Vitamin K",\n};', LABELS + "\n};"],
]);

// AiAssistant: single-line maps
patchFile("AiAssistant.tsx", [
  ['vitamin_k: "Vitamin K",',
   'vitamin_k: "Vitamin K",\n  vitamin_b12: "Vitamin B12", folate: "Folate (B9)", zinc: "Zinc", iodine: "Iodine", potassium: "Potassium",'],
  ['vitamin_k: "mcg",',
   'vitamin_k: "mcg",\n  vitamin_b12: "mcg", folate: "mcg", zinc: "mg", iodine: "mcg", potassium: "mg",'],
]);

// Report: COLORS #65a30d, LABELS, UNITS
patchFile("Report.tsx", [
  ['  vitamin_k: "#65a30d",\n};',
   '  vitamin_k: "#65a30d",\n  vitamin_b12: "#0ea5e9",\n  folate: "#22c55e",\n  zinc: "#eab308",\n  iodine: "#a855f7",\n  potassium: "#ef4444",\n};'],
  ['  vitamin_k: "Vitamin K",\n};', LABELS + "\n};"],
  ['  vitamin_k: "mcg",\n};', UNITS + "\n};"],
]);
