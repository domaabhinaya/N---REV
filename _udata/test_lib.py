import refine_lib as r
tests = ['Apple','Banana raw','Spinach cooked','Almonds','Chicken curry','Salmon',
         'Rice cooked','Chana dal','Samosa','Cola','Gulab jamun','Mustard oil',
         'Turmeric powder','Tomato soup','Ladoo','Bread','Milk','Rajma curry']
for t in tests:
    print(f"{t!r:22} -> {r.classify(t)}")
print("NUTRIENT_COLS:", len(r.NUTRIENT_COLS), "META:", r.META)
