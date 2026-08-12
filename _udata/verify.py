import pandas as pd
p = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Refined_Dataset.xlsx"
df = pd.read_excel(p, sheet_name="Final Cleaned")
print("rows:", len(df), "cols:", len(df.columns))
print("columns:", list(df.columns))
print("\nNON-NULL COUNTS (top nutrients):")
nn = df.notna().sum().sort_values(ascending=False)
print(nn.head(50).to_string())
print("\nSAMPLE (Anuvaad foods):")
s = df[df["source"]=="Anuvaad_INDB_2024.11"]
print(s.head(3)[["food_code","food_name","food_category","protein_g","iron_mg","vitamin_d_ug","vitamin_k_ug","energy_kcal"]].to_string())
print("\nSample USDA food:")
u = df[df["source"]!="Anuvaad_INDB_2024.11"].head(2)[["food_code","food_name","food_category","source","protein_g","energy_kcal"]].to_string()
print(u)
