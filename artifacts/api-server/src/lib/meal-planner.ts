import type { FoodRow } from "@workspace/db";
import type { NutrientPriorityResult, NutrientKey } from "./recovery-engine";
import { sumNutrients, buildNutrientLines, type FoodNutrients, type NutrientLine, convertVitaminDUgToIU } from "./nutrition-calculator";

export type PlannerFood = FoodRow;

// ---------------------------------------------------------------------------
// Cuisine preference (soft, non-excluding affinity)
//
// The live dataset has no structured cuisine metadata (cuisineTags are empty for
// every imported food), and the assessment captures a free-text food preference
// (e.g. "Asian"). We therefore apply cuisine as a *soft ranking boost* only:
//  - if the dataset ever carries matching `cuisineTags`, those are boosted first;
//  - otherwise a conservative name-keyword match is used;
//  - and full nutrient-priority ranking always remains the fallback, so the
//    nutrient-recovery logic is never degraded or filtered out.
// This is a documented limitation, not an invented per-food classification.
// ---------------------------------------------------------------------------
const CUISINE_TAG_MAP: Record<string, string[]> = {
  "indian": ["north_indian", "south_indian"],
  "north indian": ["north_indian"],
  "south indian": ["south_indian"],
  "general": ["general"],
};

const CUISINE_KEYWORDS: Record<string, string[]> = {
  "indian": ["indian", "curry", "masala", "tandoori", "biryani", "naan", "roti", "paratha", "chutney", "paneer", "dal", "rajma", "chana", "chole", "sambar", "rasam", "dosa", "idli", "vada", "pulao", "khichdi"],
  "north indian": ["north indian", "naan", "roti", "paratha", "tandoori", "paneer", "dal", "rajma", "chana", "chole", "biryani", "pulao", "khichdi", "butter"],
  "south indian": ["south indian", "sambar", "rasam", "dosa", "idli", "vada", "curd rice", "pongal", "coconut"],
  "asian": ["asian", "thai", "chinese", "japanese", "korean", "vietnamese", "noodle", "ramen", "sushi", "stir", "wok", "soy", "tofu", "ginger"],
  "mediterranean": ["mediterranean", "greek", "olive", "hummus", "falafel", "tahini", "pita", "tzatziki", "feta", "lentil"],
  "mexican": ["mexican", "taco", "burrito", "quesadilla", "enchilada", "guacamole", "salsa", "bean", "corn", "tortilla"],
};

function normalizePreference(pref?: string | null): string {
  return (pref || "").toLowerCase().replace(/_/g, " ").trim();
}

export function cuisineAffinity(food: PlannerFood, preference?: string | null): number {
  if (!food || !preference) return 0;
  const norm = normalizePreference(preference);
  if (!norm) return 0;

  // 1) Explicit dataset cuisineTags take priority when actually present.
  const tagHits = CUISINE_TAG_MAP[norm];
  if (tagHits && food.cuisineTags && food.cuisineTags.length) {
    if (tagHits.some((t) => food.cuisineTags.includes(t))) return 0.4;
  }

  // 2) Soft name-keyword match over the reliable existing `name` field.
  const keywords = CUISINE_KEYWORDS[norm];
  if (keywords && food.name) {
    const lower = food.name.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) return 0.25;
  }

  return 0;
}

export interface PlanMealItem {
  foodId: number;
  name: string;
  servingSize: string;
}

export interface PlanDay {
  dayNumber: number;
  breakfast: PlanMealItem[];
  lunch: PlanMealItem[];
  dinner: PlanMealItem[];
  snacks: PlanMealItem[];
  totals: FoodNutrients;
  nutrientLines: NutrientLine[];
}

export interface RecoveryPlanResult {
  durationDays: number;
  days: PlanDay[];
}

function eligibleFoods(foods: PlannerFood[], dietType: string, mealTag: string, allergies?: string | null): PlannerFood[] {
  const banned = (allergies ?? "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return foods.filter(
    (f) =>
      (f.dietTags.length === 0 || f.dietTags.includes(dietType)) &&
      (f.mealTags.length === 0 || f.mealTags.includes(mealTag)) &&
      !banned.some((b) => f.name.toLowerCase().includes(b)),
  );
}

function pickRotating<T>(items: T[], seed: number, count: number): T[] {
  if (items.length === 0) return [];
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(items[(seed + i) % items.length]);
  }
  return picked;
}

