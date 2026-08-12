"""Inspect candidate additions for the EXTENDED dataset (read-only)."""
import re, os
import pandas as pd
import refine_lib as R
import build_refined as B
from final_build import load_off_subset, off_row_to_dict

PRIM_XLSX = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Refined_Dataset.xlsx"

def normset(df):
    return {R.norm_name(x) for x in df["food_name"].dropna()}

def main():
    # Extended base (off_clean / OpenFoodFacts)
    off = load_off_subset()
    off_keys = normset(off)
    print("off_clean rows:", len(off), "| unique names:", len(off_keys))

    # Primary
    prim = pd.read_excel(PRIM_XLSX, sheet_name="Final Cleaned")
    prim_keys = normset(prim)
    print("primary rows:", len(prim), "| unique names:", len(prim_keys))
    print("overlap off ^ primary:", len(off_keys & prim_keys))

    excluded = off_keys | prim_keys          # foods already represented (fallback must be NEW)

    sources = [
        ("USDA_comprehensive", B.load_comprehensive()),
        ("USDA_healthy_foods", B.load_healthy()),
        ("health_scores", B.load_health_scores()),
        ("nutrients_csvfile", B.load_nutrients_csv()),
    ]
    print("\n=== Candidate additions (not in off_clean, not in primary) ===")
    grand = {}
    raw_counts = {}
    for name, rows in sources:
        raw_counts[name] = len(rows)
        seen = set()
        keep = []
        for r in rows:
            key = R.norm_name(r["food_name"])
            if not key or key in excluded or key in seen:
                continue
            # usable nutrient info: has at least one non-null nutrient
            if not any(r.get(c) is not None for c in R.NUTRIENT_COLS):
                continue
            seen.add(key)
            keep.append(r)
        grand[name] = keep
        print(f"  {name}: raw={len(rows)} -> NEW usable candidates = {len(keep)}")

    total = sum(len(v) for v in grand.values())
    print("\nTOTAL candidate additions available:", total)
    # combined dedupe across candidate sources themselves
    allkeys = set()
    unique = 0
    for name, rows in grand.items():
        for r in rows:
            k = R.norm_name(r["food_name"])
            if k not in allkeys:
                allkeys.add(k)
                unique += 1
    print("TOTAL unique candidate names (across sources):", unique)
    print("Dip to reach 49k from 46,928:", 49000 - len(off))

if __name__ == "__main__":
    main()
