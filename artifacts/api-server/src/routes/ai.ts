import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, profilesTable, labComparisonsTable } from "@workspace/db";
import { compareLabValues, type LabValues } from "../lib/lab-insights";
import {
  getAntagonists,
  getSynergies,
  getTiming,
  getFoodInteractions,
  type FoodInteraction,
} from "../lib/food-interactions";
import { getUserRoutineContext } from "../lib/user-routine-normalizer";
import { buildRoutineInsights } from "../lib/dataset-routine-helpers";
import {
  getPrioritiesWithFoodSources,
  targetsMap,
  toProfileInput,
} from "../lib/profile-service";
import { getAllFoodsForRecommendations } from "../lib/food-lookup";
import {
  generateRecoveryPlan,
  cuisineAffinity,
  type PlannerFood,
} from "../lib/meal-planner";
import {
  computeBmi,
  generatePlanExplanation,
  NUTRIENT_LABELS,
  NUTRIENT_UNITS,
  type NutrientKey,
} from "../lib/recovery-engine";
import { convertVitaminDUgToIU } from "../lib/nutrition-calculator";
import {
  classifyCuisine,
  matchesCategory,
} from "../lib/food-classifier";
import { resolveCuisine, cuisineStatement } from "../lib/cuisine";

// Lab value display metadata. Values come from the profile row and the
// historical lab_comparisons records; these constants supply the standard
// lab units so the assistant speaks the same language as the frontend
// Assessment/Report pages. Every numeric lab field stored on the profile is
// surfaced here (dynamic schema), so the assistant never fabricates a value
// and always reports unavailable fields as missing.
const LAB_LABELS: Record<string, string> = {
  hemoglobin: "Hemoglobin",
  ferritin: "Ferritin",
  vitaminB12Level: "Vitamin B12",
  vitaminDLevel: "Vitamin D",
  serumCalcium: "Serum Calcium",
  totalProtein: "Total Protein",
  rbcCount: "RBC Count",
  wbcCount: "WBC Count",
  plateletCount: "Platelets",
  hematocrit: "Hematocrit",
  mcv: "MCV",
  serumIron: "Serum Iron",
  vitaminA: "Vitamin A (lab)",
  vitaminC: "Vitamin C (lab)",
  vitaminE: "Vitamin E (lab)",
  magnesium: "Magnesium (lab)",
  phosphorus: "Phosphorus",
  sodium: "Sodium",
  fastingBloodSugar: "Fasting Blood Sugar",
  hba1c: "HbA1c",
  creatinine: "Creatinine",
  bun: "BUN",
  totalCholesterol: "Total Cholesterol",
  hdl: "HDL",
  ldl: "LDL",
  triglycerides: "Triglycerides",
  tsh: "TSH",
  alt: "ALT",
  ast: "AST",
};

const LAB_INFO: Record<string, { unit: string }> = {
  hemoglobin: { unit: "g/dL" },
  ferritin: { unit: "ng/mL" },
  vitaminB12Level: { unit: "pg/mL" },
  vitaminDLevel: { unit: "ng/mL" },
  serumCalcium: { unit: "mg/dL" },
  totalProtein: { unit: "g/dL" },
  rbcCount: { unit: "million/\u00B5L" },
  wbcCount: { unit: "\u00D710\u00B3/\u00B5L" },
  plateletCount: { unit: "\u00D710\u00B3/\u00B5L" },
  hematocrit: { unit: "%" },
  mcv: { unit: "fL" },
  serumIron: { unit: "\u00B5g/dL" },
  vitaminA: { unit: "\u00B5g/dL" },
  vitaminC: { unit: "mg/dL" },
  vitaminE: { unit: "mg/L" },
  magnesium: { unit: "mg/dL" },
  phosphorus: { unit: "mg/dL" },
  sodium: { unit: "mEq/L" },
  fastingBloodSugar: { unit: "mg/dL" },
  hba1c: { unit: "%" },
  creatinine: { unit: "mg/dL" },
  bun: { unit: "mg/dL" },
  totalCholesterol: { unit: "mg/dL" },
  hdl: { unit: "mg/dL" },
  ldl: { unit: "mg/dL" },
  triglycerides: { unit: "mg/dL" },
  tsh: { unit: "\u00B5IU/mL" },
  alt: { unit: "U/L" },
  ast: { unit: "U/L" },
};

const LAB_KEYS = Object.keys(LAB_INFO);

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// This "assistant" is deliberately dataset-grounded. There is no external LLM
// configured in this environment, so we build a deterministic answer from the
// user's REAL profile, priorities/targets, generated recovery plan, and foods
// ranked from the actual N-REV database. Every food recommendation is traced to
// the dataset; nothing is fabricated. When the available N-REV data is not
// enough to answer, the assistant says so explicitly.
// ---------------------------------------------------------------------------

const NUTRIENT_ALIASES: Array<[NutrientKey, string[]]> = [
  ["iron", ["iron", "anemia", "anaemia", "hemoglobin", "haemoglobin"]],
  ["vitamin_d", ["vitamin d", "vit d", "vitamin-d", "vitd", "d3"]],
  ["protein", ["protein", "proteins"]],
  ["calcium", ["calcium"]],
  ["magnesium", ["magnesium"]],
  ["vitamin_b12", ["b12", "vitamin b12", "cobalamin"]],
  ["vitamin_a", ["vitamin a", "vit a", "retinol", "beta carotene", "vitamin a"]],
  ["vitamin_c", ["vitamin c", "vit c", "ascorbic"]],
  ["vitamin_b7", ["biotin", "b7", "vitamin b7"]],
  ["vitamin_b1", ["vitamin b1", "thiamine", "b1"]],
  ["vitamin_b2", ["vitamin b2", "riboflavin", "b2"]],
  ["vitamin_b3", ["niacin", "vitamin b3", "b3"]],
  ["vitamin_b6", ["vitamin b6", "pyridoxine", "b6"]],
  ["vitamin_e", ["vitamin e", "vit e", "tocopherol"]],
  ["vitamin_k", ["vitamin k", "vit k"]],
];

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function detectNutrient(q: string): NutrientKey | null {
  const n = normalize(q);
  if (!n) return null;
  for (const [key, aliases] of NUTRIENT_ALIASES) {
    if (aliases.some((a) => n.includes(a))) return key;
  }
  return null;
}

