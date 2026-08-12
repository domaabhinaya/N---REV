import zipfile

def head_zip(zip_path, entry_contains, n=4):
    print("=" * 80)
    print("ZIP:", zip_path, "| filter:", entry_contains)
    z = zipfile.ZipFile(zip_path)
    for name in z.namelist():
        if entry_contains not in name:
            continue
        print("-" * 70)
        print("ENTRY:", name, "size:", z.getinfo(name).file_size)
        with z.open(name) as f:
            first = f.read(120000).decode("utf-8", errors="replace")
        lines = first.splitlines()
        print("HEADER:")
        print(lines[0][:5000])
        print("SAMPLES:")
        for ln in lines[1:1+n]:
            print(ln[:2500])
    z.close()

base = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\zip.NREV"
head_zip(base + r"\archive (3).zip", "nutrients")
head_zip(base + r"\archive (2).zip", "tsv")
head_zip(base + r"\archive (5).zip", "indian")
