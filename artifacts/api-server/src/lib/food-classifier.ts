/*
 * food-classifier.ts
 *
 * Lightweight, dataset-grounded classification layer for N-REV foods.
 *
 * IMPORTANT: This does NOT invent metadata. It classifies foods using only:
 *   1. Explicit dataset fields when present (cuisineTags, mealTags, dietTags, source)
 *   2. Conservative, high-confidence keyword matching against the food `name`
 *
 * When a food cannot be reliably classified, it gets "Unknown" category or
 * "unknown" cuisine. Unknown is always preferred over an incorrect classification.
 */
import type { PlannerFood } from "./meal-planner";

// ============================================================================
// FOOD CATEGORY CLASSIFICATION
// ============================================================================
// Categories: Fruits, Vegetables, Snacks, Pulses/Legumes, Grains, Dairy,
//             Nuts, Seeds, Beverages, Other
// ============================================================================

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: "Fruits", keywords: ["apple", "banana", "orange", "grape", "mango", "guava", "amla", "gooseberry", "kiwi", "papaya", "pineapple", "strawberry", "berry", "lemon", "lime", "citrus", "melon", "pear", "peach", "plum"] },
  { category: "Vegetables", keywords: ["spinach", "carrot", "broccoli", "beans", "cabbage", "cauliflower", "pumpkin", "squash", "ladyfinger", "okra", "bottle gourd", "dudhi", "ash gourd", "cucumber", "tomato", "onion", "garlic", "ginger", "potato", "sweet potato", "beetroot", "radish", "capsicum", "bell pepper", "lettuce", "kale", "chard", "fenugreek", "methi", "amaranth", "drumstick", "snake gourd", "ridge gourd", "bitter gourd", "neem", "curry leaf"] },
  { category: "Nuts", keywords: ["almond", "walnut", "cashew", "pistachio", "pecan", "hazelnut", "peanut", "groundnut"] },
  { category: "Seeds", keywords: ["sesame", "til", "flax", "chia", "pumpkin seed", "sunflower seed", "melon seed", "nigella", "cumin", "coriander seed", "fennel", "saunf"] },
  { category: "Dairy", keywords: ["milk", "curd", "dahi", "yogurt", "paneer", "cheese", "ghee", "butter", "cream", "lassi", "buttermilk", "chaas"] },
  { category: "Grains", keywords: ["rice", "roti", "chapati", "wheat", "oat", "quinoa", "millet", "bajra", "jowar", "ragi", "maize", "corn", "barley", "rye", "khichdi", "pulao", "pongal", "semolina", "sooji", "bread", "tortilla", "naan", "paratha", "thepla"] },
  { category: "Pulses/Legumes", keywords: ["dal", "dha", "rajma", "kidney", "chana", "chickpea", "chole", "moong", "toor", "masoor", "urad", "mung", "soy", "soya", "tofu", "lentil", "bean", "peas", "sprouted"] },
  { category: "Snacks", keywords: ["chips", "namak", "namkeen", "pakora", "fritter", "biscuit", "cookie", "cracker", "crisp", "snack", "chutney", "pickle", "achar", "papad", "papadum", "popcorn", "roasted", "bhuna", "cheese ball"] },
  { category: "Beverages", keywords: ["tea", "coffee", "lassi", "shake", "smoothie", "juice", "buttermilk", "chaas", "soda", "drink", "sharbat", "sherbet", "sattu drink", "soy milk"] },
];

export type FoodCategory =
  | "Fruits"
  | "Vegetables"
  | "Snacks"
  | "Pulses/Legumes"
  | "Grains"
  | "Dairy"
  | "Nuts"
  | "Seeds"
  | "Beverages"
  | "Other"
  | "Unknown";

/**
 * Classify a food into a dietary category using dataset fields and name heuristics.
 * Returns "Unknown" when no reliable classification is possible.
 */
export function classifyFoodCategory(food: PlannerFood): FoodCategory {
  const name = (food.name || "").toLowerCase().trim();
  if (!name) return "Unknown";

  // Check explicit mealTags first — they're the most reliable signal
  const mealTags = food.mealTags || [];
  if (mealTags.includes("snack")) return "Snacks";

  // Check keywords (high-confidence name matching)
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => name.includes(kw))) {
      return category as FoodCategory;
    }
  }

  // If no match, check for more specific patterns
  if (/\b(tea|coffee|drink|shake|smoothie|juice|lassi)\b/.test(name)) {
    return "Beverages";
  }

      // Could not reliably classify
  return "Unknown";
}

