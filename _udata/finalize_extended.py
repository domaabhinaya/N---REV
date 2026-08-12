"""Build the PROPOSED final EXTENDED dataset and report its stats."""
import os
import pandas as pd
import numpy as np
import refine_lib as R
from final_build import load_off_subset

OUT = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Extended_Dataset.xlsx"  # PROPOSED

def main():
    df = load_off_subset()          # 46,928 OpenFoodFacts records (unchanged data)
    print("STARTING rows (off_clean preserved):", len(df))
    df = df.reset_index(drop=True)

    # Ensure 49-col schema in canonical order
    cols = R.META + R.NUTRIENT_COLS
    for c in cols:
        if c not in df.columns:
            df[c] = pd.NA
    df = df[cols]

    # Assign unique food_code (EXT####) keeping any already valid
    used = set()
    codes = []
    next_id = 1
    for v in df["food_code"]:
        s = "" if pd.isna(v) else str(v).strip()
        if s and s not in used and s.lower() != "nan":
            used.add(s); codes.append(s)
        else:
            c = f"EXT{next_id:05d}"; next_id += 1
            while c in used:
                c = f"EXT{next_id:05d}"; next_id += 1
            used.add(c); codes.append(c)
    df["food_code"] = codes

    # Duplicate checks on normalized names
    def norm(s): return R.norm_name(s)
    keys = df["food_name"].map(norm)
    dup_names = int(len(df) - keys.nunique())
    dup_codes = int(df["food_code"].duplicated().sum())
    null_names = int(df["food_name"].isna().sum())

    # Coverage
    b12 = int(df["vitamin_b12_ug"].notna().sum())
    iod = int(df["iodine_ug"].notna().sum())
    vitA = int(df["vitamin_a_ug"].notna().sum())
    vitD = int(df["vitamin_d_ug"].notna().sum())

    print("FINAL proposed rows:", len(df))
    print("duplicate normalized names:", dup_names)
    print("duplicate food_codes:", dup_codes)
    print("null food_name:", null_names)
    print("B12 coverage:", b12, f"({round(b12/len(df)*100,2)}%)")
    print("iodine coverage:", iod, f"({round(iod/len(df)*100,3)}%)")
    print("vitamin A (ug) coverage:", vitA)
    print("vitamin D (ug) coverage:", vitD)
    print("columns:", len(df.columns))
    print("negative-check cols:")

    # invalid value scan
    for c in ["vitamin_a_ug","vitamin_d_ug","vitamin_d2_ug","vitamin_d3_ug","energy_kcal","protein_g"]:
        num = pd.to_numeric(df[c], errors="coerce")
        n = int((num < 0).sum()); a = int((num.abs() > 1e7).sum())
        if n or a:
            print(f"   {c}: neg={n} abs>1e7={a}")
    print("  (none printed = no invalid values)")

    with pd.ExcelWriter(OUT, engine="openpyxl") as w:
        df.to_excel(w, sheet_name="Final Cleaned", index=False)
    print("WROTE (PROPOSED):", OUT, "| MB:", round(os.path.getsize(OUT)/1e6, 2))

if __name__ == "__main__":
    main()
