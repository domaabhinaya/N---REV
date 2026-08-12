"""
Build the N-REV refined dataset (core sources, no OpenFoodFacts yet).
Produces a single xlsx with sheet 'Final Cleaned' containing all essential
nutrients on a per-serving basis (1 serving = 100g for non-Anuvaad sources).
"""
import os, io, re, zipfile
import pandas as pd
import numpy as np
import refine_lib as R

BASE = R.BASE
OUT = R.OUT_XLSX


def read_zip_csv(zip_path, entry, **kw):
    z = zipfile.ZipFile(zip_path)
    with z.open(entry) as f:
        return pd.read_csv(io.TextIOWrapper(f, encoding="utf-8", errors="replace"), **kw)


# ---------------------------------------------------------------------------
# 1) Anuvaad (per-serving, richest)  ---- PRIMARY
# ---------------------------------------------------------------------------
def load_anuvaad():
    df = pd.read_excel(os.path.join(BASE, "Anuvaad_INDB_2024.11.xlsx"))
    rows = []
    for _, r in df.iterrows():
        name = str(r.get("food_name", "")).strip()
        if not name or name.lower() in ("nan", "none"):
            continue
        code = str(r.get("food_code", "")).strip()
        row = R.new_row(name, R.classify(name), "Anuvaad_INDB_2024.11",
                        serving_desc=str(r.get("servings_unit", "1 serving") or "1 serving"))
        row["food_code"] = code
        m = R.to_num
        row["energy_kcal"] = m(r.get("energy_kcal"))
        row["energy_kj"] = m(r.get("energy_kj"))
        row["carb_g"] = m(r.get("carb_g"))
        row["protein_g"] = m(r.get("protein_g"))
        row["fat_g"] = m(r.get("fat_g"))
        row["fibre_g"] = m(r.get("fibre_g"))
        row["sugar_g"] = m(r.get("freesugar_g"))
        row["sfa_mg"] = m(r.get("sfa_mg"))
        row["mufa_mg"] = m(r.get("mufa_mg"))
        row["pufa_mg"] = m(r.get("pufa_mg"))
        row["cholesterol_mg"] = m(r.get("cholesterol_mg"))
        row["calcium_mg"] = m(r.get("calcium_mg"))
        row["phosphorus_mg"] = m(r.get("phosphorus_mg"))
        row["magnesium_mg"] = m(r.get("magnesium_mg"))
        row["sodium_mg"] = m(r.get("sodium_mg"))
        row["potassium_mg"] = m(r.get("potassium_mg"))
        row["iron_mg"] = m(r.get("iron_mg"))
        row["copper_mg"] = m(r.get("copper_mg"))
        row["selenium_ug"] = m(r.get("selenium_ug"))
        row["chromium_mg"] = m(r.get("chromium_mg"))
        row["manganese_mg"] = m(r.get("manganese_mg"))
        row["molybdenum_mg"] = m(r.get("molybdenum_mg"))
        row["zinc_mg"] = m(r.get("zinc_mg"))
        # vitamins
        row["vitamin_a_ug"] = m(r.get("vita_ug"))
        row["vitamin_b1_mg"] = m(r.get("vitb1_mg"))
        row["vitamin_b2_mg"] = m(r.get("vitb2_mg"))
        row["vitamin_b3_mg"] = m(r.get("vitb3_mg"))
        row["vitamin_b5_mg"] = m(r.get("vitb5_mg"))
        row["vitamin_b6_mg"] = m(r.get("vitb6_mg"))
        row["vitamin_b7_ug"] = m(r.get("vitb7_ug"))
        row["vitamin_b9_ug"] = m(r.get("vitb9_ug"))
        row["folate_ug"] = m(r.get("folate_ug"))
        row["vitamin_c_mg"] = m(r.get("vitc_mg"))
        row["vitamin_d2_ug"] = m(r.get("vitd2_ug"))
        row["vitamin_d3_ug"] = m(r.get("vitd3_ug"))
        row["vitamin_e_mg"] = m(r.get("vite_mg"))
        row["vitamin_k1_ug"] = m(r.get("vitk1_ug"))
        row["vitamin_k2_ug"] = m(r.get("vitk2_ug"))
        row["carotenoids_ug"] = m(r.get("carotenoids_ug"))
        d2 = row["vitamin_d2_ug"] or 0
        d3 = row["vitamin_d3_ug"] or 0
        k1 = row["vitamin_k1_ug"] or 0
        k2 = row["vitamin_k2_ug"] or 0
        row["vitamin_d_ug"] = round(d2 + d3, 6) if (d2 or d3) else None
        row["vitamin_k_ug"] = round(k1 + k2, 6) if (k1 or k2) else None
        rows.append(row)
    return rows

