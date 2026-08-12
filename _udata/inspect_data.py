import pandas as pd
import sys

def dump_xlsx(path, max_rows=5):
    print("=" * 80)
    print("FILE:", path)
    xl = pd.ExcelFile(path)
    print("SHEETS:", xl.sheet_names)
    for sn in xl.sheet_names:
        df = pd.read_excel(path, sheet_name=sn, nrows=max_rows)
        print("-" * 70)
        print("SHEET:", sn, "cols:", list(df.columns))
        print("ROW COUNT(first rows shown only)")
        print(df.to_string())
        # full row count
        full = pd.read_excel(path, sheet_name=sn, usecols=[0])
        print("full first-col length:", len(full))

dump_xlsx(r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\dataset.xlsx")
dump_xlsx(r"C:\Users\Abhinaya Doma\OneDrive\Desktop\zip.NREV\Anuvaad_INDB_2024.11.xlsx")
