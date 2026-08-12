import pandas as pd, io, zipfile
z = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\zip.NREV\archive (2).zip"
cols = ["product_name","pnns_groups_1","vitamin-b12_100g","iodine_100g","proteins_100g","energy_100g"]
zf=zipfile.ZipFile(z)
from collections import Counter
pnns=Counter(); b12vals=[]; iodvals=[]
with zf.open("en.openfoodfacts.org.products.tsv") as f:
    for chunk in pd.read_csv(io.TextIOWrapper(f, encoding="utf-8", errors="replace"), sep="\t",
                             chunksize=500000, low_memory=False, dtype=str,
                             usecols=["product_name","pnns_groups_1","vitamin-b12_100g","iodine_100g"]):
        valid = chunk["product_name"].notna()
        if valid.any():
            pnns.update(chunk.loc[valid,"pnns_groups_1"].fillna("").astype(str).tolist())
            b12 = pd.to_numeric(chunk.loc[valid,"vitamin-b12_100g"], errors="coerce")
            iod = pd.to_numeric(chunk.loc[valid,"iodine_100g"], errors="coerce")
            b12vals.extend(b12[b12>0].round(6).tolist())
            iodvals.extend(iod[iod>0].round(6).tolist())
            if len(b12vals)>200000: break
print("pnns_groups_1 top 30:")
for k,v in pnns.most_common(30):
    print(f"  {k!r}: {v}")
import numpy as np
b=np.array(b12vals); i=np.array(iodvals)
print("\nb12 >0 count:", len(b))
if len(b): print("b12 percentiles:", np.percentile(b,[1,25,50,75,90,99]))
print("\niodine >0 count:", len(i))
if len(i): print("iodine percentiles:", np.percentile(i,[1,25,50,75,90,99]))