const FIELD_MAP: Record<NutrientKey, keyof PlannerFood> = {
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

function effectiveValue(food: PlannerFood, nutrient: NutrientKey): number {
  const raw = (food[FIELD_MAP[nutrient]] as number) || 0;
  return nutrient === "vitamin_d" ? convertVitaminDUgToIU(raw) : raw;
}

interface RankedFood {
  name: string;
  servingSize: string;
  value: number;
  unit: string;
  tier: string;
}

// Conservative sanity ceiling (per reported serving) used ONLY in the assistant's
// food-recommendation ranking. Its purpose is to skip clearly erroneous
// data-entry outliers (e.g. a food row recording 8,930 mg of iron), not to change
// any food's real value or the dataset itself. Foods above these bounds are simply
// not *named* in AI answers; the core recovery planner is untouched.
const PLAUSIBLE_MAX: Partial<Record<NutrientKey, number>> = {
  protein: 200,
  iron: 60,
  calcium: 3000,
  vitamin_d: 5000,
  magnesium: 1500,
  vitamin_a: 20000,
  vitamin_c: 3000,
  vitamin_b12: 500,
  vitamin_b1: 100,
  vitamin_b2: 100,
  vitamin_b3: 1000,
  vitamin_b6: 100,
  vitamin_b7: 1000,
  vitamin_e: 200,
  vitamin_k: 2000,
};

// ---------------------------------------------------------------------------
// Allergy safety helpers.
// Allergy filtering is mandatory before ANY food is recommended. The profile
// stores allergies as free text; we conservatively treat each comma/semicolon
// separated token as an allergen and exclude any dataset food whose name
// contains that token. We never invent an allergy that is not stored.
// ---------------------------------------------------------------------------
function allergyTokens(allergies?: string | null): string[] {
  if (!allergies) return [];
  return allergies
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean);
}

function foodConflictsWithAllergies(food: PlannerFood, allergies?: string | null): boolean {
  if (!allergies) return false;
  const name = (food.name || "").toLowerCase();
  return allergyTokens(allergies).some((t) => t.length > 0 && name.includes(t));
}

function rankFoodsForNutrient(
  foods: PlannerFood[],
  nutrient: NutrientKey,
  dietType: string,
  cuisinePreference?: string | null,
  count = 6,
  allergies?: string | null,
  category?: string,
): RankedFood[] {
  const unit = NUTRIENT_UNITS[nutrient];
  const ceiling = PLAUSIBLE_MAX[nutrient] ?? Number.POSITIVE_INFINITY;
  // Rank foods by their recorded nutrient value, preferring the curated
  // `primary` tier of the N-REV dataset first and only filling remaining slots
  // from the supplementary `extended` tier. This keeps recommendations on the
  // app's own vetted foods while staying fully traced to the dataset.
  const scored = foods
    .filter((f) => f.dietTags.length === 0 || f.dietTags.includes(dietType))
    .filter((f) => !foodConflictsWithAllergies(f, allergies))
    .filter((f) => !category || matchesCategory(f, category))
    .map((f) => ({
      name: f.name,
      servingSize: f.servingSize,
      value: effectiveValue(f, nutrient),
      unit,
      tier: f.tier,
      aff: cuisineAffinity(f, cuisinePreference),
    }))
    .filter((f) => f.value <= ceiling);
  const byValueDesc = (a: typeof scored[number], b: typeof scored[number]): number => {
    if (b.value !== a.value) return b.value - a.value;
    return b.aff - a.aff;
  };
  const primary = scored.filter((f) => f.tier === "primary").sort(byValueDesc);
  const extended = scored.filter((f) => f.tier !== "primary").sort(byValueDesc);
  return [...primary, ...extended]
    .slice(0, count)
    .map(({ name, servingSize, value, unit, tier }) => ({ name, servingSize, value, unit, tier }));
}

function formatValue(n: NutrientKey, value: number): string {
  return `${Math.round(value * 100) / 100} ${NUTRIENT_UNITS[n]}`;
}

function priorityText(p?: { nutrient: NutrientKey; priority: string; dailyTarget: number }): string {
  if (!p) return "not prioritized";
  const label = NUTRIENT_LABELS[p.nutrient];
  return `${label} (${p.priority} priority, daily target ${p.dailyTarget} ${NUTRIENT_UNITS[p.nutrient]})`;
}

