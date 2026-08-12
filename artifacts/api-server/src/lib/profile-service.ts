import type { ProfileRow } from "@workspace/db";
import { computeNutrientPriorities, type ProfileInput, type NutrientKey, type NutrientPriorityResult } from "./recovery-engine";
import { topFoodSourcesForNutrient, type PlannerFood } from "./meal-planner";
import { getAllFoodsForRecommendations } from "./food-lookup";

export function toProfileInput(row: ProfileRow): ProfileInput {
  return {
    age: row.age,
    gender: row.gender,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    dietType: row.dietType,
    symptoms: row.symptoms,
    hemoglobin: row.hemoglobin,
    ferritin: row.ferritin,
    vitaminB12Level: row.vitaminB12Level,
    vitaminDLevel: row.vitaminDLevel,
    serumCalcium: row.serumCalcium,
    totalProtein: row.totalProtein,
  };
}

export function getPrioritiesWithFoodSources(row: ProfileRow, foods: PlannerFood[]): NutrientPriorityResult[] {
  const priorities = computeNutrientPriorities(toProfileInput(row));
  return priorities.map((p) => ({
    ...p,
    foodSources: topFoodSourcesForNutrient(foods, p.nutrient, row.dietType, 6, row.cuisinePreference),
  }));
}

export function targetsMap(priorities: NutrientPriorityResult[]): Record<NutrientKey, number> {
  const map = {} as Record<NutrientKey, number>;
  for (const p of priorities) {
    map[p.nutrient] = p.dailyTarget;
  }
  return map;
}

export async function getPrioritiesWithFoodSourcesAsync(row: ProfileRow): Promise<NutrientPriorityResult[]> {
  const foods = await getAllFoodsForRecommendations();
  return getPrioritiesWithFoodSources(row, foods);
}
