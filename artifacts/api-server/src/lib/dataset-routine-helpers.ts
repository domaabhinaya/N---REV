import type { FoodPlateNormalized } from "./user-routine-normalizer";
import type { PlannerFood, RecoveryPlanResult } from "./meal-planner";
import type { NutrientKey, NutrientPriorityResult } from "./recovery-engine";

function uniqueNonEmpty(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

function pickPreferredMealTags(routine: FoodPlateNormalized): string[] {
  // Convert user routine text to a set of preferred tokens that may match food dataset tags.
  // We keep this conservative: only use high-signal keywords.
  const tokens: string[] = [];
  const text = [
    ...routine.breakfastItems,
    ...routine.lunchItems,
    ...routine.dinnerItems,
    ...routine.snackItems,
  ]
    .join(" ")
    .toLowerCase();

  if (/(dal|rajma|chana|chole|moong|toor)/.test(text)) tokens.push("north_indian");
  if (/(spinach|palak|methi|ragi|bajra)/.test(text)) tokens.push("south_indian");
  if (/(egg)/.test(text)) tokens.push("general");

  return uniqueNonEmpty(tokens);
}

export function buildRoutineInsights(routine: FoodPlateNormalized, priorities: NutrientPriorityResult[]) {
  const insights: string[] = [];

  const allMealsCount =
    (routine.breakfastItems.length > 0 ? 1 : 0) +
    (routine.lunchItems.length > 0 ? 1 : 0) +
    (routine.dinnerItems.length > 0 ? 1 : 0) +
    (routine.snackItems.length > 0 ? 1 : 0);

  if (allMealsCount <= 2) {
    insights.push("Your typical routine includes fewer meal sections; adding nutrient-dense foods across breakfast/lunch/dinner/snacks can improve consistency.");
  }

  // If routine lacks calcium-like foods, mention it in explanation.
  const routineText = [
    ...routine.breakfastItems,
    ...routine.lunchItems,
    ...routine.dinnerItems,
    ...routine.snackItems,
  ].join(" ").toLowerCase();

  if (!/(milk|paneer|curd|dahi|cheese)/.test(routineText)) {
    const calcium = priorities.find((p) => p.nutrient === "calcium");
    if (calcium && calcium.priority !== "low") {
      insights.push("Your usual routine doesn’t clearly include calcium-rich staples; consider plan foods like dahi/curd, paneer, or fortified dairy to support calcium targets.");
    }
  }

  if (!/(dal|rajma|chana|soya|tofu|egg|fish|chicken)/.test(routineText)) {
    const protein = priorities.find((p) => p.nutrient === "protein");
    if (protein && protein.priority !== "low") {
      insights.push("Your usual routine doesn’t clearly include protein-rich items; consider adding options such as dal/beans, tofu, eggs, or dairy to support your protein recovery target.");
    }
  }

  return insights;
}

