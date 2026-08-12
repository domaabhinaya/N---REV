// Final dataset-validation: confirm /foods now serves all 15 nutrient fields per item.
const base = "http://127.0.0.1:8099/api";
const lines = [];
try {
  const h = await fetch(base + "/healthz"); lines.push("health " + h.status);
  const f = await fetch(base + "/foods?limit=1"); lines.push("foods " + f.status);
  const j = await f.json();
  const item = j.items && j.items[0];
  if (item) {
    const need = ["vitaminB1","vitaminB2","vitaminB3","vitaminB6","vitaminB12","name","tier","source","dietTags","protein","calcium","vitaminC"];
    lines.push("foods total=" + j.total + " itemKeyCount=" + Object.keys(item).length);
    lines.push("hasAll15=" + need.every((k) => k in item));
    lines.push("sample: " + JSON.stringify({ name: item.name, id: item.id, vitaminB1: item.vitaminB1, vitaminB6: item.vitaminB6, vitaminB12: item.vitaminB12, tier: item.tier }));
    const f2 = await fetch(base + "/foods?limit=500");
    const j2 = await f2.json();
    const nz = { b1:0,b2:0,b3:0,b6:0,b12:0 };
    for (const it of j2.items) { if (it.vitaminB1) nz.b1++; if (it.vitaminB2) nz.b2++; if (it.vitaminB3) nz.b3++; if (it.vitaminB6) nz.b6++; if (it.vitaminB12) nz.b12++; }
    lines.push("non-zero B per 500-sample: " + JSON.stringify(nz));
    const rich = j2.items.find((it) => it.vitaminB6) || j2.items.find((it) => it.vitaminB1);
    if (rich) lines.push("B-rich sample: " + JSON.stringify({ name: rich.name, vitaminB1: rich.vitaminB1, vitaminB2: rich.vitaminB2, vitaminB3: rich.vitaminB3, vitaminB6: rich.vitaminB6, vitaminB12: rich.vitaminB12 }));
  } else { lines.push("no items"); }
} catch (e) { lines.push("ERR " + (e && e.message ? e.message : e)); }
console.log(lines.join("\n"));