# ---------------------------------------------------------------------------
# 2) comprehensive_foods_usda (per-serving, has serving gram & category)
# ---------------------------------------------------------------------------
def load_comprehensive():
    df = read_zip_csv(os.path.join(BASE, "archive.zip"), "comprehensive_foods_usda.csv",
                      low_memory=False)
    rows = []
    for _, r in df.iterrows():
        name = str(r.get("food_name", "")).strip()
        if not name or name.lower() in ("nan", "none"):
            continue
        ext = R.map_external_category(r.get("food_type"))
        cat = ext if ext else R.classify(name)
        grams = R.to_num(r.get("serving_size"))
        row = R.new_row(name, cat, "USDA_comprehensive",
                        serving_desc=str(r.get("serving_unit", "") or "1 serving"),
                        grams=grams)
        m = R.to_num
        row["energy_kcal"] = m(r.get("calories"))
        row["carb_g"] = m(r.get("carbs_g"))
        row["protein_g"] = m(r.get("protein_g"))
        row["fat_g"] = m(r.get("fat_g"))
        row["fibre_g"] = m(r.get("fiber_g"))
        row["sugar_g"] = m(r.get("sugar_g"))
        row["sfa_mg"] = m(r.get("saturated_fat_g"))
        if row["sfa_mg"] is not None:
            row["sfa_mg"] = round(row["sfa_mg"] * 1000, 3)
        row["cholesterol_mg"] = m(r.get("cholesterol_mg"))
        row["calcium_mg"] = m(r.get("calcium_mg"))
        row["iron_mg"] = m(r.get("iron_mg"))
        row["sodium_mg"] = m(r.get("sodium_mg"))
        row["vitamin_c_mg"] = m(r.get("vitamin_c_mg"))
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# 3) healthy_foods_database (per-serving)
# ---------------------------------------------------------------------------
def load_healthy():
    df = read_zip_csv(os.path.join(BASE, "archive.zip"), "healthy_foods_database.csv",
                      low_memory=False)
    rows = []
    for _, r in df.iterrows():
        name = str(r.get("food_name", "")).strip()
        if not name or name.lower() in ("nan", "none"):
            continue
        ext = R.map_external_category(r.get("food_type"))
        cat = ext if ext else R.classify(name)
        row = R.new_row(name, cat, "USDA_healthy_foods")
        m = R.to_num
        row["energy_kcal"] = m(r.get("calories"))
        row["protein_g"] = m(r.get("protein_g"))
        row["fat_g"] = m(r.get("fat_g"))
        row["carb_g"] = m(r.get("carbs_g"))
        row["fibre_g"] = m(r.get("fiber_g"))
        row["sugar_g"] = m(r.get("sugar_g"))
        row["sodium_mg"] = m(r.get("sodium_mg"))
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# 4) foods_health_scores_allergens (per-100g -> per serving = same number)
# ---------------------------------------------------------------------------
def load_health_scores():
    df = read_zip_csv(os.path.join(BASE, "archive.zip"),
                      "foods_health_scores_allergens.csv", low_memory=False)
    rows = []
    for _, r in df.iterrows():
        name = str(r.get("product_name", "")).strip()
        if not name or name.lower() in ("nan", "none"):
            continue
        cat = R.map_external_category(r.get("categories")) or R.classify(name)
        row = R.new_row(name, cat, "OpenFoodFacts_health_scores")
        m = R.to_num
        row["energy_kcal"] = m(r.get("energy_kcal"))
        row["fat_g"] = m(r.get("fat_100g"))
        row["sfa_mg"] = m(r.get("saturated_fat_100g"))
        if row["sfa_mg"] is not None:
            row["sfa_mg"] = round(row["sfa_mg"] * 1000, 3)
        row["carb_g"] = m(r.get("carbs_100g"))
        row["sugar_g"] = m(r.get("sugars_100g"))
        row["fibre_g"] = m(r.get("fiber_100g"))
        row["protein_g"] = m(r.get("proteins_100g"))
        row["sodium_mg"] = m(r.get("sodium_100g"))
        if row["sodium_mg"] is None and r.get("salt_100g") is not None:
            sal = m(r.get("salt_100g"))
            if sal is not None:
                row["sodium_mg"] = round(sal * 1000 * 0.3937, 3)
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# 5) nutrients_csvfile (archive 3) : per measure with Grams -> per 100g -> serving
# ---------------------------------------------------------------------------
def load_nutrients_csv():
    df = read_zip_csv(os.path.join(BASE, "archive (3).zip"), "nutrients_csvfile.csv")
    rows = []
    for _, r in df.iterrows():
        name = str(r.get("Food", "")).strip()
        if not name or name.lower() in ("nan", "none"):
            continue
        grams = R.to_num(r.get("Grams"))
        if not grams or grams <= 0:
            continue
        ext = R.map_external_category(r.get("Category"))
        cat = ext if ext else R.classify(name)
        row = R.new_row(name, cat, "nutrients_csvfile",
                        serving_desc=str(r.get("Measure", "") or "1 serving"), grams=grams)
        m = R.to_num
        def per100(v):
            x = m(v)
            return None if x is None else round(x / grams * 100, 6)
        row["energy_kcal"] = per100(r.get("Calories"))
        row["protein_g"] = per100(r.get("Protein"))
        row["fat_g"] = per100(r.get("Fat"))
        row["sfa_mg"] = per100(r.get("Sat.Fat"))
        if row["sfa_mg"] is not None:
            row["sfa_mg"] = round(row["sfa_mg"] * 1000, 3)
        row["fibre_g"] = per100(r.get("Fiber"))
        row["carb_g"] = per100(r.get("Carbs"))
        rows.append(row)
    return rows


