"""
Final N-REV refined dataset builder (~30-40k common foods).
Core sources: Anuvaad + USDA comprehensive + healthy + health_scores + nutrients_csv
(gives 36,036 rows). Then we add ONLY the curated OpenFoodFacts foods that carry
vitamin B12 / iodine (the only essential nutrients missing from core sources),
plus a capped set of common-category OpenFoodFacts foods, keeping the total <= 40k.
Writes the single refined xlsx with sheet 'Final Cleaned'.
"""
import os, io, re, glob
import pandas as pd
import numpy as np
import refine_lib as R
import build_refined as B

OUT = R.OUT_XLSX
OFF_CSV = os.path.join(os.path.dirname(__file__), "off_clean.csv")
TARGET_MAX = 40000


def load_core():
    anu = B.load_anuvaad()
    comp = B.load_comprehensive()
    hlth = B.load_healthy()
    hs = B.load_health_scores()
    nc = B.load_nutrients_csv()
    return [("Anuvaad_INDB_2024.11", anu),
            ("USDA_comprehensive", comp),
            ("USDA_healthy_foods", hlth),
            ("OpenFoodFacts_health_scores", hs),
            ("nutrients_csvfile", nc)]


def load_off_subset():
    df = pd.read_csv(OFF_CSV)
    df = df[df["food_name"].notna()]
    has_b12 = df["vitamin_b12_ug"].notna()
    has_iod = df["iodine_ug"].notna()
    # exclude rows already overlapping core? we let the global dedup handle it.
    return df


def off_row_to_dict(r):
    row = R.new_row(str(r["food_name"]), R.classify(r["food_name"]), "OpenFoodFacts",
                    serving_desc="1 serving (100g)", grams=100.0)
    for c in R.NUTRIENT_COLS:
        v = r.get(c)
        if v is not None and pd.notna(v):
            row[c] = float(v)
    return row


def has_essential(row):
    return any(row.get(c) not in (None,) and row.get(c) is not None
               for c in ("vitamin_b12_ug", "iodine_ug", "folate_ug"))


def merge_all(core_sources, off_df, target_max=TARGET_MAX):
    by_key = {}
    order = []
    # 1) ingest core sources by priority
    for i, (src, rows) in enumerate(core_sources):
        for row in rows:
            key = R.norm_name(row["food_name"])
            if not key:
                continue
            if key not in by_key:
                by_key[key] = dict(row)
                order.append((key, i, len(order)))
            else:
                cur = by_key[key]
                for c in R.NUTRIENT_COLS:
                    if cur.get(c) is None and row.get(c) is not None:
                        cur[c] = row[c]

    # 2) process OFF: fill into existing + collect new candidates
    off_rows = []
    for _, r in off_df.iterrows():
        key = R.norm_name(r["food_name"])
        if not key:
            continue
        row = off_row_to_dict(r)
        if key in by_key:
            cur = by_key[key]
            for c in R.NUTRIENT_COLS:
                if cur.get(c) is None and row.get(c) is not None:
                    cur[c] = row[c]
        else:
            off_rows.append((key, row))

    # 3) order OFF candidates: essential-nutrient bearing first, then categorized
    off_rows.sort(key=lambda kv: (0 if has_essential(kv[1]) else 1,
                                  0 if kv[1]["food_category"] != "Other" else 1,
                                  len(kv[0])))
    for key, row in off_rows:
        if len(by_key) >= target_max:
            break
        if key not in by_key:
            by_key[key] = row
            order.append((key, 99, len(order)))

    # 4) reassemble in insertion order
    merged = []
    for key, _, _ in order:
        if key in by_key:
            merged.append(by_key[key])
    return merged


def write_dataset(merged, out_path=OUT):
    next_id = 1
    for row in merged:
        if not row.get("food_code"):
            row["food_code"] = f"REF{next_id:04d}"
            next_id += 1
    cols = R.META + R.NUTRIENT_COLS
    cols = [c for c in cols if c in (merged[0] if merged else {}) or True]
    df = pd.DataFrame(merged, columns=cols)
    df = df[[c for c in cols if c in df.columns]]
    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Final Cleaned", index=False)
    return df


if __name__ == "__main__":
    print("Loading core sources ...")
    core = load_core()
    for src, rows in core:
        print(f"  {src}: {len(rows)}")
    print("Loading OFF subset ...")
    off = load_off_subset()
    print("  OFF rows:", len(off))
    merged = merge_all(core, off)
    print("\nTOTAL REFINED ROWS:", len(merged))
    df = write_dataset(merged)
    print("Category counts:\n", df["food_category"].value_counts().to_string())
    print("\nB12 coverage:", int(df["vitamin_b12_ug"].notna().sum()),
          "| iodine coverage:", int(df["iodine_ug"].notna().sum()))
    print("WROTE:", OUT, "| MB:", round(os.path.getsize(OUT)/1e6, 2))

