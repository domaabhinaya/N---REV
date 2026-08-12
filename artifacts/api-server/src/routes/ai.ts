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

// Lab value display metadata. Values come from the profile row and the
// historical lab_comparisons records; these constants supply the standard
// lab units so the assistant speaks the same language as the frontend
// Assessment/Report pages.
const LAB_INFO: Record<string, { unit: string }> = {
  hemoglobin: { unit: "g/dL" },
  ferritin: { unit: "ng/mL" },
  vitaminB12Level: { unit: "pg/mL" },
  vitaminDLevel: { unit: "ng/mL" },
  serumCalcium: { unit: "mg/dL" },
  totalProtein: { unit: "g/dL" },
};

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

function rankFoodsForNutrient(
  foods: PlannerFood[],
  nutrient: NutrientKey,
  dietType: string,
  cuisinePreference?: string | null,
  count = 6,
): RankedFood[] {
  const unit = NUTRIENT_UNITS[nutrient];
  const ceiling = PLAUSIBLE_MAX[nutrient] ?? Number.POSITIVE_INFINITY;
  // Rank foods by their recorded nutrient value, preferring the curated
  // `primary` tier of the N-REV dataset first and only filling remaining slots
  // from the supplementary `extended` tier. This keeps recommendations on the
  // app's own vetted foods while staying fully traced to the dataset.
  const scored = foods
    .filter((f) => f.dietTags.length === 0 || f.dietTags.includes(dietType))
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

  // "Which foods should I avoid?" / "what should I not eat?"
  if (/avoid|not eat|should not|cannot eat|can't eat/.test(q)) {
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
  const prioritizedNutrients = input.priorities.filter((p) => p.priority !== "low");

  const parts: string[] = [];
  parts.push("Based on your N-REV assessment, here are foods to be mindful of:");

  if (prioritizedNutrients.length > 0) {
    parts.push("");
    for (const p of prioritizedNutrients) {
      const antagonists = getAntagonists(p.nutrient);
      if (antagonists.length > 0) {
        parts.push(`**${NUTRIENT_LABELS[p.nutrient]} (${p.priority} priority):**`);
        for (const a of antagonists) {
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

function buildAnswer(input: BuildInput): string {
  const q = normalize(input.question);
  const cuisine = input.cuisinePreference?.toLowerCase().trim();
  const special = routeSpecialQuestions(input);
  if (special !== null) return special;

  // 1) "Today" / "what should I eat" → use the actual Day 1 plan.
  if (/today|what should i eat|meal plan|day 1|my plan/.test(q)) {
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
      cuisine ? `Food selection was biased toward your "${input.cuisinePreference}" preference where the dataset supports it.` : "",
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

  // 3) Nutrient-focused question (iron, vitamin D, etc.)
  let focus = input.nutrient;
  let focusPriority = focus ? input.priorities.find((p) => p.nutrient === focus) : undefined;

  // "highest in the nutrient I am missing" / "top foods for my deficiency"
  // → resolve to the user's top-priority nutrient.
  if (/highest.*nutrient|nutrient i.?m missing|missing.*highest|top.*nutrient|for.*deficienc/.test(q)) {
    const top = highestPriorityNutrient(input.priorities);
    focus = top?.nutrient ?? focus;
    focusPriority = top ?? focusPriority;
  }

  if (focus && focusPriority) {
    const statusLine = priorityText(focusPriority);
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
    row.cuisinePreference,
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
    rankFoodsForNutrient(foods, n, row.dietType, row.cuisinePreference, 6);
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
    cuisinePreference: row.cuisinePreference,
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
    cuisinePreference: row.cuisinePreference,
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
        cuisinePreference: row.cuisinePreference,
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

