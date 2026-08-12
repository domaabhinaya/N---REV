import re, pandas as pd, numpy as np
p = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Subset_Common.xlsx"
xl = pd.ExcelFile(p)
print("SHEETS:", xl.sheet_names)
df = pd.read_excel(p, sheet_name="Final Cleaned")
print("="*70)
print(f"ROWS: {len(df)}")
print(f"COLUMNS: {len(df.columns)}")
print("COLUMN NAMES:")
for i,c in enumerate(df.columns): print(f"  {i}: {c}")

nutr = [c for c in df.columns if re.match(r'^(energy|carb|protein|fat|fibre|sugar|sfa|mufa|pufa|cholesterol|trans|calcium|phosphorus|magnesium|sodium|potassium|iron|copper|selenium|chromium|manganese|molybdenum|zinc|iodine|vitamin|folate|carotenoid)', c)]
print("\nNUTRIENT COLUMNS (%d):"%len(nutr)); print(" ", nutr)

print("\nFOOD CATEGORY COLUMNS:", [c for c in df.columns if 'categor' in c.lower()])
print("SOURCE COLUMNS:", [c for c in df.columns if 'source' in c.lower()])

print("\nCATEGORY COUNTS:")
print(df['food_category'].value_counts(dropna=False).to_string())
print("\nSOURCE COUNTS:")
print(df['source'].value_counts(dropna=False).to_string())

print("\nMISSING-VALUE PATTERN (null counts, sorted desc, top 25):")
print(df.isna().sum().sort_values(ascending=False).head(25).to_string())
full_cols = [c for c in df.columns if df[c].notna().all()]
print("\nColumns with ZERO missing:", full_cols)

def norm(s): return re.sub(r"\s+"," ", re.sub(r"[^a-z0-9 ]"," ",str(s).lower())).strip()
keys = df['food_name'].map(norm)
print("\nDUPLICATE NORMALIZED FOOD NAMES:", int(len(df)-keys.nunique()), "| total rows:", len(df))
print("Duplicate food_code:", int(df['food_code'].duplicated().sum()))
print("Null food_name:", int(df['food_name'].isna().sum()))

print("\nOBVIOUS INVALID VALUES (numeric checks):")
for c in ['protein_g','iron_mg','calcium_mg','energy_kcal','vitamin_d_ug','vitamin_c_mg','magnesium_mg','zinc_mg','sodium_mg','sugar_g','carb_g','fat_g']:
    if c in df.columns:
        num = pd.to_numeric(df[c], errors='coerce')
        neg = int((num<0).sum())
        ab = int((num.abs()>1e7).sum())
        if neg or ab: print(f"  {c}: negative={neg}, abs>1e7={ab}")
print("  (no line printed = no negatives/absurd values found)")

print("\nSERVING / UNIT CONVENTIONS:")
print("  serving_description samples:", df['serving_description'].dropna().unique()[:12])
print("  serving_grams null count:", int(df['serving_grams'].isna().sum()), "/", len(df))
print("  serving_grams describe:", df['serving_grams'].describe().to_dict())
