import { NUTRIENTS, NUTRIENT_LABELS, NUTRIENT_UNITS, type NutrientKey } from "./recovery-engine";

export interface FoodNutrients {
  protein: number;
  iron: number;
  calcium: number;
  vitaminD: number;
  magnesium: number;
  vitaminA: number;
  vitaminC: number;
  vitaminB7: number;
  vitaminE: number;
  vitaminK: number;
  vitaminB1: number;
  vitaminB2: number;
  vitaminB3: number;
  vitaminB6: number;
  vitaminB12: number;
}

export interface NutrientLine {
  nutrient: NutrientKey;
  label: string;
  unit: string;
  consumed: number;
  target: number;
  percent: number;
  status: "on_target" | "needs_improvement";
}

const FIELD_MAP: Record<NutrientKey, keyof FoodNutrients> = {
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
  vitamin_b1: "vitaminB1",
  vitamin_b2: "vitaminB2",
  vitamin_b3: "vitaminB3",
  vitamin_b6: "vitaminB6",
  vitamin_b12: "vitaminB12",
};

// Dataset stores Vitamin D in µg. Application targets are in IU.
// Convert exactly once at the calculation boundary.
export const VITAMIN_D_UG_TO_IU = 40;
export function convertVitaminDUgToIU(ug: number): number {
  return ug * VITAMIN_D_UG_TO_IU;
}

// Accept any object with the required nutrient fields (nullable from DB)
export function sumNutrients(items: { food: {
  protein: number | null | undefined;
  iron: number | null | undefined;
  calcium: number | null | undefined;
  vitaminD: number | null | undefined;
  magnesium?: number | null | undefined;
  vitaminA?: number | null | undefined;
  vitaminC?: number | null | undefined;
  vitaminB7?: number | null | undefined;
  vitaminE?: number | null | undefined;
  vitaminK?: number | null | undefined;
  vitaminB1?: number | null | undefined;
  vitaminB2?: number | null | undefined;
  vitaminB3?: number | null | undefined;
  vitaminB6?: number | null | undefined;
  vitaminB12?: number | null | undefined;
}; servings: number }[]): FoodNutrients {
  const totals: FoodNutrients = {
    protein: 0, iron: 0, calcium: 0, vitaminD: 0,
    magnesium: 0, vitaminA: 0, vitaminC: 0, vitaminB7: 0,
    vitaminE: 0, vitaminK: 0, vitaminB1: 0, vitaminB2: 0, vitaminB3: 0, vitaminB6: 0, vitaminB12: 0,
  };
  for (const { food, servings } of items) {
    totals.protein += (food.protein || 0) * servings;
    totals.iron += (food.iron || 0) * servings;
    totals.calcium += (food.calcium || 0) * servings;
    // Convert food Vitamin D from µg to IU exactly once at the calculation boundary
    totals.vitaminD += convertVitaminDUgToIU((food.vitaminD || 0) * servings);
    totals.magnesium += (food.magnesium || 0) * servings;
    totals.vitaminA += (food.vitaminA || 0) * servings;
    totals.vitaminC += (food.vitaminC || 0) * servings;
    totals.vitaminB7 += (food.vitaminB7 || 0) * servings;
    totals.vitaminE += (food.vitaminE || 0) * servings;
    totals.vitaminK += (food.vitaminK || 0) * servings;
    totals.vitaminB1 += (food.vitaminB1 || 0) * servings;
    totals.vitaminB2 += (food.vitaminB2 || 0) * servings;
    totals.vitaminB3 += (food.vitaminB3 || 0) * servings;
    totals.vitaminB6 += (food.vitaminB6 || 0) * servings;
    totals.vitaminB12 += (food.vitaminB12 || 0) * servings;
  }
  return totals;
}

export function buildNutrientLines(
  consumed: FoodNutrients,
  targets: Record<NutrientKey, number>,
): NutrientLine[] {
  return NUTRIENTS.map((nutrient) => {
    const target = targets[nutrient] || 1;
    const consumedValue = Math.round((consumed[FIELD_MAP[nutrient]] || 0) * 10) / 10;
    const percent = Math.round((consumedValue / target) * 100);
    return {
      nutrient,
      label: NUTRIENT_LABELS[nutrient],
      unit: NUTRIENT_UNITS[nutrient],
      consumed: consumedValue,
      target,
      percent,
      status: percent >= 90 ? "on_target" : "needs_improvement",
    };
  });
}
