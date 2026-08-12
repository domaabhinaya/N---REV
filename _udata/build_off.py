"""
OpenFoodFacts (archive 2) curated loader.
Streams the 1GB TSV, keeps common foods (plus all B12/iodine-bearing rows),
dedupes by name, and unit-converts values to the canonical per-serving schema
(1 serving = 100g). OFFF stores vitamin-b12_100g in mg -> convert to ug (x1000).
Writes a CSV of cleaned OFFF rows.
"""
import os, io, time, zipfile
import pandas as pd
import numpy as np
import refine_lib as R

ZIP = os.path.join(R.BASE, "archive (2).zip")
OUT_CSV = os.path.join(os.path.dirname(__file__), "off_clean.csv")
ENTRY = "en.openfoodfacts.org.products.tsv"

KEEP_PNNS = {"Fish Meat Eggs","Fruits and vegetables","Cereals and potatoes",
             "Milk and dairy products","Composite foods","Nuts","Legumes",
             "Seafood","Eggs","Meat","Fat and sauces","Salty snacks","Sugary snacks"}

# OFFF nutrient columns we ingest (per-100g) -> canonical field
FIELDS = {
    "energy_100g": "energy_kcal",
    "carbohydrates_100g": "carb_g",
    "proteins_100g": "protein_g",
    "fat_100g": "fat_g",
    "fiber_100g": "fibre_g",
    "sugars_100g": "sugar_g",
    "saturated-fat_100g": ("sfa_mg", 1000),          # g -> mg
    "monounsaturated-fat_100g": ("mufa_mg", 1000),
    "polyunsaturated-fat_100g": ("pufa_mg", 1000),
    "cholesterol_100g": "cholesterol_mg",
    "calcium_100g": "calcium_mg",
    "phosphorus_100g": "phosphorus_mg",
    "magnesium_100g": "magnesium_mg",
    "sodium_100g": "sodium_mg",
    "potassium_100g": "potassium_mg",
    "iron_100g": "iron_mg",
    "copper_100g": "copper_mg",
    "manganese_100g": "manganese_mg",
    "zinc_100g": "zinc_mg",
    "selenium_100g": "selenium_ug",
    "chromium_100g": "chromium_mg",
    "molybdenum_100g": "molybdenum_mg",
    "iodine_100g": "iodine_ug",
    "vitamin-a_100g": "vitamin_a_ug",
    "vitamin-b1_100g": ("vitamin_b1_mg", 1),
    "vitamin-b2_100g": ("vitamin_b2_mg", 1),
    "vitamin-pp_100g": ("vitamin_b3_mg", 1),
    "pantothenic-acid_100g": "vitamin_b5_mg",
    "vitamin-b6_100g": "vitamin_b6_mg",
    "biotin_100g": ("vitamin_b7_ug", 1),
    "vitamin-b9_100g": "vitamin_b9_ug",
    "folates_100g": "folate_ug",
    "vitamin-b12_100g": ("vitamin_b12_ug", 1000),     # mg -> ug
    "vitamin-c_100g": "vitamin_c_mg",
    "vitamin-d_100g": "vitamin_d_ug",
    "vitamin-e_100g": "vitamin_e_mg",
    "vitamin-k_100g": "vitamin_k_ug",
}
USECOLS = ["product_name","pnns_groups_1","brands"] + list(FIELDS.keys())

def build():
    kept = {}
    other_foods = []
    t0 = time.time()
    zf = zipfile.ZipFile(ZIP)
    n_chunks = 0
    with zf.open(ENTRY) as f:
        reader = pd.read_csv(io.TextIOWrapper(f, encoding="utf-8", errors="replace"),
                             sep="\t", chunksize=400000, dtype=str,
                             usecols=USECOLS, low_memory=False)
        for chunk in reader:
            n_chunks += 1
            chunk = chunk[chunk["product_name"].notna() &
                         chunk["product_name"].astype(str).str.strip().ne("")]
            if len(chunk) == 0:
                continue
            chunk["product_name"] = chunk["product_name"].astype(str).str.strip()
            has_val = (chunk[["energy_100g","proteins_100g"]].notna().any(axis=1))
            chunk = chunk[has_val]
            if len(chunk) == 0:
                continue
            pnns = chunk["pnns_groups_1"].fillna("").astype(str).str.strip()
            keep = pnns.isin(KEEP_PNNS)
            b12 = pd.to_numeric(chunk.get("vitamin-b12_100g"), errors="coerce")
            iod = pd.to_numeric(chunk.get("iodine_100g"), errors="coerce")
            keep_b12 = (b12.fillna(0) > 0) | (iod.fillna(0) > 0)
            selected = chunk[keep | keep_b12]
            for _, r in selected.iterrows():
                name = r["product_name"]
                key = R.norm_name(name)
                if not key:
                    continue
                row = R.new_row(name, R.classify(name), "OpenFoodFacts",
                                serving_desc="1 serving (100g)", grams=100.0)
                saw = False
                for src, dst in FIELDS.items():
                    raw = r.get(src)
                    if raw is None:
                        continue
                    mult = 1.0
                    if isinstance(dst, tuple):
                        dst, mult = dst
                    v = R.to_num(raw)
                    if v is None:
                        continue
                    v = round(v * mult, 6)
                    # sanity: drop nonsense (e.g. energy > 2000 kcal/100g)
                    if dst == "energy_kcal" and v > 2000:
                        v = None
                    if v is not None:
                        if row[dst] is None:
                            row[dst] = v
                            saw = True
                if not saw:
                    continue
                prev = kept.get(key)
                if prev is None:
                    kept[key] = row
                else:
                    # merge non-null, prefer existing
                    for c in R.NUTRIENT_COLS:
                        if prev.get(c) is None and row.get(c) is not None:
                            prev[c] = row[c]
            if n_chunks % 20 == 0:
                print(f"chunks={n_chunks} kept={len(kept)} t={time.time()-t0:.0f}s")
    rows = list(kept.values())
    print("OFF cleaned rows:", len(rows), "time:", round(time.time()-t0), "s")
    df = pd.DataFrame(rows, columns=R.META + R.NUTRIENT_COLS)
    df.to_csv(OUT_CSV, index=False)
    print("wrote", OUT_CSV)

if __name__ == "__main__":
    build()
