"""
N-REV Refined Dataset Builder
==============================
Merges all raw nutrition datasets in zip.NREV into ONE refined, deduplicated,
categorized dataset on a common PER-SERVING basis (1 serving = 100 g for all
non-Anuvaad sources; Anuvaad keeps its native per-serving values, matching the
prototype dataset.xlsx).

The prototype column names (protein_g, iron_mg, calcium_mg, magnesium_mg,
vitamin_a_ug, vitamin_b7_ug, vitamin_c_mg, vitamin_d_ug, vitamin_e_mg,
vitamin_k_ug) are PRESERVED so backend seed.ts mapping keeps working. All
additional essential nutrients are added as extra columns (backend ignores
unknown columns, so the app is not disturbed).
"""
import os, re, math
import pandas as pd
import numpy as np

BASE = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\zip.NREV"
OUT_XLSX = r"C:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\NREV_Refined_Dataset.xlsx"

# Canonical output nutrient schema (units chosen to match the prototype)
NUTRIENT_COLS = [
    "energy_kcal",
    "carb_g", "protein_g", "fat_g", "fibre_g", "sugar_g",
    "sfa_mg", "mufa_mg", "pufa_mg", "cholesterol_mg", "trans_fat_g",
    "calcium_mg", "phosphorus_mg", "magnesium_mg", "sodium_mg", "potassium_mg",
    "iron_mg", "copper_mg", "selenium_ug", "chromium_mg", "manganese_mg",
    "molybdenum_mg", "zinc_mg", "iodine_ug",
    "vitamin_a_ug", "vitamin_b1_mg", "vitamin_b2_mg", "vitamin_b3_mg",
    "vitamin_b5_mg", "vitamin_b6_mg", "vitamin_b7_ug", "vitamin_b9_ug",
    "vitamin_b12_ug", "folate_ug", "vitamin_c_mg", "vitamin_d2_ug",
    "vitamin_d3_ug", "vitamin_d_ug", "vitamin_e_mg", "vitamin_k1_ug",
    "vitamin_k2_ug", "vitamin_k_ug", "carotenoids_ug",
]
META = ["food_code", "food_name", "food_category", "source", "serving_description", "serving_grams"]


