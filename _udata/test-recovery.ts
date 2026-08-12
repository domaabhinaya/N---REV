import { computeNutrientPriorities, NUTRIENTS, NUTRIENT_LABELS, NUTRIENT_UNITS } from "../artifacts/api-server/src/lib/recovery-engine.ts";
import { generateRecoveryPlan, type PlannerFood } from "../artifacts/api-server/src/lib/meal-planner.ts";
import { buildNutrientLines } from "../artifacts/api-server/src/lib/nutrition-calculator.ts";

const mockFoods: PlannerFood[] = [
  { id: 1, name: "Moong dal (cooked)", servingSize: "1 cup (200g)", protein: 14, iron: 3.2, calcium: 55, vitaminD: 0, magnesium: 50, vitaminA: 100, vitaminC: 5, vitaminB7: 10, vitaminE: 0.5, vitaminK: 20, vitaminB1: 0.2, vitaminB2: 0.1, vitaminB3: 0.8, vitaminB6: 0.2, vitaminB12: 0, dietTags: ["vegan","vegetarian","eggetarian","non_vegetarian"], mealTags: ["lunch","dinner"], cuisineTags: [], tier: "primary" as const, source: null },
  { id: 2, name: "Egg (boiled, whole)", servingSize: "1 large egg", protein: 6, iron: 0.9, calcium: 28, vitaminD: 44, magnesium: 10, vitaminA: 100, vitaminC: 0, vitaminB7: 20, vitaminE: 1, vitaminK: 0, vitaminB1: 0.03, vitaminB2: 0.26, vitaminB3: 0.06, vitaminB6: 0.12, vitaminB12: 1.1, dietTags: ["eggetarian","non_vegetarian"], mealTags: ["breakfast","snack"], cuisineTags: [], tier: "primary" as const, source: null },
  { id: 3, name: "Fortified cereal", servingSize: "1 bowl", protein: 6, iron: 4.5, calcium: 120, vitaminD: 120, magnesium: 30, vitaminA: 50, vitaminC: 10, vitaminB7: 5, vitaminE: 2, vitaminK: 5, vitaminB1: 0.4, vitaminB2: 0.5, vitaminB3: 5, vitaminB6: 0.6, vitaminB12: 0.7, dietTags: ["vegetarian","eggetarian","non_vegetarian"], mealTags: ["breakfast"], cuisineTags: [], tier: "primary" as const, source: null },
  { id: 4, name: "Paneer (cooked)", servingSize: "100g", protein: 18, iron: 0.5, calcium: 480, vitaminD: 8, magnesium: 10, vitaminA: 100, vitaminC: 0, vitaminB7: 10, vitaminE: 1, vitaminK: 2, vitaminB1: 0.05, vitaminB2: 0.3, vitaminB3: 0.1, vitaminB6: 0.06, vitaminB12: 0.5, dietTags: ["vegetarian","eggetarian","non_vegetarian"], mealTags: ["lunch","dinner"], cuisineTags: [], tier: "primary" as const, source: null },
];

const profile = { age: 30, gender: "female", heightCm: 165, weightKg: 60, dietType: "vegetarian", symptoms: ["fatigue"], hemoglobin: 11, ferritin: 10, vitaminB12Level: 200, vitaminDLevel: 15, serumCalcium: 8.5, totalProtein: 5.5 };

const priorities = computeNutrientPriorities(profile);
console.log("NUTRIENTS count:", NUTRIENTS.length, "(", NUTRIENTS.join(","), ")");
console.log("B-vitamin priorities present:",
  ["vitamin_b1","vitamin_b2","vitamin_b3","vitamin_b6","vitamin_b12"].every(k => priorities.some(p => p.nutrient === k)));

const targets: Record<string, number> = {};
for (const p of priorities) targets[p.nutrient] = p.dailyTarget;

const plan = generateRecoveryPlan(mockFoods, "vegetarian", "", priorities, targets as never, 5);
console.log("Plan days:", plan.days.length);
const d0 = plan.days[0];
console.log("Day1 totals B1/B2/B3/B6/B12:",
  d0.totals.vitaminB1, d0.totals.vitaminB2, d0.totals.vitaminB3, d0.totals.vitaminB6, d0.totals.vitaminB12);

const lines = buildNutrientLines(d0.totals, targets as never);
console.log("Lines count:", lines.length);
for (const b of ["vitamin_b1","vitamin_b2","vitamin_b3","vitamin_b6","vitamin_b12"]) {
  const l = lines.find(x => x.nutrient === b);
  if (!l) { console.log("!! MISSING line for", b); continue; }
  console.log(`  ${b}: label=${l.label} unit=${l.unit} consumed=${l.consumed} target=${l.target} status=${l.status}`);
}
console.log("RUNTIME-OK");
