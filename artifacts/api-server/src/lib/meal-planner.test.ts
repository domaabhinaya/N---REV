import { test } from "node:test";
import assert from "node:assert/strict";
import type { NutrientKey } from "./recovery-engine";
import type { PlannerFood } from "./meal-planner";
import { generateRecoveryPlan, topFoodSourcesForNutrient } from "./meal-planner";

// Synthetic, cuisine-tagged fixtures so the tests do not depend on the live
// (currently Indian-only) dataset. Foods are protein-equal and same tier so the
// cuisine affinity is the deciding factor, isolating the cuisine behaviour.
// `mealTags` are left empty so foods are eligible for every meal slot and the
// rotating plan (which seeds consecutive meals at a day-offset) still surfaces
// the top-ranked food within Day 1.
const ZERO_NUTRIENTS = {
  protein: 0,
  iron: 0,
  calcium: 0,
  vitaminD: 0,
  magnesium: 0,
  vitaminA: 0,
  vitaminC: 0,
  vitaminB7: 0,
  vitaminE: 0,
  vitaminK: 0,
  vitaminB1: 0,
  vitaminB2: 0,
  vitaminB3: 0,
  vitaminB6: 0,
  vitaminB12: 0,
};

function makeFood(
  id: number,
  name: string,
  partial: Partial<typeof ZERO_NUTRIENTS> = {},
  tags: { cuisineTags?: string[]; tier?: string } = {},
): PlannerFood {
  return {
    id,
    name,
    servingSize: "1 serving",
    tier: tags.tier ?? "primary",
    dietTags: [],
    mealTags: [],
    cuisineTags: tags.cuisineTags ?? [],
    source: "test-cuisine",
    ...ZERO_NUTRIENTS,
    ...partial,
  } as unknown as PlannerFood;
}

const TARGETS: Record<NutrientKey, number> = {
  protein: 0,
  iron: 0,
  calcium: 0,
  vitamin_d: 0,
  magnesium: 0,
  vitamin_c: 0,
  vitamin_a: 0,
  vitamin_k: 0,
  vitamin_e: 0,
  vitamin_b7: 0,
  vitamin_b6: 0,
  vitamin_b1: 0,
  vitamin_b2: 0,
  vitamin_b3: 0,
  vitamin_b12: 0,
};

const INDIAN_FOOD = makeFood(1, "Idli & Sambar", { protein: 8 }, { cuisineTags: ["indian"] });
const ASIAN_FOOD = makeFood(2, "Thai Rice Noodles", { protein: 8 }, { cuisineTags: ["asian"] });
const WESTERN_FOOD = makeFood(3, "Greek Omelette", { protein: 8 }, { cuisineTags: ["western"] });
const PEANUT_CHUTNEY = makeFood(4, "Peanut Chutney", { protein: 100 }, { cuisineTags: ["indian"] });

function firstDayMeals(foods: PlannerFood[], cuisine?: string | null): string[] {
  const plan = generateRecoveryPlan(foods, "vegetarian", null, [], TARGETS, cuisine, 1);
  const day = plan.days[0];
  return [...day.breakfast, ...day.lunch, ...day.dinner, ...day.snacks].map((item) => item.name);
}

// Requirement 11: Indian → Indian recommendations.
test("Indian cuisine uses Indian foods in the recovery plan", () => {
  const names = firstDayMeals([INDIAN_FOOD, ASIAN_FOOD, WESTERN_FOOD], "Indian");
  assert.ok(names.includes("Idli & Sambar"), `expected Indian food, got: ${names.join(", ")}`);
});

// Requirement 11: Asian → Asian recommendations (never replaced by Indian).
test("Asian cuisine uses Asian foods (not replaced with Indian)", () => {
  const names = firstDayMeals([INDIAN_FOOD, ASIAN_FOOD, WESTERN_FOOD], "Asian");
  assert.ok(names.includes("Thai Rice Noodles"), `expected Asian food, got: ${names.join(", ")}`);
});

// Requirement 11: missing cuisine → Indian recommendations.
test("missing cuisine defaults to Indian generation", () => {
  assert.ok(firstDayMeals([INDIAN_FOOD, ASIAN_FOOD, WESTERN_FOOD], undefined).includes("Idli & Sambar"));
  assert.ok(firstDayMeals([INDIAN_FOOD, ASIAN_FOOD, WESTERN_FOOD], null).includes("Idli & Sambar"));
});

// Requirement 11/12: regeneration is deterministic and preserves resolved cuisine.
test("regeneration preserves the resolved cuisine deterministically", () => {
  const a = firstDayMeals([INDIAN_FOOD, ASIAN_FOOD, WESTERN_FOOD], undefined);
  const b = firstDayMeals([INDIAN_FOOD, ASIAN_FOOD, WESTERN_FOOD], undefined);
  assert.deepEqual(a, b);
  assert.ok(a.includes("Idli & Sambar"));
});

// Requirement 7/11: dietary restrictions / allergies take priority over cuisine.
test("allergies/excluded foods take priority over the cuisine preference", () => {
  const plan = generateRecoveryPlan(
    [PEANUT_CHUTNEY, INDIAN_FOOD],
    "vegetarian",
    "peanut",
    [],
    TARGETS,
    "Indian",
    1,
  );
  const day = plan.days[0];
  const names = [...day.breakfast, ...day.lunch, ...day.dinner, ...day.snacks].map((item) => item.name);
  assert.ok(!names.includes("Peanut Chutney"), "allergen-containing food must be excluded");
  assert.ok(names.includes("Idli & Sambar"), "non-allergen Indian food still used");
});

// Requirement 11: food-source ranking honours the resolved cuisine + Indian default.
test("topFoodSourcesForNutrient honours resolved cuisine and Indian default", () => {
  const foods = [INDIAN_FOOD, ASIAN_FOOD, WESTERN_FOOD];
  assert.equal(topFoodSourcesForNutrient(foods, "protein", "vegetarian", 2, "Indian")[0], "Idli & Sambar");
  assert.equal(topFoodSourcesForNutrient(foods, "protein", "vegetarian", 2, "Asian")[0], "Thai Rice Noodles");
  assert.equal(topFoodSourcesForNutrient(foods, "protein", "vegetarian", 2, undefined)![0], "Idli & Sambar");
});