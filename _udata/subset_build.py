"""
Build NREV_Subset_Common.xlsx - a curated subset of common foods.
The app's food detection will only match foods listed here.

Selection rule (data-driven "common foods"):
  - ALL Anuvaad Indian foods (1,014) are kept (the Indian backbone of the app).
  - Any other food is kept ONLY if its name appears in >=2 independent raw
    sources (e.g., USDA comprehensive + healthy + health_scores + nutrients_csv
    + OpenFoodFacts). Appearing in multiple sources is a strong proxy for a
    common / well-known food and naturally filters out obscure one-off items.
All rows keep the full nutrient schema and a food_category.
"""
import os, io, glob, zipfile
import pandas as pd
import numpy as np
import refine_lib as R
import build_refined as B
from final_build import load_off_subset, off_row_to_dict

OUT = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Subset_Common.xlsx"
SOURCE_PRIORITY = ["Anuvaad_INDB_2024.11","USDA_comprehensive","USDA_healthy_foods",
                   "OpenFoodFacts_health_scores","nutrients_csvfile","OpenFoodFacts"]

# Map each source to an independent source FAMILY (healthy is derived from USDA
# comprehensive, so they are the SAME family and should not double-count).
FAMILY = {
    "Anuvaad_INDB_2024.11": "Anuvaad",
    "USDA_comprehensive": "USDA",
    "USDA_healthy_foods": "USDA",
    "OpenFoodFacts_health_scores": "OpenFoodFacts",
    "nutrients_csvfile": "nutrients_csv",
    "OpenFoodFacts": "OpenFoodFacts",
}


def collect(core_sources, off_rows):
    """Return list of (source, row); also returns source-overlap counts per name."""
    items = []
    for src, rows in core_sources:
        for row in rows:
            items.append((src, row))
    for row in off_rows:
        items.append(("OpenFoodFacts", row))
    # count distinct source FAMILIES per normalized name
    overlap = {}
    for src, row in items:
        key = R.norm_name(row["food_name"])
        if not key:
            continue
        overlap.setdefault(key, set()).add(FAMILY[src])
    return items, overlap


def select_keys(items, overlap, min_families=2):
    """Select: all Anuvaad keys OR keys seen in >= min_families independent families."""
    anu_keys = {R.norm_name(r["food_name"]) for _, r in items if r["source"] == "Anuvaad_INDB_2024.11"}
    sel = set(anu_keys)
    for key, fams in overlap.items():
        if len(fams) >= min_families:
            sel.add(key)
    return sel, anu_keys


def merged_subset(items, sel_keys):
    """Priority merge only the selected keys; fill gaps from lower-priority sources."""
    by_key = {}
    for src, row in items:
        key = R.norm_name(row["food_name"])
        if key not in sel_keys:
            continue
        if key not in by_key:
            by_key[key] = None
    # assign by priority; first writer for a key keeps the row, later fill gaps
    best = {}
    for src, row in items:
        key = R.norm_name(row["food_name"])
        if key not in sel_keys:
            continue
        if key not in best:
            best[key] = dict(row)
        else:
            cur = best[key]
            for c in R.NUTRIENT_COLS:
                if cur.get(c) is None and row.get(c) is not None:
                    cur[c] = row[c]
    return list(best.values())


def write(df, path=OUT):
    # assign codes
    next_id = 1
    codes = []
    for i, name in enumerate(df["food_name"]):
        row = df.iloc[i]
        if "ASC" in str(row.get("food_code", "")) and pd.notna(row.get("food_code")):
            codes.append(row["food_code"])
        else:
            codes.append(f"REF{next_id:04d}")
            next_id += 1
    df = df.copy()
    df["food_code"] = codes
    cols = R.META + R.NUTRIENT_COLS
    df = df[[c for c in cols if c in df.columns]]
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Final Cleaned", index=False)
    return df


if __name__ == "__main__":
    print("Loading sources ...")
    anu = B.load_anuvaad()
    comp = B.load_comprehensive()
    hlth = B.load_healthy()
    hs = B.load_health_scores()
    nc = B.load_nutrients_csv()
    off_rows = [off_row_to_dict(r) for _, r in load_off_subset().iterrows()]
    core = [("Anuvaad_INDB_2024.11", anu), ("USDA_comprehensive", comp),
            ("USDA_healthy_foods", hlth), ("OpenFoodFacts_health_scores", hs),
            ("nutrients_csvfile", nc)]
    for s, rows in core:
        print(f"  {s}: {len(rows)}")
    print("  OpenFoodFacts (curated):", len(off_rows))

    items, overlap = collect(core, off_rows)
    sel, anu_keys = select_keys(items, overlap, min_families=2)
    print("\nAnuvaad-only keys:", len(anu_keys), "| total selected keys:", len(sel))

    merged = merged_subset(items, sel)
    df = pd.DataFrame(merged)
    df = write(df)
    print("Subset rows:", len(df))
    print("Category counts:\n", df["food_category"].value_counts().to_string())
    print("\nB12 rows:", int(df["vitamin_b12_ug"].notna().sum()),
          "| per-source:", df["source"].value_counts().to_dict())
    print("WROTE:", OUT, "| MB:", round(os.path.getsize(OUT)/1e6, 2))