def merge_and_write(sources, out_path=OUT):
    """sources: list of (priority_label, rows). Dedup + fill gaps + write."""
    by_key = {}
    order = {}
    for i, (src, rows) in enumerate(sources):
        for row in rows:
            key = R.norm_name(row["food_name"])
            if not key:
                continue
            if key not in by_key:
                by_key[key] = dict(row)
                order[key] = i
            else:
                cur = by_key[key]
                for c in R.NUTRIENT_COLS:
                    if cur.get(c) is None and row.get(c) is not None:
                        cur[c] = row[c]
    merged = list(by_key.values())
    merged.sort(key=lambda r: order[R.norm_name(r["food_name"])])

    next_id = 1
    for row in merged:
        if not row.get("food_code"):
            row["food_code"] = f"REF{next_id:04d}"
            next_id += 1

    cols = R.META + R.NUTRIENT_COLS
    cols = [c for c in cols if c in merged[0] or True]
    df = pd.DataFrame(merged, columns=cols)
    df = df[[c for c in cols if c in df.columns]]

    print("\nTOTAL REFINED ROWS:", len(df))
    print("Category counts:\n", df["food_category"].value_counts().to_string())

    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Final Cleaned", index=False)
    print("\nWROTE:", out_path, "| size MB:", round(os.path.getsize(out_path) / 1e6, 2))
    return df


if __name__ == "__main__":
    print("Loading Anuvaad ...")
    anu = load_anuvaad()
    print("  anuvaad rows:", len(anu))
    print("Loading comprehensive USDA ...")
    comp = load_comprehensive()
    print("  comprehensive rows:", len(comp))
    print("Loading healthy foods ...")
    hlth = load_healthy()
    print("  healthy rows:", len(hlth))
    print("Loading health scores ...")
    hs = load_health_scores()
    print("  health_scores rows:", len(hs))
    print("Loading nutrients_csvfile ...")
    nc = load_nutrients_csv()
    print("  nutrients_csv rows:", len(nc))

    sources = [("Anuvaad_INDB_2024.11", anu),
               ("USDA_comprehensive", comp),
               ("USDA_healthy_foods", hlth),
               ("OpenFoodFacts_health_scores", hs),
               ("nutrients_csvfile", nc)]
    df = merge_and_write(sources)

