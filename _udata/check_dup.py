import re, pandas as pd
df = pd.read_excel(r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Refined_Dataset.xlsx",
                   sheet_name="Final Cleaned")
def norm(s):
    s = str(s).lower()
    s = re.sub(r"[^a-z0-9 ]"," ",s)
    return re.sub(r"\s+"," ",s).strip()
keys = df["food_name"].map(norm)
print("total rows:", len(df))
print("unique normalized names:", keys.nunique())
print("normalized duplicates:", len(df) - keys.nunique())
print("null food_name:", df["food_name"].isna().sum())
print("category coverage (unique cats):", df["food_category"].nunique())
