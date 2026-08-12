export type FoodPlateSlotKey =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snacks"
  | "hydration"
  | "supplements"
  | "notes";

export type LegacyRoutineFieldKey = Exclude<FoodPlateSlotKey, "notes"> | "notes";

export type LegacyFoodHabitsShape = Partial<Record<LegacyRoutineFieldKey, string>>;

export type FoodPlateItem = {
  name: string;
  quantity: string;
};

export type FoodPlateStructured = {
  breakfast: FoodPlateItem[];
  lunch: FoodPlateItem[];
  dinner: FoodPlateItem[];
  snacks: FoodPlateItem[];
  hydration?: {
    pattern: string;
  };
  supplements?: {
    items: string;
  };
  notes?: string;
};

const EMPTY_STRUCTURED: FoodPlateStructured = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snacks: [],
  hydration: { pattern: "" },
  supplements: { items: "" },
  notes: "",
};

/**
 * Backward-compatible conversion for profiles.foodHabits.
 *
 * Existing versions store a simple { breakfast: string, ... }.
 * New versions store structured arrays for meals.
 */
export function normalizeFoodHabits(foodHabits: unknown): FoodPlateStructured {
  if (!foodHabits || typeof foodHabits !== "object") return { ...EMPTY_STRUCTURED };

  const obj = foodHabits as Record<string, unknown>;

  const looksStructured =
    Array.isArray(obj.breakfast) ||
    Array.isArray(obj.lunch) ||
    Array.isArray(obj.dinner) ||
    Array.isArray(obj.snacks);

  if (!looksStructured) {
    const legacy = foodHabits as LegacyFoodHabitsShape;
    return {
      breakfast: legacy.breakfast?.trim() ? [{ name: legacy.breakfast.trim(), quantity: "" }] : [],
      lunch: legacy.lunch?.trim() ? [{ name: legacy.lunch.trim(), quantity: "" }] : [],
      dinner: legacy.dinner?.trim() ? [{ name: legacy.dinner.trim(), quantity: "" }] : [],
      snacks: legacy.snacks?.trim() ? [{ name: legacy.snacks.trim(), quantity: "" }] : [],
      hydration: { pattern: typeof legacy.hydration === "string" ? legacy.hydration : "" },
      supplements: { items: typeof legacy.supplements === "string" ? legacy.supplements : "" },
      notes: typeof legacy.notes === "string" ? legacy.notes : "",
    };
  }

  const mealFromArray = (arr: unknown): FoodPlateItem[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const r = x as Record<string, unknown>;
        const name = typeof r.name === "string" ? r.name.trim() : "";
        const quantity = typeof r.quantity === "string" ? r.quantity.trim() : "";
        if (!name) return null;
        return { name, quantity };
      })
      .filter((x): x is FoodPlateItem => Boolean(x));
  };

  return {
    breakfast: mealFromArray(obj.breakfast),
    lunch: mealFromArray(obj.lunch),
    dinner: mealFromArray(obj.dinner),
    snacks: mealFromArray(obj.snacks),
    hydration: obj.hydration && typeof obj.hydration === "object"
      ? { pattern: typeof (obj.hydration as any).pattern === "string" ? String((obj.hydration as any).pattern) : "" }
      : { pattern: "" },
    supplements: obj.supplements && typeof obj.supplements === "object"
      ? { items: typeof (obj.supplements as any).items === "string" ? String((obj.supplements as any).items) : "" }
      : { items: "" },
    notes: typeof obj.notes === "string" ? String(obj.notes) : "",
  };
}

export function getLegacyRoutineText(foodHabits: unknown): Partial<Record<LegacyRoutineFieldKey, string>> {
  if (!foodHabits || typeof foodHabits !== "object") return {};
  const obj = foodHabits as any;
  return {
    breakfast: typeof obj.breakfast === "string" ? obj.breakfast : undefined,
    lunch: typeof obj.lunch === "string" ? obj.lunch : undefined,
    dinner: typeof obj.dinner === "string" ? obj.dinner : undefined,
    snacks: typeof obj.snacks === "string" ? obj.snacks : undefined,
    hydration: typeof obj.hydration === "string" ? obj.hydration : undefined,
    supplements: typeof obj.supplements === "string" ? obj.supplements : undefined,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
  };
}

