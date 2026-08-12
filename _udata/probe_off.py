import pandas as pd, io, zipfile, time
z = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\zip.NREV\archive (2).zip"
cols = ["product_name","pnns_groups_1","main_category_en","energy_100g","proteins_100g",
        "vitamin-b12_100g","iodine_100g","vitamin-a_100g","vitamin-d_100g","vitamin-e_100g",
        "vitamin-k_100g","vitamin-c_100g","vitamin-b1_100g","vitamin-b2_100g","vitamin-pp_100g",
        "vitamin-b6_100g","vitamin-b9_100g","folates_100g","biotin_100g","pantothenic-acid_100g",
        "potassium_100g","calcium_100g","phosphorus_100g","iron_100g","magnesium_100g","zinc_100g",
        "copper_100g","manganese_100g","selenium_100g","chromium_100g","molybdenum_100g",
        "cholesterol_100g","sodium_100g","sugars_100g","fiber_100g","saturated-fat_100g",
        "monounsaturated-fat_100g","polyunsaturated-fat_100g","carbohydrates_100g","fat_100g"]
t0=time.time(); total=0; with_name=0; with_b12=0; with_iod=0; total_b12=0.0; total_iod=0.0
zf=zipfile.ZipFile(z)
with zf.open("en.openfoodfacts.org.products.tsv") as f:
    reader=pd.read_csv(io.TextIOWrapper(f, encoding="utf-8", errors="replace"), sep="\t",
                       usecols=cols if False else None, chunksize=500000, low_memory=False,
                       dtype=str)
    cnt=0
    for chunk in reader:
        cnt+=1
        total += len(chunk)
        valid = chunk["product_name"].notna() & (chunk["product_name"].astype(str).str.strip()!="")
        wn = int(valid.sum())
        with_name += wn
        # b12: treat as numeric, drop empty/zero-ish
        b12 = pd.to_numeric(chunk.loc[valid,"vitamin-b12_100g"], errors="coerce")
        iod = pd.to_numeric(chunk.loc[valid,"iodine_100g"], errors="coerce")
        nb12 = int((b12>0).sum()); niod = int((iod>0).sum())
        with_b12+=nb12; with_iod+=niod
        total_b12 += float(b12[b12>0].sum()); total_iod += float(iod[iod>0].sum())
        if cnt%10==0:
            print(f"chunk {cnt}: total={total} with_name={with_name} b12pos={with_b12} iodpos={with_iod} t={time.time()-t0:.0f}s")
        if cnt>=40:
            break
print("DONE early-stop. total rows seen:", total, "with_name:", with_name, "b12pos:", with_b12, "iodpos:", with_iod)
print("mean b12 (mg?):", total_b12/max(with_b12,1), "mean iod:", total_iod/max(with_iod,1))
