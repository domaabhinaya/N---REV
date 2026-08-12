import pandas as pd, re
p = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Subset_Common.xlsx"
df = pd.read_excel(p, sheet_name="Final Cleaned")
print("rows:", len(df), "| cols:", len(df.columns))
def norm(s):
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9 ]"," ",str(s).lower())).strip()
keys=df["food_name"].map(norm)
print("unique normalized names:", keys.nunique(), "| dup:", len(df)-keys.nunique())
sd=["food_name","protein_g","iron_mg","calcium_mg","vitamin_d_ug","vitamin_a_ug",
    "vitamin_b7_ug","vitamin_c_mg","vitamin_e_mg","vitamin_k_ug","magnesium_mg"]
print("seed cols present:", [c for c in sd if c in df.columns])
extra=["vitamin_b12_ug","iodine_ug","zinc_mg","phosphorus_mg","energy_kcal","sugar_g"]
print("extra nutrient cols present:", [c for c in extra if c in df.columns])
print("\nSample foods:")
print(df[["food_code","food_name","food_category","source"]].head(12).to_string(index=False))
