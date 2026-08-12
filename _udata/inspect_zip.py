import zipfile, io, pandas as pd

def head_zip(zip_path, target=None, n=3, maxlines_head=3):
    print("=" * 90)
    print("ZIP:", zip_path)
    z = zipfile.ZipFile(zip_path)
    for name in z.namelist():
        if target and not name.startswith(target):
            continue
        print("-" * 70)
        print("ENTRY:", name, "size:", z.getinfo(name).file_size)
        with z.open(name) as f:
            # read first bytes for header
            first = f.read(20000).decode("utf-8", errors="replace")
        lines = first.splitlines()
        print("HEADERS:")
        print(lines[0][:4000])
        print("SAMPLE ROWS:")
        for ln in lines[1:1+n]:
            print(ln[:1500])

base = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\zip.NREV"
head_zip(base + r"\archive.zip")
head_zip(base + r"\archive (3).zip")
head_zip(base + r"\archive (5).zip")
head_zip(base + r"\archive (1).zip", target="food.csv")
head_zip(base + r"\archive (1).zip", target="nutrient.csv")
head_zip(base + r"\archive (1).zip", target="food_nutrient.csv", n=2)
head_zip(base + r"\archive (1).zip", target="measure_unit.csv")
head_zip(base + r"\archive (1).zip", target="food_portion.csv", n=2)
head_zip(base + r"\archive (2).zip", target=".tsv", n=2)