function bmiCategory(bmi: number | null): string | null {
  if (bmi === null || bmi === 0) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

interface SubstitutionResult {
  name: string;
  servingSize: string;
  why: string;
  value: number;
  unit: string;
  bestNutrient: string;
}

interface PlanFoodInfo {
  inPlan: boolean;
  summary: string;
  nutrients: string[];
}

interface AssessmentInfo {
  dietType: string;
  allergies: string | null;
  cuisinePreference: string | null;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  symptoms: string[];
}

interface BuildInput {
  question: string;
  nutrient: NutrientKey | null;
  priorities: Array<{
    nutrient: NutrientKey;
    priority: string;
    dailyTarget: number;
    reasons: string[];
    foodSources: string[];
  }>;
  planExplanation: string[];
  dayFoods: string[];
  foods: PlannerFood[];
  targets: Record<NutrientKey, number>;
  rankFoods: (n: NutrientKey) => RankedFood[];
  cuisinePreference?: string | null;
  dietType: string;
  symptoms: string[];
  assessment: AssessmentInfo;
  bmi: number | null;
  bmiCategory: string | null;
  labs: Record<string, { value: number | null; unit: string; provided: boolean }>;
  labInsights: string[];
  history: Array<{ role: string; content: string }>;
}

function highestPriorityNutrient(
  priorities: BuildInput["priorities"],
): BuildInput["priorities"][number] | undefined {
  const order = { high: 0, medium: 1, low: 2 };
  return [...priorities]
    .filter((p) => p.priority !== "low")
    .sort(
      (a, b) =>
        (order[a.priority as keyof typeof order] ?? 3) -
        (order[b.priority as keyof typeof order] ?? 3),
    )[0];
}

// ---------------------------------------------------------------------------
// routeSpecialQuestions — handles food-interaction, substitution, and
// avoidance questions grounded in the N-REV food-interaction dataset.
// Returns null so buildAnswer can fall through to the generic handlers.
// ---------------------------------------------------------------------------

const FOOD_QUESTION_TERMS: Array<{ term: string; label: string }> = [
  { term: "tea", label: "Tea" },
  { term: "coffee", label: "Coffee" },
  { term: "milk", label: "Milk" },
  { term: "spinach", label: "Spinach" },
  { term: "eggs", label: "Eggs" },
  { term: "egg", label: "Eggs" },
  { term: "chicken", label: "Chicken" },
  { term: "fish", label: "Fish" },
  { term: "almonds", label: "Almonds" },
  { term: "banana", label: "Banana" },
  { term: "broccoli", label: "Broccoli" },
  { term: "carrot", label: "Carrot" },
  { term: "orange", label: "Orange" },
  { term: "pumpkin", label: "Pumpkin" },
  { term: "curd", label: "Curd" },
  { term: "paneer", label: "Paneer" },
  { term: "dal", label: "Dal" },
  { term: "ghee", label: "Ghee" },
  { term: "soy", label: "Soy" },
  { term: "tofu", label: "Tofu" },
  { term: "yogurt", label: "Yogurt" },
  { term: "lentil", label: "Lentils" },
  { term: "beans", label: "Beans" },
];

function routeSpecialQuestions(input: BuildInput): string | null {
  const q = normalize(input.question);
  if (!q) return null;

  const matchedFood = FOOD_QUESTION_TERMS.find(({ term }) => q.includes(term));

  // "Can I drink/have/eat [food]?" — food interaction questions
  if (matchedFood && /can i|should i|drink|have|eat|consume/.test(q)) {
    return answerFoodInteraction(matchedFood.label, input);
  }

  // "Why was [food] recommended?" — food recommendation explanation
  if (matchedFood && /why.*(recommend|suggest|include|add|put together)/.test(q)) {
    return answerWhyRecommended(matchedFood.label, input);
  }

  // "Suggest an alternative to [food]" / "replace [food]" / "substitute [food]"
  if (/alternative|replace|substitute|instead of|swap/.test(q)) {
    return answerSubstitution(matchedFood?.label, input);
  }

  // "Which foods should I avoid?" / "what should I not eat?" /
  // "Which foods interfere with / reduce or block [nutrient] absorption?"
  if (/avoid|not eat|should not|cannot eat|can't eat|interfere|interferes|reduces?.*absorb|block(s|ed)?.*absorb|counteract/.test(q)) {
    return answerAvoidance(input);
  }

    return null;
}

function answerFoodInteraction(foodLabel: string, input: BuildInput): string {
  const lowerLabel = foodLabel.toLowerCase();
  const interactions = getFoodInteractions(foodLabel);
  const timing = getTiming(foodLabel);

  const prioritizedNutrients = input.priorities
    .filter((p) => p.priority !== "low")
    .map((p) => p.nutrient);

  // Filter interactions to those relevant to prioritized nutrients
  const relevantAntagonists = interactions.filter((i) => {
    const text = `${i.combination} ${i.reason}`.toLowerCase();
    return prioritizedNutrients.some(
      (n) =>
        text.includes(NUTRIENT_LABELS[n].toLowerCase()) ||
        text.includes(n.replace(/_/g, " ")),
    );
  });

  const parts: string[] = [];
  parts.push(`Regarding ${foodLabel}:`);

  if (prioritizedNutrients.length > 0) {
    const labels = prioritizedNutrients.map((n) => NUTRIENT_LABELS[n]).join(", ");
    parts.push(`Your recovery priorities include: ${labels}.`);
  }

  if (relevantAntagonists.length > 0) {
    parts.push("");
    parts.push("Interactions to be aware of (from the N-REV food-interaction dataset):");
    for (const a of relevantAntagonists) {
      parts.push(`- ${a.combination}: ${a.reason}`);
    }
  } else if (interactions.length > 0) {
    parts.push("");
    parts.push("General interaction records from the N-REV dataset:");
    for (const i of interactions.slice(0, 5)) {
      parts.push(`- ${i.combination}: ${i.reason}`);
    }
  } else {
    parts.push("");
    parts.push(`The N-REV dataset does not currently have specific interaction records mentioning ${foodLabel}.`);
  }

  if (timing.length > 0) {
    parts.push("");
    parts.push("Timing considerations:");
    for (const t of timing) {
      parts.push(`- ${t.reason}`);
    }
  }

  const inPlan = input.dayFoods.filter((f) =>
    f.toLowerCase().includes(lowerLabel),
  );
  if (inPlan.length > 0) {
    parts.push("");
    parts.push(`Note: ${foodLabel} appears in your Day 1 recovery plan: ${inPlan.join(", ")}.`);
  }

  parts.push("");
  parts.push("This is nutrition-recovery support, not medical advice.");

    return parts.filter(Boolean).join("\n");
}

function answerWhyRecommended(foodLabel: string, input: BuildInput): string {
  const lowerLabel = foodLabel.toLowerCase();
  const inPlan = input.dayFoods.filter((f) =>
    f.toLowerCase().includes(lowerLabel),
  );
  const foodInDataset = input.foods.find((f) =>
    f.name.toLowerCase().includes(lowerLabel),
  );

  // Check which prioritized nutrients this food addresses
  const addressedNutrients = input.priorities.filter((p) =>
    p.foodSources.some((s) => s.toLowerCase().includes(lowerLabel)),
  );

  const prioritizedNutrients = input.priorities
    .filter((p) => p.priority !== "low")
    .map((p) => p.nutrient);

  const parts: string[] = [];
  parts.push(`Why ${foodLabel} was included in your plan:`);

  if (inPlan.length > 0) {
    parts.push("");
    parts.push(`It appears in your Day 1 recovery plan: ${inPlan.join(", ")}.`);
  } else {
    parts.push("");
    parts.push("It is not currently in your Day 1 plan, but the N-REV dataset has records for it.");
  }

  if (foodInDataset) {
    parts.push("");
    parts.push("From the N-REV food dataset, it provides (per serving):");
    const nutrientCheck: Array<[NutrientKey, string]> = [
      ["protein", "Protein"],
      ["iron", "Iron"],
      ["calcium", "Calcium"],
      ["vitamin_d", "Vitamin D"],
      ["magnesium", "Magnesium"],
      ["vitamin_a", "Vitamin A"],
      ["vitamin_c", "Vitamin C"],
      ["vitamin_b12", "Vitamin B12"],
      ["vitamin_b6", "Vitamin B6"],
      ["vitamin_b1", "Vitamin B1"],
      ["vitamin_b2", "Vitamin B2"],
      ["vitamin_b3", "Vitamin B3"],
      ["vitamin_e", "Vitamin E"],
      ["vitamin_k", "Vitamin K"],
      ["vitamin_b7", "Vitamin B7"],
    ];
    for (const [key, label] of nutrientCheck) {
      const val = effectiveValue(foodInDataset, key);
      if (val > 0) {
        parts.push(`- ${label}: ${formatValue(key, val)}`);
      }
    }
  }

  if (addressedNutrients.length > 0) {
    parts.push("");
    parts.push("It addresses your recovery priorities:");
    for (const p of addressedNutrients) {
      parts.push(`- ${NUTRIENT_LABELS[p.nutrient]} (${p.priority} priority, daily target ${p.dailyTarget} ${NUTRIENT_UNITS[p.nutrient]})`);
    }
  }

  if (prioritizedNutrients.length > 0) {
    const synergies = getSynergies(prioritizedNutrients[0]);
    const relevantSynergies = synergies.filter((s) =>
      s.combination.toLowerCase().includes(lowerLabel),
    );
    if (relevantSynergies.length > 0) {
      parts.push("");
      parts.push("Synergistic pairings from the N-REV dataset:");
      for (const s of relevantSynergies) {
        parts.push(`- ${s.combination}: ${s.reason}`);
      }
    }
  }

  parts.push("");
  parts.push("This is nutrition-recovery support, not medical advice.");

    return parts.filter(Boolean).join("\n");
}

function answerSubstitution(foodLabel: string | undefined, input: BuildInput): string {
  if (!foodLabel) {
    return "To suggest an alternative, tell me which food you'd like to replace (e.g., 'eggs', 'milk', 'chicken'). The N-REV dataset has many options depending on your diet type and nutrient priorities.";
  }

  const lowerLabel = foodLabel.toLowerCase();

  // Find alternative foods from the dataset
  const alternatives: SubstitutionResult[] = [];
  const topNutrient = highestPriorityNutrient(input.priorities);

  if (topNutrient) {
    const ranked = input.rankFoods(topNutrient.nutrient);
    for (const f of ranked) {
      if (f.name.toLowerCase().includes(lowerLabel)) continue;
      alternatives.push({
        name: f.name,
        servingSize: f.servingSize,
        why: `${NUTRIENT_LABELS[topNutrient.nutrient]} (${f.value} ${f.unit})`,
        value: f.value,
        unit: f.unit,
        bestNutrient: NUTRIENT_LABELS[topNutrient.nutrient],
      });
    }
  }

  // Also find foods matching the diet type that have good nutrient content
  if (alternatives.length < 5) {
    const fallbackNutrient = topNutrient?.nutrient ?? "protein";
    const dietMatches = input.foods
      .filter((f) => f.dietTags.length === 0 || f.dietTags.includes(input.dietType))
      .filter((f) => !input.assessment.allergies || !f.name.toLowerCase().includes(input.assessment.allergies.toLowerCase()))
      .filter((f) => !f.name.toLowerCase().includes(lowerLabel))
      .filter((f) => f.tier === "primary")
      .slice(0, 5 - alternatives.length);

    for (const f of dietMatches) {
      const val = effectiveValue(f, fallbackNutrient);
      if (val > 0) {
        alternatives.push({
          name: f.name,
          servingSize: f.servingSize,
          why: `${NUTRIENT_LABELS[fallbackNutrient]} (${formatValue(fallbackNutrient, val)})`,
          value: val,
          unit: NUTRIENT_UNITS[fallbackNutrient],
          bestNutrient: NUTRIENT_LABELS[fallbackNutrient],
        });
      }
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  const unique = alternatives.filter((a) => {
    if (seen.has(a.name)) return false;
    seen.add(a.name);
    return true;
  });

  const parts: string[] = [];
  parts.push(`Alternatives to ${foodLabel} from the N-REV dataset:`);

  if (unique.length > 0) {
    parts.push("");
    for (const alt of unique.slice(0, 5)) {
      parts.push(`- ${alt.name} (${alt.servingSize}): strong in ${alt.why}`);
    }
  } else {
    parts.push("");
    parts.push(`No direct alternatives found in the N-REV dataset for ${foodLabel}.`);
  }

  const dietLabel = input.dietType.replace(/_/g, " ");
  if (input.dietType === "vegan") {
    parts.push("");
    parts.push("For your vegan diet, plant-based protein sources like legumes, tofu, and fortified foods are recommended.");
  } else if (input.dietType === "vegetarian") {
    parts.push("");
    parts.push("For your vegetarian diet, dairy and plant proteins can provide complete amino acids.");
  } else {
    parts.push("");
    parts.push(`For your ${dietLabel} diet, these alternatives maintain compatible nutrient profiles.`);
  }

  parts.push("");
  parts.push("This is nutrition-recovery support, not medical advice.");

  return parts.filter(Boolean).join("\n");
}

function answerAvoidance(input: BuildInput): string {
  // If a specific nutrient was named, focus on its antagonists only; otherwise
  // cover every non-low priority nutrient.
  const asked = input.nutrient
    ? input.priorities.find((p) => p.nutrient === input.nutrient)
    : undefined;
  const prioritizedNutrients = asked
    ? [asked]
    : input.priorities.filter((p) => p.priority !== "low");

  const parts: string[] = [];
  parts.push("Based on your N-REV assessment, here are foods to be mindful of:");

  if (prioritizedNutrients.length > 0) {
    parts.push("");
    for (const p of prioritizedNutrients) {
      const antagonists = getAntagonists(p.nutrient);
      if (antagonists.length > 0) {
        parts.push(`**${NUTRIENT_LABELS[p.nutrient]} (${p.priority} priority):**`);
        for (const a of antagonists.slice(0, 8)) {
          parts.push(`- ${a.reason}`);
        }
      }
    }
  }

  if (input.assessment.allergies) {
    parts.push("");
    parts.push(`**Allergies:** Avoid foods containing ${input.assessment.allergies}.`);
  }

  const dietLabel = input.assessment.dietType.replace(/_/g, " ");
  parts.push("");
  parts.push(`**${dietLabel} diet:** Your meal plan excludes foods that don't align with this diet.`);

  parts.push("");
  parts.push("**General guidance from the N-REV dataset:**");
  parts.push("- Limit processed foods high in sugar (interferes with nutrient absorption)");
  parts.push("- Avoid alcohol (impairs B12 and magnesium absorption)");
  parts.push("- Reduce high-sodium foods (increases calcium excretion)");

  parts.push("");
  parts.push("This is nutrition-recovery support, not medical advice.");

  return parts.filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Category, lab, BMI, plan-mapping, diet/allergy-suitability, and follow-up
// handlers. These cover the remaining question surface so the assistant answers
// profile- and dataset-grounded questions without restricting the user to a
// small hard-coded intent list. Everything reuses the same ranking, diet,
// allergy, and cuisine helpers defined above.
// ---------------------------------------------------------------------------

const CATEGORY_TERMS: Array<{ cat: string; terms: string[] }> = [
  { cat: "fruits", terms: ["fruit", "fruits"] },
  { cat: "vegetables", terms: ["vegetable", "vegetables", "veggie", "veggies"] },
  { cat: "snacks", terms: ["snack", "snacks"] },
  { cat: "pulses", terms: ["pulse", "pulses", "legume", "legumes", "dal", "dals", "lentil", "lentils", "bean", "beans", "chickpea", "chickpeas"] },
  { cat: "grains", terms: ["grain", "grains", "cereal", "rice", "wheat", "millet", "millets", "roti", "chapati", "bread", "oats", "quinoa"] },
  { cat: "dairy", terms: ["dairy", "milk", "curd", "yogurt", "yoghurt", "paneer", "ghee", "cheese", "buttermilk"] },
  { cat: "nuts", terms: ["nut", "nuts", "almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "peanut", "peanuts", "pistachio", "pistachios"] },
  { cat: "seeds", terms: ["seed", "seeds", "flax", "chia", "sesame", "sunflower seed", "pumpkin seed", "sabja"] },
  { cat: "beverages", terms: ["beverage", "beverages", "drink", "drinks", "juice", "smoothie", "milkshake", "buttermilk"] },
];

function detectCategory(q: string): string | null {
  const n = normalize(q);
  // Exact word match (normalize keeps words space-separated) so that broad
  // terms like "nut" never match inside "nutrients" or "nutrition". The only
  // multi-word terms are matched as contiguous phrases.
  const words = new Set(n.split(" ").filter(Boolean));
  for (const c of CATEGORY_TERMS) {
    for (const term of c.terms) {
      const parts = term.split(" ");
      if (parts.length === 1) {
        if (words.has(term)) return c.cat;
      } else if (n.includes(term)) {
        return c.cat;
      }
    }
  }
  return null;
}

// Follow-up support: "what should I eat for it?" / "what about it?" resolve an
// antecedent nutrient or food from the most recent prior user message, so the
// user never has to repeat the context. Returns null when the question is not
// clearly a follow-up.
function resolveFollowUpNutrient(
  q: string,
  history: Array<{ role: string; content: string }>,
): NutrientKey | null {
  const n = normalize(q);
  const ambiguous =
    /(for it|of it|on it|with it|about it|that nutrient|the one|which one|for that|that one|my biggest|main concern|top concern)/.test(
      n,
    );
  if (!ambiguous) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    const d = detectNutrient(m.content);
    if (d) return d;
  }
  return null;
}

function resolveFollowUpFood(
  history: Array<{ role: string; content: string }>,
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    const q = normalize(m.content);
    const matched = FOOD_QUESTION_TERMS.find(({ term }) => q.includes(term));
    if (matched) return matched.label;
  }
  return null;
}

function answerLabs(input: BuildInput): string {
  const entries = Object.entries(input.labs);
  const provided = entries.filter(([, l]) => l.provided);
  const missing = entries.filter(([, l]) => !l.provided);
  const parts: string[] = ["Here are your recorded lab values (from your profile):"];
  if (provided.length === 0) {
    parts.push("No lab values are currently recorded for this profile.");
  } else {
    parts.push("");
    for (const [key, l] of provided) {
      const label = LAB_LABELS[key] ?? key;
      parts.push(`- ${label}: ${l.value} ${l.unit}`);
    }
  }
  if (missing.length > 0) {
    parts.push("");
    parts.push("Not currently recorded for you, so I can't report these:");
    for (const [key] of missing) {
      parts.push(`- ${LAB_LABELS[key] ?? key}`);
    }
  }
  if (input.labInsights.length > 0) {
    parts.push("");
    parts.push("Trend notes from your recorded lab history:");
    for (const insight of input.labInsights) {
      parts.push(`- ${insight}`);
    }
  }
  parts.push("");
  parts.push("I report only the values you have on record and never invent a lab result. Lab values are for tracking and discussion with your clinician — not a diagnosis.");
  return parts.filter(Boolean).join("\n");
}

function answerBmi(input: BuildInput): string {
  if (input.bmi === null || input.bmi === 0) {
    return "I don't have height and weight on record for this profile, so I can't calculate your BMI. Add them in the Assessment and ask again.";
  }
  const parts: string[] = [];
  parts.push(`Your BMI is ${Math.round(input.bmi * 10) / 10} (${input.bmiCategory ?? "category not classified"}).`);
  parts.push("");
  parts.push("This is calculated from your recorded height and weight only — it is a screening metric, not a diagnosis.");
  return parts.join("\n");
}

function answerPrioritySummary(input: BuildInput): string {
  const active = input.priorities.filter((p) => p.priority !== "low");
  if (active.length === 0) {
    return "I don't have prioritized recovery nutrients for this profile yet. Complete the Assessment (with your symptoms and any lab values) to generate priorities.";
  }
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...active].sort(
    (a, b) =>
      (order[a.priority] ?? 3) - (order[b.priority] ?? 3),
  );
  const parts: string[] = ["Based on your N-REV assessment, these are your recovery priority nutrients:"];
  parts.push("");
  for (const p of sorted) {
    parts.push(`- ${priorityText(p)}`);
    if (p.reasons && p.reasons.length) {
      for (const r of p.reasons.slice(0, 3)) {
        parts.push(`   · ${r}`);
      }
    }
  }
  parts.push("");
  parts.push("Priorities are derived from your symptoms, diet type, and recorded lab values — not a diagnosis.");
  return parts.filter(Boolean).join("\n");
}

function answerPlanFoodsForNutrient(input: BuildInput): string {
  const top = highestPriorityNutrient(input.priorities);
  const nutrient = input.nutrient ?? top?.nutrient;
  if (!nutrient) {
    return "Tell me which nutrient or deficiency you'd like me to map to your plan (e.g. 'which foods help my iron?').";
  }
  const ranked = input.rankFoods(nutrient);
  const rankNames = new Set(ranked.map((r) => r.name));
  const inPlan = input.dayFoods.filter((name) => rankNames.has(name));
  const label = NUTRIENT_LABELS[nutrient];
  const parts: string[] = [];
  parts.push(
    top
      ? `Your main recovery focus is ${label} (${top.priority} priority).`
      : `You asked about ${label}.`,
  );
  parts.push("");
  if (inPlan.length === 0) {
    parts.push("None of your Day 1 plan foods are currently ranked for this nutrient. I can only report foods traced to the dataset.");
  } else {
    parts.push("From your Day 1 recovery plan, these foods support this nutrient:");
    for (const name of inPlan) {
      parts.push(`- ${name}`);
    }
  }
  parts.push("");
  parts.push(`For reference, here are the top dataset foods for ${label} (matched to your diet and allergies):`);
  for (const r of ranked.slice(0, 5)) {
    parts.push(`- ${r.name} (${r.servingSize}) — ${formatValue(nutrient, r.value)}`);
  }
  parts.push("");
  parts.push("This is nutrition-recovery support, not medical advice.");
  return parts.filter(Boolean).join("\n");
}

function answerCategory(category: string, input: BuildInput): string {
  const top = highestPriorityNutrient(input.priorities);
  const nutrient = input.nutrient ?? top?.nutrient ?? "protein";
  const ranked = rankFoodsForNutrient(
    input.foods,
    nutrient,
    input.dietType,
    input.cuisinePreference,
    6,
    input.assessment.allergies ?? undefined,
    category,
  );
  const catLabel = category.replace(/_/g, " ");
  const parts: string[] = [];
  parts.push(
    top
      ? `Good ${catLabel} for you from the N-REV dataset, matched to your top priority (${NUTRIENT_LABELS[nutrient]}, ${top.priority} priority):`
      : `Good ${catLabel} from the N-REV dataset, matched to your diet and allergies:`,
  );
  parts.push("");
  if (ranked.length === 0) {
    parts.push(`The N-REV dataset has no ${catLabel} that match your diet and allergy profile for this nutrient.`);
  } else {
    for (let i = 0; i < ranked.length; i++) {
      const f = ranked[i];
      parts.push(`${i + 1}. ${f.name} (${f.servingSize}) — ${formatValue(nutrient, f.value)}`);
    }
  }
  if (input.cuisinePreference) {
    parts.push("");
    parts.push(cuisineStatement(resolveCuisine(input.cuisinePreference)));
  }
  if (input.assessment.allergies) {
    parts.push("");
    parts.push(`Foods that conflict with your recorded allergies (${input.assessment.allergies}) were excluded.`);
  }
  parts.push("");
  parts.push("This is nutrition-recovery support, not medical advice.");
  return parts.filter(Boolean).join("\n");
}

function answerDietAllergy(input: BuildInput): string {
  const matchedFood = FOOD_QUESTION_TERMS.find(({ term }) =>
    normalize(input.question).includes(term),
  );
  if (!matchedFood) {
    return "Tell me which specific food you'd like me to check (for example 'is paneer okay for me?'), and I'll check it against your diet type and allergies.";
  }
  const foodInDataset = input.foods.find((f) =>
    f.name.toLowerCase().includes(matchedFood.term),
  );
  const name = foodInDataset ? foodInDataset.name : matchedFood.label;
  const parts: string[] = [`Checking "${name}" for you:`];
  parts.push("");
  const dietLabel = input.dietType.replace(/_/g, " ");
  if (foodInDataset) {
    const dietOk =
      foodInDataset.dietTags.length === 0 ||
      foodInDataset.dietTags.includes(input.dietType);
    parts.push(
      dietOk
        ? `- Diet: compatible with your ${dietLabel} diet.`
        : `- Diet: NOT compatible with your ${dietLabel} diet, so I would avoid it.`,
    );
  } else {
    parts.push(`- Diet: I couldn't find "${matchedFood.term}" in the N-REV dataset, so I can't confirm its diet compatibility.`);
  }
  const conflicts = foodConflictsWithAllergies(
    foodInDataset ?? ({ name } as PlannerFood),
    input.assessment.allergies,
  );
  if (input.assessment.allergies) {
    parts.push(
      conflicts
        ? `- Allergies: conflicts with your recorded allergies (${input.assessment.allergies}) — I would NOT recommend it.`
        : `- Allergies: no conflict found with your recorded allergies (${input.assessment.allergies}).`,
    );
  } else {
    parts.push("- Allergies: you have no allergies recorded, so no allergy conflict applies.");
  }
  if (conflicts) {
    parts.push("");
    parts.push("Because of the allergy conflict, I'm not recommending this food.");
  }
  parts.push("");
  parts.push("This is nutrition-recovery support, not medical advice.");
  return parts.filter(Boolean).join("\n");
}

function buildAnswer(input: BuildInput): string {
  const q = normalize(input.question);
  const cuisine = input.cuisinePreference?.toLowerCase().trim();
  const special = routeSpecialQuestions(input);
  if (special !== null) return special;

  // 0) Lab-results and BMI questions are fully profile-grounded.
  if (/lab|blood test|bloodwork|test results|my results/.test(q)) {
    return answerLabs(input);
  }
  if (/bmi|body mass/.test(q)) {
    return answerBmi(input);
  }

  // 1) "Today" / "what should I eat" → use the actual Day 1 plan.
  if (/today|meal plan|day 1|my plan/.test(q) || /^what should i eat$/.test(q)) {
    if (input.dayFoods.length === 0) {
      return "I don't have a generated recovery plan for you yet. Complete the Assessment to generate one, then I can walk you through today's foods.";
    }
    const list = input.dayFoods.map((f) => `- ${f}`).join("\n");
    const top = highestPriorityNutrient(input.priorities);
    return [
      "Here is today's (Day 1) recovery plan from your generated meal plan:",
      "",
      list,
      "",
      `Your key recovery focus is ${top ? priorityText(top) : "balanced nutrition"}.`,
      cuisine ? cuisineStatement(resolveCuisine(input.cuisinePreference)) : "",
      "",
      "This is nutrition-recovery support, not medical advice.",
    ].filter(Boolean).join("\n");
  }

  // 2) "Why this plan / why was this recommended" → use real explanations.
  if (/why.*plan|why.*recommend|why this plan/.test(q)) {
    if (input.planExplanation.length === 0) return "I don't have plan explanations available for this profile yet.";
    return [
      "Your recovery plan was put together for these reasons:",
      "",
      ...input.planExplanation.map((e) => `- ${e}`),
      "",
      "This reflects your assessment inputs (symptoms, diet type, and any lab values you provided). It is not a diagnosis.",
    ].join("\n");
  }

  // 3) Plan-mapping: "which foods in my plan help [nutrient/deficiency]?"
  if (/in my.*plan|in your plan|from my plan/.test(q) && /(help|deficien|priorit|focus|good for)/.test(q)) {
    return answerPlanFoodsForNutrient(input);
  }

  // 3b) Priority-nutrient summary: "which nutrients are lowest for me?",
  //     "what am I deficient in?", "which nutrients should I focus on?".
  if (!input.nutrient && /(nutrient|vitamin|mineral|deficien|lowest|missing|low in|should i focus|need most|improve first)/.test(q)) {
    return answerPrioritySummary(input);
  }

  // 3b) Food-category questions (fruits, vegetables, snacks, pulses, etc.)
  const category = detectCategory(q);
  if (category) {
    return answerCategory(category, input);
  }

  // 3c) Nutrient-focused question (iron, vitamin D, etc.), with follow-up
  //     support: "what should I eat for it?" resolves the antecedent nutrient
  //     from the previous user message in history.
  let focus = input.nutrient ?? resolveFollowUpNutrient(q, input.history);
  let focusPriority = focus ? input.priorities.find((p) => p.nutrient === focus) : undefined;

  // "highest in the nutrient I am missing" / "top foods for my deficiency"
  // → resolve to the user's top-priority nutrient.
  if (/highest.*nutrient|nutrient i.?m missing|missing.*highest|top.*nutrient|for.*deficienc/.test(q)) {
    const top = highestPriorityNutrient(input.priorities);
    focus = top?.nutrient ?? focus;
    focusPriority = top ?? focusPriority;
  }

  // If the question is still an unresolved nutrient follow-up ("what should I
  // eat for it?") and history had no explicit nutrient name, default to the
  // top-priority nutrient so the answer stays relevant and profile-grounded.
  if (!focus && /(for it|of it|with it|about it|that nutrient)/.test(q)) {
    const top = highestPriorityNutrient(input.priorities);
    focus = top?.nutrient ?? focus;
    focusPriority = top ?? focusPriority;
  }

  if (focus && focusPriority) {
    const statusLine = `${focusPriority.priority} priority (daily target ${focusPriority.dailyTarget} ${NUTRIENT_UNITS[focus]})`;
    const topFoods = input.rankFoods(focus);
    const foodLines =
      topFoods.length > 0
        ? topFoods.map((f, i) => `${i + 1}. ${f.name} (${f.servingSize}) — ${formatValue(focus, f.value)}`).join("\n")
        : "No foods with recorded values for this nutrient were found in the N-REV dataset.";
    const inPlan = input.dayFoods.filter((name) => topFoods.some((f) => f.name === name));
    return [
      `Based on your N-REV profile, ${NUTRIENT_LABELS[focus]} is currently ${statusLine}.`,
      "",
      "Foods highest in this nutrient from the N-REV dataset (ranked by content, matched to your diet):",
      "",
      foodLines,
      cuisine
        ? `\nI checked these against your "${input.cuisinePreference}" food preference where the dataset supports it.`
        : "",
      inPlan.length
        ? `\nOf these, the following already appear in your generated recovery plan: ${inPlan.join(", ")}.`
        : "",
      "",
      "Recommendation focus is based on your recorded assessment and dataset foods only — not a medical diagnosis.",
    ].filter(Boolean).join("\n");
  }

  if (focus && !focusPriority) {
    return [
      `You asked about ${NUTRIENT_LABELS[focus]}, but your N-REV assessment data does not currently prioritize it, and I found no reliable dataset foods ranked for it.`,
      "I can only give dataset-grounded guidance from your actual profile; the available data is insufficient to answer this more specifically.",
      "",
      "This is not medical advice.",
    ].join("\n");
  }

  // 3d) Diet/allergy suitability: "is this food suitable / safe for me?"
  if (/(suit|okay for|ok for|allowed|compatible|allergy|safe)/.test(q)) {
    return answerDietAllergy(input);
  }

  // 3e) Follow-up food reference: "what about it?" resolves a food from history.
  if (!input.nutrient && /(about it|about that|with it|for it|that one|on it)/.test(q)) {
    const food = resolveFollowUpFood(input.history);
    if (food) return answerFoodInteraction(food, input);
  }

  // 4) General fallback using the top (highest-priority) nutrient + dataset foods.
  const topNutrient = highestPriorityNutrient(input.priorities);
  if (topNutrient) {
    const foods = input.rankFoods(topNutrient.nutrient);
    const lines =
      foods.length > 0
        ? foods.map((f, i) => `${i + 1}. ${f.name} (${f.servingSize}) — ${formatValue(topNutrient.nutrient, f.value)}`).join("\n")
        : "No dataset foods available.";
    return [
      `I couldn't match a specific nutrient to your question, but your top recovery priority is ${priorityText(topNutrient)}.`,
      "",
      "Foods from the N-REV dataset richest in that nutrient:",
      "",
      lines,
      "",
      "If you tell me exactly which nutrient or food you'd like (e.g. 'iron', 'vitamin D', or a specific food), I can give a more specific, dataset-grounded answer.",
    ].join("\n");
  }

  return (
    "I don't have enough N-REV data about that to give a grounded answer. " +
    "Try asking about a specific nutrient (iron, vitamin D, protein, calcium), a food, " +
    "or today's recovery plan. I only answer from your profile and the N-REV food dataset, " +
    "so I won't guess when data is missing. This is not medical advice."
  );
}

router.post("/assistant/chat", async (req, res): Promise<void> => {
  const profileId = Number(req.body?.profileId);
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const history: Array<{ role: string; content: string }> = Array.isArray(req.body?.history)
    ? (req.body.history as Array<{ role: string; content: string }>).filter(
        (m) => m && typeof m.content === "string",
      )
    : [];
  if (!Number.isInteger(profileId) || profileId <= 0) {
    res.status(400).json({ error: "A valid profileId is required" });
    return;
  }
  if (!question) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const [row] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!row) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // AUTHORITATIVE cuisine rule (backend-enforced): missing/invalid resolves to "Indian".
  const cuisine = resolveCuisine(row.cuisinePreference);

  const foods = await getAllFoodsForRecommendations();
  const priorities = getPrioritiesWithFoodSources(row, foods);
  const targets = targetsMap(priorities);
    const profileInput = toProfileInput(row);
  const routineCtx = getUserRoutineContext(row);
  const routineInsights = buildRoutineInsights(routineCtx.normalized, priorities);
  const plan = generateRecoveryPlan(
    foods,
    row.dietType,
    row.allergies,
    priorities,
    targets,
    cuisine,
    row.recoveryDuration ?? 30,
  );
  const planExplanation = generatePlanExplanation(
    profileInput,
    priorities,
    routineInsights,
  );

  const day0 = plan.days[0];
  const dayFoods = day0
    ? [...day0.breakfast, ...day0.lunch, ...day0.dinner, ...day0.snacks].map((i) => i.name)
    : [];

  const nutrient = detectNutrient(question);
  const rankFoods = (n: NutrientKey): RankedFood[] =>
    rankFoodsForNutrient(
      foods,
      n,
      row.dietType,
      cuisine,
      6,
      row.allergies ?? undefined,
    );
  const relevantFoodCandidates = nutrient ? rankFoods(nutrient) : [];

  // Labs: current profile values + historical comparison from labComparisons.
  const LAB_KEYS = ["hemoglobin", "ferritin", "vitaminB12Level", "vitaminDLevel", "serumCalcium", "totalProtein"] as const;
  const labs: BuildInput["labs"] = {};
  for (const k of LAB_KEYS) {
    const v: unknown = (row as Record<string, unknown>)[k];
    labs[k] = {
      value: typeof v === "number" ? v : null,
      unit: LAB_INFO[k].unit,
      provided: v != null,
    };
  }
  const labRows = await db
    .select()
    .from(labComparisonsTable)
    .where(eq(labComparisonsTable.profileId, profileId))
    .orderBy(desc(labComparisonsTable.recordedAt));
  const baseline: LabValues | null = labRows.length
    ? {
        hemoglobin: labRows[labRows.length - 1].hemoglobin,
        ferritin: labRows[labRows.length - 1].ferritin,
        vitaminB12Level: labRows[labRows.length - 1].vitaminB12Level,
        vitaminDLevel: labRows[labRows.length - 1].vitaminDLevel,
        serumCalcium: labRows[labRows.length - 1].serumCalcium,
        totalProtein: labRows[labRows.length - 1].totalProtein,
      }
    : null;
  const current: LabValues = {
    hemoglobin: row.hemoglobin,
    ferritin: row.ferritin,
    vitaminB12Level: row.vitaminB12Level,
    vitaminDLevel: row.vitaminDLevel,
    serumCalcium: row.serumCalcium,
    totalProtein: row.totalProtein,
  };
  const labInsights = compareLabValues(baseline, current);
  const bmi = computeBmi(row.heightCm, row.weightKg);
  const bmiCategoryVal = bmiCategory(bmi);

  const assessment: AssessmentInfo = {
    dietType: row.dietType,
    allergies: row.allergies,
    cuisinePreference: cuisine,
    age: row.age,
    gender: row.gender,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    symptoms: row.symptoms ?? [],
  };

  const buildInput: BuildInput = {
    question,
    nutrient,
    priorities: priorities as BuildInput["priorities"],
    planExplanation,
    dayFoods,
    foods,
    targets,
    rankFoods,
    cuisinePreference: cuisine,
    dietType: row.dietType,
    symptoms: row.symptoms ?? [],
    assessment,
    bmi,
    bmiCategory: bmiCategoryVal,
    labs,
    labInsights,
    history,
  };

  const answer = buildAnswer(buildInput);

  res.json({
    answer,
    context: {
      profile: {
        id: row.id,
        age: row.age,
        gender: row.gender,
        dietType: row.dietType,
        cuisinePreference: cuisine,
        allergies: row.allergies,
      },
      nutrientStatus: priorities.map((p) => ({
        nutrient: p.nutrient,
        label: NUTRIENT_LABELS[p.nutrient],
        priority: p.priority,
        dailyTarget: p.dailyTarget,
        unit: NUTRIENT_UNITS[p.nutrient],
      })),
      planExplanation,
      dayOneFoods: dayFoods,
      relevantFoodCandidates: relevantFoodCandidates,
      bmi,
      bmiCategory: bmiCategoryVal,
      assessment,
      labValues: labs,
      labInsights,
      routineInsights,
      historyLength: history.length,
      labHistoryCount: labRows.length,
    },
  });
});

export default router;

