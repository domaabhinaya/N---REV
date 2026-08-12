import type { ProfileRow } from "@workspace/db";

export type FoodPlateStructured = {
  breakfast?: { items: { name: string; quantity?: string }[] } | any;
};

export type FoodPlateNormalized = {
  breakfastItems: string[];
  lunchItems: string[];
  dinnerItems: string[];
  snackItems: string[];
  hydrationPattern?: string;
  supplementsText?: string;
  notes?: string;
};

function asStringArray(maybe: unknown): string[] {
  if (!maybe) return [];
  if (Array.isArray(maybe)) {
    return (maybe as unknown[])
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
  }
  return [];
}

function extractMealItems(value: unknown): string[] {
  // New structured: [{name, quantity}, ...]
  if (Array.isArray(value)) {
    const items: string[] = [];
    for (const v of value) {
      if (!v || typeof v !== "object") continue;
      const r = v as Record<string, unknown>;
      if (typeof r.name === "string" && r.name.trim()) {
        const qty = typeof r.quantity === "string" && r.quantity.trim() ? ` (${r.quantity.trim()})` : "";
        items.push(`${r.name.trim()}${qty}`);
      } else if (typeof r === "string") {
        items.push(String(r).trim());
      }
    }
    if (items.length > 0) return items;
  }

  // Legacy: string
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    return [t];
  }

  return [];
}

export function normalizeFoodHabits(foodHabits: unknown): FoodPlateNormalized {
  const empty: FoodPlateNormalized = {
    breakfastItems: [],
    lunchItems: [],
    dinnerItems: [],
    snackItems: [],
    hydrationPattern: undefined,
    supplementsText: undefined,
    notes: undefined,
  };

  if (!foodHabits || typeof foodHabits !== "object") return empty;
  const obj = foodHabits as Record<string, unknown>;

  const breakfastItems = extractMealItems(obj.breakfast);
  const lunchItems = extractMealItems(obj.lunch);
  const dinnerItems = extractMealItems(obj.dinner);
  const snackItems = extractMealItems(obj.snacks);

  const hydrationPattern =
    obj.hydration && typeof (obj.hydration as any).pattern === "string"
      ? String((obj.hydration as any).pattern).trim()
      : undefined;

  const supplementsText =
    obj.supplements && typeof (obj.supplements as any).items === "string"
      ? String((obj.supplements as any).items).trim()
      : undefined;

  const notes = typeof obj.notes === "string" ? obj.notes.trim() : undefined;

  // Fallback: if legacy stored strings directly in hydration/supplements/notes
  const hydrationFallback = typeof obj.hydration === "string" ? (obj.hydration as string).trim() : undefined;
  const supplementsFallback = typeof obj.supplements === "string" ? (obj.supplements as string).trim() : undefined;

  return {
    breakfastItems,
    lunchItems,
    dinnerItems,
    snackItems,
    hydrationPattern: hydrationPattern ?? hydrationFallback,
    supplementsText: supplementsText ?? supplementsFallback,
    notes,
  };
}

export function getUserRoutineContext(profileRow: ProfileRow) {
  const foodHabits = (profileRow as any).foodHabits;
  const normalized = normalizeFoodHabits(foodHabits);

  // Lightweight inference: detect keywords that roughly map to nutrient categories.
  // This is still conservative/explainable: only keyword triggers, no medical claims.
  const allText = [
    ...normalized.breakfastItems,
    ...normalized.lunchItems,
    ...normalized.dinnerItems,
    ...normalized.snackItems,
    normalized.hydrationPattern ?? "",
    normalized.supplementsText ?? "",
    normalized.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const routineTokens = {
    likelyProtein: /(dal|paneer|soy|tofu|egg|chicken|fish|curd|dahi|milk|cheese|soya chunks|sattu)/.test(allText),
    likelyIron: /(dal|rajma|chana|chole|ferritin|spinach|palak|methi|sattu|molasses|jaggery|amla)/.test(allText),
    likelyCalcium: /(milk|paneer|curd|dahi|cheese|calcium)/.test(allText),
    likelyVitaminD: /(egg|fish|fortified|milk|sun)/.test(allText),
  };

  return { normalized, routineTokens };
}