def to_num(v):
    """Safely convert a raw value to a non-negative float, or None. Reject junk."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        x = float(v)
    else:
        s = str(v).strip().replace(",", "")
        low = s.lower()
        if low in ("", "t", "trace", "tr", "na", "n/a", "nan", "none", "-"):
            return None
        try:
            x = float(s)
        except Exception:
            return None
    if not math.isfinite(x):
        return None
    if x < 0:
        return 0.0
    return x


def new_row(name, category, source, serving_desc="1 serving", grams=None):
    return {"food_name": name, "food_category": category, "source": source,
            "serving_description": serving_desc, "serving_grams": grams,
            **{c: None for c in NUTRIENT_COLS}}


def norm_name(s):
    """Normalize a food name for duplicate matching."""
    if s is None:
        return ""
    s = str(s).lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

# ---------------------------------------------------------------------------
# Category classifier lists (continued)
# ---------------------------------------------------------------------------
FRUITS2 = ["apple","banana","orange","mango","grapes","grape ","papaya","pineapple",
  "watermelon","muskmelon","melon","berries","berry","strawberry","blueberry",
  "raspberry","blackberry","cranberry","cherry","peach","plum","apricot",
  "guava","pomegranate","lychee","pear","kiwi","lemon","lime","coconut",
  "sapota","fig","date","avocado","jackfruit","raisin","currant","prune",
  "persimmon","mulberry","amla"]
VEGGIES2 = ["potato","tomato","onion","carrot","cabbage","cauliflower","broccoli",
  "spinach","palak","okra","brinjal","eggplant","pumpkin","bottle gourd","lauki",
  "cucumber","beet","yam","taro","mushroom","coriander","fenugreek","methi",
  "lettuce","celery","asparagus","zucchini","squash","leek","shallot","kale","radish"]
NUTS2 = ["almond","cashew","peanut","walnut","pistachio","hazelnut","pecan","sesame",
  "sunflower seed","pumpkin seed","flaxseed","chia","nut","seed","acorn"]
GRAINS2 = ["rice","wheat","atta","maida","flour","oats","barley","jowar","bajra","ragi",
  "millet","corn","maize","quinoa","bread","roti","chapati","paratha","pasta","noodle",
  "semolina","rava","cereal","poha","dosa","idli","buckwheat","sorghum","tortilla","cracker"]
LEGUMES2 = ["lentil","dal","dahl","toor","moong","masoor","chana","chickpea","rajma",
  "kidney bean","soybean","soy","tofu","urad","lobia","black eyed","gram","besan"]
DAIRY2 = ["milk","curd","yogurt","dahi","butter","ghee","cheese","paneer","cream",
  "khoya","buttermilk","lassi","ice cream","kefir","margarine"]
MEAT2 = ["chicken","mutton","lamb","goat","beef","pork","bacon","ham","sausage","turkey",
  "duck","egg","meat","keema","kebab","tandoori","korma","omel"]
FISH2 = ["fish","salmon","tuna","sardine","mackerel","pomfret","rohu","prawn","shrimp",
  "crab","lobster","squid","clam","oyster","mussel","anchovy","cod","halibut","trout","seafood"]
BEV2 = ["tea","coffee","juice","soft drink","cola","soda","lemonade","sherbet","smoothie",
  "milkshake","coconut water","nimbu","beer","wine","whiskey","rum","vodka","chai","water"]
SNACKS2 = ["chips","fries","samosa","pakora","bhajji","namkeen","mixture","murukku",
  "chakli","bhujia","sev","popcorn","nachos","cracker","biscuit","cookie","wafer","puff"]
JUNK2 = ["burger","pizza","hot dog","fried","maggi","taco","donut","candy","toffee",
  "lollipop","chocolate","soft drink"]
SWEET2 = ["sweet","dessert","halwa","barfi","laddu","jalebi","rasgulla","rasmalai","kheer",
  "cake","pastry","muffin","brownie","ice cream","kulfi","jaggery","honey","jam","jelly",
  "sheera","modak","peda","mithai","cookie"]
FATS2 = ["oil","ghee","butter","margarine","mayonnaise","shortening","lard","vanaspati"]
SPICES2 = ["spice","masala","turmeric","cumin","coriander","cardamom","clove","cinnamon",
  "pepper","asafoetida","saffron","nutmeg","vinegar","salt","chutney","paste","ketchup","pickle"]
SOUPS = ["soup","broth","stew","rasam"]

def _mk(key):
    return {norm_key: True for norm_key in key}

def _contains(n, kws):
    for k in kws:
        if k in n:
            return True
    return False

def classify(name):
    n = norm_name(name)
    if not n:
        return "Other"
    if _contains(n, SOUPS + ["broth", "stew"]):
        return "Soups"
    if _contains(n, BEV2):
        return "Beverages"
    if _contains(n, FATS2):
        return "Fats & Oils"
    if _contains(n, SPICES2):
        return "Spices & Herbs"
    if _contains(n, NUTS2):
        return "Nuts & Seeds"
    if _contains(n, GRAINS2):
        return "Grains & Cereals"
    if _contains(n, LEGUMES2):
        return "Legumes & Pulses"
    if _contains(n, MEAT2):
        return "Meat & Poultry"
    if _contains(n, FISH2):
        return "Fish & Seafood"
    if _contains(n, DAIRY2):
        return "Dairy & Eggs"
    if _contains(n, FRUITS2):
        return "Fruits"
    if _contains(n, VEGGIES2):
        return "Vegetables"
    if _contains(n, SWEET2):
        return "Desserts & Sweets"
    if _contains(n, SNACKS2):
        return "Snacks"
    if _contains(n, JUNK2):
        return "Junk & Processed Foods"
    return "Other"

def map_external_category(cat):
    """Map a source-provided category string to a canonical category (or None)."""
    if cat is None:
        return None
    c = str(cat).lower()
    if "fruit" in c: return "Fruits"
    if "vegetable" in c: return "Vegetables"
    if "seed" in c or "nut" in c: return "Nuts & Seeds"
    if any(k in c for k in ["dairy","milk","cheese","egg","yogurt"]): return "Dairy & Eggs"
    if any(k in c for k in ["meat","poultry","lamb","beef","pork"]): return "Meat & Poultry"
    if any(k in c for k in ["fish","seafood","shellfish"]): return "Fish & Seafood"
    if any(k in c for k in ["grain","cereal","bread","pasta","rice"]): return "Grains & Cereals"
    if any(k in c for k in ["bean","legume","lentil","soy"]): return "Legumes & Pulses"
    if any(k in c for k in ["beverage","drink","juice","soda"]): return "Beverages"
    if any(k in c for k in ["sweet","dessert","candy","jam","jelly"]): return "Desserts & Sweets"
    if any(k in c for k in ["snack","fastfood","fast food"]): return "Snacks"
    if any(k in c for k in ["fat","oil","shortening"]): return "Fats & Oils"
    if "soup" in c: return "Soups"
    if "other" in c: return None
    return None