function rankByPriority(foods: PlannerFood[], priorities: NutrientPriorityResult[], cuisinePreference?: string | null): PlannerFood[] {
  const weightByNutrient: Record<NutrientKey, number> = {
    protein: 0,
    iron: 0,
    calcium: 0,
    vitamin_d: 0,
    magnesium: 0,
    vitamin_a: 0,
    vitamin_c: 0,
    vitamin_b7: 0,
    vitamin_e: 0,
    vitamin_k: 0,
    vitamin_b1: 0,
    vitamin_b2: 0,
    vitamin_b3: 0,
    vitamin_b6: 0,
    vitamin_b12: 0,
  };
  for (const p of priorities) {
    weightByNutrient[p.nutrient] = p.priority === "high" ? 3 : p.priority === "medium" ? 1.5 : 1;
  }
  const fieldMap: Record<NutrientKey, keyof PlannerFood> = {
    protein: "protein",
    iron: "iron",
    calcium: "calcium",
    vitamin_d: "vitaminD",
    magnesium: "magnesium",
    vitamin_a: "vitaminA",
    vitamin_c: "vitaminC",
    vitamin_b7: "vitaminB7",
    vitamin_e: "vitaminE",
    vitamin_k: "vitaminK",
    vitamin_b12: "vitaminB12",
    vitamin_b1: "vitaminB1",
    vitamin_b2: "vitaminB2",
    vitamin_b3: "vitaminB3",
    vitamin_b6: "vitaminB6",
  };
  return [...foods].sort((a, b) => {
    const scoreA = (Object.keys(weightByNutrient) as NutrientKey[]).reduce(
      (sum, n) => sum + ((n === "vitamin_d" ? convertVitaminDUgToIU(a[fieldMap[n]] as number) : (a[fieldMap[n]] as number)) || 0) * weightByNutrient[n],
      0,
    );
    const scoreB = (Object.keys(weightByNutrient) as NutrientKey[]).reduce(
      (sum, n) => sum + ((n === "vitamin_d" ? convertVitaminDUgToIU(b[fieldMap[n]] as number) : (b[fieldMap[n]] as number)) || 0) * weightByNutrient[n],
      0,
    );
    // Primary foods take precedence when scores are similar
    const tieA = a.tier === "primary" ? 0.001 : -0.001;
    const tieB = b.tier === "primary" ? 0.001 : -0.001;
    // Cuisine affinity is a small additive bonus so it breaks ties without
    // overpowering the nutrient-priority ranking.
    const affA = cuisineAffinity(a, cuisinePreference);
    const affB = cuisineAffinity(b, cuisinePreference);
    return (scoreB + tieB + affB) - (scoreA + tieA + affA);
  });
}

export function generateRecoveryPlan(
  foods: PlannerFood[],
  dietType: string,
  allergies: string | null | undefined,
  priorities: NutrientPriorityResult[],
  targets: Record<NutrientKey, number>,
  cuisinePreference?: string | null,
  durationDays = 30,
): RecoveryPlanResult {
  const breakfastPool = rankByPriority(eligibleFoods(foods, dietType, "breakfast", allergies), priorities, cuisinePreference);
  const lunchPool = rankByPriority(eligibleFoods(foods, dietType, "lunch", allergies), priorities, cuisinePreference);
  const dinnerPool = rankByPriority(eligibleFoods(foods, dietType, "dinner", allergies), priorities, cuisinePreference);
  const snackPool = rankByPriority(eligibleFoods(foods, dietType, "snack", allergies), priorities, cuisinePreference);

  const days: PlanDay[] = [];
  for (let day = 1; day <= durationDays; day++) {
    const breakfastItems = pickRotating(breakfastPool, day, 2);
    const lunchItems = pickRotating(lunchPool, day + 1, 3);
    const dinnerItems = pickRotating(dinnerPool, day + 2, 3);
    const snackItems = pickRotating(snackPool, day + 3, 2);

    const allItems = [...breakfastItems, ...lunchItems, ...dinnerItems, ...snackItems];
    const totals = sumNutrients(allItems.map((food) => ({ food, servings: 1 })));
    const nutrientLines = buildNutrientLines(totals, targets);

    days.push({
      dayNumber: day,
      breakfast: breakfastItems.map(toPlanItem),
      lunch: lunchItems.map(toPlanItem),
      dinner: dinnerItems.map(toPlanItem),
      snacks: snackItems.map(toPlanItem),
      totals,
      nutrientLines,
    });
  }

  return { durationDays, days };
}

function toPlanItem(food: PlannerFood): PlanMealItem {
  return { foodId: food.id, name: food.name, servingSize: food.servingSize };
}

export function topFoodSourcesForNutrient(
  foods: PlannerFood[],
  nutrient: NutrientKey,
  dietType: string,
  count = 6,
  cuisinePreference?: string | null,
): string[] {
  const fieldMap: Record<NutrientKey, keyof PlannerFood> = {
    protein: "protein",
    iron: "iron",
    calcium: "calcium",
    vitamin_d: "vitaminD",
    magnesium: "magnesium",
    vitamin_a: "vitaminA",
    vitamin_c: "vitaminC",
    vitamin_b7: "vitaminB7",
    vitamin_e: "vitaminE",
    vitamin_k: "vitaminK",
    vitamin_b12: "vitaminB12",
    vitamin_b1: "vitaminB1",
    vitamin_b2: "vitaminB2",
    vitamin_b3: "vitaminB3",
    vitamin_b6: "vitaminB6",
  };
  const sorted = foods
    .filter((f) => f.dietTags.length === 0 || f.dietTags.includes(dietType))
    .map((f) => ({ f, val: nutrient === "vitamin_d" ? convertVitaminDUgToIU((f[fieldMap[nutrient]] as number) || 0) : (f[fieldMap[nutrient]] as number) || 0 }))
    .sort((a, b) => {
      if (b.val !== a.val) return b.val - a.val;
      // Primary foods take precedence when values are equal
      if (a.f.tier !== b.f.tier) {
        return a.f.tier === "primary" ? -1 : 1;
      }
      // Cuisine affinity is a final tie-breaker among nutritionally equal,
      // same-tier foods (soft, non-excluding - never overrides nutrient ranking).
      if (cuisinePreference) {
        const affA = cuisineAffinity(a.f, cuisinePreference);
        const affB = cuisineAffinity(b.f, cuisinePreference);
        if (affB !== affA) return affB - affA;
      }
      return 0;
    });
  return sorted.slice(0, count).map((s) => s.f.name);
}
