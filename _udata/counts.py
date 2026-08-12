import zipfile, io, pandas as pd

def load_csv_from_zip(zip_path, entry, **kw):
    z = zipfile.ZipFile(zip_path)
    with z.open(entry) as f:
        df = pd.read_csv(io.TextIOWrapper(f, encoding="utf-8", errors="replace"), **kw)
    return df

base = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\zip.NREV"

try:
    comp = load_csv_from_zip(base + r"\archive.zip", "comprehensive_foods_usda.csv", low_memory=False)
    print("COMPREHENSIVE rows:", len(comp), "cols:", list(comp.columns))
    print("food_type counts:", comp["food_type"].value_counts(dropna=False).to_dict())
    print("distinct names:", comp["food_name"].nunique())
except Exception as e:
    print("comp err", e)

try:
    hlth = load_csv_from_zip(base + r"\archive.zip", "healthy_foods_database.csv", low_memory=False)
    print("\nHEALTHY rows:", len(hlth), "cols:", list(hlth.columns))
    print("food_type/value counts:", hlth["food_type"].value_counts(dropna=False).to_dict())
    print("distinct:", hlth["food_name"].nunique())
except Exception as e:
    print("hlth err", e)

try:
    hs = load_csv_from_zip(base + r"\archive.zip", "foods_health_scores_allergens.csv", low_memory=False)
    print("\nHEALTH_SCORES rows:", len(hs), "cols:", list(hs.columns))
    print("food_type:", hs["food_type"].value_counts(dropna=False).to_dict())
except Exception as e:
    print("hs err", e)

try:
    n3 = load_csv_from_zip(base + r"\archive (3).zip", "nutrients_csvfile.csv", low_memory=False)
    print("\nNUTRIENTS_CSV rows:", len(n3), "cols:", list(n3.columns))
    print("Category:", n3["Category"].value_counts(dropna=False).to_dict())
    print(n3.head(5).to_string())
except Exception as e:
    print("n3 err", e)