// ============================================================================
// CUISINE CLASSIFICATION
// ============================================================================
// Cuisines: Indian, North Indian, South Indian, Asian, Western, Global, Unknown
// ============================================================================

export type FoodCuisine = "Indian" | "North Indian" | "South Indian" | "Asian" | "Western" | "Global" | "Unknown";

const CUISINE_KEYWORDS: Array<{ cuisine: FoodCuisine; keywords: string[] }> = [
  { cuisine: "South Indian", keywords: ["sambar", "rasam", "dosa", "idli", "vada", "curd rice", "pongal", "coconut", "south indian"] },
  { cuisine: "North Indian", keywords: ["tandoori", "naan", "paratha", "butter chicken", "paneer", "rajma", "chole", "khichdi", "dal makhani", "north indian", "roti", "chapati"] },
  { cuisine: "Indian", keywords: ["dal", "curry", "masala", "garam masala", "cumin", "coriander", "amchur", "jaggery", "ghee", "atta", "besan", "halwa", "ladoo", "burfi", "jalebi", "poha", "upma", "avial", "thal"] },
  { cuisine: "Asian", keywords: ["thai", "chinese", "japanese", "korean", "vietnamese", "ramen", "sushi", "stir fry", "wok", "soy", "tofu", "teriyaki", "miso", "ginger", "sesame oil", "hoisin", "char siu"] },
  { cuisine: "Western", keywords: ["american", "italian", "mexican", "french", "greek", "mediterranean", "burger", "pizza", "pasta", "taco", "burrito", "quesadilla", "enchilada", "bagel", "omelet", "pancake", "waffle"] },
];

/**
 * Classify a food's cuisine using dataset cuisineTags first, then name heuristics.
 * Returns "Unknown" when no reliable classification is possible.
 */
export function classifyCuisine(food: PlannerFood): FoodCuisine {
  // 1) Use explicit dataset cuisineTags when present
  const tags = food.cuisineTags || [];
  if (tags.length > 0) {
    // Map tag → cuisine (first match wins)
    for (const tag of tags) {
      switch (tag) {
        case "south_indian":
          return "South Indian";
        case "north_indian":
          return "North Indian";
        case "indian":
          return "Indian";
        case "asian":
          return "Asian";
        case "western":
          return "Western";
        case "global":
          return "Global";
      }
    }
  }

  // 2) Conservative name-keyword match
  const name = (food.name || "").toLowerCase().trim();
  if (!name) return "Unknown";

  // Check more specific cuisines first (South/North Indian before generic Indian)
  for (const { cuisine, keywords } of CUISINE_KEYWORDS) {
    if (keywords.some((kw) => name.includes(kw))) {
      return cuisine;
    }
  }

  // If the food source indicates an international/processed food, classify as Western
  const source = (food.source || "").toLowerCase();
  if (source.includes("openfoodfacts") || source.includes("usda") || source.includes("ndb")) {
    return "Western";
  }

  return "Unknown";
}

/**
 * Check if a food's category matches the requested category.
 */
export function matchesCategory(food: PlannerFood, category: string): boolean {
  const foodCategory = classifyFoodCategory(food);
  if (foodCategory === "Unknown") return false;

  const cat = category.toLowerCase();

  // Handle category aliases/groupings
  const categoryMap: Record<string, string[]> = {
    fruits: ["fruits"],
    vegetables: ["vegetables"],
    snacks: ["snacks"],
    pulses: ["pulses/legumes"],
    legumes: ["pulses/legumes"],
    "pulses/legumes": ["pulses/legumes"],
    grains: ["grains"],
    dairy: ["dairy"],
    nuts: ["nuts"],
    seeds: ["seeds"],
    beverages: ["beverages"],
  };

  const mapped = categoryMap[cat];
  if (!mapped) {
    // Direct match
    return foodCategory.toLowerCase() === cat;
  }
  // Compare case-insensitively: the classifier returns capitalized category
  // labels (e.g. "Vegetables") while categoryMap values are lowercase.
  return mapped.some((m) => foodCategory.toLowerCase() === m.toLowerCase());
}

/**
 * Precompute a lightweight summary of a food for AI/context use.
 */
export function foodSummary(food: PlannerFood): {
  name: string;
  category: FoodCategory;
  cuisine: FoodCuisine;
  dietTags: string[];
  servingSize: string;
} {
  return {
    name: food.name,
    category: classifyFoodCategory(food),
    cuisine: classifyCuisine(food),
    dietTags: food.dietTags || [],
    servingSize: food.servingSize,
  };
}